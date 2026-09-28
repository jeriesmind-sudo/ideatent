import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businesses, contentIdeas, ideaFeedback, weeklyPlans } from "@/db/schema";
import { getAppAccess } from "@/lib/access-control";

const STATUSES = new Set(["used", "skipped", "worked_well"] as const);

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getAppAccess();
  if (!access.ok) return access.response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null) as { status?: unknown; reasons?: unknown } | null;
  const status = typeof body?.status === "string" && STATUSES.has(body.status as "used" | "skipped" | "worked_well")
    ? body.status as "used" | "skipped" | "worked_well"
    : null;
  const reasons = Array.isArray(body?.reasons)
    ? body.reasons.filter((value): value is string => typeof value === "string").map((value) => value.trim().slice(0, 80)).filter(Boolean).slice(0, 3)
    : [];
  if (!status) return Response.json({ error: "Choose a valid feedback option" }, { status: 400 });

  const db = getDb();
  const idea = await db.query.contentIdeas.findFirst({ where: eq(contentIdeas.id, id) });
  const plan = idea ? await db.query.weeklyPlans.findFirst({ where: eq(weeklyPlans.id, idea.weeklyPlanId) }) : null;
  const business = plan ? await db.query.businesses.findFirst({ where: eq(businesses.id, plan.businessId) }) : null;
  if (!access.user || !idea || !plan || !business || business.userId !== access.user.id) {
    return Response.json({ error: "Post not found" }, { status: 404 });
  }

  const now = new Date();
  await db.insert(ideaFeedback).values({
    id: crypto.randomUUID(),
    contentIdeaId: idea.id,
    businessId: business.id,
    status,
    reasons: JSON.stringify(reasons),
    createdAt: now,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: ideaFeedback.contentIdeaId,
    set: { status, reasons: JSON.stringify(reasons), updatedAt: now },
  });

  return Response.json({ ok: true, feedback: { status, reasons } });
}
