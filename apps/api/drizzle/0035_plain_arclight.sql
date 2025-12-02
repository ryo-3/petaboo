PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_taggings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_display_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_taggings`("id", "tag_id", "target_type", "target_display_id", "user_id", "created_at") SELECT "id", "tag_id", "target_type", "target_display_id", "user_id", "created_at" FROM `taggings`;--> statement-breakpoint
DROP TABLE `taggings`;--> statement-breakpoint
ALTER TABLE `__new_taggings` RENAME TO `taggings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;