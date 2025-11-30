DROP INDEX `boards_slug_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `boards_user_slug_unique` ON `boards` (`user_id`,`slug`);