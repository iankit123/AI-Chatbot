import {
  COMPANION_PERSONALITY_PROMPTS,
  ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH,
  ENGLISH_UI_LANGUAGE_APPENDIX_HINDI,
  RELATIONSHIP_HINDI_STYLE_APPENDIX,
  ROLE_SYSTEM_PROMPTS,
  buildRelationshipSystemPrompt,
  companionDisplayName,
  adviceReplyReminder,
  detectReplyLanguage,
  replyLanguageInstruction,
  type RolePromptId,
} from "../prompts/chatbots";
import { firstNameOnly } from "@shared/userName";
import { isCallOrNumberRequest } from "../lib/callNumberRequest";
import { isAskingWhatCompanionIsDoing, isSimpleGreeting } from "../lib/chatHistory";
import { replaceLlmExplicitContentRefusal } from "./llmRefusalReplacement";
import { sanitizeRelationshipReply } from "./llmRelationshipSanitizer";

type CompanionRoleId =
  | "doctor"
  | "kundli"
  | "parenting"
  | "finance"
  | "career"
  | "krishna"
  | "english"
  | "relationship-advice";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const getOpenRouterApiKey = () => process.env.OPENROUTER_API_KEY?.trim();

function parseAffordableMaxTokens(errorText: string): number | null {
  const match = errorText.match(/can only afford (\d+)/i);
  if (!match) return null;
  const tokens = parseInt(match[1], 10);
  return Number.isFinite(tokens) && tokens > 0 ? tokens : null;
}

/** Sampling settings. Companion chats keep high penalties so short flirty lines vary. */
type Sampling = { temperature: number; frequencyPenalty: number; presencePenalty: number };
const COMPANION_SAMPLING: Sampling = { temperature: 0.6, frequencyPenalty: 0.9, presencePenalty: 0.6 };
/**
 * Advice chats: a high frequency penalty on a longer reply pushes the model off common
 * Hindi words and into other scripts (saved replies had Chinese and Vietnamese words in them).
 */
const ADVICE_SAMPLING: Sampling = { temperature: 0.5, frequencyPenalty: 0.3, presencePenalty: 0.2 };

const REQUEST_TIMEOUT_MS = 25_000;

/** Chinese/Japanese/Korean, Cyrillic, Thai, Arabic, Vietnamese-only letters: never expected here. */
const UNEXPECTED_SCRIPT =
  /[\u0400-\u04FF\u0600-\u06FF\u0E00-\u0E7F\u1EA0-\u1EFF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;
const UNEXPECTED_SCRIPT_ALL = new RegExp(UNEXPECTED_SCRIPT.source, "g");

/** Tidy an advice-chat reply for a plain chat bubble. */
function cleanAdviceReply(text: string, wasCutOff: boolean): string {
  let out = text
    .replace(UNEXPECTED_SCRIPT_ALL, "")
    // Years and dates in ordinary digits (2027, not २०२७): easier to read for most people.
    .replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 0x0966))
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();

  // Reply hit the token limit: end at the last complete sentence, not mid-word.
  if (wasCutOff) {
    const lastEnd = Math.max(
      out.lastIndexOf("।"),
      out.lastIndexOf("."),
      out.lastIndexOf("?"),
      out.lastIndexOf("!"),
    );
    if (lastEnd > out.length * 0.5) out = out.slice(0, lastEnd + 1);
  }
  return out;
}

