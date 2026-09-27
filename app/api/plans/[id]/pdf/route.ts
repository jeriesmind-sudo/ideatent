import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businesses, contentIdeas, weeklyPlans } from "@/db/schema";
import { getAppAccess } from "@/lib/access-control";
import { buildWeeklyPlanPdf, planPdfFilename } from "@/lib/plan-pdf";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getAppAccess();
  if (!access.ok) return access.response;
  if (!access.user) return Response.json({ error: "Plan not found" }, { status: 404 });

  const { id } = await context.params;
  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(businesses.userId, access.user.id) });
  if (!business) return Response.json({ error: "Plan not found" }, { status: 404 });
  const plan = await db.query.weeklyPlans.findFirst({
    where: and(eq(weeklyPlans.id, id), eq(weeklyPlans.businessId, business.id)),
  });
  if (!plan || plan.status !== "ready") return Response.json({ error: "Plan not found" }, { status: 404 });
  const ideas = await db.select().from(contentIdeas)
    .where(eq(contentIdeas.weeklyPlanId, plan.id))
    .orderBy(contentIdeas.position);
  const pdf = await buildWeeklyPlanPdf(business, plan.weekStart, ideas);
  const filename = planPdfFilename(business.name, plan.weekStart);

  return new Response(new Uint8Array(pdf).buffer, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "private, no-store",
    },
  });
}

