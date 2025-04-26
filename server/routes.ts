import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from 'zod';
import { generateResponse } from './services/llm';

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all messages
  app.get('/api/messages', async (req, res) => {
    try {
      const messages = await storage.getMessages();
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send a message
  app.post('/api/messages', async (req, res) => {
    try {
      // Validate request body
      const messageSchema = z.object({
        content: z.string().min(1),
        language: z.enum(['hindi', 'english']).default('hindi')
      });
      
      const validatedData = messageSchema.parse(req.body);
      
      // Save the user message
      const userMessage = await storage.createMessage({
        content: validatedData.content,
        role: 'user'
      });
      
      // Get conversation history for context
      const allMessages = await storage.getMessages();
      const conversationHistory = allMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      // Generate AI response
      const responseContent = await generateResponse(
        validatedData.content,
        conversationHistory,
        validatedData.language
      );
      
      // Save the AI response
      const botMessage = await storage.createMessage({
        content: responseContent,
        role: 'assistant'
      });
      
      // Return both messages
      res.status(201).json({ userMessage, botMessage });
    } catch (error) {
      console.error('Error creating message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      }
      
      // Return the actual error message for transparency
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({ 
        message: 'Failed to process message',
        error: errorMessage
      });
    }
  });

  // Clear all messages
  app.delete('/api/messages', async (req, res) => {
    try {
      await storage.clearMessages();
      res.status(200).json({ message: 'All messages cleared' });
    } catch (error) {
      console.error('Error clearing messages:', error);
      res.status(500).json({ message: 'Failed to clear messages' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
