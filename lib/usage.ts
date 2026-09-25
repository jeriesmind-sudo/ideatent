import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { usageCounters } from "@/db/schema";

export type UsageField = "tavilyRequests" | "aiCalls" | "generatedPlans" | "emails";

export async function incrementUsage(field: UsageField) {
  const db = getDb();
  const period = new Date().toISOString().slice(0, 7);
  const now = new Date();
  const values = {
    id: period,
    period,
    tavilyRequests: field === "tavilyRequests" ? 1 : 0,
    aiCalls: field === "aiCalls" ? 1 : 0,
    generatedPlans: field === "generatedPlans" ? 1 : 0,
    emails: field === "emails" ? 1 : 0,
    updatedAt: now,
  };
  const column = usageCounters[field];
  await db.insert(usageCounters).values(values).onConflictDoUpdate({
    target: usageCounters.period,
    set: { [field]: sql`${column} + 1`, updatedAt: now },
  });
}
