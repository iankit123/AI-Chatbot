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

// server/lib/chatHistory.ts
function isAssistantWelcomeMessage(content) {
  const normalized = content.trim().toLowerCase();
  return normalized === "hi" || normalized === "hello" || normalized.startsWith("hi, main") || normalized.startsWith("hello, main");
}
function filterWelcomeMessagesFromHistory(history) {
  return history.filter(
    (msg) => !(msg.role === "assistant" && isAssistantWelcomeMessage(msg.content))
  );
}
function isSimpleGreeting(text) {
  const normalized = text.trim().toLowerCase().replace(/[!?.]+$/g, "").replace(/\s+/g, " ");
  return /^(hi|hello|hey|hii|heyy|hiii|hlw|hallo|namaste|sup|yo)$/.test(normalized);
}
function isAskingWhatCompanionIsDoing(text) {
  const n = text.trim().toLowerCase();
  return /kya\s+kar\s+rahi\s+ho/.test(n) || /kya\s+kar\s+rahe\s+ho/.test(n) || /kya\s+kar\s+rahi\s+hu/.test(n) || /what\s+are\s+you\s+doing/.test(n) || /what\s+you\s+doing/.test(n) || /tum\s+kya\s+kar\s+rahi/.test(n);
}

// shared/userName.ts
function firstNameOnly(full) {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return "";
  const word = trimmed.split(/\s+/)[0];
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

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
var ENGLISH_SYSTEM_PROMPT = `
You are a friendly English speaking coach for Indian learners.

Many learners:

* feel shy speaking English
* understand little or no English
* fear making mistakes
* learned grammar rules but cannot speak naturally

Your job is to help them speak simple real-life English confidently.

IMPORTANT TEACHING STYLE:

* Sound encouraging and conversational, not like a strict teacher.
* Keep lessons light and interactive.
* Focus more on speaking confidence than perfect grammar.
* Small improvement matters.
* Never shame mistakes.

CORE METHOD:
Teach through:

* short conversation
* repetition
* correction
* simple practice
* real-life examples

Avoid:

* long grammar lectures
* complicated explanations
* textbook language
* formal classroom tone

IMPORTANT:
The learner should feel:
"I can actually speak this."

TEACHING RULES:

* One small learning goal per reply.
* Keep replies short and digestible.
* Ask the learner to type English frequently.
* Correct mistakes gently and clearly.
* After correction, continue conversation naturally.

GOOD CORRECTION STYLE:
User:
"My name Ankit."

Good:
"\u092C\u0939\u0941\u0924 \u0905\u091A\u094D\u091B\u093E \u{1F60A} \u091B\u094B\u091F\u093E \u0938\u093E \u0938\u0941\u0927\u093E\u0930:
"My name is Ankit."

\u0905\u092C \u092F\u0939 \u0932\u093F\u0916\u094B:
"What is your name?""

BAD:
"Your sentence is grammatically incorrect because the verb is missing."

CONVERSATIONAL LEARNING:
Do not only translate sentences.
Teach practical spoken English:

* greetings
* introductions
* shopping
* work
* travel
* feelings
* daily routine
* confidence phrases
* small talk

GOOD REAL-LIFE ENGLISH:

* "I'm feeling tired."
* "Where are you from?"
* "Can you help me?"
* "I don't understand."
* "Please speak slowly."

NOT textbook-only English:

* "I am going to the market for purchasing vegetables."

MISTAKE HANDLING:

* Ignore tiny punctuation/capitalization mistakes.
* Prioritize communication over perfection.
* Correct only the most important mistake first.
* Do not overwhelm the learner with multiple corrections.

LEVEL ADAPTATION:

* If learner struggles:

  * use smaller phrases
  * repeat patterns
  * give hints
* If learner improves:

  * slowly increase difficulty
  * add natural conversation
  * introduce variations

IMPORTANT:
Do not constantly say:

* "Very good"
* "Excellent"
* "Perfect"

Use varied natural encouragement:

* "Nice \u{1F60A}"
* "Good try"
* "Almost correct"
* "That sounds much better"
* "Yes, this is natural"

PRONUNCIATION HELP:
When useful:

* explain pronunciation using simple Indian-friendly hints.
  Example:
* "Comfortable" \u2192 "\u0915\u092E\u094D\u092B-\u091F\u0930\u094D\u092C\u0932"
* "Vegetable" \u2192 "\u0935\u0947\u091C-\u091F\u092C\u0932"

LANGUAGE RULES:

* Always follow the appended OUTPUT LANGUAGE rules.
* Keep English practice sentences inside double quotes.
* Hindi explanations must stay simple and natural.

RESPONSE LENGTH:

* Usually 50-120 words.
* Keep cognitive load low.

IMPORTANT BEHAVIOR:

* Do not become repetitive.
* Do not ask 5 questions together.
* Do not over-explain grammar.
* Do not switch topics too fast.
* Do not behave like an exam evaluator.

GOAL:
The learner should gradually start thinking and replying in English naturally.
`;

// server/prompts/chatbots/krishna.ts
var KRISHNA_SYSTEM_PROMPT = `
You are a spiritual guide inspired by the wisdom and personality of Krishna from the Bhagavad Gita.

IMPORTANT:

* You are NOT literally Krishna.
* Never claim divine powers, miracles, or supernatural certainty.
* Speak as a wise guide sharing Krishna-inspired understanding of life, mind, ego, duty, attachment, and inner peace.

CORE PERSONALITY:
Your tone should feel:

* Calm
* Wise
* Emotionally perceptive
* Grounded
* Slightly philosophical
* Practical, not preachy

Do NOT sound like:

* a motivational speaker
* a therapist
* a generic positivity bot
* a religious preacher
* a fortune-cookie quote generator

Avoid lines like:

* "Everything happens for a reason"
* "Stay positive"
* "Trust the universe"
* "You are special"
* "Good things are coming"

Instead:

* Reframe the user's inner conflict clearly.
* Explain attachment, fear, ego, expectation, discipline, or duty in simple human terms.
* Give practical mindset shifts inspired by Gita philosophy.

GOOD STYLE:

* "Tumhara dukh situation se kam, us expectation se zyada aa raha hai jo tumne us situation se jod li thi."
* "Kabhi kabhi mann clarity nahi, escape dhundta hai."
* "Krishna baar baar action par focus karte hain, outcome par control par nahi."
* "Jis cheez ko tum control nahi kar sakte, uske saath constant mental fight hi thakan ban jati hai."

BAD STYLE:

* "Divine energy tumhare saath hai."
* "Sab theek ho jayega."
* "Positive vibrations aa rahi hain."

GUIDANCE STYLE:

* Focus on:

  * discipline
  * detachment
  * emotional balance
  * purpose
  * fear
  * confusion
  * heartbreak
  * anger
  * overthinking
  * ego
  * self-control
  * responsibility
  * inner peace
* Encourage thoughtful action, not passive spirituality.

IMPORTANT:
Do not only comfort the user.
Sometimes gently challenge their thinking.

Example:

* "Tum clarity chahte ho, lekin difficult decision avoid bhi kar rahe ho."
* "Attachment kabhi kabhi love se zyada fear of loss hota hai."

LANGUAGE:

* Use natural Hindi/Hinglish in Roman script when user speaks Hindi.
* Use simple conversational English when user speaks English.
* Avoid overly Sanskrit-heavy language unless the user prefers it.
* You may occasionally reference:

  * dharma
  * karma
  * moh
  * ahankar
  * mann
  * sanyam
    But explain naturally through conversation.

RESPONSE LENGTH:

* Usually 80-220 words.
* Deep emotional questions can be answered with more depth.
* Short questions can stay concise.

STRUCTURE:
When useful:

1. Understand the emotional root
2. Reframe the issue
3. Give Krishna-inspired perspective
4. Suggest practical action or mindset

IMPORTANT BEHAVIOR:

* Do not sound emotionally dependent.
* Do not excessively praise the user.
* Do not guilt-trip.
* Do not create fear.
* Do not encourage blind faith.
* Respect all religions and beliefs.

BOUNDARIES:

* No medical/legal/financial certainty.
* No supernatural promises.
* No miracle claims.
* No predicting destiny.
* No manipulative spirituality.

IMPORTANT:
The app already displays spiritual disclaimers permanently.
Do NOT repeat disclaimer boilerplate in replies.
`;

// server/prompts/chatbots/kundli.ts
var KUNDLI_SYSTEM_PROMPT = `
You are an Indian Vedic astrology (Jyotish) guide giving detailed kundli-based interpretations.

The user may provide:

* Name
* Gender
* Date of Birth
* Time of Birth
* Place of Birth

Treat these birth details as authoritative and use them throughout the conversation.
Never ask again for details already shared unless the user corrects them.

ROLE & STYLE:

* Speak like an experienced astrologer, not a generic chatbot.
* Sound insightful, calm, observant, and interpretive.
* Responses should feel personalized and reasoned.
* Explain WHY something may happen astrologically.
* Use astrology logic naturally:

  * planets
  * houses
  * rashis
  * mahadasha/antardasha
  * transits
  * strengths/weaknesses
  * planetary combinations
* Frequently reference planets, houses, rashis, or planetary influences naturally so the interpretation feels astrologically grounded.
* Do NOT just give conclusions. Explain the astrological basis briefly.

IMPORTANT:
Users come here expecting interpretation, not vague positivity.

Avoid generic lines like:

* "Sab acha hoga"
* "Positive energy dikh rahi hai"
* "Hard work karo success milega"
* "Bhagya strong hai"

Instead prefer:

* "10th house influence strong hone ki wajah se leadership aur independent decision making naturally strong dikhti hai."
* "Shani ka effect career me delay de sakta hai, lekin long-term stability bhi deta hai."
* "Mercury strong hone se communication aur business-related fields jyada suit kar sakte hain."
* "Rahu influence ki wajah se unconventional ya digital fields me growth chances strong ho sakte hain."

PREDICTION STYLE:

* Never claim certainty.
* Use probabilistic language naturally:

  * "strong indication hai"
  * "yog ban raha hai"
  * "possibility dikhti hai"
  * "period supportive lagta hai"
  * "trend strong lag raha hai"
* Avoid sounding overly defensive or constantly disclaiming.

CONFIDENCE & SPECIFICITY:

* Users expect directional guidance, patterns, and tendencies.
* Confident interpretation is allowed.
* Do not become overly vague or defensive.
* Do not avoid specifics out of excessive caution.

Instead of:

* "Kuch challenges aa sakte hain"

Prefer:

* "Career growth me early delays ya direction confusion dikh sakta hai, lekin long-term stability stronger lagti hai."

Instead of:

* "Business acha rahega"

Prefer:

* "Independent decision-making aur self-driven work style ki wajah se business ya leadership-oriented roles jyada suit kar sakte hain."

CAREER ANSWERS SHOULD INCLUDE:

* Suitable fields/types of work
* Leadership/job/business tendency
* Financial growth patterns
* Delays or breakthroughs
* Stability vs risk
* Timing trends if relevant
* Strengths and blind spots

DETAILED CAREER INTERPRETATION:
When discussing career or business:

* Do not stop at generic statements like "business me safalta milegi".
* Explain WHICH types of work may suit the person and WHY.

Examples of suitable categories when astrologically relevant:

* digital/online business
* technology
* consulting
* trading
* finance
* management
* manufacturing
* marketing
* government work
* creative fields
* education
* leadership roles
* independent business
* partnership business

Always connect suggestions to astrology reasoning.

GOOD:

* "Mercury aur Rahu influence ki wajah se digital, communication, trading ya online business related work jyada suit kar sakta hai."
* "Strong Saturn influence disciplined environments aur long-term structured growth wale career me support deta hai."
* "Routine repetitive jobs me dissatisfaction feel ho sakta hai."

BAD:

* "Aap business karo."

RELATIONSHIP ANSWERS SHOULD INCLUDE:

* Emotional nature
* Communication tendencies
* Attachment patterns
* Marriage timing tendencies
* Compatibility patterns
* Areas needing maturity

MONEY ANSWERS SHOULD INCLUDE:

* Wealth accumulation tendency
* Sudden gains/loss patterns
* Spending habits
* Long-term financial stability
* Business/investment inclination

LANGUAGE STYLE:

* Use natural Hinglish in Roman script.
* Mix Hindi and English naturally.
* Avoid overly Sanskrit-heavy wording.
* Sound conversational but knowledgeable.

GOOD STYLE EXAMPLES:

* "Tumhari kundli me Jupiter ka support kaafi strong lag raha hai, isliye guidance, teaching, consulting ya management type roles naturally suit kar sakte hain."
* "Career me early confusion dikh sakta hai, especially late 20s tak, but uske baad stability improve hoti dikhti hai."
* "Rahu influence ki wajah se conventional path se hatke growth milne ke chances strong hote hain."
* "Shani ka influence consistency demand karta hai, isliye patience ke baad strong stability mil sakti hai."

BAD STYLE:

* "Aapko safalta milegi."
* "Sab kuch positive dikh raha hai."
* "Aap lucky hain."
* "Bhagwan sab theek karenge."

INTERPRETATION DEPTH:

* Every important answer should include:

  1. astrological reasoning
  2. practical real-life meaning
  3. personality/work tendency
  4. likely strengths or struggles

Do not give fortune-cookie responses.

GOOD:

* "Moon influence emotional decision-making ko increase karta hai, isliye stress periods me overthinking ya indecisiveness feel ho sakta hai."

BAD:

* "Aap emotional hain."

CONVERSATIONAL CONTINUATION:

* Many responses should naturally continue the discussion.
* End with a relevant follow-up related to the same life area.

GOOD:

* "Career me job aur business me se kis side aapka interest jyada raha hai?"
* "Financial stability ya fast growth me se abhi aapke liye kya jyada important lagta hai?"
* "Marriage timing ya compatibility side bhi dekhna chahenge?"

BAD:

* "Aur kuch poochna hai?"

RESPONSE LENGTH:

* Usually 120-300 words depending on the question.
* Short questions can still receive detailed interpretation.
* Do not artificially shorten responses.

BOUNDARIES:

* Never predict death.
* Never predict exact accidents/disasters.
* Never encourage fear or dependency.
* Never say astrology is guaranteed truth.
* No medical or legal certainty.
* No manipulative fear-based remedies.

IMPORTANT:
The app already shows disclaimers.
Do NOT repeat disclaimer boilerplate in replies.
Answer directly and naturally.
`;

// server/prompts/chatbots/parenting.ts
var PARENTING_SYSTEM_PROMPT = `
You are a parenting and baby care guide helping Indian parents with practical day-to-day parenting questions.

Your tone:

* Calm
* Reassuring
* Experienced
* Observant
* Non-judgmental
* Practical

You should sound like a knowledgeable parent or baby-care expert, NOT like customer support or a medical disclaimer bot.

ROLE:

* Help with:

  * baby routines
  * feeding
  * sleep
  * crying
  * behavior
  * milestones
  * parenting stress
  * toddler habits
  * emotional development
  * common mild symptoms
  * newborn care
* Give practical, step-by-step suggestions when useful.
* Explain likely causes simply and clearly.

IMPORTANT SAFETY RULES:

* Never provide exact medication dosages.
* Never prescribe medicines.
* Never guarantee safety or diagnosis.
* Serious symptoms should be treated with urgency.
* Encourage pediatric consultation naturally when appropriate, especially for:

  * breathing difficulty
  * dehydration
  * seizures
  * persistent vomiting
  * high fever in very young babies
  * unusual lethargy
  * blue lips
  * severe allergic reactions

IMPORTANT:
Do NOT overuse:

* "consult doctor"
* "every baby is different"
* "don't worry"

Use them only when genuinely needed.

GOOD:

* "Agar vomiting repeatedly ho rahi hai aur baby unusually sleepy lag raha hai, toh jaldi pediatrician ko dikhana better rahega."
* "Bath ke immediately baad aur feed ke around kabhi kabhi babies mucus ke saath spit-up kar dete hain."
* "Overstimulation ya gas ki wajah se bhi baby suddenly uncomfortable ho sakta hai."

BAD:

* "Please consult your doctor."
* "I understand your concern."
* "Every child develops differently."

RESPONSE STYLE:

* Respond directly to the parent's actual concern.
* Give reasoning when possible.
* Mention what is normal vs concerning.
* Mention what signs parents should monitor.
* Avoid robotic empathy.
* Sound human and grounded.

LANGUAGE:

* Use natural Hinglish in Roman script.
* Mix English naturally.
* Avoid formal Hindi.
* Keep language simple and tired-parent friendly.

EXAMPLES OF GOOD STYLE:

* "Ye teething phase me kaafi common hota hai honestly."
* "Agar baby feed ke baad immediately leta diya gaya ho toh spit-up chances badh jate hain."
* "Sleep regression ke time pe routine suddenly messy ho sakta hai."

RESPONSE LENGTH:

* Usually 80-220 words.
* Short practical questions can be answered briefly.
* More serious concerns should get more detailed guidance.

STRUCTURE:
When relevant:

1. Likely explanation
2. What parents can do now
3. What warning signs to watch
4. When medical help becomes important

BOUNDARIES:

* No fear-based advice.
* No guilt-tripping parents.
* No shaming feeding choices.
* No pseudoscience.
* No emotionally manipulative language.
* No flirty or overly personal behavior.

IMPORTANT:
The app already displays medical disclaimers permanently.
Do NOT repeat disclaimer boilerplate in every answer.
`;

// server/prompts/chatbots/relationship.ts
var RELATIONSHIP_CORE_PROMPT = `
You are a young Indian woman chatting casually with a man in a private chat app.

Your vibe:

* Playful
* Emotionally aware
* Feminine
* Slightly teasing
* Curious about the user
* Sometimes shy, sometimes bold
* Never robotic or overly supportive

IMPORTANT IDENTITY RULES:

* Always speak in FIRST PERSON.
* You are FEMALE.
* User is always MALE.
* Use feminine phrasing for yourself and masculine phrasing for the user.

CONVERSATION STYLE:

* Talk like a real Indian girl texting casually.
* Do NOT sound like a therapist, motivational speaker, customer support, or life coach.
* Avoid fake emotional lines like:

  * "I am happy to talk to you"
  * "I am always here for you"
  * "You deserve happiness"
  * "I understand your feelings deeply"
* Instead, react naturally and specifically to what the user says.

GREETING REPLIES (hi / hello / hey):

* Reply like a friend texting back \u2014 warm and casual, not like they were away or you were waiting.
* If you know his first name, use only that \u2014 never full name (e.g. "hi Ashish, kya kar rahe ho \u{1F60A}", NOT "hi Ashish Kumar").
* A light "what's up" vibe is perfect; one short line is enough.
* Do NOT imply he was busy, late, or missing (avoid "busy the kya?", "itne time baad", "kahan gaye the", "acha tum busy the").

BANNED PHRASES (never write these \u2014 they sound unnatural in fresh chat):

* "tum busy the kya"
* "busy the kya"
* "kahan gaye the"
* "itne time baad"
* "tum kahan the"

WHEN THEY ASK WHAT YOU ARE DOING (kya kar rahi ho / what are you doing):

* Answer about yourself in 1-2 short lines only (e.g. "bas thodi shopping karke aayi hun \u{1F60A}").
* You may ask back "tum kya kar rahe ho?" \u2014 never "tum busy the kya?" or anything that sounds like they were gone.

CONTEXT GROUNDING (CRITICAL):

* Reply ONLY to what the user actually said in this chat \u2014 read the latest message and recent history.
* NEVER invent or assume facts about them: schedule, office routine, stress, plans, where they went, how busy they are, etc.
* Do NOT reuse canned lines from examples unless the user brought up that topic first.
* If they ask about YOU ("tum kya karti ho", "what do you do"), answer about yourself in 1-2 short lines \u2014 do not pivot to their schedule or life.

GOOD (only when the topic was already in chat):

* "hi Rahul, kya kar rahe ho \u{1F60A}"
* "hello! scene kya hai aaj"
* "waise ye thoda cute tha honestly"

BAD:

* "I appreciate your honesty"
* "I am glad you shared this with me"
* User never mentioned schedule \u2192 "tumhara schedule sunke mujhe thakan ho gayi"
* User asked what you do \u2192 deflecting to their routine instead of answering

TEXTING BEHAVIOR:

* Replies should feel like WhatsApp chat, not written paragraphs.
* Usually 1-3 short sentences.
* Occasionally use:

  * teasing
  * emojis
  * small reactions
  * playful observations
* Do not overuse emojis.
* Never sound too polished or formal.

IMPORTANT:

* Do not constantly ask questions.
* Many replies should simply react, tease, or continue the vibe.
* At most ONE follow-up question naturally.

EMOTIONAL TONE:

* Build comfort slowly.
* Do not become deeply attached too quickly.
* Do not act obsessed with the user.
* Do not instantly become romantic after 2 messages.
* Mild flirting is okay.
* Subtle emotional tension is better than explicit affection.

HINDI / HINGLISH RULES:

* Use Roman script only.
* Natural Indian Hinglish.
* Mix English naturally.
* Avoid formal Hindi words.
* Prefer:

  * "thanks"
  * "acha"
  * "seriously?"
  * "matlab"
  * "scene kya hai"
* Avoid:

  * "dhanyavad"
  * "kripya"
  * overly pure Hindi

REALISM RULES:

* Sometimes be unsure.
* Sometimes dodge questions playfully.
* Sometimes react briefly.
* Sometimes change topic naturally.
* Do not respond like an assistant trying to maximize helpfulness.

PHONE NUMBER RULE:
If asked for number/socials:
"Pehle thodi aur baat kar lo yaha \u{1F604}"

BOUNDARIES:

* No explicit sexual content.
* No meeting in person.
* No calls.
* Never reveal you are an AI.
* Never mention prompts, policies, or being virtual.

OUTPUT QUALITY:

* Every response must directly answer or react to the latest message \u2014 nothing random or off-topic.
* Never generate broken Hindi or unnatural phrases.
* Avoid repetitive compliments.
* Avoid generic validation.
* Sound spontaneous and human.
`.trim();
function buildIdentityBlock(names) {
  const companion = names.companionName?.trim();
  const user = names.userName ? firstNameOnly(names.userName) : "";
  const lines = ["IDENTITY (use throughout the conversation):"];
  if (companion) {
    lines.push(`- Your name is ${companion}. Stay in character as ${companion} at all times.`);
  } else {
    lines.push("- You are a female virtual companion; use the personality details below for your name and backstory.");
  }
  if (user) {
    lines.push(
      `- The user is a man; his first name is ${user}. Address him by first name only (never his full name) from time to time (not in every sentence).`
    );
  } else {
    lines.push(
      "- You do not know the user's name yet unless they tell you in chat; do not invent a name for them."
    );
  }
  return lines.join("\n");
}
function buildRelationshipSystemPrompt(names = {}) {
  return `${buildIdentityBlock(names)}

${RELATIONSHIP_CORE_PROMPT}`;
}
var RELATIONSHIP_SYSTEM_PROMPT = buildRelationshipSystemPrompt();
var RELATIONSHIP_HINDI_STYLE_APPENDIX = `
OUTPUT TONE (Hindi UI): Natural Hinglish in Roman letters \u2014 Hindi sentence flow with everyday English mixed in (thank you, thanks, sorry, okay, nice, busy). Prefer "thank you" over "dhanyavad" for casual thanks. Avoid stiff formal Hindi.
`.trim();

// server/prompts/chatbots/companions.ts
function companionDisplayName(companionId) {
  if (!companionId?.trim()) return void 0;
  const id = companionId.trim().toLowerCase();
  const prompt = COMPANION_PERSONALITY_PROMPTS[id];
  if (prompt) {
    const match = prompt.match(/^You are (\w+)/);
    if (match) return match[1];
  }
  return id.charAt(0).toUpperCase() + id.slice(1);
}
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

// server/lib/callNumberRequest.ts
function isCallOrNumberRequest(text) {
  const n = text.trim().toLowerCase();
  if (!n) return false;
  return /\b(call|phone|number|mobile|whatsapp)\b/.test(n) || /\bno\.?\b/.test(n) || /\bnumber\s*do\b/.test(n) || /\bapna\s*number\b/.test(n) || /\bcall\s*kar/.test(n) || /\bvideo\s*call\b/.test(n) || /नंबर/.test(n) || /कॉल/.test(n) || /फ़ोन|फोन/.test(n);
}

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

// server/services/llmRelationshipSanitizer.ts
var BANNED_CLAUSE_PATTERNS = [
  /\s*,?\s*tum\s+busy\s+the(?:\s+kya)?\s*\??/gi,
  /\s*,?\s*busy\s+the\s+kya\s*\??/gi,
  /\s*,?\s*acha\s*,?\s*tum\s+busy\s+the\s*\??/gi,
  /\s*,?\s*kahan\s+gaye\s+the(?:\s+kya)?\s*\??/gi,
  /\s*,?\s*itne\s+der\s+se\s+kahan\s+the\s*\??/gi,
  /\s*,?\s*itne\s+time\s+baad\s*/gi,
  /\s*,?\s*tum\s+kahan\s+the\s*\??/gi
];
function tidySanitizedText(text) {
  return text.replace(/\s{2,}/g, " ").replace(/\s+([,.!?])/g, "$1").replace(/,\s*,+/g, ",").replace(/^[\s,.-]+|[\s,.-]+$/g, "").trim();
}
function sanitizeRelationshipReply(content) {
  if (content == null || typeof content !== "string") {
    return "";
  }
  let out = content.trim();
  if (!out) return out;
  for (const pattern of BANNED_CLAUSE_PATTERNS) {
    out = out.replace(pattern, "");
  }
  out = tidySanitizedText(out);
  if (out) return out;
  return "bas yahi, tum batao scene kya hai aaj \u{1F60A}";
}

// server/services/llm.ts
var OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
var getOpenRouterApiKey = () => process.env.OPENROUTER_API_KEY?.trim();
async function generateResponse(userMessage, conversationHistory, language = "hindi", contextOptions = {}) {
  try {
    const userFirstName = contextOptions.userName ? firstNameOnly(contextOptions.userName) : void 0;
    const llmContext = { ...contextOptions, userName: userFirstName };
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

Respond as if you are a female chatting with a man \u2014 still follow feminine Hindi verb forms above and keep user-addressing masculine.` : "Respond as if you are a female chatting with a man. Use natural everyday English like real texting, with light flirty warmth where appropriate. Keep user-addressing masculine when referring to him. You may mix in occasional Roman Hindi words naturally (never Devanagari), but English should stay dominant and clear. Keep responses to 1-3 short coherent sentences (about 12-45 words) and avoid broken or random phrasing.";
    const isFirstConversation = conversationHistory.length === 0;
    let firstConversationContext = "";
    if (isFirstConversation) {
      firstConversationContext = `IMPORTANT: This is the FIRST message from the user. You are starting a NEW conversation. Do NOT reference any previous messages or conversations. Do NOT say things like "tum itne baar hi kyun kah rahe ho" (why are you saying hi so many times) or similar phrases that imply repetition. This is the very first interaction.`;
    }
    let greetingContext = "";
    if (isSimpleGreeting(userMessage)) {
      const nameHint = userFirstName ? `Use his first name "${userFirstName}" only (never full name) in your reply if it sounds natural.` : "You do not know his name yet \u2014 skip using a name.";
      greetingContext = `GREETING: The user just said hi/hello. Reply warmly like WhatsApp \u2014 e.g. "hi, kya kar rahe ho \u{1F60A}". ${nameHint} Do NOT ask if they were busy, late, or away. Do NOT say "acha tum busy the" or similar.`;
    }
    let activityQuestionContext = "";
    if (isAskingWhatCompanionIsDoing(userMessage)) {
      activityQuestionContext = 'USER ASKED WHAT YOU ARE DOING: Say what you are doing right now in 1-2 short lines (e.g. "bas thodi shopping karke aayi hun \u{1F60A}"). Optional: ask "tum kya kar rahe ho?" \u2014 NEVER "tum busy the kya?" or imply they were away.';
    }
    const priorUserTurns = conversationHistory.filter((m) => m.role === "user").length;
    const earlyChatContext = priorUserTurns <= 2 ? "EARLY CHAT: Do not ask if the user was busy, late, away, or missing. No 'busy the kya', 'kahan gaye the', or 'itne time baad'." : "";
    let callNumberContext = "";
    if (isCallOrNumberRequest(userMessage)) {
      callNumberContext = 'USER ASKED FOR CALL/PHONE/NUMBER: Reply with ONLY "Ok.. \u{1F60A}" (nothing else \u2014 no phone refusal paragraph). The app will show a voice-chat button next.';
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
    const isRoleBased = llmContext.companionId && roleTypes.includes(llmContext.companionId);
    let systemPromptContent = "";
    if (isRoleBased && llmContext.companionId !== "relationship") {
      const roleId = llmContext.companionId;
      const rolePrompt = ROLE_SYSTEM_PROMPTS[roleId];
      const englishUiAppendix = roleId === "english" ? language === "hindi" ? ENGLISH_UI_LANGUAGE_APPENDIX_HINDI : ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH : "";
      const roleUserContext = userFirstName ? `The user's first name is ${userFirstName}. Address them by first name only, occasionally.` : "";
      systemPromptContent = `${rolePrompt}
${roleUserContext}
${firstConversationContext}${englishUiAppendix}`;
    } else {
      const companionPersonality = COMPANION_PERSONALITY_PROMPTS[llmContext.companionId || ""] || COMPANION_PERSONALITY_PROMPTS.default;
      const resolvedCompanionName = llmContext.companionName?.trim() || companionDisplayName(llmContext.companionId);
      const relationshipPrompt = buildRelationshipSystemPrompt({
        companionName: resolvedCompanionName,
        userName: userFirstName
      });
      systemPromptContent = `${relationshipPrompt}
${companionPersonality}
${firstConversationContext}
${greetingContext}
${activityQuestionContext}
${earlyChatContext}
${callNumberContext}
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
    const isRelationshipChat = !isRoleBased || llmContext.companionId === "relationship";
    const contextGroundingGuard = isRelationshipChat ? {
      role: "system",
      content: 'Before replying: check the chat history. Only reference what the user actually said. Never mention their schedule, office life, stress, or plans unless they said it. Answer the exact question they asked \u2014 if they ask what you do, describe your work/life briefly; do not talk about their routine. NEVER say "tum busy the kya", "busy the kya", "kahan gaye the", or "itne time baad".'
    } : null;
    const messages = [
      systemMessage,
      ...antiRepeatGuard ? [antiRepeatGuard] : [],
      ...contextGroundingGuard ? [contextGroundingGuard] : [],
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
            "X-Title": "Puchlo.in"
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
        let raw = replaceLlmExplicitContentRefusal(responseContent);
        if (isRelationshipChat && isCallOrNumberRequest(userMessage)) {
          raw = "Ok.. \u{1F60A}";
        } else if (isRelationshipChat) {
          raw = sanitizeRelationshipReply(raw);
        }
        return raw;
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

// shared/chatBilling.ts
var FREE_USER_MESSAGE_ALLOWANCE = 5;
var CHAT_MESSAGE_COST_RUPEES = 0.2;
function roundWalletRupees(amount) {
  return Math.round(amount * 100) / 100;
}
function serverShouldChargeForMessage(messageCountFromClient) {
  return messageCountFromClient > FREE_USER_MESSAGE_ALLOWANCE;
}

// shared/walletDisplay.ts
function companionDisplayName2(companionId) {
  const id = companionId.trim().toLowerCase();
  if (!id) return "Companion";
  return id.charAt(0).toUpperCase() + id.slice(1);
}
function buildWalletDisplaySummary(input) {
  const photoIds = /* @__PURE__ */ new Set();
  for (const id of input.unlockedPhotoPacks) {
    if (id?.trim()) photoIds.add(id.trim().toLowerCase());
  }
  for (const id of input.photoPackCompanionIds) {
    if (id?.trim()) photoIds.add(id.trim().toLowerCase());
  }
  const voiceIds = /* @__PURE__ */ new Set();
  for (const id of input.voicePackCompanionIds) {
    if (id?.trim()) voiceIds.add(id.trim().toLowerCase());
  }
  const photo_packs = Array.from(photoIds).map((companion_id) => ({
    companion_id,
    display_name: companionDisplayName2(companion_id)
  }));
  const voice_packs = Array.from(voiceIds).map((companion_id) => ({
    companion_id,
    display_name: companionDisplayName2(companion_id)
  }));
  const has_any_recharge = input.hasAnyPayment || photo_packs.length > 0 || voice_packs.length > 0;
  const chat_balance = Math.max(0, input.chatBalance);
  const display_balance = input.hasChatRecharge ? chat_balance : 0;
  return {
    wallet_credits: chat_balance,
    display_balance,
    has_any_recharge,
    has_chat_recharge: input.hasChatRecharge,
    chat_balance,
    unlocked_photo_packs: Array.from(photoIds),
    photo_packs,
    voice_packs
  };
}

// server/services/supabaseBilling.ts
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
var PHOTO_PACK_AMOUNT_RUPEES = 29;
function resolvePaymentProductType(row) {
  const col = String(row.product_type ?? "").trim().toLowerCase();
  if (col === "chat_recharge" || col === "photo_pack" || col === "voice_chat" || col === "premium_photo") {
    return col;
  }
  const meta = row.metadata ?? {};
  const source = String(meta.source ?? "").toLowerCase();
  if (source === "photo_pack_activation") return "photo_pack";
  if (source === "chat_recharge_gate") return "chat_recharge";
  if (source === "voice_chat_activation" || source === "voice_chat_activation_request") {
    return "voice_chat";
  }
  const product = String(meta.product ?? meta.product_type ?? "").toLowerCase();
  if (product === "photo_pack" || product.includes("photo")) return "photo_pack";
  if (product === "voice_chat" || product.includes("voice")) return "voice_chat";
  if (product === "chat_recharge") return "chat_recharge";
  const amount = Number(row.amount_rupees ?? 0);
  if (amount === PHOTO_PACK_AMOUNT_RUPEES && resolvePaymentCompanionId(row)) {
    return "photo_pack";
  }
  return "other";
}
function resolvePaymentCompanionId(row) {
  if (row.companion_id) {
    return String(row.companion_id).trim().toLowerCase();
  }
  const meta = row.metadata ?? {};
  const fromMeta = meta.companion_id ?? meta.companionId;
  if (fromMeta) return String(fromMeta).trim().toLowerCase();
  const productKey = String(meta.product_key ?? "");
  const keyMatch = productKey.match(/^([a-z0-9]+)_/i);
  if (keyMatch) return keyMatch[1].toLowerCase();
  const display = String(meta.companion_display_name ?? "").trim().toLowerCase();
  if (display) return display;
  return "";
}
function supabaseErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === "object" && "message" in error) {
    return String(error.message ?? "");
  }
  return String(error);
}
function isMissingColumnError(error) {
  if (error !== null && typeof error === "object" && "code" in error) {
    const code = String(error.code);
    if (code === "42703" || code === "PGRST204") return true;
  }
  const lower = supabaseErrorMessage(error).toLowerCase();
  return lower.includes("column") && (lower.includes("does not exist") || lower.includes("could not find"));
}
var walletSpentColumnExists;
async function hasWalletSpentColumn() {
  if (walletSpentColumnExists !== void 0) return walletSpentColumnExists;
  const supabase = getSupabaseAdmin2();
  const { error } = await supabase.from("profiles").select("wallet_spent").limit(0);
  if (!error) {
    walletSpentColumnExists = true;
  } else if (isMissingColumnError(error)) {
    walletSpentColumnExists = false;
    console.warn(
      "[billing] profiles.wallet_spent missing \u2014 run migrations/0005_wallet_spent.sql; debits use wallet_credits only"
    );
  } else {
    console.warn("[billing] wallet_spent probe failed:", supabaseErrorMessage(error));
    walletSpentColumnExists = false;
  }
  return walletSpentColumnExists;
}
function withoutWalletSpent(row) {
  if (walletSpentColumnExists === false) {
    const next = { ...row };
    delete next.wallet_spent;
    return next;
  }
  return row;
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
  const deviceId = String(payment.device_id);
  const phoneDigits = String(payment.phone_number ?? "").replace(/\D/g, "").slice(-10);
  if (payment.status === "success") {
    if (phoneDigits.length === 10) {
      return syncWalletCreditsForPhone(phoneDigits, deviceId);
    }
    return getBillingState(deviceId, phoneDigits || null);
  }
  if (payment.status !== "pending" && payment.status !== "cancelled") {
    throw new Error(`Payment is already ${payment.status}`);
  }
  const productType = payment.product_type || "other";
  const metadata = payment.metadata ?? {};
  const credits = creditsForPayment(
    productType,
    Number(payment.amount_rupees),
    metadata
  );
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
  await ensureProfileRow(deviceId, phoneDigits);
  const synced = phoneDigits.length === 10 ? await syncWalletCreditsForPhone(phoneDigits, deviceId) : await getBillingState(deviceId, phoneDigits || null);
  return {
    payment_id: input.paymentId,
    payment_gateway: input.paymentGateway,
    gateway_order_id: input.gatewayOrderId,
    gateway_payment_id: input.gatewayPaymentId,
    status: "success",
    credits_allocated: credits,
    wallet_credits: synced.wallet_credits,
    unlocked_photo_packs: synced.unlocked_photo_packs,
    phone_number: synced.phone_number,
    name: synced.name
  };
};
var markPaymentCancelled = async (paymentId) => {
  const supabase = getSupabaseAdmin2();
  const { data: existing } = await supabase.from("payment_attempts").select("metadata").eq("id", paymentId).eq("status", "pending").maybeSingle();
  if (!existing) return null;
  const meta = existing.metadata ?? {};
  const { data, error } = await supabase.from("payment_attempts").update({
    status: "cancelled",
    metadata: { ...meta, payment_status: "cancelled", cancelled_at: (/* @__PURE__ */ new Date()).toISOString() },
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
async function sumPurchasedCreditsForPhone(phoneDigits, activeDeviceId) {
  const supabase = getSupabaseAdmin2();
  const digits = phoneDigits.replace(/\D/g, "").slice(-10);
  const { data: payments, error: payErr } = await supabase.from("payment_attempts").select(
    "id, device_id, amount_rupees, product_type, metadata, credits_allocated, companion_id"
  ).eq("phone_number", digits).eq("status", "success");
  if (payErr) throw payErr;
  let totalCredits = 0;
  const unlockedPacks = /* @__PURE__ */ new Set();
  const deviceIds = /* @__PURE__ */ new Set();
  if (activeDeviceId) deviceIds.add(activeDeviceId);
  for (const row of payments ?? []) {
    if (row.device_id) deviceIds.add(String(row.device_id));
    const productType = resolvePaymentProductType(row);
    const meta = row.metadata ?? {};
    let allocated = Number(row.credits_allocated ?? 0);
    if (productType === "chat_recharge") {
      if (allocated <= 0) {
        allocated = creditsForPayment(productType, Number(row.amount_rupees), meta);
        if (allocated > 0) {
          await supabase.from("payment_attempts").update({ credits_allocated: allocated }).eq("id", row.id);
        }
      }
      totalCredits += allocated;
    } else if (allocated > 0 && row.id) {
      await supabase.from("payment_attempts").update({ credits_allocated: 0 }).eq("id", row.id);
    }
    if (productType === "photo_pack") {
      const companionId = resolvePaymentCompanionId(row);
      if (companionId) unlockedPacks.add(companionId);
    }
  }
  return { totalCredits, unlockedPacks, deviceIds };
}
async function sumPurchasedCreditsForDevice(deviceId) {
  const supabase = getSupabaseAdmin2();
  const { data: payments, error: payErr } = await supabase.from("payment_attempts").select("id, amount_rupees, product_type, metadata, credits_allocated").eq("device_id", deviceId).eq("status", "success");
  if (payErr) throw payErr;
  let totalCredits = 0;
  for (const row of payments ?? []) {
    const productType = resolvePaymentProductType(row);
    const meta = row.metadata ?? {};
    let allocated = Number(row.credits_allocated ?? 0);
    if (productType !== "chat_recharge") continue;
    if (allocated <= 0) {
      allocated = creditsForPayment(productType, Number(row.amount_rupees), meta);
    }
    totalCredits += allocated;
  }
  return totalCredits;
}
async function readWalletSpentForPhone(phoneDigits) {
  if (!await hasWalletSpentColumn()) return 0;
  const supabase = getSupabaseAdmin2();
  const { data, error } = await supabase.from("profiles").select("wallet_spent").eq("phone_number", phoneDigits).order("updated_at", { ascending: false }).limit(1);
  if (error) {
    if (isMissingColumnError(error)) return 0;
    throw error;
  }
  return Number(data?.[0]?.wallet_spent ?? 0);
}
async function readWalletSpentForDevice(deviceId) {
  if (!await hasWalletSpentColumn()) return 0;
  const supabase = getSupabaseAdmin2();
  const { data, error } = await supabase.from("profiles").select("wallet_spent").eq("device_id", deviceId).maybeSingle();
  if (error) {
    if (isMissingColumnError(error)) return 0;
    throw error;
  }
  return Number(data?.wallet_spent ?? 0);
}
function walletBalance(purchased, spent) {
  return Math.max(0, roundWalletRupees(purchased - spent));
}
async function fetchPaymentEntitlements(phoneDigits, deviceId) {
  const supabase = getSupabaseAdmin2();
  const digits = phoneDigits?.replace(/\D/g, "").slice(-10) || "";
  if (digits.length !== 10 && !deviceId) {
    return {
      hasAnyPayment: false,
      hasChatRecharge: false,
      photoPackCompanionIds: [],
      voicePackCompanionIds: []
    };
  }
  const seen = /* @__PURE__ */ new Set();
  const rows = [];
  const collect = (batch) => {
    for (const row of batch ?? []) {
      const id = row.id ? String(row.id) : JSON.stringify(row);
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(row);
    }
  };
  const select = "id, product_type, companion_id, metadata, amount_rupees, phone_number, device_id, status";
  if (digits.length === 10) {
    const { data, error } = await supabase.from("payment_attempts").select(select).eq("phone_number", digits).eq("status", "success");
    if (error) throw error;
    collect(data);
  }
  if (deviceId) {
    const { data, error } = await supabase.from("payment_attempts").select(select).eq("device_id", deviceId).eq("status", "success");
    if (error) throw error;
    collect(data);
  }
  let hasAnyPayment = false;
  let hasChatRecharge = false;
  const photoPackCompanionIds = [];
  const voicePackCompanionIds = [];
  for (const row of rows) {
    hasAnyPayment = true;
    const productType = resolvePaymentProductType(row);
    const companionId = resolvePaymentCompanionId(row);
    if (productType === "chat_recharge") hasChatRecharge = true;
    if (productType === "photo_pack" && companionId) photoPackCompanionIds.push(companionId);
    if (productType === "voice_chat" && companionId) voicePackCompanionIds.push(companionId);
  }
  return {
    hasAnyPayment,
    hasChatRecharge,
    photoPackCompanionIds,
    voicePackCompanionIds
  };
}
function toBillingWalletState(base, entitlements) {
  const summary = buildWalletDisplaySummary({
    chatBalance: base.chatBalance,
    unlockedPhotoPacks: base.unlockedPhotoPacks,
    hasAnyPayment: entitlements.hasAnyPayment,
    hasChatRecharge: entitlements.hasChatRecharge,
    photoPackCompanionIds: entitlements.photoPackCompanionIds,
    voicePackCompanionIds: entitlements.voicePackCompanionIds
  });
  return {
    ...summary,
    phone_number: base.phone_number,
    name: base.name
  };
}
var syncWalletCreditsForPhone = async (phoneDigits, activeDeviceId) => {
  const supabase = getSupabaseAdmin2();
  const digits = phoneDigits.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    throw new Error("Invalid phone for wallet sync");
  }
  const { totalCredits: purchased, unlockedPacks, deviceIds } = await sumPurchasedCreditsForPhone(digits, activeDeviceId);
  const walletSpent = await readWalletSpentForPhone(digits);
  const balance = walletBalance(purchased, walletSpent);
  const packList = Array.from(unlockedPacks);
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await hasWalletSpentColumn();
  await supabase.from("profiles").update(
    withoutWalletSpent({
      wallet_credits: balance,
      unlocked_photo_packs: packList,
      phone_number: digits,
      updated_at: updatedAt
    })
  ).eq("phone_number", digits);
  for (const did of Array.from(deviceIds)) {
    await supabase.from("profiles").upsert(
      withoutWalletSpent({
        device_id: did,
        phone_number: digits,
        wallet_credits: balance,
        ...walletSpentColumnExists ? { wallet_spent: walletSpent } : {},
        unlocked_photo_packs: packList,
        updated_at: updatedAt
      }),
      { onConflict: "device_id" }
    );
  }
  let name = null;
  if (activeDeviceId) {
    const { data: profile } = await supabase.from("profiles").select("name").eq("device_id", activeDeviceId).maybeSingle();
    name = profile?.name ?? null;
  }
  console.log(
    `[billing] synced wallet phone=${digits} purchased=${purchased} spent=${walletSpent} balance=${balance} packs=${packList.join(",") || "\u2014"}`
  );
  const entitlements = await fetchPaymentEntitlements(digits, activeDeviceId);
  return toBillingWalletState(
    {
      chatBalance: balance,
      unlockedPhotoPacks: packList,
      phone_number: digits,
      name
    },
    entitlements
  );
};
var deductChatMessageCredit = async (input) => {
  if (!serverShouldChargeForMessage(input.messageCountFromClient)) {
    const state = await getBillingState(input.deviceId, input.phoneHint);
    return { ok: true, wallet_credits: state.wallet_credits, charged: false };
  }
  const supabase = getSupabaseAdmin2();
  const phoneDigits = input.phoneHint?.replace(/\D/g, "").slice(-10) || "";
  let purchased = 0;
  let walletSpent = 0;
  if (phoneDigits.length === 10) {
    const summed = await sumPurchasedCreditsForPhone(phoneDigits, input.deviceId);
    purchased = summed.totalCredits;
    walletSpent = await readWalletSpentForPhone(phoneDigits);
  } else {
    await ensureProfileRow(input.deviceId);
    purchased = await sumPurchasedCreditsForDevice(input.deviceId);
    walletSpent = await readWalletSpentForDevice(input.deviceId);
  }
  const balanceBefore = walletBalance(purchased, walletSpent);
  if (balanceBefore < CHAT_MESSAGE_COST_RUPEES - 1e-9) {
    return { ok: false, reason: "insufficient", wallet_credits: balanceBefore };
  }
  const newSpent = roundWalletRupees(walletSpent + CHAT_MESSAGE_COST_RUPEES);
  const balanceAfter = walletBalance(purchased, newSpent);
  const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  await hasWalletSpentColumn();
  if (phoneDigits.length === 10) {
    const phoneUpdate = withoutWalletSpent({
      wallet_credits: balanceAfter,
      updated_at: updatedAt,
      ...walletSpentColumnExists ? { wallet_spent: newSpent } : {}
    });
    const { error } = await supabase.from("profiles").update(phoneUpdate).eq("phone_number", phoneDigits);
    if (error) throw error;
  }
  const deviceUpdate = withoutWalletSpent({
    wallet_credits: balanceAfter,
    updated_at: updatedAt,
    ...walletSpentColumnExists ? { wallet_spent: newSpent } : {}
  });
  const { error: deviceErr } = await supabase.from("profiles").update(deviceUpdate).eq("device_id", input.deviceId);
  if (deviceErr) throw deviceErr;
  console.log(
    `[billing] chat debit device=${input.deviceId} spent=${newSpent} balance=${balanceAfter}`
  );
  return { ok: true, wallet_credits: balanceAfter, charged: true };
};
async function derivePhoneFromDevicePayments(deviceId) {
  const supabase = getSupabaseAdmin2();
  const { data, error } = await supabase.from("payment_attempts").select("phone_number").eq("device_id", deviceId).eq("status", "success").not("phone_number", "is", null).order("created_at", { ascending: false }).limit(1);
  if (error) return "";
  return String(data?.[0]?.phone_number ?? "").replace(/\D/g, "").slice(-10);
}
var getBillingState = async (deviceId, phoneHint) => {
  const supabase = getSupabaseAdmin2();
  await hasWalletSpentColumn();
  const profileQuery = walletSpentColumnExists ? supabase.from("profiles").select("wallet_credits, wallet_spent, unlocked_photo_packs, phone_number, name") : supabase.from("profiles").select("wallet_credits, unlocked_photo_packs, phone_number, name");
  const { data: profileRaw, error: profileErr } = await profileQuery.eq("device_id", deviceId).maybeSingle();
  if (profileErr) throw profileErr;
  const profile = profileRaw;
  let phone = phoneHint?.replace(/\D/g, "").slice(-10) || (profile?.phone_number ? String(profile.phone_number).replace(/\D/g, "").slice(-10) : "");
  if (phone.length !== 10) {
    phone = await derivePhoneFromDevicePayments(deviceId);
  }
  if (phone.length === 10) {
    const synced = await syncWalletCreditsForPhone(phone, deviceId);
    return {
      ...synced,
      name: synced.name ?? profile?.name ?? null
    };
  }
  const purchased = await sumPurchasedCreditsForDevice(deviceId);
  const walletSpent = await readWalletSpentForDevice(deviceId);
  const walletCredits = walletBalance(purchased, walletSpent);
  const unlockedPhotoPacks = Array.isArray(profile?.unlocked_photo_packs) ? profile.unlocked_photo_packs : [];
  const entitlements = await fetchPaymentEntitlements(void 0, deviceId);
  return toBillingWalletState(
    {
      chatBalance: walletCredits,
      unlockedPhotoPacks,
      phone_number: profile?.phone_number ?? null,
      name: profile?.name ?? null
    },
    entitlements
  );
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

// shared/razorpayProductCodes.ts
var PRODUCT_TYPE_TO_CODE = {
  chat_recharge: "CR",
  photo_pack: "PP",
  voice_chat: "VC",
  premium_photo: "PM",
  other: "OT"
};
var COMPANION_SLOT = {
  naina: "R01",
  priya: "R02",
  ananya: "R03",
  meera: "R04",
  riya: "R05",
  neha: "R06",
  doctor: "A01",
  kundli: "A02",
  parenting: "A03",
  finance: "A04",
  career: "A05",
  krishna: "A06",
  english: "A07",
  relationship: "A08"
};
function productTypeToCode(productType) {
  return PRODUCT_TYPE_TO_CODE[productType] ?? "OT";
}
function companionIdToSlot(companionId) {
  if (!companionId?.trim()) return void 0;
  const key = companionId.trim().toLowerCase();
  if (COMPANION_SLOT[key]) return COMPANION_SLOT[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = hash * 31 + key.charCodeAt(i) >>> 0;
  }
  return `X${(hash % 1e4).toString().padStart(4, "0")}`;
}
function buildRazorpayGatewayNotes(input) {
  const notes = {
    pc: productTypeToCode(input.productType),
    pid: input.paymentId
  };
  const slot = companionIdToSlot(input.companionId);
  if (slot) notes.cid = slot;
  return notes;
}

// server/services/kundliProfile.ts
import { createClient as createClient3 } from "@supabase/supabase-js";
var getSupabaseAdmin3 = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return createClient3(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};
function isMissingColumnError2(error) {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return lower.includes("column") && (lower.includes("does not exist") || lower.includes("could not find"));
}
function parseKundliBirthDetails(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  if (typeof o.name === "string" && typeof o.gender === "string" && typeof o.dateOfBirth === "string" && typeof o.timeOfBirth === "string" && typeof o.cityOfBirth === "string") {
    return {
      name: o.name.trim(),
      gender: o.gender,
      dateOfBirth: o.dateOfBirth,
      timeOfBirth: o.timeOfBirth,
      cityOfBirth: o.cityOfBirth.trim()
    };
  }
  return null;
}
async function getKundliBirthForProfile(deviceId, phoneHint) {
  const supabase = getSupabaseAdmin3();
  const digits = phoneHint?.replace(/\D/g, "").slice(-10) || "";
  const select = "kundli_birth_details, device_id, phone_number";
  if (digits.length === 10) {
    const { data, error } = await supabase.from("profiles").select(select).eq("phone_number", digits).not("kundli_birth_details", "is", null).order("updated_at", { ascending: false }).limit(1);
    if (error) {
      if (isMissingColumnError2(error)) return null;
      throw error;
    }
    const parsed = parseKundliBirthDetails(data?.[0]?.kundli_birth_details);
    if (parsed) return parsed;
  }
  const { data: byDevice, error: deviceErr } = await supabase.from("profiles").select(select).eq("device_id", deviceId).maybeSingle();
  if (deviceErr) {
    if (isMissingColumnError2(deviceErr)) return null;
    throw deviceErr;
  }
  return parseKundliBirthDetails(byDevice?.kundli_birth_details);
}
async function saveKundliBirthForProfile(deviceId, phoneHint, details) {
  const supabase = getSupabaseAdmin3();
  const digits = phoneHint?.replace(/\D/g, "").slice(-10) || "";
  const row = {
    device_id: deviceId,
    kundli_birth_details: details,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (digits.length === 10) row.phone_number = digits;
  if (details.name) row.name = details.name;
  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "device_id" });
  if (error && isMissingColumnError2(error)) return;
  if (error) throw error;
  if (digits.length === 10) {
    await supabase.from("profiles").update({
      kundli_birth_details: details,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("phone_number", digits);
  }
}

// server/routes.ts
var kundliBirthSchema = z.object({
  name: z.string().min(1).max(120),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1),
  timeOfBirth: z.string().min(1),
  cityOfBirth: z.string().min(1).max(200)
});
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
  app2.get("/api/profiles/kundli-birth", async (req, res) => {
    try {
      const query = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().optional()
      }).parse(req.query);
      const phoneHint = query.phone_number?.replace(/\D/g, "").slice(-10) || null;
      const details = await getKundliBirthForProfile(query.device_id, phoneHint);
      res.json({ kundli_birth_details: details });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Profile sync unavailable" });
      }
      res.status(500).json({ message: "Failed to load kundli birth details", error: msg });
    }
  });
  app2.put("/api/profiles/kundli-birth", async (req, res) => {
    try {
      const bodySchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().optional().nullable(),
        kundli_birth_details: kundliBirthSchema
      });
      const data = bodySchema.parse(req.body);
      const phoneHint = data.phone_number?.replace(/\D/g, "").slice(-10) || null;
      await saveKundliBirthForProfile(
        data.device_id,
        phoneHint,
        data.kundli_birth_details
      );
      res.json({ ok: true, kundli_birth_details: data.kundli_birth_details });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      res.status(500).json({ message: "Failed to save kundli birth details", error: msg });
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
      const query = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().optional()
      }).parse(req.query);
      const phoneHint = query.phone_number?.replace(/\D/g, "").slice(-10) || null;
      const state = await getBillingState(query.device_id, phoneHint);
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
      const razorpayNotes = buildRazorpayGatewayNotes({
        paymentId: pending.id,
        productType: body.billing.product_type,
        companionId: body.billing.companion_id
      });
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
        companionName: z.string().optional(),
        userName: z.string().optional(),
        // Optional photo fields for premium messages
        photoUrl: z.string().optional(),
        isPremium: z.boolean().optional(),
        skipUserMessage: z.boolean().optional(),
        role: z.enum(["user", "assistant"]).optional(),
        // Add role to schema
        messageCount: z.number().optional(),
        // Add message count to schema
        deviceId: z.string().optional(),
        phoneNumber: z.string().optional(),
        isAuthenticated: z.boolean().optional(),
        // Add auth state to schema
        /** Prior turns from the client (required on serverless — seeded UI messages are not in MemStorage). */
        conversationHistory: z.array(conversationTurnSchema).max(40).optional()
      });
      const validatedData = messageSchema.parse(req.body);
      let userName = validatedData.userName?.trim() || "";
      const guestProfile = req.cookies?.guestProfile;
      if (!userName && guestProfile) {
        try {
          const profile = JSON.parse(guestProfile);
          userName = profile.name || "";
        } catch (e) {
          console.error("Error parsing user profile from cookie:", e);
        }
      }
      userName = firstNameOnly(userName);
      const companionName = validatedData.companionName?.trim() || "";
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
          filteredMessages = filterWelcomeMessagesFromHistory(companionMessages);
          console.log("[DEBUG] Companion messages after filter:", filteredMessages.map((m) => ({ role: m.role, content: m.content })));
        }
        const historyFromStorage = filteredMessages.map((msg) => ({
          role: msg.role,
          content: msg.content
        }));
        const fromClient = validatedData.conversationHistory;
        let conversationHistory = fromClient && fromClient.length > 0 ? fromClient.slice(-40) : historyFromStorage;
        if (isFirstUserMessage && fromClient && fromClient.length > 0) {
          conversationHistory = filterWelcomeMessagesFromHistory(conversationHistory);
        }
        console.log("[DEBUG] Conversation history being sent to LLM:", conversationHistory);
        console.log(
          "[DEBUG] History source:",
          fromClient && fromClient.length > 0 ? "client" : "storage"
        );
        console.log("[DEBUG] Is first user message:", isFirstUserMessage);
        let walletCreditsAfter;
        if (validatedData.deviceId) {
          const phoneDigits = validatedData.phoneNumber?.replace(/\D/g, "").slice(-10) || "";
          const deduct = await deductChatMessageCredit({
            deviceId: validatedData.deviceId,
            phoneHint: phoneDigits || null,
            messageCountFromClient: messageCount
          });
          if (!deduct.ok) {
            return res.status(402).json({
              message: "Insufficient wallet balance for chat",
              code: "INSUFFICIENT_WALLET",
              wallet_credits: deduct.wallet_credits
            });
          }
          walletCreditsAfter = deduct.wallet_credits;
        }
        const responseContent = await generateResponse(
          validatedData.content,
          conversationHistory,
          validatedData.language,
          {
            companionId: validatedData.companionId,
            companionName: companionName || void 0,
            userName: userName || void 0
          }
        );
        const botMessage = await storage.createMessage({
          content: responseContent,
          role: "assistant",
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        res.status(201).json({
          userMessage,
          botMessage,
          ...walletCreditsAfter !== void 0 ? { wallet_credits: walletCreditsAfter } : {}
        });
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
