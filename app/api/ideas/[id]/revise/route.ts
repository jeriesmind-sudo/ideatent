import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { businessProfiles, businesses, contentIdeas, users, weeklyPlans } from "@/db/schema";
import { incrementUsage } from "@/lib/usage";

const REVISION_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    captionDirection: { type: "string" },
    cta: { type: "string" },
  },
  required: ["hook", "captionDirection", "cta"],
  additionalProperties: false,
} as const;

const PRESETS: Record<string, string> = {
  punchier: "Make the writing punchier, more memorable, and more direct without using hype.",
  shorter: "Shorten the copy by about one third while preserving the main idea and brand voice.",
  friendlier: "Make the copy warmer, more conversational, and easier to read without sounding casual or generic.",
  persuasive: "Make the copy more persuasive with a clearer benefit and stronger action, without inventing urgency or claims.",
  rewrite: "Rewrite the post from a fresh angle while keeping the same strategic purpose and factual boundaries.",
};

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });
  if (!env.AI) return Response.json({ error: "The copy editor is temporarily unavailable" }, { status: 503 });

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { preset?: unknown; instruction?: unknown } | null;
  const preset = typeof body?.preset === "string" ? PRESETS[body.preset] : undefined;
  const custom = typeof body?.instruction === "string" ? body.instruction.trim().slice(0, 200) : "";
  const instruction = preset ?? custom;
  if (!instruction) return Response.json({ error: "Choose or enter a revision request" }, { status: 400 });

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.authUserId, identity.userId) });
  const idea = await db.query.contentIdeas.findFirst({ where: eq(contentIdeas.id, id) });
  if (!user || !idea) return Response.json({ error: "Post not found" }, { status: 404 });
  const plan = await db.query.weeklyPlans.findFirst({ where: eq(weeklyPlans.id, idea.weeklyPlanId) });
  const business = plan ? await db.query.businesses.findFirst({ where: eq(businesses.id, plan.businessId) }) : null;
  if (!plan || !business || business.userId !== user.id) return Response.json({ error: "Post not found" }, { status: 404 });
  const profile = await db.query.businessProfiles.findFirst({ where: eq(businessProfiles.businessId, business.id) });
  if (!profile) return Response.json({ error: "Business profile not found" }, { status: 409 });

  const response = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
    messages: [
      {
        role: "system",
        content: "You are a senior social-media copy editor. Revise only the supplied post. Preserve factual boundaries and source grounding. Never invent statistics, testimonials, offers, urgency, or business achievements. Return polished audience-facing copy without labels or commentary.",
      },
      {
        role: "user",
        content: `Business: ${business.name}\nIndustry: ${business.industry}\nAudience: ${profile.targetAudience}\nBrand tone: ${profile.brandTone}\nPlatform: ${idea.platform}\nRevision request: ${instruction}\n\nCurrent hook: ${idea.hook}\nCurrent copy: ${idea.captionDirection}\nCurrent CTA: ${idea.cta}\nTrend source: ${idea.trendSourceUrl ?? "Evergreen/no source"}`,
      },
    ],
    response_format: { type: "json_schema", json_schema: REVISION_SCHEMA },
    temperature: 0.55,
    max_tokens: 900,
  });
  await incrementUsage("aiCalls");
  const revision = parseRevision(response);
  if (!revision) return Response.json({ error: "The editor could not produce a safe revision" }, { status: 502 });

  await db.update(contentIdeas).set(revision).where(eq(contentIdeas.id, idea.id));
  return Response.json({ ok: true, idea: { ...idea, ...revision } });
}

function parseRevision(response: unknown) {
  const payload = isRecord(response) && "response" in response ? response.response : response;
  let value: unknown = payload;
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return null; }
  }
  if (!isRecord(value)) return null;
  if (typeof value.hook !== "string" || typeof value.cta !== "string" || typeof value.captionDirection !== "string") return null;
  if (value.captionDirection.trim().length < 80) return null;
  return {
    hook: value.hook.trim().slice(0, 240),
    captionDirection: value.captionDirection.trim().slice(0, 4000),
    cta: value.cta.trim().slice(0, 240),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
