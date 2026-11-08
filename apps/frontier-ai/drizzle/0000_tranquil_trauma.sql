CREATE TABLE `papers` (
	`id` text PRIMARY KEY NOT NULL,
	`canonical_url` text NOT NULL,
	`title` text NOT NULL,
	`authors_json` text DEFAULT '[]' NOT NULL,
	`lab` text DEFAULT '' NOT NULL,
	`region` text DEFAULT 'global' NOT NULL,
	`published_at` text NOT NULL,
	`updated_at` text,
	`venue` text,
	`source_group` text DEFAULT 'paper' NOT NULL,
	`summary_pt` text DEFAULT '' NOT NULL,
	`contribution_pt` text DEFAULT '' NOT NULL,
	`evidence_pt` text DEFAULT '' NOT NULL,
	`limitations_pt` text DEFAULT '' NOT NULL,
	`verdict` text DEFAULT 'acompanhar de perto' NOT NULL,
	`topics_json` text DEFAULT '[]' NOT NULL,
	`artifacts_json` text DEFAULT '[]' NOT NULL,
	`benchmarks_json` text DEFAULT '[]' NOT NULL,
	`newness_score` integer DEFAULT 0 NOT NULL,
	`evidence_score` integer DEFAULT 0 NOT NULL,
	`importance_score` integer DEFAULT 0 NOT NULL,
	`relevance_score` integer DEFAULT 0 NOT NULL,
	`landmark` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'candidate' NOT NULL,
	`first_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_verified_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`raw_metadata_json` text DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `papers_canonical_url_unique` ON `papers` (`canonical_url`);--> statement-breakpoint
CREATE TABLE `research_scans` (
	`id` text PRIMARY KEY NOT NULL,
	`run_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`window_start` text,
	`window_end` text,
	`sources_json` text DEFAULT '[]' NOT NULL,
	`found_count` integer DEFAULT 0 NOT NULL,
	`added_count` integer DEFAULT 0 NOT NULL,
	`updated_count` integer DEFAULT 0 NOT NULL,
	`notes` text DEFAULT '' NOT NULL
);
