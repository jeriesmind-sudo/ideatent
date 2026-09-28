import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import {
  businessProfiles,
  businesses,
  contentIdeas,
  ideaFeedback,
  weeklyPlans,
} from "@/db/schema";
import { generateBusinessPlan, mondayFor } from "@/lib/generate-business-plan";
import { getAppAccess } from "@/lib/access-control";

export async function GET() {
  const access = await getAppAccess();
  if (!access.ok) return access.response;

  const db = getDb();
  const user = access.user;
  if (!user) return Response.json({ plans: [] });
  const business = await db.query.businesses.findFirst({ where: eq(businesses.userId, user.id) });
  if (!business) return Response.json({ plans: [] });

  const plans = await db.select().from(weeklyPlans)
    .where(eq(weeklyPlans.businessId, business.id))
    .orderBy(desc(weeklyPlans.weekStart))
    .limit(12);
  if (!plans.length) return Response.json({ plans: [] });

  const ideas = await db.select().from(contentIdeas)
    .where(inArray(contentIdeas.weeklyPlanId, plans.map((plan) => plan.id)))
    .orderBy(contentIdeas.position);
  const feedback = ideas.length
    ? await db.select().from(ideaFeedback).where(inArray(ideaFeedback.contentIdeaId, ideas.map((idea) => idea.id)))
    : [];
  const feedbackByIdea = new Map(feedback.map((item) => [item.contentIdeaId, item]));

  return Response.json({
    plans: plans.map((plan) => ({
      ...plan,
      ideas: ideas.filter((idea) => idea.weeklyPlanId === plan.id).map((idea) => {
        const item = feedbackByIdea.get(idea.id);
        return {
          ...idea,
          feedbackStatus: item?.status ?? null,
          feedbackReasons: item ? parseReasons(item.reasons) : [],
        };
      }),
    })),
  });
}

function parseReasons(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function POST() {
  const access = await getAppAccess();
  if (!access.ok) return access.response;

  const db = getDb();
  const user = access.user;
  if (!user) return Response.json({ error: "Complete your business profile first" }, { status: 409 });
  const business = await db.query.businesses.findFirst({ where: eq(businesses.userId, user.id) });
  if (!business) return Response.json({ error: "Complete your business profile first" }, { status: 409 });
  const profile = await db.query.businessProfiles.findFirst({ where: eq(businessProfiles.businessId, business.id) });
  if (!profile) return Response.json({ error: "Complete your business profile first" }, { status: 409 });

  try {
    const result = await generateBusinessPlan(db, business, profile, mondayFor(new Date()), user.email);
    return Response.json({ ok: true, ...result });
  } catch {
    return Response.json({ error: "Plan generation failed" }, { status: 500 });
  }
}
