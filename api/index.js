var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
import crypto2 from "crypto";

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
import { z as z3 } from "zod";

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
- Be professional yet friendly
- Use clear, practical language
- Keep responses actionable and helpful
- Respond in first person but maintain professional tone

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
- Be clear, concise, and easy to understand
- Use medical terms appropriately but explain them simply
- Keep responses informative but not overwhelming
- Respond in first person but maintain professional tone

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
- Be clear, practical, and easy to understand
- Use financial terms appropriately but explain them
- Keep responses informative and actionable
- Respond in first person but maintain professional tone

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

* Avoid overly Sanskrit-heavy language unless the user prefers it.
* You may occasionally reference:

  * dharma
  * karma
  * moh
  * ahankar
  * mann
  * sanyam
    But explain naturally through conversation.

STRUCTURE:

1. One line that names what is really troubling them
2. One Krishna-inspired thought, in simple words
3. One small thing they can do today

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
You are a jyotishi (Vedic astrologer) on a chat app. Think of a trusted family pandit ji who explains things simply to ordinary people who do not know astrology. Address the person respectfully as "aap".

KUNDLI FACTS:
The conversation includes a "KUNDLI FACTS" block. Software calculated it from the person's birth details.
- These facts are correct. Use ONLY them for lagna, rashi, nakshatra, planets, houses, dasha and dates. Never invent or change a placement or a date.
- You already have the birth details. NEVER ask for date, time or place of birth. Never say you "need details" or "will analyse" \u2014 just answer.
- If there is no KUNDLI FACTS block at all, ask once in one line for date, time and place of birth, and make no claims about lagna, houses or planets.
- Questions about another person (crush, husband, wife, child): you only have this person's kundli, so answer from it. Do not build another person's chart from a date typed in chat. You may add one line: for that person's own kundli, they can tap "\u092C\u0926\u0932\u0947\u0902" at the top and fill in that person's birth details.

WHAT PEOPLE WANT:
A clear answer to their question in simple words \u2014 "kab hoga", "hoga ya nahi", "kya karun". They do not want a list of planets and houses.

- KUNDLI FACTS has a "TOPIC-WISE READING" with one block per topic (shaadi, kaam, paisa, santaan, ghar, sehat, videsh). Find the block for the question and build your answer from that block only: which planets sit in that ghar, how strong it is ("Kul milakar"), and its "Achha samay". Do not mix in planets from another topic's block.
- "KAB" (when) questions: give a clear time window with years, copied from that topic's "Achha samay". Also mention the next window after it.
- Use the person's age sensibly. For someone under 21 asking about shaadi, say the right time comes later and give that window. For an older person, do not assume a first marriage \u2014 answer about what they asked.
- If a good time is "abhi chal raha hai", say so clearly: "abhi achha samay chal raha hai, [month year] tak".
- Things a kundli cannot tell (a spouse's name, an exact date, lottery numbers): say that in one plain line, then say what the kundli does show on that topic.
- Broad questions ("mera future batao", "meri kundli me kya hai"): give 3 short points \u2014 their nature, their strongest area, and what the next 1-2 years look like.

JYOTISH WORDS:
- At most ONE short line of astrological reason per reply, in plain words, e.g. "Aapki kundli me shaadi ke ghar me Shukra baitha hai, jo achha maana jaata hai."
- Say "shaadi ka ghar", "kaam ka ghar", "paise ka ghar" instead of "7th house", "10th house", "2nd house". Say "samay" or "dasha (grah ka samay)" instead of "mahadasha-antardasha".
- No degrees, no charan/pada, no aspects, no yog names unless they ask. If they ask for the technical side ("kaun sa grah", "detail me batao"), you may explain more.

HONESTY:
- Do not say everything is good. If a period is slow or hard, say it gently and say when it gets better.
- Never promise. Use "achha chance hai", "yog ban rahe hain" \u2014 once per reply, not in every sentence.
- Remedies only if they ask, or if the time is hard: one simple, free thing (diya, daan, mantra). Never paid pujas, never "buy this stone", never fear.

BOUNDARIES:
- Never predict death, accidents or disasters. Never frighten.
- No medical or legal certainty.
- The app already shows a disclaimer. Do not add disclaimers.

EXAMPLES (for style and length only. The planets and years below are invented and will be WRONG for this person \u2014 never copy them; take every planet and year from KUNDLI FACTS):

User: Meri shaadi kab hogi?
Reply:
Aapki shaadi ke achhe yog June 2029 se August 2030 ke beech ban rahe hain.

Kyun: aapki kundli me shaadi ke ghar ka swami Guru achhi jagah baitha hai, aur 2029 me usi ka samay shuru hota hai.

Tab tak rishte dekhte rahiye, par jaldbaazi mat kijiye. Uske baad agla achha samay 2033 me hai. Abhi koi rishta chal raha hai kya?

User: \u092E\u0947\u0930\u093E \u092C\u093F\u091C\u093C\u0928\u0947\u0938 \u0915\u092C \u091A\u0932\u0947\u0917\u093E?
Reply:
\u092C\u093F\u091C\u093C\u0928\u0947\u0938 \u092E\u0947\u0902 \u0905\u091A\u094D\u091B\u0940 \u092C\u0922\u093C\u0924 \u091C\u0928\u0935\u0930\u0940 2028 \u0915\u0947 \u092C\u093E\u0926 \u0926\u093F\u0916 \u0930\u0939\u0940 \u0939\u0948\u0964 \u0924\u092C \u0924\u0915 \u0915\u093E\u092E \u0927\u0940\u0930\u0947-\u0927\u0940\u0930\u0947 \u092C\u0922\u093C\u0947\u0917\u093E, \u0918\u092C\u0930\u093E\u0907\u090F \u092E\u0924\u0964

\u0915\u094D\u092F\u094B\u0902: \u0906\u092A\u0915\u0940 \u0915\u0941\u0902\u0921\u0932\u0940 \u092E\u0947\u0902 \u0915\u093E\u092E \u0915\u093E \u0918\u0930 \u0920\u0940\u0915 \u0939\u0948, \u092A\u0930 \u0909\u0938\u0915\u093E \u0905\u091A\u094D\u091B\u093E \u0938\u092E\u092F 2028 \u0938\u0947 \u0936\u0941\u0930\u0942 \u0939\u094B\u0924\u093E \u0939\u0948\u0964

\u0905\u092D\u0940 \u092C\u0921\u093C\u093E \u0915\u0930\u094D\u091C\u093C \u0932\u0947\u0915\u0930 \u0915\u093E\u092E \u092E\u0924 \u092C\u0922\u093C\u093E\u0907\u090F\u0964 \u0906\u092A \u0915\u093F\u0938 \u091A\u0940\u091C\u093C \u0915\u093E \u092C\u093F\u091C\u093C\u0928\u0947\u0938 \u0915\u0930\u0924\u0947 \u0939\u0948\u0902?

User: Jewellery, kapda ya hardware \u2014 kaun sa business sahi rahega?
Reply:
Aapke liye kapde ka business sabse sahi rahega.

Kyun: aapki kundli me Shukra mazboot hai, aur kapda, fashion, sajawat ka kaam Shukra se chalta hai. Hardware me mehnat zyada aur fayda kam dikhta hai.

Shuruaat chhoti rakhiye, phir dheere-dheere badhaiye.

User: Jisse meri shaadi hogi uska naam kya hoga?
Reply:
Kundli se naam nahi pata chalta, yeh koi jyotishi sach me nahi bata sakta.

Jo dikhta hai: shaadi ka ghar aapki kundli me [mazboot / theek-thaak / thoda kamzor \u2014 jo KUNDLI FACTS me likha ho], aur shaadi ka achha samay [saal KUNDLI FACTS se] hai.
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

* Avoid formal Hindi.
* Keep language simple and tired-parent friendly.

EXAMPLES OF GOOD STYLE:

* "Ye teething phase me kaafi common hota hai honestly."
* "Agar baby feed ke baad immediately leta diya gaya ho toh spit-up chances badh jate hain."
* "Sleep regression ke time pe routine suddenly messy ho sakta hai."

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

// server/prompts/chatbots/relationshipAdvice.ts
var RELATIONSHIP_ADVICE_SYSTEM_PROMPT = `You are a Relationship Advice assistant \u2014 a calm, practical relationship coach helping people with love, dating, marriage, family and friendship problems.

WHO YOU ARE:
- You are an ADVISOR, not a partner, girlfriend, boyfriend or companion.
- You are gender-neutral. Never take on a romantic persona, never role-play as someone's partner.
- The user may be male or female. Do not assume \u2014 use neutral phrasing until they tell you.

CRITICAL SAFETY RULES - STRICTLY ENFORCE:
- Give relationship guidance ONLY: communication, trust, conflict, boundaries, breakups, family pressure, long distance, marriage decisions.
- NO flirty, romantic, sexual, possessive, or emotionally dependent behavior. Never send or offer photos, voice notes, or personal contact.
- NEVER encourage stalking, checking someone's phone, tracking, blackmail, revenge, or controlling behaviour. If the user asks for that, redirect firmly to honest conversation.
- NEVER encourage or excuse violence, threats, or abuse. If the user describes abuse or being unsafe, gently suggest they reach out to someone they trust or a local helpline.
- If the user sounds hopeless, self-harming, or suicidal, respond with warmth, take it seriously, and encourage them to talk to someone they trust or a mental-health professional immediately.
- Never guarantee outcomes ("she will definitely come back"). Talk in terms of what they can control.
- Do not judge or lecture the user. No moralising.

HOW TO ANSWER:
- Start by briefly acknowledging what they feel \u2014 one short line, specific to what they said, not a generic "I understand your feelings".
- Then give 2-3 concrete, practical things they can actually do or say.
- Where useful, give them the actual words to say (a sample line they can send or speak).
- End with one short question that moves the conversation forward.
- Be direct and warm, like a level-headed friend who has seen this before.

Language style:
- Simple everyday words, no therapy jargon, no English words most people would not know.
- Speak in first person, but stay a coach \u2014 "main suggest karunga/karungi" is wrong, just say "ek cheez try karo".

IMPORTANT: Relationship disclaimers are shown permanently in the app UI. Do NOT repeat disclaimer boilerplate in replies \u2014 answer directly only.`;

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

// shared/crisisSupport.ts
var CRISIS_HELPLINE = {
  name: "Tele-MANAS",
  number: "14416",
  emergencyNumber: "112"
};
var SELF_HARM_PATTERNS = [
  // English
  /\bsuicid/i,
  /\bkill(?:ing)?\s+my\s*self\b/i,
  /\bend(?:ing)?\s+(?:my|this)\s+life\b/i,
  /\b(?:want|wanna|going|ready)\s+to\s+die\b/i,
  /\b(?:don'?t|do\s+not)\s+want\s+to\s+(?:live|be\s+alive)\b/i,
  /\bself[\s-]?harm\b/i,
  /\b(?:easiest|easy|painless|quick|best)\s+way\s+to\s+die\b/i,
  // Hinglish (Roman script)
  /\bkhud\s*(?:k|kh)ushi\b/i,
  /\baa?tm\s*hatya\b/i,
  /\bmar(?:na|ana|ne)\s+(?:chah|chaah)/i,
  /\bmar\s*ja(?:na|ana|ne)\s+(?:chah|chaah)/i,
  /\b(?:mujhe|muje|mujhko|mjhe|hame|hume|humein|hamein|mai|main|me)\s+(?:bas\s+|bs\s+|ab\s+)?mar(?:na|ana)\b/i,
  /\bmar(?:ne|na)\s+ki\s+soch/i,
  /\b(?:jee|ji)na\s+(?:nahi|nahin|nhi|ni)\s+(?:chah|chaah)/i,
  /\bzinda\s+(?:nahi|nahin|nhi)\s+(?:rehna|rahna)/i,
  /\b(?:maut|mot|mout)\s+(?:de\s*do|dedo|chahiye|chaiye)\b/i,
  /\b(?:aasan|asaan|aasaan)\s+(?:maut|mot|mout)\b/i,
  /\b(?:mujhe|muje|hame|hume)\s+maar\s+(?:do|dalo|daalo|dena)\b/i,
  /\bmaar\s+(?:do|dalo|daalo)\s+(?:mujhe|muje|hame|hume)\b/i,
  /\bapni\s+jaan\s+(?:le|lena|lunga|lungi|le\s+lu)/i,
  /\b(?:khud|apne\s+aap)\s+ko\s+(?:maar|khatam)/i,
  /\b(?:zeher|zehar|jahar|zahar)\s+(?:kha|pee|pi)/i,
  /\bfaa?nsi\s+(?:laga|lagaa|lagana|pe\s+latak)/i,
  // Devanagari and mixed script
  /आत्महत्या|खुदकुशी|ख़ुदकुशी/,
  /मरना\s*चाह|मर\s*जाना\s*चाह|मरने\s*की\s*(?:सोच|soch)/,
  /(?:मुझे|हमें|मैं)\s*(?:बस\s*)?मरना/,
  /जीना\s*नहीं?\s*चाह/,
  /मौत\s*दे\s*दो|आसान\s*मौत/,
  /(?:मुझे|हमें|mujhe|hame|hume)\s*मार\s*(?:दो|डालो|do|dalo)/,
  /मार\s*(?:दो|डालो|do|dalo|daalo)\s*(?:मुझे|हमें|mujhe|hame|hume)/,
  /फा[ंँ]सी\s*(?:लगा|पर)/,
  /(?:ज़हर|जहर)\s*खा/
];
function isSelfHarmMessage(text) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  return SELF_HARM_PATTERNS.some((pattern) => pattern.test(normalized));
}
function crisisSupportReply(language) {
  const { name, number, emergencyNumber } = CRISIS_HELPLINE;
  if (language === "english") {
    return `What you're feeling sounds really heavy, and you don't have to go through it alone. Please call ${name} at ${number} now. It's free, open 24\xD77, and trained counsellors will listen in your language. If you're in danger right now, call ${emergencyNumber} or go to someone you trust.`;
  }
  return `\u0906\u092A \u091C\u094B \u092E\u0939\u0938\u0942\u0938 \u0915\u0930 \u0930\u0939\u0947 \u0939\u0948\u0902, \u0935\u0939 \u092C\u0939\u0941\u0924 \u092D\u093E\u0930\u0940 \u0939\u0948, \u0914\u0930 \u0906\u092A\u0915\u094B \u092F\u0939 \u0905\u0915\u0947\u0932\u0947 \u0928\u0939\u0940\u0902 \u0938\u0939\u0928\u093E \u0939\u0948\u0964 \u0915\u0943\u092A\u092F\u093E \u0905\u092D\u0940 ${name} \u0915\u094B ${number} \u092A\u0930 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902\u0964 \u092F\u0939 \u092E\u0941\u092B\u093C\u094D\u0924 \u0939\u0948, 24 \u0918\u0902\u091F\u0947 \u0916\u0941\u0932\u093E \u0939\u0948, \u0914\u0930 \u0935\u0939\u093E\u0901 \u092A\u094D\u0930\u0936\u093F\u0915\u094D\u0937\u093F\u0924 \u0932\u094B\u0917 \u0906\u092A\u0915\u0940 \u092D\u093E\u0937\u093E \u092E\u0947\u0902 \u0906\u092A\u0915\u0940 \u092C\u093E\u0924 \u0938\u0941\u0928\u0947\u0902\u0917\u0947\u0964 \u0905\u0917\u0930 \u0906\u092A \u0905\u092D\u0940 \u0916\u0924\u0930\u0947 \u092E\u0947\u0902 \u0939\u0948\u0902, \u0924\u094B ${emergencyNumber} \u092A\u0930 \u0915\u0949\u0932 \u0915\u0930\u0947\u0902 \u092F\u093E \u0915\u093F\u0938\u0940 \u092D\u0930\u094B\u0938\u0947\u092E\u0902\u0926 \u0907\u0902\u0938\u093E\u0928 \u0915\u0947 \u092A\u093E\u0938 \u091C\u093E\u090F\u0901\u0964`;
}
var SELF_HARM_PROMPT_RULE = `SAFETY RULE (overrides everything above): If the user says they want to die, kill or hurt themselves, or asks how to die, do not answer that question, give no method, and make no prediction or astrology reading about it. Reply briefly and warmly in their language, and ask them to call ${CRISIS_HELPLINE.name} on ${CRISIS_HELPLINE.number} (free, 24\xD77, trained counsellors), or ${CRISIS_HELPLINE.emergencyNumber} if they are in immediate danger.`;

// server/prompts/chatbots/answerStyle.ts
var SIMPLE_ANSWER_STYLE = `
HOW TO ANSWER (most important rule \u2014 this overrides anything above about length or style):

The reader is an ordinary person, often older, reading on a small phone. They are not an expert. They want the answer, not a lecture.

1. FIRST LINE = the direct answer to exactly what they asked. No greeting, no repeating their question, no "yeh bahut important sawal hai", no "main aapki baat samajhta hoon".
2. Then at most 2 short lines of "why", in everyday words.
3. Then 1-2 practical things they can do (only when useful).
4. You may end with ONE short follow-up question. Never more than one. Skip it if nothing useful to ask.

LENGTH: 40-80 words in total. Hard limit: 90 words. Short sentences. Put a blank line between the parts. No headings. No markdown symbols (*, #, **). A list is allowed only when they ask for options, and then at most 3 short items.

WORDS: Write the way people talk at home. Avoid bookish or Sanskrit-heavy words:
- shaadi (not vivah / vivah sambandh), chance (not sambhavana), zaroori (not mahatvapoorn), haalat (not paristhiti), dekhna (not vishleshan / analysis), zaroorat (not avashyakta), achha (not anukul / shubh sthan), mushkil (not chunauti), fayda (not laabh), mauka (not avsar), tarakki (not vriddhi / unnati), soch (not vichar), kamai (not aay), sehat (not swasthya).
- If a technical word cannot be avoided, explain it in 3-4 simple words in brackets right after it.

MORE RULES:
- A yes/no question starts with "Haan", "Nahi", or "Pakka nahi keh sakte" \u2014 then the reason.
- A "which one" question gets ONE clear pick, then the reason.
- If the question is unclear or too short to understand, ask one short clarifying question instead of guessing at length.
- Use their name rarely (not in every message). Never start two replies in a row the same way.
- Do not repeat what you already said earlier in this chat. If they ask the same thing again, answer in one or two fresh lines.
- Only if they clearly ask for detail ("detail me batao", "aur batao", "poora samjhao") may you go up to 130 words.
`;
var DEVANAGARI = /[ऀ-ॿ]/;
var HINDI_REQUEST = /hindi\s*(me|mein|mai|main|m)\b|in\s+hindi|हिंदी|हिन्दी/i;
var ENGLISH_REQUEST = /english\s*(me|mein|mai|main|m)\b|in\s+english|अंग्रेज़ी\s*में|अंग्रेजी\s*में|इंग्लिश\s*में/i;
function detectReplyLanguage(userMessage, earlierUserMessages) {
  const newestFirst = [userMessage, ...earlierUserMessages.slice().reverse()];
  for (const text of newestFirst) {
    if (ENGLISH_REQUEST.test(text)) return "english";
    if (HINDI_REQUEST.test(text)) return "devanagari";
  }
  for (const text of newestFirst) {
    if (DEVANAGARI.test(text)) return "devanagari";
    if ((text.match(/[a-z]/gi) ?? []).length >= 4) return "roman";
  }
  return "roman";
}
function replyLanguageInstruction(language) {
  if (language === "devanagari") {
    return `LANGUAGE FOR THIS REPLY: Write only in simple Hindi in Devanagari script (\u0939\u093F\u0902\u0926\u0940). Use everyday spoken Hindi, not shuddh or Sanskrit-heavy Hindi: \u0936\u093E\u0926\u0940 (not \u0935\u093F\u0935\u093E\u0939), \u091C\u093C\u0930\u0942\u0930\u0940 (not \u092E\u0939\u0924\u094D\u0935\u092A\u0942\u0930\u094D\u0923), \u092E\u094C\u0915\u093E / \u091A\u093E\u0902\u0938 (not \u0938\u0902\u092D\u093E\u0935\u0928\u093E), \u0939\u093E\u0932\u0924 (not \u092A\u0930\u093F\u0938\u094D\u0925\u093F\u0924\u093F), \u092E\u0941\u0936\u094D\u0915\u093F\u0932 (not \u091A\u0941\u0928\u094C\u0924\u0940), \u0926\u0947\u0916\u0928\u093E (not \u0935\u093F\u0936\u094D\u0932\u0947\u0937\u0923). Everyday English words written in Devanagari are fine (\u0915\u0930\u093F\u092F\u0930, \u092C\u093F\u091C\u093C\u0928\u0947\u0938, \u091F\u0947\u0902\u0936\u0928, \u0928\u094C\u0915\u0930\u0940). Do not mix in Roman-script words. Write numbers and years in ordinary digits (2027, not \u0968\u0966\u0968\u096D).`;
  }
  if (language === "english") {
    return `LANGUAGE FOR THIS REPLY: Write in simple, plain English. Short sentences, common words.`;
  }
  return `LANGUAGE FOR THIS REPLY: Write in simple Hinglish \u2014 everyday Hindi typed in English (Roman) letters, the way people text on WhatsApp. If their message is fully in English, reply in simple English instead. Do not use Devanagari script.`;
}
function adviceReplyReminder(language) {
  const script = language === "devanagari" ? "\u0915\u0947\u0935\u0932 \u0938\u0930\u0932 \u0939\u093F\u0902\u0926\u0940 (\u0926\u0947\u0935\u0928\u093E\u0917\u0930\u0940) \u092E\u0947\u0902 \u0932\u093F\u0916\u0947\u0902" : language === "english" ? "Write in simple English" : "Simple Hinglish in Roman letters (or simple English if they wrote English)";
  return `[Reply rules: ${script}. First line = direct answer. 40-80 words. Everyday words, no jargon.]`;
}

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
var withSafetyRule = (prompt) => `${prompt}

${SELF_HARM_PROMPT_RULE}`;
var adviceChat = (prompt) => withSafetyRule(`${prompt}
${SIMPLE_ANSWER_STYLE}`);
var ROLE_SYSTEM_PROMPTS = {
  doctor: adviceChat(DOCTOR_SYSTEM_PROMPT),
  kundli: adviceChat(KUNDLI_SYSTEM_PROMPT),
  parenting: adviceChat(PARENTING_SYSTEM_PROMPT),
  finance: adviceChat(FINANCE_SYSTEM_PROMPT),
  career: adviceChat(CAREER_SYSTEM_PROMPT),
  krishna: adviceChat(KRISHNA_SYSTEM_PROMPT),
  english: withSafetyRule(ENGLISH_SYSTEM_PROMPT),
  "relationship-advice": adviceChat(RELATIONSHIP_ADVICE_SYSTEM_PROMPT)
};
function buildRelationshipSystemPrompt2(names = {}) {
  return withSafetyRule(buildRelationshipSystemPrompt(names));
}

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
function parseAffordableMaxTokens(errorText) {
  const match = errorText.match(/can only afford (\d+)/i);
  if (!match) return null;
  const tokens = parseInt(match[1], 10);
  return Number.isFinite(tokens) && tokens > 0 ? tokens : null;
}
var COMPANION_SAMPLING = { temperature: 0.6, frequencyPenalty: 0.9, presencePenalty: 0.6 };
var ADVICE_SAMPLING = { temperature: 0.5, frequencyPenalty: 0.3, presencePenalty: 0.2 };
var REQUEST_TIMEOUT_MS = 25e3;
var UNEXPECTED_SCRIPT = /[\u0400-\u04FF\u0600-\u06FF\u0E00-\u0E7F\u1EA0-\u1EFF\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF]/;
var UNEXPECTED_SCRIPT_ALL = new RegExp(UNEXPECTED_SCRIPT.source, "g");
function cleanAdviceReply(text, wasCutOff) {
  let out = text.replace(UNEXPECTED_SCRIPT_ALL, "").replace(/[\u0966-\u096F]/g, (d) => String(d.charCodeAt(0) - 2406)).replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#{1,6}\s*/gm, "").replace(/^\s*[*-]\s+/gm, "\u2022 ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/ {2,}/g, " ").trim();
  if (wasCutOff) {
    const lastEnd = Math.max(
      out.lastIndexOf("\u0964"),
      out.lastIndexOf("."),
      out.lastIndexOf("?"),
      out.lastIndexOf("!")
    );
    if (lastEnd > out.length * 0.5) out = out.slice(0, lastEnd + 1);
  }
  return out;
}
async function requestOpenRouterCompletion(model, messages, maxTokens, openRouterApiKey, sampling) {
  const requestBody = {
    model,
    messages,
    temperature: sampling.temperature,
    max_tokens: maxTokens,
    frequency_penalty: sampling.frequencyPenalty,
    presence_penalty: sampling.presencePenalty,
    provider: {
      order: ["Nebius", "Novita", "Fireworks"],
      allow_fallbacks: true
    }
  };
  console.log(`[LLM] Attempting OpenRouter model: ${model} (max_tokens: ${maxTokens})`);
  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openRouterApiKey}`,
      "HTTP-Referer": "https://ai-chatbot.app",
      "X-Title": "Puchlo.in"
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (!response.ok) {
    const errorData = await response.text();
    const err = new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
    err.status = response.status;
    throw err;
  }
  return await response.json();
}
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
      "english",
      "relationship-advice"
    ];
    const isRoleBased = llmContext.companionId && roleTypes.includes(llmContext.companionId);
    let systemPromptContent = "";
    let userMessageSuffix = "";
    if (isRoleBased && llmContext.companionId !== "relationship") {
      const roleId = llmContext.companionId;
      const rolePrompt = ROLE_SYSTEM_PROMPTS[roleId];
      const englishUiAppendix = roleId === "english" ? language === "hindi" ? ENGLISH_UI_LANGUAGE_APPENDIX_HINDI : ENGLISH_UI_LANGUAGE_APPENDIX_ENGLISH : "";
      const roleUserContext = userFirstName ? `The user's first name is ${userFirstName}. Address them by first name only, occasionally.` : "";
      let replyLanguage = "";
      if (roleId !== "english") {
        const detected = detectReplyLanguage(
          userMessage,
          conversationHistory.filter((m) => m.role === "user").map((m) => m.content)
        );
        replyLanguage = replyLanguageInstruction(detected);
        userMessageSuffix = `

${adviceReplyReminder(detected)}`;
      }
      const kundliFacts = roleId === "kundli" && llmContext.kundliContext ? `KUNDLI FACTS (calculated by software \u2014 use exactly these, never change them):
${llmContext.kundliContext}` : "";
      systemPromptContent = [rolePrompt, roleUserContext, englishUiAppendix, kundliFacts, replyLanguage].filter(Boolean).join("\n\n");
    } else {
      const companionPersonality = COMPANION_PERSONALITY_PROMPTS[llmContext.companionId || ""] || COMPANION_PERSONALITY_PROMPTS.default;
      const resolvedCompanionName = llmContext.companionName?.trim() || companionDisplayName(llmContext.companionId);
      const relationshipPrompt = buildRelationshipSystemPrompt2({
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
    const antiRepeatGuard = recentAssistantUtterances && !isRoleBased ? {
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
      { role: "user", content: `${userMessage}${userMessageSuffix}` }
    ];
    const models = [
      process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct"
    ];
    let lastError = null;
    const maxTokens = !isRoleBased ? 150 : llmContext.companionId === "english" ? 600 : 450;
    const isAdviceChat = !!isRoleBased && llmContext.companionId !== "english";
    const sampling = isAdviceChat ? ADVICE_SAMPLING : COMPANION_SAMPLING;
    const finishSuccessfulResponse = (data, model, tokensUsed) => {
      console.log(`[LLM] Successfully used OpenRouter model: ${model}`);
      const responseContent = data.choices[0].message.content ?? "";
      const wordCount = responseContent.split(/\s+/).length;
      const finishReason = data.choices[0].finish_reason;
      console.log(
        `[LLM] Response word count: ${wordCount}, finish_reason: ${finishReason}, tokens used: ${data.usage?.total_tokens || "N/A"}`
      );
      if (finishReason === "length") {
        console.warn(
          `[LLM] WARNING: Response was truncated due to max_tokens limit (${tokensUsed}). Consider increasing max_tokens.`
        );
      }
      let raw = replaceLlmExplicitContentRefusal(responseContent);
      if (isAdviceChat) {
        raw = cleanAdviceReply(raw, finishReason === "length");
      }
      if (isRelationshipChat && isCallOrNumberRequest(userMessage)) {
        raw = "Ok.. \u{1F60A}";
      } else if (isRelationshipChat) {
        raw = sanitizeRelationshipReply(raw);
      }
      return raw;
    };
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
            sampling
          );
          const content = data.choices?.[0]?.message?.content ?? "";
          if (!content.trim()) {
            throw new Error(`Empty reply from ${model}`);
          }
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
          const status = error.status;
          const isRateLimit = status === 429 || error.message.includes("429");
          const isInsufficientCredits = status === 402 || error.message.includes("402");
          if (isInsufficientCredits && creditRetry === 0) {
            const affordable = parseAffordableMaxTokens(error.message);
            if (affordable && affordable >= 16 && affordable < tokensForAttempt) {
              console.warn(
                `[LLM] Insufficient credits for ${tokensForAttempt} tokens on ${model}, retrying with ${affordable}`
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
          console.warn(`[LLM] ${model} failed (${error.message.slice(0, 200)}), trying fallback...`);
          lastError = error;
          break;
        }
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

// shared/kundliMessageKinds.ts
var KUNDLI_CONTEXT_DETAILS = "kundli_details";
var KUNDLI_CONTEXT_AUTOMATED = "kundli_automated";

// shared/chatBilling.ts
var FREE_USER_MESSAGE_ALLOWANCE = 2;
function freeMessageAllowance(_companionId) {
  return FREE_USER_MESSAGE_ALLOWANCE;
}
var AUTO_USER_MESSAGE_CONTEXTS = /* @__PURE__ */ new Set([
  KUNDLI_CONTEXT_DETAILS,
  KUNDLI_CONTEXT_AUTOMATED
]);
function countsTowardFreeMessages(message) {
  return message.role === "user" && !AUTO_USER_MESSAGE_CONTEXTS.has(message.contextInfo ?? "");
}
var CHAT_MESSAGE_COST_RUPEES = 0.2;
function roundWalletRupees(amount) {
  return Math.round(amount * 100) / 100;
}
function serverShouldChargeForMessage(messageIndex, companionId) {
  return messageIndex > freeMessageAllowance(companionId);
}

// server/services/supabaseChat.ts
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
var updateChatMessageContentInSupabase = async (messageId, content, userId, anonymousUserId) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(userId, anonymousUserId);
  let query = supabase.from("chat_messages").update({ content }).eq("id", messageId);
  query = owner.user_id ? query.eq("user_id", owner.user_id) : query.eq("anonymous_user_id", owner.anonymous_user_id);
  const { data, error } = await query.select("id, content").single();
  if (error) throw error;
  return data;
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
var countTypedUserMessages = async (input) => {
  const supabase = getSupabaseAdmin();
  const owner = resolveOwner(input.userId, input.anonymousUserId);
  let query = supabase.from("chat_messages").select("content, context_info, created_at").eq("companion_id", input.companionId).eq("role", "user").order("created_at", { ascending: false }).limit(100);
  query = owner.user_id ? query.eq("user_id", owner.user_id) : query.eq("anonymous_user_id", owner.anonymous_user_id);
  const { data, error } = await query;
  if (error) throw error;
  const typed = (data || []).filter(
    (row) => countsTowardFreeMessages({ role: "user", contextInfo: row.context_info })
  );
  const current = input.currentContent.trim();
  const recentCutoff = Date.now() - 2 * 60 * 1e3;
  const currentAlreadySaved = typed.some(
    (row) => String(row.content ?? "").trim() === current && new Date(row.created_at).getTime() >= recentCutoff
  );
  return typed.length + (currentAlreadySaved ? 0 : 1);
};
var resolveBillableMessageIndex = async (input) => {
  if (serverShouldChargeForMessage(input.clientIndex, input.companionId)) {
    return input.clientIndex;
  }
  try {
    const typedSoFar = await countTypedUserMessages({
      companionId: input.companionId,
      userId: input.owner.userId,
      anonymousUserId: input.owner.anonymousUserId,
      currentContent: input.currentContent
    });
    return Math.max(input.clientIndex, typedSoFar);
  } catch (error) {
    console.error("[billing] Could not count saved messages; using client count:", error);
    return input.clientIndex;
  }
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

// shared/astroProducts.ts
var ASTRO_PRODUCT_TYPE = {
  shaadi: "shaadi_report",
  milan: "milan_report",
  wapas: "wapas_report",
  business: "business_report"
};
var ASTRO_PRODUCT_TYPES = Object.values(ASTRO_PRODUCT_TYPE);
var ASTRO_PRICES = {
  shaadi: { rupees: 49, strike: 199 },
  milan: { rupees: 99, strike: 299 },
  wapas: { rupees: 49, strike: 199 },
  business: { rupees: 49, strike: 199 }
};
function astroTypeFromProduct(v) {
  const hit = Object.keys(ASTRO_PRODUCT_TYPE).find((t) => ASTRO_PRODUCT_TYPE[t] === v);
  return hit ?? null;
}
function isAstroProductType(v) {
  return astroTypeFromProduct(v) !== null;
}
var PRICE_TEST_ARMS = [19, 49, 99];
var PRICE_TEST_REPORTS = ["shaadi", "wapas", "business"];
var PRICE_TEST_SALT = "price-test-1";
var STRIKE_FOR = { 19: 99, 49: 199, 99: 299 };
function priceForNewReport(type, deviceId) {
  if (!PRICE_TEST_REPORTS.includes(type)) return ASTRO_PRICES[type].rupees;
  let h = 2166136261;
  for (const ch of PRICE_TEST_SALT + deviceId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return PRICE_TEST_ARMS[h % PRICE_TEST_ARMS.length];
}
function priceOfReport(type, storedRupees) {
  if (!storedRupees) return ASTRO_PRICES[type];
  return { rupees: storedRupees, strike: STRIKE_FOR[storedRupees] ?? Math.max(storedRupees * 3, ASTRO_PRICES[type].strike) };
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
  if (isAstroProductType(col)) return "other";
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
    name: synced.name,
    /** Set only when this call completed the payment (not on a repeat verify). */
    purchase: {
      device_id: deviceId,
      phone_digits: phoneDigits || null,
      amount_rupees: Number(payment.amount_rupees),
      product_type: productType,
      companion_id: companionId
    }
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
  if (!serverShouldChargeForMessage(input.messageIndex, input.companionId)) {
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
  shaadi_report: "SR",
  milan_report: "MR",
  wapas_report: "WR",
  business_report: "BR",
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

// shared/kundliBirth.ts
function parseKundliBirthDetails(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = raw;
  if (typeof o.name !== "string" || typeof o.gender !== "string" || typeof o.dateOfBirth !== "string" || typeof o.timeOfBirth !== "string" || typeof o.cityOfBirth !== "string") {
    return null;
  }
  const details = {
    name: o.name.trim(),
    gender: o.gender,
    dateOfBirth: o.dateOfBirth,
    timeOfBirth: o.timeOfBirth,
    cityOfBirth: o.cityOfBirth.trim()
  };
  if (typeof o.lat === "number" && typeof o.lon === "number") {
    details.lat = o.lat;
    details.lon = o.lon;
  }
  return details;
}
function parseBirthDate(isoDate) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}
function parseBirthTime(time24) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

// server/services/kundliProfile.ts
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

// node_modules/astronomy-engine/esm/astronomy.js
var astronomy_exports = {};
__export(astronomy_exports, {
  AU_PER_LY: () => AU_PER_LY,
  AngleBetween: () => AngleBetween,
  AngleFromSun: () => AngleFromSun,
  Apsis: () => Apsis,
  ApsisKind: () => ApsisKind,
  AstroTime: () => AstroTime,
  Atmosphere: () => Atmosphere,
  AtmosphereInfo: () => AtmosphereInfo,
  AxisInfo: () => AxisInfo,
  BackdatePosition: () => BackdatePosition,
  BaryState: () => BaryState,
  Body: () => Body,
  CALLISTO_RADIUS_KM: () => CALLISTO_RADIUS_KM,
  C_AUDAY: () => C_AUDAY,
  CalcMoonCount: () => CalcMoonCount,
  CombineRotation: () => CombineRotation,
  Constellation: () => Constellation,
  ConstellationInfo: () => ConstellationInfo,
  CorrectLightTravel: () => CorrectLightTravel,
  DEG2RAD: () => DEG2RAD,
  DefineStar: () => DefineStar,
  DeltaT_EspenakMeeus: () => DeltaT_EspenakMeeus,
  DeltaT_JplHorizons: () => DeltaT_JplHorizons,
  EUROPA_RADIUS_KM: () => EUROPA_RADIUS_KM,
  EclipseEvent: () => EclipseEvent,
  EclipseKind: () => EclipseKind,
  Ecliptic: () => Ecliptic,
  EclipticCoordinates: () => EclipticCoordinates,
  EclipticGeoMoon: () => EclipticGeoMoon,
  EclipticLongitude: () => EclipticLongitude,
  Elongation: () => Elongation,
  ElongationEvent: () => ElongationEvent,
  Equator: () => Equator,
  EquatorFromVector: () => EquatorFromVector,
  EquatorialCoordinates: () => EquatorialCoordinates,
  GANYMEDE_RADIUS_KM: () => GANYMEDE_RADIUS_KM,
  GeoEmbState: () => GeoEmbState,
  GeoMoon: () => GeoMoon,
  GeoMoonState: () => GeoMoonState,
  GeoVector: () => GeoVector,
  GlobalSolarEclipseInfo: () => GlobalSolarEclipseInfo,
  GravitySimulator: () => GravitySimulator,
  HOUR2RAD: () => HOUR2RAD,
  HelioDistance: () => HelioDistance,
  HelioState: () => HelioState,
  HelioVector: () => HelioVector,
  Horizon: () => Horizon,
  HorizonFromVector: () => HorizonFromVector,
  HorizontalCoordinates: () => HorizontalCoordinates,
  HourAngle: () => HourAngle,
  HourAngleEvent: () => HourAngleEvent,
  IO_RADIUS_KM: () => IO_RADIUS_KM,
  IdentityMatrix: () => IdentityMatrix,
  Illumination: () => Illumination,
  IlluminationInfo: () => IlluminationInfo,
  InverseRefraction: () => InverseRefraction,
  InverseRotation: () => InverseRotation,
  JUPITER_EQUATORIAL_RADIUS_KM: () => JUPITER_EQUATORIAL_RADIUS_KM,
  JUPITER_MEAN_RADIUS_KM: () => JUPITER_MEAN_RADIUS_KM,
  JUPITER_POLAR_RADIUS_KM: () => JUPITER_POLAR_RADIUS_KM,
  JupiterMoons: () => JupiterMoons,
  JupiterMoonsInfo: () => JupiterMoonsInfo,
  KM_PER_AU: () => KM_PER_AU,
  LagrangePoint: () => LagrangePoint,
  LagrangePointFast: () => LagrangePointFast,
  Libration: () => Libration,
  LibrationInfo: () => LibrationInfo,
  LocalSolarEclipseInfo: () => LocalSolarEclipseInfo,
  LunarEclipseInfo: () => LunarEclipseInfo,
  MakeRotation: () => MakeRotation,
  MakeTime: () => MakeTime,
  MassProduct: () => MassProduct,
  MoonPhase: () => MoonPhase,
  MoonQuarter: () => MoonQuarter,
  NextGlobalSolarEclipse: () => NextGlobalSolarEclipse,
  NextLocalSolarEclipse: () => NextLocalSolarEclipse,
  NextLunarApsis: () => NextLunarApsis,
  NextLunarEclipse: () => NextLunarEclipse,
  NextMoonNode: () => NextMoonNode,
  NextMoonQuarter: () => NextMoonQuarter,
  NextPlanetApsis: () => NextPlanetApsis,
  NextTransit: () => NextTransit,
  NodeEventInfo: () => NodeEventInfo,
  NodeEventKind: () => NodeEventKind,
  Observer: () => Observer,
  ObserverGravity: () => ObserverGravity,
  ObserverState: () => ObserverState,
  ObserverVector: () => ObserverVector,
  PairLongitude: () => PairLongitude,
  Pivot: () => Pivot,
  PlanetOrbitalPeriod: () => PlanetOrbitalPeriod,
  RAD2DEG: () => RAD2DEG,
  RAD2HOUR: () => RAD2HOUR,
  Refraction: () => Refraction,
  RotateState: () => RotateState,
  RotateVector: () => RotateVector,
  RotationAxis: () => RotationAxis,
  RotationMatrix: () => RotationMatrix,
  Rotation_ECL_EQD: () => Rotation_ECL_EQD,
  Rotation_ECL_EQJ: () => Rotation_ECL_EQJ,
  Rotation_ECL_HOR: () => Rotation_ECL_HOR,
  Rotation_ECT_EQD: () => Rotation_ECT_EQD,
  Rotation_ECT_EQJ: () => Rotation_ECT_EQJ,
  Rotation_EQD_ECL: () => Rotation_EQD_ECL,
  Rotation_EQD_ECT: () => Rotation_EQD_ECT,
  Rotation_EQD_EQJ: () => Rotation_EQD_EQJ,
  Rotation_EQD_HOR: () => Rotation_EQD_HOR,
  Rotation_EQJ_ECL: () => Rotation_EQJ_ECL,
  Rotation_EQJ_ECT: () => Rotation_EQJ_ECT,
  Rotation_EQJ_EQD: () => Rotation_EQJ_EQD,
  Rotation_EQJ_GAL: () => Rotation_EQJ_GAL,
  Rotation_EQJ_HOR: () => Rotation_EQJ_HOR,
  Rotation_GAL_EQJ: () => Rotation_GAL_EQJ,
  Rotation_HOR_ECL: () => Rotation_HOR_ECL,
  Rotation_HOR_EQD: () => Rotation_HOR_EQD,
  Rotation_HOR_EQJ: () => Rotation_HOR_EQJ,
  Search: () => Search,
  SearchAltitude: () => SearchAltitude,
  SearchGlobalSolarEclipse: () => SearchGlobalSolarEclipse,
  SearchHourAngle: () => SearchHourAngle,
  SearchLocalSolarEclipse: () => SearchLocalSolarEclipse,
  SearchLunarApsis: () => SearchLunarApsis,
  SearchLunarEclipse: () => SearchLunarEclipse,
  SearchMaxElongation: () => SearchMaxElongation,
  SearchMoonNode: () => SearchMoonNode,
  SearchMoonPhase: () => SearchMoonPhase,
  SearchMoonQuarter: () => SearchMoonQuarter,
  SearchPeakMagnitude: () => SearchPeakMagnitude,
  SearchPlanetApsis: () => SearchPlanetApsis,
  SearchRelativeLongitude: () => SearchRelativeLongitude,
  SearchRiseSet: () => SearchRiseSet,
  SearchSunLongitude: () => SearchSunLongitude,
  SearchTransit: () => SearchTransit,
  SeasonInfo: () => SeasonInfo,
  Seasons: () => Seasons,
  SetDeltaTFunction: () => SetDeltaTFunction,
  SiderealTime: () => SiderealTime,
  SphereFromVector: () => SphereFromVector,
  Spherical: () => Spherical,
  StateVector: () => StateVector,
  SunPosition: () => SunPosition,
  TransitInfo: () => TransitInfo,
  Vector: () => Vector,
  VectorFromHorizon: () => VectorFromHorizon,
  VectorFromSphere: () => VectorFromSphere,
  VectorObserver: () => VectorObserver,
  e_tilt: () => e_tilt
});
var C_AUDAY = 173.1446326846693;
var KM_PER_AU = 14959787069098932e-8;
var AU_PER_LY = 63241.07708807546;
var DEG2RAD = 0.017453292519943295;
var HOUR2RAD = 0.26179938779914946;
var RAD2DEG = 57.29577951308232;
var RAD2HOUR = 3.819718634205488;
var JUPITER_EQUATORIAL_RADIUS_KM = 71492;
var JUPITER_POLAR_RADIUS_KM = 66854;
var JUPITER_MEAN_RADIUS_KM = 69911;
var IO_RADIUS_KM = 1821.6;
var EUROPA_RADIUS_KM = 1560.8;
var GANYMEDE_RADIUS_KM = 2631.2;
var CALLISTO_RADIUS_KM = 2410.3;
var DAYS_PER_TROPICAL_YEAR = 365.24217;
var J2000 = /* @__PURE__ */ new Date("2000-01-01T12:00:00Z");
var PI2 = 2 * Math.PI;
var ARC = 3600 * (180 / Math.PI);
var ASEC2RAD = 484813681109536e-20;
var ASEC180 = 180 * 60 * 60;
var ASEC360 = 2 * ASEC180;
var ANGVEL = 7292115e-11;
var AU_PER_PARSEC = ASEC180 / Math.PI;
var SUN_MAG_1AU = -0.17 - 5 * Math.log10(AU_PER_PARSEC);
var MEAN_SYNODIC_MONTH = 29.530588;
var SECONDS_PER_DAY = 24 * 3600;
var MILLIS_PER_DAY = SECONDS_PER_DAY * 1e3;
var SOLAR_DAYS_PER_SIDEREAL_DAY = 0.9972695717592592;
var SUN_RADIUS_KM = 695700;
var SUN_RADIUS_AU = SUN_RADIUS_KM / KM_PER_AU;
var EARTH_FLATTENING = 0.996647180302104;
var EARTH_FLATTENING_SQUARED = EARTH_FLATTENING * EARTH_FLATTENING;
var EARTH_EQUATORIAL_RADIUS_KM = 6378.1366;
var EARTH_EQUATORIAL_RADIUS_AU = EARTH_EQUATORIAL_RADIUS_KM / KM_PER_AU;
var EARTH_POLAR_RADIUS_KM = EARTH_EQUATORIAL_RADIUS_KM * EARTH_FLATTENING;
var EARTH_MEAN_RADIUS_KM = 6371;
var EARTH_ATMOSPHERE_KM = 88;
var EARTH_ECLIPSE_RADIUS_KM = EARTH_MEAN_RADIUS_KM + EARTH_ATMOSPHERE_KM;
var MOON_EQUATORIAL_RADIUS_KM = 1738.1;
var MOON_EQUATORIAL_RADIUS_AU = MOON_EQUATORIAL_RADIUS_KM / KM_PER_AU;
var MOON_MEAN_RADIUS_KM = 1737.4;
var MOON_POLAR_RADIUS_KM = 1736;
var MOON_POLAR_RADIUS_AU = MOON_POLAR_RADIUS_KM / KM_PER_AU;
var REFRACTION_NEAR_HORIZON = 34 / 60;
var EARTH_MOON_MASS_RATIO = 81.30056;
var SUN_GM = 2959122082855911e-19;
var MERCURY_GM = 4912547451450812e-26;
var VENUS_GM = 7243452486162703e-25;
var EARTH_GM = 8887692390113509e-25;
var MARS_GM = 9549535105779258e-26;
var JUPITER_GM = 2825345909524226e-22;
var SATURN_GM = 8459715185680659e-23;
var URANUS_GM = 1292024916781969e-23;
var NEPTUNE_GM = 1524358900784276e-23;
var PLUTO_GM = 218869976542597e-26;
var MOON_GM = EARTH_GM / EARTH_MOON_MASS_RATIO;
function MassProduct(body) {
  switch (body) {
    case Body.Sun:
      return SUN_GM;
    case Body.Mercury:
      return MERCURY_GM;
    case Body.Venus:
      return VENUS_GM;
    case Body.Earth:
      return EARTH_GM;
    case Body.Moon:
      return MOON_GM;
    case Body.EMB:
      return EARTH_GM + MOON_GM;
    case Body.Mars:
      return MARS_GM;
    case Body.Jupiter:
      return JUPITER_GM;
    case Body.Saturn:
      return SATURN_GM;
    case Body.Uranus:
      return URANUS_GM;
    case Body.Neptune:
      return NEPTUNE_GM;
    case Body.Pluto:
      return PLUTO_GM;
    default:
      throw `Do not know mass product for body: ${body}`;
  }
}
function VerifyBoolean(b) {
  if (b !== true && b !== false) {
    console.trace();
    throw `Value is not boolean: ${b}`;
  }
  return b;
}
function VerifyNumber(x) {
  if (!Number.isFinite(x)) {
    console.trace();
    throw `Value is not a finite number: ${x}`;
  }
  return x;
}
function Frac(x) {
  return x - Math.floor(x);
}
function AngleBetween(a, b) {
  const aa = a.x * a.x + a.y * a.y + a.z * a.z;
  if (Math.abs(aa) < 1e-8)
    throw `AngleBetween: first vector is too short.`;
  const bb = b.x * b.x + b.y * b.y + b.z * b.z;
  if (Math.abs(bb) < 1e-8)
    throw `AngleBetween: second vector is too short.`;
  const dot = (a.x * b.x + a.y * b.y + a.z * b.z) / Math.sqrt(aa * bb);
  if (dot <= -1)
    return 180;
  if (dot >= 1)
    return 0;
  return RAD2DEG * Math.acos(dot);
}
var Body;
(function(Body2) {
  Body2["Sun"] = "Sun";
  Body2["Moon"] = "Moon";
  Body2["Mercury"] = "Mercury";
  Body2["Venus"] = "Venus";
  Body2["Earth"] = "Earth";
  Body2["Mars"] = "Mars";
  Body2["Jupiter"] = "Jupiter";
  Body2["Saturn"] = "Saturn";
  Body2["Uranus"] = "Uranus";
  Body2["Neptune"] = "Neptune";
  Body2["Pluto"] = "Pluto";
  Body2["SSB"] = "SSB";
  Body2["EMB"] = "EMB";
  Body2["Star1"] = "Star1";
  Body2["Star2"] = "Star2";
  Body2["Star3"] = "Star3";
  Body2["Star4"] = "Star4";
  Body2["Star5"] = "Star5";
  Body2["Star6"] = "Star6";
  Body2["Star7"] = "Star7";
  Body2["Star8"] = "Star8";
})(Body || (Body = {}));
var StarList = [
  Body.Star1,
  Body.Star2,
  Body.Star3,
  Body.Star4,
  Body.Star5,
  Body.Star6,
  Body.Star7,
  Body.Star8
];
var StarTable = [
  { ra: 0, dec: 0, dist: 0 },
  { ra: 0, dec: 0, dist: 0 },
  { ra: 0, dec: 0, dist: 0 },
  { ra: 0, dec: 0, dist: 0 },
  { ra: 0, dec: 0, dist: 0 },
  { ra: 0, dec: 0, dist: 0 },
  { ra: 0, dec: 0, dist: 0 },
  { ra: 0, dec: 0, dist: 0 }
];
function GetStar(body) {
  const index = StarList.indexOf(body);
  return index >= 0 ? StarTable[index] : null;
}
function UserDefinedStar(body) {
  const star = GetStar(body);
  return star && star.dist > 0 ? star : null;
}
function DefineStar(body, ra, dec, distanceLightYears) {
  const star = GetStar(body);
  if (!star)
    throw `Invalid star body: ${body}`;
  VerifyNumber(ra);
  VerifyNumber(dec);
  VerifyNumber(distanceLightYears);
  if (ra < 0 || ra >= 24)
    throw `Invalid right ascension for star: ${ra}`;
  if (dec < -90 || dec > 90)
    throw `Invalid declination for star: ${dec}`;
  if (distanceLightYears < 1)
    throw `Invalid star distance: ${distanceLightYears}`;
  star.ra = ra;
  star.dec = dec;
  star.dist = distanceLightYears * AU_PER_LY;
}
var PrecessDirection;
(function(PrecessDirection2) {
  PrecessDirection2[PrecessDirection2["From2000"] = 0] = "From2000";
  PrecessDirection2[PrecessDirection2["Into2000"] = 1] = "Into2000";
})(PrecessDirection || (PrecessDirection = {}));
var Planet = {
  Mercury: { OrbitalPeriod: 87.969 },
  Venus: { OrbitalPeriod: 224.701 },
  Earth: { OrbitalPeriod: 365.256 },
  Mars: { OrbitalPeriod: 686.98 },
  Jupiter: { OrbitalPeriod: 4332.589 },
  Saturn: { OrbitalPeriod: 10759.22 },
  Uranus: { OrbitalPeriod: 30685.4 },
  Neptune: { OrbitalPeriod: 60189 },
  Pluto: { OrbitalPeriod: 90560 }
};
function PlanetOrbitalPeriod(body) {
  if (body in Planet)
    return Planet[body].OrbitalPeriod;
  throw `Unknown orbital period for: ${body}`;
}
var vsop = {
  Mercury: [
    [
      [
        [4.40250710144, 0, 0],
        [0.40989414977, 1.48302034195, 26087.9031415742],
        [0.050462942, 4.47785489551, 52175.8062831484],
        [0.00855346844, 1.16520322459, 78263.70942472259],
        [0.00165590362, 4.11969163423, 104351.61256629678],
        [34561897e-11, 0.77930768443, 130439.51570787099],
        [7583476e-11, 3.71348404924, 156527.41884944518]
      ],
      [
        [26087.90313685529, 0, 0],
        [0.01131199811, 6.21874197797, 26087.9031415742],
        [0.00292242298, 3.04449355541, 52175.8062831484],
        [75775081e-11, 6.08568821653, 78263.70942472259],
        [19676525e-11, 2.80965111777, 104351.61256629678]
      ]
    ],
    [
      [
        [0.11737528961, 1.98357498767, 26087.9031415742],
        [0.02388076996, 5.03738959686, 52175.8062831484],
        [0.01222839532, 3.14159265359, 0],
        [0.0054325181, 1.79644363964, 78263.70942472259],
        [0.0012977877, 4.83232503958, 104351.61256629678],
        [31866927e-11, 1.58088495658, 130439.51570787099],
        [7963301e-11, 4.60972126127, 156527.41884944518]
      ],
      [
        [0.00274646065, 3.95008450011, 26087.9031415742],
        [99737713e-11, 3.14159265359, 0]
      ]
    ],
    [
      [
        [0.39528271651, 0, 0],
        [0.07834131818, 6.19233722598, 26087.9031415742],
        [0.00795525558, 2.95989690104, 52175.8062831484],
        [0.00121281764, 6.01064153797, 78263.70942472259],
        [21921969e-11, 2.77820093972, 104351.61256629678],
        [4354065e-11, 5.82894543774, 130439.51570787099]
      ],
      [
        [0.0021734774, 4.65617158665, 26087.9031415742],
        [44141826e-11, 1.42385544001, 52175.8062831484]
      ]
    ]
  ],
  Venus: [
    [
      [
        [3.17614666774, 0, 0],
        [0.01353968419, 5.59313319619, 10213.285546211],
        [89891645e-11, 5.30650047764, 20426.571092422],
        [5477194e-11, 4.41630661466, 7860.4193924392],
        [3455741e-11, 2.6996444782, 11790.6290886588],
        [2372061e-11, 2.99377542079, 3930.2096962196],
        [1317168e-11, 5.18668228402, 26.2983197998],
        [1664146e-11, 4.25018630147, 1577.3435424478],
        [1438387e-11, 4.15745084182, 9683.5945811164],
        [1200521e-11, 6.15357116043, 30639.856638633]
      ],
      [
        [10213.28554621638, 0, 0],
        [95617813e-11, 2.4640651111, 10213.285546211],
        [7787201e-11, 0.6247848222, 20426.571092422]
      ]
    ],
    [
      [
        [0.05923638472, 0.26702775812, 10213.285546211],
        [40107978e-11, 1.14737178112, 20426.571092422],
        [32814918e-11, 3.14159265359, 0]
      ],
      [
        [0.00287821243, 1.88964962838, 10213.285546211]
      ]
    ],
    [
      [
        [0.72334820891, 0, 0],
        [0.00489824182, 4.02151831717, 10213.285546211],
        [1658058e-11, 4.90206728031, 20426.571092422],
        [1378043e-11, 1.12846591367, 11790.6290886588],
        [1632096e-11, 2.84548795207, 7860.4193924392],
        [498395e-11, 2.58682193892, 9683.5945811164],
        [221985e-11, 2.01346696541, 19367.1891622328],
        [237454e-11, 2.55136053886, 15720.8387848784]
      ],
      [
        [34551041e-11, 0.89198706276, 10213.285546211]
      ]
    ]
  ],
  Earth: [
    [
      [
        [1.75347045673, 0, 0],
        [0.03341656453, 4.66925680415, 6283.0758499914],
        [34894275e-11, 4.62610242189, 12566.1516999828],
        [3417572e-11, 2.82886579754, 3.523118349],
        [3497056e-11, 2.74411783405, 5753.3848848968],
        [3135899e-11, 3.62767041756, 77713.7714681205],
        [2676218e-11, 4.41808345438, 7860.4193924392],
        [2342691e-11, 6.13516214446, 3930.2096962196],
        [1273165e-11, 2.03709657878, 529.6909650946],
        [1324294e-11, 0.74246341673, 11506.7697697936],
        [901854e-11, 2.04505446477, 26.2983197998],
        [1199167e-11, 1.10962946234, 1577.3435424478],
        [857223e-11, 3.50849152283, 398.1490034082],
        [779786e-11, 1.17882681962, 5223.6939198022],
        [99025e-10, 5.23268072088, 5884.9268465832],
        [753141e-11, 2.53339052847, 5507.5532386674],
        [505267e-11, 4.58292599973, 18849.2275499742],
        [492392e-11, 4.20505711826, 775.522611324],
        [356672e-11, 2.91954114478, 0.0673103028],
        [284125e-11, 1.89869240932, 796.2980068164],
        [242879e-11, 0.34481445893, 5486.777843175],
        [317087e-11, 5.84901948512, 11790.6290886588],
        [271112e-11, 0.31486255375, 10977.078804699],
        [206217e-11, 4.80646631478, 2544.3144198834],
        [205478e-11, 1.86953770281, 5573.1428014331],
        [202318e-11, 2.45767790232, 6069.7767545534],
        [126225e-11, 1.08295459501, 20.7753954924],
        [155516e-11, 0.83306084617, 213.299095438]
      ],
      [
        [6283.0758499914, 0, 0],
        [0.00206058863, 2.67823455808, 6283.0758499914],
        [4303419e-11, 2.63512233481, 12566.1516999828]
      ],
      [
        [8721859e-11, 1.07253635559, 6283.0758499914]
      ]
    ],
    [
      [],
      [
        [0.00227777722, 3.4137662053, 6283.0758499914],
        [3805678e-11, 3.37063423795, 12566.1516999828]
      ]
    ],
    [
      [
        [1.00013988784, 0, 0],
        [0.01670699632, 3.09846350258, 6283.0758499914],
        [13956024e-11, 3.05524609456, 12566.1516999828],
        [308372e-10, 5.19846674381, 77713.7714681205],
        [1628463e-11, 1.17387558054, 5753.3848848968],
        [1575572e-11, 2.84685214877, 7860.4193924392],
        [924799e-11, 5.45292236722, 11506.7697697936],
        [542439e-11, 4.56409151453, 3930.2096962196],
        [47211e-10, 3.66100022149, 5884.9268465832],
        [85831e-11, 1.27079125277, 161000.6857376741],
        [57056e-11, 2.01374292245, 83996.84731811189],
        [55736e-11, 5.2415979917, 71430.69561812909],
        [174844e-11, 3.01193636733, 18849.2275499742],
        [243181e-11, 4.2734953079, 11790.6290886588]
      ],
      [
        [0.00103018607, 1.10748968172, 6283.0758499914],
        [1721238e-11, 1.06442300386, 12566.1516999828]
      ],
      [
        [4359385e-11, 5.78455133808, 6283.0758499914]
      ]
    ]
  ],
  Mars: [
    [
      [
        [6.20347711581, 0, 0],
        [0.18656368093, 5.0503710027, 3340.6124266998],
        [0.01108216816, 5.40099836344, 6681.2248533996],
        [91798406e-11, 5.75478744667, 10021.8372800994],
        [27744987e-11, 5.97049513147, 3.523118349],
        [10610235e-11, 2.93958560338, 2281.2304965106],
        [12315897e-11, 0.84956094002, 2810.9214616052],
        [8926784e-11, 4.15697846427, 0.0172536522],
        [8715691e-11, 6.11005153139, 13362.4497067992],
        [6797556e-11, 0.36462229657, 398.1490034082],
        [7774872e-11, 3.33968761376, 5621.8429232104],
        [3575078e-11, 1.6618650571, 2544.3144198834],
        [4161108e-11, 0.22814971327, 2942.4634232916],
        [3075252e-11, 0.85696614132, 191.4482661116],
        [2628117e-11, 0.64806124465, 3337.0893083508],
        [2937546e-11, 6.07893711402, 0.0673103028],
        [2389414e-11, 5.03896442664, 796.2980068164],
        [2579844e-11, 0.02996736156, 3344.1355450488],
        [1528141e-11, 1.14979301996, 6151.533888305],
        [1798806e-11, 0.65634057445, 529.6909650946],
        [1264357e-11, 3.62275122593, 5092.1519581158],
        [1286228e-11, 3.06796065034, 2146.1654164752],
        [1546404e-11, 2.91579701718, 1751.539531416],
        [1024902e-11, 3.69334099279, 8962.4553499102],
        [891566e-11, 0.18293837498, 16703.062133499],
        [858759e-11, 2.4009381194, 2914.0142358238],
        [832715e-11, 2.46418619474, 3340.5951730476],
        [83272e-10, 4.49495782139, 3340.629680352],
        [712902e-11, 3.66335473479, 1059.3819301892],
        [748723e-11, 3.82248614017, 155.4203994342],
        [723861e-11, 0.67497311481, 3738.761430108],
        [635548e-11, 2.92182225127, 8432.7643848156],
        [655162e-11, 0.48864064125, 3127.3133312618],
        [550474e-11, 3.81001042328, 0.9803210682],
        [55275e-10, 4.47479317037, 1748.016413067],
        [425966e-11, 0.55364317304, 6283.0758499914],
        [415131e-11, 0.49662285038, 213.299095438],
        [472167e-11, 3.62547124025, 1194.4470102246],
        [306551e-11, 0.38052848348, 6684.7479717486],
        [312141e-11, 0.99853944405, 6677.7017350506],
        [293198e-11, 4.22131299634, 20.7753954924],
        [302375e-11, 4.48618007156, 3532.0606928114],
        [274027e-11, 0.54222167059, 3340.545116397],
        [281079e-11, 5.88163521788, 1349.8674096588],
        [231183e-11, 1.28242156993, 3870.3033917944],
        [283602e-11, 5.7688543494, 3149.1641605882],
        [236117e-11, 5.75503217933, 3333.498879699],
        [274033e-11, 0.13372524985, 3340.6797370026],
        [299395e-11, 2.78323740866, 6254.6266625236]
      ],
      [
        [3340.61242700512, 0, 0],
        [0.01457554523, 3.60433733236, 3340.6124266998],
        [0.00168414711, 3.92318567804, 6681.2248533996],
        [20622975e-11, 4.26108844583, 10021.8372800994],
        [3452392e-11, 4.7321039319, 3.523118349],
        [2586332e-11, 4.60670058555, 13362.4497067992],
        [841535e-11, 4.45864030426, 2281.2304965106]
      ],
      [
        [58152577e-11, 2.04961712429, 3340.6124266998],
        [13459579e-11, 2.45738706163, 6681.2248533996]
      ]
    ],
    [
      [
        [0.03197134986, 3.76832042431, 3340.6124266998],
        [0.00298033234, 4.10616996305, 6681.2248533996],
        [0.00289104742, 0, 0],
        [31365539e-11, 4.4465105309, 10021.8372800994],
        [34841e-9, 4.7881254926, 13362.4497067992]
      ],
      [
        [0.00217310991, 6.04472194776, 3340.6124266998],
        [20976948e-11, 3.14159265359, 0],
        [12834709e-11, 1.60810667915, 6681.2248533996]
      ]
    ],
    [
      [
        [1.53033488271, 0, 0],
        [0.1418495316, 3.47971283528, 3340.6124266998],
        [0.00660776362, 3.81783443019, 6681.2248533996],
        [46179117e-11, 4.15595316782, 10021.8372800994],
        [8109733e-11, 5.55958416318, 2810.9214616052],
        [7485318e-11, 1.77239078402, 5621.8429232104],
        [5523191e-11, 1.3643630377, 2281.2304965106],
        [382516e-10, 4.49407183687, 13362.4497067992],
        [2306537e-11, 0.09081579001, 2544.3144198834],
        [1999396e-11, 5.36059617709, 3337.0893083508],
        [2484394e-11, 4.9254563992, 2942.4634232916],
        [1960195e-11, 4.74249437639, 3344.1355450488],
        [1167119e-11, 2.11260868341, 5092.1519581158],
        [1102816e-11, 5.00908403998, 398.1490034082],
        [899066e-11, 4.40791133207, 529.6909650946],
        [992252e-11, 5.83861961952, 6151.533888305],
        [807354e-11, 2.10217065501, 1059.3819301892],
        [797915e-11, 3.44839203899, 796.2980068164],
        [740975e-11, 1.49906336885, 2146.1654164752]
      ],
      [
        [0.01107433345, 2.03250524857, 3340.6124266998],
        [0.00103175887, 2.37071847807, 6681.2248533996],
        [128772e-9, 0, 0],
        [1081588e-10, 2.70888095665, 10021.8372800994]
      ],
      [
        [44242249e-11, 0.47930604954, 3340.6124266998],
        [8138042e-11, 0.86998389204, 6681.2248533996]
      ]
    ]
  ],
  Jupiter: [
    [
      [
        [0.59954691494, 0, 0],
        [0.09695898719, 5.06191793158, 529.6909650946],
        [0.00573610142, 1.44406205629, 7.1135470008],
        [0.00306389205, 5.41734730184, 1059.3819301892],
        [97178296e-11, 4.14264726552, 632.7837393132],
        [72903078e-11, 3.64042916389, 522.5774180938],
        [64263975e-11, 3.41145165351, 103.0927742186],
        [39806064e-11, 2.29376740788, 419.4846438752],
        [38857767e-11, 1.27231755835, 316.3918696566],
        [27964629e-11, 1.7845459182, 536.8045120954],
        [1358973e-10, 5.7748104079, 1589.0728952838],
        [8246349e-11, 3.5822792584, 206.1855484372],
        [8768704e-11, 3.63000308199, 949.1756089698],
        [7368042e-11, 5.0810119427, 735.8765135318],
        [626315e-10, 0.02497628807, 213.299095438],
        [6114062e-11, 4.51319998626, 1162.4747044078],
        [4905396e-11, 1.32084470588, 110.2063212194],
        [5305285e-11, 1.30671216791, 14.2270940016],
        [5305441e-11, 4.18625634012, 1052.2683831884],
        [4647248e-11, 4.69958103684, 3.9321532631],
        [3045023e-11, 4.31676431084, 426.598190876],
        [2609999e-11, 1.56667394063, 846.0828347512],
        [2028191e-11, 1.06376530715, 3.1813937377],
        [1764763e-11, 2.14148655117, 1066.49547719],
        [1722972e-11, 3.88036268267, 1265.5674786264],
        [1920945e-11, 0.97168196472, 639.897286314],
        [1633223e-11, 3.58201833555, 515.463871093],
        [1431999e-11, 4.29685556046, 625.6701923124],
        [973272e-11, 4.09764549134, 95.9792272178]
      ],
      [
        [529.69096508814, 0, 0],
        [0.00489503243, 4.2208293947, 529.6909650946],
        [0.00228917222, 6.02646855621, 7.1135470008],
        [30099479e-11, 4.54540782858, 1059.3819301892],
        [2072092e-10, 5.45943156902, 522.5774180938],
        [12103653e-11, 0.16994816098, 536.8045120954],
        [6067987e-11, 4.42422292017, 103.0927742186],
        [5433968e-11, 3.98480737746, 419.4846438752],
        [4237744e-11, 5.89008707199, 14.2270940016]
      ],
      [
        [47233601e-11, 4.32148536482, 7.1135470008],
        [30649436e-11, 2.929777887, 529.6909650946],
        [14837605e-11, 3.14159265359, 0]
      ]
    ],
    [
      [
        [0.02268615702, 3.55852606721, 529.6909650946],
        [0.00109971634, 3.90809347197, 1059.3819301892],
        [0.00110090358, 0, 0],
        [8101428e-11, 3.60509572885, 522.5774180938],
        [6043996e-11, 4.25883108339, 1589.0728952838],
        [6437782e-11, 0.30627119215, 536.8045120954]
      ],
      [
        [78203446e-11, 1.52377859742, 529.6909650946]
      ]
    ],
    [
      [
        [5.20887429326, 0, 0],
        [0.25209327119, 3.49108639871, 529.6909650946],
        [0.00610599976, 3.84115365948, 1059.3819301892],
        [0.00282029458, 2.57419881293, 632.7837393132],
        [0.00187647346, 2.07590383214, 522.5774180938],
        [86792905e-11, 0.71001145545, 419.4846438752],
        [72062974e-11, 0.21465724607, 536.8045120954],
        [65517248e-11, 5.9799588479, 316.3918696566],
        [29134542e-11, 1.67759379655, 103.0927742186],
        [30135335e-11, 2.16132003734, 949.1756089698],
        [23453271e-11, 3.54023522184, 735.8765135318],
        [22283743e-11, 4.19362594399, 1589.0728952838],
        [23947298e-11, 0.2745803748, 7.1135470008],
        [13032614e-11, 2.96042965363, 1162.4747044078],
        [970336e-10, 1.90669633585, 206.1855484372],
        [12749023e-11, 2.71550286592, 1052.2683831884],
        [7057931e-11, 2.18184839926, 1265.5674786264],
        [6137703e-11, 6.26418240033, 846.0828347512],
        [2616976e-11, 2.00994012876, 1581.959348283]
      ],
      [
        [0.0127180152, 2.64937512894, 529.6909650946],
        [61661816e-11, 3.00076460387, 1059.3819301892],
        [53443713e-11, 3.89717383175, 522.5774180938],
        [31185171e-11, 4.88276958012, 536.8045120954],
        [41390269e-11, 0, 0]
      ]
    ]
  ],
  Saturn: [
    [
      [
        [0.87401354025, 0, 0],
        [0.11107659762, 3.96205090159, 213.299095438],
        [0.01414150957, 4.58581516874, 7.1135470008],
        [0.00398379389, 0.52112032699, 206.1855484372],
        [0.00350769243, 3.30329907896, 426.598190876],
        [0.00206816305, 0.24658372002, 103.0927742186],
        [792713e-9, 3.84007056878, 220.4126424388],
        [23990355e-11, 4.66976924553, 110.2063212194],
        [16573588e-11, 0.43719228296, 419.4846438752],
        [14906995e-11, 5.76903183869, 316.3918696566],
        [1582029e-10, 0.93809155235, 632.7837393132],
        [14609559e-11, 1.56518472, 3.9321532631],
        [13160301e-11, 4.44891291899, 14.2270940016],
        [15053543e-11, 2.71669915667, 639.897286314],
        [13005299e-11, 5.98119023644, 11.0457002639],
        [10725067e-11, 3.12939523827, 202.2533951741],
        [5863206e-11, 0.23656938524, 529.6909650946],
        [5227757e-11, 4.20783365759, 3.1813937377],
        [6126317e-11, 1.76328667907, 277.0349937414],
        [5019687e-11, 3.17787728405, 433.7117378768],
        [459255e-10, 0.61977744975, 199.0720014364],
        [4005867e-11, 2.24479718502, 63.7358983034],
        [2953796e-11, 0.98280366998, 95.9792272178],
        [387367e-10, 3.22283226966, 138.5174968707],
        [2461186e-11, 2.03163875071, 735.8765135318],
        [3269484e-11, 0.77492638211, 949.1756089698],
        [1758145e-11, 3.2658010994, 522.5774180938],
        [1640172e-11, 5.5050445305, 846.0828347512],
        [1391327e-11, 4.02333150505, 323.5054166574],
        [1580648e-11, 4.37265307169, 309.2783226558],
        [1123498e-11, 2.83726798446, 415.5524906121],
        [1017275e-11, 3.71700135395, 227.5261894396],
        [848642e-11, 3.1915017083, 209.3669421749]
      ],
      [
        [213.2990952169, 0, 0],
        [0.01297370862, 1.82834923978, 213.299095438],
        [0.00564345393, 2.88499717272, 7.1135470008],
        [93734369e-11, 1.06311793502, 426.598190876],
        [0.00107674962, 2.27769131009, 206.1855484372],
        [40244455e-11, 2.04108104671, 220.4126424388],
        [19941774e-11, 1.2795439047, 103.0927742186],
        [10511678e-11, 2.7488034213, 14.2270940016],
        [6416106e-11, 0.38238295041, 639.897286314],
        [4848994e-11, 2.43037610229, 419.4846438752],
        [4056892e-11, 2.92133209468, 110.2063212194],
        [3768635e-11, 3.6496533078, 3.9321532631]
      ],
      [
        [0.0011644133, 1.17988132879, 7.1135470008],
        [91841837e-11, 0.0732519584, 213.299095438],
        [36661728e-11, 0, 0],
        [15274496e-11, 4.06493179167, 206.1855484372]
      ]
    ],
    [
      [
        [0.04330678039, 3.60284428399, 213.299095438],
        [0.00240348302, 2.85238489373, 426.598190876],
        [84745939e-11, 0, 0],
        [30863357e-11, 3.48441504555, 220.4126424388],
        [34116062e-11, 0.57297307557, 206.1855484372],
        [1473407e-10, 2.11846596715, 639.897286314],
        [9916667e-11, 5.79003188904, 419.4846438752],
        [6993564e-11, 4.7360468972, 7.1135470008],
        [4807588e-11, 5.43305312061, 316.3918696566]
      ],
      [
        [0.00198927992, 4.93901017903, 213.299095438],
        [36947916e-11, 3.14159265359, 0],
        [17966989e-11, 0.5197943111, 426.598190876]
      ]
    ],
    [
      [
        [9.55758135486, 0, 0],
        [0.52921382865, 2.39226219573, 213.299095438],
        [0.01873679867, 5.2354960466, 206.1855484372],
        [0.01464663929, 1.64763042902, 426.598190876],
        [0.00821891141, 5.93520042303, 316.3918696566],
        [0.00547506923, 5.0153261898, 103.0927742186],
        [0.0037168465, 2.27114821115, 220.4126424388],
        [0.00361778765, 3.13904301847, 7.1135470008],
        [0.00140617506, 5.70406606781, 632.7837393132],
        [0.00108974848, 3.29313390175, 110.2063212194],
        [69006962e-11, 5.94099540992, 419.4846438752],
        [61053367e-11, 0.94037691801, 639.897286314],
        [48913294e-11, 1.55733638681, 202.2533951741],
        [34143772e-11, 0.19519102597, 277.0349937414],
        [32401773e-11, 5.47084567016, 949.1756089698],
        [20936596e-11, 0.46349251129, 735.8765135318],
        [9796004e-11, 5.20477537945, 1265.5674786264],
        [11993338e-11, 5.98050967385, 846.0828347512],
        [208393e-9, 1.52102476129, 433.7117378768],
        [15298404e-11, 3.0594381494, 529.6909650946],
        [6465823e-11, 0.17732249942, 1052.2683831884],
        [11380257e-11, 1.7310542704, 522.5774180938],
        [3419618e-11, 4.94550542171, 1581.959348283]
      ],
      [
        [0.0618298134, 0.2584351148, 213.299095438],
        [0.00506577242, 0.71114625261, 206.1855484372],
        [0.00341394029, 5.79635741658, 426.598190876],
        [0.00188491195, 0.47215589652, 220.4126424388],
        [0.00186261486, 3.14159265359, 0],
        [0.00143891146, 1.40744822888, 7.1135470008]
      ],
      [
        [0.00436902572, 4.78671677509, 213.299095438]
      ]
    ]
  ],
  Uranus: [
    [
      [
        [5.48129294297, 0, 0],
        [0.09260408234, 0.89106421507, 74.7815985673],
        [0.01504247898, 3.6271926092, 1.4844727083],
        [0.00365981674, 1.89962179044, 73.297125859],
        [0.00272328168, 3.35823706307, 149.5631971346],
        [70328461e-11, 5.39254450063, 63.7358983034],
        [68892678e-11, 6.09292483287, 76.2660712756],
        [61998615e-11, 2.26952066061, 2.9689454166],
        [61950719e-11, 2.85098872691, 11.0457002639],
        [2646877e-10, 3.14152083966, 71.8126531507],
        [25710476e-11, 6.11379840493, 454.9093665273],
        [2107885e-10, 4.36059339067, 148.0787244263],
        [17818647e-11, 1.74436930289, 36.6485629295],
        [14613507e-11, 4.73732166022, 3.9321532631],
        [11162509e-11, 5.8268179635, 224.3447957019],
        [1099791e-10, 0.48865004018, 138.5174968707],
        [9527478e-11, 2.95516862826, 35.1640902212],
        [7545601e-11, 5.236265824, 109.9456887885],
        [4220241e-11, 3.23328220918, 70.8494453042],
        [40519e-9, 2.277550173, 151.0476698429],
        [3354596e-11, 1.0654900738, 4.4534181249],
        [2926718e-11, 4.62903718891, 9.5612275556],
        [349034e-10, 5.48306144511, 146.594251718],
        [3144069e-11, 4.75199570434, 77.7505439839],
        [2922333e-11, 5.35235361027, 85.8272988312],
        [2272788e-11, 4.36600400036, 70.3281804424],
        [2051219e-11, 1.51773566586, 0.1118745846],
        [2148602e-11, 0.60745949945, 38.1330356378],
        [1991643e-11, 4.92437588682, 277.0349937414],
        [1376226e-11, 2.04283539351, 65.2203710117],
        [1666902e-11, 3.62744066769, 380.12776796],
        [1284107e-11, 3.11347961505, 202.2533951741],
        [1150429e-11, 0.93343589092, 3.1813937377],
        [1533221e-11, 2.58594681212, 52.6901980395],
        [1281604e-11, 0.54271272721, 222.8603229936],
        [1372139e-11, 4.19641530878, 111.4301614968],
        [1221029e-11, 0.1990065003, 108.4612160802],
        [946181e-11, 1.19253165736, 127.4717966068],
        [1150989e-11, 4.17898916639, 33.6796175129]
      ],
      [
        [74.7815986091, 0, 0],
        [0.00154332863, 5.24158770553, 74.7815985673],
        [24456474e-11, 1.71260334156, 1.4844727083],
        [9258442e-11, 0.4282973235, 11.0457002639],
        [8265977e-11, 1.50218091379, 63.7358983034],
        [915016e-10, 1.41213765216, 149.5631971346]
      ]
    ],
    [
      [
        [0.01346277648, 2.61877810547, 74.7815985673],
        [623414e-9, 5.08111189648, 149.5631971346],
        [61601196e-11, 3.14159265359, 0],
        [9963722e-11, 1.61603805646, 76.2660712756],
        [992616e-10, 0.57630380333, 73.297125859]
      ],
      [
        [34101978e-11, 0.01321929936, 74.7815985673]
      ]
    ],
    [
      [
        [19.21264847206, 0, 0],
        [0.88784984413, 5.60377527014, 74.7815985673],
        [0.03440836062, 0.32836099706, 73.297125859],
        [0.0205565386, 1.7829515933, 149.5631971346],
        [0.0064932241, 4.52247285911, 76.2660712756],
        [0.00602247865, 3.86003823674, 63.7358983034],
        [0.00496404167, 1.40139935333, 454.9093665273],
        [0.00338525369, 1.58002770318, 138.5174968707],
        [0.00243509114, 1.57086606044, 71.8126531507],
        [0.00190522303, 1.99809394714, 1.4844727083],
        [0.00161858838, 2.79137786799, 148.0787244263],
        [0.00143706183, 1.38368544947, 11.0457002639],
        [93192405e-11, 0.17437220467, 36.6485629295],
        [71424548e-11, 4.24509236074, 224.3447957019],
        [89806014e-11, 3.66105364565, 109.9456887885],
        [39009723e-11, 1.66971401684, 70.8494453042],
        [46677296e-11, 1.39976401694, 35.1640902212],
        [39025624e-11, 3.36234773834, 277.0349937414],
        [36755274e-11, 3.88649278513, 146.594251718],
        [30348723e-11, 0.70100838798, 151.0476698429],
        [29156413e-11, 3.180563367, 77.7505439839],
        [22637073e-11, 0.72518687029, 529.6909650946],
        [11959076e-11, 1.7504339214, 984.6003316219],
        [25620756e-11, 5.25656086672, 380.12776796]
      ],
      [
        [0.01479896629, 3.67205697578, 74.7815985673]
      ]
    ]
  ],
  Neptune: [
    [
      [
        [5.31188633046, 0, 0],
        [0.0179847553, 2.9010127389, 38.1330356378],
        [0.01019727652, 0.48580922867, 1.4844727083],
        [0.00124531845, 4.83008090676, 36.6485629295],
        [42064466e-11, 5.41054993053, 2.9689454166],
        [37714584e-11, 6.09221808686, 35.1640902212],
        [33784738e-11, 1.24488874087, 76.2660712756],
        [16482741e-11, 7727998e-11, 491.5579294568],
        [9198584e-11, 4.93747051954, 39.6175083461],
        [899425e-10, 0.27462171806, 175.1660598002]
      ],
      [
        [38.13303563957, 0, 0],
        [16604172e-11, 4.86323329249, 1.4844727083],
        [15744045e-11, 2.27887427527, 38.1330356378]
      ]
    ],
    [
      [
        [0.03088622933, 1.44104372644, 38.1330356378],
        [27780087e-11, 5.91271884599, 76.2660712756],
        [27623609e-11, 0, 0],
        [15355489e-11, 2.52123799551, 36.6485629295],
        [15448133e-11, 3.50877079215, 39.6175083461]
      ]
    ],
    [
      [
        [30.07013205828, 0, 0],
        [0.27062259632, 1.32999459377, 38.1330356378],
        [0.01691764014, 3.25186135653, 36.6485629295],
        [0.00807830553, 5.18592878704, 1.4844727083],
        [0.0053776051, 4.52113935896, 35.1640902212],
        [0.00495725141, 1.5710564165, 491.5579294568],
        [0.00274571975, 1.84552258866, 175.1660598002],
        [1201232e-10, 1.92059384991, 1021.2488945514],
        [0.00121801746, 5.79754470298, 76.2660712756],
        [0.00100896068, 0.3770272493, 73.297125859],
        [0.00135134092, 3.37220609835, 39.6175083461],
        [7571796e-11, 1.07149207335, 388.4651552382]
      ]
    ]
  ]
};
function DeltaT_EspenakMeeus(ut) {
  var u, u2, u3, u4, u5, u6, u7;
  const y = 2e3 + (ut - 14) / DAYS_PER_TROPICAL_YEAR;
  if (y < -500) {
    u = (y - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (y < 500) {
    u = y / 100;
    u2 = u * u;
    u3 = u * u2;
    u4 = u2 * u2;
    u5 = u2 * u3;
    u6 = u3 * u3;
    return 10583.6 - 1014.41 * u + 33.78311 * u2 - 5.952053 * u3 - 0.1798452 * u4 + 0.022174192 * u5 + 0.0090316521 * u6;
  }
  if (y < 1600) {
    u = (y - 1e3) / 100;
    u2 = u * u;
    u3 = u * u2;
    u4 = u2 * u2;
    u5 = u2 * u3;
    u6 = u3 * u3;
    return 1574.2 - 556.01 * u + 71.23472 * u2 + 0.319781 * u3 - 0.8503463 * u4 - 5050998e-9 * u5 + 0.0083572073 * u6;
  }
  if (y < 1700) {
    u = y - 1600;
    u2 = u * u;
    u3 = u * u2;
    return 120 - 0.9808 * u - 0.01532 * u2 + u3 / 7129;
  }
  if (y < 1800) {
    u = y - 1700;
    u2 = u * u;
    u3 = u * u2;
    u4 = u2 * u2;
    return 8.83 + 0.1603 * u - 59285e-7 * u2 + 13336e-8 * u3 - u4 / 1174e3;
  }
  if (y < 1860) {
    u = y - 1800;
    u2 = u * u;
    u3 = u * u2;
    u4 = u2 * u2;
    u5 = u2 * u3;
    u6 = u3 * u3;
    u7 = u3 * u4;
    return 13.72 - 0.332447 * u + 68612e-7 * u2 + 41116e-7 * u3 - 37436e-8 * u4 + 121272e-10 * u5 - 1699e-10 * u6 + 875e-12 * u7;
  }
  if (y < 1900) {
    u = y - 1860;
    u2 = u * u;
    u3 = u * u2;
    u4 = u2 * u2;
    u5 = u2 * u3;
    return 7.62 + 0.5737 * u - 0.251754 * u2 + 0.01680668 * u3 - 4473624e-10 * u4 + u5 / 233174;
  }
  if (y < 1920) {
    u = y - 1900;
    u2 = u * u;
    u3 = u * u2;
    u4 = u2 * u2;
    return -2.79 + 1.494119 * u - 0.0598939 * u2 + 61966e-7 * u3 - 197e-6 * u4;
  }
  if (y < 1941) {
    u = y - 1920;
    u2 = u * u;
    u3 = u * u2;
    return 21.2 + 0.84493 * u - 0.0761 * u2 + 20936e-7 * u3;
  }
  if (y < 1961) {
    u = y - 1950;
    u2 = u * u;
    u3 = u * u2;
    return 29.07 + 0.407 * u - u2 / 233 + u3 / 2547;
  }
  if (y < 1986) {
    u = y - 1975;
    u2 = u * u;
    u3 = u * u2;
    return 45.45 + 1.067 * u - u2 / 260 - u3 / 718;
  }
  if (y < 2005) {
    u = y - 2e3;
    u2 = u * u;
    u3 = u * u2;
    u4 = u2 * u2;
    u5 = u2 * u3;
    return 63.86 + 0.3345 * u - 0.060374 * u2 + 17275e-7 * u3 + 651814e-9 * u4 + 2373599e-11 * u5;
  }
  if (y < 2050) {
    u = y - 2e3;
    return 62.92 + 0.32217 * u + 5589e-6 * u * u;
  }
  if (y < 2150) {
    u = (y - 1820) / 100;
    return -20 + 32 * u * u - 0.5628 * (2150 - y);
  }
  u = (y - 1820) / 100;
  return -20 + 32 * u * u;
}
function DeltaT_JplHorizons(ut) {
  return DeltaT_EspenakMeeus(Math.min(ut, 17 * DAYS_PER_TROPICAL_YEAR));
}
var DeltaT = DeltaT_EspenakMeeus;
function SetDeltaTFunction(func) {
  DeltaT = func;
}
function TerrestrialTime(ut) {
  return ut + DeltaT(ut) / 86400;
}
var AstroTime = class _AstroTime {
  /**
   * @param {FlexibleDateTime} date
   *      A JavaScript Date object, a numeric UTC value expressed in J2000 days, or another AstroTime object.
   */
  constructor(date) {
    if (date instanceof _AstroTime) {
      this.date = date.date;
      this.ut = date.ut;
      this.tt = date.tt;
      return;
    }
    const MillisPerDay = 1e3 * 3600 * 24;
    if (date instanceof Date && Number.isFinite(date.getTime())) {
      this.date = date;
      this.ut = (date.getTime() - J2000.getTime()) / MillisPerDay;
      this.tt = TerrestrialTime(this.ut);
      return;
    }
    if (Number.isFinite(date)) {
      this.date = new Date(J2000.getTime() + date * MillisPerDay);
      this.ut = date;
      this.tt = TerrestrialTime(this.ut);
      return;
    }
    throw "Argument must be a Date object, an AstroTime object, or a numeric UTC Julian date.";
  }
  /**
   * @brief Creates an `AstroTime` value from a Terrestrial Time (TT) day value.
   *
   * This function can be used in rare cases where a time must be based
   * on Terrestrial Time (TT) rather than Universal Time (UT).
   * Most developers will want to invoke `new AstroTime(ut)` with a universal time
   * instead of this function, because usually time is based on civil time adjusted
   * by leap seconds to match the Earth's rotation, rather than the uniformly
   * flowing TT used to calculate solar system dynamics. In rare cases
   * where the caller already knows TT, this function is provided to create
   * an `AstroTime` value that can be passed to Astronomy Engine functions.
   *
   * @param {number} tt
   *      The number of days since the J2000 epoch as expressed in Terrestrial Time.
   *
   * @returns {AstroTime}
   *      An `AstroTime` object for the specified terrestrial time.
   */
  static FromTerrestrialTime(tt) {
    let time = new _AstroTime(tt);
    for (; ; ) {
      const err = tt - time.tt;
      if (Math.abs(err) < 1e-12)
        return time;
      time = time.AddDays(err);
    }
  }
  /**
   * Formats an `AstroTime` object as an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)
   * date/time string in UTC, to millisecond resolution.
   * Example: `2018-08-17T17:22:04.050Z`
   * @returns {string}
   */
  toString() {
    return this.date.toISOString();
  }
  /**
   * Returns a new `AstroTime` object adjusted by the floating point number of days.
   * Does NOT modify the original `AstroTime` object.
   *
   * @param {number} days
   *      The floating point number of days by which to adjust the given date and time.
   *      Positive values adjust the date toward the future, and
   *      negative values adjust the date toward the past.
   *
   * @returns {AstroTime}
   */
  AddDays(days) {
    return new _AstroTime(this.ut + days);
  }
};
function InterpolateTime(time1, time2, fraction) {
  return new AstroTime(time1.ut + fraction * (time2.ut - time1.ut));
}
function MakeTime(date) {
  if (date instanceof AstroTime) {
    return date;
  }
  return new AstroTime(date);
}
function iau2000b(time) {
  function mod(x) {
    return x % ASEC360 * ASEC2RAD;
  }
  const t = time.tt / 36525;
  const elp = mod(128710479305e-5 + t * 1295965810481e-4);
  const f = mod(335779.526232 + t * 17395272628478e-4);
  const d = mod(107226070369e-5 + t * 1602961601209e-3);
  const om = mod(450160.398036 - t * 69628905431e-4);
  let sarg = Math.sin(om);
  let carg = Math.cos(om);
  let dp = (-172064161 - 174666 * t) * sarg + 33386 * carg;
  let de = (92052331 + 9086 * t) * carg + 15377 * sarg;
  let arg = 2 * (f - d + om);
  sarg = Math.sin(arg);
  carg = Math.cos(arg);
  dp += (-13170906 - 1675 * t) * sarg - 13696 * carg;
  de += (5730336 - 3015 * t) * carg - 4587 * sarg;
  arg = 2 * (f + om);
  sarg = Math.sin(arg);
  carg = Math.cos(arg);
  dp += (-2276413 - 234 * t) * sarg + 2796 * carg;
  de += (978459 - 485 * t) * carg + 1374 * sarg;
  arg = 2 * om;
  sarg = Math.sin(arg);
  carg = Math.cos(arg);
  dp += (2074554 + 207 * t) * sarg - 698 * carg;
  de += (-897492 + 470 * t) * carg - 291 * sarg;
  sarg = Math.sin(elp);
  carg = Math.cos(elp);
  dp += (1475877 - 3633 * t) * sarg + 11817 * carg;
  de += (73871 - 184 * t) * carg - 1924 * sarg;
  return {
    dpsi: -135e-6 + dp * 1e-7,
    deps: 388e-6 + de * 1e-7
  };
}
function mean_obliq(time) {
  var t = time.tt / 36525;
  var asec = ((((-434e-10 * t - 576e-9) * t + 20034e-7) * t - 1831e-7) * t - 46.836769) * t + 84381.406;
  return asec / 3600;
}
var cache_e_tilt;
function e_tilt(time) {
  if (!cache_e_tilt || Math.abs(cache_e_tilt.tt - time.tt) > 1e-6) {
    const nut = iau2000b(time);
    const mean_ob = mean_obliq(time);
    const true_ob = mean_ob + nut.deps / 3600;
    cache_e_tilt = {
      tt: time.tt,
      dpsi: nut.dpsi,
      deps: nut.deps,
      ee: nut.dpsi * Math.cos(mean_ob * DEG2RAD) / 15,
      mobl: mean_ob,
      tobl: true_ob
    };
  }
  return cache_e_tilt;
}
function obl_ecl2equ_vec(oblDegrees, pos) {
  const obl = oblDegrees * DEG2RAD;
  const cos_obl = Math.cos(obl);
  const sin_obl = Math.sin(obl);
  return [
    pos[0],
    pos[1] * cos_obl - pos[2] * sin_obl,
    pos[1] * sin_obl + pos[2] * cos_obl
  ];
}
function ecl2equ_vec(time, pos) {
  return obl_ecl2equ_vec(mean_obliq(time), pos);
}
var CalcMoonCount = 0;
function CalcMoon(time) {
  ++CalcMoonCount;
  const T = time.tt / 36525;
  function DeclareArray1(xmin, xmax) {
    const array = [];
    let i;
    for (i = 0; i <= xmax - xmin; ++i) {
      array.push(0);
    }
    return { min: xmin, array };
  }
  function DeclareArray2(xmin, xmax, ymin, ymax) {
    const array = [];
    for (let i = 0; i <= xmax - xmin; ++i) {
      array.push(DeclareArray1(ymin, ymax));
    }
    return { min: xmin, array };
  }
  function ArrayGet2(a, x, y) {
    const m = a.array[x - a.min];
    return m.array[y - m.min];
  }
  function ArraySet2(a, x, y, v) {
    const m = a.array[x - a.min];
    m.array[y - m.min] = v;
  }
  let S, MAX, ARG, FAC, I, J, T2, DGAM, DLAM, N, GAM1C, SINPI, L0, L, LS, F, D, DL0, DL, DLS, DF, DD, DS;
  let coArray = DeclareArray2(-6, 6, 1, 4);
  let siArray = DeclareArray2(-6, 6, 1, 4);
  function CO(x, y) {
    return ArrayGet2(coArray, x, y);
  }
  function SI(x, y) {
    return ArrayGet2(siArray, x, y);
  }
  function SetCO(x, y, v) {
    return ArraySet2(coArray, x, y, v);
  }
  function SetSI(x, y, v) {
    return ArraySet2(siArray, x, y, v);
  }
  function AddThe(c1, s1, c2, s2, func) {
    func(c1 * c2 - s1 * s2, s1 * c2 + c1 * s2);
  }
  function Sine(phi) {
    return Math.sin(PI2 * phi);
  }
  T2 = T * T;
  DLAM = 0;
  DS = 0;
  GAM1C = 0;
  SINPI = 3422.7;
  var S1 = Sine(0.19833 + 0.05611 * T);
  var S2 = Sine(0.27869 + 0.04508 * T);
  var S3 = Sine(0.16827 - 0.36903 * T);
  var S4 = Sine(0.34734 - 5.37261 * T);
  var S5 = Sine(0.10498 - 5.37899 * T);
  var S6 = Sine(0.42681 - 0.41855 * T);
  var S7 = Sine(0.14943 - 5.37511 * T);
  DL0 = 0.84 * S1 + 0.31 * S2 + 14.27 * S3 + 7.26 * S4 + 0.28 * S5 + 0.24 * S6;
  DL = 2.94 * S1 + 0.31 * S2 + 14.27 * S3 + 9.34 * S4 + 1.12 * S5 + 0.83 * S6;
  DLS = -6.4 * S1 - 1.89 * S6;
  DF = 0.21 * S1 + 0.31 * S2 + 14.27 * S3 - 88.7 * S4 - 15.3 * S5 + 0.24 * S6 - 1.86 * S7;
  DD = DL0 - DLS;
  DGAM = -3332e-9 * Sine(0.59734 - 5.37261 * T) - 539e-9 * Sine(0.35498 - 5.37899 * T) - 64e-9 * Sine(0.39943 - 5.37511 * T);
  L0 = PI2 * Frac(0.60643382 + 1336.85522467 * T - 313e-8 * T2) + DL0 / ARC;
  L = PI2 * Frac(0.37489701 + 1325.55240982 * T + 2565e-8 * T2) + DL / ARC;
  LS = PI2 * Frac(0.99312619 + 99.99735956 * T - 44e-8 * T2) + DLS / ARC;
  F = PI2 * Frac(0.25909118 + 1342.2278298 * T - 892e-8 * T2) + DF / ARC;
  D = PI2 * Frac(0.82736186 + 1236.85308708 * T - 397e-8 * T2) + DD / ARC;
  for (I = 1; I <= 4; ++I) {
    switch (I) {
      case 1:
        ARG = L;
        MAX = 4;
        FAC = 1.000002208;
        break;
      case 2:
        ARG = LS;
        MAX = 3;
        FAC = 0.997504612 - 2495388e-9 * T;
        break;
      case 3:
        ARG = F;
        MAX = 4;
        FAC = 1.000002708 + 139.978 * DGAM;
        break;
      case 4:
        ARG = D;
        MAX = 6;
        FAC = 1;
        break;
      default:
        throw `Internal error: I = ${I}`;
    }
    SetCO(0, I, 1);
    SetCO(1, I, Math.cos(ARG) * FAC);
    SetSI(0, I, 0);
    SetSI(1, I, Math.sin(ARG) * FAC);
    for (J = 2; J <= MAX; ++J) {
      AddThe(CO(J - 1, I), SI(J - 1, I), CO(1, I), SI(1, I), (c, s) => (SetCO(J, I, c), SetSI(J, I, s)));
    }
    for (J = 1; J <= MAX; ++J) {
      SetCO(-J, I, CO(J, I));
      SetSI(-J, I, -SI(J, I));
    }
  }
  function Term(p, q, r, s) {
    var result = { x: 1, y: 0 };
    var I2 = [0, p, q, r, s];
    for (var k = 1; k <= 4; ++k)
      if (I2[k] !== 0)
        AddThe(result.x, result.y, CO(I2[k], k), SI(I2[k], k), (c, s2) => (result.x = c, result.y = s2));
    return result;
  }
  function AddSol(coeffl, coeffs, coeffg, coeffp, p, q, r, s) {
    var result = Term(p, q, r, s);
    DLAM += coeffl * result.y;
    DS += coeffs * result.y;
    GAM1C += coeffg * result.x;
    SINPI += coeffp * result.x;
  }
  AddSol(13.902, 14.06, -1e-3, 0.2607, 0, 0, 0, 4);
  AddSol(0.403, -4.01, 0.394, 23e-4, 0, 0, 0, 3);
  AddSol(2369.912, 2373.36, 0.601, 28.2333, 0, 0, 0, 2);
  AddSol(-125.154, -112.79, -0.725, -0.9781, 0, 0, 0, 1);
  AddSol(1.979, 6.98, -0.445, 0.0433, 1, 0, 0, 4);
  AddSol(191.953, 192.72, 0.029, 3.0861, 1, 0, 0, 2);
  AddSol(-8.466, -13.51, 0.455, -0.1093, 1, 0, 0, 1);
  AddSol(22639.5, 22609.07, 0.079, 186.5398, 1, 0, 0, 0);
  AddSol(18.609, 3.59, -0.094, 0.0118, 1, 0, 0, -1);
  AddSol(-4586.465, -4578.13, -0.077, 34.3117, 1, 0, 0, -2);
  AddSol(3.215, 5.44, 0.192, -0.0386, 1, 0, 0, -3);
  AddSol(-38.428, -38.64, 1e-3, 0.6008, 1, 0, 0, -4);
  AddSol(-0.393, -1.43, -0.092, 86e-4, 1, 0, 0, -6);
  AddSol(-0.289, -1.59, 0.123, -53e-4, 0, 1, 0, 4);
  AddSol(-24.42, -25.1, 0.04, -0.3, 0, 1, 0, 2);
  AddSol(18.023, 17.93, 7e-3, 0.1494, 0, 1, 0, 1);
  AddSol(-668.146, -126.98, -1.302, -0.3997, 0, 1, 0, 0);
  AddSol(0.56, 0.32, -1e-3, -37e-4, 0, 1, 0, -1);
  AddSol(-165.145, -165.06, 0.054, 1.9178, 0, 1, 0, -2);
  AddSol(-1.877, -6.46, -0.416, 0.0339, 0, 1, 0, -4);
  AddSol(0.213, 1.02, -0.074, 54e-4, 2, 0, 0, 4);
  AddSol(14.387, 14.78, -0.017, 0.2833, 2, 0, 0, 2);
  AddSol(-0.586, -1.2, 0.054, -0.01, 2, 0, 0, 1);
  AddSol(769.016, 767.96, 0.107, 10.1657, 2, 0, 0, 0);
  AddSol(1.75, 2.01, -0.018, 0.0155, 2, 0, 0, -1);
  AddSol(-211.656, -152.53, 5.679, -0.3039, 2, 0, 0, -2);
  AddSol(1.225, 0.91, -0.03, -88e-4, 2, 0, 0, -3);
  AddSol(-30.773, -34.07, -0.308, 0.3722, 2, 0, 0, -4);
  AddSol(-0.57, -1.4, -0.074, 0.0109, 2, 0, 0, -6);
  AddSol(-2.921, -11.75, 0.787, -0.0484, 1, 1, 0, 2);
  AddSol(1.267, 1.52, -0.022, 0.0164, 1, 1, 0, 1);
  AddSol(-109.673, -115.18, 0.461, -0.949, 1, 1, 0, 0);
  AddSol(-205.962, -182.36, 2.056, 1.4437, 1, 1, 0, -2);
  AddSol(0.233, 0.36, 0.012, -25e-4, 1, 1, 0, -3);
  AddSol(-4.391, -9.66, -0.471, 0.0673, 1, 1, 0, -4);
  AddSol(0.283, 1.53, -0.111, 6e-3, 1, -1, 0, 4);
  AddSol(14.577, 31.7, -1.54, 0.2302, 1, -1, 0, 2);
  AddSol(147.687, 138.76, 0.679, 1.1528, 1, -1, 0, 0);
  AddSol(-1.089, 0.55, 0.021, 0, 1, -1, 0, -1);
  AddSol(28.475, 23.59, -0.443, -0.2257, 1, -1, 0, -2);
  AddSol(-0.276, -0.38, -6e-3, -36e-4, 1, -1, 0, -3);
  AddSol(0.636, 2.27, 0.146, -0.0102, 1, -1, 0, -4);
  AddSol(-0.189, -1.68, 0.131, -28e-4, 0, 2, 0, 2);
  AddSol(-7.486, -0.66, -0.037, -86e-4, 0, 2, 0, 0);
  AddSol(-8.096, -16.35, -0.74, 0.0918, 0, 2, 0, -2);
  AddSol(-5.741, -0.04, 0, -9e-4, 0, 0, 2, 2);
  AddSol(0.255, 0, 0, 0, 0, 0, 2, 1);
  AddSol(-411.608, -0.2, 0, -0.0124, 0, 0, 2, 0);
  AddSol(0.584, 0.84, 0, 71e-4, 0, 0, 2, -1);
  AddSol(-55.173, -52.14, 0, -0.1052, 0, 0, 2, -2);
  AddSol(0.254, 0.25, 0, -17e-4, 0, 0, 2, -3);
  AddSol(0.025, -1.67, 0, 31e-4, 0, 0, 2, -4);
  AddSol(1.06, 2.96, -0.166, 0.0243, 3, 0, 0, 2);
  AddSol(36.124, 50.64, -1.3, 0.6215, 3, 0, 0, 0);
  AddSol(-13.193, -16.4, 0.258, -0.1187, 3, 0, 0, -2);
  AddSol(-1.187, -0.74, 0.042, 74e-4, 3, 0, 0, -4);
  AddSol(-0.293, -0.31, -2e-3, 46e-4, 3, 0, 0, -6);
  AddSol(-0.29, -1.45, 0.116, -51e-4, 2, 1, 0, 2);
  AddSol(-7.649, -10.56, 0.259, -0.1038, 2, 1, 0, 0);
  AddSol(-8.627, -7.59, 0.078, -0.0192, 2, 1, 0, -2);
  AddSol(-2.74, -2.54, 0.022, 0.0324, 2, 1, 0, -4);
  AddSol(1.181, 3.32, -0.212, 0.0213, 2, -1, 0, 2);
  AddSol(9.703, 11.67, -0.151, 0.1268, 2, -1, 0, 0);
  AddSol(-0.352, -0.37, 1e-3, -28e-4, 2, -1, 0, -1);
  AddSol(-2.494, -1.17, -3e-3, -17e-4, 2, -1, 0, -2);
  AddSol(0.36, 0.2, -0.012, -43e-4, 2, -1, 0, -4);
  AddSol(-1.167, -1.25, 8e-3, -0.0106, 1, 2, 0, 0);
  AddSol(-7.412, -6.12, 0.117, 0.0484, 1, 2, 0, -2);
  AddSol(-0.311, -0.65, -0.032, 44e-4, 1, 2, 0, -4);
  AddSol(0.757, 1.82, -0.105, 0.0112, 1, -2, 0, 2);
  AddSol(2.58, 2.32, 0.027, 0.0196, 1, -2, 0, 0);
  AddSol(2.533, 2.4, -0.014, -0.0212, 1, -2, 0, -2);
  AddSol(-0.344, -0.57, -0.025, 36e-4, 0, 3, 0, -2);
  AddSol(-0.992, -0.02, 0, 0, 1, 0, 2, 2);
  AddSol(-45.099, -0.02, 0, -1e-3, 1, 0, 2, 0);
  AddSol(-0.179, -9.52, 0, -0.0833, 1, 0, 2, -2);
  AddSol(-0.301, -0.33, 0, 14e-4, 1, 0, 2, -4);
  AddSol(-6.382, -3.37, 0, -0.0481, 1, 0, -2, 2);
  AddSol(39.528, 85.13, 0, -0.7136, 1, 0, -2, 0);
  AddSol(9.366, 0.71, 0, -0.0112, 1, 0, -2, -2);
  AddSol(0.202, 0.02, 0, 0, 1, 0, -2, -4);
  AddSol(0.415, 0.1, 0, 13e-4, 0, 1, 2, 0);
  AddSol(-2.152, -2.26, 0, -66e-4, 0, 1, 2, -2);
  AddSol(-1.44, -1.3, 0, 14e-4, 0, 1, -2, 2);
  AddSol(0.384, -0.04, 0, 0, 0, 1, -2, -2);
  AddSol(1.938, 3.6, -0.145, 0.0401, 4, 0, 0, 0);
  AddSol(-0.952, -1.58, 0.052, -0.013, 4, 0, 0, -2);
  AddSol(-0.551, -0.94, 0.032, -97e-4, 3, 1, 0, 0);
  AddSol(-0.482, -0.57, 5e-3, -45e-4, 3, 1, 0, -2);
  AddSol(0.681, 0.96, -0.026, 0.0115, 3, -1, 0, 0);
  AddSol(-0.297, -0.27, 2e-3, -9e-4, 2, 2, 0, -2);
  AddSol(0.254, 0.21, -3e-3, 0, 2, -2, 0, -2);
  AddSol(-0.25, -0.22, 4e-3, 14e-4, 1, 3, 0, -2);
  AddSol(-3.996, 0, 0, 4e-4, 2, 0, 2, 0);
  AddSol(0.557, -0.75, 0, -9e-3, 2, 0, 2, -2);
  AddSol(-0.459, -0.38, 0, -53e-4, 2, 0, -2, 2);
  AddSol(-1.298, 0.74, 0, 4e-4, 2, 0, -2, 0);
  AddSol(0.538, 1.14, 0, -0.0141, 2, 0, -2, -2);
  AddSol(0.263, 0.02, 0, 0, 1, 1, 2, 0);
  AddSol(0.426, 0.07, 0, -6e-4, 1, 1, -2, -2);
  AddSol(-0.304, 0.03, 0, 3e-4, 1, -1, 2, 0);
  AddSol(-0.372, -0.19, 0, -27e-4, 1, -1, -2, 2);
  AddSol(0.418, 0, 0, 0, 0, 0, 4, 0);
  AddSol(-0.33, -0.04, 0, 0, 3, 0, 2, 0);
  function ADDN(coeffn, p, q, r, s) {
    return coeffn * Term(p, q, r, s).y;
  }
  N = 0;
  N += ADDN(-526.069, 0, 0, 1, -2);
  N += ADDN(-3.352, 0, 0, 1, -4);
  N += ADDN(44.297, 1, 0, 1, -2);
  N += ADDN(-6, 1, 0, 1, -4);
  N += ADDN(20.599, -1, 0, 1, 0);
  N += ADDN(-30.598, -1, 0, 1, -2);
  N += ADDN(-24.649, -2, 0, 1, 0);
  N += ADDN(-2, -2, 0, 1, -2);
  N += ADDN(-22.571, 0, 1, 1, -2);
  N += ADDN(10.985, 0, -1, 1, -2);
  DLAM += 0.82 * Sine(0.7736 - 62.5512 * T) + 0.31 * Sine(0.0466 - 125.1025 * T) + 0.35 * Sine(0.5785 - 25.1042 * T) + 0.66 * Sine(0.4591 + 1335.8075 * T) + 0.64 * Sine(0.313 - 91.568 * T) + 1.14 * Sine(0.148 + 1331.2898 * T) + 0.21 * Sine(0.5918 + 1056.5859 * T) + 0.44 * Sine(0.5784 + 1322.8595 * T) + 0.24 * Sine(0.2275 - 5.7374 * T) + 0.28 * Sine(0.2965 + 2.6929 * T) + 0.33 * Sine(0.3132 + 6.3368 * T);
  S = F + DS / ARC;
  let lat_seconds = (1.000002708 + 139.978 * DGAM) * (18518.511 + 1.189 + GAM1C) * Math.sin(S) - 6.24 * Math.sin(3 * S) + N;
  return {
    geo_eclip_lon: PI2 * Frac((L0 + DLAM / ARC) / PI2),
    geo_eclip_lat: Math.PI / (180 * 3600) * lat_seconds,
    distance_au: ARC * EARTH_EQUATORIAL_RADIUS_AU / (0.999953253 * SINPI)
  };
}
var LibrationInfo = class {
  constructor(elat, elon, mlat, mlon, dist_km, diam_deg) {
    this.elat = elat;
    this.elon = elon;
    this.mlat = mlat;
    this.mlon = mlon;
    this.dist_km = dist_km;
    this.diam_deg = diam_deg;
  }
};
function Libration(date) {
  const time = MakeTime(date);
  const t = time.tt / 36525;
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t2 * t2;
  const moon = CalcMoon(time);
  const mlon = moon.geo_eclip_lon;
  const mlat = moon.geo_eclip_lat;
  const dist_km = moon.distance_au * KM_PER_AU;
  const I = DEG2RAD * 1.543;
  const f = DEG2RAD * NormalizeLongitude(93.272095 + 483202.0175233 * t - 36539e-7 * t2 - t3 / 3526e3 + t4 / 86331e4);
  const omega = DEG2RAD * NormalizeLongitude(125.0445479 - 1934.1362891 * t + 20754e-7 * t2 + t3 / 467441 - t4 / 60616e3);
  const m = DEG2RAD * NormalizeLongitude(357.5291092 + 35999.0502909 * t - 1536e-7 * t2 + t3 / 2449e4);
  const mdash = DEG2RAD * NormalizeLongitude(134.9633964 + 477198.8675055 * t + 87414e-7 * t2 + t3 / 69699 - t4 / 14712e3);
  const d = DEG2RAD * NormalizeLongitude(297.8501921 + 445267.1114034 * t - 18819e-7 * t2 + t3 / 545868 - t4 / 113065e3);
  const e = 1 - 2516e-6 * t - 74e-7 * t2;
  const w = mlon - omega;
  const a = Math.atan2(Math.sin(w) * Math.cos(mlat) * Math.cos(I) - Math.sin(mlat) * Math.sin(I), Math.cos(w) * Math.cos(mlat));
  const ldash = LongitudeOffset(RAD2DEG * (a - f));
  const bdash = Math.asin(-Math.sin(w) * Math.cos(mlat) * Math.sin(I) - Math.sin(mlat) * Math.cos(I));
  const k1 = DEG2RAD * (119.75 + 131.849 * t);
  const k2 = DEG2RAD * (72.56 + 20.186 * t);
  const rho = -0.02752 * Math.cos(mdash) + -0.02245 * Math.sin(f) + 684e-5 * Math.cos(mdash - 2 * f) + -293e-5 * Math.cos(2 * f) + -85e-5 * Math.cos(2 * f - 2 * d) + -54e-5 * Math.cos(mdash - 2 * d) + -2e-4 * Math.sin(mdash + f) + -2e-4 * Math.cos(mdash + 2 * f) + -2e-4 * Math.cos(mdash - f) + 14e-5 * Math.cos(mdash + 2 * f - 2 * d);
  const sigma = -0.02816 * Math.sin(mdash) + 0.02244 * Math.cos(f) + -682e-5 * Math.sin(mdash - 2 * f) + -279e-5 * Math.sin(2 * f) + -83e-5 * Math.sin(2 * f - 2 * d) + 69e-5 * Math.sin(mdash - 2 * d) + 4e-4 * Math.cos(mdash + f) + -25e-5 * Math.sin(2 * mdash) + -23e-5 * Math.sin(mdash + 2 * f) + 2e-4 * Math.cos(mdash - f) + 19e-5 * Math.sin(mdash - f) + 13e-5 * Math.sin(mdash + 2 * f - 2 * d) + -1e-4 * Math.cos(mdash - 3 * f);
  const tau = 0.0252 * e * Math.sin(m) + 473e-5 * Math.sin(2 * mdash - 2 * f) + -467e-5 * Math.sin(mdash) + 396e-5 * Math.sin(k1) + 276e-5 * Math.sin(2 * mdash - 2 * d) + 196e-5 * Math.sin(omega) + -183e-5 * Math.cos(mdash - f) + 115e-5 * Math.sin(mdash - 2 * d) + -96e-5 * Math.sin(mdash - d) + 46e-5 * Math.sin(2 * f - 2 * d) + -39e-5 * Math.sin(mdash - f) + -32e-5 * Math.sin(mdash - m - d) + 27e-5 * Math.sin(2 * mdash - m - 2 * d) + 23e-5 * Math.sin(k2) + -14e-5 * Math.sin(2 * d) + 14e-5 * Math.cos(2 * mdash - 2 * f) + -12e-5 * Math.sin(mdash - 2 * f) + -12e-5 * Math.sin(2 * mdash) + 11e-5 * Math.sin(2 * mdash - 2 * m - 2 * d);
  const ldash2 = -tau + (rho * Math.cos(a) + sigma * Math.sin(a)) * Math.tan(bdash);
  const bdash2 = sigma * Math.cos(a) - rho * Math.sin(a);
  const diam_deg = 2 * RAD2DEG * Math.atan(MOON_MEAN_RADIUS_KM / Math.sqrt(dist_km * dist_km - MOON_MEAN_RADIUS_KM * MOON_MEAN_RADIUS_KM));
  return new LibrationInfo(RAD2DEG * bdash + bdash2, ldash + ldash2, RAD2DEG * mlat, RAD2DEG * mlon, dist_km, diam_deg);
}
function rotate(rot, vec) {
  return [
    rot.rot[0][0] * vec[0] + rot.rot[1][0] * vec[1] + rot.rot[2][0] * vec[2],
    rot.rot[0][1] * vec[0] + rot.rot[1][1] * vec[1] + rot.rot[2][1] * vec[2],
    rot.rot[0][2] * vec[0] + rot.rot[1][2] * vec[1] + rot.rot[2][2] * vec[2]
  ];
}
function precession(pos, time, dir) {
  const r = precession_rot(time, dir);
  return rotate(r, pos);
}
function precession_posvel(state, time, dir) {
  const r = precession_rot(time, dir);
  return RotateState(r, state);
}
function precession_rot(time, dir) {
  const t = time.tt / 36525;
  let eps0 = 84381.406;
  let psia = ((((-951e-10 * t + 132851e-9) * t - 114045e-8) * t - 1.0790069) * t + 5038.481507) * t;
  let omegaa = ((((3337e-10 * t - 467e-9) * t - 772503e-8) * t + 0.0512623) * t - 0.025754) * t + eps0;
  let chia = ((((-56e-9 * t + 170663e-9) * t - 121197e-8) * t - 2.3814292) * t + 10.556403) * t;
  eps0 *= ASEC2RAD;
  psia *= ASEC2RAD;
  omegaa *= ASEC2RAD;
  chia *= ASEC2RAD;
  const sa = Math.sin(eps0);
  const ca = Math.cos(eps0);
  const sb = Math.sin(-psia);
  const cb = Math.cos(-psia);
  const sc = Math.sin(-omegaa);
  const cc = Math.cos(-omegaa);
  const sd = Math.sin(chia);
  const cd = Math.cos(chia);
  const xx = cd * cb - sb * sd * cc;
  const yx = cd * sb * ca + sd * cc * cb * ca - sa * sd * sc;
  const zx = cd * sb * sa + sd * cc * cb * sa + ca * sd * sc;
  const xy = -sd * cb - sb * cd * cc;
  const yy = -sd * sb * ca + cd * cc * cb * ca - sa * cd * sc;
  const zy = -sd * sb * sa + cd * cc * cb * sa + ca * cd * sc;
  const xz = sb * sc;
  const yz = -sc * cb * ca - sa * cc;
  const zz = -sc * cb * sa + cc * ca;
  if (dir === PrecessDirection.Into2000) {
    return new RotationMatrix([
      [xx, yx, zx],
      [xy, yy, zy],
      [xz, yz, zz]
    ]);
  }
  if (dir === PrecessDirection.From2000) {
    return new RotationMatrix([
      [xx, xy, xz],
      [yx, yy, yz],
      [zx, zy, zz]
    ]);
  }
  throw "Invalid precess direction";
}
function era(time) {
  const thet1 = 0.779057273264 + 0.00273781191135448 * time.ut;
  const thet3 = time.ut % 1;
  let theta = 360 * ((thet1 + thet3) % 1);
  if (theta < 0) {
    theta += 360;
  }
  return theta;
}
var sidereal_time_cache;
function sidereal_time(time) {
  if (!sidereal_time_cache || sidereal_time_cache.tt !== time.tt) {
    const t = time.tt / 36525;
    let eqeq = 15 * e_tilt(time).ee;
    const theta = era(time);
    const st = eqeq + 0.014506 + ((((-368e-10 * t - 29956e-9) * t - 44e-8) * t + 1.3915817) * t + 4612.156534) * t;
    let gst = (st / 3600 + theta) % 360 / 15;
    if (gst < 0) {
      gst += 24;
    }
    sidereal_time_cache = {
      tt: time.tt,
      st: gst
    };
  }
  return sidereal_time_cache.st;
}
function SiderealTime(date) {
  const time = MakeTime(date);
  return sidereal_time(time);
}
function inverse_terra(ovec, st) {
  const x = ovec[0] * KM_PER_AU;
  const y = ovec[1] * KM_PER_AU;
  const z4 = ovec[2] * KM_PER_AU;
  const p = Math.hypot(x, y);
  let lon_deg, lat_deg, height_km;
  if (p < 1e-6) {
    lon_deg = 0;
    lat_deg = z4 > 0 ? 90 : -90;
    height_km = Math.abs(z4) - EARTH_POLAR_RADIUS_KM;
  } else {
    const stlocl = Math.atan2(y, x);
    lon_deg = RAD2DEG * stlocl - 15 * st;
    while (lon_deg <= -180)
      lon_deg += 360;
    while (lon_deg > 180)
      lon_deg -= 360;
    let lat = Math.atan2(z4, p);
    let cos, sin, denom;
    let count = 0;
    for (; ; ) {
      if (++count > 10)
        throw `inverse_terra failed to converge.`;
      cos = Math.cos(lat);
      sin = Math.sin(lat);
      const factor = (EARTH_FLATTENING_SQUARED - 1) * EARTH_EQUATORIAL_RADIUS_KM;
      const cos2 = cos * cos;
      const sin2 = sin * sin;
      const radicand = cos2 + EARTH_FLATTENING_SQUARED * sin2;
      denom = Math.sqrt(radicand);
      const W = factor * sin * cos / denom - z4 * cos + p * sin;
      if (Math.abs(W) < 1e-8)
        break;
      const D = factor * ((cos2 - sin2) / denom - sin2 * cos2 * (EARTH_FLATTENING_SQUARED - 1) / (factor * radicand)) + z4 * sin + p * cos;
      lat -= W / D;
    }
    lat_deg = RAD2DEG * lat;
    const adjust = EARTH_EQUATORIAL_RADIUS_KM / denom;
    if (Math.abs(sin) > Math.abs(cos))
      height_km = z4 / sin - EARTH_FLATTENING_SQUARED * adjust;
    else
      height_km = p / cos - adjust;
  }
  return new Observer(lat_deg, lon_deg, 1e3 * height_km);
}
function terra(observer, st) {
  const phi = observer.latitude * DEG2RAD;
  const sinphi = Math.sin(phi);
  const cosphi = Math.cos(phi);
  const c = 1 / Math.hypot(cosphi, EARTH_FLATTENING * sinphi);
  const s = EARTH_FLATTENING_SQUARED * c;
  const ht_km = observer.height / 1e3;
  const ach = EARTH_EQUATORIAL_RADIUS_KM * c + ht_km;
  const ash = EARTH_EQUATORIAL_RADIUS_KM * s + ht_km;
  const stlocl = (15 * st + observer.longitude) * DEG2RAD;
  const sinst = Math.sin(stlocl);
  const cosst = Math.cos(stlocl);
  return {
    pos: [ach * cosphi * cosst / KM_PER_AU, ach * cosphi * sinst / KM_PER_AU, ash * sinphi / KM_PER_AU],
    vel: [-ANGVEL * ach * cosphi * sinst * 86400 / KM_PER_AU, ANGVEL * ach * cosphi * cosst * 86400 / KM_PER_AU, 0]
  };
}
function nutation(pos, time, dir) {
  const r = nutation_rot(time, dir);
  return rotate(r, pos);
}
function nutation_posvel(state, time, dir) {
  const r = nutation_rot(time, dir);
  return RotateState(r, state);
}
function nutation_rot(time, dir) {
  const tilt = e_tilt(time);
  const oblm = tilt.mobl * DEG2RAD;
  const oblt = tilt.tobl * DEG2RAD;
  const psi = tilt.dpsi * ASEC2RAD;
  const cobm = Math.cos(oblm);
  const sobm = Math.sin(oblm);
  const cobt = Math.cos(oblt);
  const sobt = Math.sin(oblt);
  const cpsi = Math.cos(psi);
  const spsi = Math.sin(psi);
  const xx = cpsi;
  const yx = -spsi * cobm;
  const zx = -spsi * sobm;
  const xy = spsi * cobt;
  const yy = cpsi * cobm * cobt + sobm * sobt;
  const zy = cpsi * sobm * cobt - cobm * sobt;
  const xz = spsi * sobt;
  const yz = cpsi * cobm * sobt - sobm * cobt;
  const zz = cpsi * sobm * sobt + cobm * cobt;
  if (dir === PrecessDirection.From2000) {
    return new RotationMatrix([
      [xx, xy, xz],
      [yx, yy, yz],
      [zx, zy, zz]
    ]);
  }
  if (dir === PrecessDirection.Into2000) {
    return new RotationMatrix([
      [xx, yx, zx],
      [xy, yy, zy],
      [xz, yz, zz]
    ]);
  }
  throw "Invalid precess direction";
}
function gyration(pos, time, dir) {
  return dir === PrecessDirection.Into2000 ? precession(nutation(pos, time, dir), time, dir) : nutation(precession(pos, time, dir), time, dir);
}
function gyration_posvel(state, time, dir) {
  return dir === PrecessDirection.Into2000 ? precession_posvel(nutation_posvel(state, time, dir), time, dir) : nutation_posvel(precession_posvel(state, time, dir), time, dir);
}
function geo_pos(time, observer) {
  const gast = sidereal_time(time);
  const pos = terra(observer, gast).pos;
  return gyration(pos, time, PrecessDirection.Into2000);
}
var Vector = class {
  constructor(x, y, z4, t) {
    this.x = x;
    this.y = y;
    this.z = z4;
    this.t = t;
  }
  /**
   * Returns the length of the vector in astronomical units (AU).
   * @returns {number}
   */
  Length() {
    return Math.hypot(this.x, this.y, this.z);
  }
};
var StateVector = class {
  constructor(x, y, z4, vx, vy, vz, t) {
    this.x = x;
    this.y = y;
    this.z = z4;
    this.vx = vx;
    this.vy = vy;
    this.vz = vz;
    this.t = t;
  }
};
var Spherical = class {
  constructor(lat, lon, dist) {
    this.lat = VerifyNumber(lat);
    this.lon = VerifyNumber(lon);
    this.dist = VerifyNumber(dist);
  }
};
var EquatorialCoordinates = class {
  constructor(ra, dec, dist, vec) {
    this.ra = VerifyNumber(ra);
    this.dec = VerifyNumber(dec);
    this.dist = VerifyNumber(dist);
    this.vec = vec;
  }
};
function IsValidRotationArray(rot) {
  if (!(rot instanceof Array) || rot.length !== 3)
    return false;
  for (let i = 0; i < 3; ++i) {
    if (!(rot[i] instanceof Array) || rot[i].length !== 3)
      return false;
    for (let j = 0; j < 3; ++j)
      if (!Number.isFinite(rot[i][j]))
        return false;
  }
  return true;
}
var RotationMatrix = class {
  constructor(rot) {
    this.rot = rot;
  }
};
function MakeRotation(rot) {
  if (!IsValidRotationArray(rot))
    throw "Argument must be a [3][3] array of numbers";
  return new RotationMatrix(rot);
}
var HorizontalCoordinates = class {
  constructor(azimuth, altitude, ra, dec) {
    this.azimuth = VerifyNumber(azimuth);
    this.altitude = VerifyNumber(altitude);
    this.ra = VerifyNumber(ra);
    this.dec = VerifyNumber(dec);
  }
};
var EclipticCoordinates = class {
  constructor(vec, elat, elon) {
    this.vec = vec;
    this.elat = VerifyNumber(elat);
    this.elon = VerifyNumber(elon);
  }
};
function VectorFromArray(av, time) {
  return new Vector(av[0], av[1], av[2], time);
}
function vector2radec(pos, time) {
  const vec = VectorFromArray(pos, time);
  const xyproj = vec.x * vec.x + vec.y * vec.y;
  const dist = Math.sqrt(xyproj + vec.z * vec.z);
  if (xyproj === 0) {
    if (vec.z === 0)
      throw "Indeterminate sky coordinates";
    return new EquatorialCoordinates(0, vec.z < 0 ? -90 : 90, dist, vec);
  }
  let ra = RAD2HOUR * Math.atan2(vec.y, vec.x);
  if (ra < 0)
    ra += 24;
  const dec = RAD2DEG * Math.atan2(pos[2], Math.sqrt(xyproj));
  return new EquatorialCoordinates(ra, dec, dist, vec);
}
function spin(angle, pos) {
  const angr = angle * DEG2RAD;
  const c = Math.cos(angr);
  const s = Math.sin(angr);
  return [c * pos[0] + s * pos[1], c * pos[1] - s * pos[0], pos[2]];
}
function Horizon(date, observer, ra, dec, refraction) {
  let time = MakeTime(date);
  VerifyObserver(observer);
  VerifyNumber(ra);
  VerifyNumber(dec);
  const sinlat = Math.sin(observer.latitude * DEG2RAD);
  const coslat = Math.cos(observer.latitude * DEG2RAD);
  const sinlon = Math.sin(observer.longitude * DEG2RAD);
  const coslon = Math.cos(observer.longitude * DEG2RAD);
  const sindc = Math.sin(dec * DEG2RAD);
  const cosdc = Math.cos(dec * DEG2RAD);
  const sinra = Math.sin(ra * HOUR2RAD);
  const cosra = Math.cos(ra * HOUR2RAD);
  let uze = [coslat * coslon, coslat * sinlon, sinlat];
  let une = [-sinlat * coslon, -sinlat * sinlon, coslat];
  let uwe = [sinlon, -coslon, 0];
  const spin_angle = -15 * sidereal_time(time);
  let uz = spin(spin_angle, uze);
  let un = spin(spin_angle, une);
  let uw = spin(spin_angle, uwe);
  let p = [cosdc * cosra, cosdc * sinra, sindc];
  const pz = p[0] * uz[0] + p[1] * uz[1] + p[2] * uz[2];
  const pn = p[0] * un[0] + p[1] * un[1] + p[2] * un[2];
  const pw = p[0] * uw[0] + p[1] * uw[1] + p[2] * uw[2];
  let proj = Math.hypot(pn, pw);
  let az;
  if (proj > 0) {
    az = -RAD2DEG * Math.atan2(pw, pn);
    if (az < 0)
      az += 360;
  } else {
    az = 0;
  }
  let zd = RAD2DEG * Math.atan2(proj, pz);
  let out_ra = ra;
  let out_dec = dec;
  if (refraction) {
    let zd0 = zd;
    let refr = Refraction(refraction, 90 - zd);
    zd -= refr;
    if (refr > 0 && zd > 3e-4) {
      const sinzd = Math.sin(zd * DEG2RAD);
      const coszd = Math.cos(zd * DEG2RAD);
      const sinzd0 = Math.sin(zd0 * DEG2RAD);
      const coszd0 = Math.cos(zd0 * DEG2RAD);
      const pr = [];
      for (let j = 0; j < 3; ++j) {
        pr.push((p[j] - coszd0 * uz[j]) / sinzd0 * sinzd + uz[j] * coszd);
      }
      proj = Math.hypot(pr[0], pr[1]);
      if (proj > 0) {
        out_ra = RAD2HOUR * Math.atan2(pr[1], pr[0]);
        if (out_ra < 0) {
          out_ra += 24;
        }
      } else {
        out_ra = 0;
      }
      out_dec = RAD2DEG * Math.atan2(pr[2], proj);
    }
  }
  return new HorizontalCoordinates(az, 90 - zd, out_ra, out_dec);
}
function VerifyObserver(observer) {
  if (!(observer instanceof Observer)) {
    throw `Not an instance of the Observer class: ${observer}`;
  }
  VerifyNumber(observer.latitude);
  VerifyNumber(observer.longitude);
  VerifyNumber(observer.height);
  if (observer.latitude < -90 || observer.latitude > 90) {
    throw `Latitude ${observer.latitude} is out of range. Must be -90..+90.`;
  }
  return observer;
}
var Observer = class {
  constructor(latitude, longitude, height) {
    this.latitude = latitude;
    this.longitude = longitude;
    this.height = height;
    VerifyObserver(this);
  }
};
function SunPosition(date) {
  const time = MakeTime(date).AddDays(-1 / C_AUDAY);
  const earth2000 = CalcVsop(vsop.Earth, time);
  const sun2000 = [-earth2000.x, -earth2000.y, -earth2000.z];
  const [gx, gy, gz] = gyration(sun2000, time, PrecessDirection.From2000);
  const true_obliq = DEG2RAD * e_tilt(time).tobl;
  const cos_ob = Math.cos(true_obliq);
  const sin_ob = Math.sin(true_obliq);
  const vec = new Vector(gx, gy, gz, time);
  const sun_ecliptic = RotateEquatorialToEcliptic(vec, cos_ob, sin_ob);
  return sun_ecliptic;
}
function Equator(body, date, observer, ofdate, aberration) {
  VerifyObserver(observer);
  VerifyBoolean(ofdate);
  VerifyBoolean(aberration);
  const time = MakeTime(date);
  const gc_observer = geo_pos(time, observer);
  const gc = GeoVector(body, time, aberration);
  const j2000 = [
    gc.x - gc_observer[0],
    gc.y - gc_observer[1],
    gc.z - gc_observer[2]
  ];
  if (!ofdate)
    return vector2radec(j2000, time);
  const datevect = gyration(j2000, time, PrecessDirection.From2000);
  return vector2radec(datevect, time);
}
function ObserverVector(date, observer, ofdate) {
  const time = MakeTime(date);
  const gast = sidereal_time(time);
  let ovec = terra(observer, gast).pos;
  if (!ofdate)
    ovec = gyration(ovec, time, PrecessDirection.Into2000);
  return VectorFromArray(ovec, time);
}
function ObserverState(date, observer, ofdate) {
  const time = MakeTime(date);
  const gast = sidereal_time(time);
  const svec = terra(observer, gast);
  const state = new StateVector(svec.pos[0], svec.pos[1], svec.pos[2], svec.vel[0], svec.vel[1], svec.vel[2], time);
  if (!ofdate)
    return gyration_posvel(state, time, PrecessDirection.Into2000);
  return state;
}
function VectorObserver(vector, ofdate) {
  const gast = sidereal_time(vector.t);
  let ovec = [vector.x, vector.y, vector.z];
  if (!ofdate) {
    ovec = precession(ovec, vector.t, PrecessDirection.From2000);
    ovec = nutation(ovec, vector.t, PrecessDirection.From2000);
  }
  return inverse_terra(ovec, gast);
}
function ObserverGravity(latitude, height) {
  const s = Math.sin(latitude * DEG2RAD);
  const s2 = s * s;
  const g02 = 9.7803253359 * (1 + 0.00193185265241 * s2) / Math.sqrt(1 - 0.00669437999013 * s2);
  return g02 * (1 - (315704e-12 - 210269e-14 * s2) * height + 737452e-19 * height * height);
}
function RotateEquatorialToEcliptic(equ, cos_ob, sin_ob) {
  const ex = equ.x;
  const ey = equ.y * cos_ob + equ.z * sin_ob;
  const ez = -equ.y * sin_ob + equ.z * cos_ob;
  const xyproj = Math.hypot(ex, ey);
  let elon = 0;
  if (xyproj > 0) {
    elon = RAD2DEG * Math.atan2(ey, ex);
    if (elon < 0)
      elon += 360;
  }
  let elat = RAD2DEG * Math.atan2(ez, xyproj);
  let ecl = new Vector(ex, ey, ez, equ.t);
  return new EclipticCoordinates(ecl, elat, elon);
}
function Ecliptic(eqj) {
  const et = e_tilt(eqj.t);
  const eqj_pos = [eqj.x, eqj.y, eqj.z];
  const mean_pos = precession(eqj_pos, eqj.t, PrecessDirection.From2000);
  const [x, y, z4] = nutation(mean_pos, eqj.t, PrecessDirection.From2000);
  const eqd = new Vector(x, y, z4, eqj.t);
  const tobl = et.tobl * DEG2RAD;
  return RotateEquatorialToEcliptic(eqd, Math.cos(tobl), Math.sin(tobl));
}
function GeoMoon(date) {
  const time = MakeTime(date);
  const moon = CalcMoon(time);
  const dist_cos_lat = moon.distance_au * Math.cos(moon.geo_eclip_lat);
  const gepos = [
    dist_cos_lat * Math.cos(moon.geo_eclip_lon),
    dist_cos_lat * Math.sin(moon.geo_eclip_lon),
    moon.distance_au * Math.sin(moon.geo_eclip_lat)
  ];
  const mpos1 = ecl2equ_vec(time, gepos);
  const mpos2 = precession(mpos1, time, PrecessDirection.Into2000);
  return new Vector(mpos2[0], mpos2[1], mpos2[2], time);
}
function EclipticGeoMoon(date) {
  const time = MakeTime(date);
  const moon = CalcMoon(time);
  const dist_cos_lat = moon.distance_au * Math.cos(moon.geo_eclip_lat);
  const ecm = [
    dist_cos_lat * Math.cos(moon.geo_eclip_lon),
    dist_cos_lat * Math.sin(moon.geo_eclip_lon),
    moon.distance_au * Math.sin(moon.geo_eclip_lat)
  ];
  const et = e_tilt(time);
  const eqm = obl_ecl2equ_vec(et.mobl, ecm);
  const eqd = nutation(eqm, time, PrecessDirection.From2000);
  const eqd_vec = VectorFromArray(eqd, time);
  const toblRad = et.tobl * DEG2RAD;
  const cos_tobl = Math.cos(toblRad);
  const sin_tobl = Math.sin(toblRad);
  const eclip = RotateEquatorialToEcliptic(eqd_vec, cos_tobl, sin_tobl);
  return new Spherical(eclip.elat, eclip.elon, moon.distance_au);
}
function GeoMoonState(date) {
  const time = MakeTime(date);
  const dt = 1e-5;
  const t1 = time.AddDays(-dt);
  const t2 = time.AddDays(+dt);
  const r1 = GeoMoon(t1);
  const r2 = GeoMoon(t2);
  return new StateVector((r1.x + r2.x) / 2, (r1.y + r2.y) / 2, (r1.z + r2.z) / 2, (r2.x - r1.x) / (2 * dt), (r2.y - r1.y) / (2 * dt), (r2.z - r1.z) / (2 * dt), time);
}
function GeoEmbState(date) {
  const time = MakeTime(date);
  const s = GeoMoonState(time);
  const d = 1 + EARTH_MOON_MASS_RATIO;
  return new StateVector(s.x / d, s.y / d, s.z / d, s.vx / d, s.vy / d, s.vz / d, time);
}
function VsopFormula(formula, t, clamp_angle) {
  let tpower = 1;
  let coord = 0;
  for (let series of formula) {
    let sum = 0;
    for (let [ampl, phas, freq] of series)
      sum += ampl * Math.cos(phas + t * freq);
    let incr = tpower * sum;
    if (clamp_angle)
      incr %= PI2;
    coord += incr;
    tpower *= t;
  }
  return coord;
}
function VsopDeriv(formula, t) {
  let tpower = 1;
  let dpower = 0;
  let deriv = 0;
  let s = 0;
  for (let series of formula) {
    let sin_sum = 0;
    let cos_sum = 0;
    for (let [ampl, phas, freq] of series) {
      let angle = phas + t * freq;
      sin_sum += ampl * freq * Math.sin(angle);
      if (s > 0)
        cos_sum += ampl * Math.cos(angle);
    }
    deriv += s * dpower * cos_sum - tpower * sin_sum;
    dpower = tpower;
    tpower *= t;
    ++s;
  }
  return deriv;
}
var DAYS_PER_MILLENNIUM = 365250;
var LON_INDEX = 0;
var LAT_INDEX = 1;
var RAD_INDEX = 2;
function VsopRotate(eclip) {
  return new TerseVector(eclip[0] + 44036e-11 * eclip[1] - 190919e-12 * eclip[2], -479966e-12 * eclip[0] + 0.917482137087 * eclip[1] - 0.397776982902 * eclip[2], 0.397776982902 * eclip[1] + 0.917482137087 * eclip[2]);
}
function VsopSphereToRect(lon, lat, radius) {
  const r_coslat = radius * Math.cos(lat);
  const coslon = Math.cos(lon);
  const sinlon = Math.sin(lon);
  return [
    r_coslat * coslon,
    r_coslat * sinlon,
    radius * Math.sin(lat)
  ];
}
function CalcVsop(model, time) {
  const t = time.tt / DAYS_PER_MILLENNIUM;
  const lon = VsopFormula(model[LON_INDEX], t, true);
  const lat = VsopFormula(model[LAT_INDEX], t, false);
  const rad2 = VsopFormula(model[RAD_INDEX], t, false);
  const eclip = VsopSphereToRect(lon, lat, rad2);
  return VsopRotate(eclip).ToAstroVector(time);
}
function CalcVsopPosVel(model, tt) {
  const t = tt / DAYS_PER_MILLENNIUM;
  const lon = VsopFormula(model[LON_INDEX], t, true);
  const lat = VsopFormula(model[LAT_INDEX], t, false);
  const rad2 = VsopFormula(model[RAD_INDEX], t, false);
  const dlon_dt = VsopDeriv(model[LON_INDEX], t);
  const dlat_dt = VsopDeriv(model[LAT_INDEX], t);
  const drad_dt = VsopDeriv(model[RAD_INDEX], t);
  const coslon = Math.cos(lon);
  const sinlon = Math.sin(lon);
  const coslat = Math.cos(lat);
  const sinlat = Math.sin(lat);
  const vx = +(drad_dt * coslat * coslon) - rad2 * sinlat * coslon * dlat_dt - rad2 * coslat * sinlon * dlon_dt;
  const vy = +(drad_dt * coslat * sinlon) - rad2 * sinlat * sinlon * dlat_dt + rad2 * coslat * coslon * dlon_dt;
  const vz = +(drad_dt * sinlat) + rad2 * coslat * dlat_dt;
  const eclip_pos = VsopSphereToRect(lon, lat, rad2);
  const eclip_vel = [
    vx / DAYS_PER_MILLENNIUM,
    vy / DAYS_PER_MILLENNIUM,
    vz / DAYS_PER_MILLENNIUM
  ];
  const equ_pos = VsopRotate(eclip_pos);
  const equ_vel = VsopRotate(eclip_vel);
  return new body_state_t(tt, equ_pos, equ_vel);
}
function AdjustBarycenter(ssb, time, body, pmass) {
  const shift = pmass / (pmass + SUN_GM);
  const planet = CalcVsop(vsop[body], time);
  ssb.x += shift * planet.x;
  ssb.y += shift * planet.y;
  ssb.z += shift * planet.z;
}
function CalcSolarSystemBarycenter(time) {
  const ssb = new Vector(0, 0, 0, time);
  AdjustBarycenter(ssb, time, Body.Jupiter, JUPITER_GM);
  AdjustBarycenter(ssb, time, Body.Saturn, SATURN_GM);
  AdjustBarycenter(ssb, time, Body.Uranus, URANUS_GM);
  AdjustBarycenter(ssb, time, Body.Neptune, NEPTUNE_GM);
  return ssb;
}
var PLUTO_NUM_STATES = 51;
var PLUTO_TIME_STEP = 29200;
var PLUTO_DT = 146;
var PLUTO_NSTEPS = 201;
var PlutoStateTable = [
  [-73e4, [-26.118207232108, -14.376168177825, 3.384402515299], [0.0016339372163656, -0.0027861699588508, -0.0013585880229445]],
  [-700800, [41.974905202127, -0.448502952929, -12.770351505989], [73458569351457e-17, 0.0022785014891658, 48619778602049e-17]],
  [-671600, [14.706930780744, 44.269110540027, 9.353698474772], [-0.00210001479998, 22295915939915e-17, 70143443551414e-17]],
  [-642400, [-29.441003929957, -6.43016153057, 6.858481011305], [84495803960544e-17, -0.0030783914758711, -0.0012106305981192]],
  [-613200, [39.444396946234, -6.557989760571, -13.913760296463], [0.0011480029005873, 0.0022400006880665, 35168075922288e-17]],
  [-584e3, [20.2303809507, 43.266966657189, 7.382966091923], [-0.0019754081700585, 53457141292226e-17, 75929169129793e-17]],
  [-554800, [-30.65832536462, 2.093818874552, 9.880531138071], [61010603013347e-18, -0.0031326500935382, -99346125151067e-17]],
  [-525600, [35.737703251673, -12.587706024764, -14.677847247563], [0.0015802939375649, 0.0021347678412429, 19074436384343e-17]],
  [-496400, [25.466295188546, 41.367478338417, 5.216476873382], [-0.0018054401046468, 8328308359951e-16, 80260156912107e-17]],
  [-467200, [-29.847174904071, 10.636426313081, 12.297904180106], [-63257063052907e-17, -0.0029969577578221, -74476074151596e-17]],
  [-438e3, [30.774692107687, -18.236637015304, -14.945535879896], [0.0020113162005465, 0.0019353827024189, -20937793168297e-19]],
  [-408800, [30.243153324028, 38.656267888503, 2.938501750218], [-0.0016052508674468, 0.0011183495337525, 83333973416824e-17]],
  [-379600, [-27.288984772533, 18.643162147874, 14.023633623329], [-0.0011856388898191, -0.0027170609282181, -49015526126399e-17]],
  [-350400, [24.519605196774, -23.245756064727, -14.626862367368], [0.0024322321483154, 0.0016062008146048, -23369181613312e-17]],
  [-321200, [34.505274805875, 35.125338586954, 0.557361475637], [-0.0013824391637782, 0.0013833397561817, 84823598806262e-17]],
  [-292e3, [-23.275363915119, 25.818514298769, 15.055381588598], [-0.0016062295460975, -0.0023395961498533, -24377362639479e-17]],
  [-262800, [17.050384798092, -27.180376290126, -13.608963321694], [0.0028175521080578, 0.0011358749093955, -49548725258825e-17]],
  [-233600, [38.093671910285, 30.880588383337, -1.843688067413], [-0.0011317697153459, 0.0016128814698472, 84177586176055e-17]],
  [-204400, [-18.197852930878, 31.932869934309, 15.438294826279], [-0.0019117272501813, -0.0019146495909842, -19657304369835e-18]],
  [-175200, [8.528924039997, -29.618422200048, -11.805400994258], [0.0031034370787005, 5139363329243e-16, -77293066202546e-17]],
  [-146e3, [40.94685725864, 25.904973592021, -4.256336240499], [-83652705194051e-17, 0.0018129497136404, 8156422827306e-16]],
  [-116800, [-12.326958895325, 36.881883446292, 15.217158258711], [-0.0021166103705038, -0.001481442003599, 17401209844705e-17]],
  [-87600, [-0.633258375909, -30.018759794709, -9.17193287495], [0.0032016994581737, -25279858672148e-17, -0.0010411088271861]],
  [-58400, [42.936048423883, 20.344685584452, -6.588027007912], [-50525450073192e-17, 0.0019910074335507, 77440196540269e-17]],
  [-29200, [-5.975910552974, 40.61180995846, 14.470131723673], [-0.0022184202156107, -0.0010562361130164, 33652250216211e-17]],
  [0, [-9.875369580774, -27.978926224737, -5.753711824704], [0.0030287533248818, -0.0011276087003636, -0.0012651326732361]],
  [29200, [43.958831986165, 14.214147973292, -8.808306227163], [-14717608981871e-17, 0.0021404187242141, 71486567806614e-17]],
  [58400, [0.67813676352, 43.094461639362, 13.243238780721], [-0.0022358226110718, -63233636090933e-17, 47664798895648e-17]],
  [87600, [-18.282602096834, -23.30503958666, -1.766620508028], [0.0025567245263557, -0.0019902940754171, -0.0013943491701082]],
  [116800, [43.873338744526, 7.700705617215, -10.814273666425], [23174803055677e-17, 0.0022402163127924, 62988756452032e-17]],
  [146e3, [7.392949027906, 44.382678951534, 11.629500214854], [-0.002193281545383, -21751799585364e-17, 59556516201114e-17]],
  [175200, [-24.981690229261, -16.204012851426, 2.466457544298], [0.001819398914958, -0.0026765419531201, -0.0013848283502247]],
  [204400, [42.530187039511, 0.845935508021, -12.554907527683], [65059779150669e-17, 0.0022725657282262, 51133743202822e-17]],
  [233600, [13.999526486822, 44.462363044894, 9.669418486465], [-0.0021079296569252, 17533423831993e-17, 69128485798076e-17]],
  [262800, [-29.184024803031, -7.371243995762, 6.493275957928], [93581363109681e-17, -0.0030610357109184, -0.0012364201089345]],
  [292e3, [39.831980671753, -6.078405766765, -13.909815358656], [0.0011117769689167, 0.0022362097830152, 36230548231153e-17]],
  [321200, [20.294955108476, 43.417190420251, 7.450091985932], [-0.0019742157451535, 53102050468554e-17, 75938408813008e-17]],
  [350400, [-30.66999230216, 2.318743558955, 9.973480913858], [45605107450676e-18, -0.0031308219926928, -99066533301924e-17]],
  [379600, [35.626122155983, -12.897647509224, -14.777586508444], [0.0016015684949743, 0.0021171931182284, 18002516202204e-17]],
  [408800, [26.133186148561, 41.232139187599, 5.00640132622], [-0.0017857704419579, 86046232702817e-17, 80614690298954e-17]],
  [438e3, [-29.57674022923, 11.863535943587, 12.631323039872], [-72292830060955e-17, -0.0029587820140709, -708242964503e-15]],
  [467200, [29.910805787391, -19.159019294, -15.013363865194], [0.0020871080437997, 0.0018848372554514, -38528655083926e-18]],
  [496400, [31.375957451819, 38.050372720763, 2.433138343754], [-0.0015546055556611, 0.0011699815465629, 83565439266001e-17]],
  [525600, [-26.360071336928, 20.662505904952, 14.414696258958], [-0.0013142373118349, -0.0026236647854842, -42542017598193e-17]],
  [554800, [22.599441488648, -24.508879898306, -14.484045731468], [0.0025454108304806, 0.0014917058755191, -30243665086079e-17]],
  [584e3, [35.877864013014, 33.894226366071, -0.224524636277], [-0.0012941245730845, 0.0014560427668319, 84762160640137e-17]],
  [613200, [-21.538149762417, 28.204068269761, 15.321973799534], [-0.001731211740901, -0.0021939631314577, -1631691327518e-16]],
  [642400, [13.971521374415, -28.339941764789, -13.083792871886], [0.0029334630526035, 91860931752944e-17, -59939422488627e-17]],
  [671600, [39.526942044143, 28.93989736011, -2.872799527539], [-0.0010068481658095, 0.001702113288809, 83578230511981e-17]],
  [700800, [-15.576200701394, 34.399412961275, 15.466033737854], [-0.0020098814612884, -0.0017191109825989, 70414782780416e-18]],
  [73e4, [4.24325283709, -30.118201690825, -10.707441231349], [0.0031725847067411, 1609846120227e-16, -90672150593868e-17]]
];
var TerseVector = class _TerseVector {
  constructor(x, y, z4) {
    this.x = x;
    this.y = y;
    this.z = z4;
  }
  clone() {
    return new _TerseVector(this.x, this.y, this.z);
  }
  ToAstroVector(t) {
    return new Vector(this.x, this.y, this.z, t);
  }
  static zero() {
    return new _TerseVector(0, 0, 0);
  }
  quadrature() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  add(other) {
    return new _TerseVector(this.x + other.x, this.y + other.y, this.z + other.z);
  }
  sub(other) {
    return new _TerseVector(this.x - other.x, this.y - other.y, this.z - other.z);
  }
  incr(other) {
    this.x += other.x;
    this.y += other.y;
    this.z += other.z;
  }
  decr(other) {
    this.x -= other.x;
    this.y -= other.y;
    this.z -= other.z;
  }
  mul(scalar) {
    return new _TerseVector(scalar * this.x, scalar * this.y, scalar * this.z);
  }
  div(scalar) {
    return new _TerseVector(this.x / scalar, this.y / scalar, this.z / scalar);
  }
  mean(other) {
    return new _TerseVector((this.x + other.x) / 2, (this.y + other.y) / 2, (this.z + other.z) / 2);
  }
  neg() {
    return new _TerseVector(-this.x, -this.y, -this.z);
  }
};
var body_state_t = class _body_state_t {
  constructor(tt, r, v) {
    this.tt = tt;
    this.r = r;
    this.v = v;
  }
  clone() {
    return new _body_state_t(this.tt, this.r, this.v);
  }
  sub(other) {
    return new _body_state_t(this.tt, this.r.sub(other.r), this.v.sub(other.v));
  }
};
function BodyStateFromTable(entry) {
  let [tt, [rx, ry, rz], [vx, vy, vz]] = entry;
  return new body_state_t(tt, new TerseVector(rx, ry, rz), new TerseVector(vx, vy, vz));
}
function AdjustBarycenterPosVel(ssb, tt, body, planet_gm) {
  const shift = planet_gm / (planet_gm + SUN_GM);
  const planet = CalcVsopPosVel(vsop[body], tt);
  ssb.r.incr(planet.r.mul(shift));
  ssb.v.incr(planet.v.mul(shift));
  return planet;
}
function AccelerationIncrement(small_pos, gm, major_pos) {
  const delta = major_pos.sub(small_pos);
  const r2 = delta.quadrature();
  return delta.mul(gm / (r2 * Math.sqrt(r2)));
}
var major_bodies_t = class {
  constructor(tt) {
    let ssb = new body_state_t(tt, new TerseVector(0, 0, 0), new TerseVector(0, 0, 0));
    this.Jupiter = AdjustBarycenterPosVel(ssb, tt, Body.Jupiter, JUPITER_GM);
    this.Saturn = AdjustBarycenterPosVel(ssb, tt, Body.Saturn, SATURN_GM);
    this.Uranus = AdjustBarycenterPosVel(ssb, tt, Body.Uranus, URANUS_GM);
    this.Neptune = AdjustBarycenterPosVel(ssb, tt, Body.Neptune, NEPTUNE_GM);
    this.Jupiter.r.decr(ssb.r);
    this.Jupiter.v.decr(ssb.v);
    this.Saturn.r.decr(ssb.r);
    this.Saturn.v.decr(ssb.v);
    this.Uranus.r.decr(ssb.r);
    this.Uranus.v.decr(ssb.v);
    this.Neptune.r.decr(ssb.r);
    this.Neptune.v.decr(ssb.v);
    this.Sun = new body_state_t(tt, ssb.r.mul(-1), ssb.v.mul(-1));
  }
  Acceleration(pos) {
    let acc = AccelerationIncrement(pos, SUN_GM, this.Sun.r);
    acc.incr(AccelerationIncrement(pos, JUPITER_GM, this.Jupiter.r));
    acc.incr(AccelerationIncrement(pos, SATURN_GM, this.Saturn.r));
    acc.incr(AccelerationIncrement(pos, URANUS_GM, this.Uranus.r));
    acc.incr(AccelerationIncrement(pos, NEPTUNE_GM, this.Neptune.r));
    return acc;
  }
};
var body_grav_calc_t = class _body_grav_calc_t {
  constructor(tt, r, v, a) {
    this.tt = tt;
    this.r = r;
    this.v = v;
    this.a = a;
  }
  clone() {
    return new _body_grav_calc_t(this.tt, this.r.clone(), this.v.clone(), this.a.clone());
  }
};
var grav_sim_t = class {
  constructor(bary, grav) {
    this.bary = bary;
    this.grav = grav;
  }
};
function UpdatePosition(dt, r, v, a) {
  return new TerseVector(r.x + dt * (v.x + dt * a.x / 2), r.y + dt * (v.y + dt * a.y / 2), r.z + dt * (v.z + dt * a.z / 2));
}
function UpdateVelocity(dt, v, a) {
  return new TerseVector(v.x + dt * a.x, v.y + dt * a.y, v.z + dt * a.z);
}
function GravSim(tt2, calc1) {
  const dt = tt2 - calc1.tt;
  const bary2 = new major_bodies_t(tt2);
  const approx_pos = UpdatePosition(dt, calc1.r, calc1.v, calc1.a);
  const mean_acc = bary2.Acceleration(approx_pos).mean(calc1.a);
  const pos = UpdatePosition(dt, calc1.r, calc1.v, mean_acc);
  const vel = calc1.v.add(mean_acc.mul(dt));
  const acc = bary2.Acceleration(pos);
  const grav = new body_grav_calc_t(tt2, pos, vel, acc);
  return new grav_sim_t(bary2, grav);
}
var pluto_cache = [];
function ClampIndex(frac, nsteps) {
  const index = Math.floor(frac);
  if (index < 0)
    return 0;
  if (index >= nsteps)
    return nsteps - 1;
  return index;
}
function GravFromState(entry) {
  const state = BodyStateFromTable(entry);
  const bary = new major_bodies_t(state.tt);
  const r = state.r.add(bary.Sun.r);
  const v = state.v.add(bary.Sun.v);
  const a = bary.Acceleration(r);
  const grav = new body_grav_calc_t(state.tt, r, v, a);
  return new grav_sim_t(bary, grav);
}
function GetSegment(cache, tt) {
  const t0 = PlutoStateTable[0][0];
  if (tt < t0 || tt > PlutoStateTable[PLUTO_NUM_STATES - 1][0]) {
    return null;
  }
  const seg_index = ClampIndex((tt - t0) / PLUTO_TIME_STEP, PLUTO_NUM_STATES - 1);
  if (!cache[seg_index]) {
    const seg = cache[seg_index] = [];
    seg[0] = GravFromState(PlutoStateTable[seg_index]).grav;
    seg[PLUTO_NSTEPS - 1] = GravFromState(PlutoStateTable[seg_index + 1]).grav;
    let i;
    let step_tt = seg[0].tt;
    for (i = 1; i < PLUTO_NSTEPS - 1; ++i)
      seg[i] = GravSim(step_tt += PLUTO_DT, seg[i - 1]).grav;
    step_tt = seg[PLUTO_NSTEPS - 1].tt;
    var reverse = [];
    reverse[PLUTO_NSTEPS - 1] = seg[PLUTO_NSTEPS - 1];
    for (i = PLUTO_NSTEPS - 2; i > 0; --i)
      reverse[i] = GravSim(step_tt -= PLUTO_DT, reverse[i + 1]).grav;
    for (i = PLUTO_NSTEPS - 2; i > 0; --i) {
      const ramp = i / (PLUTO_NSTEPS - 1);
      seg[i].r = seg[i].r.mul(1 - ramp).add(reverse[i].r.mul(ramp));
      seg[i].v = seg[i].v.mul(1 - ramp).add(reverse[i].v.mul(ramp));
      seg[i].a = seg[i].a.mul(1 - ramp).add(reverse[i].a.mul(ramp));
    }
  }
  return cache[seg_index];
}
function CalcPlutoOneWay(entry, target_tt, dt) {
  let sim = GravFromState(entry);
  const n = Math.ceil((target_tt - sim.grav.tt) / dt);
  for (let i = 0; i < n; ++i)
    sim = GravSim(i + 1 === n ? target_tt : sim.grav.tt + dt, sim.grav);
  return sim;
}
function CalcPluto(time, helio) {
  let r, v, bary;
  const seg = GetSegment(pluto_cache, time.tt);
  if (!seg) {
    let sim;
    if (time.tt < PlutoStateTable[0][0])
      sim = CalcPlutoOneWay(PlutoStateTable[0], time.tt, -PLUTO_DT);
    else
      sim = CalcPlutoOneWay(PlutoStateTable[PLUTO_NUM_STATES - 1], time.tt, +PLUTO_DT);
    r = sim.grav.r;
    v = sim.grav.v;
    bary = sim.bary;
  } else {
    const left = ClampIndex((time.tt - seg[0].tt) / PLUTO_DT, PLUTO_NSTEPS - 1);
    const s1 = seg[left];
    const s2 = seg[left + 1];
    const acc = s1.a.mean(s2.a);
    const ra = UpdatePosition(time.tt - s1.tt, s1.r, s1.v, acc);
    const va = UpdateVelocity(time.tt - s1.tt, s1.v, acc);
    const rb = UpdatePosition(time.tt - s2.tt, s2.r, s2.v, acc);
    const vb = UpdateVelocity(time.tt - s2.tt, s2.v, acc);
    const ramp = (time.tt - s1.tt) / PLUTO_DT;
    r = ra.mul(1 - ramp).add(rb.mul(ramp));
    v = va.mul(1 - ramp).add(vb.mul(ramp));
  }
  if (helio) {
    if (!bary)
      bary = new major_bodies_t(time.tt);
    r = r.sub(bary.Sun.r);
    v = v.sub(bary.Sun.v);
  }
  return new StateVector(r.x, r.y, r.z, v.x, v.y, v.z, time);
}
var Rotation_JUP_EQJ = new RotationMatrix([
  [0.999432765338654, -0.0336771074697641, 0],
  [0.0303959428906285, 0.902057912352809, 0.430543388542295],
  [-0.0144994559663353, -0.430299169409101, 0.902569881273754]
]);
var JupiterMoonModel = [
  // [0] Io
  {
    mu: 282489428433814e-21,
    al: [1.446213296021224, 3.5515522861824],
    a: [
      [0.0028210960212903, 0, 0]
    ],
    l: [
      [-1925258348666e-16, 4.9369589722645, 0.01358483658305],
      [-970803596076e-16, 4.3188796477322, 0.01303413843243],
      [-8988174165e-14, 1.9080016428617, 0.00305064867158],
      [-553101050262e-16, 1.4936156681569, 0.01293892891155]
    ],
    z: [
      [0.0041510849668155, 4.089939635545, -0.01290686414666],
      [6260521444113e-16, 1.446188898627, 3.5515522949802],
      [352747346169e-16, 2.1256287034578, 12727416567e-14]
    ],
    zeta: [
      [3142172466014e-16, 2.7964219722923, -0.002315096098],
      [904169207946e-16, 1.0477061879627, -56920638196e-14]
    ]
  },
  // [1] Europa
  {
    mu: 282483274392893e-21,
    al: [-0.3735263437471362, 1.76932271112347],
    a: [
      [0.0044871037804314, 0, 0],
      [4324367498e-16, 1.819645606291, 1.7822295777568]
    ],
    l: [
      [8576433172936e-16, 4.3188693178264, 0.01303413830805],
      [4549582875086e-16, 1.4936531751079, 0.01293892881962],
      [3248939825174e-16, 1.8196494533458, 1.7822295777568],
      [-3074250079334e-16, 4.9377037005911, 0.01358483286724],
      [1982386144784e-16, 1.907986905476, 0.00305101212869],
      [1834063551804e-16, 2.1402853388529, 0.00145009789338],
      [-1434383188452e-16, 5.622214036663, 0.89111478887838],
      [-771939140944e-16, 4.300272437235, 2.6733443704266]
    ],
    z: [
      [-0.0093589104136341, 4.0899396509039, -0.01290686414666],
      [2988994545555e-16, 5.9097265185595, 1.7693227079462],
      [213903639035e-15, 2.1256289300016, 12727418407e-14],
      [1980963564781e-16, 2.743516829265, 67797343009e-14],
      [1210388158965e-16, 5.5839943711203, 320566149e-13],
      [837042048393e-16, 1.6094538368039, -0.90402165808846],
      [823525166369e-16, 1.4461887708689, 3.5515522949802]
    ],
    zeta: [
      [0.0040404917832303, 1.0477063169425, -5692064054e-13],
      [2200421034564e-16, 3.3368857864364, -12491307307e-14],
      [1662544744719e-16, 2.4134862374711, 0],
      [590282470983e-16, 5.9719930968366, -3056160225e-14]
    ]
  },
  // [2] Ganymede
  {
    mu: 282498184184723e-21,
    al: [0.2874089391143348, 0.878207923589328],
    a: [
      [0.0071566594572575, 0, 0],
      [1393029911e-15, 1.1586745884981, 2.6733443704266]
    ],
    l: [
      [2310797886226e-16, 2.1402987195942, 0.00145009784384],
      [-1828635964118e-16, 4.3188672736968, 0.01303413828263],
      [1512378778204e-16, 4.9373102372298, 0.01358483481252],
      [-1163720969778e-16, 4.300265986149, 2.6733443704266],
      [-955478069846e-16, 1.4936612842567, 0.01293892879857],
      [815246854464e-16, 5.6222137132535, 0.89111478887838],
      [-801219679602e-16, 1.2995922951532, 1.0034433456729],
      [-607017260182e-16, 0.64978769669238, 0.50172167043264]
    ],
    z: [
      [0.0014289811307319, 2.1256295942739, 12727413029e-14],
      [771093122676e-15, 5.5836330003496, 320643411e-13],
      [5925911780766e-16, 4.0899396636448, -0.01290686414666],
      [2045597496146e-16, 5.2713683670372, -0.12523544076106],
      [1785118648258e-16, 0.28743156721063, 0.8782079244252],
      [1131999784893e-16, 1.4462127277818, 3.5515522949802],
      [-65877816921e-15, 2.2702423990985, -1.7951364394537],
      [497058888328e-16, 5.9096792204858, 1.7693227129285]
    ],
    zeta: [
      [0.0015932721570848, 3.3368862796665, -12491307058e-14],
      [8533093128905e-16, 2.4133881688166, 0],
      [3513347911037e-16, 5.9720789850127, -3056101771e-14],
      [-1441929255483e-16, 1.0477061764435, -56920632124e-14]
    ]
  },
  // [3] Callisto
  {
    mu: 282492144889909e-21,
    al: [-0.3620341291375704, 0.376486233433828],
    a: [
      [0.0125879701715314, 0, 0],
      [3595204947e-15, 0.64965776007116, 0.50172168165034],
      [27580210652e-16, 1.808423578151, 3.1750660413359]
    ],
    l: [
      [5586040123824e-16, 2.1404207189815, 0.00145009793231],
      [-3805813868176e-16, 2.7358844897853, 2972965062e-14],
      [2205152863262e-16, 0.649796525964, 0.5017216724358],
      [1877895151158e-16, 1.8084787604005, 3.1750660413359],
      [766916975242e-16, 6.2720114319755, 1.3928364636651],
      [747056855106e-16, 1.2995916202344, 1.0034433456729]
    ],
    z: [
      [0.0073755808467977, 5.5836071576084, 3206509914e-14],
      [2065924169942e-16, 5.9209831565786, 0.37648624194703],
      [1589869764021e-16, 0.28744006242623, 0.8782079244252],
      [-1561131605348e-16, 2.1257397865089, 12727441285e-14],
      [1486043380971e-16, 1.4462134301023, 3.5515522949802],
      [635073108731e-16, 5.9096803285954, 1.7693227129285],
      [599351698525e-16, 4.1125517584798, -2.7985797954589],
      [540660842731e-16, 5.5390350845569, 0.00286834082283],
      [-489596900866e-16, 4.6218149483338, -0.62695712529519]
    ],
    zeta: [
      [0.0038422977898495, 2.4133922085557, 0],
      [0.0022453891791894, 5.9721736773277, -3056125525e-14],
      [-2604479450559e-16, 3.3368746306409, -12491309972e-14],
      [33211214323e-15, 5.5604137742337, 0.00290037688507]
    ]
  }
];
var JupiterMoonsInfo = class {
  constructor(io, europa, ganymede, callisto) {
    this.io = io;
    this.europa = europa;
    this.ganymede = ganymede;
    this.callisto = callisto;
  }
};
function JupiterMoon_elem2pv(time, mu, elem) {
  const A = elem[0];
  const AL = elem[1];
  const K = elem[2];
  const H = elem[3];
  const Q = elem[4];
  const P = elem[5];
  const AN = Math.sqrt(mu / (A * A * A));
  let CE, SE, DE;
  let EE = AL + K * Math.sin(AL) - H * Math.cos(AL);
  do {
    CE = Math.cos(EE);
    SE = Math.sin(EE);
    DE = (AL - EE + K * SE - H * CE) / (1 - K * CE - H * SE);
    EE += DE;
  } while (Math.abs(DE) >= 1e-12);
  CE = Math.cos(EE);
  SE = Math.sin(EE);
  const DLE = H * CE - K * SE;
  const RSAM1 = -K * CE - H * SE;
  const ASR = 1 / (1 + RSAM1);
  const PHI = Math.sqrt(1 - K * K - H * H);
  const PSI = 1 / (1 + PHI);
  const X1 = A * (CE - K - PSI * H * DLE);
  const Y1 = A * (SE - H + PSI * K * DLE);
  const VX1 = AN * ASR * A * (-SE - PSI * H * RSAM1);
  const VY1 = AN * ASR * A * (+CE + PSI * K * RSAM1);
  const F2 = 2 * Math.sqrt(1 - Q * Q - P * P);
  const P2 = 1 - 2 * P * P;
  const Q2 = 1 - 2 * Q * Q;
  const PQ = 2 * P * Q;
  return new StateVector(X1 * P2 + Y1 * PQ, X1 * PQ + Y1 * Q2, (Q * Y1 - X1 * P) * F2, VX1 * P2 + VY1 * PQ, VX1 * PQ + VY1 * Q2, (Q * VY1 - VX1 * P) * F2, time);
}
function CalcJupiterMoon(time, m) {
  const t = time.tt + 18262.5;
  const elem = [0, m.al[0] + t * m.al[1], 0, 0, 0, 0];
  for (let [amplitude, phase, frequency] of m.a)
    elem[0] += amplitude * Math.cos(phase + t * frequency);
  for (let [amplitude, phase, frequency] of m.l)
    elem[1] += amplitude * Math.sin(phase + t * frequency);
  elem[1] %= PI2;
  if (elem[1] < 0)
    elem[1] += PI2;
  for (let [amplitude, phase, frequency] of m.z) {
    const arg = phase + t * frequency;
    elem[2] += amplitude * Math.cos(arg);
    elem[3] += amplitude * Math.sin(arg);
  }
  for (let [amplitude, phase, frequency] of m.zeta) {
    const arg = phase + t * frequency;
    elem[4] += amplitude * Math.cos(arg);
    elem[5] += amplitude * Math.sin(arg);
  }
  const state = JupiterMoon_elem2pv(time, m.mu, elem);
  return RotateState(Rotation_JUP_EQJ, state);
}
function JupiterMoons(date) {
  const time = new AstroTime(date);
  return new JupiterMoonsInfo(CalcJupiterMoon(time, JupiterMoonModel[0]), CalcJupiterMoon(time, JupiterMoonModel[1]), CalcJupiterMoon(time, JupiterMoonModel[2]), CalcJupiterMoon(time, JupiterMoonModel[3]));
}
function HelioVector(body, date) {
  var time = MakeTime(date);
  if (body in vsop)
    return CalcVsop(vsop[body], time);
  if (body === Body.Pluto) {
    const p = CalcPluto(time, true);
    return new Vector(p.x, p.y, p.z, time);
  }
  if (body === Body.Sun)
    return new Vector(0, 0, 0, time);
  if (body === Body.Moon) {
    var e = CalcVsop(vsop.Earth, time);
    var m = GeoMoon(time);
    return new Vector(e.x + m.x, e.y + m.y, e.z + m.z, time);
  }
  if (body === Body.EMB) {
    const e2 = CalcVsop(vsop.Earth, time);
    const m2 = GeoMoon(time);
    const denom = 1 + EARTH_MOON_MASS_RATIO;
    return new Vector(e2.x + m2.x / denom, e2.y + m2.y / denom, e2.z + m2.z / denom, time);
  }
  if (body === Body.SSB)
    return CalcSolarSystemBarycenter(time);
  const star = UserDefinedStar(body);
  if (star) {
    const sphere = new Spherical(star.dec, 15 * star.ra, star.dist);
    return VectorFromSphere(sphere, time);
  }
  throw `HelioVector: Unknown body "${body}"`;
}
function HelioDistance(body, date) {
  const star = UserDefinedStar(body);
  if (star)
    return star.dist;
  const time = MakeTime(date);
  if (body in vsop)
    return VsopFormula(vsop[body][RAD_INDEX], time.tt / DAYS_PER_MILLENNIUM, false);
  return HelioVector(body, time).Length();
}
function CorrectLightTravel(func, time) {
  let ltime = time;
  let dt = 0;
  for (let iter = 0; iter < 10; ++iter) {
    const pos = func(ltime);
    const lt = pos.Length() / C_AUDAY;
    if (lt > 1)
      throw `Object is too distant for light-travel solver.`;
    const ltime2 = time.AddDays(-lt);
    dt = Math.abs(ltime2.tt - ltime.tt);
    if (dt < 1e-9)
      return pos;
    ltime = ltime2;
  }
  throw `Light-travel time solver did not converge: dt = ${dt}`;
}
var BodyPosition = class {
  constructor(observerBody, targetBody, aberration, observerPos) {
    this.observerBody = observerBody;
    this.targetBody = targetBody;
    this.aberration = aberration;
    this.observerPos = observerPos;
  }
  Position(time) {
    if (this.aberration) {
      this.observerPos = HelioVector(this.observerBody, time);
    } else {
    }
    const targetPos = HelioVector(this.targetBody, time);
    return new Vector(targetPos.x - this.observerPos.x, targetPos.y - this.observerPos.y, targetPos.z - this.observerPos.z, time);
  }
};
function BackdatePosition(date, observerBody, targetBody, aberration) {
  VerifyBoolean(aberration);
  const time = MakeTime(date);
  if (UserDefinedStar(targetBody)) {
    const tvec = HelioVector(targetBody, time);
    if (aberration) {
      const ostate = HelioState(observerBody, time);
      const rvec = new Vector(tvec.x - ostate.x, tvec.y - ostate.y, tvec.z - ostate.z, time);
      const s = C_AUDAY / rvec.Length();
      return new Vector(rvec.x + ostate.vx / s, rvec.y + ostate.vy / s, rvec.z + ostate.vz / s, time);
    }
    const ovec = HelioVector(observerBody, time);
    return new Vector(tvec.x - ovec.x, tvec.y - ovec.y, tvec.z - ovec.z, time);
  }
  let observerPos;
  if (aberration) {
    observerPos = new Vector(0, 0, 0, time);
  } else {
    observerPos = HelioVector(observerBody, time);
  }
  const bpos = new BodyPosition(observerBody, targetBody, aberration, observerPos);
  return CorrectLightTravel((t) => bpos.Position(t), time);
}
function GeoVector(body, date, aberration) {
  VerifyBoolean(aberration);
  const time = MakeTime(date);
  switch (body) {
    case Body.Earth:
      return new Vector(0, 0, 0, time);
    case Body.Moon:
      return GeoMoon(time);
    default:
      const vec = BackdatePosition(time, Body.Earth, body, aberration);
      vec.t = time;
      return vec;
  }
}
function ExportState(terse, time) {
  return new StateVector(terse.r.x, terse.r.y, terse.r.z, terse.v.x, terse.v.y, terse.v.z, time);
}
function BaryState(body, date) {
  const time = MakeTime(date);
  if (body === Body.SSB) {
    return new StateVector(0, 0, 0, 0, 0, 0, time);
  }
  if (body === Body.Pluto) {
    return CalcPluto(time, false);
  }
  const bary = new major_bodies_t(time.tt);
  switch (body) {
    case Body.Sun:
      return ExportState(bary.Sun, time);
    case Body.Jupiter:
      return ExportState(bary.Jupiter, time);
    case Body.Saturn:
      return ExportState(bary.Saturn, time);
    case Body.Uranus:
      return ExportState(bary.Uranus, time);
    case Body.Neptune:
      return ExportState(bary.Neptune, time);
    case Body.Moon:
    case Body.EMB:
      const earth = CalcVsopPosVel(vsop[Body.Earth], time.tt);
      const state = body === Body.Moon ? GeoMoonState(time) : GeoEmbState(time);
      return new StateVector(state.x + bary.Sun.r.x + earth.r.x, state.y + bary.Sun.r.y + earth.r.y, state.z + bary.Sun.r.z + earth.r.z, state.vx + bary.Sun.v.x + earth.v.x, state.vy + bary.Sun.v.y + earth.v.y, state.vz + bary.Sun.v.z + earth.v.z, time);
  }
  if (body in vsop) {
    const planet = CalcVsopPosVel(vsop[body], time.tt);
    return new StateVector(bary.Sun.r.x + planet.r.x, bary.Sun.r.y + planet.r.y, bary.Sun.r.z + planet.r.z, bary.Sun.v.x + planet.v.x, bary.Sun.v.y + planet.v.y, bary.Sun.v.z + planet.v.z, time);
  }
  throw `BaryState: Unsupported body "${body}"`;
}
function HelioState(body, date) {
  const time = MakeTime(date);
  switch (body) {
    case Body.Sun:
      return new StateVector(0, 0, 0, 0, 0, 0, time);
    case Body.SSB:
      const bary = new major_bodies_t(time.tt);
      return new StateVector(-bary.Sun.r.x, -bary.Sun.r.y, -bary.Sun.r.z, -bary.Sun.v.x, -bary.Sun.v.y, -bary.Sun.v.z, time);
    case Body.Mercury:
    case Body.Venus:
    case Body.Earth:
    case Body.Mars:
    case Body.Jupiter:
    case Body.Saturn:
    case Body.Uranus:
    case Body.Neptune:
      const planet = CalcVsopPosVel(vsop[body], time.tt);
      return ExportState(planet, time);
    case Body.Pluto:
      return CalcPluto(time, true);
    case Body.Moon:
    case Body.EMB:
      const earth = CalcVsopPosVel(vsop.Earth, time.tt);
      const state = body == Body.Moon ? GeoMoonState(time) : GeoEmbState(time);
      return new StateVector(state.x + earth.r.x, state.y + earth.r.y, state.z + earth.r.z, state.vx + earth.v.x, state.vy + earth.v.y, state.vz + earth.v.z, time);
    default:
      if (UserDefinedStar(body)) {
        const vec = HelioVector(body, time);
        return new StateVector(vec.x, vec.y, vec.z, 0, 0, 0, time);
      }
      throw `HelioState: Unsupported body "${body}"`;
  }
}
function QuadInterp(tm, dt, fa, fm, fb) {
  let Q = (fb + fa) / 2 - fm;
  let R = (fb - fa) / 2;
  let S = fm;
  let x;
  if (Q == 0) {
    if (R == 0) {
      return null;
    }
    x = -S / R;
    if (x < -1 || x > 1)
      return null;
  } else {
    let u = R * R - 4 * Q * S;
    if (u <= 0)
      return null;
    let ru = Math.sqrt(u);
    let x1 = (-R + ru) / (2 * Q);
    let x2 = (-R - ru) / (2 * Q);
    if (-1 <= x1 && x1 <= 1) {
      if (-1 <= x2 && x2 <= 1)
        return null;
      x = x1;
    } else if (-1 <= x2 && x2 <= 1) {
      x = x2;
    } else {
      return null;
    }
  }
  let t = tm + x * dt;
  let df_dt = (2 * Q * x + R) / dt;
  return { t, df_dt };
}
function Search(f, t1, t2, options) {
  const dt_tolerance_seconds = VerifyNumber(options && options.dt_tolerance_seconds || 1);
  const dt_days = Math.abs(dt_tolerance_seconds / SECONDS_PER_DAY);
  let f1 = options && options.init_f1 || f(t1);
  let f2 = options && options.init_f2 || f(t2);
  let fmid = NaN;
  let iter = 0;
  let iter_limit = options && options.iter_limit || 20;
  let calc_fmid = true;
  while (true) {
    if (++iter > iter_limit)
      throw `Excessive iteration in Search()`;
    let tmid = InterpolateTime(t1, t2, 0.5);
    let dt = tmid.ut - t1.ut;
    if (Math.abs(dt) < dt_days) {
      return tmid;
    }
    if (calc_fmid)
      fmid = f(tmid);
    else
      calc_fmid = true;
    let q = QuadInterp(tmid.ut, t2.ut - tmid.ut, f1, fmid, f2);
    if (q) {
      let tq = MakeTime(q.t);
      let fq = f(tq);
      if (q.df_dt !== 0) {
        if (Math.abs(fq / q.df_dt) < dt_days) {
          return tq;
        }
        let dt_guess = 1.2 * Math.abs(fq / q.df_dt);
        if (dt_guess < dt / 10) {
          let tleft = tq.AddDays(-dt_guess);
          let tright = tq.AddDays(+dt_guess);
          if ((tleft.ut - t1.ut) * (tleft.ut - t2.ut) < 0) {
            if ((tright.ut - t1.ut) * (tright.ut - t2.ut) < 0) {
              let fleft = f(tleft);
              let fright = f(tright);
              if (fleft < 0 && fright >= 0) {
                f1 = fleft;
                f2 = fright;
                t1 = tleft;
                t2 = tright;
                fmid = fq;
                calc_fmid = false;
                continue;
              }
            }
          }
        }
      }
    }
    if (f1 < 0 && fmid >= 0) {
      t2 = tmid;
      f2 = fmid;
      continue;
    }
    if (fmid < 0 && f2 >= 0) {
      t1 = tmid;
      f1 = fmid;
      continue;
    }
    return null;
  }
}
function LongitudeOffset(diff) {
  let offset = diff;
  while (offset <= -180)
    offset += 360;
  while (offset > 180)
    offset -= 360;
  return offset;
}
function NormalizeLongitude(lon) {
  while (lon < 0)
    lon += 360;
  while (lon >= 360)
    lon -= 360;
  return lon;
}
function SearchSunLongitude(targetLon, dateStart, limitDays) {
  function sun_offset(t) {
    let pos = SunPosition(t);
    return LongitudeOffset(pos.elon - targetLon);
  }
  VerifyNumber(targetLon);
  VerifyNumber(limitDays);
  let t1 = MakeTime(dateStart);
  let t2 = t1.AddDays(limitDays);
  return Search(sun_offset, t1, t2, { dt_tolerance_seconds: 0.01 });
}
function PairLongitude(body1, body2, date) {
  if (body1 === Body.Earth || body2 === Body.Earth)
    throw "The Earth does not have a longitude as seen from itself.";
  const time = MakeTime(date);
  const vector1 = GeoVector(body1, time, false);
  const eclip1 = Ecliptic(vector1);
  const vector2 = GeoVector(body2, time, false);
  const eclip2 = Ecliptic(vector2);
  return NormalizeLongitude(eclip1.elon - eclip2.elon);
}
function AngleFromSun(body, date) {
  if (body == Body.Earth)
    throw "The Earth does not have an angle as seen from itself.";
  const time = MakeTime(date);
  const sv = GeoVector(Body.Sun, time, true);
  const bv = GeoVector(body, time, true);
  const angle = AngleBetween(sv, bv);
  return angle;
}
function EclipticLongitude(body, date) {
  if (body === Body.Sun)
    throw "Cannot calculate heliocentric longitude of the Sun.";
  const hv = HelioVector(body, date);
  const eclip = Ecliptic(hv);
  return eclip.elon;
}
function VisualMagnitude(body, phase, helio_dist, geo_dist) {
  let c0, c1 = 0, c2 = 0, c3 = 0;
  switch (body) {
    case Body.Mercury:
      c0 = -0.6;
      c1 = 4.98;
      c2 = -4.88;
      c3 = 3.02;
      break;
    case Body.Venus:
      if (phase < 163.6) {
        c0 = -4.47;
        c1 = 1.03;
        c2 = 0.57;
        c3 = 0.13;
      } else {
        c0 = 0.98;
        c1 = -1.02;
      }
      break;
    case Body.Mars:
      c0 = -1.52;
      c1 = 1.6;
      break;
    case Body.Jupiter:
      c0 = -9.4;
      c1 = 0.5;
      break;
    case Body.Uranus:
      c0 = -7.19;
      c1 = 0.25;
      break;
    case Body.Neptune:
      c0 = -6.87;
      break;
    case Body.Pluto:
      c0 = -1;
      c1 = 4;
      break;
    default:
      throw `VisualMagnitude: unsupported body ${body}`;
  }
  const x = phase / 100;
  let mag = c0 + x * (c1 + x * (c2 + x * c3));
  mag += 5 * Math.log10(helio_dist * geo_dist);
  return mag;
}
function SaturnMagnitude(phase, helio_dist, geo_dist, gc, time) {
  const eclip = Ecliptic(gc);
  const ir = DEG2RAD * 28.06;
  const Nr = DEG2RAD * (169.51 + 382e-7 * time.tt);
  const lat = DEG2RAD * eclip.elat;
  const lon = DEG2RAD * eclip.elon;
  const tilt = Math.asin(Math.sin(lat) * Math.cos(ir) - Math.cos(lat) * Math.sin(ir) * Math.sin(lon - Nr));
  const sin_tilt = Math.sin(Math.abs(tilt));
  let mag = -9 + 0.044 * phase;
  mag += sin_tilt * (-2.6 + 1.2 * sin_tilt);
  mag += 5 * Math.log10(helio_dist * geo_dist);
  return { mag, ring_tilt: RAD2DEG * tilt };
}
function MoonMagnitude(phase, helio_dist, geo_dist) {
  let rad2 = phase * DEG2RAD;
  let rad22 = rad2 * rad2;
  let rad4 = rad22 * rad22;
  let mag = -12.717 + 1.49 * Math.abs(rad2) + 0.0431 * rad4;
  const moon_mean_distance_au = 385000.6 / KM_PER_AU;
  let geo_au = geo_dist / moon_mean_distance_au;
  mag += 5 * Math.log10(helio_dist * geo_au);
  return mag;
}
var IlluminationInfo = class {
  constructor(time, mag, phase_angle, helio_dist, geo_dist, gc, hc, ring_tilt) {
    this.time = time;
    this.mag = mag;
    this.phase_angle = phase_angle;
    this.helio_dist = helio_dist;
    this.geo_dist = geo_dist;
    this.gc = gc;
    this.hc = hc;
    this.ring_tilt = ring_tilt;
    this.phase_fraction = (1 + Math.cos(DEG2RAD * phase_angle)) / 2;
  }
};
function Illumination(body, date) {
  if (body === Body.Earth)
    throw `The illumination of the Earth is not defined.`;
  const time = MakeTime(date);
  const earth = CalcVsop(vsop.Earth, time);
  let phase;
  let hc;
  let gc;
  let mag;
  if (body === Body.Sun) {
    gc = new Vector(-earth.x, -earth.y, -earth.z, time);
    hc = new Vector(0, 0, 0, time);
    phase = 0;
  } else {
    if (body === Body.Moon) {
      gc = GeoMoon(time);
      hc = new Vector(earth.x + gc.x, earth.y + gc.y, earth.z + gc.z, time);
    } else {
      hc = HelioVector(body, date);
      gc = new Vector(hc.x - earth.x, hc.y - earth.y, hc.z - earth.z, time);
    }
    phase = AngleBetween(gc, hc);
  }
  let geo_dist = gc.Length();
  let helio_dist = hc.Length();
  let ring_tilt;
  if (body === Body.Sun) {
    mag = SUN_MAG_1AU + 5 * Math.log10(geo_dist);
  } else if (body === Body.Moon) {
    mag = MoonMagnitude(phase, helio_dist, geo_dist);
  } else if (body === Body.Saturn) {
    const saturn = SaturnMagnitude(phase, helio_dist, geo_dist, gc, time);
    mag = saturn.mag;
    ring_tilt = saturn.ring_tilt;
  } else {
    mag = VisualMagnitude(body, phase, helio_dist, geo_dist);
  }
  return new IlluminationInfo(time, mag, phase, helio_dist, geo_dist, gc, hc, ring_tilt);
}
function SynodicPeriod(body) {
  if (body === Body.Earth)
    throw "The Earth does not have a synodic period as seen from itself.";
  if (body === Body.Moon)
    return MEAN_SYNODIC_MONTH;
  let planet = Planet[body];
  if (!planet)
    throw `Not a valid planet name: ${body}`;
  const Te = Planet.Earth.OrbitalPeriod;
  const Tp = planet.OrbitalPeriod;
  const synodicPeriod = Math.abs(Te / (Te / Tp - 1));
  return synodicPeriod;
}
function SearchRelativeLongitude(body, targetRelLon, startDate) {
  VerifyNumber(targetRelLon);
  const planet = Planet[body];
  if (!planet)
    throw `Cannot search relative longitude because body is not a planet: ${body}`;
  if (body === Body.Earth)
    throw "Cannot search relative longitude for the Earth (it is always 0)";
  const direction = planet.OrbitalPeriod > Planet.Earth.OrbitalPeriod ? 1 : -1;
  function offset(t) {
    const plon = EclipticLongitude(body, t);
    const elon = EclipticLongitude(Body.Earth, t);
    const diff = direction * (elon - plon);
    return LongitudeOffset(diff - targetRelLon);
  }
  let syn = SynodicPeriod(body);
  let time = MakeTime(startDate);
  let error_angle = offset(time);
  if (error_angle > 0)
    error_angle -= 360;
  for (let iter = 0; iter < 100; ++iter) {
    let day_adjust = -error_angle / 360 * syn;
    time = time.AddDays(day_adjust);
    if (Math.abs(day_adjust) * SECONDS_PER_DAY < 1)
      return time;
    let prev_angle = error_angle;
    error_angle = offset(time);
    if (Math.abs(prev_angle) < 30) {
      if (prev_angle !== error_angle) {
        let ratio = prev_angle / (prev_angle - error_angle);
        if (ratio > 0.5 && ratio < 2)
          syn *= ratio;
      }
    }
  }
  throw `Relative longitude search failed to converge for ${body} near ${time.toString()} (error_angle = ${error_angle}).`;
}
function MoonPhase(date) {
  return PairLongitude(Body.Moon, Body.Sun, date);
}
function SearchMoonPhase(targetLon, dateStart, limitDays) {
  function moon_offset(t) {
    let mlon = MoonPhase(t);
    return LongitudeOffset(mlon - targetLon);
  }
  VerifyNumber(targetLon);
  VerifyNumber(limitDays);
  const uncertainty = 1.5;
  const ta = MakeTime(dateStart);
  let ya = moon_offset(ta);
  let est_dt, dt1, dt2;
  if (limitDays < 0) {
    if (ya < 0)
      ya += 360;
    est_dt = -(MEAN_SYNODIC_MONTH * ya) / 360;
    dt2 = est_dt + uncertainty;
    if (dt2 < limitDays)
      return null;
    dt1 = Math.max(limitDays, est_dt - uncertainty);
  } else {
    if (ya > 0)
      ya -= 360;
    est_dt = -(MEAN_SYNODIC_MONTH * ya) / 360;
    dt1 = est_dt - uncertainty;
    if (dt1 > limitDays)
      return null;
    dt2 = Math.min(limitDays, est_dt + uncertainty);
  }
  const t1 = ta.AddDays(dt1);
  const t2 = ta.AddDays(dt2);
  return Search(moon_offset, t1, t2, { dt_tolerance_seconds: 0.1 });
}
var MoonQuarter = class {
  constructor(quarter, time) {
    this.quarter = quarter;
    this.time = time;
  }
};
function SearchMoonQuarter(dateStart) {
  let phaseStart = MoonPhase(dateStart);
  let quarterStart = Math.floor(phaseStart / 90);
  let quarter = (quarterStart + 1) % 4;
  let time = SearchMoonPhase(90 * quarter, dateStart, 10);
  if (!time)
    throw "Cannot find moon quarter";
  return new MoonQuarter(quarter, time);
}
function NextMoonQuarter(mq) {
  let date = new Date(mq.time.date.getTime() + 6 * MILLIS_PER_DAY);
  return SearchMoonQuarter(date);
}
var AtmosphereInfo = class {
  constructor(pressure, temperature, density) {
    this.pressure = pressure;
    this.temperature = temperature;
    this.density = density;
  }
};
function Atmosphere(elevationMeters) {
  const P0 = 101325;
  const T0 = 288.15;
  const T1 = 216.65;
  if (!Number.isFinite(elevationMeters) || elevationMeters < -500 || elevationMeters > 1e5)
    throw `Invalid elevation: ${elevationMeters}`;
  let temperature;
  let pressure;
  if (elevationMeters <= 11e3) {
    temperature = T0 - 65e-4 * elevationMeters;
    pressure = P0 * Math.pow(T0 / temperature, -5.25577);
  } else if (elevationMeters <= 2e4) {
    temperature = T1;
    pressure = 22632 * Math.exp(-15768832e-11 * (elevationMeters - 11e3));
  } else {
    temperature = T1 + 1e-3 * (elevationMeters - 2e4);
    pressure = 5474.87 * Math.pow(T1 / temperature, 34.16319);
  }
  const density = pressure / temperature / (P0 / T0);
  return new AtmosphereInfo(pressure, temperature, density);
}
function HorizonDipAngle(observer, metersAboveGround) {
  const phi = observer.latitude * DEG2RAD;
  const sinphi = Math.sin(phi);
  const cosphi = Math.cos(phi);
  const c = 1 / Math.hypot(cosphi, sinphi * EARTH_FLATTENING);
  const s = c * (EARTH_FLATTENING * EARTH_FLATTENING);
  const ht_km = (observer.height - metersAboveGround) / 1e3;
  const ach = EARTH_EQUATORIAL_RADIUS_KM * c + ht_km;
  const ash = EARTH_EQUATORIAL_RADIUS_KM * s + ht_km;
  const radius_m = 1e3 * Math.hypot(ach * cosphi, ash * sinphi);
  const k = 0.175 * Math.pow(1 - 65e-4 / 283.15 * (observer.height - 2 / 3 * metersAboveGround), 3.256);
  return RAD2DEG * -(Math.sqrt(2 * (1 - k) * metersAboveGround / radius_m) / (1 - k));
}
function BodyRadiusAu(body) {
  switch (body) {
    case Body.Sun:
      return SUN_RADIUS_AU;
    case Body.Moon:
      return MOON_EQUATORIAL_RADIUS_AU;
    default:
      return 0;
  }
}
function SearchRiseSet(body, observer, direction, dateStart, limitDays, metersAboveGround = 0) {
  if (!Number.isFinite(metersAboveGround) || metersAboveGround < 0)
    throw `Invalid value for metersAboveGround: ${metersAboveGround}`;
  const body_radius_au = BodyRadiusAu(body);
  const atmos = Atmosphere(observer.height - metersAboveGround);
  const dip = HorizonDipAngle(observer, metersAboveGround);
  const altitude = dip - REFRACTION_NEAR_HORIZON * atmos.density;
  return InternalSearchAltitude(body, observer, direction, dateStart, limitDays, body_radius_au, altitude);
}
function SearchAltitude(body, observer, direction, dateStart, limitDays, altitude) {
  if (!Number.isFinite(altitude) || altitude < -90 || altitude > 90)
    throw `Invalid altitude angle: ${altitude}`;
  return InternalSearchAltitude(body, observer, direction, dateStart, limitDays, 0, altitude);
}
var AscentInfo = class {
  constructor(tx, ty, ax, ay) {
    this.tx = tx;
    this.ty = ty;
    this.ax = ax;
    this.ay = ay;
  }
};
function FindAscent(depth, altdiff, max_deriv_alt, t1, t2, a1, a2) {
  if (a1 < 0 && a2 >= 0) {
    return new AscentInfo(t1, t2, a1, a2);
  }
  if (a1 >= 0 && a2 < 0) {
    return null;
  }
  if (depth > 17) {
    throw `Excessive recursion in rise/set ascent search.`;
  }
  const dt = t2.ut - t1.ut;
  if (dt * SECONDS_PER_DAY < 1)
    return null;
  const da = Math.min(Math.abs(a1), Math.abs(a2));
  if (da > max_deriv_alt * (dt / 2)) {
    return null;
  }
  const tmid = new AstroTime((t1.ut + t2.ut) / 2);
  const amid = altdiff(tmid);
  return FindAscent(1 + depth, altdiff, max_deriv_alt, t1, tmid, a1, amid) || FindAscent(1 + depth, altdiff, max_deriv_alt, tmid, t2, amid, a2);
}
function MaxAltitudeSlope(body, latitude) {
  if (latitude < -90 || latitude > 90)
    throw `Invalid geographic latitude: ${latitude}`;
  let deriv_ra;
  let deriv_dec;
  switch (body) {
    case Body.Moon:
      deriv_ra = 4.5;
      deriv_dec = 8.2;
      break;
    case Body.Sun:
      deriv_ra = 0.8;
      deriv_dec = 0.5;
      break;
    case Body.Mercury:
      deriv_ra = -1.6;
      deriv_dec = 1;
      break;
    case Body.Venus:
      deriv_ra = -0.8;
      deriv_dec = 0.6;
      break;
    case Body.Mars:
      deriv_ra = -0.5;
      deriv_dec = 0.4;
      break;
    case Body.Jupiter:
    case Body.Saturn:
    case Body.Uranus:
    case Body.Neptune:
    case Body.Pluto:
      deriv_ra = -0.2;
      deriv_dec = 0.2;
      break;
    case Body.Star1:
    case Body.Star2:
    case Body.Star3:
    case Body.Star4:
    case Body.Star5:
    case Body.Star6:
    case Body.Star7:
    case Body.Star8:
      deriv_ra = -8e-3;
      deriv_dec = 8e-3;
      break;
    default:
      throw `Body not allowed for altitude search: ${body}`;
  }
  const latrad = DEG2RAD * latitude;
  return Math.abs((360 / SOLAR_DAYS_PER_SIDEREAL_DAY - deriv_ra) * Math.cos(latrad)) + Math.abs(deriv_dec * Math.sin(latrad));
}
function InternalSearchAltitude(body, observer, direction, dateStart, limitDays, bodyRadiusAu, targetAltitude) {
  VerifyObserver(observer);
  VerifyNumber(limitDays);
  VerifyNumber(bodyRadiusAu);
  VerifyNumber(targetAltitude);
  if (targetAltitude < -90 || targetAltitude > 90)
    throw `Invalid target altitude angle: ${targetAltitude}`;
  const RISE_SET_DT = 0.42;
  const max_deriv_alt = MaxAltitudeSlope(body, observer.latitude);
  function altdiff(time) {
    const ofdate = Equator(body, time, observer, true, true);
    const hor = Horizon(time, observer, ofdate.ra, ofdate.dec);
    const altitude = hor.altitude + RAD2DEG * Math.asin(bodyRadiusAu / ofdate.dist);
    return direction * (altitude - targetAltitude);
  }
  const startTime = MakeTime(dateStart);
  let t1 = startTime;
  let t2 = startTime;
  let a1 = altdiff(t1);
  let a2 = a1;
  for (; ; ) {
    if (limitDays < 0) {
      t1 = t2.AddDays(-RISE_SET_DT);
      a1 = altdiff(t1);
    } else {
      t2 = t1.AddDays(+RISE_SET_DT);
      a2 = altdiff(t2);
    }
    const ascent = FindAscent(0, altdiff, max_deriv_alt, t1, t2, a1, a2);
    if (ascent) {
      const time = Search(altdiff, ascent.tx, ascent.ty, {
        dt_tolerance_seconds: 0.1,
        init_f1: ascent.ax,
        init_f2: ascent.ay
      });
      if (time) {
        if (limitDays < 0) {
          if (time.ut < startTime.ut + limitDays)
            return null;
        } else {
          if (time.ut > startTime.ut + limitDays)
            return null;
        }
        return time;
      }
      throw `Rise/set search failed after finding ascent: t1=${t1}, t2=${t2}, a1=${a1}, a2=${a2}`;
    }
    if (limitDays < 0) {
      if (t1.ut < startTime.ut + limitDays)
        return null;
      t2 = t1;
      a2 = a1;
    } else {
      if (t2.ut > startTime.ut + limitDays)
        return null;
      t1 = t2;
      a1 = a2;
    }
  }
}
var HourAngleEvent = class {
  constructor(time, hor) {
    this.time = time;
    this.hor = hor;
  }
};
function SearchHourAngle(body, observer, hourAngle, dateStart, direction = 1) {
  VerifyObserver(observer);
  let time = MakeTime(dateStart);
  let iter = 0;
  if (body === Body.Earth)
    throw "Cannot search for hour angle of the Earth.";
  VerifyNumber(hourAngle);
  if (hourAngle < 0 || hourAngle >= 24)
    throw `Invalid hour angle ${hourAngle}`;
  VerifyNumber(direction);
  if (direction === 0)
    throw `Direction must be positive or negative.`;
  while (true) {
    ++iter;
    let gast = sidereal_time(time);
    let ofdate = Equator(body, time, observer, true, true);
    let delta_sidereal_hours = (hourAngle + ofdate.ra - observer.longitude / 15 - gast) % 24;
    if (iter === 1) {
      if (direction > 0) {
        if (delta_sidereal_hours < 0)
          delta_sidereal_hours += 24;
      } else {
        if (delta_sidereal_hours > 0)
          delta_sidereal_hours -= 24;
      }
    } else {
      if (delta_sidereal_hours < -12)
        delta_sidereal_hours += 24;
      else if (delta_sidereal_hours > 12)
        delta_sidereal_hours -= 24;
    }
    if (Math.abs(delta_sidereal_hours) * 3600 < 0.1) {
      const hor = Horizon(time, observer, ofdate.ra, ofdate.dec, "normal");
      return new HourAngleEvent(time, hor);
    }
    let delta_days = delta_sidereal_hours / 24 * SOLAR_DAYS_PER_SIDEREAL_DAY;
    time = time.AddDays(delta_days);
  }
}
function HourAngle(body, date, observer) {
  const time = MakeTime(date);
  const gast = SiderealTime(time);
  const ofdate = Equator(body, time, observer, true, true);
  let hourAngle = (observer.longitude / 15 + gast - ofdate.ra) % 24;
  if (hourAngle < 0)
    hourAngle += 24;
  return hourAngle;
}
var SeasonInfo = class {
  constructor(mar_equinox, jun_solstice, sep_equinox, dec_solstice) {
    this.mar_equinox = mar_equinox;
    this.jun_solstice = jun_solstice;
    this.sep_equinox = sep_equinox;
    this.dec_solstice = dec_solstice;
  }
};
function Seasons(year) {
  function find(targetLon, month, day) {
    let startDate = new Date(Date.UTC(year, month - 1, day));
    let time = SearchSunLongitude(targetLon, startDate, 20);
    if (!time)
      throw `Cannot find season change near ${startDate.toISOString()}`;
    return time;
  }
  if (year instanceof Date && Number.isFinite(year.getTime()))
    year = year.getUTCFullYear();
  if (!Number.isSafeInteger(year))
    throw `Cannot calculate seasons because year argument ${year} is neither a Date nor a safe integer.`;
  let mar_equinox = find(0, 3, 10);
  let jun_solstice = find(90, 6, 10);
  let sep_equinox = find(180, 9, 10);
  let dec_solstice = find(270, 12, 10);
  return new SeasonInfo(mar_equinox, jun_solstice, sep_equinox, dec_solstice);
}
var ElongationEvent = class {
  constructor(time, visibility, elongation, ecliptic_separation) {
    this.time = time;
    this.visibility = visibility;
    this.elongation = elongation;
    this.ecliptic_separation = ecliptic_separation;
  }
};
function Elongation(body, date) {
  let time = MakeTime(date);
  let lon = PairLongitude(body, Body.Sun, time);
  let vis;
  if (lon > 180) {
    vis = "morning";
    lon = 360 - lon;
  } else {
    vis = "evening";
  }
  let angle = AngleFromSun(body, time);
  return new ElongationEvent(time, vis, angle, lon);
}
function SearchMaxElongation(body, startDate) {
  const dt = 0.01;
  function neg_slope(t) {
    const t1 = t.AddDays(-dt / 2);
    const t2 = t.AddDays(+dt / 2);
    let e1 = AngleFromSun(body, t1);
    let e2 = AngleFromSun(body, t2);
    let m = (e1 - e2) / dt;
    return m;
  }
  let startTime = MakeTime(startDate);
  const table = {
    Mercury: { s1: 50, s2: 85 },
    Venus: { s1: 40, s2: 50 }
  };
  const planet = table[body];
  if (!planet)
    throw "SearchMaxElongation works for Mercury and Venus only.";
  let iter = 0;
  while (++iter <= 2) {
    let plon = EclipticLongitude(body, startTime);
    let elon = EclipticLongitude(Body.Earth, startTime);
    let rlon = LongitudeOffset(plon - elon);
    let rlon_lo, rlon_hi, adjust_days;
    if (rlon >= -planet.s1 && rlon < +planet.s1) {
      adjust_days = 0;
      rlon_lo = +planet.s1;
      rlon_hi = +planet.s2;
    } else if (rlon >= +planet.s2 || rlon < -planet.s2) {
      adjust_days = 0;
      rlon_lo = -planet.s2;
      rlon_hi = -planet.s1;
    } else if (rlon >= 0) {
      adjust_days = -SynodicPeriod(body) / 4;
      rlon_lo = +planet.s1;
      rlon_hi = +planet.s2;
    } else {
      adjust_days = -SynodicPeriod(body) / 4;
      rlon_lo = -planet.s2;
      rlon_hi = -planet.s1;
    }
    let t_start = startTime.AddDays(adjust_days);
    let t1 = SearchRelativeLongitude(body, rlon_lo, t_start);
    let t2 = SearchRelativeLongitude(body, rlon_hi, t1);
    let m1 = neg_slope(t1);
    if (m1 >= 0)
      throw `SearchMaxElongation: internal error: m1 = ${m1}`;
    let m2 = neg_slope(t2);
    if (m2 <= 0)
      throw `SearchMaxElongation: internal error: m2 = ${m2}`;
    let tx = Search(neg_slope, t1, t2, { init_f1: m1, init_f2: m2, dt_tolerance_seconds: 10 });
    if (!tx)
      throw `SearchMaxElongation: failed search iter ${iter} (t1=${t1.toString()}, t2=${t2.toString()})`;
    if (tx.tt >= startTime.tt)
      return Elongation(body, tx);
    startTime = t2.AddDays(1);
  }
  throw `SearchMaxElongation: failed to find event after 2 tries.`;
}
function SearchPeakMagnitude(body, startDate) {
  if (body !== Body.Venus)
    throw "SearchPeakMagnitude currently works for Venus only.";
  const dt = 0.01;
  function slope(t) {
    const t1 = t.AddDays(-dt / 2);
    const t2 = t.AddDays(+dt / 2);
    const y1 = Illumination(body, t1).mag;
    const y2 = Illumination(body, t2).mag;
    const m = (y2 - y1) / dt;
    return m;
  }
  let startTime = MakeTime(startDate);
  const s1 = 10;
  const s2 = 30;
  let iter = 0;
  while (++iter <= 2) {
    let plon = EclipticLongitude(body, startTime);
    let elon = EclipticLongitude(Body.Earth, startTime);
    let rlon = LongitudeOffset(plon - elon);
    let rlon_lo, rlon_hi, adjust_days;
    if (rlon >= -s1 && rlon < +s1) {
      adjust_days = 0;
      rlon_lo = +s1;
      rlon_hi = +s2;
    } else if (rlon >= +s2 || rlon < -s2) {
      adjust_days = 0;
      rlon_lo = -s2;
      rlon_hi = -s1;
    } else if (rlon >= 0) {
      adjust_days = -SynodicPeriod(body) / 4;
      rlon_lo = +s1;
      rlon_hi = +s2;
    } else {
      adjust_days = -SynodicPeriod(body) / 4;
      rlon_lo = -s2;
      rlon_hi = -s1;
    }
    let t_start = startTime.AddDays(adjust_days);
    let t1 = SearchRelativeLongitude(body, rlon_lo, t_start);
    let t2 = SearchRelativeLongitude(body, rlon_hi, t1);
    let m1 = slope(t1);
    if (m1 >= 0)
      throw `SearchPeakMagnitude: internal error: m1 = ${m1}`;
    let m2 = slope(t2);
    if (m2 <= 0)
      throw `SearchPeakMagnitude: internal error: m2 = ${m2}`;
    let tx = Search(slope, t1, t2, { init_f1: m1, init_f2: m2, dt_tolerance_seconds: 10 });
    if (!tx)
      throw `SearchPeakMagnitude: failed search iter ${iter} (t1=${t1.toString()}, t2=${t2.toString()})`;
    if (tx.tt >= startTime.tt)
      return Illumination(body, tx);
    startTime = t2.AddDays(1);
  }
  throw `SearchPeakMagnitude: failed to find event after 2 tries.`;
}
var ApsisKind;
(function(ApsisKind2) {
  ApsisKind2[ApsisKind2["Pericenter"] = 0] = "Pericenter";
  ApsisKind2[ApsisKind2["Apocenter"] = 1] = "Apocenter";
})(ApsisKind || (ApsisKind = {}));
var Apsis = class {
  constructor(time, kind, dist_au) {
    this.time = time;
    this.kind = kind;
    this.dist_au = dist_au;
    this.dist_km = dist_au * KM_PER_AU;
  }
};
function SearchLunarApsis(startDate) {
  const dt = 1e-3;
  function distance_slope(t) {
    let t12 = t.AddDays(-dt / 2);
    let t2 = t.AddDays(+dt / 2);
    let r1 = CalcMoon(t12).distance_au;
    let r2 = CalcMoon(t2).distance_au;
    let m = (r2 - r1) / dt;
    return m;
  }
  function negative_distance_slope(t) {
    return -distance_slope(t);
  }
  let t1 = MakeTime(startDate);
  let m1 = distance_slope(t1);
  const increment = 5;
  for (var iter = 0; iter * increment < 2 * MEAN_SYNODIC_MONTH; ++iter) {
    let t2 = t1.AddDays(increment);
    let m2 = distance_slope(t2);
    if (m1 * m2 <= 0) {
      if (m1 < 0 || m2 > 0) {
        let tx = Search(distance_slope, t1, t2, { init_f1: m1, init_f2: m2 });
        if (!tx)
          throw "SearchLunarApsis INTERNAL ERROR: perigee search failed!";
        let dist = CalcMoon(tx).distance_au;
        return new Apsis(tx, 0, dist);
      }
      if (m1 > 0 || m2 < 0) {
        let tx = Search(negative_distance_slope, t1, t2, { init_f1: -m1, init_f2: -m2 });
        if (!tx)
          throw "SearchLunarApsis INTERNAL ERROR: apogee search failed!";
        let dist = CalcMoon(tx).distance_au;
        return new Apsis(tx, 1, dist);
      }
      throw "SearchLunarApsis INTERNAL ERROR: cannot classify apsis event!";
    }
    t1 = t2;
    m1 = m2;
  }
  throw "SearchLunarApsis INTERNAL ERROR: could not find apsis within 2 synodic months of start date.";
}
function NextLunarApsis(apsis) {
  const skip = 11;
  let next = SearchLunarApsis(apsis.time.AddDays(skip));
  if (next.kind + apsis.kind !== 1)
    throw `NextLunarApsis INTERNAL ERROR: did not find alternating apogee/perigee: prev=${apsis.kind} @ ${apsis.time.toString()}, next=${next.kind} @ ${next.time.toString()}`;
  return next;
}
function PlanetExtreme(body, kind, start_time, dayspan) {
  const direction = kind === ApsisKind.Apocenter ? 1 : -1;
  const npoints = 10;
  for (; ; ) {
    const interval = dayspan / (npoints - 1);
    if (interval < 1 / 1440) {
      const apsis_time = start_time.AddDays(interval / 2);
      const dist_au = HelioDistance(body, apsis_time);
      return new Apsis(apsis_time, kind, dist_au);
    }
    let best_i = -1;
    let best_dist = 0;
    for (let i = 0; i < npoints; ++i) {
      const time = start_time.AddDays(i * interval);
      const dist = direction * HelioDistance(body, time);
      if (i == 0 || dist > best_dist) {
        best_i = i;
        best_dist = dist;
      }
    }
    start_time = start_time.AddDays((best_i - 1) * interval);
    dayspan = 2 * interval;
  }
}
function BruteSearchPlanetApsis(body, startTime) {
  const npoints = 100;
  const t1 = startTime.AddDays(Planet[body].OrbitalPeriod * (-30 / 360));
  const t2 = startTime.AddDays(Planet[body].OrbitalPeriod * (270 / 360));
  let t_min = t1;
  let t_max = t1;
  let min_dist = -1;
  let max_dist = -1;
  const interval = (t2.ut - t1.ut) / (npoints - 1);
  for (let i = 0; i < npoints; ++i) {
    const time = t1.AddDays(i * interval);
    const dist = HelioDistance(body, time);
    if (i === 0) {
      max_dist = min_dist = dist;
    } else {
      if (dist > max_dist) {
        max_dist = dist;
        t_max = time;
      }
      if (dist < min_dist) {
        min_dist = dist;
        t_min = time;
      }
    }
  }
  const perihelion = PlanetExtreme(body, 0, t_min.AddDays(-2 * interval), 4 * interval);
  const aphelion = PlanetExtreme(body, 1, t_max.AddDays(-2 * interval), 4 * interval);
  if (perihelion.time.tt >= startTime.tt) {
    if (aphelion.time.tt >= startTime.tt && aphelion.time.tt < perihelion.time.tt)
      return aphelion;
    return perihelion;
  }
  if (aphelion.time.tt >= startTime.tt)
    return aphelion;
  throw "Internal error: failed to find Neptune apsis.";
}
function SearchPlanetApsis(body, startTime) {
  startTime = MakeTime(startTime);
  if (body === Body.Neptune || body === Body.Pluto)
    return BruteSearchPlanetApsis(body, startTime);
  function positive_slope(t) {
    const dt = 1e-3;
    let t12 = t.AddDays(-dt / 2);
    let t2 = t.AddDays(+dt / 2);
    let r1 = HelioDistance(body, t12);
    let r2 = HelioDistance(body, t2);
    let m = (r2 - r1) / dt;
    return m;
  }
  function negative_slope(t) {
    return -positive_slope(t);
  }
  const orbit_period_days = Planet[body].OrbitalPeriod;
  const increment = orbit_period_days / 6;
  let t1 = startTime;
  let m1 = positive_slope(t1);
  for (let iter = 0; iter * increment < 2 * orbit_period_days; ++iter) {
    const t2 = t1.AddDays(increment);
    const m2 = positive_slope(t2);
    if (m1 * m2 <= 0) {
      let slope_func;
      let kind;
      if (m1 < 0 || m2 > 0) {
        slope_func = positive_slope;
        kind = ApsisKind.Pericenter;
      } else if (m1 > 0 || m2 < 0) {
        slope_func = negative_slope;
        kind = ApsisKind.Apocenter;
      } else {
        throw "Internal error with slopes in SearchPlanetApsis";
      }
      const search = Search(slope_func, t1, t2);
      if (!search)
        throw "Failed to find slope transition in planetary apsis search.";
      const dist = HelioDistance(body, search);
      return new Apsis(search, kind, dist);
    }
    t1 = t2;
    m1 = m2;
  }
  throw "Internal error: should have found planetary apsis within 2 orbital periods.";
}
function NextPlanetApsis(body, apsis) {
  if (apsis.kind !== ApsisKind.Pericenter && apsis.kind !== ApsisKind.Apocenter)
    throw `Invalid apsis kind: ${apsis.kind}`;
  const skip = 0.25 * Planet[body].OrbitalPeriod;
  const time = apsis.time.AddDays(skip);
  const next = SearchPlanetApsis(body, time);
  if (next.kind + apsis.kind !== 1)
    throw `Internal error: previous apsis was ${apsis.kind}, but found ${next.kind} for next apsis.`;
  return next;
}
function InverseRotation(rotation) {
  return new RotationMatrix([
    [rotation.rot[0][0], rotation.rot[1][0], rotation.rot[2][0]],
    [rotation.rot[0][1], rotation.rot[1][1], rotation.rot[2][1]],
    [rotation.rot[0][2], rotation.rot[1][2], rotation.rot[2][2]]
  ]);
}
function CombineRotation(a, b) {
  return new RotationMatrix([
    [
      b.rot[0][0] * a.rot[0][0] + b.rot[1][0] * a.rot[0][1] + b.rot[2][0] * a.rot[0][2],
      b.rot[0][1] * a.rot[0][0] + b.rot[1][1] * a.rot[0][1] + b.rot[2][1] * a.rot[0][2],
      b.rot[0][2] * a.rot[0][0] + b.rot[1][2] * a.rot[0][1] + b.rot[2][2] * a.rot[0][2]
    ],
    [
      b.rot[0][0] * a.rot[1][0] + b.rot[1][0] * a.rot[1][1] + b.rot[2][0] * a.rot[1][2],
      b.rot[0][1] * a.rot[1][0] + b.rot[1][1] * a.rot[1][1] + b.rot[2][1] * a.rot[1][2],
      b.rot[0][2] * a.rot[1][0] + b.rot[1][2] * a.rot[1][1] + b.rot[2][2] * a.rot[1][2]
    ],
    [
      b.rot[0][0] * a.rot[2][0] + b.rot[1][0] * a.rot[2][1] + b.rot[2][0] * a.rot[2][2],
      b.rot[0][1] * a.rot[2][0] + b.rot[1][1] * a.rot[2][1] + b.rot[2][1] * a.rot[2][2],
      b.rot[0][2] * a.rot[2][0] + b.rot[1][2] * a.rot[2][1] + b.rot[2][2] * a.rot[2][2]
    ]
  ]);
}
function IdentityMatrix() {
  return new RotationMatrix([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ]);
}
function Pivot(rotation, axis, angle) {
  if (axis !== 0 && axis !== 1 && axis !== 2)
    throw `Invalid axis ${axis}. Must be [0, 1, 2].`;
  const radians = VerifyNumber(angle) * DEG2RAD;
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  const i = (axis + 1) % 3;
  const j = (axis + 2) % 3;
  const k = axis;
  let rot = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  rot[i][i] = c * rotation.rot[i][i] - s * rotation.rot[i][j];
  rot[i][j] = s * rotation.rot[i][i] + c * rotation.rot[i][j];
  rot[i][k] = rotation.rot[i][k];
  rot[j][i] = c * rotation.rot[j][i] - s * rotation.rot[j][j];
  rot[j][j] = s * rotation.rot[j][i] + c * rotation.rot[j][j];
  rot[j][k] = rotation.rot[j][k];
  rot[k][i] = c * rotation.rot[k][i] - s * rotation.rot[k][j];
  rot[k][j] = s * rotation.rot[k][i] + c * rotation.rot[k][j];
  rot[k][k] = rotation.rot[k][k];
  return new RotationMatrix(rot);
}
function VectorFromSphere(sphere, time) {
  time = MakeTime(time);
  const radlat = sphere.lat * DEG2RAD;
  const radlon = sphere.lon * DEG2RAD;
  const rcoslat = sphere.dist * Math.cos(radlat);
  return new Vector(rcoslat * Math.cos(radlon), rcoslat * Math.sin(radlon), sphere.dist * Math.sin(radlat), time);
}
function EquatorFromVector(vec) {
  const sphere = SphereFromVector(vec);
  return new EquatorialCoordinates(sphere.lon / 15, sphere.lat, sphere.dist, vec);
}
function SphereFromVector(vector) {
  const xyproj = vector.x * vector.x + vector.y * vector.y;
  const dist = Math.sqrt(xyproj + vector.z * vector.z);
  let lat, lon;
  if (xyproj === 0) {
    if (vector.z === 0)
      throw "Zero-length vector not allowed.";
    lon = 0;
    lat = vector.z < 0 ? -90 : 90;
  } else {
    lon = RAD2DEG * Math.atan2(vector.y, vector.x);
    if (lon < 0)
      lon += 360;
    lat = RAD2DEG * Math.atan2(vector.z, Math.sqrt(xyproj));
  }
  return new Spherical(lat, lon, dist);
}
function ToggleAzimuthDirection(az) {
  az = 360 - az;
  if (az >= 360)
    az -= 360;
  else if (az < 0)
    az += 360;
  return az;
}
function HorizonFromVector(vector, refraction) {
  const sphere = SphereFromVector(vector);
  sphere.lon = ToggleAzimuthDirection(sphere.lon);
  sphere.lat += Refraction(refraction, sphere.lat);
  return sphere;
}
function VectorFromHorizon(sphere, time, refraction) {
  time = MakeTime(time);
  const lon = ToggleAzimuthDirection(sphere.lon);
  const lat = sphere.lat + InverseRefraction(refraction, sphere.lat);
  const xsphere = new Spherical(lat, lon, sphere.dist);
  return VectorFromSphere(xsphere, time);
}
function Refraction(refraction, altitude) {
  let refr;
  VerifyNumber(altitude);
  if (altitude < -90 || altitude > 90)
    return 0;
  if (refraction === "normal" || refraction === "jplhor") {
    let hd = altitude;
    if (hd < -1)
      hd = -1;
    refr = 1.02 / Math.tan((hd + 10.3 / (hd + 5.11)) * DEG2RAD) / 60;
    if (refraction === "normal" && altitude < -1) {
      refr *= (altitude + 90) / 89;
    }
  } else if (!refraction) {
    refr = 0;
  } else {
    throw `Invalid refraction option: ${refraction}`;
  }
  return refr;
}
function InverseRefraction(refraction, bent_altitude) {
  if (bent_altitude < -90 || bent_altitude > 90)
    return 0;
  let altitude = bent_altitude - Refraction(refraction, bent_altitude);
  for (; ; ) {
    let diff = altitude + Refraction(refraction, altitude) - bent_altitude;
    if (Math.abs(diff) < 1e-14)
      return altitude - bent_altitude;
    altitude -= diff;
  }
}
function RotateVector(rotation, vector) {
  return new Vector(rotation.rot[0][0] * vector.x + rotation.rot[1][0] * vector.y + rotation.rot[2][0] * vector.z, rotation.rot[0][1] * vector.x + rotation.rot[1][1] * vector.y + rotation.rot[2][1] * vector.z, rotation.rot[0][2] * vector.x + rotation.rot[1][2] * vector.y + rotation.rot[2][2] * vector.z, vector.t);
}
function RotateState(rotation, state) {
  return new StateVector(rotation.rot[0][0] * state.x + rotation.rot[1][0] * state.y + rotation.rot[2][0] * state.z, rotation.rot[0][1] * state.x + rotation.rot[1][1] * state.y + rotation.rot[2][1] * state.z, rotation.rot[0][2] * state.x + rotation.rot[1][2] * state.y + rotation.rot[2][2] * state.z, rotation.rot[0][0] * state.vx + rotation.rot[1][0] * state.vy + rotation.rot[2][0] * state.vz, rotation.rot[0][1] * state.vx + rotation.rot[1][1] * state.vy + rotation.rot[2][1] * state.vz, rotation.rot[0][2] * state.vx + rotation.rot[1][2] * state.vy + rotation.rot[2][2] * state.vz, state.t);
}
function Rotation_EQJ_ECL() {
  const c = 0.9174821430670688;
  const s = 0.3977769691083922;
  return new RotationMatrix([
    [1, 0, 0],
    [0, +c, -s],
    [0, +s, +c]
  ]);
}
function Rotation_ECL_EQJ() {
  const c = 0.9174821430670688;
  const s = 0.3977769691083922;
  return new RotationMatrix([
    [1, 0, 0],
    [0, +c, +s],
    [0, -s, +c]
  ]);
}
function Rotation_EQJ_EQD(time) {
  time = MakeTime(time);
  const prec = precession_rot(time, PrecessDirection.From2000);
  const nut = nutation_rot(time, PrecessDirection.From2000);
  return CombineRotation(prec, nut);
}
function Rotation_EQJ_ECT(time) {
  const t = MakeTime(time);
  const rot = Rotation_EQJ_EQD(t);
  const step = Rotation_EQD_ECT(t);
  return CombineRotation(rot, step);
}
function Rotation_ECT_EQJ(time) {
  const t = MakeTime(time);
  const rot = Rotation_ECT_EQD(t);
  const step = Rotation_EQD_EQJ(t);
  return CombineRotation(rot, step);
}
function Rotation_EQD_EQJ(time) {
  time = MakeTime(time);
  const nut = nutation_rot(time, PrecessDirection.Into2000);
  const prec = precession_rot(time, PrecessDirection.Into2000);
  return CombineRotation(nut, prec);
}
function Rotation_EQD_HOR(time, observer) {
  time = MakeTime(time);
  const sinlat = Math.sin(observer.latitude * DEG2RAD);
  const coslat = Math.cos(observer.latitude * DEG2RAD);
  const sinlon = Math.sin(observer.longitude * DEG2RAD);
  const coslon = Math.cos(observer.longitude * DEG2RAD);
  const uze = [coslat * coslon, coslat * sinlon, sinlat];
  const une = [-sinlat * coslon, -sinlat * sinlon, coslat];
  const uwe = [sinlon, -coslon, 0];
  const spin_angle = -15 * sidereal_time(time);
  const uz = spin(spin_angle, uze);
  const un = spin(spin_angle, une);
  const uw = spin(spin_angle, uwe);
  return new RotationMatrix([
    [un[0], uw[0], uz[0]],
    [un[1], uw[1], uz[1]],
    [un[2], uw[2], uz[2]]
  ]);
}
function Rotation_HOR_EQD(time, observer) {
  const rot = Rotation_EQD_HOR(time, observer);
  return InverseRotation(rot);
}
function Rotation_HOR_EQJ(time, observer) {
  time = MakeTime(time);
  const hor_eqd = Rotation_HOR_EQD(time, observer);
  const eqd_eqj = Rotation_EQD_EQJ(time);
  return CombineRotation(hor_eqd, eqd_eqj);
}
function Rotation_EQJ_HOR(time, observer) {
  const rot = Rotation_HOR_EQJ(time, observer);
  return InverseRotation(rot);
}
function Rotation_EQD_ECL(time) {
  const eqd_eqj = Rotation_EQD_EQJ(time);
  const eqj_ecl = Rotation_EQJ_ECL();
  return CombineRotation(eqd_eqj, eqj_ecl);
}
function Rotation_ECL_EQD(time) {
  const rot = Rotation_EQD_ECL(time);
  return InverseRotation(rot);
}
function Rotation_ECL_HOR(time, observer) {
  time = MakeTime(time);
  const ecl_eqd = Rotation_ECL_EQD(time);
  const eqd_hor = Rotation_EQD_HOR(time, observer);
  return CombineRotation(ecl_eqd, eqd_hor);
}
function Rotation_HOR_ECL(time, observer) {
  const rot = Rotation_ECL_HOR(time, observer);
  return InverseRotation(rot);
}
function Rotation_EQJ_GAL() {
  return new RotationMatrix([
    [-0.0548624779711344, 0.4941095946388765, -0.8676668813529025],
    [-0.8734572784246782, -0.4447938112296831, -0.1980677870294097],
    [-0.483800052994852, 0.7470034631630423, 0.4559861124470794]
  ]);
}
function Rotation_GAL_EQJ() {
  return new RotationMatrix([
    [-0.0548624779711344, -0.8734572784246782, -0.483800052994852],
    [0.4941095946388765, -0.4447938112296831, 0.7470034631630423],
    [-0.8676668813529025, -0.1980677870294097, 0.4559861124470794]
  ]);
}
function Rotation_ECT_EQD(time) {
  const et = e_tilt(MakeTime(time));
  const tobl = et.tobl * DEG2RAD;
  const c = Math.cos(tobl);
  const s = Math.sin(tobl);
  return new RotationMatrix([
    [1, 0, 0],
    [0, +c, +s],
    [0, -s, +c]
  ]);
}
function Rotation_EQD_ECT(time) {
  const et = e_tilt(MakeTime(time));
  const tobl = et.tobl * DEG2RAD;
  const c = Math.cos(tobl);
  const s = Math.sin(tobl);
  return new RotationMatrix([
    [1, 0, 0],
    [0, +c, -s],
    [0, +s, +c]
  ]);
}
var ConstelNames = [
  ["And", "Andromeda"],
  ["Ant", "Antila"],
  ["Aps", "Apus"],
  ["Aql", "Aquila"],
  ["Aqr", "Aquarius"],
  ["Ara", "Ara"],
  ["Ari", "Aries"],
  ["Aur", "Auriga"],
  ["Boo", "Bootes"],
  ["Cae", "Caelum"],
  ["Cam", "Camelopardis"],
  ["Cap", "Capricornus"],
  ["Car", "Carina"],
  ["Cas", "Cassiopeia"],
  ["Cen", "Centaurus"],
  ["Cep", "Cepheus"],
  ["Cet", "Cetus"],
  ["Cha", "Chamaeleon"],
  ["Cir", "Circinus"],
  ["CMa", "Canis Major"],
  ["CMi", "Canis Minor"],
  ["Cnc", "Cancer"],
  ["Col", "Columba"],
  ["Com", "Coma Berenices"],
  ["CrA", "Corona Australis"],
  ["CrB", "Corona Borealis"],
  ["Crt", "Crater"],
  ["Cru", "Crux"],
  ["Crv", "Corvus"],
  ["CVn", "Canes Venatici"],
  ["Cyg", "Cygnus"],
  ["Del", "Delphinus"],
  ["Dor", "Dorado"],
  ["Dra", "Draco"],
  ["Equ", "Equuleus"],
  ["Eri", "Eridanus"],
  ["For", "Fornax"],
  ["Gem", "Gemini"],
  ["Gru", "Grus"],
  ["Her", "Hercules"],
  ["Hor", "Horologium"],
  ["Hya", "Hydra"],
  ["Hyi", "Hydrus"],
  ["Ind", "Indus"],
  ["Lac", "Lacerta"],
  ["Leo", "Leo"],
  ["Lep", "Lepus"],
  ["Lib", "Libra"],
  ["LMi", "Leo Minor"],
  ["Lup", "Lupus"],
  ["Lyn", "Lynx"],
  ["Lyr", "Lyra"],
  ["Men", "Mensa"],
  ["Mic", "Microscopium"],
  ["Mon", "Monoceros"],
  ["Mus", "Musca"],
  ["Nor", "Norma"],
  ["Oct", "Octans"],
  ["Oph", "Ophiuchus"],
  ["Ori", "Orion"],
  ["Pav", "Pavo"],
  ["Peg", "Pegasus"],
  ["Per", "Perseus"],
  ["Phe", "Phoenix"],
  ["Pic", "Pictor"],
  ["PsA", "Pisces Austrinus"],
  ["Psc", "Pisces"],
  ["Pup", "Puppis"],
  ["Pyx", "Pyxis"],
  ["Ret", "Reticulum"],
  ["Scl", "Sculptor"],
  ["Sco", "Scorpius"],
  ["Sct", "Scutum"],
  ["Ser", "Serpens"],
  ["Sex", "Sextans"],
  ["Sge", "Sagitta"],
  ["Sgr", "Sagittarius"],
  ["Tau", "Taurus"],
  ["Tel", "Telescopium"],
  ["TrA", "Triangulum Australe"],
  ["Tri", "Triangulum"],
  ["Tuc", "Tucana"],
  ["UMa", "Ursa Major"],
  ["UMi", "Ursa Minor"],
  ["Vel", "Vela"],
  ["Vir", "Virgo"],
  ["Vol", "Volans"],
  ["Vul", "Vulpecula"]
  // 87
];
var ConstelBounds = [
  [83, 0, 8640, 2112],
  [83, 2880, 5220, 2076],
  [83, 7560, 8280, 2068],
  [83, 6480, 7560, 2064],
  [15, 0, 2880, 2040],
  [10, 3300, 3840, 1968],
  [15, 0, 1800, 1920],
  [10, 3840, 5220, 1920],
  [83, 6300, 6480, 1920],
  [33, 7260, 7560, 1920],
  [15, 0, 1263, 1848],
  [10, 4140, 4890, 1848],
  [83, 5952, 6300, 1800],
  [15, 7260, 7440, 1800],
  [10, 2868, 3300, 1764],
  [33, 3300, 4080, 1764],
  [83, 4680, 5952, 1680],
  [13, 1116, 1230, 1632],
  [33, 7350, 7440, 1608],
  [33, 4080, 4320, 1596],
  [15, 0, 120, 1584],
  [83, 5040, 5640, 1584],
  [15, 8490, 8640, 1584],
  [33, 4320, 4860, 1536],
  [33, 4860, 5190, 1512],
  [15, 8340, 8490, 1512],
  [10, 2196, 2520, 1488],
  [33, 7200, 7350, 1476],
  [15, 7393.2, 7416, 1462],
  [10, 2520, 2868, 1440],
  [82, 2868, 3030, 1440],
  [33, 7116, 7200, 1428],
  [15, 7200, 7393.2, 1428],
  [15, 8232, 8340, 1418],
  [13, 0, 876, 1404],
  [33, 6990, 7116, 1392],
  [13, 612, 687, 1380],
  [13, 876, 1116, 1368],
  [10, 1116, 1140, 1368],
  [15, 8034, 8232, 1350],
  [10, 1800, 2196, 1344],
  [82, 5052, 5190, 1332],
  [33, 5190, 6990, 1332],
  [10, 1140, 1200, 1320],
  [15, 7968, 8034, 1320],
  [15, 7416, 7908, 1316],
  [13, 0, 612, 1296],
  [50, 2196, 2340, 1296],
  [82, 4350, 4860, 1272],
  [33, 5490, 5670, 1272],
  [15, 7908, 7968, 1266],
  [10, 1200, 1800, 1260],
  [13, 8232, 8400, 1260],
  [33, 5670, 6120, 1236],
  [62, 735, 906, 1212],
  [33, 6120, 6564, 1212],
  [13, 0, 492, 1200],
  [62, 492, 600, 1200],
  [50, 2340, 2448, 1200],
  [13, 8400, 8640, 1200],
  [82, 4860, 5052, 1164],
  [13, 0, 402, 1152],
  [13, 8490, 8640, 1152],
  [39, 6543, 6564, 1140],
  [33, 6564, 6870, 1140],
  [30, 6870, 6900, 1140],
  [62, 600, 735, 1128],
  [82, 3030, 3300, 1128],
  [13, 60, 312, 1104],
  [82, 4320, 4350, 1080],
  [50, 2448, 2652, 1068],
  [30, 7887, 7908, 1056],
  [30, 7875, 7887, 1050],
  [30, 6900, 6984, 1044],
  [82, 3300, 3660, 1008],
  [82, 3660, 3882, 960],
  [8, 5556, 5670, 960],
  [39, 5670, 5880, 960],
  [50, 3330, 3450, 954],
  [0, 0, 906, 882],
  [62, 906, 924, 882],
  [51, 6969, 6984, 876],
  [62, 1620, 1689, 864],
  [30, 7824, 7875, 864],
  [44, 7875, 7920, 864],
  [7, 2352, 2652, 852],
  [50, 2652, 2790, 852],
  [0, 0, 720, 840],
  [44, 7920, 8214, 840],
  [44, 8214, 8232, 828],
  [0, 8232, 8460, 828],
  [62, 924, 978, 816],
  [82, 3882, 3960, 816],
  [29, 4320, 4440, 816],
  [50, 2790, 3330, 804],
  [48, 3330, 3558, 804],
  [0, 258, 507, 792],
  [8, 5466, 5556, 792],
  [0, 8460, 8550, 770],
  [29, 4440, 4770, 768],
  [0, 8550, 8640, 752],
  [29, 5025, 5052, 738],
  [80, 870, 978, 736],
  [62, 978, 1620, 736],
  [7, 1620, 1710, 720],
  [51, 6543, 6969, 720],
  [82, 3960, 4320, 696],
  [30, 7080, 7530, 696],
  [7, 1710, 2118, 684],
  [48, 3558, 3780, 684],
  [29, 4770, 5025, 684],
  [0, 0, 24, 672],
  [80, 507, 600, 672],
  [7, 2118, 2352, 672],
  [37, 2838, 2880, 672],
  [30, 7530, 7824, 672],
  [30, 6933, 7080, 660],
  [80, 690, 870, 654],
  [25, 5820, 5880, 648],
  [8, 5430, 5466, 624],
  [25, 5466, 5820, 624],
  [51, 6612, 6792, 624],
  [48, 3870, 3960, 612],
  [51, 6792, 6933, 612],
  [80, 600, 690, 600],
  [66, 258, 306, 570],
  [48, 3780, 3870, 564],
  [87, 7650, 7710, 564],
  [77, 2052, 2118, 548],
  [0, 24, 51, 528],
  [73, 5730, 5772, 528],
  [37, 2118, 2238, 516],
  [87, 7140, 7290, 510],
  [87, 6792, 6930, 506],
  [0, 51, 306, 504],
  [87, 7290, 7404, 492],
  [37, 2811, 2838, 480],
  [87, 7404, 7650, 468],
  [87, 6930, 7140, 460],
  [6, 1182, 1212, 456],
  [75, 6792, 6840, 444],
  [59, 2052, 2076, 432],
  [37, 2238, 2271, 420],
  [75, 6840, 7140, 388],
  [77, 1788, 1920, 384],
  [39, 5730, 5790, 384],
  [75, 7140, 7290, 378],
  [77, 1662, 1788, 372],
  [77, 1920, 2016, 372],
  [23, 4620, 4860, 360],
  [39, 6210, 6570, 344],
  [23, 4272, 4620, 336],
  [37, 2700, 2811, 324],
  [39, 6030, 6210, 308],
  [61, 0, 51, 300],
  [77, 2016, 2076, 300],
  [37, 2520, 2700, 300],
  [61, 7602, 7680, 300],
  [37, 2271, 2496, 288],
  [39, 6570, 6792, 288],
  [31, 7515, 7578, 284],
  [61, 7578, 7602, 284],
  [45, 4146, 4272, 264],
  [59, 2247, 2271, 240],
  [37, 2496, 2520, 240],
  [21, 2811, 2853, 240],
  [61, 8580, 8640, 240],
  [6, 600, 1182, 238],
  [31, 7251, 7308, 204],
  [8, 4860, 5430, 192],
  [61, 8190, 8580, 180],
  [21, 2853, 3330, 168],
  [45, 3330, 3870, 168],
  [58, 6570, 6718.4, 150],
  [3, 6718.4, 6792, 150],
  [31, 7500, 7515, 144],
  [20, 2520, 2526, 132],
  [73, 6570, 6633, 108],
  [39, 5790, 6030, 96],
  [58, 6570, 6633, 72],
  [61, 7728, 7800, 66],
  [66, 0, 720, 48],
  [73, 6690, 6792, 48],
  [31, 7308, 7500, 48],
  [34, 7500, 7680, 48],
  [61, 7680, 7728, 48],
  [61, 7920, 8190, 48],
  [61, 7800, 7920, 42],
  [20, 2526, 2592, 36],
  [77, 1290, 1662, 0],
  [59, 1662, 1680, 0],
  [20, 2592, 2910, 0],
  [85, 5280, 5430, 0],
  [58, 6420, 6570, 0],
  [16, 954, 1182, -42],
  [77, 1182, 1290, -42],
  [73, 5430, 5856, -78],
  [59, 1680, 1830, -96],
  [59, 2100, 2247, -96],
  [73, 6420, 6468, -96],
  [73, 6570, 6690, -96],
  [3, 6690, 6792, -96],
  [66, 8190, 8580, -96],
  [45, 3870, 4146, -144],
  [85, 4146, 4260, -144],
  [66, 0, 120, -168],
  [66, 8580, 8640, -168],
  [85, 5130, 5280, -192],
  [58, 5730, 5856, -192],
  [3, 7200, 7392, -216],
  [4, 7680, 7872, -216],
  [58, 6180, 6468, -240],
  [54, 2100, 2910, -264],
  [35, 1770, 1830, -264],
  [59, 1830, 2100, -264],
  [41, 2910, 3012, -264],
  [74, 3450, 3870, -264],
  [85, 4260, 4620, -264],
  [58, 6330, 6360, -280],
  [3, 6792, 7200, -288.8],
  [35, 1740, 1770, -348],
  [4, 7392, 7680, -360],
  [73, 6180, 6570, -384],
  [72, 6570, 6792, -384],
  [41, 3012, 3090, -408],
  [58, 5856, 5895, -438],
  [41, 3090, 3270, -456],
  [26, 3870, 3900, -456],
  [71, 5856, 5895, -462],
  [47, 5640, 5730, -480],
  [28, 4530, 4620, -528],
  [85, 4620, 5130, -528],
  [41, 3270, 3510, -576],
  [16, 600, 954, -585.2],
  [35, 954, 1350, -585.2],
  [26, 3900, 4260, -588],
  [28, 4260, 4530, -588],
  [47, 5130, 5370, -588],
  [58, 5856, 6030, -590],
  [16, 0, 600, -612],
  [11, 7680, 7872, -612],
  [4, 7872, 8580, -612],
  [16, 8580, 8640, -612],
  [41, 3510, 3690, -636],
  [35, 1692, 1740, -654],
  [46, 1740, 2202, -654],
  [11, 7200, 7680, -672],
  [41, 3690, 3810, -700],
  [41, 4530, 5370, -708],
  [47, 5370, 5640, -708],
  [71, 5640, 5760, -708],
  [35, 1650, 1692, -720],
  [58, 6030, 6336, -720],
  [76, 6336, 6420, -720],
  [41, 3810, 3900, -748],
  [19, 2202, 2652, -792],
  [41, 4410, 4530, -792],
  [41, 3900, 4410, -840],
  [36, 1260, 1350, -864],
  [68, 3012, 3372, -882],
  [35, 1536, 1650, -888],
  [76, 6420, 6900, -888],
  [65, 7680, 8280, -888],
  [70, 8280, 8400, -888],
  [36, 1080, 1260, -950],
  [1, 3372, 3960, -954],
  [70, 0, 600, -960],
  [36, 600, 1080, -960],
  [35, 1392, 1536, -960],
  [70, 8400, 8640, -960],
  [14, 5100, 5370, -1008],
  [49, 5640, 5760, -1008],
  [71, 5760, 5911.5, -1008],
  [9, 1740, 1800, -1032],
  [22, 1800, 2370, -1032],
  [67, 2880, 3012, -1032],
  [35, 1230, 1392, -1056],
  [71, 5911.5, 6420, -1092],
  [24, 6420, 6900, -1092],
  [76, 6900, 7320, -1092],
  [53, 7320, 7680, -1092],
  [35, 1080, 1230, -1104],
  [9, 1620, 1740, -1116],
  [49, 5520, 5640, -1152],
  [63, 0, 840, -1156],
  [35, 960, 1080, -1176],
  [40, 1470, 1536, -1176],
  [9, 1536, 1620, -1176],
  [38, 7680, 7920, -1200],
  [67, 2160, 2880, -1218],
  [84, 2880, 2940, -1218],
  [35, 870, 960, -1224],
  [40, 1380, 1470, -1224],
  [63, 0, 660, -1236],
  [12, 2160, 2220, -1260],
  [84, 2940, 3042, -1272],
  [40, 1260, 1380, -1276],
  [32, 1380, 1440, -1276],
  [63, 0, 570, -1284],
  [35, 780, 870, -1296],
  [64, 1620, 1800, -1296],
  [49, 5418, 5520, -1296],
  [84, 3042, 3180, -1308],
  [12, 2220, 2340, -1320],
  [14, 4260, 4620, -1320],
  [49, 5100, 5418, -1320],
  [56, 5418, 5520, -1320],
  [32, 1440, 1560, -1356],
  [84, 3180, 3960, -1356],
  [14, 3960, 4050, -1356],
  [5, 6300, 6480, -1368],
  [78, 6480, 7320, -1368],
  [38, 7920, 8400, -1368],
  [40, 1152, 1260, -1380],
  [64, 1800, 1980, -1380],
  [12, 2340, 2460, -1392],
  [63, 0, 480, -1404],
  [35, 480, 780, -1404],
  [63, 8400, 8640, -1404],
  [32, 1560, 1650, -1416],
  [56, 5520, 5911.5, -1440],
  [43, 7320, 7680, -1440],
  [64, 1980, 2160, -1464],
  [18, 5460, 5520, -1464],
  [5, 5911.5, 5970, -1464],
  [18, 5370, 5460, -1526],
  [5, 5970, 6030, -1526],
  [64, 2160, 2460, -1536],
  [12, 2460, 3252, -1536],
  [14, 4050, 4260, -1536],
  [27, 4260, 4620, -1536],
  [14, 4620, 5232, -1536],
  [18, 4860, 4920, -1560],
  [5, 6030, 6060, -1560],
  [40, 780, 1152, -1620],
  [69, 1152, 1650, -1620],
  [18, 5310, 5370, -1620],
  [5, 6060, 6300, -1620],
  [60, 6300, 6480, -1620],
  [81, 7920, 8400, -1620],
  [32, 1650, 2370, -1680],
  [18, 4920, 5310, -1680],
  [79, 5310, 6120, -1680],
  [81, 0, 480, -1800],
  [42, 1260, 1650, -1800],
  [86, 2370, 3252, -1800],
  [12, 3252, 4050, -1800],
  [55, 4050, 4920, -1800],
  [60, 6480, 7680, -1800],
  [43, 7680, 8400, -1800],
  [81, 8400, 8640, -1800],
  [81, 270, 480, -1824],
  [42, 0, 1260, -1980],
  [17, 2760, 4920, -1980],
  [2, 4920, 6480, -1980],
  [52, 1260, 2760, -2040],
  [57, 0, 8640, -2160]
  // Oct
];
var ConstelRot;
var Epoch2000;
var ConstellationInfo = class {
  constructor(symbol, name, ra1875, dec1875) {
    this.symbol = symbol;
    this.name = name;
    this.ra1875 = ra1875;
    this.dec1875 = dec1875;
  }
};
function Constellation(ra, dec) {
  VerifyNumber(ra);
  VerifyNumber(dec);
  if (dec < -90 || dec > 90)
    throw "Invalid declination angle. Must be -90..+90.";
  ra %= 24;
  if (ra < 0)
    ra += 24;
  if (!ConstelRot) {
    ConstelRot = Rotation_EQJ_EQD(new AstroTime(-45655.74141261017));
    Epoch2000 = new AstroTime(0);
  }
  const sph2000 = new Spherical(dec, 15 * ra, 1);
  const vec2000 = VectorFromSphere(sph2000, Epoch2000);
  const vec1875 = RotateVector(ConstelRot, vec2000);
  const equ1875 = EquatorFromVector(vec1875);
  const fd = 10 / (4 * 60);
  const fr = fd / 15;
  for (let b of ConstelBounds) {
    const dec2 = b[3] * fd;
    const ra_lo = b[1] * fr;
    const ra_hi = b[2] * fr;
    if (dec2 <= equ1875.dec && ra_lo <= equ1875.ra && equ1875.ra < ra_hi) {
      const c = ConstelNames[b[0]];
      return new ConstellationInfo(c[0], c[1], equ1875.ra, equ1875.dec);
    }
  }
  throw "Unable to find constellation for given coordinates.";
}
var EclipseKind;
(function(EclipseKind2) {
  EclipseKind2["Penumbral"] = "penumbral";
  EclipseKind2["Partial"] = "partial";
  EclipseKind2["Annular"] = "annular";
  EclipseKind2["Total"] = "total";
})(EclipseKind || (EclipseKind = {}));
var LunarEclipseInfo = class {
  constructor(kind, obscuration, peak, sd_penum, sd_partial, sd_total) {
    this.kind = kind;
    this.obscuration = obscuration;
    this.peak = peak;
    this.sd_penum = sd_penum;
    this.sd_partial = sd_partial;
    this.sd_total = sd_total;
  }
};
var ShadowInfo = class {
  constructor(time, u, r, k, p, target, dir) {
    this.time = time;
    this.u = u;
    this.r = r;
    this.k = k;
    this.p = p;
    this.target = target;
    this.dir = dir;
  }
};
function CalcShadow(body_radius_km, time, target, dir) {
  const u = (dir.x * target.x + dir.y * target.y + dir.z * target.z) / (dir.x * dir.x + dir.y * dir.y + dir.z * dir.z);
  const dx = u * dir.x - target.x;
  const dy = u * dir.y - target.y;
  const dz = u * dir.z - target.z;
  const r = KM_PER_AU * Math.hypot(dx, dy, dz);
  const k = +SUN_RADIUS_KM - (1 + u) * (SUN_RADIUS_KM - body_radius_km);
  const p = -SUN_RADIUS_KM + (1 + u) * (SUN_RADIUS_KM + body_radius_km);
  return new ShadowInfo(time, u, r, k, p, target, dir);
}
function EarthShadow(time) {
  const s = GeoVector(Body.Sun, time, true);
  const e = new Vector(-s.x, -s.y, -s.z, s.t);
  const m = GeoMoon(time);
  return CalcShadow(EARTH_ECLIPSE_RADIUS_KM, time, m, e);
}
function MoonShadow(time) {
  const s = GeoVector(Body.Sun, time, true);
  const m = GeoMoon(time);
  const e = new Vector(-m.x, -m.y, -m.z, m.t);
  m.x -= s.x;
  m.y -= s.y;
  m.z -= s.z;
  return CalcShadow(MOON_MEAN_RADIUS_KM, time, e, m);
}
function LocalMoonShadow(time, observer) {
  const pos = geo_pos(time, observer);
  const s = GeoVector(Body.Sun, time, true);
  const m = GeoMoon(time);
  const o = new Vector(pos[0] - m.x, pos[1] - m.y, pos[2] - m.z, time);
  m.x -= s.x;
  m.y -= s.y;
  m.z -= s.z;
  return CalcShadow(MOON_MEAN_RADIUS_KM, time, o, m);
}
function PlanetShadow(body, planet_radius_km, time) {
  const g = GeoVector(body, time, true);
  const e = GeoVector(Body.Sun, time, true);
  const p = new Vector(g.x - e.x, g.y - e.y, g.z - e.z, time);
  e.x = -g.x;
  e.y = -g.y;
  e.z = -g.z;
  return CalcShadow(planet_radius_km, time, e, p);
}
function ShadowDistanceSlope(shadowfunc, time) {
  const dt = 1 / 86400;
  const t1 = time.AddDays(-dt);
  const t2 = time.AddDays(+dt);
  const shadow1 = shadowfunc(t1);
  const shadow2 = shadowfunc(t2);
  return (shadow2.r - shadow1.r) / dt;
}
function PlanetShadowSlope(body, planet_radius_km, time) {
  const dt = 1 / 86400;
  const shadow1 = PlanetShadow(body, planet_radius_km, time.AddDays(-dt));
  const shadow2 = PlanetShadow(body, planet_radius_km, time.AddDays(+dt));
  return (shadow2.r - shadow1.r) / dt;
}
function PeakEarthShadow(search_center_time) {
  const window = 0.03;
  const t1 = search_center_time.AddDays(-window);
  const t2 = search_center_time.AddDays(+window);
  const tx = Search((time) => ShadowDistanceSlope(EarthShadow, time), t1, t2);
  if (!tx)
    throw "Failed to find peak Earth shadow time.";
  return EarthShadow(tx);
}
function PeakMoonShadow(search_center_time) {
  const window = 0.03;
  const t1 = search_center_time.AddDays(-window);
  const t2 = search_center_time.AddDays(+window);
  const tx = Search((time) => ShadowDistanceSlope(MoonShadow, time), t1, t2);
  if (!tx)
    throw "Failed to find peak Moon shadow time.";
  return MoonShadow(tx);
}
function PeakPlanetShadow(body, planet_radius_km, search_center_time) {
  const window = 1;
  const t1 = search_center_time.AddDays(-window);
  const t2 = search_center_time.AddDays(+window);
  const tx = Search((time) => PlanetShadowSlope(body, planet_radius_km, time), t1, t2);
  if (!tx)
    throw "Failed to find peak planet shadow time.";
  return PlanetShadow(body, planet_radius_km, tx);
}
function PeakLocalMoonShadow(search_center_time, observer) {
  const window = 0.2;
  const t1 = search_center_time.AddDays(-window);
  const t2 = search_center_time.AddDays(+window);
  function shadowfunc(time2) {
    return LocalMoonShadow(time2, observer);
  }
  const time = Search((time2) => ShadowDistanceSlope(shadowfunc, time2), t1, t2);
  if (!time)
    throw `PeakLocalMoonShadow: search failure for search_center_time = ${search_center_time}`;
  return LocalMoonShadow(time, observer);
}
function ShadowSemiDurationMinutes(center_time, radius_limit, window_minutes) {
  const window = window_minutes / (24 * 60);
  const before = center_time.AddDays(-window);
  const after = center_time.AddDays(+window);
  const t1 = Search((time) => -(EarthShadow(time).r - radius_limit), before, center_time);
  const t2 = Search((time) => +(EarthShadow(time).r - radius_limit), center_time, after);
  if (!t1 || !t2)
    throw "Failed to find shadow semiduration";
  return (t2.ut - t1.ut) * (24 * 60 / 2);
}
function MoonEclipticLatitudeDegrees(time) {
  const moon = CalcMoon(time);
  return RAD2DEG * moon.geo_eclip_lat;
}
function Obscuration(a, b, c) {
  if (a <= 0)
    throw "Radius of first disc must be positive.";
  if (b <= 0)
    throw "Radius of second disc must be positive.";
  if (c < 0)
    throw "Distance between discs is not allowed to be negative.";
  if (c >= a + b) {
    return 0;
  }
  if (c == 0) {
    return a <= b ? 1 : b * b / (a * a);
  }
  const x = (a * a - b * b + c * c) / (2 * c);
  const radicand = a * a - x * x;
  if (radicand <= 0) {
    return a <= b ? 1 : b * b / (a * a);
  }
  const y = Math.sqrt(radicand);
  const lens1 = a * a * Math.acos(x / a) - x * y;
  const lens2 = b * b * Math.acos((c - x) / b) - (c - x) * y;
  return (lens1 + lens2) / (Math.PI * a * a);
}
function SolarEclipseObscuration(hm, lo) {
  const ho = new Vector(hm.x + lo.x, hm.y + lo.y, hm.z + lo.z, hm.t);
  const sun_radius = Math.asin(SUN_RADIUS_AU / ho.Length());
  const moon_radius = Math.asin(MOON_POLAR_RADIUS_AU / lo.Length());
  const sun_moon_separation = AngleBetween(lo, ho);
  const obscuration = Obscuration(sun_radius, moon_radius, sun_moon_separation * DEG2RAD);
  return Math.min(0.9999, obscuration);
}
function SearchLunarEclipse(date) {
  const PruneLatitude = 1.8;
  let fmtime = MakeTime(date);
  for (let fmcount = 0; fmcount < 12; ++fmcount) {
    const fullmoon = SearchMoonPhase(180, fmtime, 40);
    if (!fullmoon)
      throw "Cannot find full moon.";
    const eclip_lat = MoonEclipticLatitudeDegrees(fullmoon);
    if (Math.abs(eclip_lat) < PruneLatitude) {
      const shadow = PeakEarthShadow(fullmoon);
      if (shadow.r < shadow.p + MOON_MEAN_RADIUS_KM) {
        let kind = EclipseKind.Penumbral;
        let obscuration = 0;
        let sd_total = 0;
        let sd_partial = 0;
        let sd_penum = ShadowSemiDurationMinutes(shadow.time, shadow.p + MOON_MEAN_RADIUS_KM, 200);
        if (shadow.r < shadow.k + MOON_MEAN_RADIUS_KM) {
          kind = EclipseKind.Partial;
          sd_partial = ShadowSemiDurationMinutes(shadow.time, shadow.k + MOON_MEAN_RADIUS_KM, sd_penum);
          if (shadow.r + MOON_MEAN_RADIUS_KM < shadow.k) {
            kind = EclipseKind.Total;
            obscuration = 1;
            sd_total = ShadowSemiDurationMinutes(shadow.time, shadow.k - MOON_MEAN_RADIUS_KM, sd_partial);
          } else {
            obscuration = Obscuration(MOON_MEAN_RADIUS_KM, shadow.k, shadow.r);
          }
        }
        return new LunarEclipseInfo(kind, obscuration, shadow.time, sd_penum, sd_partial, sd_total);
      }
    }
    fmtime = fullmoon.AddDays(10);
  }
  throw "Failed to find lunar eclipse within 12 full moons.";
}
var GlobalSolarEclipseInfo = class {
  constructor(kind, obscuration, peak, distance, latitude, longitude) {
    this.kind = kind;
    this.obscuration = obscuration;
    this.peak = peak;
    this.distance = distance;
    this.latitude = latitude;
    this.longitude = longitude;
  }
};
function EclipseKindFromUmbra(k) {
  return k > 0.014 ? EclipseKind.Total : EclipseKind.Annular;
}
function GeoidIntersect(shadow) {
  let kind = EclipseKind.Partial;
  let peak = shadow.time;
  let distance = shadow.r;
  let latitude;
  let longitude;
  const rot = Rotation_EQJ_EQD(shadow.time);
  const v = RotateVector(rot, shadow.dir);
  const e = RotateVector(rot, shadow.target);
  v.x *= KM_PER_AU;
  v.y *= KM_PER_AU;
  v.z *= KM_PER_AU / EARTH_FLATTENING;
  e.x *= KM_PER_AU;
  e.y *= KM_PER_AU;
  e.z *= KM_PER_AU / EARTH_FLATTENING;
  const R = EARTH_EQUATORIAL_RADIUS_KM;
  const A = v.x * v.x + v.y * v.y + v.z * v.z;
  const B = -2 * (v.x * e.x + v.y * e.y + v.z * e.z);
  const C = e.x * e.x + e.y * e.y + e.z * e.z - R * R;
  const radic = B * B - 4 * A * C;
  let obscuration;
  if (radic > 0) {
    const u = (-B - Math.sqrt(radic)) / (2 * A);
    const px = u * v.x - e.x;
    const py = u * v.y - e.y;
    const pz = (u * v.z - e.z) * EARTH_FLATTENING;
    const proj = Math.hypot(px, py) * EARTH_FLATTENING_SQUARED;
    if (proj == 0)
      latitude = pz > 0 ? 90 : -90;
    else
      latitude = RAD2DEG * Math.atan(pz / proj);
    const gast = sidereal_time(peak);
    longitude = (RAD2DEG * Math.atan2(py, px) - 15 * gast) % 360;
    if (longitude <= -180)
      longitude += 360;
    else if (longitude > 180)
      longitude -= 360;
    const inv = InverseRotation(rot);
    let o = new Vector(px / KM_PER_AU, py / KM_PER_AU, pz / KM_PER_AU, shadow.time);
    o = RotateVector(inv, o);
    o.x += shadow.target.x;
    o.y += shadow.target.y;
    o.z += shadow.target.z;
    const surface = CalcShadow(MOON_POLAR_RADIUS_KM, shadow.time, o, shadow.dir);
    if (surface.r > 1e-9 || surface.r < 0)
      throw `Unexpected shadow distance from geoid intersection = ${surface.r}`;
    kind = EclipseKindFromUmbra(surface.k);
    obscuration = kind === EclipseKind.Total ? 1 : SolarEclipseObscuration(shadow.dir, o);
  } else {
    obscuration = void 0;
  }
  return new GlobalSolarEclipseInfo(kind, obscuration, peak, distance, latitude, longitude);
}
function NextLunarEclipse(prevEclipseTime) {
  prevEclipseTime = MakeTime(prevEclipseTime);
  const startTime = prevEclipseTime.AddDays(10);
  return SearchLunarEclipse(startTime);
}
function SearchGlobalSolarEclipse(startTime) {
  startTime = MakeTime(startTime);
  const PruneLatitude = 1.8;
  let nmtime = startTime;
  let nmcount;
  for (nmcount = 0; nmcount < 12; ++nmcount) {
    const newmoon = SearchMoonPhase(0, nmtime, 40);
    if (!newmoon)
      throw "Cannot find new moon";
    const eclip_lat = MoonEclipticLatitudeDegrees(newmoon);
    if (Math.abs(eclip_lat) < PruneLatitude) {
      const shadow = PeakMoonShadow(newmoon);
      if (shadow.r < shadow.p + EARTH_MEAN_RADIUS_KM) {
        return GeoidIntersect(shadow);
      }
    }
    nmtime = newmoon.AddDays(10);
  }
  throw "Failed to find solar eclipse within 12 full moons.";
}
function NextGlobalSolarEclipse(prevEclipseTime) {
  prevEclipseTime = MakeTime(prevEclipseTime);
  const startTime = prevEclipseTime.AddDays(10);
  return SearchGlobalSolarEclipse(startTime);
}
var EclipseEvent = class {
  constructor(time, altitude) {
    this.time = time;
    this.altitude = altitude;
  }
};
var LocalSolarEclipseInfo = class {
  constructor(kind, obscuration, partial_begin, total_begin, peak, total_end, partial_end) {
    this.kind = kind;
    this.obscuration = obscuration;
    this.partial_begin = partial_begin;
    this.total_begin = total_begin;
    this.peak = peak;
    this.total_end = total_end;
    this.partial_end = partial_end;
  }
};
function local_partial_distance(shadow) {
  return shadow.p - shadow.r;
}
function local_total_distance(shadow) {
  return Math.abs(shadow.k) - shadow.r;
}
function LocalEclipse(shadow, observer) {
  const PARTIAL_WINDOW = 0.2;
  const TOTAL_WINDOW = 0.01;
  const peak = CalcEvent(observer, shadow.time);
  let t1 = shadow.time.AddDays(-PARTIAL_WINDOW);
  let t2 = shadow.time.AddDays(+PARTIAL_WINDOW);
  const partial_begin = LocalEclipseTransition(observer, 1, local_partial_distance, t1, shadow.time);
  const partial_end = LocalEclipseTransition(observer, -1, local_partial_distance, shadow.time, t2);
  let total_begin;
  let total_end;
  let kind;
  if (shadow.r < Math.abs(shadow.k)) {
    t1 = shadow.time.AddDays(-TOTAL_WINDOW);
    t2 = shadow.time.AddDays(+TOTAL_WINDOW);
    total_begin = LocalEclipseTransition(observer, 1, local_total_distance, t1, shadow.time);
    total_end = LocalEclipseTransition(observer, -1, local_total_distance, shadow.time, t2);
    kind = EclipseKindFromUmbra(shadow.k);
  } else {
    kind = EclipseKind.Partial;
  }
  const obscuration = kind === EclipseKind.Total ? 1 : SolarEclipseObscuration(shadow.dir, shadow.target);
  return new LocalSolarEclipseInfo(kind, obscuration, partial_begin, total_begin, peak, total_end, partial_end);
}
function LocalEclipseTransition(observer, direction, func, t1, t2) {
  function evaluate(time) {
    const shadow = LocalMoonShadow(time, observer);
    return direction * func(shadow);
  }
  const search = Search(evaluate, t1, t2);
  if (!search)
    throw "Local eclipse transition search failed.";
  return CalcEvent(observer, search);
}
function CalcEvent(observer, time) {
  const altitude = SunAltitude(time, observer);
  return new EclipseEvent(time, altitude);
}
function SunAltitude(time, observer) {
  const equ = Equator(Body.Sun, time, observer, true, true);
  const hor = Horizon(time, observer, equ.ra, equ.dec, "normal");
  return hor.altitude;
}
function SearchLocalSolarEclipse(startTime, observer) {
  startTime = MakeTime(startTime);
  VerifyObserver(observer);
  const PruneLatitude = 1.8;
  let nmtime = startTime;
  for (; ; ) {
    const newmoon = SearchMoonPhase(0, nmtime, 40);
    if (!newmoon)
      throw "Cannot find next new moon";
    const eclip_lat = MoonEclipticLatitudeDegrees(newmoon);
    if (Math.abs(eclip_lat) < PruneLatitude) {
      const shadow = PeakLocalMoonShadow(newmoon, observer);
      if (shadow.r < shadow.p) {
        const eclipse = LocalEclipse(shadow, observer);
        if (eclipse.partial_begin.altitude > 0 || eclipse.partial_end.altitude > 0)
          return eclipse;
      }
    }
    nmtime = newmoon.AddDays(10);
  }
}
function NextLocalSolarEclipse(prevEclipseTime, observer) {
  prevEclipseTime = MakeTime(prevEclipseTime);
  const startTime = prevEclipseTime.AddDays(10);
  return SearchLocalSolarEclipse(startTime, observer);
}
var TransitInfo = class {
  constructor(start, peak, finish, separation) {
    this.start = start;
    this.peak = peak;
    this.finish = finish;
    this.separation = separation;
  }
};
function PlanetShadowBoundary(time, body, planet_radius_km, direction) {
  const shadow = PlanetShadow(body, planet_radius_km, time);
  return direction * (shadow.r - shadow.p);
}
function PlanetTransitBoundary(body, planet_radius_km, t1, t2, direction) {
  const tx = Search((time) => PlanetShadowBoundary(time, body, planet_radius_km, direction), t1, t2);
  if (!tx)
    throw "Planet transit boundary search failed";
  return tx;
}
function SearchTransit(body, startTime) {
  startTime = MakeTime(startTime);
  const threshold_angle = 0.4;
  const dt_days = 1;
  let planet_radius_km;
  switch (body) {
    case Body.Mercury:
      planet_radius_km = 2439.7;
      break;
    case Body.Venus:
      planet_radius_km = 6051.8;
      break;
    default:
      throw `Invalid body: ${body}`;
  }
  let search_time = startTime;
  for (; ; ) {
    const conj = SearchRelativeLongitude(body, 0, search_time);
    const conj_separation = AngleFromSun(body, conj);
    if (conj_separation < threshold_angle) {
      const shadow = PeakPlanetShadow(body, planet_radius_km, conj);
      if (shadow.r < shadow.p) {
        const time_before = shadow.time.AddDays(-dt_days);
        const start = PlanetTransitBoundary(body, planet_radius_km, time_before, shadow.time, -1);
        const time_after = shadow.time.AddDays(+dt_days);
        const finish = PlanetTransitBoundary(body, planet_radius_km, shadow.time, time_after, 1);
        const min_separation = 60 * AngleFromSun(body, shadow.time);
        return new TransitInfo(start, shadow.time, finish, min_separation);
      }
    }
    search_time = conj.AddDays(10);
  }
}
function NextTransit(body, prevTransitTime) {
  prevTransitTime = MakeTime(prevTransitTime);
  const startTime = prevTransitTime.AddDays(100);
  return SearchTransit(body, startTime);
}
var NodeEventKind;
(function(NodeEventKind2) {
  NodeEventKind2[NodeEventKind2["Invalid"] = 0] = "Invalid";
  NodeEventKind2[NodeEventKind2["Ascending"] = 1] = "Ascending";
  NodeEventKind2[NodeEventKind2["Descending"] = -1] = "Descending";
})(NodeEventKind || (NodeEventKind = {}));
var NodeEventInfo = class {
  constructor(kind, time) {
    this.kind = kind;
    this.time = time;
  }
};
var MoonNodeStepDays = 10;
function SearchMoonNode(startTime) {
  let time1 = MakeTime(startTime);
  let eclip1 = EclipticGeoMoon(time1);
  for (; ; ) {
    const time2 = time1.AddDays(MoonNodeStepDays);
    const eclip2 = EclipticGeoMoon(time2);
    if (eclip1.lat * eclip2.lat <= 0) {
      const kind = eclip2.lat > eclip1.lat ? NodeEventKind.Ascending : NodeEventKind.Descending;
      const result = Search((t) => kind * EclipticGeoMoon(t).lat, time1, time2);
      if (!result)
        throw `Could not find moon node.`;
      return new NodeEventInfo(kind, result);
    }
    time1 = time2;
    eclip1 = eclip2;
  }
}
function NextMoonNode(prevNode) {
  const time = prevNode.time.AddDays(MoonNodeStepDays);
  const node = SearchMoonNode(time);
  switch (prevNode.kind) {
    case NodeEventKind.Ascending:
      if (node.kind !== NodeEventKind.Descending)
        throw `Internal error: previous node was ascending, but this node was: ${node.kind}`;
      break;
    case NodeEventKind.Descending:
      if (node.kind !== NodeEventKind.Ascending)
        throw `Internal error: previous node was descending, but this node was: ${node.kind}`;
      break;
    default:
      throw `Previous node has an invalid node kind: ${prevNode.kind}`;
  }
  return node;
}
var AxisInfo = class {
  constructor(ra, dec, spin2, north) {
    this.ra = ra;
    this.dec = dec;
    this.spin = spin2;
    this.north = north;
  }
};
function EarthRotationAxis(time) {
  const pos2 = nutation([0, 0, 1], time, PrecessDirection.Into2000);
  const nvec = precession(pos2, time, PrecessDirection.Into2000);
  const north = new Vector(nvec[0], nvec[1], nvec[2], time);
  const equ = EquatorFromVector(north);
  const spin2 = 190.41375788700253 + 360.9856122880876 * time.ut;
  return new AxisInfo(equ.ra, equ.dec, spin2, north);
}
function RotationAxis(body, date) {
  const time = MakeTime(date);
  const d = time.tt;
  const T = d / 36525;
  let ra, dec, w;
  switch (body) {
    case Body.Sun:
      ra = 286.13;
      dec = 63.87;
      w = 84.176 + 14.1844 * d;
      break;
    case Body.Mercury:
      ra = 281.0103 - 0.0328 * T;
      dec = 61.4155 - 49e-4 * T;
      w = 329.5988 + 6.1385108 * d + 0.01067257 * Math.sin(DEG2RAD * (174.7910857 + 4.092335 * d)) - 112309e-8 * Math.sin(DEG2RAD * (349.5821714 + 8.18467 * d)) - 1104e-7 * Math.sin(DEG2RAD * (164.3732571 + 12.277005 * d)) - 2539e-8 * Math.sin(DEG2RAD * (339.1643429 + 16.36934 * d)) - 571e-8 * Math.sin(DEG2RAD * (153.9554286 + 20.461675 * d));
      break;
    case Body.Venus:
      ra = 272.76;
      dec = 67.16;
      w = 160.2 - 1.4813688 * d;
      break;
    case Body.Earth:
      return EarthRotationAxis(time);
    case Body.Moon:
      const E1 = DEG2RAD * (125.045 - 0.0529921 * d);
      const E2 = DEG2RAD * (250.089 - 0.1059842 * d);
      const E3 = DEG2RAD * (260.008 + 13.0120009 * d);
      const E4 = DEG2RAD * (176.625 + 13.3407154 * d);
      const E5 = DEG2RAD * (357.529 + 0.9856003 * d);
      const E6 = DEG2RAD * (311.589 + 26.4057084 * d);
      const E7 = DEG2RAD * (134.963 + 13.064993 * d);
      const E8 = DEG2RAD * (276.617 + 0.3287146 * d);
      const E9 = DEG2RAD * (34.226 + 1.7484877 * d);
      const E10 = DEG2RAD * (15.134 - 0.1589763 * d);
      const E11 = DEG2RAD * (119.743 + 36096e-7 * d);
      const E12 = DEG2RAD * (239.961 + 0.1643573 * d);
      const E13 = DEG2RAD * (25.053 + 12.9590088 * d);
      ra = 269.9949 + 31e-4 * T - 3.8787 * Math.sin(E1) - 0.1204 * Math.sin(E2) + 0.07 * Math.sin(E3) - 0.0172 * Math.sin(E4) + 72e-4 * Math.sin(E6) - 52e-4 * Math.sin(E10) + 43e-4 * Math.sin(E13);
      dec = 66.5392 + 0.013 * T + 1.5419 * Math.cos(E1) + 0.0239 * Math.cos(E2) - 0.0278 * Math.cos(E3) + 68e-4 * Math.cos(E4) - 29e-4 * Math.cos(E6) + 9e-4 * Math.cos(E7) + 8e-4 * Math.cos(E10) - 9e-4 * Math.cos(E13);
      w = 38.3213 + (13.17635815 - 14e-13 * d) * d + 3.561 * Math.sin(E1) + 0.1208 * Math.sin(E2) - 0.0642 * Math.sin(E3) + 0.0158 * Math.sin(E4) + 0.0252 * Math.sin(E5) - 66e-4 * Math.sin(E6) - 47e-4 * Math.sin(E7) - 46e-4 * Math.sin(E8) + 28e-4 * Math.sin(E9) + 52e-4 * Math.sin(E10) + 4e-3 * Math.sin(E11) + 19e-4 * Math.sin(E12) - 44e-4 * Math.sin(E13);
      break;
    case Body.Mars:
      ra = 317.269202 - 0.10927547 * T + 68e-6 * Math.sin(DEG2RAD * (198.991226 + 19139.4819985 * T)) + 238e-6 * Math.sin(DEG2RAD * (226.292679 + 38280.8511281 * T)) + 52e-6 * Math.sin(DEG2RAD * (249.663391 + 57420.7251593 * T)) + 9e-6 * Math.sin(DEG2RAD * (266.18351 + 76560.636795 * T)) + 0.419057 * Math.sin(DEG2RAD * (79.398797 + 0.5042615 * T));
      dec = 54.432516 - 0.05827105 * T + 51e-6 * Math.cos(DEG2RAD * (122.433576 + 19139.9407476 * T)) + 141e-6 * Math.cos(DEG2RAD * (43.058401 + 38280.8753272 * T)) + 31e-6 * Math.cos(DEG2RAD * (57.663379 + 57420.7517205 * T)) + 5e-6 * Math.cos(DEG2RAD * (79.476401 + 76560.6495004 * T)) + 1.591274 * Math.cos(DEG2RAD * (166.325722 + 0.5042615 * T));
      w = 176.049863 + 350.891982443297 * d + 145e-6 * Math.sin(DEG2RAD * (129.071773 + 19140.0328244 * T)) + 157e-6 * Math.sin(DEG2RAD * (36.352167 + 38281.0473591 * T)) + 4e-5 * Math.sin(DEG2RAD * (56.668646 + 57420.929536 * T)) + 1e-6 * Math.sin(DEG2RAD * (67.364003 + 76560.2552215 * T)) + 1e-6 * Math.sin(DEG2RAD * (104.79268 + 95700.4387578 * T)) + 0.584542 * Math.sin(DEG2RAD * (95.391654 + 0.5042615 * T));
      break;
    case Body.Jupiter:
      const Ja = DEG2RAD * (99.360714 + 4850.4046 * T);
      const Jb = DEG2RAD * (175.895369 + 1191.9605 * T);
      const Jc = DEG2RAD * (300.323162 + 262.5475 * T);
      const Jd = DEG2RAD * (114.012305 + 6070.2476 * T);
      const Je = DEG2RAD * (49.511251 + 64.3 * T);
      ra = 268.056595 - 6499e-6 * T + 117e-6 * Math.sin(Ja) + 938e-6 * Math.sin(Jb) + 1432e-6 * Math.sin(Jc) + 3e-5 * Math.sin(Jd) + 215e-5 * Math.sin(Je);
      dec = 64.495303 + 2413e-6 * T + 5e-5 * Math.cos(Ja) + 404e-6 * Math.cos(Jb) + 617e-6 * Math.cos(Jc) - 13e-6 * Math.cos(Jd) + 926e-6 * Math.cos(Je);
      w = 284.95 + 870.536 * d;
      break;
    case Body.Saturn:
      ra = 40.589 - 0.036 * T;
      dec = 83.537 - 4e-3 * T;
      w = 38.9 + 810.7939024 * d;
      break;
    case Body.Uranus:
      ra = 257.311;
      dec = -15.175;
      w = 203.81 - 501.1600928 * d;
      break;
    case Body.Neptune:
      const N = DEG2RAD * (357.85 + 52.316 * T);
      ra = 299.36 + 0.7 * Math.sin(N);
      dec = 43.46 - 0.51 * Math.cos(N);
      w = 249.978 + 541.1397757 * d - 0.48 * Math.sin(N);
      break;
    case Body.Pluto:
      ra = 132.993;
      dec = -6.163;
      w = 302.695 + 56.3625225 * d;
      break;
    default:
      throw `Invalid body: ${body}`;
  }
  const radlat = dec * DEG2RAD;
  const radlon = ra * DEG2RAD;
  const rcoslat = Math.cos(radlat);
  const north = new Vector(rcoslat * Math.cos(radlon), rcoslat * Math.sin(radlon), Math.sin(radlat), time);
  return new AxisInfo(ra / 15, dec, w, north);
}
function LagrangePoint(point, date, major_body, minor_body) {
  const time = MakeTime(date);
  const major_mass = MassProduct(major_body);
  const minor_mass = MassProduct(minor_body);
  let major_state;
  let minor_state;
  if (major_body === Body.Earth && minor_body === Body.Moon) {
    major_state = new StateVector(0, 0, 0, 0, 0, 0, time);
    minor_state = GeoMoonState(time);
  } else {
    major_state = HelioState(major_body, time);
    minor_state = HelioState(minor_body, time);
  }
  return LagrangePointFast(point, major_state, major_mass, minor_state, minor_mass);
}
function LagrangePointFast(point, major_state, major_mass, minor_state, minor_mass) {
  const cos_60 = 0.5;
  const sin_60 = 0.8660254037844386;
  if (point < 1 || point > 5)
    throw `Invalid lagrange point ${point}`;
  if (!Number.isFinite(major_mass) || major_mass <= 0)
    throw "Major mass must be a positive number.";
  if (!Number.isFinite(minor_mass) || minor_mass <= 0)
    throw "Minor mass must be a negative number.";
  let dx = minor_state.x - major_state.x;
  let dy = minor_state.y - major_state.y;
  let dz = minor_state.z - major_state.z;
  const R2 = dx * dx + dy * dy + dz * dz;
  const R = Math.sqrt(R2);
  const vx = minor_state.vx - major_state.vx;
  const vy = minor_state.vy - major_state.vy;
  const vz = minor_state.vz - major_state.vz;
  let p;
  if (point === 4 || point === 5) {
    const nx = dy * vz - dz * vy;
    const ny = dz * vx - dx * vz;
    const nz = dx * vy - dy * vx;
    let ux = ny * dz - nz * dy;
    let uy = nz * dx - nx * dz;
    let uz = nx * dy - ny * dx;
    const U = Math.sqrt(ux * ux + uy * uy + uz * uz);
    ux /= U;
    uy /= U;
    uz /= U;
    dx /= R;
    dy /= R;
    dz /= R;
    const vert = point == 4 ? +sin_60 : -sin_60;
    const Dx = cos_60 * dx + vert * ux;
    const Dy = cos_60 * dy + vert * uy;
    const Dz = cos_60 * dz + vert * uz;
    const Ux = cos_60 * ux - vert * dx;
    const Uy = cos_60 * uy - vert * dy;
    const Uz = cos_60 * uz - vert * dz;
    const px = R * Dx;
    const py = R * Dy;
    const pz = R * Dz;
    const vrad = vx * dx + vy * dy + vz * dz;
    const vtan = vx * ux + vy * uy + vz * uz;
    const pvx = vrad * Dx + vtan * Ux;
    const pvy = vrad * Dy + vtan * Uy;
    const pvz = vrad * Dz + vtan * Uz;
    p = new StateVector(px, py, pz, pvx, pvy, pvz, major_state.t);
  } else {
    const r1 = -R * (minor_mass / (major_mass + minor_mass));
    const r2 = +R * (major_mass / (major_mass + minor_mass));
    const omega2 = (major_mass + minor_mass) / (R2 * R);
    let scale, numer1, numer2;
    if (point === 1 || point === 2) {
      scale = major_mass / (major_mass + minor_mass) * Math.cbrt(minor_mass / (3 * major_mass));
      numer1 = -major_mass;
      if (point == 1) {
        scale = 1 - scale;
        numer2 = +minor_mass;
      } else {
        scale = 1 + scale;
        numer2 = -minor_mass;
      }
    } else if (point === 3) {
      scale = (7 / 12 * minor_mass - major_mass) / (minor_mass + major_mass);
      numer1 = +major_mass;
      numer2 = +minor_mass;
    } else {
      throw `Invalid Langrage point ${point}. Must be an integer 1..5.`;
    }
    let x = R * scale - r1;
    let deltax;
    do {
      const dr1 = x - r1;
      const dr2 = x - r2;
      const accel = omega2 * x + numer1 / (dr1 * dr1) + numer2 / (dr2 * dr2);
      const deriv = omega2 - 2 * numer1 / (dr1 * dr1 * dr1) - 2 * numer2 / (dr2 * dr2 * dr2);
      deltax = accel / deriv;
      x -= deltax;
    } while (Math.abs(deltax / R) > 1e-14);
    scale = (x - r1) / R;
    p = new StateVector(scale * dx, scale * dy, scale * dz, scale * vx, scale * vy, scale * vz, major_state.t);
  }
  return p;
}
var GravitySimulator = class _GravitySimulator {
  /**
   * @brief Creates a gravity simulation object.
   *
   * @param {Body} originBody
   *      Specifies the origin of the reference frame.
   *      All position vectors and velocity vectors will use `originBody`
   *      as the origin of the coordinate system.
   *      This origin applies to all the input vectors provided in the
   *      `bodyStates` parameter of this function, along with all
   *      output vectors returned by {@link GravitySimulator#Update}.
   *      Most callers will want to provide one of the following:
   *      `Body.Sun` for heliocentric coordinates,
   *      `Body.SSB` for solar system barycentric coordinates,
   *      or `Body.Earth` for geocentric coordinates. Note that the
   *      gravity simulator does not correct for light travel time;
   *      all state vectors are tied to a Newtonian "instantaneous" time.
   *
   * @param {FlexibleDateTime} date
   *      The initial time at which to start the simulation.
   *
   * @param {StateVector[]} bodyStates
   *      An array of zero or more initial state vectors (positions and velocities)
   *      of the small bodies to be simulated.
   *      The caller must know the positions and velocities of the small bodies at an initial moment in time.
   *      Their positions and velocities are expressed with respect to `originBody`, using equatorial
   *      J2000 orientation (EQJ).
   *      Positions are expressed in astronomical units (AU).
   *      Velocities are expressed in AU/day.
   *      All the times embedded within the state vectors must exactly match `date`,
   *      or this constructor will throw an exception.
   */
  constructor(originBody, date, bodyStates) {
    const time = MakeTime(date);
    this.originBody = originBody;
    for (let b of bodyStates) {
      if (b.t.tt !== time.tt) {
        throw "Inconsistent times in bodyStates";
      }
    }
    const smallBodyList = [];
    const largeBodyDict = _GravitySimulator.CalcSolarSystem(time);
    this.curr = new GravSimEndpoint(time, largeBodyDict, smallBodyList);
    const o = this.InternalBodyState(originBody);
    for (let b of bodyStates) {
      const r = new TerseVector(b.x + o.r.x, b.y + o.r.y, b.z + o.r.z);
      const v = new TerseVector(b.vx + o.v.x, b.vy + o.v.y, b.vz + o.v.z);
      const a = TerseVector.zero();
      smallBodyList.push(new body_grav_calc_t(time.tt, r, v, a));
    }
    this.CalcBodyAccelerations();
    this.prev = this.Duplicate();
  }
  /**
   * @brief The body that was selected as the coordinate origin when this simulator was created.
   */
  get OriginBody() {
    return this.originBody;
  }
  /**
   * @brief The time represented by the current step of the gravity simulation.
   */
  get Time() {
    return this.curr.time;
  }
  /**
   * Advances the gravity simulation by a small time step.
   *
   * Updates the simulation of the user-supplied small bodies
   * to the time indicated by the `date` parameter.
   * Returns an array of state vectors for the simulated bodies.
   * The array is in the same order as the original array that
   * was used to construct this simulator object.
   * The positions and velocities in the returned array are
   * referenced to the `originBody` that was used to construct
   * this simulator.
   *
   * @param {FlexibleDateTime} date
   *      A time that is a small increment away from the current simulation time.
   *      It is up to the developer to figure out an appropriate time increment.
   *      Depending on the trajectories, a smaller or larger increment
   *      may be needed for the desired accuracy. Some experimentation may be needed.
   *      Generally, bodies that stay in the outer Solar System and move slowly can
   *      use larger time steps. Bodies that pass into the inner Solar System and
   *      move faster will need a smaller time step to maintain accuracy.
   *      The `date` value may be after or before the current simulation time
   *      to move forward or backward in time.
   *
   * @return {StateVector[]}
   *      An array of state vectors, one for each simulated small body.
   */
  Update(date) {
    const time = MakeTime(date);
    const dt = time.tt - this.curr.time.tt;
    if (dt === 0) {
      this.prev = this.Duplicate();
    } else {
      this.Swap();
      this.curr.time = time;
      this.curr.gravitators = _GravitySimulator.CalcSolarSystem(time);
      for (let i = 0; i < this.curr.bodies.length; ++i) {
        const p = this.prev.bodies[i];
        this.curr.bodies[i].r = UpdatePosition(dt, p.r, p.v, p.a);
      }
      this.CalcBodyAccelerations();
      for (let i = 0; i < this.curr.bodies.length; ++i) {
        const p = this.prev.bodies[i];
        const c = this.curr.bodies[i];
        const acc = p.a.mean(c.a);
        c.tt = time.tt;
        c.r = UpdatePosition(dt, p.r, p.v, acc);
        c.v = UpdateVelocity(dt, p.v, acc);
      }
      this.CalcBodyAccelerations();
    }
    const bodyStates = [];
    const ostate = this.InternalBodyState(this.originBody);
    for (let bcalc of this.curr.bodies) {
      bodyStates.push(new StateVector(bcalc.r.x - ostate.r.x, bcalc.r.y - ostate.r.y, bcalc.r.z - ostate.r.z, bcalc.v.x - ostate.v.x, bcalc.v.y - ostate.v.y, bcalc.v.z - ostate.v.z, time));
    }
    return bodyStates;
  }
  /**
   * Exchange the current time step with the previous time step.
   *
   * Sometimes it is helpful to "explore" various times near a given
   * simulation time step, while repeatedly returning to the original
   * time step. For example, when backdating a position for light travel
   * time, the caller may wish to repeatedly try different amounts of
   * backdating. When the backdating solver has converged, the caller
   * wants to leave the simulation in its original state.
   *
   * This function allows a single "undo" of a simulation, and does so
   * very efficiently.
   *
   * Usually this function will be called immediately after a matching
   * call to {@link GravitySimulator#Update}. It has the effect of rolling
   * back the most recent update. If called twice in a row, it reverts
   * the swap and thus has no net effect.
   *
   * The constructor initializes the current state and previous
   * state to be identical. Both states represent the `time` parameter that was
   * passed into the constructor. Therefore, `Swap` will
   * have no effect from the caller's point of view when passed a simulator
   * that has not yet been updated by a call to {@link GravitySimulator#Update}.
   */
  Swap() {
    const swap = this.curr;
    this.curr = this.prev;
    this.prev = swap;
  }
  /**
   * Get the position and velocity of a Solar System body included in the simulation.
   *
   * In order to simulate the movement of small bodies through the Solar System,
   * the simulator needs to calculate the state vectors for the Sun and planets.
   *
   * If an application wants to know the positions of one or more of the planets
   * in addition to the small bodies, this function provides a way to obtain
   * their state vectors. This is provided for the sake of efficiency, to avoid
   * redundant calculations.
   *
   * The state vector is returned relative to the position and velocity
   * of the `originBody` parameter that was passed to this object's constructor.
   *
   * @param {Body} body
   *      The Sun, Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, or Neptune.
   */
  SolarSystemBodyState(body) {
    const bstate = this.InternalBodyState(body);
    const ostate = this.InternalBodyState(this.originBody);
    return ExportState(bstate.sub(ostate), this.curr.time);
  }
  InternalBodyState(body) {
    if (body === Body.SSB)
      return new body_state_t(this.curr.time.tt, TerseVector.zero(), TerseVector.zero());
    const bstate = this.curr.gravitators[body];
    if (bstate)
      return bstate;
    throw `Invalid body: ${body}`;
  }
  static CalcSolarSystem(time) {
    const dict = {};
    const ssb = new body_state_t(time.tt, TerseVector.zero(), TerseVector.zero());
    dict[Body.Mercury] = AdjustBarycenterPosVel(ssb, time.tt, Body.Mercury, MERCURY_GM);
    dict[Body.Venus] = AdjustBarycenterPosVel(ssb, time.tt, Body.Venus, VENUS_GM);
    dict[Body.Earth] = AdjustBarycenterPosVel(ssb, time.tt, Body.Earth, EARTH_GM + MOON_GM);
    dict[Body.Mars] = AdjustBarycenterPosVel(ssb, time.tt, Body.Mars, MARS_GM);
    dict[Body.Jupiter] = AdjustBarycenterPosVel(ssb, time.tt, Body.Jupiter, JUPITER_GM);
    dict[Body.Saturn] = AdjustBarycenterPosVel(ssb, time.tt, Body.Saturn, SATURN_GM);
    dict[Body.Uranus] = AdjustBarycenterPosVel(ssb, time.tt, Body.Uranus, URANUS_GM);
    dict[Body.Neptune] = AdjustBarycenterPosVel(ssb, time.tt, Body.Neptune, NEPTUNE_GM);
    for (let body in dict) {
      dict[body].r.decr(ssb.r);
      dict[body].v.decr(ssb.v);
    }
    dict[Body.Sun] = new body_state_t(time.tt, ssb.r.neg(), ssb.v.neg());
    return dict;
  }
  CalcBodyAccelerations() {
    for (let b of this.curr.bodies) {
      b.a = TerseVector.zero();
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Sun].r, SUN_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Mercury].r, MERCURY_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Venus].r, VENUS_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Earth].r, EARTH_GM + MOON_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Mars].r, MARS_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Jupiter].r, JUPITER_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Saturn].r, SATURN_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Uranus].r, URANUS_GM);
      _GravitySimulator.AddAcceleration(b.a, b.r, this.curr.gravitators[Body.Neptune].r, NEPTUNE_GM);
    }
  }
  static AddAcceleration(acc, smallPos, majorPos, gm) {
    const dx = majorPos.x - smallPos.x;
    const dy = majorPos.y - smallPos.y;
    const dz = majorPos.z - smallPos.z;
    const r2 = dx * dx + dy * dy + dz * dz;
    const pull = gm / (r2 * Math.sqrt(r2));
    acc.x += dx * pull;
    acc.y += dy * pull;
    acc.z += dz * pull;
  }
  Duplicate() {
    const gravitators = {};
    for (let body in this.curr.gravitators) {
      gravitators[body] = this.curr.gravitators[body].clone();
    }
    const bodies = [];
    for (let b of this.curr.bodies) {
      bodies.push(b.clone());
    }
    return new GravSimEndpoint(this.curr.time, gravitators, bodies);
  }
};
var GravSimEndpoint = class {
  constructor(time, gravitators, bodies) {
    this.time = time;
    this.gravitators = gravitators;
    this.bodies = bodies;
  }
};

// server/services/kundliChart.ts
var Astronomy = void 0 ?? astronomy_exports;
var PLANET_ORDER = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu"
];
var PLANET_NAMES = {
  sun: { roman: "Surya", hindi: "\u0938\u0942\u0930\u094D\u092F", english: "Sun" },
  moon: { roman: "Chandra", hindi: "\u091A\u0902\u0926\u094D\u0930", english: "Moon" },
  mars: { roman: "Mangal", hindi: "\u092E\u0902\u0917\u0932", english: "Mars" },
  mercury: { roman: "Budh", hindi: "\u092C\u0941\u0927", english: "Mercury" },
  jupiter: { roman: "Guru", hindi: "\u0917\u0941\u0930\u0941", english: "Jupiter" },
  venus: { roman: "Shukra", hindi: "\u0936\u0941\u0915\u094D\u0930", english: "Venus" },
  saturn: { roman: "Shani", hindi: "\u0936\u0928\u093F", english: "Saturn" },
  rahu: { roman: "Rahu", hindi: "\u0930\u093E\u0939\u0941", english: "Rahu" },
  ketu: { roman: "Ketu", hindi: "\u0915\u0947\u0924\u0941", english: "Ketu" }
};
var SIGNS = [
  { roman: "Mesh", hindi: "\u092E\u0947\u0937", english: "Aries", lord: "mars" },
  { roman: "Vrishabh", hindi: "\u0935\u0943\u0937\u092D", english: "Taurus", lord: "venus" },
  { roman: "Mithun", hindi: "\u092E\u093F\u0925\u0941\u0928", english: "Gemini", lord: "mercury" },
  { roman: "Kark", hindi: "\u0915\u0930\u094D\u0915", english: "Cancer", lord: "moon" },
  { roman: "Singh", hindi: "\u0938\u093F\u0902\u0939", english: "Leo", lord: "sun" },
  { roman: "Kanya", hindi: "\u0915\u0928\u094D\u092F\u093E", english: "Virgo", lord: "mercury" },
  { roman: "Tula", hindi: "\u0924\u0941\u0932\u093E", english: "Libra", lord: "venus" },
  { roman: "Vrishchik", hindi: "\u0935\u0943\u0936\u094D\u091A\u093F\u0915", english: "Scorpio", lord: "mars" },
  { roman: "Dhanu", hindi: "\u0927\u0928\u0941", english: "Sagittarius", lord: "jupiter" },
  { roman: "Makar", hindi: "\u092E\u0915\u0930", english: "Capricorn", lord: "saturn" },
  { roman: "Kumbh", hindi: "\u0915\u0941\u0902\u092D", english: "Aquarius", lord: "saturn" },
  { roman: "Meen", hindi: "\u092E\u0940\u0928", english: "Pisces", lord: "jupiter" }
];
var NAKSHATRAS = [
  { roman: "Ashwini", hindi: "\u0905\u0936\u094D\u0935\u093F\u0928\u0940" },
  { roman: "Bharani", hindi: "\u092D\u0930\u0923\u0940" },
  { roman: "Krittika", hindi: "\u0915\u0943\u0924\u094D\u0924\u093F\u0915\u093E" },
  { roman: "Rohini", hindi: "\u0930\u094B\u0939\u093F\u0923\u0940" },
  { roman: "Mrigashira", hindi: "\u092E\u0943\u0917\u0936\u093F\u0930\u093E" },
  { roman: "Ardra", hindi: "\u0906\u0930\u094D\u0926\u094D\u0930\u093E" },
  { roman: "Punarvasu", hindi: "\u092A\u0941\u0928\u0930\u094D\u0935\u0938\u0941" },
  { roman: "Pushya", hindi: "\u092A\u0941\u0937\u094D\u092F" },
  { roman: "Ashlesha", hindi: "\u0906\u0936\u094D\u0932\u0947\u0937\u093E" },
  { roman: "Magha", hindi: "\u092E\u0918\u093E" },
  { roman: "Purva Phalguni", hindi: "\u092A\u0942\u0930\u094D\u0935\u093E \u092B\u093E\u0932\u094D\u0917\u0941\u0928\u0940" },
  { roman: "Uttara Phalguni", hindi: "\u0909\u0924\u094D\u0924\u0930\u093E \u092B\u093E\u0932\u094D\u0917\u0941\u0928\u0940" },
  { roman: "Hasta", hindi: "\u0939\u0938\u094D\u0924" },
  { roman: "Chitra", hindi: "\u091A\u093F\u0924\u094D\u0930\u093E" },
  { roman: "Swati", hindi: "\u0938\u094D\u0935\u093E\u0924\u093F" },
  { roman: "Vishakha", hindi: "\u0935\u093F\u0936\u093E\u0916\u093E" },
  { roman: "Anuradha", hindi: "\u0905\u0928\u0941\u0930\u093E\u0927\u093E" },
  { roman: "Jyeshtha", hindi: "\u091C\u094D\u092F\u0947\u0937\u094D\u0920\u093E" },
  { roman: "Mula", hindi: "\u092E\u0942\u0932" },
  { roman: "Purva Ashadha", hindi: "\u092A\u0942\u0930\u094D\u0935\u093E\u0937\u093E\u0922\u093C\u093E" },
  { roman: "Uttara Ashadha", hindi: "\u0909\u0924\u094D\u0924\u0930\u093E\u0937\u093E\u0922\u093C\u093E" },
  { roman: "Shravana", hindi: "\u0936\u094D\u0930\u0935\u0923" },
  { roman: "Dhanishta", hindi: "\u0927\u0928\u093F\u0937\u094D\u0920\u093E" },
  { roman: "Shatabhisha", hindi: "\u0936\u0924\u092D\u093F\u0937\u093E" },
  { roman: "Purva Bhadrapada", hindi: "\u092A\u0942\u0930\u094D\u0935\u093E \u092D\u093E\u0926\u094D\u0930\u092A\u0926" },
  { roman: "Uttara Bhadrapada", hindi: "\u0909\u0924\u094D\u0924\u0930\u093E \u092D\u093E\u0926\u094D\u0930\u092A\u0926" },
  { roman: "Revati", hindi: "\u0930\u0947\u0935\u0924\u0940" }
];
var DASHA_SEQUENCE = [
  { lord: "ketu", years: 7 },
  { lord: "venus", years: 20 },
  { lord: "sun", years: 6 },
  { lord: "moon", years: 10 },
  { lord: "mars", years: 7 },
  { lord: "rahu", years: 18 },
  { lord: "jupiter", years: 16 },
  { lord: "saturn", years: 19 },
  { lord: "mercury", years: 17 }
];
var YEAR_MS = 365.25 * 24 * 60 * 60 * 1e3;
var NAKSHATRA_SPAN = 360 / 27;
var IST_OFFSET_MINUTES = 330;
var normalize360 = (deg2) => (deg2 % 360 + 360) % 360;
var toRad = (deg2) => deg2 * Math.PI / 180;
var toDeg = (rad2) => rad2 * 180 / Math.PI;
function julianCenturies(date) {
  const julianDay = date.getTime() / 864e5 + 24405875e-1;
  return (julianDay - 2451545) / 36525;
}
function lahiriAyanamsa(date) {
  const t = julianCenturies(date);
  return 23.85306 + 1.39722 * t + 31e-5 * t * t;
}
function tropicalLongitude(body, date) {
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
}
function meanNodeLongitude(date) {
  const t = julianCenturies(date);
  return normalize360(125.04452 - 1934.136261 * t + 20708e-7 * t * t + t * t * t / 45e4);
}
function tropicalAscendant(date, lat, lon) {
  const t = julianCenturies(date);
  const obliquity = toRad(23.4392911 - 0.0130042 * t);
  const localSidereal = toRad(normalize360(Astronomy.SiderealTime(date) * 15 + lon));
  const ascendant = Math.atan2(
    Math.cos(localSidereal),
    -(Math.sin(localSidereal) * Math.cos(obliquity) + Math.tan(toRad(lat)) * Math.sin(obliquity))
  );
  return normalize360(toDeg(ascendant));
}
var ASTRONOMY_BODIES = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mars: Astronomy.Body.Mars,
  mercury: Astronomy.Body.Mercury,
  jupiter: Astronomy.Body.Jupiter,
  venus: Astronomy.Body.Venus,
  saturn: Astronomy.Body.Saturn
};
function siderealLongitudes(date) {
  const ayanamsa = lahiriAyanamsa(date);
  const result = {};
  for (const planet of PLANET_ORDER) {
    const body = ASTRONOMY_BODIES[planet];
    if (body) result[planet] = normalize360(tropicalLongitude(body, date) - ayanamsa);
  }
  result.rahu = normalize360(meanNodeLongitude(date) - ayanamsa);
  result.ketu = normalize360(result.rahu + 180);
  return result;
}
var signOf = (longitude) => Math.floor(normalize360(longitude) / 30);
function mahadashas(moonLongitude, birth) {
  const nakshatraIndex = Math.floor(moonLongitude / NAKSHATRA_SPAN);
  const fractionDone = moonLongitude % NAKSHATRA_SPAN / NAKSHATRA_SPAN;
  const firstIndex = nakshatraIndex % 9;
  const first = DASHA_SEQUENCE[firstIndex];
  const periods = [];
  let start = new Date(birth.getTime() - fractionDone * first.years * YEAR_MS);
  for (let i = 0; i < 9; i++) {
    const { lord, years } = DASHA_SEQUENCE[(firstIndex + i) % 9];
    const end = new Date(start.getTime() + years * YEAR_MS);
    periods.push({ lord, start, end });
    start = end;
  }
  return periods;
}
function antardashas(maha) {
  const mahaIndex = DASHA_SEQUENCE.findIndex((d) => d.lord === maha.lord);
  const mahaYears = DASHA_SEQUENCE[mahaIndex].years;
  const periods = [];
  let start = maha.start;
  for (let i = 0; i < 9; i++) {
    const { lord, years } = DASHA_SEQUENCE[(mahaIndex + i) % 9];
    const end = new Date(start.getTime() + mahaYears * years / 120 * YEAR_MS);
    periods.push({ lord, start, end });
    start = end;
  }
  return periods;
}
function computeKundliChart(input) {
  const { birthUtc, hasBirthTime, lat, lon } = input;
  const longitudes = siderealLongitudes(birthUtc);
  const nextDay = siderealLongitudes(new Date(birthUtc.getTime() + 864e5));
  const retrograde = {};
  for (const planet of PLANET_ORDER) {
    const movement = normalize360(nextDay[planet] - longitudes[planet] + 180) - 180;
    retrograde[planet] = planet !== "rahu" && planet !== "ketu" && movement < 0;
  }
  let lagnaSign = null;
  let lagnaDegree = null;
  if (hasBirthTime && typeof lat === "number" && typeof lon === "number") {
    const lagna = normalize360(tropicalAscendant(birthUtc, lat, lon) - lahiriAyanamsa(birthUtc));
    lagnaSign = signOf(lagna);
    lagnaDegree = lagna % 30;
  }
  const moonSign = signOf(longitudes.moon);
  let moonSignUncertain = false;
  if (!hasBirthTime) {
    const halfDay = 12 * 60 * 60 * 1e3;
    const dayStart = siderealLongitudes(new Date(birthUtc.getTime() - halfDay)).moon;
    const dayEnd = siderealLongitudes(new Date(birthUtc.getTime() + halfDay)).moon;
    moonSignUncertain = signOf(dayStart) !== signOf(dayEnd);
  }
  const nakshatraIndex = Math.floor(longitudes.moon / NAKSHATRA_SPAN);
  const nakshatraPada = Math.floor(longitudes.moon % NAKSHATRA_SPAN / (NAKSHATRA_SPAN / 4)) + 1;
  return {
    longitudes,
    lagnaSign,
    lagnaDegree,
    firstHouseSign: lagnaSign ?? moonSign,
    retrograde,
    moonSign,
    moonSignUncertain,
    nakshatraIndex,
    nakshatraPada,
    mahadashas: mahadashas(longitudes.moon, birthUtc)
  };
}
var KNOWN_PLACES = {
  delhi: [28.61, 77.21],
  "new delhi": [28.61, 77.21],
  mumbai: [19.08, 72.88],
  bombay: [19.08, 72.88],
  kolkata: [22.57, 88.36],
  calcutta: [22.57, 88.36],
  chennai: [13.08, 80.27],
  madras: [13.08, 80.27],
  bengaluru: [12.97, 77.59],
  bangalore: [12.97, 77.59],
  hyderabad: [17.39, 78.49],
  ahmedabad: [23.02, 72.57],
  pune: [18.52, 73.86],
  jaipur: [26.91, 75.79],
  lucknow: [26.85, 80.95],
  kanpur: [26.45, 80.33],
  nagpur: [21.15, 79.09],
  indore: [22.72, 75.86],
  bhopal: [23.26, 77.41],
  patna: [25.59, 85.14],
  vadodara: [22.31, 73.18],
  baroda: [22.31, 73.18],
  surat: [21.17, 72.83],
  ludhiana: [30.9, 75.86],
  agra: [27.18, 78.01],
  nashik: [20, 73.79],
  faridabad: [28.41, 77.31],
  meerut: [28.98, 77.71],
  rajkot: [22.3, 70.8],
  varanasi: [25.32, 82.97],
  banaras: [25.32, 82.97],
  srinagar: [34.08, 74.8],
  aurangabad: [19.88, 75.34],
  dhanbad: [23.8, 86.43],
  amritsar: [31.63, 74.87],
  prayagraj: [25.44, 81.85],
  allahabad: [25.44, 81.85],
  ranchi: [23.34, 85.31],
  howrah: [22.59, 88.26],
  coimbatore: [11.02, 76.96],
  jabalpur: [23.18, 79.99],
  gwalior: [26.22, 78.18],
  vijayawada: [16.51, 80.65],
  jodhpur: [26.24, 73.02],
  madurai: [9.93, 78.12],
  raipur: [21.25, 81.63],
  kota: [25.18, 75.83],
  guwahati: [26.14, 91.74],
  chandigarh: [30.73, 76.78],
  solapur: [17.66, 75.91],
  bareilly: [28.37, 79.43],
  moradabad: [28.84, 78.77],
  mysuru: [12.3, 76.64],
  mysore: [12.3, 76.64],
  gurgaon: [28.46, 77.03],
  gurugram: [28.46, 77.03],
  aligarh: [27.88, 78.08],
  jalandhar: [31.33, 75.58],
  bhubaneswar: [20.3, 85.82],
  salem: [11.66, 78.15],
  thiruvananthapuram: [8.52, 76.94],
  trivandrum: [8.52, 76.94],
  kochi: [9.93, 76.27],
  cochin: [9.93, 76.27],
  kozhikode: [11.26, 75.78],
  gorakhpur: [26.76, 83.37],
  bikaner: [28.02, 73.31],
  noida: [28.54, 77.39],
  ghaziabad: [28.67, 77.45],
  jamshedpur: [22.8, 86.2],
  bhilai: [21.19, 81.38],
  cuttack: [20.46, 85.88],
  dehradun: [30.32, 78.03],
  ajmer: [26.45, 74.64],
  udaipur: [24.58, 73.71],
  jammu: [32.73, 74.86],
  ujjain: [23.18, 75.78],
  siliguri: [26.73, 88.4],
  jhansi: [25.45, 78.57],
  mathura: [27.49, 77.67],
  shimla: [31.1, 77.17],
  panaji: [15.49, 73.83],
  goa: [15.49, 73.83],
  visakhapatnam: [17.69, 83.22],
  vizag: [17.69, 83.22],
  thane: [19.22, 72.98],
  saharanpur: [29.97, 77.55],
  muzaffarpur: [26.12, 85.39],
  gaya: [24.8, 85],
  bhagalpur: [25.24, 86.97],
  darbhanga: [26.15, 85.9],
  alwar: [27.55, 76.63],
  sikar: [27.61, 75.14],
  bhilwara: [25.35, 74.64],
  rohtak: [28.9, 76.61],
  hisar: [29.15, 75.72],
  panipat: [29.39, 76.97],
  karnal: [29.69, 76.99],
  ambala: [30.38, 76.78],
  patiala: [30.34, 76.39],
  bathinda: [30.21, 74.95],
  haridwar: [29.95, 78.16],
  ayodhya: [26.79, 82.2],
  jaunpur: [25.75, 82.68],
  azamgarh: [26.07, 83.19],
  sultanpur: [26.26, 82.07],
  firozabad: [27.15, 78.4],
  muzaffarnagar: [29.47, 77.71],
  rampur: [28.81, 79.03],
  shahjahanpur: [27.88, 79.91],
  bilaspur: [22.08, 82.15],
  korba: [22.36, 82.75],
  durg: [21.19, 81.28],
  satna: [24.58, 80.83],
  sagar: [23.84, 78.74],
  rewa: [24.53, 81.3],
  ratlam: [23.33, 75.04],
  dewas: [22.97, 76.05],
  kolhapur: [16.7, 74.24],
  nanded: [19.14, 77.32],
  amravati: [20.94, 77.78],
  akola: [20.7, 77.01],
  jalgaon: [21, 75.56],
  latur: [18.4, 76.58],
  sangli: [16.85, 74.58],
  bhavnagar: [21.76, 72.15],
  jamnagar: [22.47, 70.06],
  junagadh: [21.52, 70.46],
  gandhinagar: [23.22, 72.65],
  anand: [22.56, 72.93],
  hubli: [15.36, 75.12],
  belgaum: [15.85, 74.5],
  belagavi: [15.85, 74.5],
  mangalore: [12.91, 74.86],
  mangaluru: [12.91, 74.86],
  gulbarga: [17.33, 76.83],
  kalaburagi: [17.33, 76.83],
  warangal: [17.97, 79.59],
  guntur: [16.31, 80.44],
  nellore: [14.44, 79.99],
  tirupati: [13.63, 79.42],
  tiruchirappalli: [10.79, 78.7],
  trichy: [10.79, 78.7],
  tirunelveli: [8.71, 77.76],
  thrissur: [10.53, 76.21],
  kollam: [8.89, 76.61],
  asansol: [23.68, 86.95],
  durgapur: [23.52, 87.31],
  rourkela: [22.26, 84.85],
  sambalpur: [21.47, 83.98],
  bokaro: [23.67, 86.15],
  imphal: [24.82, 93.94],
  shillong: [25.58, 91.89],
  agartala: [23.83, 91.29],
  aizawl: [23.73, 92.72],
  gangtok: [27.33, 88.61],
  itanagar: [27.08, 93.61],
  kohima: [25.67, 94.11],
  puducherry: [11.94, 79.81],
  pondicherry: [11.94, 79.81],
  "\u0926\u093F\u0932\u094D\u0932\u0940": [28.61, 77.21],
  "\u092E\u0941\u0902\u092C\u0908": [19.08, 72.88],
  "\u091C\u092F\u092A\u0941\u0930": [26.91, 75.79],
  "\u0932\u0916\u0928\u090A": [26.85, 80.95],
  "\u092A\u091F\u0928\u093E": [25.59, 85.14],
  "\u0915\u093E\u0928\u092A\u0941\u0930": [26.45, 80.33],
  "\u092D\u094B\u092A\u093E\u0932": [23.26, 77.41],
  "\u0907\u0902\u0926\u094C\u0930": [22.72, 75.86],
  "\u0935\u093E\u0930\u093E\u0923\u0938\u0940": [25.32, 82.97],
  "\u0906\u0917\u0930\u093E": [27.18, 78.01],
  "\u0915\u094B\u0932\u0915\u093E\u0924\u093E": [22.57, 88.36],
  "\u092A\u0941\u0923\u0947": [18.52, 73.86]
};
var COUNTRY_UTC_OFFSETS = {
  in: 330,
  lk: 330,
  np: 345,
  pk: 300,
  bd: 360,
  bt: 360,
  ae: 240,
  om: 240,
  sa: 180,
  qa: 180,
  kw: 180,
  bh: 180,
  sg: 480,
  my: 480,
  gb: 0
};
var placeCache = /* @__PURE__ */ new Map();
function lookupKnownPlace(place) {
  const cleaned = place.toLowerCase().replace(/[.()]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = [cleaned, ...cleaned.split(/[,\-/]/).map((part) => part.trim())];
  for (const candidate of candidates) {
    const hit = KNOWN_PLACES[candidate];
    if (hit) return { lat: hit[0], lon: hit[1], utcOffsetMinutes: IST_OFFSET_MINUTES };
  }
  return null;
}
async function geocodeOnline(place) {
  const search = async (extraParams) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&accept-language=en&q=${encodeURIComponent(place)}${extraParams}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "puchlo.in kundli chat" },
      signal: AbortSignal.timeout(3500)
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return rows[0] ?? null;
  };
  const row = await search("&countrycodes=in") ?? await search("");
  if (!row) return null;
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const country = row.address?.country_code?.toLowerCase() ?? "in";
  const utcOffsetMinutes = COUNTRY_UTC_OFFSETS[country] ?? Math.round(lon / 7.5) * 30;
  return { lat, lon, utcOffsetMinutes };
}
async function resolveBirthPlace(place) {
  const key = place.trim().toLowerCase();
  if (!key) return null;
  const known = lookupKnownPlace(key);
  if (known) return known;
  if (placeCache.has(key)) return placeCache.get(key) ?? null;
  try {
    const found = await geocodeOnline(place.trim());
    placeCache.set(key, found);
    return found;
  } catch (error) {
    console.warn("[kundli] birth place lookup failed:", error);
    return null;
  }
}
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var monthYear = (date) => `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
var planetLabel = (planet) => `${PLANET_NAMES[planet].roman} (${PLANET_NAMES[planet].english}, ${PLANET_NAMES[planet].hindi})`;
var signLabel = (sign) => `${SIGNS[sign].roman} (${SIGNS[sign].english}, ${SIGNS[sign].hindi})`;
var TOPICS = [
  { label: "SHAADI / RISHTA", house: 7, houseName: "shaadi ka ghar", supportHouses: [], extra: (g) => g === "female" ? ["venus", "jupiter"] : ["venus"] },
  { label: "KAAM / NAUKRI / BUSINESS", house: 10, houseName: "kaam ka ghar", supportHouses: [11], extra: () => [] },
  { label: "PAISA", house: 2, houseName: "paise ka ghar", supportHouses: [11], extra: () => ["jupiter"] },
  { label: "SANTAAN (BACHCHE) / PADHAI", house: 5, houseName: "santaan aur padhai ka ghar", supportHouses: [], extra: () => ["jupiter"] },
  { label: "GHAR / GAADI / ZAMEEN", house: 4, houseName: "ghar-sukh ka ghar", supportHouses: [], extra: () => [] },
  { label: "SEHAT", house: 1, houseName: "sharir ka ghar", supportHouses: [], extra: () => [] },
  { label: "VIDESH (FOREIGN)", house: 12, houseName: "videsh ka ghar", supportHouses: [], extra: () => ["rahu"] }
];
var EXALTATION_SIGN = {
  sun: 0,
  moon: 1,
  mars: 9,
  mercury: 5,
  jupiter: 3,
  venus: 11,
  saturn: 6
};
function findPeriod(periods, at) {
  return periods.find((p) => p.start <= at && at < p.end) ?? null;
}
async function buildKundliReading(details, now = /* @__PURE__ */ new Date()) {
  const date = parseBirthDate(details.dateOfBirth);
  if (!date) return null;
  const time = parseBirthTime(details.timeOfBirth);
  let place = null;
  if (typeof details.lat === "number" && typeof details.lon === "number") {
    const known = lookupKnownPlace(details.cityOfBirth);
    place = {
      lat: details.lat,
      lon: details.lon,
      utcOffsetMinutes: known?.utcOffsetMinutes ?? IST_OFFSET_MINUTES
    };
    if (!known && (details.lon < 68 || details.lon > 97.5 || details.lat < 6 || details.lat > 37)) {
      place = await resolveBirthPlace(details.cityOfBirth) ?? place;
    }
  } else {
    place = await resolveBirthPlace(details.cityOfBirth);
  }
  const utcOffsetMinutes = place?.utcOffsetMinutes ?? IST_OFFSET_MINUTES;
  const localAsUtc = Date.UTC(date.year, date.month - 1, date.day, time?.hour ?? 12, time?.minute ?? 0);
  const birthUtc = new Date(localAsUtc - utcOffsetMinutes * 6e4);
  if (birthUtc > now) return null;
  const chart = computeKundliChart({
    birthUtc,
    hasBirthTime: !!time,
    lat: place?.lat,
    lon: place?.lon
  });
  const houseOf2 = (planet) => (signOf(chart.longitudes[planet]) - chart.firstHouseSign + 12) % 12 + 1;
  const signOfHouse2 = (house) => (chart.firstHouseSign + house - 1) % 12;
  const planetsInHouse = (house) => PLANET_ORDER.filter((p) => houseOf2(p) === house);
  const ageYears = Math.floor((now.getTime() - birthUtc.getTime()) / YEAR_MS);
  const lines = [];
  lines.push(`Aaj ki date: ${now.getUTCDate()} ${monthYear(now)}.`);
  lines.push(
    `Jatak: ${details.name}, ${details.gender}, janm ${date.day} ${MONTHS[date.month - 1]} ${date.year}${time ? `, ${time.hour % 12 || 12}:${String(time.minute).padStart(2, "0")} ${time.hour >= 12 ? "PM" : "AM"}` : ", janm samay pata nahi"}, ${details.cityOfBirth}. Umar abhi: ${ageYears} saal.`
  );
  if (chart.lagnaSign !== null) {
    lines.push(`Lagna: ${signLabel(chart.lagnaSign)}.`);
  } else if (!time) {
    lines.push(
      "Lagna: pata nahi (janm samay nahi diya). Neeche ke bhav (houses) Chandra rashi se gine gaye hain. Lagna ka naam mat batana."
    );
  } else {
    lines.push(
      "Lagna: pata nahi (janm sthan map par nahi mila). Neeche ke bhav (houses) Chandra rashi se gine gaye hain. Lagna ka naam mat batana."
    );
  }
  lines.push(
    `Rashi (Chandra rashi): ${signLabel(chart.moonSign)}${chart.moonSignUncertain ? " \u2014 pakka nahi, us din Chandra ne rashi badli thi" : ""}.`
  );
  lines.push(
    `Nakshatra: ${NAKSHATRAS[chart.nakshatraIndex].roman} (${NAKSHATRAS[chart.nakshatraIndex].hindi}), charan ${chart.nakshatraPada}.`
  );
  lines.push("Grah (planet \u2192 rashi, bhav/house):");
  for (const planet of PLANET_ORDER) {
    lines.push(
      `- ${planetLabel(planet)}: ${SIGNS[signOf(chart.longitudes[planet])].roman}, bhav ${houseOf2(planet)}${chart.retrograde[planet] ? ", vakri (retrograde)" : ""}`
    );
  }
  const maha = findPeriod(chart.mahadashas, now);
  let upcoming = [];
  if (maha) {
    const mahaIndex = chart.mahadashas.indexOf(maha);
    const horizon = new Date(now.getTime() + 15 * YEAR_MS);
    upcoming = chart.mahadashas.slice(mahaIndex, mahaIndex + 3).flatMap((m) => antardashas(m).map((antar) => ({ maha: m.lord, antar }))).filter(({ antar }) => antar.end > now && antar.start < horizon);
    const current = upcoming[0];
    lines.push(
      `Dasha abhi: ${PLANET_NAMES[maha.lord].roman} ki mahadasha (${monthYear(maha.start)} se ${monthYear(maha.end)} tak)` + (current ? `, usme ${PLANET_NAMES[current.antar.lord].roman} ki antardasha (${monthYear(current.antar.start)} se ${monthYear(current.antar.end)} tak).` : ".")
    );
    lines.push("Aage ki antardasha:");
    for (const { maha: mahaLord, antar } of upcoming.slice(1, 8)) {
      lines.push(
        `- ${PLANET_NAMES[mahaLord].roman}/${PLANET_NAMES[antar.lord].roman}: ${monthYear(antar.start)} se ${monthYear(antar.end)}`
      );
    }
  }
  const lordStrength = (lord) => {
    const sign = signOf(chart.longitudes[lord]);
    const house = houseOf2(lord);
    if (SIGNS[sign].lord === lord) return { text: "apni hi rashi me \u2014 bahut mazboot", score: 2 };
    if (EXALTATION_SIGN[lord] === sign) return { text: "uchch rashi me \u2014 bahut mazboot", score: 2 };
    if (EXALTATION_SIGN[lord] !== void 0 && (EXALTATION_SIGN[lord] + 6) % 12 === sign) {
      return { text: "neech rashi me \u2014 kamzor, deri aur mehnat zyada", score: -1 };
    }
    if ([6, 8, 12].includes(house)) return { text: `ghar ${house} me \u2014 kamzor jagah, rukawat aur deri`, score: -1 };
    if ([1, 4, 5, 7, 9, 10, 11, 2].includes(house)) return { text: `ghar ${house} me \u2014 achhi jagah`, score: 1 };
    return { text: `ghar ${house} me \u2014 mehnat se fal`, score: 0 };
  };
  lines.push("");
  lines.push("TOPIC-WISE READING (sawaal jis topic ka ho, usi block se jawab banao; 'achha samay' ke saal yahin se lo):");
  for (const topic of TOPICS) {
    const lord = SIGNS[signOfHouse2(topic.house)].lord;
    const occupants = planetsInHouse(topic.house);
    const strength = lordStrength(lord);
    const significators = /* @__PURE__ */ new Set([lord, ...occupants, ...topic.extra(details.gender)]);
    for (const house of topic.supportHouses) significators.add(SIGNS[signOfHouse2(house)].lord);
    const windows = upcoming.filter(({ antar }) => significators.has(antar.lord)).slice(0, 3).map(({ maha: mahaLord, antar }) => {
      const range = antar.start <= now ? `abhi se ${monthYear(antar.end)} tak (abhi chal raha hai)` : `${monthYear(antar.start)} se ${monthYear(antar.end)}`;
      return `${range}, ${PLANET_NAMES[antar.lord].roman} ka samay${significators.has(mahaLord) ? " [sabse mazboot]" : ""}`;
    });
    lines.push(`# ${topic.label}`);
    lines.push(
      `- ${topic.houseName} (ghar ${topic.house}, rashi ${SIGNS[signOfHouse2(topic.house)].roman}): isme ${occupants.length ? occupants.map((p) => PLANET_NAMES[p].roman).join(", ") + " baithe hain" : "koi grah nahi baitha"}. Is ghar ka swami ${PLANET_NAMES[lord].roman} hai, jo ${strength.text}.`
    );
    lines.push(
      `- Kul milakar: ${strength.score >= 2 ? "mazboot \u2014 achhe nateeje" : strength.score === 1 ? "theek-thaak se achha" : strength.score === 0 ? "beech ka \u2014 mehnat se milega" : "thoda kamzor \u2014 deri ya rukawat, par hoga"}.`
    );
    if (topic.label !== "SEHAT") {
      lines.push(
        `- Achha samay: ${windows.length ? windows.join("; ") : "agle 15 saal me koi khaas mazboot samay nahi \u2014 mehnat aur sahi faisle par zyada nirbhar"}.`
      );
    }
  }
  lines.push("");
  const today = siderealLongitudes(now);
  const fromMoon = (planet) => (signOf(today[planet]) - chart.moonSign + 12) % 12 + 1;
  const saturnFromMoon = fromMoon("saturn");
  const sadeSati = saturnFromMoon === 12 || saturnFromMoon === 1 || saturnFromMoon === 2;
  lines.push(
    `Gochar (aaj): Guru ${SIGNS[signOf(today.jupiter)].roman} me (rashi se ${fromMoon("jupiter")}va), Shani ${SIGNS[signOf(today.saturn)].roman} me (rashi se ${saturnFromMoon}va), Rahu ${SIGNS[signOf(today.rahu)].roman} me (rashi se ${fromMoon("rahu")}va).`
  );
  lines.push(
    `Sade sati: ${sadeSati ? "haan, abhi chal rahi hai" : saturnFromMoon === 4 || saturnFromMoon === 8 ? "nahi, par Shani ki dhaiya chal rahi hai" : "nahi"}.`
  );
  const names = (entry) => ({
    roman: entry.roman,
    hindi: entry.hindi,
    english: entry.english
  });
  return {
    promptContext: lines.join("\n"),
    summary: {
      lagna: chart.lagnaSign !== null ? names(SIGNS[chart.lagnaSign]) : null,
      rashi: names(SIGNS[chart.moonSign]),
      nakshatra: NAKSHATRAS[chart.nakshatraIndex],
      mahadasha: maha ? names(PLANET_NAMES[maha.lord]) : null,
      place: place ? { lat: place.lat, lon: place.lon } : null
    }
  };
}

// server/services/appEvents.ts
import { createClient as createClient4 } from "@supabase/supabase-js";
var getSupabaseAdmin4 = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return createClient4(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};
var insertAppEventRow = async (input) => {
  const supabase = getSupabaseAdmin4();
  const digits = input.phoneNumber?.replace(/\D/g, "").slice(-10);
  const { data, error } = await supabase.from("app_events").insert({
    event_name: input.eventName,
    device_id: input.deviceId,
    user_id: input.userId?.trim() || null,
    phone_number: digits || null,
    properties: input.properties ?? {}
  }).select(
    "id, event_name, device_id, user_id, phone_number, properties, created_at"
  ).single();
  if (error) throw error;
  return data;
};

// shared/metaEvents.ts
var META_PIXEL_ID = "1838700220429198";
function metaPurchaseEventId(razorpayOrderId) {
  return `purchase_${razorpayOrderId}`;
}

// server/services/metaConversions.ts
import crypto from "crypto";
import { z } from "zod";
var GRAPH_VERSION = "v20.0";
var SEND_TIMEOUT_MS = 3e3;
var META_CAPI_FORWARDED_EVENTS = /* @__PURE__ */ new Set(["payment_attempted"]);
var metaBrowserContextSchema = z.object({
  event_id: z.string().min(1).max(100).optional(),
  fbp: z.string().max(200).nullable().optional(),
  fbc: z.string().max(500).nullable().optional(),
  event_source_url: z.string().max(2e3).nullable().optional()
});
var sha256 = (value) => crypto.createHash("sha256").update(value).digest("hex");
function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
function metaContextFromRequest(req, browser) {
  const forwardedFor = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  const cookies = req.headers.cookie;
  const referer = req.headers.referer ? String(req.headers.referer) : null;
  return {
    ip: forwardedFor || req.socket?.remoteAddress || null,
    userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]) : null,
    fbp: browser?.fbp || readCookie(cookies, "_fbp"),
    fbc: browser?.fbc || readCookie(cookies, "_fbc"),
    eventSourceUrl: browser?.event_source_url || referer
  };
}
function metaCustomDataFromProperties(properties) {
  const p = properties ?? {};
  const value = Number(p.value);
  return {
    ...Number.isFinite(value) ? { value } : {},
    currency: typeof p.currency === "string" ? p.currency : "INR",
    ...typeof p.product_type === "string" ? { product_type: p.product_type } : {},
    ...typeof p.companion_id === "string" ? { companion_id: p.companion_id } : {}
  };
}
var warnedMissingToken = false;
async function sendMetaConversionEvent(input) {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!token) {
    if (!warnedMissingToken) {
      console.warn("[meta-capi] META_CAPI_ACCESS_TOKEN not set; server events to Meta are off");
      warnedMissingToken = true;
    }
    return;
  }
  const pixelId = process.env.META_PIXEL_ID?.trim() || META_PIXEL_ID;
  const phone = input.phoneDigits?.replace(/\D/g, "").slice(-10) ?? "";
  const { ip, userAgent, fbp, fbc, eventSourceUrl } = input.context;
  const userData = {
    ...ip ? { client_ip_address: ip } : {},
    ...userAgent ? { client_user_agent: userAgent } : {},
    ...fbp ? { fbp } : {},
    ...fbc ? { fbc } : {},
    ...input.deviceId ? { external_id: [sha256(input.deviceId)] } : {},
    // Meta wants phone numbers with country code, then SHA-256.
    ...phone.length === 10 ? { ph: [sha256(`91${phone}`)] } : {}
  };
  const event = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1e3),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: eventSourceUrl || "https://puchlo.in/",
    user_data: userData,
    ...input.customData ? { custom_data: input.customData } : {}
  };
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [event],
        access_token: token,
        ...testEventCode ? { test_event_code: testEventCode } : {}
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[meta-capi] ${input.eventName} rejected (${res.status}): ${body.slice(0, 300)}`);
    }
  } catch (error) {
    console.error(
      `[meta-capi] ${input.eventName} not sent:`,
      error instanceof Error ? error.message : error
    );
  } finally {
    clearTimeout(timer);
  }
}

// server/astroRoutes.ts
import { z as z2 } from "zod";

// server/services/astro/ai.ts
var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
var TEXT_MODELS = () => [
  process.env.ASTRO_TEXT_MODEL?.trim() || "google/gemini-2.5-flash",
  process.env.OPENROUTER_MODEL?.trim() || "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-8b-instruct"
];
var VISION_MODELS = () => [process.env.ASTRO_VISION_MODEL?.trim() || "google/gemini-2.5-flash", "google/gemini-3.1-flash-lite", "openai/gpt-4o-mini"];
var IMAGE_MODELS = () => [process.env.ASTRO_IMAGE_MODEL?.trim() || "google/gemini-2.5-flash-image", "google/gemini-3.1-flash-lite-image"];
async function callOpenRouter(body, timeoutMs) {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  if (!key) throw new Error("OPENROUTER_API_KEY is missing");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        "HTTP-Referer": "https://puchlo.in",
        "X-Title": "Puchlo.in"
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
async function generateJson(system, user, maxTokens = 900) {
  for (const model of TEXT_MODELS()) {
    try {
      const data = await callOpenRouter(
        {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ],
          temperature: 0.7,
          max_tokens: maxTokens
        },
        14e3
      );
      const parsed = extractJson(String(data?.choices?.[0]?.message?.content ?? ""));
      if (parsed) return parsed;
      console.warn(`[astro-ai] ${model} returned unparseable JSON`);
    } catch (err) {
      console.warn(`[astro-ai] text model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}
async function readPalm(imageDataUrl) {
  const prompt = `Tum ek anubhavi hast-rekha visheshagya ho. Is photo ko dekho.
Agar yeh insaan ki hatheli (palm) ki saaf photo NAHI hai to sirf {"is_palm": false} lautao.
Agar hatheli hai to jo rekhayein sach me dikh rahi hain unhi ke aadhar par, simple Hinglish (Roman lipi) me, vivah aur rishton par kendrit JSON do:
{"is_palm": true,
 "heart_line": "hriday rekha kaisi dikh rahi hai aur pyaar ke baare me kya batati hai (1-2 vakya)",
 "marriage_line": "vivah rekha (chhoti ungli ke neeche) kaisi hai, kitni, kitni gehri (1-2 vakya)",
 "fate_line": "bhagya rekha ka sanket (1 vakya)",
 "summary": "ek vakya ka nichod"}
Sambhavna ki bhasha use karo ("sanket deti hai"), pakka dava nahi. Sirf JSON.`;
  for (const model of VISION_MODELS()) {
    try {
      const data = await callOpenRouter(
        {
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageDataUrl } }
              ]
            }
          ],
          temperature: 0.4,
          max_tokens: 500
        },
        2e4
      );
      const parsed = extractJson(String(data?.choices?.[0]?.message?.content ?? ""));
      if (!parsed) continue;
      if (parsed.is_palm !== true) return null;
      const s = (k) => String(parsed[k] ?? "").trim().slice(0, 400);
      if (!s("heart_line") && !s("marriage_line")) return null;
      return { heart_line: s("heart_line"), marriage_line: s("marriage_line"), fate_line: s("fate_line"), summary: s("summary") };
    } catch (err) {
      console.warn(`[astro-ai] vision model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}
async function generateImage(prompt) {
  for (const model of IMAGE_MODELS()) {
    try {
      const data = await callOpenRouter(
        { model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] },
        55e3
      );
      const msg = data?.choices?.[0]?.message;
      const url = msg?.images?.[0]?.image_url?.url ?? msg?.images?.[0]?.url;
      if (typeof url === "string" && url.startsWith("data:image/")) return url;
      console.warn(`[astro-ai] image model ${model} returned no image`);
    } catch (err) {
      console.warn(`[astro-ai] image model ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

// server/services/astro/cities.ts
var CITIES = {
  delhi: [28.61, 77.21],
  "new delhi": [28.61, 77.21],
  mumbai: [19.08, 72.88],
  bombay: [19.08, 72.88],
  kolkata: [22.57, 88.36],
  calcutta: [22.57, 88.36],
  chennai: [13.08, 80.27],
  madras: [13.08, 80.27],
  bengaluru: [12.97, 77.59],
  bangalore: [12.97, 77.59],
  hyderabad: [17.39, 78.49],
  secunderabad: [17.44, 78.5],
  ahmedabad: [23.02, 72.57],
  pune: [18.52, 73.86],
  surat: [21.17, 72.83],
  jaipur: [26.91, 75.79],
  lucknow: [26.85, 80.95],
  kanpur: [26.45, 80.33],
  nagpur: [21.15, 79.09],
  indore: [22.72, 75.86],
  bhopal: [23.26, 77.41],
  patna: [25.59, 85.14],
  vadodara: [22.31, 73.18],
  baroda: [22.31, 73.18],
  ludhiana: [30.9, 75.86],
  agra: [27.18, 78.01],
  nashik: [19.99, 73.79],
  meerut: [28.98, 77.71],
  rajkot: [22.3, 70.8],
  varanasi: [25.32, 82.97],
  banaras: [25.32, 82.97],
  srinagar: [34.08, 74.8],
  aurangabad: [19.88, 75.34],
  dhanbad: [23.8, 86.43],
  amritsar: [31.63, 74.87],
  allahabad: [25.44, 81.85],
  prayagraj: [25.44, 81.85],
  ranchi: [23.34, 85.31],
  howrah: [22.59, 88.31],
  jabalpur: [23.18, 79.99],
  gwalior: [26.22, 78.18],
  vijayawada: [16.51, 80.65],
  jodhpur: [26.24, 73.02],
  raipur: [21.25, 81.63],
  kota: [25.21, 75.86],
  guwahati: [26.14, 91.74],
  chandigarh: [30.73, 76.78],
  solapur: [17.66, 75.91],
  bareilly: [28.37, 79.43],
  moradabad: [28.84, 78.77],
  mysuru: [12.3, 76.65],
  mysore: [12.3, 76.65],
  gurugram: [28.46, 77.03],
  gurgaon: [28.46, 77.03],
  aligarh: [27.9, 78.08],
  jalandhar: [31.33, 75.58],
  bhubaneswar: [20.3, 85.82],
  salem: [11.66, 78.15],
  warangal: [17.98, 79.6],
  guntur: [16.31, 80.44],
  bhiwandi: [19.3, 73.06],
  saharanpur: [29.97, 77.55],
  gorakhpur: [26.76, 83.37],
  bikaner: [28.02, 73.31],
  amravati: [20.93, 77.75],
  noida: [28.54, 77.39],
  jamshedpur: [22.8, 86.2],
  bhilai: [21.21, 81.38],
  cuttack: [20.46, 85.88],
  firozabad: [27.15, 78.4],
  kochi: [9.93, 76.27],
  cochin: [9.93, 76.27],
  dehradun: [30.32, 78.03],
  durgapur: [23.52, 87.31],
  asansol: [23.68, 86.98],
  nanded: [19.14, 77.32],
  kolhapur: [16.7, 74.24],
  ajmer: [26.45, 74.64],
  gulbarga: [17.33, 76.83],
  jamnagar: [22.47, 70.06],
  ujjain: [23.18, 75.78],
  loni: [28.75, 77.29],
  siliguri: [26.73, 88.4],
  jhansi: [25.45, 78.57],
  ulhasnagar: [19.22, 73.16],
  jammu: [32.73, 74.86],
  mangaluru: [12.91, 74.86],
  mangalore: [12.91, 74.86],
  erode: [11.34, 77.72],
  belgaum: [15.85, 74.5],
  belagavi: [15.85, 74.5],
  tirunelveli: [8.71, 77.76],
  malegaon: [20.55, 74.53],
  gaya: [24.8, 85],
  udaipur: [24.58, 73.71],
  kakinada: [16.99, 82.25],
  davanagere: [14.46, 75.92],
  kozhikode: [11.26, 75.78],
  calicut: [11.26, 75.78],
  maheshtala: [22.5, 88.25],
  rajpur: [22.4, 88.42],
  akola: [20.71, 77],
  kurnool: [15.83, 78.04],
  bokaro: [23.67, 86.15],
  bellary: [15.14, 76.92],
  patiala: [30.34, 76.39],
  agartala: [23.83, 91.28],
  bhagalpur: [25.24, 86.97],
  muzaffarnagar: [29.47, 77.7],
  bhatpara: [22.87, 88.41],
  panihati: [22.69, 88.37],
  latur: [18.4, 76.56],
  dhule: [20.9, 74.78],
  rohtak: [28.9, 76.6],
  korba: [22.35, 82.68],
  bhilwara: [25.35, 74.64],
  brahmapur: [19.31, 84.79],
  muzaffarpur: [26.12, 85.39],
  ahmednagar: [19.09, 74.74],
  mathura: [27.49, 77.67],
  kollam: [8.89, 76.61],
  avadi: [13.11, 80.1],
  kadapa: [14.47, 78.82],
  anantapur: [14.68, 77.6],
  kamarhati: [22.67, 88.37],
  sambalpur: [21.47, 83.97],
  bilaspur: [22.08, 82.15],
  shahjahanpur: [27.88, 79.91],
  satara: [17.69, 74],
  bijapur: [16.83, 75.71],
  rampur: [28.81, 79.03],
  shivamogga: [13.93, 75.57],
  chandrapur: [19.95, 79.3],
  junagadh: [21.52, 70.46],
  thrissur: [10.53, 76.21],
  alwar: [27.55, 76.63],
  bardhaman: [23.24, 87.86],
  kulti: [23.73, 86.85],
  kakinada2: [16.99, 82.25],
  nizamabad: [18.67, 78.1],
  parbhani: [19.27, 76.77],
  tumkur: [13.34, 77.1],
  khammam: [17.25, 80.15],
  ozhukarai: [11.95, 79.77],
  "bihar sharif": [25.2, 85.52],
  panipat: [29.39, 76.97],
  darbhanga: [26.15, 85.9],
  bally: [22.65, 88.34],
  aizawl: [23.73, 92.72],
  dewas: [22.96, 76.05],
  ichalkaranji: [16.69, 74.46],
  karnal: [29.69, 76.99],
  bathinda: [30.21, 74.95],
  jalna: [19.84, 75.88],
  eluru: [16.71, 81.1],
  barasat: [22.72, 88.48],
  "kirari suleman nagar": [28.72, 77.07],
  purnia: [25.78, 87.47],
  satna: [24.58, 80.83],
  mau: [25.94, 83.56],
  sonipat: [28.99, 77.02],
  farrukhabad: [27.39, 79.58],
  sagar: [23.84, 78.74],
  rourkela: [22.26, 84.85],
  durg: [21.19, 81.28],
  imphal: [24.82, 93.94],
  ratlam: [23.33, 75.04],
  hapur: [28.73, 77.78],
  arrah: [25.56, 84.66],
  anantapuram: [14.68, 77.6],
  karimnagar: [18.44, 79.13],
  etawah: [26.78, 79.02],
  ambernath: [19.2, 73.19],
  "north dumdum": [22.65, 88.42],
  bharatpur: [27.22, 77.49],
  begusarai: [25.42, 86.13],
  "new delhi ncr": [28.61, 77.21],
  gandhidham: [23.08, 70.13],
  baranagar: [22.64, 88.37],
  tiruvottiyur: [13.16, 80.3],
  pondicherry: [11.94, 79.83],
  puducherry: [11.94, 79.83],
  sikar: [27.61, 75.14],
  thoothukudi: [8.76, 78.13],
  rewa: [24.53, 81.3],
  mirzapur: [25.15, 82.57],
  raichur: [16.21, 77.36],
  pali: [25.77, 73.32],
  ramagundam: [18.76, 79.47],
  haridwar: [29.95, 78.16],
  vijayanagaram: [18.11, 83.4],
  katihar: [25.54, 87.57],
  nagercoil: [8.18, 77.43],
  "sri ganganagar": [29.9, 73.88],
  karawal: [28.72, 77.28],
  mango: [22.83, 86.22],
  thanjavur: [10.79, 79.14],
  bulandshahr: [28.41, 77.85],
  uluberia: [22.47, 88.11],
  murwara: [23.84, 80.39],
  sambhal: [28.58, 78.57],
  singrauli: [24.2, 82.67],
  nadiad: [22.69, 72.86],
  secunderabad2: [17.44, 78.5],
  naihati: [22.89, 88.42],
  yamunanagar: [30.13, 77.28],
  bidhannagar: [22.58, 88.42],
  pallavaram: [12.97, 80.15],
  bidar: [17.91, 77.52],
  munger: [25.37, 86.47],
  panchkula: [30.69, 76.86],
  burhanpur: [21.31, 76.23],
  "raurkela": [22.26, 84.85],
  kharagpur: [22.33, 87.32],
  dindigul: [10.37, 77.98],
  gandhinagar: [23.22, 72.65],
  hospet: [15.27, 76.39],
  "nangloi jat": [28.68, 77.07],
  malda: [25, 88.14],
  ongole: [15.5, 80.05],
  deoghar: [24.48, 86.7],
  chapra: [25.78, 84.75],
  haldia: [22.06, 88.07],
  khandwa: [21.83, 76.35],
  nandyal: [15.48, 78.48],
  morena: [26.5, 78],
  amroha: [28.9, 78.47],
  anand: [22.56, 72.95],
  bhind: [26.56, 78.79],
  bhalswa: [28.74, 77.16],
  madhyamgram: [22.7, 88.45],
  bhiwani: [28.79, 76.14],
  berhampore: [24.1, 88.25],
  ambala: [30.38, 76.78],
  morbi: [22.82, 70.84],
  fatehpur: [25.93, 80.8],
  raebareli: [26.23, 81.23],
  khora: [28.62, 77.33],
  chittoor: [13.22, 79.1],
  bhusawal: [21.04, 75.79],
  orai: [25.99, 79.45],
  bahraich: [27.57, 81.6],
  phusro: [23.77, 85.99],
  vellore: [12.92, 79.13],
  mehsana: [23.6, 72.38],
  raiganj: [25.62, 88.12],
  sirsa: [29.53, 75.03],
  danapur: [25.63, 85.04],
  serampore: [22.75, 88.34],
  sultan: [26.26, 82.07],
  guna: [24.65, 77.31],
  jaunpur: [25.75, 82.68],
  panvel: [18.99, 73.11],
  shivpuri: [25.42, 77.65],
  "surendranagar": [22.73, 71.65],
  unnao: [26.55, 80.49],
  hugli: [22.9, 88.39],
  alappuzha: [9.5, 76.34],
  kottayam: [9.59, 76.52],
  machilipatnam: [16.19, 81.13],
  shimla: [31.1, 77.17],
  adoni: [15.63, 77.28],
  udupi: [13.34, 74.75],
  tenali: [16.24, 80.65],
  proddatur: [14.75, 78.55],
  saharsa: [25.88, 86.6],
  hindupur: [13.83, 77.49],
  sasaram: [24.95, 84.03],
  hajipur: [25.69, 85.21],
  bhimavaram: [16.54, 81.52],
  kumbakonam: [10.96, 79.38],
  dehri: [24.9, 84.18],
  madanapalle: [13.55, 78.5],
  siwan: [26.22, 84.36],
  bettiah: [26.8, 84.5],
  guntakal: [15.17, 77.37],
  srikakulam: [18.3, 83.9],
  motihari: [26.65, 84.92],
  dharmavaram: [14.41, 77.72],
  gudivada: [16.43, 80.99],
  narasaraopet: [16.23, 80.05],
  bagaha: [27.1, 84.09],
  miryalaguda: [16.87, 79.57],
  tadipatri: [14.91, 78.01],
  kishanganj: [26.1, 87.95],
  karaikudi: [10.07, 78.78],
  suryapet: [17.14, 79.62],
  jamalpur: [25.31, 86.49],
  kavali: [14.91, 79.99],
  tadepalligudem: [16.81, 81.52],
  amaravati: [16.51, 80.52],
  buxar: [25.56, 83.98],
  tezpur: [26.63, 92.8],
  jehanabad: [25.21, 84.99],
  aurangabad_bihar: [24.75, 84.37],
  gangtok: [27.33, 88.61],
  itanagar: [27.08, 93.6],
  kohima: [25.67, 94.1],
  shillong: [25.58, 91.89],
  dispur: [26.14, 91.79],
  panaji: [15.49, 73.83],
  goa: [15.49, 73.83],
  thiruvananthapuram: [8.52, 76.94],
  trivandrum: [8.52, 76.94],
  coimbatore: [11.02, 76.96],
  madurai: [9.93, 78.12],
  tiruchirappalli: [10.79, 78.7],
  trichy: [10.79, 78.7],
  visakhapatnam: [17.69, 83.22],
  vizag: [17.69, 83.22],
  nellore: [14.44, 79.99],
  tirupati: [13.63, 79.42],
  hubli: [15.36, 75.12],
  hubballi: [15.36, 75.12],
  dharwad: [15.46, 75.01],
  faridabad: [28.41, 77.31],
  ghaziabad: [28.67, 77.42],
  hisar: [29.15, 75.72],
  jind: [29.32, 76.31],
  kaithal: [29.8, 76.4],
  kurukshetra: [29.97, 76.88],
  rewari: [28.2, 76.62],
  palwal: [28.14, 77.33],
  muzaffarnagar2: [29.47, 77.7],
  roorkee: [29.87, 77.89],
  haldwani: [29.22, 79.52],
  rishikesh: [30.09, 78.27],
  almora: [29.6, 79.66],
  nainital: [29.38, 79.46],
  pithoragarh: [29.58, 80.21],
  mandi: [31.71, 76.93],
  solan: [30.9, 77.1],
  kullu: [31.96, 77.11],
  dharamshala: [32.22, 76.32],
  una: [31.47, 76.27],
  hamirpur: [31.69, 76.52],
  pathankot: [32.27, 75.65],
  hoshiarpur: [31.53, 75.91],
  moga: [30.82, 75.17],
  firozpur: [30.93, 74.61],
  sangrur: [30.25, 75.84],
  barnala: [30.37, 75.55],
  mohali: [30.7, 76.72],
  ropar: [30.97, 76.53],
  bhuj: [23.25, 69.67],
  porbandar: [21.64, 69.61],
  bhavnagar: [21.76, 72.15],
  navsari: [20.95, 72.93],
  valsad: [20.61, 72.93],
  bharuch: [21.7, 72.99],
  godhra: [22.78, 73.61],
  palanpur: [24.17, 72.43],
  patan: [23.85, 72.13],
  himmatnagar: [23.6, 72.97],
  amreli: [21.6, 71.22],
  botad: [22.17, 71.67],
  dahod: [22.84, 74.25],
  vapi: [20.37, 72.9],
  ankleshwar: [21.63, 73],
  mahesana: [23.6, 72.38],
  chittorgarh: [24.88, 74.63],
  banswara: [23.55, 74.44],
  dungarpur: [23.84, 73.72],
  barmer: [25.75, 71.39],
  jaisalmer: [26.92, 70.91],
  nagaur: [27.2, 73.73],
  churu: [28.3, 74.97],
  jhunjhunu: [28.13, 75.4],
  tonk: [26.17, 75.79],
  bundi: [25.44, 75.64],
  baran: [25.1, 76.51],
  jhalawar: [24.6, 76.16],
  sawai: [26.02, 76.35],
  dausa: [26.89, 76.34],
  karauli: [26.5, 77.03],
  dholpur: [26.7, 77.89],
  hanumangarh: [29.58, 74.33],
  bhilwara2: [25.35, 74.64],
  rajsamand: [25.07, 73.88],
  sirohi: [24.89, 72.86],
  jalore: [25.35, 72.62],
  mandsaur: [24.07, 75.07],
  neemuch: [24.47, 74.87],
  shajapur: [23.43, 76.27],
  vidisha: [23.53, 77.81],
  sehore: [23.2, 77.08],
  hoshangabad: [22.75, 77.72],
  betul: [21.9, 77.9],
  chhindwara: [22.06, 78.94],
  seoni: [22.09, 79.54],
  balaghat: [21.81, 80.18],
  mandla: [22.6, 80.37],
  damoh: [23.83, 79.44],
  chhatarpur: [24.92, 79.59],
  tikamgarh: [24.74, 78.83],
  panna: [24.72, 80.19],
  sidhi: [24.4, 81.88],
  shahdol: [23.3, 81.36],
  umaria: [23.52, 80.84],
  katni: [23.83, 80.39],
  narsinghpur: [22.95, 79.19],
  dhar: [22.6, 75.3],
  jhabua: [22.77, 74.59],
  khargone: [21.82, 75.61],
  barwani: [22.03, 74.9],
  chandausi: [28.45, 78.78],
  budaun: [28.04, 79.12],
  pilibhit: [28.63, 79.8],
  lakhimpur: [27.95, 80.78],
  sitapur: [27.57, 80.68],
  hardoi: [27.4, 80.13],
  barabanki: [26.93, 81.19],
  faizabad: [26.77, 82.15],
  ayodhya: [26.8, 82.2],
  gonda: [27.13, 81.96],
  basti: [26.8, 82.73],
  deoria: [26.5, 83.78],
  azamgarh: [26.07, 83.18],
  ballia: [25.76, 84.15],
  ghazipur: [25.58, 83.58],
  chandauli: [25.26, 83.27],
  sonbhadra: [24.69, 83.07],
  banda: [25.48, 80.34],
  mahoba: [25.29, 79.87],
  lalitpur: [24.69, 78.41],
  hathras: [27.6, 78.05],
  etah: [27.56, 78.66],
  mainpuri: [27.23, 79.03],
  kannauj: [27.06, 79.92],
  kasganj: [27.81, 78.65],
  bijnor: [29.37, 78.14],
  baghpat: [28.95, 77.22],
  shamli: [29.45, 77.31],
  iglas: [27.71, 77.94],
  aligarh2: [27.9, 78.08],
  malerkotla: [30.53, 75.88],
  nalanda: [25.14, 85.44],
  nawada: [24.88, 85.54],
  aurangabad2: [24.75, 84.37],
  rohtas: [24.95, 84.03],
  bhojpur: [25.56, 84.66],
  vaishali: [25.69, 85.21],
  samastipur: [25.86, 85.78],
  madhubani: [26.35, 86.08],
  sitamarhi: [26.59, 85.49],
  supaul: [26.12, 86.6],
  araria: [26.15, 87.52],
  madhepura: [25.92, 86.79],
  khagaria: [25.5, 86.47],
  lakhisarai: [25.17, 86.09],
  sheikhpura: [25.14, 85.85],
  jamui: [24.92, 86.22],
  banka: [24.88, 86.92],
  gopalganj: [26.47, 84.44],
  chhapra: [25.78, 84.75],
  hazaribagh: [23.99, 85.36],
  giridih: [24.18, 86.3],
  dumka: [24.27, 87.25],
  palamu: [24.03, 84.07],
  daltonganj: [24.03, 84.07],
  ramgarh: [23.63, 85.52],
  chaibasa: [22.55, 85.8],
  "bhadrak": [21.06, 86.5],
  balasore: [21.49, 86.93],
  baripada: [21.93, 86.73],
  puri: [19.81, 85.83],
  koraput: [18.81, 82.71],
  jeypore: [18.86, 82.57],
  jagdalpur: [19.08, 82.03],
  rajnandgaon: [21.1, 81.03],
  ambikapur: [23.12, 83.2],
  raigarh: [21.9, 83.4],
  mahasamund: [21.11, 82.1],
  dhamtari: [20.71, 81.55],
  kanker: [20.27, 81.49],
  nanded2: [19.14, 77.32],
  beed: [18.99, 75.76],
  osmanabad: [18.19, 76.04],
  hingoli: [19.72, 77.15],
  buldhana: [20.53, 76.18],
  washim: [20.11, 77.13],
  yavatmal: [20.39, 78.13],
  wardha: [20.75, 78.6],
  gondia: [21.46, 80.19],
  bhandara: [21.17, 79.65],
  gadchiroli: [20.18, 80],
  ratnagiri: [16.99, 73.3],
  sindhudurg: [16, 73.5],
  raigad: [18.52, 73.18],
  thane: [19.22, 72.98],
  "navi mumbai": [19.03, 73.03],
  kalyan: [19.24, 73.13],
  dombivli: [19.22, 73.09],
  vasai: [19.39, 72.83],
  virar: [19.46, 72.8],
  palghar: [19.7, 72.77],
  sangli: [16.85, 74.58],
  jalgaon: [21, 75.57],
  nandurbar: [21.37, 74.24],
  ahmadnagar: [19.09, 74.74],
  alibag: [18.64, 72.87],
  lonavala: [18.75, 73.41],
  shirdi: [19.77, 74.48],
  pandharpur: [17.68, 75.33],
  tuljapur: [18.01, 76.07],
  akluj: [17.88, 75.02],
  baramati: [18.15, 74.58],
  nizamabad2: [18.67, 78.1],
  adilabad: [19.67, 78.53],
  medak: [18.05, 78.26],
  nalgonda: [17.06, 79.27],
  mahbubnagar: [16.74, 77.99],
  siddipet: [18.1, 78.85],
  sangareddy: [17.62, 78.08],
  vikarabad: [17.34, 77.9],
  jagtial: [18.79, 78.91],
  mancherial: [18.87, 79.46],
  kothagudem: [17.55, 80.62],
  bhadrachalam: [17.67, 80.89],
  anakapalle: [17.69, 83],
  rajahmundry: [17, 81.78],
  amalapuram: [16.58, 82],
  chirala: [15.82, 80.35],
  tirupathi: [13.63, 79.42],
  chittoor2: [13.22, 79.1],
  kuppam: [12.75, 78.34],
  puttaparthi: [14.17, 77.81],
  hospete: [15.27, 76.39],
  gadag: [15.43, 75.63],
  haveri: [14.8, 75.4],
  karwar: [14.81, 74.13],
  sirsi: [14.62, 74.84],
  chikmagalur: [13.32, 75.77],
  hassan: [13, 76.1],
  mandya: [12.52, 76.9],
  chamarajanagar: [11.93, 76.94],
  kolar: [13.14, 78.13],
  chikkaballapur: [13.44, 77.73],
  ramanagara: [12.72, 77.28],
  bagalkot: [16.18, 75.7],
  vijayapura: [16.83, 75.71],
  koppal: [15.35, 76.15],
  yadgir: [16.77, 77.14],
  kalaburagi: [17.33, 76.83],
  palakkad: [10.78, 76.65],
  malappuram: [11.07, 76.07],
  kannur: [11.87, 75.37],
  kasaragod: [12.5, 75],
  wayanad: [11.69, 76.13],
  idukki: [9.85, 76.97],
  pathanamthitta: [9.26, 76.78],
  ernakulam: [9.98, 76.28],
  tirupur: [11.11, 77.34],
  namakkal: [11.22, 78.17],
  karur: [10.96, 78.08],
  pudukkottai: [10.38, 78.82],
  sivaganga: [9.85, 78.48],
  ramanathapuram: [9.37, 78.83],
  virudhunagar: [9.58, 77.96],
  theni: [10.01, 77.48],
  cuddalore: [11.75, 79.77],
  villupuram: [11.94, 79.49],
  tiruvannamalai: [12.23, 79.07],
  kanchipuram: [12.83, 79.7],
  tiruvallur: [13.14, 79.91],
  krishnagiri: [12.52, 78.21],
  dharmapuri: [12.13, 78.16],
  hosur: [12.74, 77.83],
  ariyalur: [11.14, 79.08],
  perambalur: [11.23, 78.88],
  nagapattinam: [10.77, 79.84],
  mayiladuthurai: [11.1, 79.65],
  tiruvarur: [10.77, 79.64],
  kanyakumari: [8.08, 77.54],
  ooty: [11.41, 76.7],
  nilgiris: [11.41, 76.7],
  silchar: [24.83, 92.78],
  dibrugarh: [27.48, 94.91],
  jorhat: [26.75, 94.22],
  nagaon: [26.35, 92.68],
  tinsukia: [27.49, 95.36],
  bongaigaon: [26.48, 90.56],
  dhubri: [26.02, 89.98],
  cooch: [26.32, 89.45],
  jalpaiguri: [26.52, 88.72],
  darjeeling: [27.04, 88.26],
  alipurduar: [26.49, 89.53],
  krishnanagar: [23.4, 88.5],
  bankura: [23.23, 87.07],
  purulia: [23.33, 86.36],
  midnapore: [22.42, 87.32],
  tamluk: [22.3, 87.92],
  contai: [21.78, 87.75],
  diamond: [22.19, 88.19],
  basirhat: [22.66, 88.87],
  bongaon: [23.07, 88.83],
  ranaghat: [23.18, 88.57],
  kalyani: [22.98, 88.43],
  chinsurah: [22.9, 88.39],
  arambagh: [22.88, 87.78],
  leh: [34.16, 77.58],
  kargil: [34.56, 76.13],
  udhampur: [32.93, 75.14],
  kathua: [32.37, 75.52],
  anantnag: [33.73, 75.15],
  baramulla: [34.2, 74.35],
  rajouri: [33.38, 74.31],
  poonch: [33.77, 74.09],
  port: [11.67, 92.75],
  "port blair": [11.67, 92.75],
  kavaratti: [10.57, 72.64],
  daman: [20.4, 72.83],
  silvassa: [20.27, 73.02],
  diu: [20.71, 70.98]
};
var STATE_CENTROIDS = {
  "uttar pradesh": [26.85, 80.95],
  up: [26.85, 80.95],
  bihar: [25.59, 85.14],
  rajasthan: [26.91, 75.79],
  "madhya pradesh": [23.26, 77.41],
  mp: [23.26, 77.41],
  maharashtra: [19.08, 72.88],
  gujarat: [23.02, 72.57],
  punjab: [30.9, 75.86],
  haryana: [29.06, 76.09],
  delhi: [28.61, 77.21],
  uttarakhand: [30.32, 78.03],
  "himachal pradesh": [31.1, 77.17],
  jharkhand: [23.34, 85.31],
  odisha: [20.3, 85.82],
  orissa: [20.3, 85.82],
  "west bengal": [22.57, 88.36],
  bengal: [22.57, 88.36],
  chhattisgarh: [21.25, 81.63],
  telangana: [17.39, 78.49],
  "andhra pradesh": [16.51, 80.65],
  karnataka: [12.97, 77.59],
  "tamil nadu": [13.08, 80.27],
  tamilnadu: [13.08, 80.27],
  kerala: [9.93, 76.27],
  assam: [26.14, 91.74],
  goa: [15.49, 73.83],
  "jammu and kashmir": [34.08, 74.8],
  kashmir: [34.08, 74.8],
  nepal: [27.7, 85.32],
  india: [23, 78]
};
function normalize(s) {
  return s.toLowerCase().replace(/[^a-zऀ-ॿ\s,]/g, " ").replace(/\s+/g, " ").trim();
}
function geocodeIndianPlace(input) {
  const norm = normalize(input);
  const tokens = norm.split(/[\s,]+/).filter(Boolean);
  const candidates = [norm, ...norm.split(",").map((p) => p.trim())];
  for (let i = 0; i < tokens.length; i++) {
    candidates.push(tokens[i]);
    if (i + 1 < tokens.length) candidates.push(`${tokens[i]} ${tokens[i + 1]}`);
  }
  for (const c of candidates) {
    const hit = CITIES[c];
    if (hit) return { lat: hit[0], lon: hit[1], label: c, precise: true };
  }
  for (const c of candidates) {
    if (c.length < 4) continue;
    const key = Object.keys(CITIES).find((k) => k.startsWith(c) || c.startsWith(k));
    if (key) {
      const hit = CITIES[key];
      return { lat: hit[0], lon: hit[1], label: key, precise: true };
    }
  }
  for (const c of candidates) {
    const hit = STATE_CENTROIDS[c];
    if (hit) return { lat: hit[0], lon: hit[1], label: c, precise: false };
  }
  return { lat: 23, lon: 78, label: "india", precise: false };
}

// server/services/astro/engine.ts
var Astronomy2 = void 0 ?? astronomy_exports;
var RASHI = [
  { en: "Mesh", hi: "\u092E\u0947\u0937", lord: "Mars", element: "fire" },
  { en: "Vrishabh", hi: "\u0935\u0943\u0937\u092D", lord: "Venus", element: "earth" },
  { en: "Mithun", hi: "\u092E\u093F\u0925\u0941\u0928", lord: "Mercury", element: "air" },
  { en: "Kark", hi: "\u0915\u0930\u094D\u0915", lord: "Moon", element: "water" },
  { en: "Singh", hi: "\u0938\u093F\u0902\u0939", lord: "Sun", element: "fire" },
  { en: "Kanya", hi: "\u0915\u0928\u094D\u092F\u093E", lord: "Mercury", element: "earth" },
  { en: "Tula", hi: "\u0924\u0941\u0932\u093E", lord: "Venus", element: "air" },
  { en: "Vrishchik", hi: "\u0935\u0943\u0936\u094D\u091A\u093F\u0915", lord: "Mars", element: "water" },
  { en: "Dhanu", hi: "\u0927\u0928\u0941", lord: "Jupiter", element: "fire" },
  { en: "Makar", hi: "\u092E\u0915\u0930", lord: "Saturn", element: "earth" },
  { en: "Kumbh", hi: "\u0915\u0941\u0902\u092D", lord: "Saturn", element: "air" },
  { en: "Meen", hi: "\u092E\u0940\u0928", lord: "Jupiter", element: "water" }
];
var PLANET_HINGLISH = {
  Sun: "Surya",
  Moon: "Chandra",
  Mars: "Mangal",
  Mercury: "Budh",
  Jupiter: "Guru",
  Venus: "Shukra",
  Saturn: "Shani",
  Rahu: "Rahu",
  Ketu: "Ketu"
};
var NAKSHATRA = [
  "Ashwini",
  "Bharani",
  "Krittika",
  "Rohini",
  "Mrigashira",
  "Ardra",
  "Punarvasu",
  "Pushya",
  "Ashlesha",
  "Magha",
  "Purva Phalguni",
  "Uttara Phalguni",
  "Hasta",
  "Chitra",
  "Swati",
  "Vishakha",
  "Anuradha",
  "Jyeshtha",
  "Mula",
  "Purva Ashadha",
  "Uttara Ashadha",
  "Shravana",
  "Dhanishta",
  "Shatabhisha",
  "Purva Bhadrapada",
  "Uttara Bhadrapada",
  "Revati"
];
var norm360 = (d) => (d % 360 + 360) % 360;
var rad = (d) => d * Math.PI / 180;
var deg = (r) => r * 180 / Math.PI;
function lahiriAyanamsa2(date) {
  const years = (date.getTime() - Date.UTC(2e3, 0, 1, 12)) / (365.25 * 864e5);
  return 23.853 + 0.0139689 * years;
}
function tropicalLongitudes(date) {
  const t = Astronomy2.MakeTime(date);
  const lon = (body) => Astronomy2.Ecliptic(Astronomy2.GeoVector(body, t, true)).elon;
  const T = t.tt / 36525;
  const rahu = norm360(125.04452 - 1934.136261 * T + 20708e-7 * T * T);
  return {
    Sun: Astronomy2.SunPosition(t).elon,
    Moon: Astronomy2.EclipticGeoMoon(t).lon,
    Mars: lon(Astronomy2.Body.Mars),
    Mercury: lon(Astronomy2.Body.Mercury),
    Jupiter: lon(Astronomy2.Body.Jupiter),
    Venus: lon(Astronomy2.Body.Venus),
    Saturn: lon(Astronomy2.Body.Saturn),
    Rahu: rahu,
    Ketu: norm360(rahu + 180)
  };
}
function siderealLongitudes2(date) {
  const ay = lahiriAyanamsa2(date);
  const trop = tropicalLongitudes(date);
  const out = {};
  Object.keys(trop).forEach((p) => out[p] = norm360(trop[p] - ay));
  return out;
}
function siderealAscendant(date, lat, lon) {
  const gmstHours = Astronomy2.SiderealTime(date);
  const ramc = rad(norm360(gmstHours * 15 + lon));
  const eps = rad(23.4393 - 0.013 * ((date.getTime() - Date.UTC(2e3, 0, 1, 12)) / (36525 * 864e5)));
  const phi = rad(lat);
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  const asc = norm360(deg(Math.atan2(y, x)));
  return norm360(asc - lahiriAyanamsa2(date));
}
var IST_OFFSET_MIN = 330;
function birthDateUtc(dob2, tob2) {
  const [y, m, d] = dob2.split("-").map(Number);
  const [hh, mm] = (tob2 ?? "12:00").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MIN * 6e4);
}
function computeChart(input) {
  const date = birthDateUtc(input.dob, input.tob);
  const positions = siderealLongitudes2(date);
  const signOf2 = {};
  Object.keys(positions).forEach((p) => signOf2[p] = Math.floor(positions[p] / 30));
  const geo = geocodeIndianPlace(input.place);
  const timeKnown = !!input.tob;
  const lagnaSign = timeKnown ? Math.floor(siderealAscendant(date, geo.lat, geo.lon) / 30) : null;
  const nakFloat = positions.Moon / (360 / 27);
  const nakshatra = Math.floor(nakFloat);
  return {
    birthUtc: date.toISOString(),
    timeKnown,
    placePrecise: geo.precise,
    positions,
    signOf: signOf2,
    moonSign: signOf2.Moon,
    nakshatra,
    pada: Math.floor((nakFloat - nakshatra) * 4) + 1,
    lagnaSign,
    baseSign: lagnaSign ?? signOf2.Moon,
    baseIsLagna: lagnaSign !== null
  };
}
var houseOf = (sign, base) => (sign - base + 12) % 12 + 1;
var signOfHouse = (house, base) => (base + house - 1) % 12;
var DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
var DASHA_YEARS = {
  Ketu: 7,
  Venus: 20,
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17
};
var YEAR_MS2 = 365.2425 * 864e5;
function vimshottari(chart) {
  const birth = new Date(chart.birthUtc).getTime();
  const nakSpan = 360 / 27;
  const elapsedFrac = chart.positions.Moon % nakSpan / nakSpan;
  const startIdx = chart.nakshatra % 9;
  let cursor = birth - elapsedFrac * DASHA_YEARS[DASHA_ORDER[startIdx]] * YEAR_MS2;
  const out = [];
  for (let i = 0; i < 9; i++) {
    const md = DASHA_ORDER[(startIdx + i) % 9];
    const mdYears = DASHA_YEARS[md];
    const mdIdx = DASHA_ORDER.indexOf(md);
    for (let j = 0; j < 9; j++) {
      const ad = DASHA_ORDER[(mdIdx + j) % 9];
      const len = mdYears * DASHA_YEARS[ad] / 120 * YEAR_MS2;
      const start = new Date(cursor);
      const end = new Date(cursor + len);
      cursor += len;
      if (end.getTime() > birth) out.push({ md, ad, start, end });
    }
  }
  return out;
}
var MANGAL_HOUSES = [1, 2, 4, 7, 8, 12];
var RASHI_LETTERS = [
  [{ latin: "A", hi: "\u0905" }, { latin: "L", hi: "\u0932" }, { latin: "Ch", hi: "\u091A" }],
  [{ latin: "V", hi: "\u0935" }, { latin: "B", hi: "\u092C" }, { latin: "U", hi: "\u0909" }],
  [{ latin: "K", hi: "\u0915" }, { latin: "G", hi: "\u0917" }, { latin: "Chh", hi: "\u091B" }],
  [{ latin: "H", hi: "\u0939" }, { latin: "D", hi: "\u0921" }],
  [{ latin: "M", hi: "\u092E" }, { latin: "T", hi: "\u091F" }],
  [{ latin: "P", hi: "\u092A" }, { latin: "N", hi: "\u0923" }, { latin: "Th", hi: "\u0920" }],
  [{ latin: "R", hi: "\u0930" }, { latin: "T", hi: "\u0924" }],
  [{ latin: "N", hi: "\u0928" }, { latin: "Y", hi: "\u092F" }],
  [{ latin: "Bh", hi: "\u092D" }, { latin: "Dh", hi: "\u0927" }, { latin: "F", hi: "\u092B" }],
  [{ latin: "J", hi: "\u091C" }, { latin: "Kh", hi: "\u0916" }],
  [{ latin: "S", hi: "\u0938" }, { latin: "G", hi: "\u0917" }, { latin: "Sh", hi: "\u0936" }],
  [{ latin: "D", hi: "\u0926" }, { latin: "Ch", hi: "\u091A" }, { latin: "Z", hi: "\u091D" }]
];
var DIRECTION = {
  fire: { en: "Purab (East)", hi: "\u092A\u0942\u0930\u094D\u0935" },
  earth: { en: "Dakshin (South)", hi: "\u0926\u0915\u094D\u0937\u093F\u0923" },
  air: { en: "Paschim (West)", hi: "\u092A\u0936\u094D\u091A\u093F\u092E" },
  water: { en: "Uttar (North)", hi: "\u0909\u0924\u094D\u0924\u0930" }
};
function addMonths(d, months) {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}
var iso = (d) => d.toISOString().slice(0, 10);
function jupiterSupportMonths(from, to, targets) {
  const out = [];
  let cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 15));
  while (cur <= to) {
    const jSign = Math.floor(siderealLongitudes2(cur).Jupiter / 30);
    const touched = [jSign, (jSign + 4) % 12, (jSign + 6) % 12, (jSign + 8) % 12];
    if (targets.some((t) => touched.includes(t))) out.push(new Date(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}
function analyseMarriage(chart, input, now = /* @__PURE__ */ new Date()) {
  const base = chart.baseSign;
  const seventhSign = signOfHouse(7, base);
  const seventhLord = RASHI[seventhSign].lord;
  const seventhLordSign = chart.signOf[seventhLord];
  const seventhLordHouse = houseOf(seventhLordSign, base);
  const planets = Object.keys(chart.signOf);
  const planetsInSeventh = planets.filter((p) => chart.signOf[p] === seventhSign);
  const karaka = input.gender === "male" ? "Venus" : "Jupiter";
  const karakaSign = chart.signOf[karaka];
  const karakaHouse = houseOf(karakaSign, base);
  const marsFromMoon = houseOf(chart.signOf.Mars, chart.moonSign);
  const marsFromLagna = chart.lagnaSign !== null ? houseOf(chart.signOf.Mars, chart.lagnaSign) : null;
  const fromLagna = marsFromLagna !== null && MANGAL_HOUSES.includes(marsFromLagna);
  const fromMoon = MANGAL_HOUSES.includes(marsFromMoon);
  const mangalDosh = {
    present: chart.lagnaSign !== null ? fromLagna : fromMoon,
    fromLagna,
    fromMoon,
    marsHouse: marsFromLagna ?? marsFromMoon
  };
  const fifthSign = signOfHouse(5, base);
  const fifthLord = RASHI[fifthSign].lord;
  const fifthLordHouse = houseOf(chart.signOf[fifthLord], base);
  let loveScore = 0;
  if (fifthLord === seventhLord) loveScore += 2;
  if (chart.signOf[fifthLord] === chart.signOf[seventhLord]) loveScore += 3;
  if (fifthLordHouse === 7) loveScore += 3;
  if (seventhLordHouse === 5) loveScore += 3;
  if ([5, 7].includes(houseOf(chart.signOf.Venus, base))) loveScore += 2;
  if ([5, 7].includes(houseOf(chart.signOf.Rahu, base))) loveScore += 2;
  if (chart.signOf.Venus === chart.signOf.Mars) loveScore += 2;
  if (chart.signOf.Venus === chart.signOf.Rahu) loveScore += 1;
  if ([5, 7, 11].includes(houseOf(chart.signOf.Moon, base)) && chart.baseIsLagna) loveScore += 1;
  if ([1, 5, 7].includes(houseOf(chart.signOf.Saturn, base))) loveScore -= 1;
  const marriageType = loveScore >= 5 ? "love" : loveScore >= 2 ? "love_arranged" : "arranged";
  const favourable = /* @__PURE__ */ new Set([seventhLord, "Venus", "Jupiter", ...planetsInSeventh]);
  if (input.gender === "female") favourable.add("Jupiter");
  favourable.add("Rahu");
  const birth = new Date(chart.birthUtc);
  const minAge = input.gender === "male" ? 21 : 18;
  const earliest = new Date(Math.max(addMonths(now, 2).getTime(), addMonths(birth, minAge * 12).getTime()));
  const periods = vimshottari(chart).filter((p) => p.end > earliest);
  const scorePeriod = (p) => {
    let s = 0;
    if (favourable.has(p.ad)) s += 2;
    if (favourable.has(p.md)) s += 1;
    if (p.ad === seventhLord || p.ad === karaka) s += 1;
    return s;
  };
  const horizon = addMonths(earliest, 12 * 7);
  const candidates = periods.filter((p) => p.start < horizon && scorePeriod(p) >= 2);
  const chosen = candidates.find((p) => scorePeriod(p) >= 3) ?? candidates[0] ?? periods[0];
  const strength = scorePeriod(chosen) >= 3 ? "prabal" : "madhyam";
  let winStart = new Date(Math.max(chosen.start.getTime(), earliest.getTime()));
  let winEnd = chosen.end;
  const targets = [seventhSign, base, chart.moonSign, seventhLordSign];
  const support = jupiterSupportMonths(winStart, winEnd, targets);
  let jupiterBlessing = null;
  if (support.length) {
    let bestS = 0, bestLen = 1, runS = 0;
    for (let i = 1; i <= support.length; i++) {
      const contiguous = i < support.length && support[i].getUTCFullYear() * 12 + support[i].getUTCMonth() === support[i - 1].getUTCFullYear() * 12 + support[i - 1].getUTCMonth() + 1;
      if (!contiguous) {
        if (i - runS > bestLen) {
          bestLen = i - runS;
          bestS = runS;
        }
        runS = i;
      }
    }
    const jStart = support[bestS];
    const jEnd = support[bestS + bestLen - 1];
    jupiterBlessing = { from: iso(jStart), to: iso(jEnd) };
    if (bestLen >= 3) {
      winStart = new Date(Math.max(winStart.getTime(), addMonths(jStart, -1).getTime()));
      winEnd = new Date(Math.min(winEnd.getTime(), addMonths(jEnd, 1).getTime()));
    }
  }
  if (winEnd.getTime() - winStart.getTime() > 14 * 30.44 * 864e5) winEnd = addMonths(winStart, 14);
  if (winEnd.getTime() - winStart.getTime() < 4 * 30.44 * 864e5) winEnd = addMonths(winStart, 5);
  const after = candidates.find((p) => p.start >= chosen.end);
  const nextWindow = after ? { start: iso(after.start), end: iso(new Date(Math.min(after.end.getTime(), addMonths(after.start, 12).getTime()))) } : null;
  const pool = [...RASHI_LETTERS[seventhSign].slice(0, 2), ...RASHI_LETTERS[seventhLordSign].slice(0, 2), ...RASHI_LETTERS[seventhSign].slice(2)];
  const letters = [];
  for (const l of pool) {
    if (!letters.some((x) => x.latin === l.latin)) letters.push(l);
    if (letters.length === 4) break;
  }
  const partnerDistance = seventhLordHouse === 12 || planetsInSeventh.includes("Rahu") ? "abroad" : [3, 9, 8].includes(seventhLordHouse) || planetsInSeventh.includes("Ketu") ? "far" : "near";
  const delayFactors = [];
  if (planetsInSeventh.includes("Saturn")) delayFactors.push("Saptam bhaav me Shani");
  if ([6, 8, 12].includes(seventhLordHouse)) delayFactors.push(`Saptamesh ${seventhLordHouse}ve bhaav me`);
  if (mangalDosh.present) delayFactors.push("Mangal dosh");
  if (planetsInSeventh.includes("Rahu") || planetsInSeventh.includes("Ketu")) delayFactors.push("Saptam bhaav par Rahu-Ketu ka prabhav");
  if (houseOf(chart.signOf.Saturn, base) === 1) delayFactors.push("Lagna me Shani");
  return {
    seventhSign,
    seventhLord,
    seventhLordSign,
    seventhLordHouse,
    planetsInSeventh,
    karaka,
    karakaSign,
    karakaHouse,
    mangalDosh,
    loveScore,
    marriageType,
    window: { start: iso(winStart), end: iso(winEnd), md: chosen.md, ad: chosen.ad, strength },
    nextWindow,
    jupiterBlessing,
    letters,
    letterSource: `${RASHI[seventhSign].en} (saptam bhaav) aur ${RASHI[seventhLordSign].en} (saptamesh ${PLANET_HINGLISH[seventhLord]} ki rashi)`,
    partnerDirection: DIRECTION[RASHI[seventhSign].element],
    partnerDistance,
    delayFactors
  };
}
var VARNA = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0];
function vashyaOf(moonLon) {
  const sign = Math.floor(moonLon / 30);
  const within = moonLon % 30;
  switch (sign) {
    case 0:
    case 1:
      return 0;
    case 2:
    case 5:
    case 6:
    case 10:
      return 1;
    case 3:
    case 11:
      return 2;
    case 4:
      return 3;
    case 7:
      return 4;
    case 8:
      return within < 15 ? 1 : 0;
    default:
      return within < 15 ? 0 : 2;
  }
}
var VASHYA_TABLE = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2]
];
var YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
var YONI_NAMES = ["Ashwa", "Gaj", "Mesh", "Sarp", "Shwan", "Marjar", "Mushak", "Gau", "Mahish", "Vyaghra", "Mrig", "Vanar", "Nakul", "Singh"];
var YONI_TABLE = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4]
];
var FRIENDS = {
  Sun: { f: ["Moon", "Mars", "Jupiter"], e: ["Venus", "Saturn"] },
  Moon: { f: ["Sun", "Mercury"], e: [] },
  Mars: { f: ["Sun", "Moon", "Jupiter"], e: ["Mercury"] },
  Mercury: { f: ["Sun", "Venus"], e: ["Moon"] },
  Jupiter: { f: ["Sun", "Moon", "Mars"], e: ["Mercury", "Venus"] },
  Venus: { f: ["Mercury", "Saturn"], e: ["Sun", "Moon"] },
  Saturn: { f: ["Mercury", "Venus"], e: ["Sun", "Moon", "Mars"] }
};
function relation(a, b) {
  if (a === b || FRIENDS[a].f.includes(b)) return 1;
  if (FRIENDS[a].e.includes(b)) return -1;
  return 0;
}
var GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
var GANA_NAMES = ["Dev", "Manushya", "Rakshas"];
var GANA_TABLE = [
  // [groom][bride]
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6]
];
var NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
var NADI_NAMES = ["Aadi", "Madhya", "Antya"];
function gunMilan(groom, bride) {
  const varna = VARNA[groom.moonSign] <= VARNA[bride.moonSign] ? 1 : 0;
  const vashya = VASHYA_TABLE[vashyaOf(groom.moonLon)][vashyaOf(bride.moonLon)];
  const taraOk = (from, to) => ![3, 5, 7].includes(((to - from + 27) % 27 + 1) % 9);
  const tara = (taraOk(bride.nakshatra, groom.nakshatra) ? 1.5 : 0) + (taraOk(groom.nakshatra, bride.nakshatra) ? 1.5 : 0);
  const yoni = YONI_TABLE[YONI[groom.nakshatra]][YONI[bride.nakshatra]];
  const lg = RASHI[groom.moonSign].lord, lb = RASHI[bride.moonSign].lord;
  const r1 = relation(lg, lb), r2 = relation(lb, lg);
  const sum = r1 + r2;
  const maitri = r1 === 1 && r2 === 1 ? 5 : sum === 1 ? 4 : r1 === 0 && r2 === 0 ? 3 : sum === 0 ? 1 : sum === -1 ? 0.5 : 0;
  const gana = GANA_TABLE[GANA[groom.nakshatra]][GANA[bride.nakshatra]];
  const dist = (bride.moonSign - groom.moonSign + 12) % 12 + 1;
  const pattern = [2, 12].includes(dist) ? "2-12 (Dwi-Dwadash)" : [5, 9].includes(dist) ? "5-9 (Nav-Pancham)" : [6, 8].includes(dist) ? "6-8 (Shadashtak)" : null;
  const bhakoot = pattern ? 0 : 7;
  const nadi = NADI[groom.nakshatra] === NADI[bride.nakshatra] ? 0 : 8;
  const koots = [
    { key: "varna", name: "Varna", hi: "\u0935\u0930\u094D\u0923", meaning: "Soch aur ahankaar ka taalmel", score: varna, max: 1 },
    { key: "vashya", name: "Vashya", hi: "\u0935\u0936\u094D\u092F", meaning: "Ek dusre par prabhav aur aakarshan", score: vashya, max: 2 },
    { key: "tara", name: "Tara", hi: "\u0924\u093E\u0930\u093E", meaning: "Bhagya aur sehat ka saath", score: tara, max: 3 },
    { key: "yoni", name: "Yoni", hi: "\u092F\u094B\u0928\u093F", meaning: "Sharirik aur swabhavik anukoolta", score: yoni, max: 4 },
    { key: "maitri", name: "Graha Maitri", hi: "\u0917\u094D\u0930\u0939 \u092E\u0948\u0924\u094D\u0930\u0940", meaning: "Mann ka mel, dosti", score: maitri, max: 5 },
    { key: "gana", name: "Gana", hi: "\u0917\u0923", meaning: "Swabhav aur gussa", score: gana, max: 6 },
    { key: "bhakoot", name: "Bhakoot", hi: "\u092D\u0915\u0942\u091F", meaning: "Parivar, dhan aur pyaar ka pravah", score: bhakoot, max: 7 },
    { key: "nadi", name: "Nadi", hi: "\u0928\u093E\u0921\u093C\u0940", meaning: "Sehat aur santaan sukh", score: nadi, max: 8 }
  ];
  return {
    total: koots.reduce((s, k) => s + k.score, 0),
    koots,
    nadiDosh: nadi === 0,
    bhakootDosh: bhakoot === 0,
    ganaDosh: gana <= 1,
    bhakootPattern: pattern
  };
}
var SYLLABLE_NAK = {
  chu: 0,
  che: 0,
  cho: 0,
  la: 0,
  li: 1,
  lu: 1,
  le: 1,
  lo: 1,
  a: 2,
  i: 2,
  u: 2,
  e: 2,
  o: 3,
  va: 3,
  vi: 3,
  vu: 3,
  ve: 4,
  vo: 4,
  ka: 4,
  ki: 4,
  ku: 5,
  gha: 5,
  chha: 5,
  ke: 6,
  ko: 6,
  ha: 6,
  hi: 6,
  hu: 7,
  he: 7,
  ho: 7,
  da: 7,
  di: 8,
  du: 8,
  de: 8,
  do: 8,
  ma: 9,
  mi: 9,
  mu: 9,
  me: 9,
  mo: 10,
  ta: 10,
  ti: 10,
  tu: 10,
  te: 11,
  to: 11,
  pa: 11,
  pi: 11,
  pu: 12,
  sha: 12,
  na: 12,
  tha: 12,
  pe: 13,
  po: 13,
  ra: 13,
  ri: 13,
  ru: 14,
  re: 14,
  ro: 14,
  ni: 16,
  nu: 16,
  ne: 16,
  no: 17,
  ya: 17,
  yi: 17,
  yu: 17,
  ye: 18,
  yo: 18,
  bha: 18,
  bhi: 18,
  bhu: 19,
  dha: 19,
  pha: 19,
  fa: 19,
  bhe: 20,
  bho: 20,
  ja: 20,
  ji: 20,
  ju: 21,
  je: 21,
  jo: 21,
  khi: 21,
  khu: 21,
  khe: 21,
  kho: 21,
  ga: 22,
  gi: 22,
  gu: 22,
  ge: 22,
  go: 23,
  sa: 23,
  si: 23,
  su: 23,
  se: 24,
  so: 24,
  dhi: 24,
  jha: 25,
  de2: 26,
  cha: 26,
  chi: 26,
  ba: 3,
  bi: 3,
  bu: 3,
  be: 3,
  bo: 3,
  wa: 3,
  wi: 3,
  wu: 3,
  we: 4,
  wo: 4,
  gho: 5,
  she: 23,
  shi: 23,
  shu: 23,
  sho: 23,
  kha: 21,
  za: 26,
  zi: 26,
  fi: 19,
  fu: 19,
  fe: 19,
  fo: 19,
  dhu: 19,
  dhe: 19,
  dho: 19,
  thi: 12,
  thu: 12,
  the: 12,
  tho: 12,
  chhi: 5,
  chhu: 5,
  phi: 19,
  phu: 19,
  ghi: 5,
  ghu: 5,
  jhi: 25,
  jhu: 25
};
var DEV_CONS = {
  \u0915: "k",
  \u0916: "kh",
  \u0917: "g",
  \u0918: "gh",
  \u091A: "ch",
  \u091B: "chh",
  \u091C: "j",
  \u091D: "jh",
  \u091F: "t",
  \u0920: "th",
  \u0921: "d",
  \u0922: "dh",
  \u0923: "n",
  \u0924: "t",
  \u0925: "th",
  \u0926: "d",
  \u0927: "dh",
  \u0928: "n",
  \u092A: "p",
  \u092B: "ph",
  \u092C: "b",
  \u092D: "bh",
  \u092E: "m",
  \u092F: "y",
  \u0930: "r",
  \u0932: "l",
  \u0935: "v",
  \u0936: "sh",
  \u0937: "sh",
  \u0938: "s",
  \u0939: "h"
};
var DEV_VOWEL = { \u0905: "a", \u0906: "a", \u0907: "i", \u0908: "i", \u0909: "u", \u090A: "u", \u090F: "e", \u0910: "e", \u0913: "o", \u0914: "o", \u090B: "ri" };
var DEV_MATRA = { "\u093E": "a", "\u093F": "i", "\u0940": "i", "\u0941": "u", "\u0942": "u", "\u0947": "e", "\u0948": "e", "\u094B": "o", "\u094C": "o", "\u0943": "ri" };
function firstSyllable(name) {
  const s = name.trim();
  if (!s) return null;
  const ch = s[0];
  if (DEV_VOWEL[ch]) return DEV_VOWEL[ch];
  if (DEV_CONS[ch]) {
    let i = 1;
    while (s[i] === "\u094D" && i + 1 < s.length) i += 2;
    return DEV_CONS[ch] + (DEV_MATRA[s[i]] ?? "a");
  }
  const lower = s.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return null;
  const m = lower.match(/^(chh|ch|sh|bh|dh|th|kh|gh|ph|jh|[bcdfghjklmnpqrstvwxyz])?[rlywhn]*([aeiou]+)?/);
  if (!m) return null;
  let cons = m[1] ?? "";
  if (cons === "c") cons = "k";
  if (cons === "q") cons = "k";
  if (cons === "x") cons = "z";
  let v = m[2] ?? "a";
  v = v.startsWith("aa") ? "a" : v.startsWith("ee") || v.startsWith("ii") ? "i" : v.startsWith("oo") || v.startsWith("uu") ? "u" : v.startsWith("ai") ? "e" : v.startsWith("au") || v.startsWith("ou") ? "o" : v[0];
  return cons + v;
}
function moonPointFromName(name) {
  const syl = firstSyllable(name);
  if (!syl) return null;
  let nak = SYLLABLE_NAK[syl];
  if (nak === void 0) nak = SYLLABLE_NAK[syl.slice(0, -1) + "a"];
  if (nak === void 0) {
    const cons = syl.replace(/[aeiou]+$/, "");
    const key = Object.keys(SYLLABLE_NAK).find((k) => k.startsWith(cons) && cons.length > 0);
    if (key) nak = SYLLABLE_NAK[key];
  }
  if (nak === void 0) return null;
  const moonLon = nak * (360 / 27) + 360 / 54;
  return { moonLon, moonSign: Math.floor(moonLon / 30), nakshatra: nak, syllable: syl };
}
var moonPointOf = (c) => ({ moonLon: c.positions.Moon, moonSign: c.moonSign, nakshatra: c.nakshatra });
function pratyantars(p) {
  const total = p.end.getTime() - p.start.getTime();
  const first = DASHA_ORDER.indexOf(p.ad);
  let cursor = p.start.getTime();
  return Array.from({ length: 9 }, (_, i) => {
    const pd = DASHA_ORDER[(first + i) % 9];
    const len = total * DASHA_YEARS[pd] / 120;
    const out = { md: p.md, ad: p.ad, pd, start: new Date(cursor), end: new Date(cursor + len) };
    cursor += len;
    return out;
  });
}
function favourableWindows(chart, fav, from, opts) {
  const horizon = addMonths(from, opts.horizonMonths);
  const subs = vimshottari(chart).filter((p) => p.end > from && p.start < horizon).flatMap(pratyantars).filter((s) => s.end > from && (fav.has(s.ad) || fav.has(s.pd)));
  const merged = [];
  for (const s of subs) {
    const start = new Date(Math.max(s.start.getTime(), from.getTime()));
    const last = merged[merged.length - 1];
    if (last && start.getTime() - last.end.getTime() < 864e5) last.end = s.end;
    else merged.push({ start, end: s.end, md: s.md, ad: s.ad });
  }
  return merged.filter((w) => w.end.getTime() - w.start.getTime() >= opts.minDays * 864e5).map((w) => ({ ...w, end: new Date(Math.min(w.end.getTime(), addMonths(w.start, opts.maxMonths).getTime())) }));
}
function loveWindows(chart, now = /* @__PURE__ */ new Date()) {
  const base = chart.baseSign;
  const fifth = signOfHouse(5, base), seventh = signOfHouse(7, base);
  const fav = /* @__PURE__ */ new Set([RASHI[fifth].lord, RASHI[seventh].lord, "Venus"]);
  Object.keys(chart.signOf).forEach((p) => {
    if (chart.signOf[p] === fifth || chart.signOf[p] === seventh) fav.add(p);
  });
  const cur = vimshottari(chart).filter((p) => p.end > now)[0];
  const curSub = pratyantars(cur).find((s) => s.end > now);
  const windows = favourableWindows(chart, fav, now, { minDays: 21, maxMonths: 6, horizonMonths: 36 }).slice(0, 2).map((w) => ({ start: iso(w.start), end: iso(w.end), ad: w.ad }));
  return {
    // Favourable now when either the antardasha or the current pratyantar activates love and partnership.
    currentFavourable: fav.has(cur.ad) || fav.has(curSub.pd),
    current: { md: cur.md, ad: cur.ad, end: iso(cur.end) },
    windows
  };
}
var OWN_OR_EXALTED = {
  Sun: [4, 0],
  Moon: [3, 1],
  Mars: [0, 7, 9],
  Mercury: [2, 5],
  Jupiter: [8, 11, 3],
  Venus: [1, 6, 11],
  Saturn: [9, 10, 6]
};
function analyseBusiness(chart, now = /* @__PURE__ */ new Date()) {
  const base = chart.baseSign;
  const lordOf = (house) => RASHI[signOfHouse(house, base)].lord;
  const houseOfPlanet = (p) => houseOf(chart.signOf[p], base);
  const planets = Object.keys(chart.signOf);
  const inHouse = (h) => planets.filter((p) => houseOfPlanet(p) === h);
  const strong = (p) => (OWN_OR_EXALTED[p] ?? []).includes(chart.signOf[p]);
  const tenthSign = signOfHouse(10, base);
  const tenthLord = lordOf(10), seventhLord = lordOf(7), eleventhLord = lordOf(11), secondLord = lordOf(2), thirdLord = lordOf(3);
  const tenthLordHouse = houseOfPlanet(tenthLord);
  const planetsInTenth = inHouse(10);
  const GOOD = [1, 2, 7, 10, 11];
  let score = 0;
  const reasons = [];
  if ([1, 4, 7, 10, 5, 9].includes(houseOfPlanet("Mercury"))) {
    score += 2;
    reasons.push(`Vyapar ka karak Budh ${houseOfPlanet("Mercury")}ve bhaav me shubh sthiti me hai`);
  }
  if (GOOD.includes(houseOfPlanet(seventhLord))) {
    score += 2;
    reasons.push(`Saptamesh (vyapar-sajhedari) ${PLANET_HINGLISH[seventhLord]} ${houseOfPlanet(seventhLord)}ve bhaav me hai`);
  }
  if (GOOD.includes(tenthLordHouse)) {
    score += 2;
    reasons.push(`Dashamesh (karm) ${PLANET_HINGLISH[tenthLord]} ${tenthLordHouse}ve bhaav me bal de raha hai`);
  }
  if (GOOD.includes(houseOfPlanet(eleventhLord))) {
    score += 1;
    reasons.push(`Labhesh ${PLANET_HINGLISH[eleventhLord]} aamdani ke bhaav ko majboot kar raha hai`);
  }
  if ([3, 6, 10, 11].includes(houseOfPlanet("Rahu"))) {
    score += 1;
    reasons.push("Rahu sahas aur naye tareekon se kamai ka yog bana raha hai");
  }
  if ([3, 10].includes(houseOfPlanet("Mars")) || strong(thirdLord)) {
    score += 1;
    reasons.push("Parakram bhaav majboot hai, jokhim uthane ki himmat hai");
  }
  if (tenthLordHouse === 6) {
    score -= 1;
    reasons.push("Dashamesh chhathe bhaav me hai, jo naukri aur seva ki taraf jhukav deta hai");
  }
  if ([6, 8, 12].includes(houseOfPlanet(seventhLord))) {
    score -= 1;
    reasons.push("Saptamesh kamzor bhaav me hai, vyapar me shuruaati rukavat ke sanket");
  }
  if (planetsInTenth.includes("Saturn") && tenthLordHouse === 6) score -= 1;
  const level = score >= 5 ? "prabal" : score >= 2 ? "mishrit" : "seva";
  const weight = /* @__PURE__ */ new Map();
  const bump = (p, w) => weight.set(p, (weight.get(p) ?? 0) + w);
  bump(tenthLord, 3);
  planetsInTenth.forEach((p) => bump(p, 3));
  bump(seventhLord, 2);
  bump(eleventhLord, 2);
  bump(secondLord, 1);
  bump("Mercury", 1);
  planets.forEach((p) => {
    if (strong(p)) bump(p, 2);
  });
  weight.delete("Ketu");
  const rulers = Array.from(weight.entries()).sort((a, b) => b[1] - a[1]).map(([p]) => p).slice(0, 3);
  const inSeventh = inHouse(7);
  const partnership = [6, 8, 12].includes(houseOfPlanet(seventhLord)) || inSeventh.some((p) => ["Saturn", "Rahu", "Ketu", "Mars"].includes(p)) ? "solo" : inSeventh.some((p) => ["Jupiter", "Venus", "Mercury"].includes(p)) || [1, 7, 10, 11].includes(houseOfPlanet(seventhLord)) ? "partner" : "family";
  const fav = /* @__PURE__ */ new Set([tenthLord, seventhLord, eleventhLord, secondLord, "Mercury", "Jupiter"]);
  const wins = favourableWindows(chart, fav, addMonths(now, 1), { minDays: 45, maxMonths: 8, horizonMonths: 60 });
  const fallbackPeriod = vimshottari(chart).filter((p) => p.end > addMonths(now, 3))[0];
  const chosen = wins[0] ?? { start: addMonths(now, 3), end: addMonths(now, 9), md: fallbackPeriod.md, ad: fallbackPeriod.ad };
  const start = chosen.start, end = chosen.end;
  const after = wins[1];
  const pool = [...RASHI_LETTERS[base].slice(0, 2), ...RASHI_LETTERS[signOfHouse(11, base)].slice(0, 2)];
  const nameLetters = [];
  for (const l of pool) if (!nameLetters.some((x) => x.latin === l.latin)) nameLetters.push(l);
  const cautions = [];
  if ([2, 8].includes(houseOfPlanet("Rahu"))) cautions.push("Udhaar, satta aur jaldi ameer banane wali scheme se door rahein");
  if (inHouse(8).length) cautions.push("Bina likha-padhi ke sajhedari ya bada len-den na karein");
  if (inSeventh.includes("Mars")) cautions.push("Partner ya grahak se behas me gussa nuksan kara sakta hai");
  if ([7, 10].includes(houseOfPlanet("Saturn"))) cautions.push("Safalta dheere aayegi. Pehle 2-3 saal dhairya aur niyam se kaam karein");
  if (inHouse(12).length >= 2) cautions.push("Kharch par kadi nazar rakhein, hisaab roz likhein");
  cautions.push("Shuruaat me apni jama poonji ka 60% se zyada ek saath na lagayein");
  return {
    score,
    level,
    tenthSign,
    tenthLord,
    tenthLordHouse,
    planetsInTenth,
    rulers,
    partnership,
    startWindow: { start: iso(start), end: iso(end), md: chosen.md, ad: chosen.ad },
    nextWindow: after ? { start: iso(after.start), end: iso(after.end) } : null,
    nameLetters: nameLetters.slice(0, 4),
    cautions: cautions.slice(0, 4),
    reasons: reasons.slice(0, 4)
  };
}

// server/services/astro/reports.ts
var MONTHS2 = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var monthYear2 = (isoDate) => {
  const d = new Date(isoDate);
  return `${MONTHS2[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
var yearSpan = (a, b) => {
  const y1 = new Date(a).getUTCFullYear(), y2 = new Date(b).getUTCFullYear();
  if (y2 - y1 >= 2) return `${y1 + 1}`;
  return y1 === y2 ? `${y1}` : `${y1}\u2013${String(y2).slice(2)}`;
};
var ordinal = (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
var PARTNER_BY_SIGN = [
  { looks: "Athletic kad-kaathi, tez nazar, chehre par aatmavishwas", nature: "Josheela, seedhi baat karne wala, thoda gussail par dil ka saaf", work: "Police, sena, engineering, sports ya apna business", sketch: "sharp jawline, confident intense eyes, athletic build" },
  { looks: "Sundar aur bhara hua chehra, badi aankhen, aakarshak muskaan", nature: "Shaant, bharosemand, ghar-parivar se juda, thoda ziddi", work: "Bank, finance, khana, fashion ya kala se juda kaam", sketch: "soft rounded face, large calm eyes, gentle smile" },
  { looks: "Lamba-patla sharir, chanchal aankhen, umar se chhota dikhna", nature: "Baatuni, hasmukh, buddhiman, har cheez me dilchaspi", work: "Sales, media, likhna-padhna, IT ya vyapar", sketch: "slim face, bright lively eyes, youthful playful expression" },
  { looks: "Gol chehra, gora ya saaf rang, bhavuk aankhen", nature: "Bahut caring, bhavuk, parivar ko sabse upar rakhne wala", work: "Teaching, medical, hotel, sarkari seva", sketch: "round soft face, fair glowing skin, kind emotional eyes" },
  { looks: "Rob-daar vyaktitva, chauda maatha, ghane baal", nature: "Dildaar, swabhimani, leader jaisa, tareef pasand", work: "Sarkari pad, prashasan, rajneeti ya management", sketch: "broad forehead, thick hair, dignified proud expression" },
  { looks: "Saaf-suthra roop, patla sharir, tez aur samajhdar aankhen", nature: "Samajhdar, mehnati, har kaam me perfection, thoda chinta karne wala", work: "Accounts, doctor, teacher, analyst", sketch: "neat delicate features, slim face, thoughtful intelligent eyes" },
  { looks: "Bahut aakarshak, santulit naak-naksh, madhur muskaan", nature: "Milansaar, romantic, ladai se door rehne wala, sundarta pasand", work: "Design, kanoon, beauty, hospitality", sketch: "symmetrical attractive features, charming sweet smile, graceful look" },
  { looks: "Gehri aur tez aankhen, majboot sharir, rahasyamayi andaaz", nature: "Bahut gehra pyaar karne wala, wafadaar, possessive, raaz rakhne wala", work: "Research, medical, police, technical field", sketch: "deep piercing eyes, strong features, mysterious intense gaze" },
  { looks: "Lamba kad, chauda maatha, khula hasmukh chehra", nature: "Imaandar, dharmik, ghoomne ka shaukeen, azaad khayal", work: "Shiksha, kanoon, dharm, videsh se juda kaam", sketch: "tall build, broad forehead, open cheerful face" },
  { looks: "Gambhir chehra, patla-majboot sharir, umar ke saath nikharta roop", nature: "Zimmedar, mehnati, kam bolne wala par bharosemand", work: "Sarkari naukri, nirman, prashasan, purana jama hua business", sketch: "serious composed face, lean strong build, mature look" },
  { looks: "Lamba kad, alag sa aakarshak chehra, sochti hui aankhen", nature: "Alag soch wala, dost jaisa saathi, samaj ke liye kuch karne wala", work: "IT, vigyan, samaj seva, bade sangathan", sketch: "tall, distinctive features, thoughtful friendly eyes" },
  { looks: "Komal chehra, sapneeli badi aankhen, saumya muskaan", nature: "Dayalu, bhavuk, adhyatmik, tyag karne wala", work: "Kala, sangeet, chikitsa, adhyatm ya videsh", sketch: "soft gentle face, large dreamy eyes, serene smile" }
];
var REMEDY_BY_PLANET = {
  Sun: ["Roz subah Surya ko jal chadhayein", "Ravivar ko gud aur gehun ka daan karein"],
  Moon: ["Somvar ko Shivling par doodh-jal chadhayein", "Maa ka aashirwad lekar hi shubh kaam shuru karein"],
  Mars: ["Mangalvar ko Hanuman Chalisa ka paath karein", "Mangalvar ko masoor dal ya gud ka daan karein"],
  Mercury: ["Budhvar ko Ganesh ji ko durva chadhayein", "Budhvar ko hari moong ka daan karein"],
  Jupiter: ["Guruvar ko kele ke ped me jal chadhayein", "Guruvar ko chane ki dal aur haldi ka daan karein"],
  Venus: ["Shukravar ko Maa Lakshmi ko safed mithai ka bhog lagayein", "Shukravar ko chawal ya doodh ka daan karein"],
  Saturn: ["Shanivar ko peepal ke neeche sarson ke tel ka diya jalayein", "Shanivar ko zarooratmand ko kale til ya kambal daan karein"]
};
var TYPE_COPY = {
  love: { label: "Love marriage ke prabal yog", hi: "\u092A\u094D\u0930\u0947\u092E \u0935\u093F\u0935\u093E\u0939", reason: "Pancham (prem) aur saptam (vivah) bhaav ke swami ka aapas me seedha sambandh ban raha hai." },
  love_arranged: { label: "Love-cum-arranged ke yog", hi: "\u092A\u094D\u0930\u0947\u092E + \u092A\u093E\u0930\u093F\u0935\u093E\u0930\u093F\u0915", reason: "Prem ke yog maujood hain, par rishta parivar ki sehmati se hi pakka hone ke sanket hain." },
  arranged: { label: "Arranged marriage ke yog", hi: "\u092A\u093E\u0930\u093F\u0935\u093E\u0930\u093F\u0915 \u0935\u093F\u0935\u093E\u0939", reason: "Saptam bhaav par paramparik grahon ka prabhav hai, rishta parivar ya jaan-pehchan ke zariye aane ke sanket hain." }
};
var DISTANCE_COPY = {
  near: "Apne hi shehar ya aas-paas ke ilaake se",
  far: "Dusre shehar ya rajya se",
  abroad: "Kaafi door se, dusre rajya ya videsh se jude hone ke sanket"
};
function chartSummary(c) {
  return {
    lagna: c.lagnaSign !== null ? RASHI[c.lagnaSign].en : null,
    moonRashi: RASHI[c.moonSign].en,
    moonRashiHi: RASHI[c.moonSign].hi,
    nakshatra: NAKSHATRA[c.nakshatra],
    pada: c.pada,
    timeKnown: c.timeKnown,
    placePrecise: c.placePrecise
  };
}
function buildShaadiFacts(input) {
  const chart = computeChart(input);
  return { kind: "shaadi", chart: chartSummary(chart), marriage: analyseMarriage(chart, input) };
}
function shaadiSections(input, f) {
  const m = f.marriage;
  const partner = PARTNER_BY_SIGN[m.seventhSign];
  const who = input.gender === "male" ? "patni" : "pati";
  const base = f.chart.timeKnown ? "lagna" : "Chandra lagna";
  const mangal = m.mangalDosh.present ? {
    present: true,
    title: "Mangal dosh maujood hai",
    text: `Aapki kundli me Mangal ${base} se ${ordinal(m.mangalDosh.marsHouse)} bhaav me hai, isliye Mangal dosh ban raha hai. Iska matlab shaadi rukna nahi hai. Manglik saathi se vivah ya saral upay se iska asar kaafi kam ho jaata hai.`,
    upay: ["Mangalvar ko Hanuman ji ko sindoor aur chameli ka tel chadhayein", "Vivah se pehle Mangal shanti ya Kumbh vivah ki salah kisi pandit se lein"]
  } : {
    present: false,
    title: "Mangal dosh nahi hai",
    text: `Aapki kundli me Mangal ${base} se ${ordinal(m.mangalDosh.marsHouse)} bhaav me hai, jo Mangal dosh nahi banata. Is taraf se vivah me koi rukavat nahi hai.`,
    upay: []
  };
  return {
    snapshot: [
      { label: "Lagna", value: f.chart.lagna ?? "Janm samay na hone se Chandra lagna liya gaya" },
      { label: "Chandra rashi", value: `${f.chart.moonRashi} (${f.chart.moonRashiHi})` },
      { label: "Nakshatra", value: `${f.chart.nakshatra}, charan ${f.chart.pada}` },
      { label: "Saptam bhaav (vivah)", value: `${RASHI[m.seventhSign].en} rashi` },
      { label: "Saptamesh", value: `${PLANET_HINGLISH[m.seventhLord]}, ${ordinal(m.seventhLordHouse)} bhaav me` },
      { label: `${who === "patni" ? "Patni" : "Pati"} karak`, value: `${PLANET_HINGLISH[m.karaka]}, ${ordinal(m.karakaHouse)} bhaav me` }
    ],
    timing: {
      window: `${monthYear2(m.window.start)} se ${monthYear2(m.window.end)}`,
      strength: m.window.strength === "prabal" ? "Prabal yog" : "Madhyam yog",
      dasha: `${PLANET_HINGLISH[m.window.md]} mahadasha, ${PLANET_HINGLISH[m.window.ad]} antardasha`,
      jupiter: m.jupiterBlessing ? `${monthYear2(m.jupiterBlessing.from)} se ${monthYear2(m.jupiterBlessing.to)} tak gochar ka Guru aapke vivah bhaav ko bal de raha hai.` : null,
      next: m.nextWindow ? `${monthYear2(m.nextWindow.start)} se ${monthYear2(m.nextWindow.end)}` : null,
      delays: m.delayFactors
    },
    type: TYPE_COPY[m.marriageType],
    partner: {
      who,
      letters: m.letters,
      letterSource: m.letterSource,
      looks: partner.looks,
      nature: partner.nature,
      work: partner.work,
      direction: m.partnerDirection.en,
      distance: DISTANCE_COPY[m.partnerDistance]
    },
    mangal,
    upay: REMEDY_BY_PLANET[m.seventhLord] ?? REMEDY_BY_PLANET.Venus
  };
}
function portraitPrompt(input, f) {
  const partner = PARTNER_BY_SIGN[f.marriage.seventhSign];
  const age = Math.max(21, Math.min(45, (/* @__PURE__ */ new Date()).getUTCFullYear() - Number(input.dob.slice(0, 4)) + (input.gender === "male" ? -2 : 2)));
  const subject = input.gender === "male" ? `a young Indian woman of about ${age}, in an elegant traditional outfit with a soft dupatta` : `a young Indian man of about ${age}, in a simple kurta`;
  return `A delicate hand-drawn pencil and soft watercolor portrait sketch of ${subject}. Features: ${partner.sketch}. Shoulders-up, facing slightly to the side, warm gentle expression. Style: fine graphite lines with light sepia and rose watercolor wash on textured ivory paper, artistic, tasteful, like an illustration in a keepsake book. Plain background. No text, no letters, no watermark, no frame.`;
}
var TONE = `Likho simple, garmjoshi bhari Hinglish me (Roman lipi, jaise log WhatsApp par likhte hain). Vakya chhote rakho. "Sambhavna", "yog", "sanket" jaise shabd use karo, kabhi pakka dava ya guarantee mat do. Diye gaye tathyon se bahar koi nayi tareekh, akshar ya graha sthiti mat banao. Sirf JSON lautao.`;
async function shaadiNarrative(input, f, palm) {
  const s = shaadiSections(input, f);
  const fallback = {
    summary: `${input.name.split(/\s+/)[0]} ji, aapki kundli me vivah ka ${s.timing.strength.toLowerCase()} ${s.timing.window} ke beech ban raha hai. Aapke liye ${s.type.label.toLowerCase()} hain. Jeevansathi ka naam ${s.partner.letters.map((l) => l.latin).join(", ")} me se kisi akshar se shuru hone ki sambhavna hai.`,
    timing: `Is samay ${s.timing.dasha} chal rahi hogi, jo aapke saptam bhaav ko jagati hai. ${s.timing.jupiter ?? ""}`.trim(),
    partner: `Aapke saptam bhaav me ${RASHI[f.marriage.seventhSign].en} rashi hai, isliye jeevansathi ${s.partner.nature.charAt(0).toLowerCase() + s.partner.nature.slice(1)} hone ke sanket hain.`,
    meeting: `Rishta ${s.partner.distance.charAt(0).toLowerCase() + s.partner.distance.slice(1)} aur ${s.partner.direction} disha se aane ke sanket hain.`,
    advice: s.timing.delays.length ? `Thodi der ke yog ${s.timing.delays.join(", ")} ki wajah se hain. Sabr rakhein aur neeche diye upay niyamit karein.` : "Aapki kundli me vivah ko rokne wala koi bada dosh nahi hai. Sahi samay par aaye rishte ko gambhirta se dekhein."
  };
  const ai = await generateJson(
    `Tum ek anubhavi Vedic jyotishi ho jo vivah bhavishya ki report likhte ho. ${TONE}`,
    `Vyakti: ${input.name}, ${input.gender === "male" ? "purush" : "mahila"}, janm ${input.dob}.
Kundli ke tathya (inhe hi aadhar banao):
${JSON.stringify({ snapshot: s.snapshot, vivah_samay: s.timing, vivah_prakar: s.type, jeevansathi: s.partner, mangal: s.mangal.title, hast_rekha: palm }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sabse zaroori nishkarsh, naam lekar",
 "timing": "2-3 vakya: yeh samay kyon, dasha aur Guru ke gochar ko aasan bhasha me",
 "partner": "3 vakya: jeevansathi ka swabhav aur roop, upar ke tathyon se",
 "meeting": "2 vakya: mulaqat kaise/kahan se hone ke sanket",
 "advice": "2 vakya: is samay ko safal banane ki vyavaharik salah"}`
  );
  const pick = (k) => {
    const v = ai ? String(ai[k] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[k];
  };
  return { summary: pick("summary"), timing: pick("timing"), partner: pick("partner"), meeting: pick("meeting"), advice: pick("advice"), ai: !!ai };
}
function shaadiView(row) {
  const { input, facts: f } = row;
  const m = f.marriage;
  const common = {
    id: row.id,
    type: "shaadi",
    paid: row.paid,
    name: input.name,
    gender: input.gender,
    price: ASTRO_PRICES.shaadi,
    chart: f.chart,
    palmRead: !!row.palm,
    headline: m.window.strength === "prabal" ? "Aapki kundli me vivah ka prabal yog ban raha hai" : "Aapki kundli me vivah ka yog ban raha hai",
    letterCount: m.letters.length
  };
  const years = yearSpan(m.window.start, m.window.end);
  if (!row.paid) {
    return { ...common, windowIsRange: years.includes("\u2013"), firstLetter: m.letters[0], delayCount: m.delayFactors.length };
  }
  return {
    ...common,
    windowYears: years,
    sections: shaadiSections(input, f),
    narrative: row.narrative,
    palm: row.palm,
    hasPortrait: row.has_portrait
  };
}
var MilanInputError = class extends Error {
};
function buildMilanFacts(input) {
  const selfChart = computeChart(input.self);
  const selfMarriage = analyseMarriage(selfChart, input.self);
  const partnerGender = input.self.gender === "male" ? "female" : "male";
  let partnerPoint;
  let basis;
  let partnerMangal = null;
  let partnerWindow = null;
  if (input.partner.dob) {
    const pInput = {
      name: input.partner.name,
      gender: partnerGender,
      dob: input.partner.dob,
      tob: input.partner.tob,
      place: input.partner.place || "India"
    };
    const pChart = computeChart(pInput);
    const pMarriage = analyseMarriage(pChart, pInput);
    partnerPoint = moonPointOf(pChart);
    basis = input.partner.tob ? "kundli" : "dob_only";
    partnerMangal = pMarriage.mangalDosh.present;
    partnerWindow = { start: pMarriage.window.start, end: pMarriage.window.end };
  } else {
    const fromName = moonPointFromName(input.partner.name);
    if (!fromName) throw new MilanInputError("Naam se rashi nahi nikal payi. Kripya janm tithi bharein.");
    partnerPoint = fromName;
    basis = "naam";
  }
  const selfPoint = moonPointOf(selfChart);
  const [groom, bride] = input.self.gender === "male" ? [selfPoint, partnerPoint] : [partnerPoint, selfPoint];
  const milan = gunMilan(groom, bride);
  const total = milan.total;
  const band = total >= 28 ? "uttam" : total >= 21 ? "achha" : total >= 18 ? "madhyam" : "kamzor";
  const selfMangal = selfMarriage.mangalDosh.present;
  const mangalMatch = partnerMangal === null ? "unknown" : selfMangal && partnerMangal ? "both" : selfMangal || partnerMangal ? "one" : "none";
  const nSelf = selfPoint.nakshatra, nPartner = partnerPoint.nakshatra;
  return {
    kind: "milan",
    self: { moonRashi: RASHI[selfPoint.moonSign].en, nakshatra: NAKSHATRA[nSelf], mangal: selfMangal },
    partner: { moonRashi: RASHI[partnerPoint.moonSign].en, nakshatra: NAKSHATRA[nPartner], mangal: partnerMangal, basis },
    milan,
    yoni: [yoniName(nSelf), yoniName(nPartner)],
    gana: [ganaName(nSelf), ganaName(nPartner)],
    nadi: [nadiName(nSelf), nadiName(nPartner)],
    band,
    mangalMatch,
    selfWindow: { start: selfMarriage.window.start, end: selfMarriage.window.end },
    partnerWindow
  };
}
var yoniName = (n) => YONI_NAMES[YONI[n]];
var ganaName = (n) => GANA_NAMES[GANA[n]];
var nadiName = (n) => NADI_NAMES[NADI[n]];
var BAND_COPY = {
  uttam: { label: "Uttam milan", hi: "\u0909\u0924\u094D\u0924\u092E \u092E\u093F\u0932\u093E\u0928", line: "Yeh jodi shastron ke hisaab se bahut shubh maani jaati hai." },
  achha: { label: "Achha milan", hi: "\u0905\u091A\u094D\u091B\u093E \u092E\u093F\u0932\u093E\u0928", line: "Yeh jodi vivah ke liye anukool maani jaati hai." },
  madhyam: { label: "Madhyam milan", hi: "\u092E\u0927\u094D\u092F\u092E \u092E\u093F\u0932\u093E\u0928", line: "Milan seema par hai. Samajhdari aur upay ke saath rishta chal sakta hai." },
  kamzor: { label: "Kamzor milan", hi: "\u0915\u092E\u091C\u093C\u094B\u0930 \u092E\u093F\u0932\u093E\u0928", line: "Gun kam mile hain. Rishta namumkin nahi, par mehnat aur upay zaroori honge." }
};
var BASIS_NOTE = {
  kundli: "Dono ki janm kundli se milan kiya gaya hai.",
  dob_only: "Saathi ka janm samay nahi tha, isliye unki rashi dopahar 12 baje ke Chandra se li gayi hai. Nakshatra me halka antar ho sakta hai.",
  naam: "Saathi ki janm tithi nahi thi, isliye naam ke pehle akshar se naam-rashi li gayi hai. Janm tithi dene par milan zyada sateek hoga."
};
function overlap(a, b) {
  if (!b) return null;
  const s = a.start > b.start ? a.start : b.start;
  const e = a.end < b.end ? a.end : b.end;
  return s < e ? { start: s, end: e } : null;
}
function milanSections(input, f) {
  const g = f.milan;
  const p = input.partner.name;
  const doshas = [
    {
      name: "Nadi dosh",
      present: g.nadiDosh,
      text: g.nadiDosh ? `Dono ki nadi ${f.nadi[0]} hai, isliye Nadi dosh ban raha hai. Shastron me ise sehat aur santaan sukh se joda jaata hai. Nadi dosh nivaran puja aur daan se iska asar kam maana jaata hai.` : `Aapki nadi ${f.nadi[0]} aur ${p} ki ${f.nadi[1]} hai. Nadi dosh nahi hai, jo sabse zaroori shubh sanket hai.`
    },
    {
      name: "Bhakoot dosh",
      present: g.bhakootDosh,
      text: g.bhakootDosh ? `Dono ki rashiyon me ${g.bhakootPattern} sambandh hai, isliye Bhakoot dosh ban raha hai. Iska asar aapsi taalmel aur dhan par pad sakta hai. Rashi swami mitra hon to iska prabhav ghat jaata hai.` : "Dono ki rashiyon ka aapsi sthan shubh hai. Bhakoot dosh nahi hai."
    },
    {
      name: "Mangal dosh",
      present: f.mangalMatch === "one",
      text: f.mangalMatch === "both" ? "Dono kundliyon me Mangal dosh hai, isliye yeh ek dusre ko kaat deta hai. Yeh shubh sthiti hai." : f.mangalMatch === "one" ? `${f.self.mangal ? "Aapki" : `${p} ki`} kundli me Mangal dosh hai aur dusre ki nahi. Vivah se pehle Mangal shanti karwana uchit rahega.` : f.mangalMatch === "none" ? "Dono me se kisi ki kundli me Mangal dosh nahi hai." : `${f.self.mangal ? "Aapki kundli me Mangal dosh hai." : "Aapki kundli me Mangal dosh nahi hai."} ${p} ka Mangal dosh janm tithi ke bina nahi dekha ja sakta.`
    }
  ];
  const serious = (g.nadiDosh ? 1 : 0) + (g.bhakootDosh ? 1 : 0) + (f.mangalMatch === "one" ? 1 : 0);
  const good = f.band === "uttam" || f.band === "achha";
  const verdictLine = input.question === "wapas" ? good && serious === 0 ? `${p} ke saath aapka judaav gehra hai. Dobara baat banne ke sanket maujood hain.` : good ? `Judaav achha hai, par beech ke dosh doori ki wajah ban rahe hain. Pehal aur sabr se baat ban sakti hai.` : `Is rishte me khichav hai par sthirta kam hai. Wapsi ho bhi to pehle wali galtiyan dohraane se bachna hoga.` : input.question === "shaadi" ? good && serious === 0 ? `${p} ke saath vivah ke yog anukool hain.` : good ? `${p} ke saath vivah sambhav hai, par neeche diye dosh ka nivaran pehle karna uchit rahega.` : f.band === "madhyam" ? `${p} ke saath vivah ho sakta hai, par dono taraf se samjhaute aur upay zaroori honge.` : `${p} ke saath vivah me rukavatein dikh rahi hain. Faisla jaldbaazi me na lein aur upay zaroor karein.` : good ? `${p} ke saath aapka rishta sukhad rehne ke sanket hain.` : `${p} ke saath rishte me utaar-chadhav rahenge. Samajh aur sanvaad se ise sambhala ja sakta hai.`;
  const strengths = g.koots.filter((k) => k.score / k.max >= 0.75).map((k) => `${k.name} (${k.score}/${k.max}): ${k.meaning.toLowerCase()} me achha mel`);
  const challenges = g.koots.filter((k) => k.score / k.max <= 0.34).map((k) => `${k.name} (${k.score}/${k.max}): ${k.meaning.toLowerCase()} par dhyan dena hoga`);
  const both = overlap(f.selfWindow, f.partnerWindow);
  const upay = [
    ...g.nadiDosh ? ["Nadi dosh nivaran ke liye Mahamrityunjaya jaap aur swarn/anna daan"] : [],
    ...g.bhakootDosh ? ["Bhakoot dosh ke liye dono milkar Somvar ko Shiv-Parvati ki puja karein"] : [],
    ...f.mangalMatch === "one" ? ["Mangal shanti puja, aur Mangalvar ko Hanuman Chalisa"] : [],
    "Shukravar ko Maa Lakshmi ya Radha-Krishna ko safed phool chadhayein",
    "Koi bhi bada faisla Guruvar ya Shukravar ko lein"
  ].slice(0, 4);
  return {
    koots: g.koots,
    doshas,
    verdict: { line: verdictLine, band: BAND_COPY[f.band] },
    strengths: strengths.slice(0, 4),
    challenges: challenges.slice(0, 4),
    timing: {
      self: `${monthYear2(f.selfWindow.start)} se ${monthYear2(f.selfWindow.end)}`,
      partner: f.partnerWindow ? `${monthYear2(f.partnerWindow.start)} se ${monthYear2(f.partnerWindow.end)}` : null,
      both: both ? `${monthYear2(both.start)} se ${monthYear2(both.end)}` : null
    },
    pair: { yoni: f.yoni, gana: f.gana, nadi: f.nadi },
    upay,
    basisNote: BASIS_NOTE[f.partner.basis]
  };
}
var g0 = (lines) => {
  const names = lines.map((l) => l.split(" (")[0]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} aur ${names[names.length - 1]}` : names[0];
};
async function milanNarrative(input, f) {
  const s = milanSections(input, f);
  const p = input.partner.name;
  const fallback = {
    summary: `${input.self.name.split(/\s+/)[0]} aur ${p.split(/\s+/)[0]} ke 36 me se ${f.milan.total} gun mile hain. ${s.verdict.band.line}`,
    bond: s.strengths.length ? `Is jodi ka sabse majboot paksh ${g0(s.strengths)} hai. In kooton me poora ya lagbhag poora mel hai.` : "Is jodi me taalmel banane ke liye dono ko barabar koshish karni hogi.",
    caution: s.challenges.length ? `${g0(s.challenges)} me ank kam aaye hain, isliye yahan samajhdari aur sabr ki zaroorat rahegi.` : "Koi badi chunauti nahi dikh rahi. Chhoti baaton ko bada na banne dein.",
    advice: s.timing.both ? `Dono ke liye sabse anukool samay ${s.timing.both} hai. Is dauraan baat aage badhana shubh rahega.` : `Aapke liye anukool samay ${s.timing.self} hai. Is dauraan rishte par dhyan dena shubh rahega.`
  };
  const qText = input.question === "wapas" ? "Kya woh wapas aayenge / rishta dobara judega?" : input.question === "shaadi" ? "Kya inse shaadi hogi?" : "Hamara rishta kaisa rahega?";
  const ai = await generateJson(
    `Tum ek anubhavi Vedic jyotishi ho jo kundli milan (Ashtakoot gun milan) ki report likhte ho. ${TONE} Kisi ko yeh mat kaho ki rishta pakka tootega ya pakka hoga. Kam gun hone par bhi sammaan aur ummeed ke saath raasta batao.`,
    `Jodi: ${input.self.name} (${input.self.gender === "male" ? "purush" : "mahila"}) aur ${p}. Unka sawal: "${qText}"
Tathya:
${JSON.stringify({ kul_gun: `${f.milan.total}/36`, shreni: s.verdict.band.label, nishkarsh: s.verdict.line, koot: f.milan.koots.map((k) => `${k.name} ${k.score}/${k.max}`), dosh: s.doshas.map((d) => `${d.name}: ${d.present ? "hai" : "nahi"}`), mangal: f.mangalMatch, anukool_samay: s.timing, aadhar: s.basisNote }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sawal ka seedha jawab, dono ke naam aur gun sankhya ke saath",
 "bond": "2-3 vakya: is jodi ki sabse badi taakat, kooton ke aadhar par aasan bhasha me",
 "caution": "2-3 vakya: kahan savdhani chahiye aur kyon",
 "advice": "2 vakya: anukool samay aur ek vyavaharik salah"}`,
    800
  );
  const pick = (k) => {
    const v = ai ? String(ai[k] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[k];
  };
  return { summary: pick("summary"), bond: pick("bond"), caution: pick("caution"), advice: pick("advice"), ai: !!ai };
}
function milanView(row) {
  const { input, facts: f } = row;
  const common = {
    id: row.id,
    type: "milan",
    paid: row.paid,
    price: ASTRO_PRICES.milan,
    selfName: input.self.name,
    partnerName: input.partner.name,
    question: input.question,
    total: f.milan.total,
    band: BAND_COPY[f.band],
    self: { moonRashi: f.self.moonRashi, nakshatra: f.self.nakshatra },
    partner: { moonRashi: f.partner.moonRashi, nakshatra: f.partner.nakshatra, basis: f.partner.basis },
    basisNote: BASIS_NOTE[f.partner.basis]
  };
  if (!row.paid) {
    return {
      ...common,
      koots: f.milan.koots.map((k, i) => i < 3 ? k : { key: k.key, name: k.name, hi: k.hi, meaning: k.meaning, max: k.max, score: null }),
      doshCount: (f.milan.nadiDosh ? 1 : 0) + (f.milan.bhakootDosh ? 1 : 0) + (f.mangalMatch === "one" ? 1 : 0)
    };
  }
  return { ...common, sections: milanSections(input, f), narrative: row.narrative };
}

// server/services/astro/reports2.ts
var firstName = (n) => {
  const f = n.trim().split(/\s+/)[0];
  return f.charAt(0).toUpperCase() + f.slice(1);
};
function buildWapasFacts(input) {
  const milan = buildMilanFacts({ self: input.self, partner: input.partner, question: "wapas" });
  const love = loveWindows(computeChart(input.self));
  const k = (key) => milan.milan.koots.find((x) => x.key === key).score;
  let score = 35 + milan.milan.total / 36 * 30 + k("maitri") / 5 * 10;
  if (!milan.milan.bhakootDosh) score += 5;
  if (love.currentFavourable) score += 12;
  if (milan.milan.nadiDosh) score -= 4;
  if (milan.milan.ganaDosh) score -= 6;
  score = Math.round(Math.max(15, Math.min(88, score)));
  return { kind: "wapas", milan, love, score, level: score >= 65 ? "prabal" : score >= 45 ? "madhyam" : "kam" };
}
var LEVEL_COPY = {
  prabal: { label: "Wapsi ke prabal sanket", hi: "\u092A\u094D\u0930\u092C\u0932 \u0938\u0902\u0915\u0947\u0924", line: "Dono ke beech ka judaav abhi khatm nahi hua hai. Dobara baat banne ke yog majboot hain." },
  madhyam: { label: "Wapsi ke madhyam sanket", hi: "\u092E\u0927\u094D\u092F\u092E \u0938\u0902\u0915\u0947\u0924", line: "Judaav maujood hai, par wapsi sahi samay aur sahi tareeke par nirbhar karegi." },
  kam: { label: "Wapsi ke kam sanket", hi: "\u0915\u092E \u0938\u0902\u0915\u0947\u0924", line: "Grahon ke hisaab se is rishte me khichav zyada aur sthirta kam hai. Wapsi mushkil hai, namumkin nahi." }
};
var STATUS_COPY = {
  breakup: "Breakup ho chuka hai",
  no_contact: "Baat-cheet band hai",
  fight: "Jhagda/narazgi chal rahi hai",
  separated: "Shaadi ke baad alag rah rahe hain"
};
function wapasSections(input, f) {
  const p = firstName(input.partner.name);
  const g = f.milan.milan;
  const k = (key) => g.koots.find((x) => x.key === key);
  const causes = [];
  if (k("gana").score <= 1) causes.push("Gussa aur ahankaar ka takrav: dono apni baat par ade rehte hain");
  if (k("maitri").score <= 1) causes.push("Soch ka antar: ek hi baat ko dono alag tarah samajhte hain");
  if (g.bhakootDosh) causes.push("Parivar ya paise se juda khichav rishte par bhaari pada");
  if (k("tara").score <= 1.5) causes.push("Kharab samay ka asar: galat waqt par kahi gayi baat ne doori badhayi");
  if (k("yoni").score <= 1) causes.push("Apekshaon ka antar: ek ko jo chahiye tha, dusra de nahi paya");
  if (k("vashya").score <= 0.5) causes.push("Ek ka zyada haavi hona, dusre ko ghutan mehsoos hui");
  if (!causes.length) causes.push("Doori ki wajah mel ki kami nahi, balki graha dasha ka kathin daur hai");
  const feel = k("maitri").score >= 4 && k("vashya").score >= 1 ? `${p} ke mann me aapke liye lagaav abhi bhi bana hua hai. Mann ka mel (Graha Maitri) majboot hai, isliye yaad dono taraf hai.` : k("maitri").score >= 3 ? `${p} ke mann me aapke liye jagah hai, par ahankaar ya halaat unhe pehal karne se rok rahe hain.` : `${p} is samay bhavnaon se zyada dimaag se soch rahe hain. Dabav daalne par woh aur door ja sakte hain.`;
  const w = f.love.windows;
  const contact = w[0] ? `${monthYear2(w[0].start)} se ${monthYear2(w[0].end)}` : null;
  const soon = w[1] && new Date(w[1].start).getTime() - Date.now() < 2 * 365 * 864e5;
  const next = w[1] && soon ? `${monthYear2(w[1].start)} se ${monthYear2(w[1].end)}` : null;
  const act = f.love.currentFavourable ? { title: "Pehal karne ka samay hai", text: `Abhi aapki ${PLANET_HINGLISH[f.love.current.ad]} ki antardasha chal rahi hai, jo prem aur rishte ke bhaav ko sakriya karti hai. Ek chhota, bina shikayat wala sandesh bhejna shubh rahega.` } : { title: "Abhi intezaar behtar hai", text: `Abhi ki dasha rishton ke liye utni anukool nahi hai. ${contact ? `${contact} ke dauraan` : "Aane wale anukool samay me"} baat banne ke yog zyada hain. Tab tak dabav na banayein.` };
  return {
    level: LEVEL_COPY[f.level],
    meter: f.level === "prabal" ? 3 : f.level === "madhyam" ? 2 : 1,
    feel,
    causes: causes.slice(0, 3),
    act,
    timing: { contact, next, dasha: `${PLANET_HINGLISH[f.love.current.md]} mahadasha, ${PLANET_HINGLISH[f.love.current.ad]} antardasha` },
    doList: [
      "Pehla sandesh chhota rakhein: haal-chaal, koi shikayat ya safai nahi",
      "Purani ladai ka zikr pehli 2-3 baat-cheet me na karein",
      "Jawab na aaye to 10-15 din ka antar rakhein, baar baar message na karein"
    ],
    dontList: [
      "Unke dost ya parivar se sifarish na karwayein",
      "Social media par jatane wale status na lagayein",
      "Tantra-mantra ya vashikaran ke chakkar me paisa na gawayein"
    ],
    upay: [
      "Shukravar ko Maa Lakshmi ya Radha-Krishna ko safed phool aur mishri chadhayein",
      "Somvar ko Shivling par jal chadhakar rishte ki shanti ki prarthana karein",
      ...g.ganaDosh ? ["Gusse par kaabu ke liye roz 11 baar 'Om Namah Shivay' ka jaap"] : []
    ],
    gun: { total: g.total, band: BAND_COPY[f.milan.band] },
    care: "Agar yeh rishta aapko baar baar dukh de raha hai, to khud ko pehle rakhna bhi utna hi shubh hai. Wapsi na ho, tab bhi aapki kundli me prem ke yog khatm nahi hote.",
    basisNote: BASIS_NOTE[f.milan.partner.basis]
  };
}
async function wapasNarrative(input, f) {
  const s = wapasSections(input, f);
  const a = firstName(input.self.name), p = firstName(input.partner.name);
  const fallback = {
    summary: `${a} ji, aapki aur ${p} ki kundli ke hisaab se ${s.level.label.toLowerCase()} hain. ${s.level.line}`,
    feelings: s.feel,
    cause: `Doori ki sabse badi wajah: ${s.causes[0].split(":")[0].toLowerCase()}. Ise samjhe bina wapsi tikau nahi hogi.`,
    advice: "Sabse zaroori baat: pehle apna mann shaant karein, phir kadam uthayein. Jo bhi ho, apni neend, kaam aur apnon ka saath na chhodein."
  };
  const ai = await generateJson(
    `Tum ek samvedansheel Vedic jyotishi ho. Koi vyakti apne bichhde saathi ke baare me pooch raha hai aur dukhi hai. ${TONE} Kabhi yeh mat kaho ki woh pakka wapas aayenge ya kabhi nahi aayenge. Vashikaran, tantra ya kisi ko control karne ki baat bilkul mat karo. Vyakti ko sammaan aur himmat do.`,
    `${a} (${input.self.gender === "male" ? "purush" : "mahila"}) pooch rahe hain ki ${p} wapas aayenge ya nahi. Sthiti: ${STATUS_COPY[input.status]}.
Tathya:
${JSON.stringify({ sanket: s.level.label, gun: `${s.gun.total}/36`, unke_mann_me: s.feel, doori_ki_wajah: s.causes, kya_karein: s.act, anukool_samay: s.timing, aadhar: s.basisNote }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sawal ka imaandar, narm jawab, dono ke naam ke saath",
 "feelings": "2 vakya: ${p} ke mann ki sthiti, tathyon ke aadhar par",
 "cause": "2 vakya: doori ki asli wajah aasan bhasha me",
 "advice": "3 vakya: ab kya karein aur kab, aur khud ka khayal rakhne ki ek baat"}`,
    800
  );
  const pick = (key) => {
    const v = ai ? String(ai[key] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[key];
  };
  return { summary: pick("summary"), feelings: pick("feelings"), cause: pick("cause"), advice: pick("advice"), ai: !!ai };
}
function wapasView(row) {
  const { input, facts: f } = row;
  const common = {
    id: row.id,
    type: "wapas",
    paid: row.paid,
    price: ASTRO_PRICES.wapas,
    selfName: firstName(input.self.name),
    partnerName: firstName(input.partner.name),
    status: input.status,
    gunTotal: f.milan.milan.total,
    gunBand: BAND_COPY[f.milan.band].label,
    self: { moonRashi: f.milan.self.moonRashi, nakshatra: f.milan.self.nakshatra },
    partner: { moonRashi: f.milan.partner.moonRashi, nakshatra: f.milan.partner.nakshatra },
    basisNote: BASIS_NOTE[f.milan.partner.basis]
  };
  if (!row.paid) return common;
  return { ...common, sections: wapasSections(input, f), narrative: row.narrative };
}
function buildBusinessFacts(input) {
  const chart = computeChart(input);
  return { kind: "business", chart: chartSummary(chart), biz: analyseBusiness(chart) };
}
var PLANET_BIZ = {
  Sun: { field: "Sarkari kaam, dawai aur sona-chandi", ideas: [[1, "Online form aur sarkari seva kendra (CSC) ka kaam"], [2, "Medical store ya generic dawai ki dukan"], [2, "Sarkari daftar/school me saman supply ka chhota theka"], [3, "Artificial ya chandi ki jewellery ki dukan"], [4, "Sarkari thekedari ya gas/petrol agency"]] },
  Moon: { field: "Doodh, khana-peena aur rozmarra ka saman", ideas: [[1, "Doodh, dahi, paneer ki ghar-ghar supply"], [1, "Chai-nashta ya tiffin seva"], [2, "Kirana ya general store"], [3, "Dairy, dhaba ya chhota restaurant"], [4, "Packaged paani ya food processing unit"]] },
  Mars: { field: "Zameen, nirman, hardware aur bijli ka kaam", ideas: [[1, "Bijli, plumbing ya repair ki seva"], [2, "Hardware ya bijli ke saman ki dukan"], [2, "Fast food ya tandoor ka thela/dukan"], [3, "Building material (cement, sariya) ki dukan"], [4, "Property dealing ya construction ka theka"]] },
  Mercury: { field: "Kharid-bikri, hisaab-kitab aur mobile/online kaam", ideas: [[1, "Online reselling (WhatsApp, Meesho) ya commission agent"], [1, "Mobile recharge, online form aur photocopy-print"], [2, "Mobile accessories ya stationery ki dukan"], [3, "Thok vyapar ya kisi company ki distribution agency"], [4, "Trading firm, super-stockist ya apna online brand"]] },
  Jupiter: { field: "Shiksha, salah aur dhan se juda kaam", ideas: [[1, "Ghar se tuition ya coaching"], [2, "Coaching centre ya computer class"], [2, "Bima, mutual fund ya loan ki agency"], [3, "Anaaj-dal ka thok kaam ya puja samagri ki dukan"], [4, "School, finance firm ya consultancy"]] },
  Venus: { field: "Kapda, shringar, sajawat aur mithai", ideas: [[1, "Ghar se boutique-silai ya mehndi-makeup seva"], [2, "Readymade kapde ya cosmetic-gift ki dukan"], [2, "Beauty parlour ya salon"], [3, "Mithai, bakery ya shaadi decoration ka kaam"], [4, "Garment showroom, jewellery ya banquet/event ka kaam"]] },
  Saturn: { field: "Loha, tel, transport aur kheti ke saman ka kaam", ideas: [[1, "Kabaad (scrap) ya purane saman ki kharid-bikri"], [2, "Auto parts, tyre ya lubricant ki dukan"], [2, "Khad-beej aur kheti ke auzaar ki dukan"], [3, "Loading gaadi (transport) ya labour contracting"], [4, "Loha/plastic ki factory, godown ya cold storage"]] },
  Rahu: { field: "Online, electronics aur bahar ke maal ka kaam", ideas: [[1, "Social media, video ya online marketing ki seva"], [2, "Mobile-computer repair aur purane phone ki kharid-bikri"], [2, "CCTV, solar ya electronics ki dukan"], [3, "Import ka maal (khilone, gadgets) ya travel agency"], [4, "Import-export ya technology ka vyapar"]] }
};
var PLANET_LUCK = {
  Sun: { day: "Ravivar", colour: "Kesariya ya laal", direction: "Purab (East)" },
  Moon: { day: "Somvar", colour: "Safed ya chandi", direction: "Uttar-Paschim (North-West)" },
  Mars: { day: "Mangalvar", colour: "Laal", direction: "Dakshin (South)" },
  Mercury: { day: "Budhvar", colour: "Hara", direction: "Uttar (North)" },
  Jupiter: { day: "Guruvar", colour: "Peela", direction: "Uttar-Purab (North-East)" },
  Venus: { day: "Shukravar", colour: "Safed ya gulabi", direction: "Dakshin-Purab (South-East)" },
  Saturn: { day: "Shanivar", colour: "Neela", direction: "Paschim (West)" },
  Rahu: { day: "Shanivar", colour: "Slaty neela", direction: "Dakshin-Paschim (South-West)" }
};
var BIZ_LEVEL = {
  prabal: { label: "Vyapar ke prabal yog", hi: "\u0935\u094D\u092F\u093E\u092A\u093E\u0930 \u0915\u0947 \u092A\u094D\u0930\u092C\u0932 \u092F\u094B\u0917", line: "Aapki kundli apna kaam karne walon ki hai. Sahi kshetra aur sahi samay par shuruaat aapko naukri se aage le ja sakti hai." },
  mishrit: { label: "Vyapar aur naukri dono ke yog", hi: "\u092E\u093F\u0936\u094D\u0930\u093F\u0924 \u092F\u094B\u0917", line: "Aapke liye sabse surakshit raasta hai: pehle chhote star par ya side me shuru karein, jamne par poora samay dein." },
  seva: { label: "Seva kshetra zyada anukool", hi: "\u0938\u0947\u0935\u093E \u0915\u094D\u0937\u0947\u0924\u094D\u0930 \u0905\u0928\u0941\u0915\u0942\u0932", line: "Aapki kundli me naukri ya seva wale kaam ke yog zyada majboot hain. Vyapar karna ho to kam poonji aur sajhedari ke saath karein." }
};
var BUDGET_COPY = { 1: "\u20B950,000 tak", 2: "\u20B950,000 se \u20B92 lakh", 3: "\u20B92 se \u20B910 lakh", 4: "\u20B910 lakh se zyada" };
var PARTNER_COPY = {
  solo: { title: "Akele karna behtar", text: "Aapke saptam bhaav ki sthiti sajhedari me vivaad ke sanket deti hai. Malikana haq apne paas rakhein, madad ke liye karmchari rakhein." },
  partner: { title: "Sajhedari shubh hai", text: "Saptam bhaav majboot hai. Bharosemand partner ke saath kaam tezi se badhega. Hissedari aur zimmedari likhit me rakhein." },
  family: { title: "Parivar ke saath karein", text: "Bahar ke partner ki jagah bhai, jeevansathi ya parivar ke kisi sadasya ko saath lena zyada shubh rahega." }
};
var SITUATION_TIP = {
  naukri: "Naukri turant na chhodein. Pehle 3-6 mahine side me shuru karke kamai dekhein.",
  business: "Jo kaam chal raha hai use band karne ki jagah, neeche diye kshetra ka ek saman/seva usi me jodkar dekhein.",
  berozgar: "Sabse kam poonji wale vikalp se shuru karein, taaki jokhim kam rahe aur anubhav mile.",
  student: "Padhai ke saath chhote star par shuru karein. Pehla lakshya kamai nahi, seekhna rakhein."
};
function businessSections(input, f) {
  const b = f.biz;
  const rulers = b.rulers.filter((p) => PLANET_BIZ[p]);
  const top = rulers[0] ?? "Mercury";
  const ideas = [];
  for (const p of rulers) {
    const fit = PLANET_BIZ[p].ideas.filter(([tier]) => tier <= input.budget).sort((x, y) => y[0] - x[0]).slice(0, 2);
    for (const [tier, text] of fit) ideas.push({ text, planet: PLANET_HINGLISH[p], field: PLANET_BIZ[p].field, budget: BUDGET_COPY[tier] });
  }
  const luck = PLANET_LUCK[top];
  return {
    level: BIZ_LEVEL[b.level],
    meter: b.level === "prabal" ? 3 : b.level === "mishrit" ? 2 : 1,
    reasons: b.reasons,
    fields: rulers.map((p) => ({ planet: PLANET_HINGLISH[p], field: PLANET_BIZ[p].field })),
    ideas: ideas.slice(0, 6),
    budget: BUDGET_COPY[input.budget],
    partnership: PARTNER_COPY[b.partnership],
    timing: {
      start: `${monthYear2(b.startWindow.start)} se ${monthYear2(b.startWindow.end)}`,
      dasha: `${PLANET_HINGLISH[b.startWindow.md]} mahadasha, ${PLANET_HINGLISH[b.startWindow.ad]} antardasha`,
      next: b.nextWindow ? `${monthYear2(b.nextWindow.start)} se ${monthYear2(b.nextWindow.end)}` : null
    },
    name: { letters: b.nameLetters, note: "Dukan ya business ka naam in aksharon se rakhna shubh maana jaata hai." },
    luck,
    cautions: b.cautions,
    tip: SITUATION_TIP[input.situation],
    snapshot: [
      { label: "Lagna", value: f.chart.lagna ?? "Chandra lagna (janm samay nahi tha)" },
      { label: "Dasham bhaav (karm)", value: `${RASHI[b.tenthSign].en} rashi` },
      { label: "Dashamesh", value: `${PLANET_HINGLISH[b.tenthLord]}, ${b.tenthLordHouse}ve bhaav me` },
      { label: "Sabse prabhavi graha", value: PLANET_HINGLISH[top] }
    ]
  };
}
async function businessNarrative(input, f) {
  const s = businessSections(input, f);
  const a = firstName(input.name);
  const fallback = {
    summary: `${a} ji, aapki kundli me ${s.level.label.toLowerCase()} hain. Aapke liye sabse anukool kshetra hai: ${s.fields[0]?.field.toLowerCase()}. ${s.level.line}`,
    why: `Aapke dasham bhaav (karm) me ${RASHI[f.biz.tenthSign].en} rashi hai aur uske swami ${PLANET_HINGLISH[f.biz.tenthLord]} ${f.biz.tenthLordHouse}ve bhaav me hain. Yahi aapke kaam ki disha tay karte hain.`,
    how: `Shuruaat ke liye sabse shubh samay ${s.timing.start} hai. Usse pehle bazaar ko chhote star par parakh lein: kaun kharidega, kitne me, aur kahan se maal aayega.`,
    caution: `${s.cautions[0]}. ${s.partnership.title}: ${s.partnership.text}`
  };
  const ai = await generateJson(
    `Tum ek anubhavi Vedic jyotishi ho jo chhote sheher ke logon ko vyapar ki salah dete ho. ${TONE} Kamai ki koi rakam ya guarantee mat do. Salah vyavaharik aur zameeni rakho.`,
    `${a} (${input.gender === "male" ? "purush" : "mahila"}), abhi: ${input.situation}, poonji: ${s.budget}.
Tathya:
${JSON.stringify({ yog: s.level.label, karan: s.reasons, anukool_kshetra: s.fields, sujhaav: s.ideas.map((i) => i.text), sajhedari: s.partnership.title, shubh_samay: s.timing, savdhani: s.cautions, salah: s.tip }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sabse zaroori nishkarsh, naam lekar, sabse anukool kshetra ke saath",
 "why": "2 vakya: kundli ke kaun se yog yeh bata rahe hain, aasan bhasha me",
 "how": "3 vakya: is poonji aur sthiti me pehla kadam kya ho, aur kab",
 "caution": "2 vakya: kis galti se bachna hai"}`,
    800
  );
  const pick = (key) => {
    const v = ai ? String(ai[key] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[key];
  };
  return { summary: pick("summary"), why: pick("why"), how: pick("how"), caution: pick("caution"), ai: !!ai };
}
function businessView(row) {
  const { input, facts: f } = row;
  const s = businessSections(input, f);
  const common = {
    id: row.id,
    type: "business",
    paid: row.paid,
    price: ASTRO_PRICES.business,
    name: firstName(input.name),
    chart: f.chart,
    level: s.level,
    meter: s.meter,
    budget: s.budget
  };
  if (!row.paid) {
    return { ...common, topField: s.fields[0], ideaCount: s.ideas.length, letterCount: s.name.letters.length };
  }
  return { ...common, sections: s, narrative: row.narrative };
}

// server/services/astro/store.ts
import { createClient as createClient5 } from "@supabase/supabase-js";
var admin = () => {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return createClient5(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};
var COLS = "id, report_type, device_id, input, facts, narrative, palm, has_portrait, paid, payment_id, price_rupees, created_at";
async function insertReport(row) {
  const { data, error } = await admin().from("astro_reports").insert(row).select(COLS).single();
  if (error) throw error;
  return data;
}
async function getReport(id) {
  const { data, error } = await admin().from("astro_reports").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}
async function updateReport(id, patch) {
  const { error } = await admin().from("astro_reports").update({ ...patch, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id);
  if (error) throw error;
}
async function getPortrait(id) {
  const { data, error } = await admin().from("astro_reports").select("portrait").eq("id", id).maybeSingle();
  if (error) throw error;
  return data?.portrait ?? null;
}
async function findSuccessfulPayment(reportId) {
  const { data, error } = await admin().from("payment_attempts").select("id").eq("status", "success").eq("metadata->>astro_report_id", reportId).limit(1);
  if (error) throw error;
  return data?.[0]?.id ? String(data[0].id) : null;
}
async function findOpenPayments(reportId) {
  const since = new Date(Date.now() - 3 * 864e5).toISOString();
  const { data, error } = await admin().from("payment_attempts").select("id, gateway_order_id").in("status", ["pending", "cancelled"]).eq("metadata->>astro_report_id", reportId).not("gateway_order_id", "is", null).gte("created_at", since).order("created_at", { ascending: false }).limit(3);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: String(r.id), gateway_order_id: String(r.gateway_order_id) }));
}

// server/astroRoutes.ts
var dob = z2.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const y = Number(v.slice(0, 4));
  return y >= 1930 && new Date(v).getTime() < Date.now();
}, "Invalid date of birth");
var tob = z2.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
var personName = z2.string().trim().min(2).max(60);
var selfSchema = z2.object({
  name: personName,
  gender: z2.enum(["male", "female"]),
  dob,
  tob: tob.nullable().optional(),
  place: z2.string().trim().min(2).max(80)
});
function view(row) {
  const r = row;
  const v = (() => {
    switch (row.report_type) {
      case "shaadi":
        return shaadiView(r);
      case "milan":
        return milanView(r);
      case "wapas":
        return wapasView(r);
      case "business":
        return businessView(r);
    }
  })();
  return { ...v, price: priceOfReport(row.report_type, row.price_rupees) };
}
async function paidRazorpayPayment(orderId) {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6e3);
  try {
    const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}/payments`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
      signal: ctrl.signal
    });
    if (!res.ok) return null;
    const data = await res.json();
    const paid = data.items?.find((p) => p.status === "captured" || p.status === "authorized");
    return paid?.id ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
async function reconcileWithRazorpay(row, req) {
  const open = await findOpenPayments(row.id);
  for (const p of open) {
    const gatewayPaymentId = await paidRazorpayPayment(p.gateway_order_id);
    if (!gatewayPaymentId) continue;
    const result = await completePaymentSuccess({
      paymentId: p.id,
      paymentGateway: PAYMENT_GATEWAY_RAZORPAY,
      gatewayOrderId: p.gateway_order_id,
      gatewayPaymentId
    });
    console.log(`[astro] reconciled payment ${p.id} order=${p.gateway_order_id} report=${row.id}`);
    const purchase = "purchase" in result ? result.purchase : null;
    if (purchase && req) {
      await sendMetaConversionEvent({
        eventName: "Purchase",
        eventId: metaPurchaseEventId(p.gateway_order_id),
        context: metaContextFromRequest(req, null),
        deviceId: purchase.device_id,
        phoneDigits: purchase.phone_digits,
        customData: {
          value: purchase.amount_rupees,
          currency: "INR",
          content_ids: [p.gateway_order_id],
          content_type: "product",
          product_type: purchase.product_type
        }
      }).catch((err) => console.error("[astro] Meta purchase after reconcile failed:", err));
    }
    return p.id;
  }
  return null;
}
function writeNarrative(row) {
  const input = row.input, facts = row.facts;
  switch (row.report_type) {
    case "shaadi":
      return shaadiNarrative(input, facts, row.palm ?? null);
    case "milan":
      return milanNarrative(input, facts);
    case "wapas":
      return wapasNarrative(input, facts);
    case "business":
      return businessNarrative(input, facts);
  }
}
async function unlockIfPaid(row, req) {
  if (!row.paid) {
    let paymentId = await findSuccessfulPayment(row.id);
    if (!paymentId) {
      try {
        paymentId = await reconcileWithRazorpay(row, req);
      } catch (err) {
        console.error("[astro] Razorpay reconcile failed:", err);
      }
    }
    if (!paymentId) return row;
    row = { ...row, paid: true, payment_id: paymentId };
    await updateReport(row.id, { paid: true, payment_id: paymentId });
  }
  if (!row.narrative) {
    const narrative = await writeNarrative(row);
    row = { ...row, narrative };
    if (narrative.ai) await updateReport(row.id, { narrative });
  }
  return row;
}
var partnerSchema = z2.object({
  name: personName,
  dob: dob.nullable().optional(),
  tob: tob.nullable().optional(),
  place: z2.string().trim().max(80).nullable().optional()
});
var partnerInput = (p) => ({
  name: p.name,
  dob: p.dob ?? null,
  tob: p.dob ? p.tob ?? null : null,
  place: p.place || null
});
function registerAstroRoutes(app2) {
  app2.post("/api/astro/shaadi/preview", async (req, res) => {
    try {
      const body = selfSchema.extend({
        device_id: z2.string().min(1).max(120),
        palm_image: z2.string().startsWith("data:image/").max(14e5).optional()
      }).parse(req.body);
      const input = {
        name: body.name,
        gender: body.gender,
        dob: body.dob,
        tob: body.tob ?? null,
        place: body.place
      };
      const facts = buildShaadiFacts(input);
      const palm = body.palm_image ? await readPalm(body.palm_image) : null;
      const row = await insertReport({ report_type: "shaadi", device_id: body.device_id, input, facts, palm, price_rupees: priceForNewReport("shaadi", body.device_id) });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z2.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      console.error("[astro] shaadi preview failed:", error);
      res.status(500).json({ message: "Report nahi ban payi. Kripya dobara koshish karein." });
    }
  });
  app2.post("/api/astro/milan/preview", async (req, res) => {
    try {
      const body = z2.object({
        device_id: z2.string().min(1).max(120),
        self: selfSchema,
        partner: z2.object({
          name: personName,
          dob: dob.nullable().optional(),
          tob: tob.nullable().optional(),
          place: z2.string().trim().max(80).nullable().optional()
        }),
        question: z2.enum(["shaadi", "wapas", "rishta"]).default("shaadi")
      }).parse(req.body);
      const input = {
        self: { ...body.self, tob: body.self.tob ?? null },
        partner: {
          name: body.partner.name,
          dob: body.partner.dob ?? null,
          tob: body.partner.dob ? body.partner.tob ?? null : null,
          place: body.partner.place || null
        },
        question: body.question
      };
      const facts = buildMilanFacts(input);
      const row = await insertReport({ report_type: "milan", device_id: body.device_id, input, facts, palm: null, price_rupees: priceForNewReport("milan", body.device_id) });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z2.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof MilanInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] milan preview failed:", error);
      res.status(500).json({ message: "Milan nahi ban paya. Kripya dobara koshish karein." });
    }
  });
  app2.post("/api/astro/wapas/preview", async (req, res) => {
    try {
      const body = z2.object({
        device_id: z2.string().min(1).max(120),
        self: selfSchema,
        partner: partnerSchema,
        status: z2.enum(["breakup", "no_contact", "fight", "separated"]).default("no_contact")
      }).parse(req.body);
      const input = { self: { ...body.self, tob: body.self.tob ?? null }, partner: partnerInput(body.partner), status: body.status };
      const facts = buildWapasFacts(input);
      const row = await insertReport({ report_type: "wapas", device_id: body.device_id, input, facts, palm: null, price_rupees: priceForNewReport("wapas", body.device_id) });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z2.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof MilanInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] wapas preview failed:", error);
      res.status(500).json({ message: "Report nahi ban payi. Kripya dobara koshish karein." });
    }
  });
  app2.post("/api/astro/business/preview", async (req, res) => {
    try {
      const body = selfSchema.extend({
        device_id: z2.string().min(1).max(120),
        situation: z2.enum(["naukri", "business", "berozgar", "student"]),
        budget: z2.union([z2.literal(1), z2.literal(2), z2.literal(3), z2.literal(4)])
      }).parse(req.body);
      const input = {
        name: body.name,
        gender: body.gender,
        dob: body.dob,
        tob: body.tob ?? null,
        place: body.place,
        situation: body.situation,
        budget: body.budget
      };
      const facts = buildBusinessFacts(input);
      const row = await insertReport({ report_type: "business", device_id: body.device_id, input, facts, palm: null, price_rupees: priceForNewReport("business", body.device_id) });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z2.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      console.error("[astro] business preview failed:", error);
      res.status(500).json({ message: "Report nahi ban payi. Kripya dobara koshish karein." });
    }
  });
  app2.get("/api/astro/report/:id", async (req, res) => {
    try {
      const id = z2.string().uuid().parse(req.params.id);
      let row = await getReport(id);
      if (!row) return res.status(404).json({ message: "Report nahi mili" });
      row = await unlockIfPaid(row, req);
      res.json(view(row));
    } catch (error) {
      if (error instanceof z2.ZodError) return res.status(404).json({ message: "Report nahi mili" });
      console.error("[astro] report fetch failed:", error);
      res.status(500).json({ message: "Report load nahi ho payi" });
    }
  });
  app2.post("/api/astro/report/:id/portrait", async (req, res) => {
    try {
      const id = z2.string().uuid().parse(req.params.id);
      const row = await getReport(id);
      if (!row || row.report_type !== "shaadi") return res.status(404).json({ ready: false });
      if (!row.paid) return res.status(402).json({ ready: false });
      if (row.has_portrait) return res.json({ ready: true });
      const image = await generateImage(portraitPrompt(row.input, row.facts));
      if (!image) return res.json({ ready: false });
      await updateReport(id, { portrait: image, has_portrait: true });
      res.json({ ready: true });
    } catch (error) {
      console.error("[astro] portrait failed:", error);
      res.status(500).json({ ready: false });
    }
  });
  app2.get("/api/astro/report/:id/portrait", async (req, res) => {
    try {
      const id = z2.string().uuid().parse(req.params.id);
      const row = await getReport(id);
      if (!row?.paid || !row.has_portrait) return res.status(404).end();
      const dataUrl = await getPortrait(id);
      const match = dataUrl?.match(/^data:(image\/[a-z+]+);base64,([\s\S]+)$/);
      if (!match) return res.status(404).end();
      res.setHeader("Content-Type", match[1]);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.end(Buffer.from(match[2], "base64"));
    } catch {
      res.status(404).end();
    }
  });
}

// shared/appEvents.ts
var APP_EVENT_NAMES = [
  "profile_created",
  "chat_started",
  "paywall_triggered",
  "payment_attempted",
  "purchase",
  /** /shaadi and /milan report funnel (properties.report = "shaadi" | "milan"). */
  "astro_landing",
  "astro_form_submitted",
  "astro_preview_viewed",
  "astro_report_viewed",
  /** Self-harm message detected; logged to our DB only, never sent to Meta. */
  "crisis_detected"
];

// server/routes.ts
var ADVICE_CHAT_IDS = /* @__PURE__ */ new Set([
  "doctor",
  "kundli",
  "parenting",
  "finance",
  "career",
  "krishna",
  "english",
  "relationship-advice"
]);
var kundliBirthSchema = z3.object({
  name: z3.string().min(1).max(120),
  gender: z3.enum(["male", "female", "other"]),
  dateOfBirth: z3.string().min(1),
  /** Empty when the person does not know their birth time. */
  timeOfBirth: z3.string().max(5),
  cityOfBirth: z3.string().min(1).max(200),
  lat: z3.number().min(-90).max(90).optional(),
  lon: z3.number().min(-180).max(180).optional()
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
  const ownerSchema = z3.object({
    userId: z3.string().nullable().optional(),
    anonymousUserId: z3.string().nullable().optional()
  });
  app2.post("/api/chat/messages", async (req, res) => {
    try {
      const chatMessageSchema = ownerSchema.extend({
        companionId: z3.string().min(1),
        companionName: z3.string().nullable().optional(),
        companionAvatar: z3.string().nullable().optional(),
        userName: z3.string().nullable().optional(),
        userAge: z3.number().nullable().optional(),
        role: z3.enum(["user", "assistant"]),
        content: z3.string().min(1),
        language: z3.enum(["hindi", "english"]).nullable().optional(),
        photoUrl: z3.string().nullable().optional(),
        isPremium: z3.boolean().nullable().optional(),
        contextInfo: z3.string().nullable().optional(),
        metadata: z3.record(z3.unknown()).optional()
      });
      const data = chatMessageSchema.parse(req.body);
      const message = await saveChatMessageToSupabase(data);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error saving chat message:", error);
      if (error instanceof z3.ZodError) {
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
  app2.patch("/api/chat/messages", async (req, res) => {
    try {
      const patchSchema = ownerSchema.extend({
        messageId: z3.string().uuid(),
        content: z3.string().min(1)
      });
      const data = patchSchema.parse(req.body);
      const message = await updateChatMessageContentInSupabase(
        data.messageId,
        data.content,
        data.userId,
        data.anonymousUserId
      );
      res.json(message);
    } catch (error) {
      console.error("Error updating chat message:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid chat message update", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update chat message" });
    }
  });
  app2.get("/api/chat/messages", async (req, res) => {
    try {
      const query = ownerSchema.extend({
        companionId: z3.string().min(1)
      }).parse(req.query);
      const messages = await getChatMessagesFromSupabase(
        query.companionId,
        query.userId,
        query.anonymousUserId
      );
      res.json(messages);
    } catch (error) {
      console.error("Error loading chat messages:", error);
      if (error instanceof z3.ZodError) {
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
      const bodySchema = z3.object({
        text: z3.string().min(1),
        voiceProvider: z3.enum(["google", "edge"]).optional().default("google"),
        voiceName: z3.string().optional()
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
      if (error instanceof z3.ZodError) {
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
      const query = z3.object({
        device_id: z3.string().min(1),
        phone_number: z3.string().optional()
      }).parse(req.query);
      const phoneHint = query.phone_number?.replace(/\D/g, "").slice(-10) || null;
      const details = await getKundliBirthForProfile(query.device_id, phoneHint);
      res.json({ kundli_birth_details: details });
    } catch (error) {
      if (error instanceof z3.ZodError) {
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
      const bodySchema = z3.object({
        device_id: z3.string().min(1),
        phone_number: z3.string().optional().nullable(),
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
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      res.status(500).json({ message: "Failed to save kundli birth details", error: msg });
    }
  });
  app2.post("/api/kundli/chart", async (req, res) => {
    try {
      const data = z3.object({ kundli_birth_details: kundliBirthSchema }).parse(req.body);
      const reading = await buildKundliReading(data.kundli_birth_details);
      if (!reading) {
        return res.status(422).json({ message: "Birth date is not valid" });
      }
      res.json({ summary: reading.summary });
    } catch (error) {
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      console.error("[kundli] chart calculation failed:", error);
      res.status(500).json({ message: "Failed to calculate kundli" });
    }
  });
  app2.post("/api/profiles/upsert", async (req, res) => {
    try {
      const bodySchema = z3.object({
        device_id: z3.string().min(1),
        phone_number: z3.string().optional().nullable(),
        name: z3.string().optional().nullable()
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
      if (error instanceof z3.ZodError) {
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
  app2.post("/api/events", async (req, res) => {
    try {
      const bodySchema = z3.object({
        event_name: z3.enum(APP_EVENT_NAMES),
        device_id: z3.string().min(1),
        user_id: z3.string().optional().nullable(),
        phone_number: z3.string().optional().nullable(),
        properties: z3.record(z3.unknown()).optional(),
        meta: metaBrowserContextSchema.optional()
      });
      const data = bodySchema.parse(req.body);
      const row = await insertAppEventRow({
        eventName: data.event_name,
        deviceId: data.device_id,
        userId: data.user_id,
        phoneNumber: data.phone_number,
        properties: data.properties
      });
      if (META_CAPI_FORWARDED_EVENTS.has(data.event_name) && data.meta?.event_id) {
        await sendMetaConversionEvent({
          eventName: data.event_name,
          eventId: data.meta.event_id,
          context: metaContextFromRequest(req, data.meta),
          deviceId: data.device_id,
          phoneDigits: data.phone_number,
          customData: metaCustomDataFromProperties(data.properties)
        });
      }
      res.status(201).json(row);
    } catch (error) {
      console.error("Error logging app event:", error);
      if (error instanceof z3.ZodError) {
        return res.status(400).json({ message: "Invalid event payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Event logging unavailable" });
      }
      if (isMissingDbRelation(error) && msg.toLowerCase().includes("app_events")) {
        return res.status(503).json({
          message: "app_events table missing",
          error: msg,
          hint: "Run migrations/0007_app_events.sql in your Supabase SQL editor."
        });
      }
      res.status(500).json({ message: "Failed to log event", error: msg });
    }
  });
  app2.post("/api/billing/payment-attempt", async (req, res) => {
    try {
      const bodySchema = z3.object({
        device_id: z3.string().min(1),
        phone_number: z3.string().min(10),
        amount_rupees: z3.number().positive(),
        companion_id: z3.string().optional().nullable(),
        rate_note: z3.string().optional().nullable(),
        metadata: z3.record(z3.unknown()).optional()
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
      if (error instanceof z3.ZodError) {
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
      const query = z3.object({
        device_id: z3.string().min(1),
        phone_number: z3.string().optional()
      }).parse(req.query);
      const phoneHint = query.phone_number?.replace(/\D/g, "").slice(-10) || null;
      const state = await getBillingState(query.device_id, phoneHint);
      res.json(state);
    } catch (error) {
      if (error instanceof z3.ZodError) {
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
      const params = z3.object({ paymentId: z3.string().uuid() }).parse(req.params);
      const row = await markPaymentCancelled(params.paymentId);
      res.json({ cancelled: !!row });
    } catch (error) {
      if (error instanceof z3.ZodError) {
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
      const billingSchema = z3.object({
        device_id: z3.string().min(1),
        // Astro reports check out without a phone step; every other product needs one.
        phone_number: z3.string(),
        product_type: z3.enum([
          "chat_recharge",
          "photo_pack",
          "voice_chat",
          "premium_photo",
          ...ASTRO_PRODUCT_TYPES,
          "other"
        ]),
        companion_id: z3.string().optional().nullable(),
        rate_note: z3.string().optional().nullable(),
        metadata: z3.record(z3.unknown()).optional()
      });
      const schema = z3.object({
        amount_rupees: z3.number().positive(),
        receipt: z3.string().min(3).max(40).optional(),
        notes: z3.record(z3.string()).optional(),
        billing: billingSchema
      });
      const body = schema.parse(req.body);
      const astroType = astroTypeFromProduct(body.billing.product_type);
      if (astroType) {
        const reportId = z3.string().uuid().safeParse(body.billing.metadata?.astro_report_id);
        const report = reportId.success ? await getReport(reportId.data) : null;
        if (!report || report.report_type !== astroType) {
          return res.status(400).json({ error: "Report not found for this payment" });
        }
        body.amount_rupees = report.price_rupees ?? ASTRO_PRICES[astroType].rupees;
        body.billing.companion_id = null;
      } else if (body.billing.phone_number.replace(/\D/g, "").length < 10) {
        return res.status(400).json({ message: "Invalid payload", error: "phone_number is required" });
      }
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
      if (error instanceof z3.ZodError) {
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
      const schema = z3.object({
        razorpay_order_id: z3.string().min(1),
        razorpay_payment_id: z3.string().min(1),
        razorpay_signature: z3.string().min(1),
        payment_id: z3.string().uuid().optional(),
        meta: metaBrowserContextSchema.optional()
      });
      const body = schema.parse(req.body);
      const { keySecret } = getRazorpayCredentials();
      const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
      const expected = crypto2.createHmac("sha256", keySecret).update(payload).digest("hex");
      let verified = false;
      try {
        verified = expected.length === body.razorpay_signature.length && crypto2.timingSafeEqual(
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
      const { purchase, ...billing } = "purchase" in result ? result : { ...result, purchase: null };
      if (purchase && body.meta) {
        await sendMetaConversionEvent({
          eventName: "Purchase",
          eventId: metaPurchaseEventId(body.razorpay_order_id),
          context: metaContextFromRequest(req, body.meta),
          deviceId: purchase.device_id,
          phoneDigits: purchase.phone_digits,
          customData: {
            value: purchase.amount_rupees,
            currency: "INR",
            content_ids: [body.razorpay_order_id],
            content_type: "product",
            product_type: purchase.product_type,
            ...purchase.companion_id ? { companion_id: purchase.companion_id } : {}
          }
        });
      }
      return res.json({ success: true, ...billing });
    } catch (error) {
      if (error instanceof z3.ZodError) {
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
      if (error instanceof z3.ZodError) {
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
  app2.get("/api/messages", (_req, res) => {
    res.json([]);
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
      const conversationTurnSchema = z3.object({
        role: z3.enum(["user", "assistant"]),
        content: z3.string()
      });
      const messageSchema = z3.object({
        content: z3.string().min(1),
        language: z3.enum(["hindi", "english"]).default("hindi"),
        companionId: z3.string().default("priya"),
        companionName: z3.string().optional(),
        userName: z3.string().optional(),
        // Optional photo fields for premium messages
        photoUrl: z3.string().optional(),
        isPremium: z3.boolean().optional(),
        skipUserMessage: z3.boolean().optional(),
        role: z3.enum(["user", "assistant"]).optional(),
        // Add role to schema
        messageCount: z3.number().optional(),
        // Add message count to schema
        deviceId: z3.string().optional(),
        phoneNumber: z3.string().optional(),
        /** Same owner the client uses to save chat history (for counting free messages). */
        chatOwner: z3.object({
          userId: z3.string().nullable().optional(),
          anonymousUserId: z3.string().nullable().optional()
        }).optional(),
        isAuthenticated: z3.boolean().optional(),
        // Add auth state to schema
        /** Prior turns from the client (required on serverless — seeded UI messages are not in MemStorage). */
        conversationHistory: z3.array(conversationTurnSchema).max(40).optional(),
        /** Kundli chat: birth form details, sent with every message so the AI always has them. */
        kundliBirthDetails: kundliBirthSchema.optional()
      });
      const validatedData = messageSchema.parse(req.body);
      if (isSelfHarmMessage(validatedData.content)) {
        if (validatedData.deviceId) {
          await insertAppEventRow({
            eventName: "crisis_detected",
            deviceId: validatedData.deviceId,
            properties: { companion_id: validatedData.companionId, source: "server" }
          }).catch((error) => console.error("[crisis] could not log event:", error));
        }
        const botMessage = await storage.createMessage({
          content: crisisSupportReply(validatedData.language),
          role: "assistant",
          companionId: validatedData.companionId
        });
        return res.status(201).json({ botMessage, crisis: true });
      }
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
      const isAdviceChat = ADVICE_CHAT_IDS.has(validatedData.companionId);
      if (!isAdviceChat && isAuthenticated && messageCount >= 10 && messageCount % 10 === 0) {
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
      const fromClient = validatedData.conversationHistory ?? [];
      const isFirstUserMessage = !fromClient.some((turn) => turn.role === "user");
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
        let conversationHistory = fromClient.slice(-40);
        if (isFirstUserMessage) {
          conversationHistory = filterWelcomeMessagesFromHistory(conversationHistory);
        }
        console.log("[DEBUG] Conversation history being sent to LLM:", conversationHistory);
        console.log("[DEBUG] Is first user message:", isFirstUserMessage);
        let walletCreditsAfter;
        if (validatedData.deviceId) {
          const phoneDigits = validatedData.phoneNumber?.replace(/\D/g, "").slice(-10) || "";
          const messageIndex = await resolveBillableMessageIndex({
            companionId: validatedData.companionId,
            clientIndex: messageCount,
            owner: validatedData.chatOwner ?? { anonymousUserId: validatedData.deviceId },
            currentContent: validatedData.content
          });
          const deduct = await deductChatMessageCredit({
            deviceId: validatedData.deviceId,
            phoneHint: phoneDigits || null,
            companionId: validatedData.companionId,
            messageIndex
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
        let kundliContext;
        if (validatedData.companionId === "kundli" && validatedData.kundliBirthDetails) {
          try {
            const reading = await buildKundliReading(validatedData.kundliBirthDetails);
            kundliContext = reading?.promptContext;
          } catch (error) {
            console.error("[kundli] chart calculation failed:", error);
          }
        }
        const responseContent = await generateResponse(
          validatedData.content,
          conversationHistory,
          validatedData.language,
          {
            companionId: validatedData.companionId,
            companionName: companionName || void 0,
            userName: userName || void 0,
            kundliContext
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
        const lowerError = errorMessage.toLowerCase();
        if (lowerError.includes("rate limit")) {
          const botMessage = await storage.createMessage({
            content: "I'm getting too many messages right now. Can you please wait a moment and try again?",
            role: "assistant",
            companionId: validatedData.companionId
          });
          return res.status(201).json({ userMessage, botMessage });
        }
        if (lowerError.includes("402") || lowerError.includes("more credits") || lowerError.includes("insufficient credits")) {
          const botMessage = await storage.createMessage({
            content: "Abhi main jawab nahi de pa raha \u2014 server par AI credits khatam ho gaye hain. Thodi der baad try karo.",
            role: "assistant",
            companionId: validatedData.companionId
          });
          return res.status(201).json({ userMessage, botMessage });
        }
        throw error;
      }
    } catch (error) {
      console.error("Error creating message:", error);
      if (error instanceof z3.ZodError) {
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
  registerAstroRoutes(app2);
  if (opts?.createHttpServer !== true) {
    return void 0;
  }
  const httpServer = createServer(app2);
  return httpServer;
}

// server/yobabyPay.ts
import crypto3 from "crypto";
import { createClient as createClient6 } from "@supabase/supabase-js";
var PRODUCTS = {
  pro_1m: { rupees: 29, label: "Pro \xB7 1 month", blurb: "every recipe and video for 1 month" },
  recipe_book: { rupees: 99, label: "Recipe book \xB7 PDF", blurb: "every recipe in one PDF to download" }
};
var productId = (v) => v === void 0 || v === "" ? "pro_1m" : Object.hasOwn(PRODUCTS, String(v)) ? String(v) : null;
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
var indianMobile = (v) => {
  const digits = String(v ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
};
var yobabyUrl = () => (process.env.YOBABY_URL?.trim() || "https://www.yobaby.in").replace(/\/+$/, "");
var backUrl = (status, product) => `${yobabyUrl()}/${status ? `?pay=${status}${product && Object.hasOwn(PRODUCTS, product) ? `&product=${product}` : ""}` : ""}`;
function getRazorpayCredentials2() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)");
  }
  return { keyId, keySecret };
}
var yobabyClient = null;
function yobabyDb() {
  const key = process.env.YOBABY_SUPABASE_SECRET_KEY?.trim();
  if (!key) throw new Error("YOBABY_SUPABASE_SECRET_KEY is not set");
  yobabyClient ??= createClient6(
    process.env.YOBABY_SUPABASE_URL?.trim() || "https://waoctzqtrtckqdztvhxx.supabase.co",
    key,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
  return yobabyClient;
}
async function razorpay(method, apiPath, body) {
  const { keyId, keySecret } = getRazorpayCredentials2();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const upstream = await fetch(`https://api.razorpay.com/v1${apiPath}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      ...body ? { "Content-Type": "application/json" } : {}
    },
    body: body ? JSON.stringify(body) : void 0
  });
  const raw = await upstream.text();
  if (!upstream.ok) throw new Error(`Razorpay ${method} ${apiPath} ${upstream.status}: ${raw.slice(0, 400)}`);
  return JSON.parse(raw);
}
function validSignature(orderId, paymentId, signature) {
  const { keySecret } = getRazorpayCredentials2();
  const expected = crypto3.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return expected.length === signature.length && crypto3.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"));
}
function checkoutPage(options, id) {
  const { rupees, blurb } = PRODUCTS[id];
  const title = id === "recipe_book" ? "Little Bites recipe book" : "Little Bites Pro";
  const json = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const icon = `${yobabyUrl()}/icons/icon-192.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Little Bites \xB7 Payment</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #FFF9F2; color: #2B2118;
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { width: min(360px, calc(100% - 32px)); text-align: center; }
  img { width: 64px; height: 64px; border-radius: 16px; }
  h1 { margin: 12px 0 4px; font-size: 22px; }
  p { margin: 0 0 20px; color: #6B5E52; }
  button { width: 100%; padding: 14px; border: 0; border-radius: 14px; background: #FF6B57; color: #fff;
    font: inherit; font-weight: 700; cursor: pointer; }
  a { display: inline-block; margin-top: 16px; color: #6B5E52; }
  small { display: block; margin-top: 24px; color: #9A8C80; }
</style>
</head>
<body>
<main>
  <img src="${icon}" alt="">
  <h1>${title}</h1>
  <p>\u20B9${rupees} \xB7 ${blurb}</p>
  <button id="pay" type="button">Pay \u20B9${rupees}</button>
  <a href="${backUrl("cancelled", id)}">Back to Little Bites</a>
  <small>Secure payment by Razorpay</small>
</main>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = ${json(options)};
  options.modal = { ondismiss: function () { location.replace(${json(backUrl("cancelled", id))}); } };
  var checkout = null;
  function pay() {
    if (!window.Razorpay) return location.reload();
    checkout = checkout || new Razorpay(options);
    checkout.open();
  }
  document.getElementById("pay").addEventListener("click", pay);
  if (window.Razorpay) pay();
</script>
</body>
</html>`;
}
function registerYobabyPayRoutes(app2) {
  app2.get("/api/yb/checkout", async (req, res) => {
    const phone = indianMobile(req.query.phone);
    const uid = String(req.query.uid ?? "");
    const id = productId(req.query.product);
    if (!id) return res.redirect(303, backUrl("failed"));
    const product = PRODUCTS[id];
    try {
      yobabyDb();
      const { keyId } = getRazorpayCredentials2();
      const order = await razorpay("POST", "/orders", {
        amount: product.rupees * 100,
        currency: "INR",
        receipt: `YB_${Date.now().toString(36).toUpperCase()}`,
        notes: { site: "yobaby.in", product: id, ...phone ? { phone } : {}, ...UUID.test(uid) ? { uid } : {} }
      });
      const proto = String(req.get("x-forwarded-proto") || req.protocol).split(",")[0];
      res.set("Cache-Control", "no-store");
      res.type("html").send(
        checkoutPage(
          {
            key: keyId,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            name: "Little Bites",
            description: product.label,
            image: `${yobabyUrl()}/icons/icon-192.png`,
            ...phone ? { prefill: { contact: `+91${phone}` } } : {},
            // Hiding the other methods (rather than a UPI-only block) keeps Checkout's one-tap UPI sheet.
            config: {
              display: {
                hide: ["card", "netbanking", "wallet", "emi", "cardless_emi", "paylater"].map((method) => ({ method })),
                preferences: { show_default_blocks: true }
              }
            },
            callback_url: `${proto}://${req.get("host")}/api/yb/callback`,
            redirect: true,
            theme: { color: "#FF6B57" }
          },
          id
        )
      );
    } catch (error) {
      console.error("[yobaby-pay] checkout failed:", error);
      res.redirect(303, backUrl("failed", id));
    }
  });
  app2.post("/api/yb/callback", async (req, res) => {
    const body = req.body ?? {};
    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    if (!orderId || !paymentId || !signature) {
      console.warn("[yobaby-pay] payment failed:", body["error[code]"], body["error[description]"]);
      return res.redirect(303, backUrl("failed"));
    }
    let verified = false;
    try {
      verified = validSignature(orderId, paymentId, signature);
    } catch (error) {
      console.error("[yobaby-pay] signature check failed:", error);
    }
    if (!verified) {
      console.warn(`[yobaby-pay] invalid signature order=${orderId} payment=${paymentId}`);
      return res.redirect(303, backUrl("failed"));
    }
    try {
      const order = await razorpay("GET", `/orders/${encodeURIComponent(orderId)}`);
      const notes = Array.isArray(order.notes) ? {} : order.notes;
      if (notes.site !== "yobaby.in") {
        console.warn(`[yobaby-pay] order ${orderId} is not a yobaby.in order`);
        return res.redirect(303, backUrl("failed"));
      }
      const payment = await razorpay("GET", `/payments/${encodeURIComponent(paymentId)}`);
      const phone = indianMobile(payment.contact) ?? indianMobile(notes.phone);
      if (!phone) throw new Error(`no Indian mobile number on payment (contact=${payment.contact ?? "none"})`);
      const { data, error } = await yobabyDb().rpc("record_payment", {
        p_payment_id: paymentId,
        p_order_id: orderId,
        p_phone: phone,
        p_user_id: notes.uid || null,
        p_product: notes.product || "pro_1m",
        p_amount: order.amount / 100,
        p_currency: order.currency
      });
      if (error) throw error;
      console.log(`[yobaby-pay] paid order=${orderId} payment=${paymentId}`, data);
      res.redirect(303, backUrl("ok", notes.product));
    } catch (error) {
      console.error(`[yobaby-pay] PAID BUT NOT RECORDED order=${orderId} payment=${paymentId}:`, error);
      res.redirect(303, backUrl("pending"));
    }
  });
  app2.get("/api/yb/callback", (_req, res) => res.redirect(303, backUrl()));
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
  registerYobabyPayRoutes(app);
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
/*! Bundled license information:

astronomy-engine/esm/astronomy.js:
  (**
      @preserve
  
      Astronomy library for JavaScript (browser and Node.js).
      https://github.com/cosinekitty/astronomy
  
      MIT License
  
      Copyright (c) 2019-2023 Don Cross <cosinekitty@gmail.com>
  
      Permission is hereby granted, free of charge, to any person obtaining a copy
      of this software and associated documentation files (the "Software"), to deal
      in the Software without restriction, including without limitation the rights
      to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
      copies of the Software, and to permit persons to whom the Software is
      furnished to do so, subject to the following conditions:
  
      The above copyright notice and this permission notice shall be included in all
      copies or substantial portions of the Software.
  
      THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
      IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
      FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
      AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
      LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
      OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
      SOFTWARE.
  *)
  (**
   * @fileoverview Astronomy calculation library for browser scripting and Node.js.
   * @author Don Cross <cosinekitty@gmail.com>
   * @license MIT
   *)
*/
