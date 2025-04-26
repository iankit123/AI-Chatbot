import fetch from 'node-fetch';
import { BOT_SYSTEM_PROMPT } from '@/lib/constants';

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY || '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';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function generateResponse(
  userMessage: string, 
  conversationHistory: ChatMessage[],
  language: 'hindi' | 'english' = 'hindi'
): Promise<string> {
  try {
    // Create system message with Hinglish instruction
    const languageInstruction = language === 'hindi' 
      ? "Respond in Hinglish - a mix of Hindi and English. Use Devanagari script for Hindi words but freely mix English words and phrases as Indians typically do in conversation. This should be a natural flowing mix, not formal Hindi with a few English words."
      : "Respond primarily in English with frequent Hindi expressions and words mixed in naturally to create authentic Hinglish conversation style.";
    
    const systemMessage: ChatMessage = {
      role: 'system',
      content: `${BOT_SYSTEM_PROMPT}\n${languageInstruction}`
    };
    
    // Prepare the conversation history with system message
    const messages: ChatMessage[] = [
      systemMessage,
      ...conversationHistory,
      { role: 'user', content: userMessage }
    ];
    
    // Prepare the request body
    const requestBody: ChatCompletionRequest = {
      model: "llama3-70b-8192",  // Using Llama 3 70B model
      messages,
      temperature: 0.8,  // Slightly creative
      max_tokens: 800    // Reasonable response length
    };
    
    // Make request to Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check if response is successful
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${errorData}`);
    }
    
    // Parse the response
    const data = await response.json() as ChatCompletionResponse;
    
    // Extract and return the generated text
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating response:', error);
    // Instead of providing fallback responses, throw the error to be handled by the API route
    throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
