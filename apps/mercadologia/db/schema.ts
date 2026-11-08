import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const papers = sqliteTable('radar_papers', { id:text('id').primaryKey(), body:text('body').notNull(), firstSeen:text('first_seen').notNull(), lastSeen:text('last_seen').notNull() });
export const scans = sqliteTable('radar_scans', { id:text('id').primaryKey(), body:text('body').notNull(), createdAt:text('created_at').notNull() });
export const settings = sqliteTable('radar_settings', { key:text('key').primaryKey(), body:text('body').notNull() });

export const researchWorkspace = sqliteTable("research_workspace", {
  key: text("key").primaryKey(),
  kind: text("kind").notNull(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
