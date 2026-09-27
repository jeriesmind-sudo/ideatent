import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { approvedUsers } from "@/db/schema";
import { getAppAccess } from "@/lib/access-control";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const access = await getAppAccess({ admin: true });
  if (!access.ok) return access.response;

  const body = await request.json().catch(() => null) as { status?: unknown } | null;
  if (body?.status !== "active" && body?.status !== "disabled") {
    return Response.json({ error: "Status must be active or disabled" }, { status: 400 });
  }

  const { id } = await context.params;
  const approval = await getDb().query.approvedUsers.findFirst({ where: eq(approvedUsers.id, id) });
  if (!approval) return Response.json({ error: "Approved user not found" }, { status: 404 });
  if (approval.email === access.identity.email && body.status === "disabled") {
    return Response.json({ error: "You cannot disable your own admin access" }, { status: 400 });
  }

  await getDb().update(approvedUsers).set({ status: body.status, updatedAt: new Date() }).where(eq(approvedUsers.id, id));
  return Response.json({ ok: true });
}

