ALTER TABLE `team_deleted_memos` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `team_memos` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `team_deleted_tasks` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `team_tasks` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `team_board_items` ADD `display_id` text;--> statement-breakpoint
ALTER TABLE `team_taggings` ADD `target_display_id` text;--> statement-breakpoint
ALTER TABLE `team_notifications` ADD `target_display_id` text;--> statement-breakpoint
ALTER TABLE `team_notifications` ADD `board_display_id` text;