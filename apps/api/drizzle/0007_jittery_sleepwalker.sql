ALTER TABLE `team_members` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `team_members` ADD `avatar_color` text;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `display_name`;