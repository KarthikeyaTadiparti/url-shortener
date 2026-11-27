import { pgTable, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const urlsTable = pgTable("urls", {
    id: integer().primaryKey().generatedByDefaultAsIdentity(),
    original_url: varchar({ length: 2048 }).notNull(),
    short_code: varchar({ length: 10 }).notNull().unique(),
    created_at: timestamp().defaultNow().notNull(),
    updated_at: timestamp().defaultNow().notNull(),
});
