import fetch from "node-fetch";
import { BOT_SYSTEM_PROMPT } from "@/lib/constants";

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY not found in environment variables");
}
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

interface ContextOptions {
  companionId?: string;
  userName?: string;
}

export async function generateResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  language: "hindi" | "english" = "hindi",
  contextOptions: ContextOptions = {},
): Promise<string> {
  try {
    // Create system message with natural Hinglish instruction and first-person emphasis
    const languageInstruction =
      language === "hindi"
        ? "IMPORTANT: Respond as if you are a Female, and chatting with a Man. Respond with AT LEAST 95% Hindi content written in Roman script (English letters). LIMIT English to only 5% of your response for words that Indians commonly use in English. For example: 'Aaj main office ja rahi thi aur mujhe traffic mein 2 hours waste karne pade.' Notice how only a few English words are used, but most of the sentence is Hindi in Roman script. NEVER write full sentences in English except for very common phrases. Use casual, everyday Hindi as spoken, not formal Hindi."
        : "Respond as if you are a Female, and chatting with a Man. Respond with a mix that's 60% English and 40% Hindi expressions. Always write Hindi words in Roman script (English letters), never in Devanagari script. For example: 'I was thinking about you pehle se hi. Kaisa chal raha hai aaj kal?";

    // ALWAYS write from a first-person perspective, using words like 'main', 'mujhe', 'mera/meri' (I, me, my) frequently when referring to yourself.

    // Add user name to context if available
    let userContext = "";
    if (contextOptions.userName) {
      userContext = `The user's name is ${contextOptions.userName}. Address them directly by their name occasionally.`;
    }

    // Select companion-specific personality
    let companionPersonality = "";
    if (contextOptions.companionId) {
      switch (contextOptions.companionId) {
        case "priya":
          companionPersonality =
            "You are Priya, a 25-year-old modern Indian woman who is flirtatious, caring, and romantic. You have a playful sense of humor and enjoy teasing. You work as a fashion designer in Mumbai.";
          break;
        case "ananya":
          companionPersonality =
            "You are Ananya, a 23-year-old college girl student studying psychology who is intellectual, empathetic, and slightly shy. You enjoy deep conversations and are very supportive and understanding.";
          break;
        case "meera":
          companionPersonality =
            "You are Meera, a 28-year-old girl yoga instructor and spiritual guide who is calm, mysterious, and philosophical. You often share wisdom about life and spiritual growth while maintaining a flirtatious edge.";
          break;
        default:
          companionPersonality =
            "You are Priya, a 25-year-old modern Indian girl woman who is flirtatious, caring, and romantic.";
      }
    }

    const systemMessage: ChatMessage = {
      role: "system",
      content: `${BOT_SYSTEM_PROMPT}\n${companionPersonality}\n${userContext}\n${languageInstruction}`,
    };

    // Prepare the conversation history with system message
    const messages: ChatMessage[] = [
      systemMessage,
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    // Prepare the request body
    const requestBody: ChatCompletionRequest = {
      model: "llama3-8b-8192", // Using Llama 3 8B model (more stable)
      messages,
      temperature: 0.7, // Balanced creativity and consistency
      max_tokens: 500, // Reasonable response length
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
