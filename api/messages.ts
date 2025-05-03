import type { VercelRequest, VercelResponse } from '@vercel/node';
import { storage } from '../server/storage';
import { z } from 'zod';
import { generateResponse } from '../server/services/llm';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET /api/messages
  if (req.method === 'GET') {
    try {
      const companionId = req.query.companionId as string | undefined;
      const messages = await storage.getMessages(companionId);
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
  }
  
  // POST /api/messages
  if (req.method === 'POST') {
    console.log('POST /api/messages req.body:', JSON.stringify(req.body));
    try {
      // Validate request body with extended schema for premium photos
      const messageSchema = z.object({
        content: z.string().min(1),
        language: z.enum(['hindi', 'english']).default('hindi'),
        companionId: z.string().default('priya'),
        // Optional photo fields for premium messages
        photoUrl: z.string().optional(),
        isPremium: z.boolean().optional(),
        skipUserMessage: z.boolean().optional(),
        role: z.enum(['user', 'assistant']).optional(),
        messageCount: z.number().optional(),
        isAuthenticated: z.boolean().optional(),
        recentPhotoContext: z.any().optional()
      });
      
      const validatedData = messageSchema.parse(req.body);
      
      // Premium photo offer check
      const messageCount = validatedData.messageCount || 0;
      const isAuthenticated = validatedData.isAuthenticated || false;
      
      if (isAuthenticated && messageCount >= 3 && messageCount % 4 === 0) {
        console.log('Premium photo offer triggered!');
        // This is a premium photo offer message
        const photoOfferMessage = `Kya aap meri picture dekhna chahte ho jo maine kal click kari thi?`;
        
        // Save the premium photo offer message
        const botMessage = await storage.createMessage({
          content: photoOfferMessage,
          role: 'assistant',
          companionId: validatedData.companionId,
          isPremium: true,
          contextInfo: "premium_offer"
        });
        
        // Only create a user message if not explicitly skipped
        let userMessage;
        if (!validatedData.skipUserMessage) {
          userMessage = await storage.createMessage({
            content: validatedData.content,
            role: 'user',
            companionId: validatedData.companionId,
            photoUrl: validatedData.photoUrl,
            isPremium: validatedData.isPremium
          });
        }
        // Return both messages
        return res.status(201).json({ userMessage, botMessage });
      }
      
      // Check if this is a photo message (premium or regular)
      const isPhotoMessage = !!validatedData.photoUrl;
      
      // Only create a user message if not explicitly skipped
      let userMessage;
      if (!validatedData.skipUserMessage) {
        userMessage = await storage.createMessage({
          content: validatedData.content,
          role: 'user',
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
      }
      
      // If this is just saving a photo message (for premium photos), skip the LLM response
      if (isPhotoMessage && validatedData.isPremium) {
        console.log("Processing premium photo message with URL:", validatedData.photoUrl);
        
        // For premium photos, we directly create the bot response with the photo
        const botMessage = await storage.createMessage({
          content: validatedData.content,
          role: validatedData.role || 'assistant',
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium,
          contextInfo: "premium_photo_share"
        });
        
        // Return both messages
        return res.status(201).json({ userMessage, botMessage });
      }
      
      // If a role is explicitly provided and it's 'assistant', create the message directly
      if (validatedData.role === 'assistant') {
        const botMessage = await storage.createMessage({
          content: validatedData.content,
          role: 'assistant',
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        
        return res.status(201).json({ userMessage, botMessage });
      }
      
      // Normal message flow (non-photo message)
      try {
        // Get conversation history for this specific companion
        const allMessages = await storage.getMessages();
        // Filter messages for this companion
        const companionMessages = allMessages.filter(
          msg => !msg.companionId || msg.companionId === validatedData.companionId
        );
        
        const conversationHistory = companionMessages.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));
        
        // Generate AI response
        const responseContent = await generateResponse(
          validatedData.content,
          conversationHistory,
          validatedData.language,
          { companionId: validatedData.companionId }
        );
        
        // Save the AI response with companion ID
        const botMessage = await storage.createMessage({
          content: responseContent,
          role: 'assistant',
          companionId: validatedData.companionId
        });
        
        // Return both messages
        return res.status(201).json({ userMessage, botMessage });
      } catch (error) {
        console.error('Error in message processing:', error);
        
        // If it's a rate limit error, send a friendly message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.toLowerCase().includes('rate limit')) {
          const botMessage = await storage.createMessage({
            content: "I'm getting too many messages right now. Can you please wait a moment and try again?",
            role: 'assistant',
            companionId: validatedData.companionId
          });
          return res.status(201).json({ userMessage, botMessage });
        }
        
        throw error;
      }
    } catch (error) {
      console.error('Error creating message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return res.status(500).json({ 
        message: 'Failed to process message',
        error: errorMessage
      });
    }
  }
  
  // DELETE /api/messages
  if (req.method === 'DELETE') {
    try {
      await storage.clearMessages();
      return res.status(200).json({ message: 'All messages cleared' });
    } catch (error) {
      console.error('Error clearing messages:', error);
      return res.status(500).json({ message: 'Failed to clear messages' });
    }
  }
  
  // If none of the methods match
  return res.status(405).json({ message: 'Method not allowed' });
} 