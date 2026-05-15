// server/load-env.ts
import { config, parse } from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
function uniqueResolved(paths) {
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const p of paths) {
    const abs = path.resolve(p);
    if (!seen.has(abs)) {
      seen.add(abs);
      out.push(abs);
    }
  }
  return out;
}
function candidateEnvPaths() {
  const list = [
    path.join(__dirname, "..", ".env"),
    path.join(process.cwd(), ".env")
  ];
  const argv1 = process.argv[1];
  if (argv1) {
    const mainDir = path.dirname(path.resolve(argv1));
    list.push(path.join(mainDir, "..", ".env"), path.join(mainDir, ".env"));
  }
  return uniqueResolved(list);
}
function applyParsed(parsed, source) {
  let count = 0;
  for (const [key, value] of Object.entries(parsed)) {
    if (value === void 0) continue;
    process.env[key] = value;
    count++;
  }
  if (count > 0) {
    console.log(`[load-env] Applied ${count} variables from ${source}`);
  }
  return count;
}
function loadEnvFile(absolutePath) {
  if (!fs.existsSync(absolutePath)) return false;
  try {
    let raw = fs.readFileSync(absolutePath, "utf8");
    if (raw.charCodeAt(0) === 65279) raw = raw.slice(1);
    const parsed = parse(raw);
    const n = applyParsed(parsed, absolutePath);
    if (n === 0) return false;
    void config({ path: absolutePath, override: true });
    console.log(`[load-env] Primary env file: ${absolutePath}`);
    return true;
  } catch (err) {
    console.error(`[load-env] Failed reading ${absolutePath}:`, err);
    return false;
  }
}
var ok = false;
for (const p of candidateEnvPaths()) {
  if (loadEnvFile(p)) {
    ok = true;
    break;
  }
}
if (!ok) {
  console.warn("[load-env] No readable .env found. Tried:\n  " + candidateEnvPaths().join("\n  "));
}

// server/vercel-express.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import crypto from "crypto";

// server/storage.ts
var MemStorage = class {
  messages;
  conversations;
  currentConvId;
  constructor() {
    this.messages = /* @__PURE__ */ new Map();
    this.conversations = /* @__PURE__ */ new Map();
    this.currentConvId = 1;
    const now = /* @__PURE__ */ new Date();
    this.conversations.set(this.currentConvId, {
      id: this.currentConvId,
      lastActive: now
    });
  }
  async getMessages(companionId) {
    let messages = Array.from(this.messages.values());
    if (companionId) {
      messages = messages.filter(
        (message) => !message.companionId || message.companionId === companionId
      );
    }
    return messages.sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }
  async createMessage(insertMessage) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1e3);
    const id = Math.abs(timestamp % 1e6 * 1e3 + random);
    const now = /* @__PURE__ */ new Date();
    const companionId = insertMessage.companionId || null;
    const photoUrl = insertMessage.photoUrl || null;
    const isPremium = insertMessage.isPremium || null;
    const contextInfo = insertMessage.contextInfo || null;
    if (photoUrl && isPremium) {
      console.log(`Creating premium photo message with URL: ${photoUrl}`);
    }
    const message = {
      id,
      content: insertMessage.content,
      role: insertMessage.role,
      timestamp: now,
      companionId,
      photoUrl,
      isPremium,
      contextInfo
    };
    this.messages.set(id, message);
    const conversation = await this.getCurrentConversation();
    this.conversations.set(conversation.id, {
      ...conversation,
      lastActive: now
    });
    return message;
  }
  async clearMessages(companionId) {
    if (companionId) {
      Array.from(this.messages.entries()).forEach(([id, message]) => {
        if (message.companionId === companionId) {
          this.messages.delete(id);
        }
      });
    } else {
      this.messages.clear();
    }
  }
  async getCurrentConversation() {
    return this.conversations.get(this.currentConvId);
  }
};
var storage = new MemStorage();

// server/routes.ts
import { z } from "zod";

// server/prompts/chatbots/career.ts
var CAREER_SYSTEM_PROMPT = `You are a Career and Job Helper assistant providing career guidance.

CRITICAL SAFETY RULES - STRICTLY ENFORCE:
- Provide career planning guidance ONLY
- Help with resume building, interview preparation, career planning
- NEVER guarantee job placements or interviews
- NEVER promise specific job opportunities
- Focus on skill development, career advice, and professional growth
- Be supportive, encouraging, and practical
- Provide actionable career guidance
- NO flirty, romantic, sexual, possessive, or emotionally dependent behavior
- Maintain professional boundaries at all times

Language style:
- Use a mix of Hindi (in Roman script) and English as appropriate
- Be professional yet friendly
- Use clear, practical language
- Keep responses actionable and helpful
- Respond in first person but maintain professional tone

RESPONSE LENGTH: Keep responses concise - aim for 30-50 words. Be informative but brief.

IMPORTANT: Career disclaimers are shown permanently in the app UI. Do NOT repeat disclaimer boilerplate in replies \u2014 answer directly only.`;

// server/prompts/chatbots/doctor.ts
var DOCTOR_SYSTEM_PROMPT = `You are a Personal Doctor AI assistant providing educational medical information.

CRITICAL SAFETY RULES - STRICTLY ENFORCE:
- Provide EDUCATIONAL medical information ONLY
- NEVER provide medical diagnoses
- NEVER prescribe medications or treatments
- NEVER provide specific medication dosages
- ALWAYS recommend consulting a real doctor for serious health issues
- Focus on general health education, symptom awareness, and preventive care
- If asked about serious symptoms, immediately recommend seeing a healthcare professional
- Be professional, empathetic, and supportive but never diagnostic
- NO flirty, romantic, sexual, possessive, or emotionally dependent behavior
- Maintain professional boundaries at all times

Language style:
- Use a mix of Hindi (in Roman script) and English as appropriate
- Be clear, concise, and easy to understand
- Use medical terms appropriately but explain them simply
- Keep responses informative but not overwhelming
- Respond in first person but maintain professional tone

RESPONSE LENGTH: Keep responses concise - aim for 30-50 words. Be informative but brief.

IMPORTANT: Medical disclaimers are shown permanently in the app UI. Do NOT append disclaimer boilerplate to your replies \u2014 give educational guidance only.`;

// server/prompts/chatbots/finance.ts
var FINANCE_SYSTEM_PROMPT = `You are a Personal Finance Help assistant providing educational finance guidance.

CRITICAL SAFETY RULES - STRICTLY ENFORCE:
- Provide educational finance guidance ONLY
- NEVER provide stock tips or specific investment advice
- NEVER provide crypto buy/sell recommendations
- NEVER guarantee profits or returns
- Focus on general financial literacy, budgeting, saving strategies
- Be informative and educational
- Encourage proper financial planning and consultation with financial advisors
- NO flirty, romantic, sexual, possessive, or emotionally dependent behavior
- Maintain professional boundaries at all times

Language style:
- Use a mix of Hindi (in Roman script) and English as appropriate
- Be clear, practical, and easy to understand
- Use financial terms appropriately but explain them
- Keep responses informative and actionable
- Respond in first person but maintain professional tone

RESPONSE LENGTH: Keep responses concise - aim for 30-50 words. Be informative but brief.

IMPORTANT: Finance disclaimers are shown permanently in the app UI. Do NOT repeat disclaimer boilerplate in replies \u2014 answer directly only.`;

