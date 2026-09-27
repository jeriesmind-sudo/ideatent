import { env } from "cloudflare:workers";
import { eq, or } from "drizzle-orm";
import { getChatGPTUser, type ChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { approvedUsers, users } from "@/db/schema";

type AccessGranted = {
  ok: true;
  identity: ChatGPTUser;
  isAdmin: boolean;
  user: typeof users.$inferSelect | null;
};

type AccessDenied = {
  ok: false;
  response: Response;
};

export type AppAccess = AccessGranted | AccessDenied;

export async function getAppAccess(options: { admin?: boolean } = {}): Promise<AppAccess> {
  const identity = await getChatGPTUser();
  if (!identity) {
    return { ok: false, response: Response.json({ error: "Sign in required" }, { status: 401 }) };
  }

  const db = getDb();
  const email = normalizeEmail(identity.email);
  const user = await db.query.users.findFirst({
    where: or(eq(users.authUserId, identity.userId), eq(users.email, email)),
  });
  const configuredAdmins = (env.ADMIN_EMAILS ?? env.ADMIN_EMAIL ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean);
  const isAdmin = Boolean(user?.isAdmin) || configuredAdmins.includes(email);

  if (options.admin && !isAdmin) {
    return { ok: false, response: Response.json({ error: "Admin access required" }, { status: 403 }) };
  }

  if (!isAdmin) {
    const approval = await db.query.approvedUsers.findFirst({ where: eq(approvedUsers.email, email) });
    if (!approval || approval.status !== "active") {
      return {
        ok: false,
        response: Response.json(
          { error: approval?.status === "disabled" ? "Your IdeaTent access is disabled" : "This email has not been invited to IdeaTent" },
          { status: 403 },
        ),
      };
    }
  }

  return { ok: true, identity: { ...identity, email }, isAdmin, user: user ?? null };
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

