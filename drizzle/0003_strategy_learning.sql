ALTER TABLE `business_profiles` ADD `current_priority` text;
ALTER TABLE `business_profiles` ADD `priority_detail` text;
ALTER TABLE `content_ideas` ADD `revision_count` integer DEFAULT 0 NOT NULL;

CREATE TABLE `idea_feedback` (
	`id` text PRIMARY KEY NOT NULL,
	`content_idea_id` text NOT NULL,
	`business_id` text NOT NULL,
	`status` text NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX `idea_feedback_content_idea_id_unique` ON `idea_feedback` (`content_idea_id`);

CREATE TABLE `idea_backlog` (
	`id` text PRIMARY KEY NOT NULL,
	`business_id` text NOT NULL,
	`idea` text NOT NULL,
	`angle` text NOT NULL,
	`suggested_format` text NOT NULL,
	`platform` text NOT NULL,
	`priority_fit` text NOT NULL,
	`timing_reason` text NOT NULL,
	`trend_type` text DEFAULT 'evergreen' NOT NULL,
	`trend_title` text,
	`trend_source_title` text,
	`trend_source_url` text,
	`trend_published_at` text,
	`status` text DEFAULT 'available' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
CREATE INDEX `idx_idea_backlog_business_status` ON `idea_backlog` (`business_id`, `status`);