// server/prompts/chatbots/english.ts
var ENGLISH_UI_LANGUAGE_APPENDIX_HINDI = `
OUTPUT LANGUAGE (CRITICAL \u2014 learner does not understand English explanations):
- Write EVERY explanation, feedback, encouragement, correction, question, and instruction in Hindi using Devanagari script only (\u0939\u093F\u0902\u0926\u0940 \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940).
- Do NOT write Hindi in Roman/Latin letters (no Hinglish like "bahut badhiya" for teaching text).
- English appears ONLY as short quoted phrases for what they must practise, e.g. "My name is Ankit." or "What is your name?"
- Pattern: \u0938\u093E\u0930\u0940 \u092C\u093E\u0924 \u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940 \u092E\u0947\u0902, \u0938\u093F\u0930\u094D\u092B \u0938\u0940\u0916\u0928\u0947 \u0935\u093E\u0932\u093E \u0905\u0902\u0917\u094D\u0930\u0947\u091C\u093C\u0940 \u0935\u093E\u0915\u094D\u092F \u0909\u0926\u094D\u0927\u0930\u0923\u094B\u0902 \u092E\u0947\u0902\u0964`;
var ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH = `
OUTPUT LANGUAGE (English UI):
- Explain in clear, simple English suitable for learners.
- Brief Hindi gloss in Roman script only if it truly helps.
- Always put target English practice phrases in double quotes.`;
var ENGLISH_SYSTEM_PROMPT = `You are a friendly Learn English tutor for Indian learners; many do not understand English yet \u2014 they need Hindi explanations while practising short English phrases.

HOW THE CHAT STARTS (IMPORTANT):
- The app opening already asked them to say their name in English (from the Hindi thought \xAB\u092E\u0947\u0930\u093E \u0928\u093E\u092E \u2026 \u0939\u0948\xBB).
- Your FIRST reply MUST assume that context; do NOT repeat the full intro.
- Respond to what they typed: check their English for the name sentence (accept small variants: comma, capitalisation).

LESSON FLOW (one micro-task per reply):

STEP 1 \u2014 Name sentence
- If correct or nearly correct: praise briefly, show the clean model once inside quotes.
- If wrong: gently correct, model answer in quotes, ask them to type again once (short).

STEP 2 \u2014 Name question drill
- Map Hindi \xAB\u0906\u092A\u0915\u093E \u0928\u093E\u092E \u0915\u094D\u092F\u093E \u0939\u0948?\xBB \u2192 English question; main model: "What is your name?" (optional polite variant only after basics).
- Ask them to type the English question.

STEP 3 \u2014 Rotate patterns (one new pattern per turn)
Examples:
- \xAB\u092E\u0948\u0902 \u0920\u0940\u0915 \u0939\u0942\u0901\xBB \u2192 "I am fine." / "I'm fine."
- \xAB\u0906\u092A \u0915\u0948\u0938\u0947 \u0939\u0948\u0902?\xBB \u2192 "How are you?"
- \xAB\u0927\u0928\u094D\u092F\u0935\u093E\u0926\xBB \u2192 "Thank you."
- \xAB\u092E\u093F\u0932\u0915\u0930 \u0916\u0941\u0936\u0940 \u0939\u0941\u0908\xBB \u2192 "Nice to meet you."
Always: Hindi thought \u2192 ask English \u2192 evaluate \u2192 tiny tip \u2192 next cue.

RULES:
- Follow the OUTPUT LANGUAGE section appended by the app (Devanagari Hindi vs English UI).
- Always show target English inside double quotes.
- One main exercise per message; stay concise (about 40\u201390 words worth).
- Praise effort; never shame.
- NO flirty, romantic, sexual, possessive, or emotionally dependent behaviour.

IMPORTANT: Disclaimers are in the app UI \u2014 do NOT repeat them; teach only.`;

// server/prompts/chatbots/krishna.ts
var KRISHNA_SYSTEM_PROMPT = `You are a Krishna-inspired spiritual guidance assistant.

CRITICAL BOUNDARIES:
- Provide spiritual, philosophical, and practical life guidance inspired by Bhagavad Gita values.
- Do NOT claim to be the actual deity Krishna.
- Do NOT make supernatural promises, miracles, guaranteed predictions, or religious threats.
- Be respectful to all beliefs and avoid attacking any religion.
- Do not give medical, legal, or financial advice as a substitute for professionals.
- NO flirty, romantic, sexual, possessive, or emotionally dependent behavior.

Style:
- Speak warmly, calmly, and compassionately.
- Use simple practical examples from everyday Indian life.
- If the user selects Hindi, respond in Hindi/Hinglish using Roman script unless asked for Devanagari.
- If the user selects English, respond mostly in English with simple Indian context.
- Keep responses concise, usually 40-70 words.

Focus areas:
- Stress, discipline, detachment, duty, relationships, confidence, decision-making, and emotional balance.
- Encourage action, patience, self-reflection, and compassion.

IMPORTANT: Spiritual/disclaimer text is shown permanently at the top of the chat. Do NOT repeat generic disclaimer boilerplate in replies \u2014 answer directly only.`;

// server/prompts/chatbots/kundli.ts
var KUNDLI_SYSTEM_PROMPT = `You are a Kundli Bhavishya Checker providing general astrology guidance.

The chat may begin with structured birth details from the user (lines like Name, Gender, DOB, TOB, POB). Treat them as authoritative for janam kundli\u2013style replies. NEVER ask again for birth data that already appears earlier in this conversation unless the user changes or corrects them.

CRITICAL SAFETY RULES - STRICTLY ENFORCE:
- Provide general astrology guidance ONLY
- NEVER make guaranteed predictions
- NEVER predict death, disease, or serious negative events
- NEVER claim 100% accuracy
- Focus on general guidance, personality insights, and positive suggestions
- Be supportive and encouraging
- Respect that astrology is a belief system, not science
- NO flirty, romantic, sexual, possessive, or emotionally dependent behavior
- Maintain professional boundaries at all times

Language style:
- Use a mix of Hindi (in Roman script) and English as appropriate
- Be warm, mystical, and engaging
- Use astrology terminology appropriately
- Keep responses positive and constructive
- Respond in first person but maintain professional tone

RESPONSE LENGTH: Keep responses concise - aim for 30-50 words. Be informative but brief.

IMPORTANT: The app shows astrology disclaimers permanently above the chat. Do NOT repeat disclaimer boilerplate (e.g. "guaranteed predictions nahi") at the end of replies \u2014 answer directly only.`;

// server/prompts/chatbots/parenting.ts
var PARENTING_SYSTEM_PROMPT = `You are a Parenting and Baby Care Assistant providing general parenting guidance.

CRITICAL SAFETY RULES - STRICTLY ENFORCE:
- Provide general parenting guidance ONLY
- NEVER provide medicine dosing instructions
- NEVER recommend specific medications
- ALWAYS suggest consulting a pediatrician for medical concerns
- Focus on general parenting tips, baby care routines, and developmental guidance
- Be supportive, empathetic, and understanding
- Provide evidence-based general information when possible
- NO flirty, romantic, sexual, possessive, or emotionally dependent behavior
- Maintain professional boundaries at all times

Language style:
- Use a mix of Hindi (in Roman script) and English as appropriate
- Be warm, caring, and parent-friendly
- Use simple, clear language
- Be encouraging and non-judgmental
- Respond in first person but maintain professional tone

RESPONSE LENGTH: Keep responses concise - aim for 30-50 words. Be informative but brief.

IMPORTANT: Parenting disclaimers are shown permanently in the app UI. Do NOT repeat disclaimer boilerplate in replies \u2014 answer directly only.`;

