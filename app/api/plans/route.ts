import { desc, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import {
  businessProfiles,
  businesses,
  contentIdeas,
  users,
  weeklyPlans,
} from "@/db/schema";
import { generateBusinessPlan, mondayFor } from "@/lib/generate-business-plan";

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.authUserId, identity.userId) });
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

  return Response.json({
    plans: plans.map((plan) => ({
      ...plan,
      ideas: ideas.filter((idea) => idea.weeklyPlanId === plan.id),
    })),
  });
}

export async function POST() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.authUserId, identity.userId) });
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
