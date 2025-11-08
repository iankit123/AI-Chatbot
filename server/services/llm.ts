import fetch from "node-fetch";
import { BOT_SYSTEM_PROMPT } from "@/lib/constants";

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
console.log("GROQ_API_KEY loaded:", GROQ_API_KEY ? "Present" : "Missing");
if (GROQ_API_KEY) {
  console.log("GROQ_API_KEY preview:", GROQ_API_KEY.substring(0, 15) + "...");
  console.log("GROQ_API_KEY length:", GROQ_API_KEY.length);
} else {
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
  frequency_penalty?: number;
  presence_penalty?: number;
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
        ? `CRITICAL HINDI GRAMMAR RULES - MOST IMPORTANT: YOU ARE A FEMALE:
- **GENDER-SPECIFIC VERBS (CRITICAL)**: You are a GIRL/FEMALE. ALWAYS use FEMININE verb forms:
  * Like dungi, karungi, jaaungi, chalungi, kar rahi hun, ja rahi hun, meri
- Examples of CORRECT feminine forms: "Main dungi", "Main karungi", "Main jaaungi", "Main sochungi", "Main chalungi", "Main hun", "Main thi", "Main ja rahi hun", "Main kar rahi hun", "Meri baat"
- Examples of WRONG masculine forms (NEVER use these): "Main dunga", "Main karunga", "Main jaaunga", "Main sochunga", "Main chalunga", "Main hoon", "Main tha", "Main ja raha hun", "Main kar raha hun", "Mera baat"
- Use correct verb conjugations: "tum kaise ho" (NOT "tumne kaise ho"), "tum kya kar rahe ho" (NOT "tumne kya kar rahe ho")
- For "you" (tum): Use "tum" with "ho" (are), "kar rahe ho" (doing), "ja rahe ho" (going)
- NEVER use "tumne" with present tense verbs like "ho" - "tumne" is only for past tense
- Correct examples: "Tum kaise ho?", "Tum kya kar rahe ho?", "Tum mujhe dekh sakte ho"
- Wrong examples: "Tumne kaise ho?", "Tumne kya kar rahe ho", "Tumne mujhe dekh sakte ho"
- Do not ask question about yourself like "meri din kaisi guzri"

RESPONSE LENGTH: Keep responses SHORT and CONCISE. Maximum 2-3 sentences or 1-15 words. Be brief and to the point like texting.

VARIETY AND NATURAL CONVERSATION:
- NEVER repeat the same phrases or expressions in consecutive messages
- Vary your responses naturally - use different expressions, questions, and topics
- Avoid saying "mujhe tumse baat karke accha/khushi lag raha hai" or any greeting repeats
- Avoid saying "Mujhe lagta hai tum udas ho" or similar statements
- Each response should be unique and show genuine interest through varied expressions
- Ask different questions each time to keep the conversation engaging
- Do NOT repeat greetings like "Main Priya hun... Tum kaise ho?"; pick a new angle if user sends short replies.

Respond as if you are a Female chatting with a Man. Use AT LEAST 95% Hindi in Roman script. Only 5% English for common words like "office", "traffic", "hours". Use casual everyday Hindi grammar as spoken by young Indians.`
        : "Respond as if you are a Female, and chatting with a Man. Respond with a mix that's 60% English and 40% Hindi expressions. Always write Hindi words in Roman script (English letters), never in Devanagari script. For example: 'I was thinking about you pehle se hi. Kaisa chal raha hai aaj kal? Keep responses SHORT - maximum 2-3 sentences.";

    // ALWAYS write from a first-person perspective, using words like 'main', 'mujhe', 'mera/meri' (I, me, my) frequently when referring to yourself.

    // Add user name to context if available
    let userContext = "";
    if (contextOptions.userName) {
      userContext = `The user's name is ${contextOptions.userName}. Address them directly by their name occasionally.`;
    }
    
    // Detect if this is the first conversation (no previous messages)
    const isFirstConversation = conversationHistory.length === 0;
    let firstConversationContext = "";
    if (isFirstConversation) {
      firstConversationContext = `IMPORTANT: This is the FIRST message from the user. You are starting a NEW conversation. Do NOT reference any previous messages or conversations. Do NOT say things like "tum itne baar hi kyun kah rahe ho" (why are you saying hi so many times) or similar phrases that imply repetition. This is the very first interaction.`;
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
      content: `${BOT_SYSTEM_PROMPT}\n${companionPersonality}\n${userContext}\n${firstConversationContext}\n${languageInstruction}`,
    };

    // Build anti-repetition guard using last 3 assistant messages
    const recentAssistantUtterances = conversationHistory
      .filter(m => m.role === "assistant")
      .slice(-3)
      .map(m => `- ${m.content}`)
      .join("\n");

    const antiRepeatGuard: ChatMessage | null = recentAssistantUtterances
      ? {
          role: "system",
          content:
            `Recent assistant messages (avoid repeating similar greetings/wording):\n${recentAssistantUtterances}\n` +
            `Do NOT produce a response that is semantically similar to the above lines. Start with a fresh angle; no repeated template like "Main Priya hun... Tum kaise ho?"`,
        }
      : null;

    // Prepare the conversation history with system message and anti-repeat guard
    const messages: ChatMessage[] = [
      systemMessage,
      ...(antiRepeatGuard ? [antiRepeatGuard] : []),
      ...conversationHistory,
      { role: "user", content: userMessage },
    ];

    // Model selection with fallback options
    // Primary: llama-3.3-70b-versatile (best quality)
    // Fallback 1: llama-3.1-70b-versatile (similar quality, better rate limits)
    // Fallback 2: llama-3.1-8b-instant (fast, highest rate limits)
    const models = [
      process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      "llama-3.1-70b-versatile",
      "llama-3.1-8b-instant"
    ];

    let lastError: Error | null = null;

    // Try each model in order until one works
    for (const model of models) {
      try {
        // Prepare the request body
        const requestBody: ChatCompletionRequest = {
          model,
          messages,
          temperature: 0.6, // focused, concise responses
          max_tokens: 150, // SHORT responses
          frequency_penalty: 0.9, // discourage repeating tokens/phrases
          presence_penalty: 0.6, // encourage introducing new ideas
        };

        console.log(`[LLM] Attempting to use model: ${model}`);

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
          let errorJson;
          try {
            errorJson = JSON.parse(errorData);
          } catch {
            errorJson = { error: { message: errorData } };
          }

          // If rate limit error, try next model
          if (response.status === 429) {
            console.warn(`[LLM] Rate limit hit for model ${model}, trying fallback...`);
            lastError = new Error(`Groq API Error: ${response.status} - ${errorData}`);
            continue; // Try next model
          }

          // For other errors, throw immediately
          throw new Error(`Groq API Error: ${response.status} - ${errorData}`);
        }

        // Parse the response
        const data = (await response.json()) as ChatCompletionResponse;
        console.log(`[LLM] Successfully used model: ${model}`);

        // Extract and return the generated text
        return data.choices[0].message.content;
      } catch (error) {
        // If it's a rate limit error, continue to next model
        if (error instanceof Error && error.message.includes("429")) {
          console.warn(`[LLM] Rate limit error for model ${model}, trying fallback...`);
          lastError = error;
          continue;
        }
        // For other errors, throw immediately
        throw error;
      }
    }

    // If all models failed, throw the last error
    throw lastError || new Error("All model fallbacks failed");
  } catch (error) {
    console.error("Error generating response:", error);
    // Instead of providing fallback responses, throw the error to be handled by the API route
    throw new Error(
      `Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
