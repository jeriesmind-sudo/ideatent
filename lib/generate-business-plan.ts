import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { businessProfiles, businesses, contentIdeas, emailLogs, generationJobs, ideaBacklog, ideaFeedback, weeklyPlans } from "@/db/schema";
import { sendWeeklyPlanEmail } from "@/lib/email-delivery";
import { generateWeeklyPlan, type CandidateIdea, type LearningSignal } from "@/lib/plan-generator";
import { getTrendSignals } from "@/lib/trend-research";
import { incrementUsage } from "@/lib/usage";

type Database = ReturnType<typeof getDb>;
type Business = typeof businesses.$inferSelect;
type BusinessProfile = typeof businessProfiles.$inferSelect;

export async function generateBusinessPlan(db: Database, business: Business, profile: BusinessProfile, weekStart: string, recipient?: string) {
  const existing = await db.query.weeklyPlans.findFirst({
    where: and(eq(weeklyPlans.businessId, business.id), eq(weeklyPlans.weekStart, weekStart)),
  });
  if (existing) {
    if (recipient && existing.status === "ready" && existing.emailStatus !== "sent") {
      const ideas = await db.select().from(contentIdeas)
        .where(eq(contentIdeas.weeklyPlanId, existing.id))
        .orderBy(contentIdeas.position);
      await deliverPlan(db, existing.id, recipient, business, weekStart, ideas.map((idea) => ({
        ...idea,
        trendTitle: idea.trendTitle ?? "",
        trendSourceTitle: idea.trendSourceTitle ?? "",
        trendSourceUrl: idea.trendSourceUrl ?? "",
        trendPublishedAt: idea.trendPublishedAt ?? "",
      })));
    }
    return { planId: existing.id, reused: true, generation: "existing" as const };
  }

  const now = new Date();
  const jobId = crypto.randomUUID();
  const planId = crypto.randomUUID();
  await db.insert(generationJobs).values({
    id: jobId, businessId: business.id, weekStart, status: "running", startedAt: now, createdAt: now,
  });
  await db.update(businesses).set({ status: "generating", updatedAt: now }).where(eq(businesses.id, business.id));

  try {
    await db.insert(weeklyPlans).values({
      id: planId, businessId: business.id, weekStart, status: "generating", createdAt: now, updatedAt: now,
    });
    const recentPlans = await db.select({ id: weeklyPlans.id }).from(weeklyPlans)
      .where(eq(weeklyPlans.businessId, business.id))
      .orderBy(desc(weeklyPlans.weekStart))
      .limit(12);
    const recentIdeas = recentPlans.length
      ? await db.select({ idea: contentIdeas.idea, hook: contentIdeas.hook, contentType: contentIdeas.contentType, revisionCount: contentIdeas.revisionCount }).from(contentIdeas)
        .where(inArray(contentIdeas.weeklyPlanId, recentPlans.map((plan) => plan.id)))
      : [];
    const savedRows = await db.select().from(ideaBacklog)
      .where(and(eq(ideaBacklog.businessId, business.id), eq(ideaBacklog.status, "available")))
      .orderBy(desc(ideaBacklog.updatedAt))
      .limit(8);
    const savedCandidates: CandidateIdea[] = savedRows.map((row) => ({
      idea: row.idea,
      angle: row.angle,
      suggestedFormat: normaliseFormat(row.suggestedFormat),
      platform: row.platform,
      priorityFit: row.priorityFit,
      timingReason: row.timingReason,
      trendType: row.trendType,
      trendTitle: row.trendTitle ?? "",
      trendSourceTitle: row.trendSourceTitle ?? "",
      trendSourceUrl: row.trendSourceUrl ?? "",
      trendPublishedAt: row.trendPublishedAt ?? "",
    }));
    const feedbackRows = await db.select({
      idea: contentIdeas.idea,
      contentType: contentIdeas.contentType,
      revisionCount: contentIdeas.revisionCount,
      status: ideaFeedback.status,
      reasons: ideaFeedback.reasons,
    }).from(ideaFeedback)
      .innerJoin(contentIdeas, eq(contentIdeas.id, ideaFeedback.contentIdeaId))
      .where(eq(ideaFeedback.businessId, business.id))
      .orderBy(desc(ideaFeedback.updatedAt))
      .limit(30);
    const learningSignals: LearningSignal[] = [
      ...feedbackRows.map((row) => ({
        idea: row.idea,
        contentType: row.contentType,
        status: row.status,
        reasons: parseReasons(row.reasons),
      })),
      ...recentIdeas.filter((idea) => idea.revisionCount > 0).map((idea) => ({
        idea: idea.idea,
        contentType: idea.contentType,
        status: "revised" as const,
        reasons: ["The business edited this execution; keep the strategic signal weak and avoid overfitting."],
      })),
    ].slice(0, 30);
    const research = await getTrendSignals(business.industry, business.country);
    const generation = await generateWeeklyPlan(
      business,
      profile,
      research.trends,
      recentIdeas.flatMap((idea) => [idea.idea, idea.hook]),
      savedCandidates,
      learningSignals,
    );
    await db.insert(contentIdeas).values(generation.ideas.map((idea, position) => ({
      id: crypto.randomUUID(), weeklyPlanId: planId, position, createdAt: now, ...idea,
    })));
    await rememberUnusedCandidates(db, business.id, savedRows, generation.candidates, generation.ideas.map((idea) => idea.idea), now);
    const completedAt = new Date();
    await db.update(weeklyPlans).set({ status: "ready", updatedAt: completedAt }).where(eq(weeklyPlans.id, planId));
    await db.update(generationJobs).set({ status: "successful", completedAt }).where(eq(generationJobs.id, jobId));
    await db.update(businesses).set({ status: "ready", updatedAt: completedAt }).where(eq(businesses.id, business.id));
    await incrementUsage("generatedPlans");
    if (recipient) await deliverPlan(db, planId, recipient, business, weekStart, generation.ideas);
    return { planId, reused: false, generation: generation.aiUsed ? "ai" as const : "starter" as const };
  } catch (error) {
    const completedAt = new Date();
    const message = error instanceof Error ? error.message.slice(0, 500) : "Plan generation failed";
    await db.update(weeklyPlans).set({ status: "failed", updatedAt: completedAt }).where(eq(weeklyPlans.id, planId));
    await db.update(generationJobs).set({ status: "failed", error: message, completedAt }).where(eq(generationJobs.id, jobId));
    await db.update(businesses).set({ status: "failed", updatedAt: completedAt }).where(eq(businesses.id, business.id));
    throw error;
  }
}

