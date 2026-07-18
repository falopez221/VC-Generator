CREATE TABLE `private_agent_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`source_row` integer NOT NULL,
	`batch` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`completion_percent` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`reviewed_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `private_catalog_agents`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `private_catalog_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`source_key` text NOT NULL,
	`source_row` integer NOT NULL,
	`display_name` text NOT NULL,
	`domain` text NOT NULL,
	`specialization` text NOT NULL,
	`capability_summary` text DEFAULT '' NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`catalog_status` text DEFAULT 'documented' NOT NULL,
	`execution_status` text DEFAULT 'available_on_demand' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `private_catalog_agents_source_key_unique` ON `private_catalog_agents` (`source_key`);--> statement-breakpoint
CREATE TABLE `private_progress_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`source_row` integer NOT NULL,
	`batch` text NOT NULL,
	`start_agent_key` text NOT NULL,
	`end_agent_key` text NOT NULL,
	`expected_count` integer NOT NULL,
	`status` text DEFAULT 'not_started' NOT NULL,
	`validated` integer DEFAULT false NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`started_at` text,
	`closed_at` text,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `private_progress_batches_batch_unique` ON `private_progress_batches` (`batch`);
