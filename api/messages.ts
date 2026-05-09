import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  COMPANION_PERSONALITY_PROMPTS,
  RELATIONSHIP_SYSTEM_PROMPT,
  ROLE_SYSTEM_PROMPTS,
  type RolePromptId,
} from '../server/prompts/chatbots';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY?.trim();
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// Simple in-memory storage
const messages: any[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST /api/messages - Send a message
  if (req.method === 'POST') {
    try {
      console.log("POST /api/messages request body:", JSON.stringify(req.body));
      const { content, companionId = 'priya', language = 'hindi', messageCount = 0, isAuthenticated = false } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: 'Content is required' });
      }

      // Create user message
      const userMessage = {
        id: Date.now(),
        content,
        role: 'user',
        companionId,
        timestamp: new Date(),
        photoUrl: null,
        isPremium: null,
        contextInfo: null
      };
      
      // Add to messages
      messages.push(userMessage);
      
      // Check for premium photo offer (4th message for authenticated users)
      if (isAuthenticated && messageCount >= 3 && messageCount % 4 === 0) {
        const botMessage = {
          id: Date.now() + 1,
          content: 'Kya aap meri picture dekhna chahte ho jo maine kal click kari thi?',
          role: 'assistant',
          companionId,
          timestamp: new Date(),
          photoUrl: null,
          isPremium: true,
          contextInfo: 'premium_offer'
        };
        
        messages.push(botMessage);
        return res.status(201).json({ userMessage, botMessage });
      }
      
      // Generate response with OpenRouter
      try {
        if (!OPENROUTER_API_KEY) {
          throw new Error('OPENROUTER_API_KEY not configured');
        }
        
        const roleIds: RolePromptId[] = ['doctor', 'kundli', 'parenting', 'finance', 'career', 'krishna', 'english'];
        const isRoleBased = roleIds.includes(companionId as RolePromptId);
        const companionPrompt =
          COMPANION_PERSONALITY_PROMPTS[companionId] || COMPANION_PERSONALITY_PROMPTS.default;
        
        // Language instruction
        const languageInstruction = language === 'hindi' 
          ? "Respond with AT LEAST 95% Hindi content written in Roman script (English letters). Use casual, everyday Hindi as spoken, not formal Hindi."
          : "Respond with a mix that's 60% English and 40% Hindi expressions. Always write Hindi words in Roman script (English letters).";
        
        // Get chat history
        const chatHistory = messages
          .filter(m => m.companionId === companionId)
          .slice(-10) // Last 10 messages for context
          .map(m => ({
            role: m.role,
            content: m.content
          }));
        
        // Prepare messages for API request
        const apiMessages = [
          {
            role: 'system',
            content: isRoleBased
              ? `${ROLE_SYSTEM_PROMPTS[companionId as RolePromptId]}\n${languageInstruction}`
              : `${RELATIONSHIP_SYSTEM_PROMPT}\n${companionPrompt}\n${languageInstruction}\nYou are a female chatting with a man. Be friendly, engaging, and respond in first person.`
          },
          ...chatHistory
        ];
        
        console.log("Calling OpenRouter API with messages:", JSON.stringify(apiMessages));
            
        // Model selection with fallback options
        const models = [
          process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct',
          'meta-llama/llama-3.1-8b-instruct',
          'meta-llama/llama-3.1-70b-instruct'
        ];
        
        let lastError: Error | null = null;
        let responseContent = "Sorry, I couldn't process your message.";
        
        // Try each model in order until one works
        for (const model of models) {
          try {
            console.log(`[API] Attempting to use model: ${model}`);
            
        // Call OpenRouter API
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://ai-chatbot.app',
            'X-Title': 'AI Chatbot'
          },
          body: JSON.stringify({
                model,
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 500,
            provider: {
              order: ['Nebius', 'Novita', 'Fireworks'],
              allow_fallbacks: true
            }
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
              let errorJson;
              try {
                errorJson = JSON.parse(errorText);
              } catch {
                errorJson = { error: { message: errorText } };
              }
              
              // If rate limit error, try next model
              if (response.status === 429) {
                console.warn(`[API] Rate limit hit for model ${model}, trying fallback...`);
                lastError = new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
                continue; // Try next model
              }
              
              // For other errors, throw immediately
          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
            responseContent = data.choices[0]?.message?.content || "Sorry, I couldn't process your message.";
            console.log(`[API] Successfully used model: ${model}`);
            break; // Success, exit loop
            
          } catch (error) {
            // If it's a rate limit error, continue to next model
            if (error instanceof Error && error.message.includes("429")) {
              console.warn(`[API] Rate limit error for model ${model}, trying fallback...`);
              lastError = error;
              continue;
            }
            // For other errors, throw immediately
            throw error;
          }
        }
        
        // If all models failed, throw the last error
        if (lastError && responseContent === "Sorry, I couldn't process your message.") {
          throw lastError;
        }
        
        // Create bot response
        const botMessage = {
          id: Date.now() + 1,
          content: responseContent,
          role: 'assistant',
          companionId,
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };
        
        // Add to messages
        messages.push(botMessage);
        
        // Return both messages
        return res.status(201).json({ userMessage, botMessage });
        
      } catch (error) {
        console.error('Error generating response:', error);
        
        const botMessage = {
          id: Date.now() + 1,
          content: "Sorry, I couldn't process your message. Please try again later.",
          role: 'assistant',
          companionId,
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };
        
        return res.status(201).json({ userMessage, botMessage });
      }
      
    } catch (error) {
      console.error('Error handling message:', error);
      return res.status(500).json({ 
        message: 'Error processing message',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  // GET /api/messages - Get all messages
  if (req.method === 'GET') {
    try {
      const companionId = req.query.companionId as string;
      const filteredMessages = companionId 
        ? messages.filter(m => m.companionId === companionId)
        : messages;
        
      return res.status(200).json(filteredMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
  }
  
  // DELETE /api/messages - Clear messages
  if (req.method === 'DELETE') {
    try {
      // Clear all messages
      messages.length = 0;
      return res.status(200).json({ message: 'All messages cleared' });
    } catch (error) {
      console.error('Error clearing messages:', error);
      return res.status(500).json({ message: 'Failed to clear messages' });
    }
  }
  
  // Method not allowed
  return res.status(405).json({ message: 'Method not allowed' });
} 