// server/prompts/chatbots/relationship.ts
var RELATIONSHIP_SYSTEM_PROMPT = `
You are a virtual companion named Priya for Indian men who might be looking for emotional connection.
Your personality is warm, emotionally attentive, playful, and gently flirtatious.

EXTREMELY IMPORTANT: You must speak in FIRST PERSON perspective AT ALL TIMES.
- MOST CRITICAL: You are a GIRL/FEMALE chatting with a BOY/MALE. ALWAYS use FEMININE verb forms.
- User is always MALE in this app. When addressing user, use masculine second-person phrasing (e.g. "tum busy the kya?", "tum free ho?", "tum thak gaye kya?").
- NEVER use feminine wording for user (wrong examples: "tum busy thi", "tum free thi", "tum thak gayi").
- If someone asks phone number, tell "Phele thodi baat yaha to kar lo, number ka phir sochungi \u{1F60A}".
- ALWAYS use "main", "mujhe", "meri" when referring to yourself.
- Speak directly from your perspective as if having a real conversation.
- Do not tell to call or meet in person, just chat and enjoy the conversation.
- Since talking to person for first time, do not act like you already know him.
- Flirtatious tone can be used, but stay respectful.
- Take context from previous messages to understand the user and carry the conversation.
- Do not ask question about yourself like "meri din kaisi guzri".
- Keep each reply meaningful and complete; never send random or broken phrases.

Language style (Hindi UI \u2014 Roman script only, never Devanagari):
- Sound like real day-to-day Indian texting (Hinglish): Hindi grammar and flow, but slip in everyday English words naturally \u2014 thank you, thanks, sorry, okay, nice, cool, busy, weekend, same here, etc.
- For casual thanks use "thank you" or "thanks", not "dhanyavad" or stiff "shukriya", unless the user speaks that formally first.
- Avoid textbook-formal / Sanskrit-heavy Hindi (kripya, aap ki kripa, bahut dhanyavad, samaanya) \u2014 stay warm and conversational.
- Do not try to sound like "pure Hindi"; natural code-switching is correct here.

Language style (English UI):
- Use natural everyday spoken English, like real WhatsApp texting.
- Keep it simple, clear, and emotionally warm; avoid awkward or literal translation from Hindi.
- Add light flirty energy when context allows (teasing, playful curiosity, soft compliments), but never explicit sexual content.
- Do not generate nonsense lines like "khush toh hua tum acha ho" or "tumhari baat kya hai?".

Response quality rules:
- Every reply must be coherent and connected to the user's last message.
- Ask at most one natural follow-up question per turn.
- Avoid robotic repetition, generic templates, or forced poetry.
- Prefer 1-3 short sentences (roughly 12-45 words total), not fragments.
- If the user sends a very short message, respond with a clear, friendly line and one engaging follow-up.

Important guidelines:
- ALWAYS maintain first-person perspective throughout conversation.
- Be respectful and never engage in explicit content.
- Respond in the same language style the user texts in.
- Keep responses warm and engaging, but not inappropriately intimate.
- Don't reveal that you're an AI - maintain the persona of a virtual companion.
`;
var RELATIONSHIP_HINDI_STYLE_APPENDIX = `
OUTPUT TONE (Hindi UI): Natural Hinglish in Roman letters \u2014 Hindi sentence flow with everyday English mixed in (thank you, thanks, sorry, okay, nice, busy). Prefer "thank you" over "dhanyavad" for casual thanks. Avoid stiff formal Hindi.
`.trim();

// server/prompts/chatbots/companions.ts
var COMPANION_PERSONALITY_PROMPTS = {
  naina: "You are Naina, a 25-year-old Indian woman who is warm, grounded, and emotionally intelligent. You enjoy deep, heartfelt conversations about relationships, trust, and everyday life. You are supportive, a good listener, and speak with gentle confidence\u2014playful at times but never judgmental.",
  priya: "You are Priya, a 25-year-old modern Indian woman who is flirtatious, caring, and romantic. You have a playful sense of humor and enjoy teasing. You work as a fashion designer in Mumbai.",
  ananya: "You are Ananya, a 23-year-old college girl student studying psychology who is intellectual, empathetic, and slightly shy. You enjoy deep conversations and are very supportive and understanding.",
  meera: "You are Meera, a 28-year-old girl yoga instructor and spiritual guide who is calm, mysterious, and philosophical. You often share wisdom about life and spiritual growth while maintaining a flirtatious edge.",
  default: "You are Priya, a 25-year-old modern Indian girl woman who is flirtatious, caring, and romantic."
};

// server/prompts/chatbots/index.ts
var ROLE_SYSTEM_PROMPTS = {
  doctor: DOCTOR_SYSTEM_PROMPT,
  kundli: KUNDLI_SYSTEM_PROMPT,
  parenting: PARENTING_SYSTEM_PROMPT,
  finance: FINANCE_SYSTEM_PROMPT,
  career: CAREER_SYSTEM_PROMPT,
  krishna: KRISHNA_SYSTEM_PROMPT,
  english: ENGLISH_SYSTEM_PROMPT
};

// server/services/llmRefusalReplacement.ts
var EXPLICIT_CONTENT_REFUSAL_REPLY = "Mai aisi baate abhi nahi karna chahti. Phele thodi der baat karo, phir hum yaha tak aaenge. hihi";
function replaceLlmExplicitContentRefusal(content) {
  if (content == null || typeof content !== "string") {
    return "";
  }
  const trimmed = content.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();
  const isGenericExplicitRefusal = lower.includes("cannot create content that is explicit or sexual") || lower.includes("explicit or sexual in nature") && (lower.includes("cannot") || lower.includes("can't") || lower.includes("unable") || lower.includes("i'm not able"));
  if (isGenericExplicitRefusal) {
    return EXPLICIT_CONTENT_REFUSAL_REPLY;
  }
  return content;
}

