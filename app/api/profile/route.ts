import { eq } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { businessProfiles, businesses, users } from "@/db/schema";

type ProfileInput = {
  name?: string;
  industry?: string;
  country?: string;
  city?: string;
  description?: string;
  targetAudience?: string;
  businessModel?: "b2b" | "b2c" | "both";
  brandTone?: string[];
  contentGoals?: string[];
  platforms?: string[];
  postsPerWeek?: number;
};

export async function GET() {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });

  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.authUserId, identity.userId) });
  if (!user) return Response.json({ profile: null });
  const business = await db.query.businesses.findFirst({ where: eq(businesses.userId, user.id) });
  if (!business) return Response.json({ profile: null });
  const profile = await db.query.businessProfiles.findFirst({ where: eq(businessProfiles.businessId, business.id) });
  return Response.json({ profile: { ...business, details: profile } });
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return Response.json({ error: "Sign in required" }, { status: 401 });

  const body = (await request.json()) as ProfileInput;
  const name = body.name?.trim();
  const industry = body.industry?.trim();
  const country = body.country?.trim();
  const city = body.city?.trim();
  const description = body.description?.trim();
  const audience = body.targetAudience?.trim();
  if (!name || !industry || !country || !city || !description || !audience) {
    return Response.json({ error: "Complete all required profile fields" }, { status: 400 });
  }

  const now = new Date();
  const db = getDb();
  let user = await db.query.users.findFirst({ where: eq(users.authUserId, identity.userId) });
  if (!user) {
    const id = crypto.randomUUID();
    await db.insert(users).values({ id, authUserId: identity.userId, email: identity.email.toLowerCase(), createdAt: now, updatedAt: now });
    user = await db.query.users.findFirst({ where: eq(users.id, id) });
  }
  if (!user) return Response.json({ error: "Unable to create user" }, { status: 500 });

  let business = await db.query.businesses.findFirst({ where: eq(businesses.userId, user.id) });
  if (!business) {
    const id = crypto.randomUUID();
    await db.insert(businesses).values({ id, userId: user.id, name, industry, country, city, description, status: "waiting", createdAt: now, updatedAt: now });
    business = await db.query.businesses.findFirst({ where: eq(businesses.id, id) });
  } else {
    await db.update(businesses).set({ name, industry, country, city, description, status: "waiting", updatedAt: now }).where(eq(businesses.id, business.id));
  }
  if (!business) return Response.json({ error: "Unable to create business" }, { status: 500 });

  const existingProfile = await db.query.businessProfiles.findFirst({ where: eq(businessProfiles.businessId, business.id) });
  const details = {
    productsServices: "To be completed",
    primaryOffers: "To be completed",
    targetAudience: audience,
    customerLocation: `${city}, ${country}`,
    businessModel: body.businessModel ?? "both" as const,
    customerNeeds: "To be completed",
    brandTone: JSON.stringify(body.brandTone ?? []),
    contentGoals: JSON.stringify(body.contentGoals ?? []),
    platforms: JSON.stringify(body.platforms ?? []),
    postsPerWeek: Math.min(5, Math.max(1, body.postsPerWeek ?? 5)),
    updatedAt: now,
  };
  if (existingProfile) {
    await db.update(businessProfiles).set(details).where(eq(businessProfiles.id, existingProfile.id));
  } else {
    await db.insert(businessProfiles).values({ id: crypto.randomUUID(), businessId: business.id, ...details, createdAt: now });
  }
  return Response.json({ ok: true, businessId: business.id });
}
