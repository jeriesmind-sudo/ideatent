import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = () => ({
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const approvedUsers = sqliteTable("approved_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  status: text("status", { enum: ["active", "disabled"] }).notNull().default("active"),
  businessId: text("business_id"),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
  ...timestamps(),
});

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  authUserId: text("auth_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  ...timestamps(),
});

export const businesses = sqliteTable("businesses", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  name: text("name").notNull(),
  industry: text("industry").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  website: text("website"),
  socialPage: text("social_page"),
  description: text("description").notNull(),
  status: text("status", { enum: ["profile_incomplete", "waiting", "generating", "ready", "failed"] }).notNull().default("profile_incomplete"),
  nextGenerationAt: integer("next_generation_at", { mode: "timestamp" }),
  ...timestamps(),
});

export const businessProfiles = sqliteTable("business_profiles", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull().unique(),
  productsServices: text("products_services").notNull(),
  primaryOffers: text("primary_offers").notNull(),
  pricePosition: text("price_position", { enum: ["budget", "mid-market", "premium"] }),
  targetAudience: text("target_audience").notNull(),
  customerLocation: text("customer_location").notNull(),
  businessModel: text("business_model", { enum: ["b2b", "b2c", "both"] }).notNull(),
  customerNeeds: text("customer_needs").notNull(),
  brandTone: text("brand_tone").notNull(),
  avoidTopics: text("avoid_topics"),
  contentGoals: text("content_goals").notNull(),
  platforms: text("platforms").notNull(),
  postsPerWeek: integer("posts_per_week").notNull().default(5),
  ...timestamps(),
});

export const trendResearch = sqliteTable("trend_research", {
  id: text("id").primaryKey(),
  industry: text("industry").notNull(),
  country: text("country").notNull(),
  researchDate: integer("research_date", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  rawResults: text("raw_results").notNull(),
  summarizedTrends: text("summarized_trends").notNull(),
  sourceUrls: text("source_urls").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("idx_trend_research_pool").on(table.industry, table.country, table.researchDate)]);

export const weeklyPlans = sqliteTable("weekly_plans", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  weekStart: text("week_start").notNull(),
  status: text("status", { enum: ["generating", "ready", "failed"] }).notNull(),
  emailStatus: text("email_status", { enum: ["pending", "sent", "failed"] }).notNull().default("pending"),
  emailSentAt: integer("email_sent_at", { mode: "timestamp" }),
  ...timestamps(),
}, (table) => [uniqueIndex("idx_weekly_plan_business_week").on(table.businessId, table.weekStart)]);

export const contentIdeas = sqliteTable("content_ideas", {
  id: text("id").primaryKey(),
  weeklyPlanId: text("weekly_plan_id").notNull(),
  position: integer("position").notNull(),
  day: text("day").notNull(),
  platform: text("platform").notNull(),
  contentType: text("content_type").notNull(),
  category: text("category").notNull(),
  idea: text("idea").notNull(),
  hook: text("hook").notNull(),
  whyItWorks: text("why_it_works").notNull(),
  creativeDirection: text("creative_direction").notNull(),
  captionDirection: text("caption_direction").notNull(),
  cta: text("cta").notNull(),
  trendType: text("trend_type", { enum: ["global", "industry", "platform", "seasonal", "evergreen"] }).notNull().default("evergreen"),
  trendTitle: text("trend_title"),
  trendSourceTitle: text("trend_source_title"),
  trendSourceUrl: text("trend_source_url"),
  trendPublishedAt: text("trend_published_at"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const generationJobs = sqliteTable("generation_jobs", {
  id: text("id").primaryKey(),
  businessId: text("business_id").notNull(),
  weekStart: text("week_start").notNull(),
  status: text("status", { enum: ["pending", "running", "successful", "failed"] }).notNull(),
  error: text("error"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const emailLogs = sqliteTable("email_logs", {
  id: text("id").primaryKey(),
  weeklyPlanId: text("weekly_plan_id").notNull(),
  recipient: text("recipient").notNull(),
  status: text("status", { enum: ["pending", "sent", "failed"] }).notNull(),
  error: text("error"),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const planFeedback = sqliteTable("plan_feedback", {
  id: text("id").primaryKey(),
  weeklyPlanId: text("weekly_plan_id").notNull().unique(),
  useful: integer("useful", { mode: "boolean" }).notNull(),
  comment: text("comment"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const usageCounters = sqliteTable("usage_counters", {
  id: text("id").primaryKey(),
  period: text("period").notNull().unique(),
  tavilyRequests: integer("tavily_requests").notNull().default(0),
  aiCalls: integer("ai_calls").notNull().default(0),
  generatedPlans: integer("generated_plans").notNull().default(0),
  emails: integer("emails").notNull().default(0),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
