import { env } from "cloudflare:workers";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { approvedUsers, businessProfiles, businesses, users } from "@/db/schema";
import { generateBusinessPlan, mondayFor } from "@/lib/generate-business-plan";

const MAX_ACTIVE_BUSINESSES = 30;
const BATCH_SIZE = 5;

export async function POST(request: Request) {
  if (!env.AUTOMATION_SECRET || !(await validBearer(request, env.AUTOMATION_SECRET))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = new Date();
  const weekStart = mondayFor(now);
  const candidates = await db.select({ business: businesses, email: users.email })
    .from(businesses)
    .innerJoin(users, eq(users.id, businesses.userId))
    .innerJoin(approvedUsers, eq(approvedUsers.email, users.email))
    .where(eq(approvedUsers.status, "active"))
    .orderBy(asc(businesses.nextGenerationAt))
    .limit(MAX_ACTIVE_BUSINESSES);

  const due = candidates
    .filter(({ business }) => !business.nextGenerationAt || business.nextGenerationAt <= now)
    .slice(0, BATCH_SIZE);
  const results: Array<{ businessId: string; status: "generated" | "reused" | "failed" }> = [];

  for (const { business, email } of due) {
    try {
      const profile = await db.query.businessProfiles.findFirst({ where: eq(businessProfiles.businessId, business.id) });
      if (!profile) continue;
      const result = await generateBusinessPlan(db, business, profile, weekStart, email);
      const nextGenerationAt = new Date(`${weekStart}T06:00:00Z`);
      nextGenerationAt.setUTCDate(nextGenerationAt.getUTCDate() + 7);
      await db.update(businesses).set({ nextGenerationAt, updatedAt: new Date() }).where(eq(businesses.id, business.id));
      results.push({ businessId: business.id, status: result.reused ? "reused" : "generated" });
    } catch (error) {
      console.error(JSON.stringify({ event: "weekly_generation_failed", businessId: business.id, error: error instanceof Error ? error.message : "unknown" }));
      results.push({ businessId: business.id, status: "failed" });
    }
  }

  return Response.json({ ok: true, weekStart, processed: results.length, remainingDue: Math.max(0, candidates.length - due.length), results });
}

async function validBearer(request: Request, expected: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const encoder = new TextEncoder();
  const [actualHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(supplied)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const actual = new Uint8Array(actualHash);
  const target = new Uint8Array(expectedHash);
  let difference = actual.length ^ target.length;
  for (let index = 0; index < Math.min(actual.length, target.length); index += 1) difference |= actual[index] ^ target[index];
  return difference === 0;
}
