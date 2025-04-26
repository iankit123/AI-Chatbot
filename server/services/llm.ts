import fetch from "node-fetch";
import { BOT_SYSTEM_PROMPT } from "@/lib/constants";

// Groq API configuration
const GROQ_API_KEY =
  process.env.GROQ_API_KEY ||
  "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";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ChatMessage {
  role: "system" | "user" | "assistant";
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
  language: "hindi" | "english" = "hindi",
): Promise<string> {
  try {
    // Create system message with stronger Hinglish instruction
    const languageInstruction =
      language === "hindi"
        ? "IMPORTANT: Respond with AT LEAST 80% Hindi content written in Roman script (English letters). LIMIT English to only 20% of your response for words that Indians commonly use in English. For example: 'Aaj main office ja rahi thi aur mujhe traffic mein 2 hours waste karne pade.' Notice how only a few English words are used, but most of the sentence is Hindi in Roman script. NEVER write full sentences in English except for very common phrases. Use casual, everyday Hindi as spoken, not formal Hindi."
        : "Respond with a mix that's 60% English and 40% Hindi expressions. Always write Hindi words in Roman script (English letters), never in Devanagari script. For example: 'I was thinking about you pehle se hi. Kaisa chal raha hai aaj kal?'";

    const systemMessage: ChatMessage = {
      role: "system",
      content: `${BOT_SYSTEM_PROMPT}\n${languageInstruction}`,
    };

    // Prepare the conversation history with system message
    const messages: ChatMessage[] = [
      systemMessage,
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    // Prepare the request body
    const requestBody: ChatCompletionRequest = {
      model: "llama3-70b-8192", // Using Llama 3 70B model
      messages,
      temperature: 0.8, // Slightly creative
      max_tokens: 800, // Reasonable response length
    };

    // Make request to Groq API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    // Check if response is successful
    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Groq API Error: ${response.status} - ${errorData}`);
    }

    // Parse the response
    const data = (await response.json()) as ChatCompletionResponse;

    // Extract and return the generated text
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating response:", error);
    // Instead of providing fallback responses, throw the error to be handled by the API route
    throw new Error(
      `Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
