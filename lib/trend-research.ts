import { env } from "cloudflare:workers";
import { and, desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { trendResearch } from "@/db/schema";
import { incrementUsage } from "@/lib/usage";

export type TrendSignal = {
  type: "global" | "industry" | "platform" | "seasonal";
  title: string;
  summary: string;
  contentOpportunity: string;
  sourceTitle: string;
  sourceUrl: string;
  publishedAt?: string;
};

type SearchResult = {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
};

const TREND_SCHEMA = {
  type: "object",
  properties: {
    trends: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["global", "industry", "platform", "seasonal"] },
          title: { type: "string" },
          summary: { type: "string" },
          contentOpportunity: { type: "string" },
          sourceTitle: { type: "string" },
          sourceUrl: { type: "string" },
          publishedAt: { type: "string" },
        },
        required: ["type", "title", "summary", "contentOpportunity", "sourceTitle", "sourceUrl", "publishedAt"],
        additionalProperties: false,
      },
    },
  },
  required: ["trends"],
  additionalProperties: false,
} as const;

export async function getTrendSignals(industry: string, country: string): Promise<{ trends: TrendSignal[]; researchedAt: string; live: boolean }> {
  const db = getDb();
  const now = new Date();
  const cached = await db.query.trendResearch.findFirst({
    where: and(
      eq(trendResearch.industry, industry.trim().toLowerCase()),
      eq(trendResearch.country, country.trim().toLowerCase()),
      gt(trendResearch.expiresAt, now),
    ),
    orderBy: desc(trendResearch.researchDate),
  });
  if (cached) {
    return {
      trends: parseTrends(cached.summarizedTrends),
      researchedAt: cached.researchDate.toISOString(),
      live: true,
    };
  }

  if (!env.TAVILY_API_KEY) return { trends: [], researchedAt: now.toISOString(), live: false };

  const queries = [
    `${industry} ${country} latest industry news consumer conversations trends`,
    `${industry} social media content trends ${country} current month`,
  ];
  const settled = await Promise.allSettled(queries.map(searchTavily));
  const results = settled.flatMap((item) => item.status === "fulfilled" ? item.value : []);
  const unique = dedupeResults(results).slice(0, 12);
  if (!unique.length) return { trends: [], researchedAt: now.toISOString(), live: false };

  const trends = await analyseResults(industry, country, unique);
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const researchDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  try {
    await db.insert(trendResearch).values({
      id: crypto.randomUUID(),
      industry: industry.trim().toLowerCase(),
      country: country.trim().toLowerCase(),
      researchDate,
      expiresAt,
      rawResults: JSON.stringify(unique),
      summarizedTrends: JSON.stringify(trends),
      sourceUrls: JSON.stringify(unique.map((result) => result.url)),
      createdAt: now,
    });
  } catch (error) {
    console.warn("Trend research cache write was skipped.", error);
  }
  return { trends, researchedAt: now.toISOString(), live: true };
}

async function searchTavily(query: string): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${env.TAVILY_API_KEY}` },
      body: JSON.stringify({
        query: query.slice(0, 390),
        topic: "news",
        search_depth: "advanced",
        time_range: "month",
        max_results: 6,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Trend search returned ${response.status}`);
    const payload = await response.json() as { results?: unknown[] };
    await incrementUsage("tavilyRequests");
    return (payload.results ?? []).filter(isSearchResult).map((result) => ({
      ...result,
      content: result.content.slice(0, 1200),
    }));
  } finally {
    clearTimeout(timeout);
  }
}

async function analyseResults(industry: string, country: string, results: SearchResult[]): Promise<TrendSignal[]> {
  if (!env.AI) return fallbackSignals(results);
  try {
    const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        {
          role: "system",
          content: "You are a cautious trend researcher. Use only the supplied results. Reject weak, irrelevant, promotional, or unsupported claims. Preserve each source URL exactly. Identify useful content opportunities without pretending a trend is universal.",
        },
        {
          role: "user",
          content: `Industry: ${industry}\nCountry: ${country}\nToday: ${new Date().toISOString().slice(0, 10)}\n\nSearch results:\n${JSON.stringify(results)}`,
        },
      ],
      response_format: { type: "json_schema", json_schema: TREND_SCHEMA },
      temperature: 0.2,
      max_tokens: 1800,
    });
    await incrementUsage("aiCalls");
    const payload = unwrapResponse(response);
    if (isRecord(payload) && Array.isArray(payload.trends)) {
      const allowedUrls = new Set(results.map((result) => result.url));
      const trends = payload.trends.filter(isTrendSignal).filter((trend) => allowedUrls.has(trend.sourceUrl));
      if (trends.length) return trends;
    }
  } catch (error) {
    console.error("Trend analysis failed; using direct search signals.", error);
  }
  return fallbackSignals(results);
}

function fallbackSignals(results: SearchResult[]): TrendSignal[] {
  return results.slice(0, 5).map((result) => ({
    type: "industry",
    title: result.title,
    summary: result.content,
    contentOpportunity: "Use this recent development only when it is clearly relevant to the business and audience.",
    sourceTitle: result.title,
    sourceUrl: result.url,
    publishedAt: result.published_date,
  }));
}

function parseTrends(value: string): TrendSignal[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isTrendSignal) : [];
  } catch {
    return [];
  }
}

function unwrapResponse(response: unknown): unknown {
  const payload = isRecord(response) && "response" in response ? response.response : response;
  if (typeof payload !== "string") return payload;
  try { return JSON.parse(payload); } catch { return null; }
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results
    .filter((result) => result.score >= 0.35 && /^https?:\/\//.test(result.url))
    .sort((a, b) => b.score - a.score)
    .filter((result) => seen.has(result.url) ? false : (seen.add(result.url), true));
}

function isSearchResult(value: unknown): value is SearchResult {
  return isRecord(value)
    && typeof value.title === "string"
    && typeof value.url === "string"
    && typeof value.content === "string"
    && typeof value.score === "number";
}

function isTrendSignal(value: unknown): value is TrendSignal {
  return isRecord(value)
    && ["global", "industry", "platform", "seasonal"].includes(String(value.type))
    && ["title", "summary", "contentOpportunity", "sourceTitle", "sourceUrl"].every((key) => typeof value[key] === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