async function rememberUnusedCandidates(
  db: Database,
  businessId: string,
  savedRows: Array<typeof ideaBacklog.$inferSelect>,
  candidates: CandidateIdea[],
  selectedIdeas: string[],
  now: Date,
) {
  const selected = new Set(selectedIdeas.map(normaliseIdea));
  for (const row of savedRows) {
    if (selected.has(normaliseIdea(row.idea))) {
      await db.update(ideaBacklog).set({ status: "selected", updatedAt: now }).where(eq(ideaBacklog.id, row.id));
    }
  }
  const existing = new Set(savedRows.map((row) => normaliseIdea(row.idea)));
  const unused = candidates.filter((candidate) => {
    const key = normaliseIdea(candidate.idea);
    return !selected.has(key) && !existing.has(key);
  }).slice(0, 12);
  if (!unused.length) return;
  await db.insert(ideaBacklog).values(unused.map((candidate) => ({
    id: crypto.randomUUID(),
    businessId,
    idea: candidate.idea,
    angle: candidate.angle,
    suggestedFormat: candidate.suggestedFormat,
    platform: candidate.platform,
    priorityFit: candidate.priorityFit,
    timingReason: candidate.timingReason,
    trendType: candidate.trendType,
    trendTitle: candidate.trendTitle || null,
    trendSourceTitle: candidate.trendSourceTitle || null,
    trendSourceUrl: candidate.trendSourceUrl || null,
    trendPublishedAt: candidate.trendPublishedAt || null,
    status: "available" as const,
    createdAt: now,
    updatedAt: now,
  })));
}

function parseReasons(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function normaliseIdea(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function normaliseFormat(value: string): CandidateIdea["suggestedFormat"] {
  if (value === "Reel/video" || value === "Carousel" || value === "Single/static") return value;
  return "Single/static";
}

async function deliverPlan(
  db: Database,
  planId: string,
  recipient: string,
  business: Business,
  weekStart: string,
  ideas: Awaited<ReturnType<typeof generateWeeklyPlan>>["ideas"],
) {
  const createdAt = new Date();
  const logId = crypto.randomUUID();
  await db.insert(emailLogs).values({ id: logId, weeklyPlanId: planId, recipient, status: "pending", createdAt });
  try {
    const result = await sendWeeklyPlanEmail(recipient, business, weekStart, ideas);
    if (result.sent) {
      const sentAt = new Date();
      await db.update(emailLogs).set({ status: "sent", sentAt }).where(eq(emailLogs.id, logId));
      await db.update(weeklyPlans).set({ emailStatus: "sent", emailSentAt: sentAt, updatedAt: sentAt }).where(eq(weeklyPlans.id, planId));
      await incrementUsage("emails");
    } else if (!result.skipped) {
      await db.update(emailLogs).set({ status: "failed", error: result.error }).where(eq(emailLogs.id, logId));
      await db.update(weeklyPlans).set({ emailStatus: "failed", updatedAt: new Date() }).where(eq(weeklyPlans.id, planId));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Email delivery failed";
    await db.update(emailLogs).set({ status: "failed", error: message }).where(eq(emailLogs.id, logId));
    await db.update(weeklyPlans).set({ emailStatus: "failed", updatedAt: new Date() }).where(eq(weeklyPlans.id, planId));
  }
}

export function mondayFor(date: Date) {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = result.getUTCDay();
  result.setUTCDate(result.getUTCDate() - ((day + 6) % 7));
  return result.toISOString().slice(0, 10);
}
