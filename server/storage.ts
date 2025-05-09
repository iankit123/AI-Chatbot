import { 
  messages,
  conversations,
  type Message,
  type InsertMessage,
  type Conversation
} from "@shared/schema";

export interface IStorage {
  getMessages(companionId?: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  clearMessages(companionId?: string): Promise<void>;
  getCurrentConversation(): Promise<Conversation>;
}

export class MemStorage implements IStorage {
  private messages: Map<number, Message>;
  private conversations: Map<number, Conversation>;
  private currentConvId: number;

  constructor() {
    this.messages = new Map();
    this.conversations = new Map();
    this.currentConvId = 1;
    
    // Create initial conversation
    const now = new Date();
    this.conversations.set(this.currentConvId, {
      id: this.currentConvId,
      lastActive: now
    });
  }

  async getMessages(companionId?: string): Promise<Message[]> {
    let messages = Array.from(this.messages.values());
    
    // Filter by companion ID if provided
    if (companionId) {
      messages = messages.filter(message => 
        !message.companionId || message.companionId === companionId
      );
    }
    
    // Sort by timestamp
    return messages.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    // Generate a unique ID using timestamp and a random number
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    // Use a more reliable ID generation that ensures positive numbers
    const id = Math.abs((timestamp % 1000000) * 1000 + random);
    
    const now = new Date();
    
    // Ensure companionId is always at least null, not undefined
    const companionId = insertMessage.companionId || null;
    
    // Handle optional premium photo fields
    const photoUrl = insertMessage.photoUrl || null;
    const isPremium = insertMessage.isPremium || null;
    
    // Ensure contextInfo is always a string or null, not undefined
    const contextInfo = insertMessage.contextInfo || null;
    
    // Log premium photo message creation
    if (photoUrl && isPremium) {
      console.log(`Creating premium photo message with URL: ${photoUrl}`);
    }
    
    const message: Message = { 
      id, 
      content: insertMessage.content,
      role: insertMessage.role,
      timestamp: now,
      companionId,
      photoUrl,
      isPremium,
      contextInfo
    };
    
    this.messages.set(id, message);
    
    // Update conversation last active
    const conversation = await this.getCurrentConversation();
    this.conversations.set(conversation.id, {
      ...conversation,
      lastActive: now
    });
    
    return message;
  }

  async clearMessages(companionId?: string): Promise<void> {
    if (companionId) {
      // Only clear messages for a specific companion
      // Using Array.from to convert Map entries to array to avoid TypeScript error
      Array.from(this.messages.entries()).forEach(([id, message]) => {
        if (message.companionId === companionId) {
          this.messages.delete(id);
        }
      });
    } else {
      // Clear all messages
      this.messages.clear();
    }
  }

  async getCurrentConversation(): Promise<Conversation> {
    return this.conversations.get(this.currentConvId)!;
  }
}

export const storage = new MemStorage();
