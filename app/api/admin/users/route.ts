import { count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { approvedUsers, businesses, users } from "@/db/schema";
import { getAppAccess, normalizeEmail } from "@/lib/access-control";
import { PRIVATE_BETA_USER_LIMIT } from "@/lib/product-limits";

export async function GET() {
  const access = await getAppAccess({ admin: true });
  if (!access.ok) return access.response;

  const db = getDb();
  const approvals = await db.select().from(approvedUsers).orderBy(desc(approvedUsers.createdAt));
  const matchingUsers = approvals.length
    ? await db.select().from(users).where(inArray(users.email, approvals.map((approval) => approval.email)))
    : [];
  const matchingBusinesses = matchingUsers.length
    ? await db.select().from(businesses).where(inArray(businesses.userId, matchingUsers.map((user) => user.id)))
    : [];
  const activeCount = approvals.filter((approval) => approval.status === "active").length;

  return Response.json({
    activeCount,
    activeLimit: PRIVATE_BETA_USER_LIMIT,
    users: approvals.map((approval) => {
      const user = matchingUsers.find((item) => item.email === approval.email);
      const business = user ? matchingBusinesses.find((item) => item.userId === user.id) : undefined;
      return {
        id: approval.id,
        email: approval.email,
        status: approval.status,
        createdAt: approval.createdAt,
        lastLoginAt: approval.lastLoginAt,
        businessName: business?.name ?? null,
        businessStatus: business?.status ?? null,
      };
    }),
  });
}

export async function POST(request: Request) {
  const access = await getAppAccess({ admin: true });
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? normalizeEmail(body.email) : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return Response.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  const now = new Date();
  const db = getDb();
  const existing = await db.query.approvedUsers.findFirst({ where: eq(approvedUsers.email, email) });
  if (!existing || existing.status !== "active") {
    const [{ total }] = await db.select({ total: count() }).from(approvedUsers).where(eq(approvedUsers.status, "active"));
    if (total >= PRIVATE_BETA_USER_LIMIT) {
      return Response.json({ error: `The private beta is limited to ${PRIVATE_BETA_USER_LIMIT} active users. Disable an account before adding another.` }, { status: 409 });
    }
  }
  await db.insert(approvedUsers)
    .values({ id: crypto.randomUUID(), email, status: "active", createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: approvedUsers.email, set: { status: "active", updatedAt: now } });
  return Response.json({ ok: true, email });
}