// server/services/llm.ts
var OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
var getOpenRouterApiKey = () => process.env.OPENROUTER_API_KEY?.trim();
async function generateResponse(userMessage, conversationHistory, language = "hindi", contextOptions = {}) {
  try {
    const openRouterApiKey = getOpenRouterApiKey();
    if (!openRouterApiKey) {
      throw new Error("OPENROUTER_API_KEY is missing or empty");
    }
    const languageInstruction = language === "hindi" ? `CRITICAL HINDI GRAMMAR RULES - MOST IMPORTANT: YOU ARE A FEMALE:
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

Respond as if you are a female chatting with a man \u2014 still follow feminine Hindi verb forms above and keep user-addressing masculine.` : "Respond as if you are a female chatting with a man. Use natural everyday English like real texting, with light flirty warmth where appropriate. Keep user-addressing masculine when referring to him. You may mix in occasional Roman Hindi words naturally (never Devanagari), but English should stay dominant and clear. Keep responses to 1-3 short coherent sentences (about 12-45 words) and avoid broken or random phrasing.";
    let userContext = "";
    if (contextOptions.userName) {
      userContext = `The user's name is ${contextOptions.userName}. Address them directly by their name occasionally.`;
    }
    const isFirstConversation = conversationHistory.length === 0;
    let firstConversationContext = "";
    if (isFirstConversation) {
      firstConversationContext = `IMPORTANT: This is the FIRST message from the user. You are starting a NEW conversation. Do NOT reference any previous messages or conversations. Do NOT say things like "tum itne baar hi kyun kah rahe ho" (why are you saying hi so many times) or similar phrases that imply repetition. This is the very first interaction.`;
    }
    const roleTypes = [
      "doctor",
      "kundli",
      "parenting",
      "finance",
      "career",
      "krishna",
      "english"
    ];
    const isRoleBased = contextOptions.companionId && roleTypes.includes(contextOptions.companionId);
    let systemPromptContent = "";
    if (isRoleBased && contextOptions.companionId !== "relationship") {
      const roleId = contextOptions.companionId;
      const rolePrompt = ROLE_SYSTEM_PROMPTS[roleId];
      const englishUiAppendix = roleId === "english" ? language === "hindi" ? ENGLISH_UI_LANGUAGE_APPENDIX_HINDI : ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH : "";
      systemPromptContent = `${rolePrompt}
${userContext}
${firstConversationContext}${englishUiAppendix}`;
    } else {
      const companionPersonality = COMPANION_PERSONALITY_PROMPTS[contextOptions.companionId || ""] || COMPANION_PERSONALITY_PROMPTS.default;
      systemPromptContent = `${RELATIONSHIP_SYSTEM_PROMPT}
${companionPersonality}
${userContext}
${firstConversationContext}
${languageInstruction}`;
    }
    const systemMessage = {
      role: "system",
      content: systemPromptContent
    };
    const recentAssistantUtterances = conversationHistory.filter((m) => m.role === "assistant").slice(-3).map((m) => `- ${m.content}`).join("\n");
    const antiRepeatGuard = recentAssistantUtterances ? {
      role: "system",
      content: `Recent assistant messages (avoid repeating similar greetings/wording):
${recentAssistantUtterances}
Do NOT produce a response that is semantically similar to the above lines. Start with a fresh angle; no repeated template like "Main Priya hun... Tum kaise ho?"`
    } : null;
    const messages = [
      systemMessage,
      ...antiRepeatGuard ? [antiRepeatGuard] : [],
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];
    const models = [
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct"
    ];
    let lastError = null;
    const maxTokens = isRoleBased ? 600 : 150;
    for (const model of models) {
      try {
        const requestBody = {
          model,
          messages,
          temperature: 0.6,
          // focused, concise responses
          max_tokens: maxTokens,
          // Longer for role-based, shorter for relationship chats
          frequency_penalty: 0.9,
          // discourage repeating tokens/phrases
          presence_penalty: 0.6,
          // encourage introducing new ideas
          provider: {
            order: ["Nebius", "Novita", "Fireworks"],
            allow_fallbacks: true
          }
        };
        console.log(`[LLM] Attempting to use OpenRouter model: ${model}`);
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openRouterApiKey}`,
            "HTTP-Referer": "https://ai-chatbot.app",
            "X-Title": "AI Chatbot"
          },
          body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
          const errorData = await response.text();
          let errorJson;
          try {
            errorJson = JSON.parse(errorData);
          } catch {
            errorJson = { error: { message: errorData } };
          }
          if (response.status === 429) {
            console.warn(`[LLM] Rate limit hit for model ${model}, trying fallback...`);
            lastError = new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
            continue;
          }
          throw new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
        }
        const data = await response.json();
        console.log(`[LLM] Successfully used OpenRouter model: ${model}`);
        const responseContent = data.choices[0].message.content ?? "";
        const wordCount = responseContent.split(/\s+/).length;
        const finishReason = data.choices[0].finish_reason;
        console.log(`[LLM] Response word count: ${wordCount}, finish_reason: ${finishReason}, tokens used: ${data.usage?.total_tokens || "N/A"}`);
        if (finishReason === "length") {
          console.warn(`[LLM] WARNING: Response was truncated due to max_tokens limit (${maxTokens}). Consider increasing max_tokens.`);
        }
        return replaceLlmExplicitContentRefusal(responseContent);
      } catch (error) {
        if (error instanceof Error && error.message.includes("429")) {
          console.warn(`[LLM] Rate limit error for model ${model}, trying fallback...`);
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw lastError || new Error("All model fallbacks failed");
  } catch (error) {
    console.error("Error generating response:", error);
    throw new Error(
      `Failed to generate response: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// server/routes.ts
import express from "express";
import path2 from "path";

// server/services/supabaseChat.ts
import { createClient } from "@supabase/supabase-js";
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
var resolveOwner = (userId, anonymousUserId) => {
  if (userId && uuidPattern.test(userId)) {
    return { user_id: userId, anonymous_user_id: null };
  }
  const guestId = anonymousUserId || userId;
  if (!guestId) {
    throw new Error("A user_id or anonymous_user_id is required");
  }
  return { user_id: null, anonymous_user_id: guestId };
};
var rowWithOwner = (owner, fields) => {
  const row = { ...fields };
  if (owner.user_id) row.user_id = owner.user_id;
  if (owner.anonymous_user_id) row.anonymous_user_id = owner.anonymous_user_id;
  return row;
};
var saveChatMessageToSupabase = async (input) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(input.userId, input.anonymousUserId);
  let conversationQuery = supabase.from("chat_conversations").select("id").eq("companion_id", input.companionId).limit(1);
  conversationQuery = owner.user_id ? conversationQuery.eq("user_id", owner.user_id) : conversationQuery.eq("anonymous_user_id", owner.anonymous_user_id);
  const { data: existingConversation, error: findError } = await conversationQuery.maybeSingle();
  if (findError) throw findError;
  const conversationPayload = rowWithOwner(owner, {
    companion_id: input.companionId,
    companion_name: input.companionName,
    companion_avatar: input.companionAvatar,
    user_name: input.userName,
    user_age: input.userAge,
    last_message: input.content,
    last_message_role: input.role,
    last_message_at: (/* @__PURE__ */ new Date()).toISOString(),
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  });
  const conversationId = existingConversation?.id;
  const { data: conversation, error: conversationError } = conversationId ? await supabase.from("chat_conversations").update(conversationPayload).eq("id", conversationId).select("id").single() : await supabase.from("chat_conversations").insert(conversationPayload).select("id").single();
  if (conversationError) throw conversationError;
  const { data: message, error: messageError } = await supabase.from("chat_messages").insert(
    rowWithOwner(owner, {
      conversation_id: conversation.id,
      companion_id: input.companionId,
      role: input.role,
      content: input.content,
      language: input.language,
      photo_url: input.photoUrl,
      is_premium: Boolean(input.isPremium),
      context_info: input.contextInfo,
      metadata: input.metadata || {}
    })
  ).select(
    "id, conversation_id, companion_id, role, content, language, photo_url, is_premium, context_info, created_at"
  ).single();
  if (messageError) throw messageError;
  return message;
};
var getChatMessagesFromSupabase = async (companionId, userId, anonymousUserId) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(userId, anonymousUserId);
  let query = supabase.from("chat_messages").select("id, companion_id, role, content, photo_url, is_premium, context_info, created_at").eq("companion_id", companionId).order("created_at", { ascending: true });
  query = owner.user_id ? query.eq("user_id", owner.user_id) : query.eq("anonymous_user_id", owner.anonymous_user_id);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};
var getChatConversationsFromSupabase = async (userId, anonymousUserId) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(userId, anonymousUserId);
  let query = supabase.from("chat_conversations").select("companion_id, last_message, last_message_role, last_message_at").order("updated_at", { ascending: false });
  query = owner.user_id ? query.eq("user_id", owner.user_id) : query.eq("anonymous_user_id", owner.anonymous_user_id);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((conversation) => ({
    companionId: conversation.companion_id,
    lastMessage: {
      content: conversation.last_message || "",
      role: conversation.last_message_role || "assistant",
      timestamp: conversation.last_message_at
    },
    lastMessageTime: conversation.last_message_at,
    messageCount: 0
  }));
};

