ALTER TABLE `content_ideas` ADD `trend_type` text DEFAULT 'evergreen' NOT NULL;
--> statement-breakpoint
ALTER TABLE `content_ideas` ADD `trend_title` text;
--> statement-breakpoint
ALTER TABLE `content_ideas` ADD `trend_source_title` text;
--> statement-breakpoint
ALTER TABLE `content_ideas` ADD `trend_source_url` text;
--> statement-breakpoint
ALTER TABLE `content_ideas` ADD `trend_published_at` text;
