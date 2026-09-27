import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { approvedUsers } from "@/db/schema";
import { getAppAccess } from "@/lib/access-control";

export async function GET() {
  const access = await getAppAccess();
  if (!access.ok) return access.response;

  if (!access.isAdmin) {
    await getDb().update(approvedUsers)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(approvedUsers.email, access.identity.email));
  }

  return Response.json({ email: access.identity.email, displayName: access.identity.displayName, isAdmin: access.isAdmin });
}

