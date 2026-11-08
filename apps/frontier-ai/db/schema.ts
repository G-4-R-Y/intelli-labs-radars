import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const papers = sqliteTable("papers", {
  id: text("id").primaryKey(),
  canonicalUrl: text("canonical_url").notNull().unique(),
  title: text("title").notNull(),
  authorsJson: text("authors_json").notNull().default("[]"),
  lab: text("lab").notNull().default(""),
  region: text("region").notNull().default("global"),
  publishedAt: text("published_at").notNull(),
  updatedAt: text("updated_at"),
  venue: text("venue"),
  sourceGroup: text("source_group").notNull().default("paper"),
  summaryPt: text("summary_pt").notNull().default(""),
  contributionPt: text("contribution_pt").notNull().default(""),
  evidencePt: text("evidence_pt").notNull().default(""),
  limitationsPt: text("limitations_pt").notNull().default(""),
  verdict: text("verdict").notNull().default("acompanhar de perto"),
  topicsJson: text("topics_json").notNull().default("[]"),
  artifactsJson: text("artifacts_json").notNull().default("[]"),
  benchmarksJson: text("benchmarks_json").notNull().default("[]"),
  newnessScore: integer("newness_score").notNull().default(0),
  evidenceScore: integer("evidence_score").notNull().default(0),
  importanceScore: integer("importance_score").notNull().default(0),
  relevanceScore: integer("relevance_score").notNull().default(0),
  landmark: integer("landmark", { mode: "boolean" }).notNull().default(false),
  status: text("status").notNull().default("candidate"),
  firstSeenAt: text("first_seen_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  lastVerifiedAt: text("last_verified_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  rawMetadataJson: text("raw_metadata_json").notNull().default("{}"),
});

export const researchScans = sqliteTable("research_scans", {
  id: text("id").primaryKey(),
  runAt: text("run_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  windowStart: text("window_start"),
  windowEnd: text("window_end"),
  sourcesJson: text("sources_json").notNull().default("[]"),
  foundCount: integer("found_count").notNull().default(0),
  addedCount: integer("added_count").notNull().default(0),
  updatedCount: integer("updated_count").notNull().default(0),
  notes: text("notes").notNull().default(""),
});

export const researchWorkspace = sqliteTable("research_workspace", {
  key: text("key").primaryKey(),
  kind: text("kind").notNull(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
