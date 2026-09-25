CREATE TABLE `approved_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL UNIQUE,
	`status` text DEFAULT 'active' NOT NULL,
	`business_id` text,
	`last_login_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text NOT NULL UNIQUE,
	`email` text NOT NULL UNIQUE,
	`is_admin` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `businesses` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`industry` text NOT NULL,
	`country` text NOT NULL,
	`city` text NOT NULL,
	`website` text,
	`social_page` text,
	`description` text NOT NULL,
	`status` text DEFAULT 'profile_incomplete' NOT NULL,
	`next_generation_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `business_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL UNIQUE,
	`products_services` text NOT NULL,
	`primary_offers` text NOT NULL,
	`price_position` text,
	`target_audience` text NOT NULL,
	`customer_location` text NOT NULL,
	`business_model` text NOT NULL,
	`customer_needs` text NOT NULL,
	`brand_tone` text NOT NULL,
	`avoid_topics` text,
	`content_goals` text NOT NULL,
	`platforms` text NOT NULL,
	`posts_per_week` integer DEFAULT 5 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trend_research` (
	`id` text PRIMARY KEY NOT NULL,
	`industry` text NOT NULL,
	`country` text NOT NULL,
	`research_date` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`raw_results` text NOT NULL,
	`summarized_trends` text NOT NULL,
	`source_urls` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_trend_research_pool` ON `trend_research` (`industry`,`country`,`research_date`);
--> statement-breakpoint
CREATE TABLE `weekly_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`week_start` text NOT NULL,
	`status` text NOT NULL,
	`email_status` text DEFAULT 'pending' NOT NULL,
	`email_sent_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_weekly_plan_business_week` ON `weekly_plans` (`business_id`,`week_start`);
--> statement-breakpoint
CREATE TABLE `content_ideas` (
	`id` text PRIMARY KEY NOT NULL,
	`weekly_plan_id` text NOT NULL,
	`position` integer NOT NULL,
	`day` text NOT NULL,
	`platform` text NOT NULL,
	`content_type` text NOT NULL,
	`category` text NOT NULL,
	`idea` text NOT NULL,
	`hook` text NOT NULL,
	`why_it_works` text NOT NULL,
	`creative_direction` text NOT NULL,
	`caption_direction` text NOT NULL,
	`cta` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `generation_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`week_start` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`started_at` integer,
	`completed_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`weekly_plan_id` text NOT NULL,
	`recipient` text NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`sent_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `plan_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`weekly_plan_id` text NOT NULL UNIQUE,
	`useful` integer NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `usage_counters` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL UNIQUE,
	`tavily_requests` integer DEFAULT 0 NOT NULL,
	`ai_calls` integer DEFAULT 0 NOT NULL,
	`generated_plans` integer DEFAULT 0 NOT NULL,
	`emails` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
