ALTER TABLE `team_invitations` ADD `usage_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `team_invitations` ADD `max_usage` integer DEFAULT 100 NOT NULL;