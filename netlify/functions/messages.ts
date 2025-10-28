import { Handler } from '@netlify/functions';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, desc } from 'drizzle-orm';
import * as schema from '../../shared/schema';
import { z } from 'zod';

// Initialize database connection
let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db && process.env.DATABASE_URL) {
    console.log('[Netlify Function] Initializing database connection...');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema });
    console.log('[Netlify Function] Database initialized');
  } else if (!process.env.DATABASE_URL) {
    console.log('[Netlify Function] DATABASE_URL not found in environment');
  }
  return db;
}

const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // Handle both /api/messages and /api/ routes
  if (event.httpMethod === 'POST' && (event.path === '/api/messages' || event.path === '/api/')) {
    try {
      const body = JSON.parse(event.body || '{}');
      
      // Validate request body
      const messageSchema = z.object({
        content: z.string().min(1),
        language: z.enum(['hindi', 'english']).default('hindi'),
        companionId: z.string().default('priya'),
        photoUrl: z.string().optional(),
        isPremium: z.boolean().optional(),
        skipUserMessage: z.boolean().optional(),
        messageCount: z.number().optional(),
        isAuthenticated: z.boolean().optional(),
        recentPhotoContext: z.any().optional()
      });
      
      const validatedData = messageSchema.parse(body);
      const database = getDb();
      
      // Get chat history from database BEFORE saving the current message
      let chatHistory: Array<{ role: string; content: string }> = [];
      if (database) {
        try {
          const recentMessages = await database.select()
            .from(schema.messages)
            .where(eq(schema.messages.companionId, validatedData.companionId))
            .orderBy(desc(schema.messages.timestamp))
            .limit(10);
          
          chatHistory = recentMessages.reverse().map(m => ({
            role: m.role,
            content: m.content
          }));
          console.log('[Netlify Function] Fetched chat history:', chatHistory.length, 'messages');
        } catch (error) {
          console.error('[Netlify Function] Error fetching chat history:', error);
        }
      } else {
        console.log('[Netlify Function] Database not available, using empty chat history');
      }
      
      // Save user message to database
      let savedUserMessage: any = null;
      if (database) {
        try {
          const result = await database.insert(schema.messages).values({
            content: validatedData.content,
            role: 'user' as const,
            companionId: validatedData.companionId,
            photoUrl: validatedData.photoUrl || null,
            isPremium: validatedData.isPremium || null,
            contextInfo: null
          }).returning();
          savedUserMessage = result[0];
          console.log('[Netlify Function] Saved user message to database:', savedUserMessage?.id);
        } catch (error) {
          console.error('[Netlify Function] Error saving user message to database:', error);
        }
      }
      
      // Add the current user message to chat history
      chatHistory.push({
        role: 'user',
        content: validatedData.content
      });
      
      // Generate AI response (call the LLM service)
      const { generateResponse } = await import('../../server/services/llm');
      const responseContent = await generateResponse(
        validatedData.content,
        chatHistory,
        validatedData.language,
        { 
          companionId: validatedData.companionId
        }
      );
      
      console.log('[Netlify Function] Generated response using', chatHistory.length, 'messages of context');
      
      // Save bot response to database
      let savedBotMessage: any = null;
      if (database) {
        try {
          const result = await database.insert(schema.messages).values({
            content: responseContent,
            role: 'assistant' as const,
            companionId: validatedData.companionId,
            photoUrl: null,
            isPremium: null,
            contextInfo: null
          }).returning();
          savedBotMessage = result[0];
          console.log('[Netlify Function] Saved bot message to database:', savedBotMessage?.id);
        } catch (error) {
          console.error('[Netlify Function] Error saving bot message to database:', error);
        }
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ content: responseContent })
      };
    } catch (error: any) {
      console.error('[Netlify Function] Error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to process message', details: error.message })
      };
    }
  }
  
  // GET /api/messages - Get all messages
  if (event.httpMethod === 'GET') {
    try {
      const database = getDb();
      const companionId = event.queryStringParameters?.companionId as string;
      
      if (!database) {
        return { statusCode: 200, headers, body: JSON.stringify([]) };
      }
      
      const allMessages = companionId 
        ? await database.select().from(schema.messages).where(eq(schema.messages.companionId, companionId)).orderBy(desc(schema.messages.timestamp))
        : await database.select().from(schema.messages).orderBy(desc(schema.messages.timestamp));
        
      return { statusCode: 200, headers, body: JSON.stringify(allMessages.reverse()) };
    } catch (error: any) {
      console.error('[Netlify Function] Error fetching messages:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ message: 'Failed to fetch messages', error: error.message }) };
    }
  }
  
  // DELETE /api/messages - Clear messages
  if (event.httpMethod === 'DELETE') {
    try {
      const database = getDb();
      
      if (database) {
        await database.delete(schema.messages);
        console.log('[Netlify Function] Cleared all messages from database');
      }
      
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'All messages cleared' }) };
    } catch (error: any) {
      console.error('[Netlify Function] Error clearing messages:', error);
      return { statusCode: 500, headers, body: JSON.stringify({ message: 'Failed to clear messages', error: error.message }) };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

export { handler }; 