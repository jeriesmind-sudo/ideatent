import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businesses, planFeedback, weeklyPlans } from "@/db/schema";
import { getAppAccess } from "@/lib/access-control";

export async function POST(request: Request) {
  const access = await getAppAccess();
  if (!access.ok) return access.response;

  const body = (await request.json()) as { weeklyPlanId?: string; useful?: boolean; comment?: string };
  if (!body.weeklyPlanId || typeof body.useful !== "boolean") {
    return Response.json({ error: "weeklyPlanId and useful are required" }, { status: 400 });
  }
  const db = getDb();
  const user = access.user;
  if (!user) return Response.json({ error: "Business not found" }, { status: 404 });
  const business = await db.query.businesses.findFirst({ where: eq(businesses.userId, user.id) });
  if (!business) return Response.json({ error: "Business not found" }, { status: 404 });
  const plan = await db.query.weeklyPlans.findFirst({
    where: and(eq(weeklyPlans.id, body.weeklyPlanId), eq(weeklyPlans.businessId, business.id)),
  });
  if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });

  await db.insert(planFeedback)
    .values({ id: crypto.randomUUID(), weeklyPlanId: plan.id, useful: body.useful, comment: body.comment?.trim() || null, createdAt: new Date() })
    .onConflictDoUpdate({
      target: planFeedback.weeklyPlanId,
      set: { useful: body.useful, comment: body.comment?.trim() || null },
    });
  return Response.json({ ok: true });
}