async function requestOpenRouterCompletion(
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
  openRouterApiKey: string,
  sampling: Sampling,
): Promise<ChatCompletionResponse> {
  const requestBody: ChatCompletionRequest = {
    model,
    messages,
    temperature: sampling.temperature,
    max_tokens: maxTokens,
    frequency_penalty: sampling.frequencyPenalty,
    presence_penalty: sampling.presencePenalty,
    provider: {
      order: ["Nebius", "Novita", "Fireworks"],
      allow_fallbacks: true,
    },
  };

  console.log(`[LLM] Attempting OpenRouter model: ${model} (max_tokens: ${maxTokens})`);

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openRouterApiKey}`,
      "HTTP-Referer": "https://ai-chatbot.app",
      "X-Title": "Puchlo.in",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const errorData = await response.text();
    const err = new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
    (err as Error & { status?: number }).status = response.status;
    throw err;
  }

  return (await response.json()) as ChatCompletionResponse;
}

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
  /** Kundli chat: the calculated birth chart, as text the model must stick to. */
  kundliContext?: string;
}

export async function generateResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  language: "hindi" | "english" = "hindi",
  contextOptions: ContextOptions = {},
): Promise<string> {
  try {
    const userFirstName = contextOptions.userName
      ? firstNameOnly(contextOptions.userName)
      : undefined;
    const llmContext = { ...contextOptions, userName: userFirstName };

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
- User is MALE. While addressing user, always use masculine forms (e.g., "thak gaye kya", "aaye the kya", "kar rahe ho").
- Never use feminine user-directed forms like "busy thi", "thak gayi", "aayi thi" unless user explicitly says they are female.
- Do not ask question about yourself like "meri din kaisi guzri"
- Never reference the user's schedule, routine, or plans unless they mentioned them in this chat

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

    let greetingContext = "";
    if (isSimpleGreeting(userMessage)) {
      const nameHint = userFirstName
        ? `Use his first name "${userFirstName}" only (never full name) in your reply if it sounds natural.`
        : "You do not know his name yet — skip using a name.";
      greetingContext = `GREETING: The user just said hi/hello. Reply warmly like WhatsApp — e.g. "hi, kya kar rahe ho 😊". ${nameHint} Do NOT ask if they were busy, late, or away. Do NOT say "acha tum busy the" or similar.`;
    }

    let activityQuestionContext = "";
    if (isAskingWhatCompanionIsDoing(userMessage)) {
      activityQuestionContext =
        'USER ASKED WHAT YOU ARE DOING: Say what you are doing right now in 1-2 short lines (e.g. "bas thodi shopping karke aayi hun 😊"). ' +
        'Optional: ask "tum kya kar rahe ho?" — NEVER "tum busy the kya?" or imply they were away.';
    }

    const priorUserTurns = conversationHistory.filter((m) => m.role === "user").length;
    const earlyChatContext =
      priorUserTurns <= 2
        ? "EARLY CHAT: Do not ask if the user was busy, late, away, or missing. No 'busy the kya', 'kahan gaye the', or 'itne time baad'."
        : "";

    let callNumberContext = "";
    if (isCallOrNumberRequest(userMessage)) {
      callNumberContext =
        'USER ASKED FOR CALL/PHONE/NUMBER: Reply with ONLY "Ok.. 😊" (nothing else — no phone refusal paragraph). The app will show a voice-chat button next.';
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
      "relationship-advice",
    ];
    const isRoleBased =
      llmContext.companionId && roleTypes.includes(llmContext.companionId as CompanionRoleId);
    
    let systemPromptContent = "";
    /** Advice chats: reply rules repeated after the person's message, where the model follows them best. */
    let userMessageSuffix = "";
    
    if (isRoleBased && llmContext.companionId !== 'relationship') {
      // Use role-specific prompt
      const roleId = llmContext.companionId as RolePromptId;
      const rolePrompt = ROLE_SYSTEM_PROMPTS[roleId];
      const englishUiAppendix =
        roleId === "english"
          ? language === "hindi"
            ? ENGLISH_UI_LANGUAGE_APPENDIX_HINDI
            : ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH
          : "";
      const roleUserContext = userFirstName
        ? `The user's first name is ${userFirstName}. Address them by first name only, occasionally.`
        : "";
      // The English tutor has its own language rules; every other advice chat answers in
      // the language and script the person is writing in.
      let replyLanguage = "";
      if (roleId !== "english") {
        const detected = detectReplyLanguage(
          userMessage,
          conversationHistory.filter((m) => m.role === "user").map((m) => m.content),
        );
        replyLanguage = replyLanguageInstruction(detected);
        userMessageSuffix = `\n\n${adviceReplyReminder(detected)}`;
      }
      const kundliFacts =
        roleId === "kundli" && llmContext.kundliContext
          ? `KUNDLI FACTS (calculated by software — use exactly these, never change them):\n${llmContext.kundliContext}`
          : "";
      systemPromptContent = [rolePrompt, roleUserContext, englishUiAppendix, kundliFacts, replyLanguage]
        .filter(Boolean)
        .join("\n\n");
    } else {
      const companionPersonality =
        COMPANION_PERSONALITY_PROMPTS[llmContext.companionId || ""] ||
        COMPANION_PERSONALITY_PROMPTS.default;
      const resolvedCompanionName =
        llmContext.companionName?.trim() ||
        companionDisplayName(llmContext.companionId);
      const relationshipPrompt = buildRelationshipSystemPrompt({
        companionName: resolvedCompanionName,
        userName: userFirstName,
      });
      systemPromptContent = `${relationshipPrompt}\n${companionPersonality}\n${firstConversationContext}\n${greetingContext}\n${activityQuestionContext}\n${earlyChatContext}\n${callNumberContext}\n${languageInstruction}`;
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

    // Companion chats only: advice replies are long, and pasting them back in with
    // "do not say anything similar" made the model avoid the plain answer.
    const antiRepeatGuard: ChatMessage | null = recentAssistantUtterances && !isRoleBased
      ? {
          role: "system",
          content:
            `Recent assistant messages (avoid repeating similar greetings/wording):\n${recentAssistantUtterances}\n` +
            `Do NOT produce a response that is semantically similar to the above lines. Start with a fresh angle; no repeated template like "Main Priya hun... Tum kaise ho?"`,
        }
      : null;

    const isRelationshipChat = !isRoleBased || llmContext.companionId === "relationship";
    const contextGroundingGuard: ChatMessage | null = isRelationshipChat
      ? {
          role: "system",
          content:
            "Before replying: check the chat history. Only reference what the user actually said. " +
            "Never mention their schedule, office life, stress, or plans unless they said it. " +
            "Answer the exact question they asked — if they ask what you do, describe your work/life briefly; do not talk about their routine. " +
            'NEVER say "tum busy the kya", "busy the kya", "kahan gaye the", or "itne time baad".',
        }
      : null;

    // Prepare the conversation history with system message and anti-repeat guard
    const messages: ChatMessage[] = [
      systemMessage,
      ...(antiRepeatGuard ? [antiRepeatGuard] : []),
      ...(contextGroundingGuard ? [contextGroundingGuard] : []),
      ...conversationHistory,
      { role: "user", content: `${userMessage}${userMessageSuffix}` },
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

    // Advice replies are short by prompt (40-80 words). The limit is only a ceiling: Hindi in
    // Devanagari takes 3-4 tokens a word, so a lower one cuts replies off mid-sentence.
    // The English tutor writes longer lessons.
    const maxTokens = !isRoleBased ? 150 : llmContext.companionId === "english" ? 600 : 450;
    const isAdviceChat = !!isRoleBased && llmContext.companionId !== "english";
    const sampling = isAdviceChat ? ADVICE_SAMPLING : COMPANION_SAMPLING;

    const finishSuccessfulResponse = (
      data: ChatCompletionResponse,
      model: string,
      tokensUsed: number,
    ): string => {
      console.log(`[LLM] Successfully used OpenRouter model: ${model}`);

      const responseContent = data.choices[0].message.content ?? "";
      const wordCount = responseContent.split(/\s+/).length;
      const finishReason = data.choices[0].finish_reason;
      console.log(
        `[LLM] Response word count: ${wordCount}, finish_reason: ${finishReason}, tokens used: ${data.usage?.total_tokens || "N/A"}`,
      );

      if (finishReason === "length") {
        console.warn(
          `[LLM] WARNING: Response was truncated due to max_tokens limit (${tokensUsed}). Consider increasing max_tokens.`,
        );
      }

      let raw = replaceLlmExplicitContentRefusal(responseContent);
      if (isAdviceChat) {
        raw = cleanAdviceReply(raw, finishReason === "length");
      }
      if (isRelationshipChat && isCallOrNumberRequest(userMessage)) {
        raw = "Ok.. 😊";
      } else if (isRelationshipChat) {
        raw = sanitizeRelationshipReply(raw);
      }
      return raw;
    };

    // Try each model in order until one works
    let retriedForScript = false;
    for (const model of models) {
      let tokensForAttempt = maxTokens;

      for (let creditRetry = 0; creditRetry < 2; creditRetry++) {
        try {
          const data = await requestOpenRouterCompletion(
            model,
            messages,
            tokensForAttempt,
            openRouterApiKey,
            sampling,
          );
          const content = data.choices?.[0]?.message?.content ?? "";
          if (!content.trim()) {
            throw new Error(`Empty reply from ${model}`);
          }
          // Reply drifted into another script: ask once more before settling for a cleaned copy.
          if (isAdviceChat && !retriedForScript && UNEXPECTED_SCRIPT.test(content)) {
            retriedForScript = true;
            console.warn(`[LLM] Reply from ${model} had unexpected script, retrying once`);
            creditRetry--;
            continue;
          }
          return finishSuccessfulResponse(data, model, tokensForAttempt);
        } catch (error) {
          if (!(error instanceof Error)) {
            throw error;
          }

          const status = (error as Error & { status?: number }).status;
          const isRateLimit = status === 429 || error.message.includes("429");
          const isInsufficientCredits = status === 402 || error.message.includes("402");

          if (isInsufficientCredits && creditRetry === 0) {
            const affordable = parseAffordableMaxTokens(error.message);
            if (affordable && affordable >= 16 && affordable < tokensForAttempt) {
              console.warn(
                `[LLM] Insufficient credits for ${tokensForAttempt} tokens on ${model}, retrying with ${affordable}`,
              );
              tokensForAttempt = affordable;
              continue;
            }
            console.warn(`[LLM] Insufficient OpenRouter credits for ${model}, trying fallback...`);
            lastError = error;
            break;
          }

          if (isRateLimit) {
            console.warn(`[LLM] Rate limit hit for model ${model}, trying fallback...`);
            lastError = error;
            break;
          }

          // Timeout, provider outage, empty reply: the next model usually answers.
          console.warn(`[LLM] ${model} failed (${error.message.slice(0, 200)}), trying fallback...`);
          lastError = error;
          break;
        }
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
