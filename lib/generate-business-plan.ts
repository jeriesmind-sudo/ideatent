import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { businessProfiles, businesses, contentIdeas, emailLogs, generationJobs, weeklyPlans } from "@/db/schema";
import { sendWeeklyPlanEmail } from "@/lib/email-delivery";
import { generateWeeklyPlan } from "@/lib/plan-generator";
import { getTrendSignals } from "@/lib/trend-research";
import { incrementUsage } from "@/lib/usage";

type Database = ReturnType<typeof getDb>;
type Business = typeof businesses.$inferSelect;
type BusinessProfile = typeof businessProfiles.$inferSelect;

export async function generateBusinessPlan(db: Database, business: Business, profile: BusinessProfile, weekStart: string, recipient?: string) {
  const existing = await db.query.weeklyPlans.findFirst({
    where: and(eq(weeklyPlans.businessId, business.id), eq(weeklyPlans.weekStart, weekStart)),
  });
  if (existing) return { planId: existing.id, reused: true, generation: "existing" as const };

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
      ? await db.select({ idea: contentIdeas.idea, hook: contentIdeas.hook }).from(contentIdeas)
        .where(inArray(contentIdeas.weeklyPlanId, recentPlans.map((plan) => plan.id)))
      : [];
    const research = await getTrendSignals(business.industry, business.country);
    const generation = await generateWeeklyPlan(
      business,
      profile,
      research.trends,
      recentIdeas.flatMap((idea) => [idea.idea, idea.hook]),
    );
    await db.insert(contentIdeas).values(generation.ideas.map((idea, position) => ({
      id: crypto.randomUUID(), weeklyPlanId: planId, position, createdAt: now, ...idea,
    })));
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
