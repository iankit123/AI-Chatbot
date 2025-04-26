import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from 'zod';
import { generateResponse } from './services/llm';
import express from "express";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from the client/public directory
  app.use(express.static(path.join(process.cwd(), 'client/public')));
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
        language: z.enum(['hindi', 'english']).default('hindi'),
        companionId: z.string().default('priya')
      });
      
      const validatedData = messageSchema.parse(req.body);
      
      // Save the user message with companion ID
      const userMessage = await storage.createMessage({
        content: validatedData.content,
        role: 'user',
        companionId: validatedData.companionId
      });
      
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
      
      // Get user profile if available
      let userName = '';
      const guestProfile = req.cookies?.guestProfile;
      if (guestProfile) {
        try {
          const profile = JSON.parse(guestProfile);
          userName = profile.name || '';
        } catch (e) {
          console.error('Error parsing user profile from cookie:', e);
        }
      }
      
      // Generate AI response with additional context
      const responseContent = await generateResponse(
        validatedData.content,
        conversationHistory,
        validatedData.language,
        { 
          companionId: validatedData.companionId,
          userName
        }
      );
      
      // Save the AI response with companion ID
      const botMessage = await storage.createMessage({
        content: responseContent,
        role: 'assistant',
        companionId: validatedData.companionId
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
