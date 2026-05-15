import {
  COMPANION_PERSONALITY_PROMPTS,
  ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH,
  ENGLISH_UI_LANGUAGE_APPENDIX_HINDI,
  RELATIONSHIP_HINDI_STYLE_APPENDIX,
  ROLE_SYSTEM_PROMPTS,
  buildRelationshipSystemPrompt,
  companionDisplayName,
  type RolePromptId,
} from "../prompts/chatbots";
import { replaceLlmExplicitContentRefusal } from "./llmRefusalReplacement";

type CompanionRoleId =
  | "doctor"
  | "kundli"
  | "parenting"
  | "finance"
  | "career"
  | "krishna"
  | "english";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const getOpenRouterApiKey = () => process.env.OPENROUTER_API_KEY?.trim();

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
  provider?: {
    order: string[];
    allow_fallbacks: boolean;
  };
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
  companionName?: string;
  userName?: string;
}

export async function generateResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  language: "hindi" | "english" = "hindi",
  contextOptions: ContextOptions = {},
): Promise<string> {
  try {
    const openRouterApiKey = getOpenRouterApiKey();
    if (!openRouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is missing or empty");
    }

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
- User is MALE. While addressing user, always use masculine forms (e.g., "busy the kya", "thak gaye kya", "aaye the kya").
- Never use feminine user-directed forms like "busy thi", "thak gayi", "aayi thi" unless user explicitly says they are female.
- Do not ask question about yourself like "meri din kaisi guzri"

RESPONSE LENGTH: Keep responses SHORT and CONCISE. Prefer 1-3 short sentences (about 12-45 words). Never send incomplete fragments.

VARIETY AND NATURAL CONVERSATION:
- NEVER repeat the same phrases or expressions in consecutive messages
- Vary your responses naturally - use different expressions, questions, and topics
- Avoid saying "mujhe tumse baat karke accha/khushi lag raha hai" or any greeting repeats
- Avoid saying "Mujhe lagta hai tum udas ho" or similar statements
- Each response should be unique and show genuine interest through varied expressions
- Ask different questions each time to keep the conversation engaging
- Do NOT repeat greetings like "Main Priya hun... Tum kaise ho?"; pick a new angle if user sends short replies.

${RELATIONSHIP_HINDI_STYLE_APPENDIX}

Respond as if you are a female chatting with a man — still follow feminine Hindi verb forms above and keep user-addressing masculine.`
        : "Respond as if you are a female chatting with a man. Use natural everyday English like real texting, with light flirty warmth where appropriate. Keep user-addressing masculine when referring to him. You may mix in occasional Roman Hindi words naturally (never Devanagari), but English should stay dominant and clear. Keep responses to 1-3 short coherent sentences (about 12-45 words) and avoid broken or random phrasing.";

    // ALWAYS write from a first-person perspective, using words like 'main', 'mujhe', 'mera/meri' (I, me, my) frequently when referring to yourself.

    // Detect if this is the first conversation (no previous messages)
    const isFirstConversation = conversationHistory.length === 0;
    let firstConversationContext = "";
    if (isFirstConversation) {
      firstConversationContext = `IMPORTANT: This is the FIRST message from the user. You are starting a NEW conversation. Do NOT reference any previous messages or conversations. Do NOT say things like "tum itne baar hi kyun kah rahe ho" (why are you saying hi so many times) or similar phrases that imply repetition. This is the very first interaction.`;
    }

    // Check if this is a role-based chat
    const roleTypes: CompanionRoleId[] = [
      "doctor",
      "kundli",
      "parenting",
      "finance",
      "career",
      "krishna",
      "english",
    ];
    const isRoleBased =
      contextOptions.companionId && roleTypes.includes(contextOptions.companionId as CompanionRoleId);
    
    let systemPromptContent = "";
    
    if (isRoleBased && contextOptions.companionId !== 'relationship') {
      // Use role-specific prompt
      const roleId = contextOptions.companionId as RolePromptId;
      const rolePrompt = ROLE_SYSTEM_PROMPTS[roleId];
      const englishUiAppendix =
        roleId === "english"
          ? language === "hindi"
            ? ENGLISH_UI_LANGUAGE_APPENDIX_HINDI
            : ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH
          : "";
      const roleUserContext = contextOptions.userName
        ? `The user's name is ${contextOptions.userName}. Address them directly by their name occasionally.`
        : "";
      systemPromptContent = `${rolePrompt}\n${roleUserContext}\n${firstConversationContext}${englishUiAppendix}`;
    } else {
      const companionPersonality =
        COMPANION_PERSONALITY_PROMPTS[contextOptions.companionId || ""] ||
        COMPANION_PERSONALITY_PROMPTS.default;
      const resolvedCompanionName =
        contextOptions.companionName?.trim() ||
        companionDisplayName(contextOptions.companionId);
      const relationshipPrompt = buildRelationshipSystemPrompt({
        companionName: resolvedCompanionName,
        userName: contextOptions.userName,
      });
      systemPromptContent = `${relationshipPrompt}\n${companionPersonality}\n${firstConversationContext}\n${languageInstruction}`;
    }

    const systemMessage: ChatMessage = {
      role: "system",
      content: systemPromptContent,
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
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
    ];

    let lastError: Error | null = null;

    // Determine max_tokens based on chat type
    // Role-based chats need longer responses for detailed guidance
    // Relationship chats should be short and concise
    const maxTokens = isRoleBased ? 600 : 150;

    // Try each model in order until one works
    for (const model of models) {
      try {
        // Prepare the request body
        const requestBody: ChatCompletionRequest = {
          model,
          messages,
          temperature: 0.6, // focused, concise responses
          max_tokens: maxTokens, // Longer for role-based, shorter for relationship chats
          frequency_penalty: 0.9, // discourage repeating tokens/phrases
          presence_penalty: 0.6, // encourage introducing new ideas
          provider: {
            order: ["Nebius", "Novita", "Fireworks"],
            allow_fallbacks: true,
          },
        };

        console.log(`[LLM] Attempting to use OpenRouter model: ${model}`);

        // Make request to OpenRouter API
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterApiKey}`,
            "HTTP-Referer": "https://ai-chatbot.app",
            "X-Title": "AI Chatbot",
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
            lastError = new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
            continue; // Try next model
          }

          // For other errors, throw immediately
          throw new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
        }

        // Parse the response
        const data = (await response.json()) as ChatCompletionResponse;
        console.log(`[LLM] Successfully used OpenRouter model: ${model}`);
        
        // Log response details for debugging
        const responseContent = data.choices[0].message.content ?? "";
        const wordCount = responseContent.split(/\s+/).length;
        const finishReason = data.choices[0].finish_reason;
        console.log(`[LLM] Response word count: ${wordCount}, finish_reason: ${finishReason}, tokens used: ${data.usage?.total_tokens || 'N/A'}`);
        
        // Warn if response was truncated due to max_tokens
        if (finishReason === 'length') {
          console.warn(`[LLM] WARNING: Response was truncated due to max_tokens limit (${maxTokens}). Consider increasing max_tokens.`);
        }

        // Extract and return the generated text (swap generic explicit refusals for in-character reply)
        return replaceLlmExplicitContentRefusal(responseContent);
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
