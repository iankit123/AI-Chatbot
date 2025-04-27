import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  companionId: text("companion_id"),  // Optional, to support older messages without a companion ID
  photoUrl: text("photo_url"),        // Optional, for messages with attached photos
  isPremium: boolean("is_premium"),   // Flag for premium photos (requiring payment)
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

// Extended schema with optional photo fields
export const insertMessageSchema = createInsertSchema(messages).pick({
  content: true,
  role: true,
  companionId: true,
}).extend({
  photoUrl: z.string().optional(),
  isPremium: z.boolean().optional(),
  language: z.enum(['hindi', 'english']).optional(),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
