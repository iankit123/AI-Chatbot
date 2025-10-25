import { Handler } from '@netlify/functions';
import { generateResponse } from '../../server/services/llm';
import { z } from 'zod';

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
        skipUserMessage: z.boolean().optional()
      });
      
      const validatedData = messageSchema.parse(body);
      
      // Generate AI response
      const responseContent = await generateResponse(
        validatedData.content,
        [], // Empty conversation history for now
        validatedData.language,
        { 
          companionId: validatedData.companionId
        }
      );
      
      return {
        statusCode: 200,
        body: JSON.stringify({ content: responseContent })
      };
    } catch (error) {
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