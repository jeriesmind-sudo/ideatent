import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { businessProfiles, businesses } from "@/db/schema";
import { getAppAccess } from "@/lib/access-control";
import { generateBusinessPlan, mondayFor } from "@/lib/generate-business-plan";

export async function POST() {
  const access = await getAppAccess({ admin: true });
  if (!access.ok) return access.response;
  if (!access.user) return Response.json({ error: "Complete your business profile first" }, { status: 400 });

  const db = getDb();
  const business = await db.query.businesses.findFirst({ where: eq(businesses.userId, access.user.id) });
  if (!business) return Response.json({ error: "Complete your business profile first" }, { status: 400 });
  const profile = await db.query.businessProfiles.findFirst({ where: eq(businessProfiles.businessId, business.id) });
  if (!profile) return Response.json({ error: "Complete your business profile first" }, { status: 400 });

  const weekStart = mondayFor(new Date());
  const result = await generateBusinessPlan(db, business, profile, weekStart, access.identity.email);
  return Response.json({ ok: true, weekStart, ...result });
}
