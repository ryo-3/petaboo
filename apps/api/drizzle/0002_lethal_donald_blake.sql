PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_team_invitations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`email` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`token` text NOT NULL,
	`invited_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_team_invitations`("id", "team_id", "email", "role", "token", "invited_by", "created_at", "expires_at", "status") SELECT "id", "team_id", "email", "role", "token", "invited_by", "created_at", "expires_at", "status" FROM `team_invitations`;--> statement-breakpoint
DROP TABLE `team_invitations`;--> statement-breakpoint
ALTER TABLE `__new_team_invitations` RENAME TO `team_invitations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;