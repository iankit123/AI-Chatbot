import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import { messages, conversations, type Message, type InsertMessage, type Conversation } from "@shared/schema";
import type { IStorage } from "./storage";

export class DatabaseStorage implements IStorage {
  async getMessages(companionId?: string): Promise<Message[]> {
    try {
      if (companionId) {
        const result = await db
          .select()
          .from(messages)
          .where(eq(messages.companionId, companionId))
          .orderBy(desc(messages.timestamp));
        return result.reverse(); // Reverse to get chronological order
      } else {
        const result = await db
          .select()
          .from(messages)
          .orderBy(desc(messages.timestamp));
        return result.reverse(); // Reverse to get chronological order
      }
    } catch (error) {
      console.error("Error getting messages from database:", error);
      return [];
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      console.log("[DatabaseStorage] Creating message:", insertMessage);
      
      const result = await db
        .insert(messages)
        .values({
          content: insertMessage.content,
          role: insertMessage.role,
          companionId: insertMessage.companionId || null,
          photoUrl: insertMessage.photoUrl || null,
          isPremium: insertMessage.isPremium || null,
          contextInfo: insertMessage.contextInfo || null,
        })
        .returning();

      const newMessage = result[0];
      console.log("[DatabaseStorage] Message created with ID:", newMessage.id);
      
      // Update conversation last active
      await this.getCurrentConversation();
      
      return newMessage;
    } catch (error) {
      console.error("Error creating message in database:", error);
      throw error;
    }
  }

  async clearMessages(companionId?: string): Promise<void> {
    try {
      if (companionId) {
        await db
          .delete(messages)
          .where(eq(messages.companionId, companionId));
      } else {
        await db.delete(messages);
      }
    } catch (error) {
      console.error("Error clearing messages from database:", error);
      throw error;
    }
  }

  async getCurrentConversation(): Promise<Conversation> {
    try {
      const result = await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.lastActive))
        .limit(1);
      
      if (result.length > 0) {
        return result[0];
      }
      
      // Create a new conversation if none exists
      const now = new Date();
      const insertResult = await db
        .insert(conversations)
        .values({ lastActive: now })
        .returning();
      
      return insertResult[0];
    } catch (error) {
      console.error("Error getting conversation from database:", error);
      // Fallback to creating a new conversation
      const now = new Date();
      const insertResult = await db
        .insert(conversations)
        .values({ lastActive: now })
        .returning();
      return insertResult[0];
    }
  }
}

