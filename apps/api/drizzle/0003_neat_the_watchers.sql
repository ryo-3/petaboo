ALTER TABLE `team_invitations` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `team_invitations` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `team_invitations` ADD `message` text;--> statement-breakpoint
ALTER TABLE `team_invitations` ADD `processed_at` integer;--> statement-breakpoint
ALTER TABLE `team_invitations` ADD `processed_by` text;