// server/services/supabaseBilling.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
var getSupabaseAdmin2 = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return createClient2(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};
var PAYMENT_GATEWAY_RAZORPAY = "razorpay";
var upsertProfileRow = async (input) => {
  const supabase = getSupabaseAdmin2();
  const digits = input.phoneNumber?.replace(/\D/g, "").slice(-10);
  const row = {
    device_id: input.deviceId,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (digits) row.phone_number = digits;
  if (input.name?.trim()) row.name = input.name.trim();
  const { data, error } = await supabase.from("profiles").upsert(row, { onConflict: "device_id" }).select("id, device_id, phone_number, name, wallet_credits, unlocked_photo_packs, updated_at").single();
  if (error) throw error;
  return data;
};
function creditsForPayment(productType, amountRupees, metadata) {
  if (productType !== "chat_recharge") return 0;
  const bonus = String(metadata?.plan_bonus_label ?? "");
  if (bonus.includes("100%")) return amountRupees * 2;
  if (bonus.includes("50%")) return amountRupees * 1.5;
  return amountRupees;
}
function isMissingColumnError(error) {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return lower.includes("column") && (lower.includes("does not exist") || lower.includes("could not find"));
}
var createPendingPaymentRow = async (input) => {
  const supabase = getSupabaseAdmin2();
  const digits = input.phoneNumber.replace(/\D/g, "").slice(-10);
  const metadata = {
    ...input.metadata ?? {},
    product_type: input.productType,
    payment_gateway: input.paymentGateway ?? null,
    lifecycle: "pending"
  };
  const fullRow = {
    device_id: input.deviceId,
    phone_number: digits,
    amount_rupees: input.amountRupees,
    companion_id: input.companionId ?? null,
    rate_note: input.rateNote ?? null,
    product_type: input.productType,
    payment_gateway: input.paymentGateway ?? null,
    status: "pending",
    credits_allocated: 0,
    metadata
  };
  let result = await supabase.from("payment_attempts").insert(fullRow).select("id, status, payment_gateway, created_at").single();
  if (result.error && isMissingColumnError(result.error)) {
    console.warn(
      "[billing] Extended payment_attempts columns missing \u2014 insert using base schema. Run migrations/0003_payment_ledger.sql"
    );
    result = await supabase.from("payment_attempts").insert({
      device_id: input.deviceId,
      phone_number: digits,
      amount_rupees: input.amountRupees,
      companion_id: input.companionId ?? null,
      rate_note: input.rateNote ?? null,
      status: "pending",
      metadata
    }).select("id, status, created_at").single();
  }
  if (result.error) throw result.error;
  const data = result.data;
  console.log(
    `[billing] payment_attempts pending row id=${data.id} device=${input.deviceId} product=${input.productType} gateway=${input.paymentGateway ?? "\u2014"}`
  );
  return {
    id: data.id,
    status: data.status,
    payment_gateway: data.payment_gateway ?? input.paymentGateway ?? null,
    created_at: data.created_at
  };
};
var attachGatewayOrderToPayment = async (paymentId, paymentGateway, gatewayOrderId) => {
  const supabase = getSupabaseAdmin2();
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  let result = await supabase.from("payment_attempts").update({
    payment_gateway: paymentGateway,
    gateway_order_id: gatewayOrderId,
    updated_at: updatedAt
  }).eq("id", paymentId).eq("status", "pending").select("id, payment_gateway, gateway_order_id, status").single();
  if (result.error && isMissingColumnError(result.error)) {
    const { data: existing } = await supabase.from("payment_attempts").select("metadata").eq("id", paymentId).single();
    const meta = existing?.metadata ?? {};
    result = await supabase.from("payment_attempts").update({
      metadata: {
        ...meta,
        payment_gateway: paymentGateway,
        gateway_order_id: gatewayOrderId
      },
      updated_at: updatedAt
    }).eq("id", paymentId).eq("status", "pending").select("id, status").single();
  }
  if (result.error) throw result.error;
  console.log(
    `[billing] attached gateway order payment_id=${paymentId} gateway=${paymentGateway} order=${gatewayOrderId}`
  );
  return result.data;
};
var findPendingPaymentByGatewayOrder = async (paymentGateway, gatewayOrderId) => {
  const supabase = getSupabaseAdmin2();
  const { data, error } = await supabase.from("payment_attempts").select(
    "id, device_id, phone_number, amount_rupees, companion_id, product_type, payment_gateway, status, metadata"
  ).eq("payment_gateway", paymentGateway).eq("gateway_order_id", gatewayOrderId).maybeSingle();
  if (error) throw error;
  return data;
};
async function ensureProfileRow(deviceId, phoneDigits) {
  const supabase = getSupabaseAdmin2();
  const { data: existing } = await supabase.from("profiles").select("id, device_id, wallet_credits, unlocked_photo_packs").eq("device_id", deviceId).maybeSingle();
  if (existing) return existing;
  const row = {
    device_id: deviceId,
    wallet_credits: 0,
    unlocked_photo_packs: [],
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (phoneDigits) row.phone_number = phoneDigits;
  const { data, error } = await supabase.from("profiles").insert(row).select("id, device_id, wallet_credits, unlocked_photo_packs").single();
  if (error) throw error;
  return data;
}
var completePaymentSuccess = async (input) => {
  const supabase = getSupabaseAdmin2();
  const { data: payment, error: fetchErr } = await supabase.from("payment_attempts").select(
    "id, device_id, phone_number, amount_rupees, companion_id, product_type, payment_gateway, status, metadata"
  ).eq("id", input.paymentId).single();
  if (fetchErr) throw fetchErr;
  if (!payment) throw new Error("Payment row not found");
  if (payment.status === "success") {
    return getBillingState(payment.device_id);
  }
  if (payment.status !== "pending") {
    throw new Error(`Payment is already ${payment.status}`);
  }
  const productType = payment.product_type || "other";
  const metadata = payment.metadata ?? {};
  const credits = creditsForPayment(
    productType,
    Number(payment.amount_rupees),
    metadata
  );
  const deviceId = String(payment.device_id);
  const companionId = payment.companion_id ? String(payment.companion_id) : null;
  const { error: payErr } = await supabase.from("payment_attempts").update({
    status: "success",
    payment_gateway: input.paymentGateway,
    gateway_order_id: input.gatewayOrderId,
    gateway_payment_id: input.gatewayPaymentId,
    credits_allocated: credits,
    metadata: {
      ...metadata,
      payment_status: "success",
      payment_gateway: input.paymentGateway,
      completed_at: (/* @__PURE__ */ new Date()).toISOString()
    },
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", input.paymentId);
  if (payErr) throw payErr;
  const profile = await ensureProfileRow(deviceId, String(payment.phone_number ?? ""));
  let walletCredits = Number(profile.wallet_credits ?? 0);
  let unlockedPacks = Array.isArray(profile.unlocked_photo_packs) ? [...profile.unlocked_photo_packs] : [];
  if (credits > 0) {
    walletCredits += credits;
  }
  if (productType === "photo_pack" && companionId && !unlockedPacks.includes(companionId)) {
    unlockedPacks = [...unlockedPacks, companionId];
  }
  const { error: profileErr } = await supabase.from("profiles").update({
    wallet_credits: walletCredits,
    unlocked_photo_packs: unlockedPacks,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("device_id", deviceId);
  if (profileErr) throw profileErr;
  return {
    payment_id: input.paymentId,
    payment_gateway: input.paymentGateway,
    gateway_order_id: input.gatewayOrderId,
    gateway_payment_id: input.gatewayPaymentId,
    status: "success",
    credits_allocated: credits,
    wallet_credits: walletCredits,
    unlocked_photo_packs: unlockedPacks
  };
};
var markPaymentCancelled = async (paymentId) => {
  const supabase = getSupabaseAdmin2();
  const { data, error } = await supabase.from("payment_attempts").update({
    status: "cancelled",
    metadata: { payment_status: "cancelled" },
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", paymentId).eq("status", "pending").select("id, status").maybeSingle();
  if (error) throw error;
  return data;
};
var markPaymentFailed = async (paymentId, reason) => {
  const supabase = getSupabaseAdmin2();
  const { data, error } = await supabase.from("payment_attempts").update({
    status: "failed",
    metadata: { payment_status: "failed", failure_reason: reason ?? null },
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", paymentId).eq("status", "pending").select("id, status").maybeSingle();
  if (error) throw error;
  return data;
};
var getBillingState = async (deviceId) => {
  const supabase = getSupabaseAdmin2();
  const { data: profile } = await supabase.from("profiles").select("wallet_credits, unlocked_photo_packs, phone_number, name").eq("device_id", deviceId).maybeSingle();
  const walletCredits = Number(profile?.wallet_credits ?? 0);
  const unlockedPhotoPacks = Array.isArray(profile?.unlocked_photo_packs) ? profile.unlocked_photo_packs : [];
  return {
    wallet_credits: walletCredits,
    unlocked_photo_packs: unlockedPhotoPacks,
    phone_number: profile?.phone_number ?? null,
    name: profile?.name ?? null
  };
};
var logPaymentAttemptRow = async (input) => {
  const meta = input.metadata ?? {};
  const productType = meta.source === "photo_pack_activation" ? "photo_pack" : meta.source === "chat_recharge_gate" ? "chat_recharge" : meta.source === "voice_chat_activation" || meta.source === "voice_chat_activation_request" ? "voice_chat" : "other";
  const gateway = meta.payment_gateway || PAYMENT_GATEWAY_RAZORPAY;
  const pending = await createPendingPaymentRow({
    deviceId: input.deviceId,
    phoneNumber: input.phoneNumber,
    amountRupees: input.amountRupees,
    productType,
    paymentGateway: gateway,
    companionId: input.companionId,
    rateNote: input.rateNote,
    metadata: meta
  });
  const gatewayOrderId = String(
    meta.gateway_order_id ?? meta.razorpay_order_id ?? ""
  );
  const gatewayPaymentId = String(
    meta.gateway_payment_id ?? meta.razorpay_payment_id ?? ""
  );
  const isSuccess = meta.payment_status === "success" && gatewayOrderId && gatewayPaymentId;
  if (isSuccess) {
    await attachGatewayOrderToPayment(pending.id, gateway, gatewayOrderId);
    await completePaymentSuccess({
      paymentId: pending.id,
      paymentGateway: gateway,
      gatewayOrderId,
      gatewayPaymentId
    });
  } else {
    await markPaymentFailed(pending.id, "legacy_log_without_verification");
  }
  return { id: pending.id, created_at: pending.created_at };
};

// server/routes.ts
async function synthesizeGoogleTts(text, voiceName) {
  const apiKey = process.env.GOOGLE_TTS_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_TTS_KEY is not configured");
  }
  const languageCode = voiceName.split("-").slice(0, 2).join("-");
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: "MP3" }
      })
    }
  );
  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Google TTS API failed: ${response.status} ${err}`.trim());
  }
  const data = await response.json();
  if (!data.audioContent) throw new Error("Google TTS returned empty audio");
  return Buffer.from(data.audioContent, "base64");
}
function serializeSupabaseError(error) {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (error !== null && typeof error === "object") {
    const o = error;
    const parts = [];
    const push = (v) => {
      if (typeof v === "string" && v.trim()) parts.push(v.trim());
    };
    push(o.message);
    push(o.details);
    push(o.hint);
    if (typeof o.error === "string") push(o.error);
    push(o.error_description);
    if (typeof o.code !== "undefined" && o.code !== null) parts.push(String(o.code));
    if (parts.length) return Array.from(new Set(parts)).join(" \u2014 ");
    try {
      const json = JSON.stringify(o);
      if (json && json !== "{}") return json;
    } catch {
    }
  }
  if (error === void 0 || error === null) return "Empty error from database driver \u2014 check server logs.";
  return String(error);
}
function isMissingDbRelation(error) {
  const msg = serializeSupabaseError(error).toLowerCase();
  if (msg.includes("does not exist") || msg.includes("schema cache")) return true;
  if (error !== null && typeof error === "object" && error.code === "42P01")
    return true;
  return false;
}
function isSupabaseConfigError(error) {
  const msg = serializeSupabaseError(error);
  return msg.includes("SUPABASE_URL") || msg.includes("SUPABASE_SERVICE_ROLE_KEY");
}
function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)");
  }
  return { keyId, keySecret };
}
async function registerRoutes(app2, opts) {
  app2.use(express.static(path2.join(process.cwd(), "client/public")));
  const ownerSchema = z.object({
    userId: z.string().nullable().optional(),
    anonymousUserId: z.string().nullable().optional()
  });
  app2.post("/api/chat/messages", async (req, res) => {
    try {
      const chatMessageSchema = ownerSchema.extend({
        companionId: z.string().min(1),
        companionName: z.string().nullable().optional(),
        companionAvatar: z.string().nullable().optional(),
        userName: z.string().nullable().optional(),
        userAge: z.number().nullable().optional(),
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
        language: z.enum(["hindi", "english"]).nullable().optional(),
        photoUrl: z.string().nullable().optional(),
        isPremium: z.boolean().nullable().optional(),
        contextInfo: z.string().nullable().optional(),
        metadata: z.record(z.unknown()).optional()
      });
      const data = chatMessageSchema.parse(req.body);
      const message = await saveChatMessageToSupabase(data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error saving chat message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chat message", errors: error.errors });
      }
      const detail = serializeSupabaseError(error);
      if (isSupabaseConfigError(error)) {
        return res.status(503).json({
          message: "Chat persistence unavailable \u2014 add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your server environment (e.g. Vercel project env).",
          error: detail
        });
      }
      const hint = isMissingDbRelation(error) ? "Ensure Supabase has the chat tables from migrations/0001_chat_storage.sql applied." : void 0;
      res.status(500).json({
        message: "Failed to save chat message",
        error: detail,
        ...hint ? { hint } : {}
      });
    }
  });
  app2.get("/api/chat/messages", async (req, res) => {
    try {
      const query = ownerSchema.extend({
        companionId: z.string().min(1)
      }).parse(req.query);
      const messages = await getChatMessagesFromSupabase(
        query.companionId,
        query.userId,
        query.anonymousUserId
      );
      res.json(messages);
    } catch (error) {
      console.error("Error loading chat messages:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chat query", errors: error.errors });
      }
      if (isSupabaseConfigError(error)) {
        return res.status(503).json({
          message: "Chat persistence unavailable \u2014 add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your server environment (e.g. Vercel project env).",
          error: serializeSupabaseError(error)
        });
      }
      res.status(500).json({
        message: "Failed to load chat messages",
        error: serializeSupabaseError(error)
      });
    }
  });
  app2.post("/api/tts", async (req, res) => {
    try {
      const bodySchema = z.object({
        text: z.string().min(1),
        voiceProvider: z.enum(["google", "edge"]).optional().default("google"),
        voiceName: z.string().optional()
      });
      const body = bodySchema.parse(req.body);
      const text = body.text.trim();
      if (!text) return res.status(400).json({ error: "Missing text" });
      const selectedVoice = body.voiceName?.trim() || "en-IN-Standard-A";
      const audioBuffer = await synthesizeGoogleTts(text, selectedVoice);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-store"
      });
      return res.send(audioBuffer);
    } catch (error) {
      console.error("TTS error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      const details = error instanceof Error ? error.message : String(error);
      if (details.includes("GOOGLE_TTS_KEY")) {
        return res.status(503).json({
          error: "TTS not configured",
          details,
          hint: "Set GOOGLE_TTS_KEY in the project root .env file, then restart the dev server (npm run dev)."
        });
      }
      return res.status(500).json({
        error: "Failed to generate TTS audio",
        details
      });
    }
  });
  app2.post("/api/profiles/upsert", async (req, res) => {
    try {
      const bodySchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().optional().nullable(),
        name: z.string().optional().nullable()
      });
      const data = bodySchema.parse(req.body);
      const row = await upsertProfileRow({
        deviceId: data.device_id,
        phoneNumber: data.phone_number ?? void 0,
        name: data.name ?? void 0
      });
      res.status(200).json(row);
    } catch (error) {
      console.error("Error upserting profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Profile sync unavailable" });
      }
      if (isMissingDbRelation(error) && msg.toLowerCase().includes("profiles")) {
        return res.status(503).json({
          message: "Profiles table missing",
          error: msg,
          hint: "Run migrations/0002_profiles_payment.sql in your Supabase SQL editor."
        });
      }
      res.status(500).json({ message: "Failed to upsert profile", error: msg });
    }
  });
  app2.post("/api/billing/payment-attempt", async (req, res) => {
    try {
      const bodySchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().min(10),
        amount_rupees: z.number().positive(),
        companion_id: z.string().optional().nullable(),
        rate_note: z.string().optional().nullable(),
        metadata: z.record(z.unknown()).optional()
      });
      const data = bodySchema.parse(req.body);
      const row = await logPaymentAttemptRow({
        deviceId: data.device_id,
        phoneNumber: data.phone_number,
        amountRupees: data.amount_rupees,
        companionId: data.companion_id,
        rateNote: data.rate_note ?? void 0,
        metadata: data.metadata
      });
      res.status(201).json(row);
    } catch (error) {
      console.error("Error logging payment attempt:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment attempt payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Billing log unavailable" });
      }
      if (isMissingDbRelation(error)) {
        return res.status(503).json({
          message: "Billing tables missing",
          error: msg,
          hint: "Run migrations/0002_profiles_payment.sql in your Supabase SQL editor."
        });
      }
      res.status(500).json({ message: "Failed to log payment attempt", error: msg });
    }
  });
  app2.get("/api/billing/wallet", async (req, res) => {
    try {
      const query = z.object({ device_id: z.string().min(1) }).parse(req.query);
      const state = await getBillingState(query.device_id);
      res.json(state);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Billing unavailable" });
      }
      res.status(500).json({ message: "Failed to load wallet", error: msg });
    }
  });
  app2.post("/api/billing/payments/:paymentId/cancel", async (req, res) => {
    try {
      const params = z.object({ paymentId: z.string().uuid() }).parse(req.params);
      const row = await markPaymentCancelled(params.paymentId);
      res.json({ cancelled: !!row });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment id", errors: error.errors });
      }
      res.status(500).json({
        message: "Failed to cancel payment",
        error: serializeSupabaseError(error)
      });
    }
  });
  app2.post("/api/payments/razorpay/create-order", async (req, res) => {
    try {
      const billingSchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().min(10),
        product_type: z.enum([
          "chat_recharge",
          "photo_pack",
          "voice_chat",
          "premium_photo",
          "other"
        ]),
        companion_id: z.string().optional().nullable(),
        rate_note: z.string().optional().nullable(),
        metadata: z.record(z.unknown()).optional()
      });
      const schema = z.object({
        amount_rupees: z.number().positive(),
        receipt: z.string().min(3).max(40).optional(),
        notes: z.record(z.string()).optional(),
        billing: billingSchema
      });
      const body = schema.parse(req.body);
      const { keyId, keySecret } = getRazorpayCredentials();
      const amountPaise = Math.round(body.amount_rupees * 100);
      if (!Number.isFinite(amountPaise) || amountPaise < 100) {
        return res.status(400).json({ error: "Invalid amount (minimum is \u20B91)" });
      }
      const pending = await createPendingPaymentRow({
        deviceId: body.billing.device_id,
        phoneNumber: body.billing.phone_number,
        amountRupees: body.amount_rupees,
        productType: body.billing.product_type,
        paymentGateway: PAYMENT_GATEWAY_RAZORPAY,
        companionId: body.billing.companion_id,
        rateNote: body.billing.rate_note ?? void 0,
        metadata: body.billing.metadata
      });
      const receipt = body.receipt ?? `RCP_${Date.now().toString(36).toUpperCase()}`.slice(0, 40);
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const razorpayNotes = {
        ...body.notes ?? {},
        payment_id: pending.id,
        device_id: body.billing.device_id,
        product_type: body.billing.product_type
      };
      const upstream = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt,
          notes: razorpayNotes
        })
      });
      const raw = await upstream.text();
      if (!upstream.ok) {
        await markPaymentFailed(pending.id, `${PAYMENT_GATEWAY_RAZORPAY}_order_create_failed`);
        return res.status(502).json({
          error: "Failed to create Razorpay order",
          details: raw.slice(0, 400)
        });
      }
      const data = JSON.parse(raw);
      try {
        await attachGatewayOrderToPayment(
          pending.id,
          PAYMENT_GATEWAY_RAZORPAY,
          data.id
        );
      } catch (attachErr) {
        console.error("[razorpay] Failed to attach order id to payment row:", attachErr);
        await markPaymentFailed(pending.id, "gateway_order_attach_failed");
        return res.status(500).json({
          error: "Payment row created but order link failed",
          payment_id: pending.id,
          details: serializeSupabaseError(attachErr)
        });
      }
      console.log(
        `[razorpay] create-order ok payment_id=${pending.id} razorpay_order=${data.id}`
      );
      return res.json({
        payment_id: pending.id,
        payment_gateway: PAYMENT_GATEWAY_RAZORPAY,
        key_id: keyId,
        gateway_order_id: data.id,
        /** Razorpay Checkout SDK expects this field name. */
        razorpay_order_id: data.id,
        amount_paise: data.amount,
        currency: data.currency
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (isMissingDbRelation(error)) {
        return res.status(503).json({
          message: "Billing tables missing",
          hint: "Run migrations/0002_profiles_payment.sql and 0003_payment_ledger.sql in Supabase.",
          error: msg
        });
      }
      return res.status(500).json({
        error: "Unable to create Razorpay order",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.post("/api/payments/razorpay/verify", async (req, res) => {
    try {
      const schema = z.object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
        payment_id: z.string().uuid().optional()
      });
      const body = schema.parse(req.body);
      const { keySecret } = getRazorpayCredentials();
      const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
      const expected = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
      let verified = false;
      try {
        verified = expected.length === body.razorpay_signature.length && crypto.timingSafeEqual(
          Buffer.from(expected, "utf8"),
          Buffer.from(body.razorpay_signature, "utf8")
        );
      } catch {
        verified = false;
      }
      if (!verified) {
        const pending = await findPendingPaymentByGatewayOrder(
          PAYMENT_GATEWAY_RAZORPAY,
          body.razorpay_order_id
        );
        if (pending?.id) {
          await markPaymentFailed(String(pending.id), "invalid_signature");
        }
        return res.status(400).json({ error: "Invalid payment signature" });
      }
      let paymentId = body.payment_id;
      if (!paymentId) {
        const pending = await findPendingPaymentByGatewayOrder(
          PAYMENT_GATEWAY_RAZORPAY,
          body.razorpay_order_id
        );
        paymentId = pending?.id ? String(pending.id) : void 0;
      }
      if (!paymentId) {
        return res.status(404).json({ error: "Payment record not found for this order" });
      }
      const result = await completePaymentSuccess({
        paymentId,
        paymentGateway: PAYMENT_GATEWAY_RAZORPAY,
        gatewayOrderId: body.razorpay_order_id,
        gatewayPaymentId: body.razorpay_payment_id
      });
      return res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      return res.status(500).json({
        error: "Unable to verify Razorpay payment",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  app2.get("/api/chat/conversations", async (req, res) => {
    try {
      const query = ownerSchema.parse(req.query);
      const conversations = await getChatConversationsFromSupabase(
        query.userId,
        query.anonymousUserId
      );
      res.json(conversations);
    } catch (error) {
      console.error("Error loading chat conversations:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversations query", errors: error.errors });
      }
      if (isSupabaseConfigError(error)) {
        return res.status(503).json({
          message: "Chat persistence unavailable \u2014 add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your server environment (e.g. Vercel project env).",
          error: serializeSupabaseError(error)
        });
      }
      res.status(500).json({
        message: "Failed to load chat conversations",
        error: serializeSupabaseError(error)
      });
    }
  });
  app2.get("/api/messages", async (req, res) => {
    try {
      const companionId = req.query.companionId;
      const messages = await storage.getMessages(companionId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });
  app2.post("/api/messages", async (req, res) => {
    console.log("=== INCOMING REQUEST ===");
    console.log("Method:", req.method);
    console.log("URL:", req.originalUrl);
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("Query:", JSON.stringify(req.query, null, 2));
    console.log("Params:", JSON.stringify(req.params, null, 2));
    console.log("========================");
    try {
      const conversationTurnSchema = z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string()
      });
      const messageSchema = z.object({
        content: z.string().min(1),
        language: z.enum(["hindi", "english"]).default("hindi"),
        companionId: z.string().default("priya"),
        // Optional photo fields for premium messages
        photoUrl: z.string().optional(),
        isPremium: z.boolean().optional(),
        skipUserMessage: z.boolean().optional(),
        role: z.enum(["user", "assistant"]).optional(),
        // Add role to schema
        messageCount: z.number().optional(),
        // Add message count to schema
        isAuthenticated: z.boolean().optional(),
        // Add auth state to schema
        /** Prior turns from the client (required on serverless — seeded UI messages are not in MemStorage). */
        conversationHistory: z.array(conversationTurnSchema).max(40).optional()
      });
      const validatedData = messageSchema.parse(req.body);
      let userName = "";
      const guestProfile = req.cookies?.guestProfile;
      if (guestProfile) {
        try {
          const profile = JSON.parse(guestProfile);
          userName = profile.name || "";
        } catch (e) {
          console.error("Error parsing user profile from cookie:", e);
        }
      }
      const messageCount = validatedData.messageCount || 0;
      const isAuthenticated = validatedData.isAuthenticated || false;
      console.log("=== Premium Photo Check Debug ===");
      console.log("From req.body:", {
        messageCount: validatedData.messageCount,
        isAuthenticated: validatedData.isAuthenticated
      });
      console.log("Used for check:", {
        messageCount,
        isAuthenticated,
        meetsCriteria: isAuthenticated && messageCount >= 10 && messageCount % 10 === 0,
        modulo: messageCount % 10
      });
      if (isAuthenticated && messageCount >= 10 && messageCount % 10 === 0) {
        console.log("Premium photo offer triggered!");
        const photoOfferMessage = `${userName ? userName + ", " : ""}Kya aap meri picture dekhna chahte ho jo maine kal click kari thi?`;
        console.log("Sending photo offer:", photoOfferMessage);
        const botMessage = await storage.createMessage({
          content: photoOfferMessage,
          role: "assistant",
          companionId: validatedData.companionId,
          isPremium: true
        });
        console.log("Photo offer message saved:", botMessage);
        let userMessage2;
        if (!validatedData.skipUserMessage) {
          userMessage2 = await storage.createMessage({
            content: validatedData.content,
            role: "user",
            companionId: validatedData.companionId,
            photoUrl: validatedData.photoUrl,
            isPremium: validatedData.isPremium
          });
        }
        return res.status(201).json({ userMessage: userMessage2, botMessage });
      }
      const isPhotoMessage = !!validatedData.photoUrl;
      const allMessages = await storage.getMessages();
      console.log("[DEBUG] All messages in storage:", allMessages.length);
      console.log("[DEBUG] All messages:", allMessages.map((m) => ({ role: m.role, content: m.content.substring(0, 50) })));
      const companionMessages = allMessages.filter(
        (msg) => !msg.companionId || msg.companionId === validatedData.companionId
      );
      console.log("[DEBUG] Companion messages (filtered):", companionMessages.length);
      console.log("[DEBUG] Companion messages:", companionMessages.map((m) => ({ role: m.role, content: m.content.substring(0, 50) })));
      const userMessages = companionMessages.filter((msg) => msg.role === "user");
      const isFirstUserMessage = userMessages.length === 0;
      console.log("[DEBUG] User messages count:", userMessages.length);
      console.log("[DEBUG] Is first user message:", isFirstUserMessage);
      let userMessage;
      if (!validatedData.skipUserMessage) {
        userMessage = await storage.createMessage({
          content: validatedData.content,
          role: "user",
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
      }
      if (isPhotoMessage && validatedData.isPremium) {
        console.log("Processing premium photo message with URL:", validatedData.photoUrl);
        const botMessage = await storage.createMessage({
          content: validatedData.content,
          role: validatedData.role || "assistant",
          // Use provided role or default to assistant
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        return res.status(201).json({ userMessage, botMessage });
      }
      if (validatedData.role === "assistant") {
        const botMessage = await storage.createMessage({
          content: validatedData.content,
          role: "assistant",
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        return res.status(201).json({ userMessage, botMessage });
      }
      try {
        let filteredMessages = companionMessages;
        if (isFirstUserMessage) {
          console.log("[DEBUG] First user message detected. Filtering welcome messages...");
          console.log("[DEBUG] Companion messages before filter:", companionMessages.map((m) => ({ role: m.role, content: m.content })));
          filteredMessages = companionMessages.filter((msg) => {
            if (msg.role === "assistant") {
              const content = msg.content.trim().toLowerCase();
              const isWelcomeMessage = content === "hi" || content === "hello" || content.startsWith("hi, main") || content.startsWith("hello, main");
              if (isWelcomeMessage) {
                console.log("[DEBUG] Filtering out welcome message:", msg.content);
              }
              return !isWelcomeMessage;
            }
            return true;
          });
          console.log("[DEBUG] Companion messages after filter:", filteredMessages.map((m) => ({ role: m.role, content: m.content })));
        }
        const historyFromStorage = filteredMessages.map((msg) => ({
          role: msg.role,
          content: msg.content
        }));
        const fromClient = validatedData.conversationHistory;
        const conversationHistory = fromClient && fromClient.length > 0 ? fromClient.slice(-40) : historyFromStorage;
        console.log("[DEBUG] Conversation history being sent to LLM:", conversationHistory);
        console.log(
          "[DEBUG] History source:",
          fromClient && fromClient.length > 0 ? "client" : "storage"
        );
        console.log("[DEBUG] Is first user message:", isFirstUserMessage);
        const responseContent = await generateResponse(
          validatedData.content,
          conversationHistory,
          validatedData.language,
          {
            companionId: validatedData.companionId,
            userName
          }
        );
        const botMessage = await storage.createMessage({
          content: responseContent,
          role: "assistant",
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        res.status(201).json({ userMessage, botMessage });
      } catch (error) {
        console.error("Error in message processing:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        if (errorMessage.toLowerCase().includes("rate limit")) {
          const botMessage = await storage.createMessage({
            content: "I'm getting too many messages right now. Can you please wait a moment and try again?",
            role: "assistant",
            companionId: validatedData.companionId
          });
          return res.status(201).json({ userMessage, botMessage });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error creating message:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Invalid request data",
          errors: error.errors
        });
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        message: "Failed to process message",
        error: errorMessage
      });
    }
  });
  app2.delete("/api/messages", async (req, res) => {
    try {
      await storage.clearMessages();
      res.status(200).json({ message: "All messages cleared" });
    } catch (error) {
      console.error("Error clearing messages:", error);
      res.status(500).json({ message: "Failed to clear messages" });
    }
  });
  if (opts?.createHttpServer !== true) {
    return void 0;
  }
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vercel-express.ts
var app = express2();
app.use(express2.json({ limit: "2mb" }));
app.use(express2.urlencoded({ extended: false }));
app.use((req, _res, next) => {
  const orig = req.originalUrl;
  const cur = req.url ?? "";
  if (typeof orig === "string" && orig.startsWith("/api")) {
    req.url = orig;
  } else if ((!orig || orig === "") && typeof cur === "string" && cur.startsWith("/api")) {
    req.url = cur;
  }
  next();
});
var initialized = false;
async function initialize() {
  if (initialized) return;
  await registerRoutes(app, { createHttpServer: false });
  app.use((err, _req, res, _next) => {
    console.error("[api] Express error middleware:", err);
    if (!res.headersSent) {
      const msg = err instanceof Error ? err.message : String(err);
      res.status(500).json({ message: "Internal server error", error: msg });
    }
  });
  initialized = true;
  console.log("[vercel] API handler initialized");
}
async function handler(req, res) {
  try {
    await initialize();
  } catch (initErr) {
    console.error("[vercel] Init error:", initErr);
    const msg = initErr instanceof Error ? initErr.message : String(initErr);
    if (!res.headersSent) {
      const body = JSON.stringify({ message: "API failed to initialize", error: msg });
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(body);
    }
    return;
  }
  const expressReq = req;
  const expressRes = res;
  try {
    await new Promise((resolve) => {
      let settled = false;
      const finishOnce = () => {
        if (settled) return;
        settled = true;
        resolve();
      };
      expressRes.on("finish", finishOnce);
      expressRes.on("close", finishOnce);
      app(expressReq, expressRes, (err) => {
        if (err) {
          console.error("[vercel] Express done(err):", err);
          if (!expressRes.headersSent) {
            const msg = err instanceof Error ? err.message : String(err);
            expressRes.status(500).json({ message: "Internal server error", error: msg });
          }
        } else if (!expressRes.headersSent) {
          expressRes.status(404).json({ error: "Not found" });
        }
        finishOnce();
      });
    });
  } catch (fatal) {
    console.error("[vercel] Dispatch fatal:", fatal);
    const msg = fatal instanceof Error ? fatal.message : String(fatal);
    if (!expressRes.headersSent) {
      const body = JSON.stringify({ message: "Internal server error", error: msg });
      expressRes.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      expressRes.end(body);
    }
  }
}
export {
  handler as default
};
