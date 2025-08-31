-- Petaboo D1 Database Schema
-- Generated from Drizzle ORM migrations

-- Users table (from latest schema)
CREATE TABLE `users` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text,
	`plan_type` text DEFAULT 'free' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);

-- Individual user tables
CREATE TABLE `deleted_memos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`content` text,
	`category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer NOT NULL
);

CREATE TABLE `memos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`content` text,
	`category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer
);

CREATE TABLE `deleted_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`due_date` integer,
	`category_id` integer,
	`board_category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer NOT NULL
);

CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` integer,
	`category_id` integer,
	`board_category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer
);

CREATE TABLE `user_preferences` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`memo_column_count` integer DEFAULT 4 NOT NULL,
	`task_column_count` integer DEFAULT 2 NOT NULL,
	`memo_view_mode` text DEFAULT 'list' NOT NULL,
	`task_view_mode` text DEFAULT 'list' NOT NULL,
	`memo_hide_controls` integer DEFAULT false NOT NULL,
	`task_hide_controls` integer DEFAULT false NOT NULL,
	`hide_header` integer DEFAULT false NOT NULL,
	`created_at` real DEFAULT 1756619770223 NOT NULL,
	`updated_at` real DEFAULT 1756619770223 NOT NULL
);

CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE `board_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`original_id` text NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `boards`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`user_id` text NOT NULL,
	`board_category_id` integer,
	`archived` integer DEFAULT false NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`board_category_id`) REFERENCES `board_categories`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE UNIQUE INDEX `boards_slug_unique` ON `boards` (`slug`);

CREATE TABLE `deleted_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`original_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`board_category_id` integer,
	`archived` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer NOT NULL
);

CREATE TABLE `taggings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_original_id` text NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE `board_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`board_id` integer NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

-- Team functionality tables
CREATE TABLE `team_invitations` (
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

CREATE TABLE `team_members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`joined_at` integer NOT NULL
);

CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`custom_url` text UNIQUE NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer
);

CREATE TABLE `team_deleted_memos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`content` text,
	`category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer NOT NULL
);

CREATE TABLE `team_memos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`content` text,
	`category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer
);

CREATE TABLE `team_deleted_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`description` text,
	`status` text NOT NULL,
	`priority` text NOT NULL,
	`due_date` integer,
	`category_id` integer,
	`board_category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer NOT NULL
);

CREATE TABLE `team_tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`original_id` text NOT NULL,
	`uuid` text,
	`title` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'todo' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`due_date` integer,
	`category_id` integer,
	`board_category_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer
);

CREATE TABLE `team_board_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`board_id` integer NOT NULL,
	`item_type` text NOT NULL,
	`original_id` text NOT NULL,
	`deleted_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`board_id`) REFERENCES `team_boards`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `team_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`board_category_id` integer,
	`archived` integer DEFAULT false NOT NULL,
	`completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`board_category_id`) REFERENCES `team_board_categories`(`id`) ON UPDATE no action ON DELETE set null
);

CREATE TABLE `team_deleted_boards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`original_id` integer NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text,
	`board_category_id` integer,
	`archived` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer,
	`deleted_at` integer NOT NULL
);

CREATE TABLE `team_board_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`board_id` integer NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE `team_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);

CREATE TABLE `team_taggings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tag_id` integer NOT NULL,
	`target_type` text NOT NULL,
	`target_original_id` text NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`tag_id`) REFERENCES `team_tags`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE TABLE `team_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`team_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);