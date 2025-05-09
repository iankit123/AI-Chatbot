import type { VercelRequest, VercelResponse } from '@vercel/node';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

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
      
      // Generate response with Groq using fetch
      try {
        if (!GROQ_API_KEY) {
          throw new Error('GROQ_API_KEY not configured');
        }
        
        // Choose prompt based on companion
        let companionPrompt = "";
        switch (companionId) {
          case "priya":
            companionPrompt = "You are Priya, a 25-year-old Indian woman who is friendly, caring, and playful. You work as a fashion designer in Mumbai.";
            break;
          case "ananya":
            companionPrompt = "You are Ananya, a 23-year-old college student who is intellectual, empathetic, and slightly shy. You enjoy deep conversations.";
            break;
          case "meera":
            companionPrompt = "You are Meera, a 28-year-old yoga instructor who is calm, philosophical, and spiritual. You often share wisdom about life.";
            break;
          default:
            companionPrompt = "You are Priya, a 25-year-old Indian woman who is friendly, caring, and playful.";
        }
        
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
            content: `${companionPrompt}\n${languageInstruction}\nYou are a female chatting with a man. Be friendly, engaging, and respond in first person.`
          },
          ...chatHistory
        ];
        
        console.log("Calling Groq API with messages:", JSON.stringify(apiMessages));
            
        // Call Groq API
        const response = await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 500
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error("Groq API error:", response.status, errorText);
          throw new Error(`Groq API error: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        const responseContent = data.choices[0]?.message?.content || "Sorry, I couldn't process your message.";
        
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