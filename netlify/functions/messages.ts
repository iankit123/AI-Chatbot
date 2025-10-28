import { Handler } from '@netlify/functions';
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, desc } from 'drizzle-orm';
import { messages } from '../../shared/schema';
import { z } from 'zod';

// Initialize database connection
let db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!db && process.env.DATABASE_URL) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle({ client: pool, schema: { messages } });
  }
  return db;
}

const handler: Handler = async (event) => {
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
      
      // Save user message to database
      let savedUserMessage: any = null;
      if (database) {
        try {
          const result = await database.insert(messages).values({
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
      
      // Get chat history from database
      let chatHistory: Array<{ role: string; content: string }> = [];
      if (database) {
        try {
          const recentMessages = await database.select()
            .from(messages)
            .where(eq(messages.companionId, validatedData.companionId))
            .orderBy(desc(messages.timestamp))
            .limit(10);
          
          chatHistory = recentMessages.reverse().map(m => ({
            role: m.role,
            content: m.content
          }));
        } catch (error) {
          console.error('[Netlify Function] Error fetching chat history:', error);
        }
      }
      
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
      
      // Save bot response to database
      let savedBotMessage: any = null;
      if (database) {
        try {
          const result = await database.insert(messages).values({
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
        body: JSON.stringify({ content: responseContent })
      };
    } catch (error) {
      console.error('[Netlify Function] Error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to process message' })
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};

export { handler }; 