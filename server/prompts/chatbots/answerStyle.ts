/**
 * Answer style shared by every advice chat (Kundli, Krishna, Doctor, Parenting, Finance,
 * Career, Relationship Advice). Added after the role prompt, so it wins on length and tone.
 *
 * Why: saved chats showed replies of 150-300 words full of bookish and technical words,
 * while people asked one-line questions ("meri shaadi kab hogi") and wanted the answer.
 */
export const SIMPLE_ANSWER_STYLE = `
HOW TO ANSWER (most important rule — this overrides anything above about length or style):

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
- A yes/no question starts with "Haan", "Nahi", or "Pakka nahi keh sakte" — then the reason.
- A "which one" question gets ONE clear pick, then the reason.
- If the question is unclear or too short to understand, ask one short clarifying question instead of guessing at length.
- Use their name rarely (not in every message). Never start two replies in a row the same way.
- Do not repeat what you already said earlier in this chat. If they ask the same thing again, answer in one or two fresh lines.
- Only if they clearly ask for detail ("detail me batao", "aur batao", "poora samjhao") may you go up to 130 words.
`;

const DEVANAGARI = /[ऀ-ॿ]/;
const HINDI_REQUEST = /hindi\s*(me|mein|mai|main|m)\b|in\s+hindi|हिंदी|हिन्दी/i;
const ENGLISH_REQUEST = /english\s*(me|mein|mai|main|m)\b|in\s+english|अंग्रेज़ी\s*में|अंग्रेजी\s*में|इंग्लिश\s*में/i;

type ReplyLanguage = "devanagari" | "roman" | "english";

/**
 * Which language/script to answer in. An explicit request ("hindi me batao") stays in
 * force for the rest of the chat; otherwise the reply follows the script the person typed.
 */
export function detectReplyLanguage(userMessage: string, earlierUserMessages: string[]): ReplyLanguage {
  const newestFirst = [userMessage, ...earlierUserMessages.slice().reverse()];

  for (const text of newestFirst) {
    if (ENGLISH_REQUEST.test(text)) return "english";
    if (HINDI_REQUEST.test(text)) return "devanagari";
  }

  // Follow the latest message that has enough letters to tell (skips "04/02/1998", "ok").
  for (const text of newestFirst) {
    if (DEVANAGARI.test(text)) return "devanagari";
    if ((text.match(/[a-z]/gi) ?? []).length >= 4) return "roman";
  }
  return "roman";
}

export function replyLanguageInstruction(language: ReplyLanguage): string {
  if (language === "devanagari") {
    return `LANGUAGE FOR THIS REPLY: Write only in simple Hindi in Devanagari script (हिंदी). Use everyday spoken Hindi, not shuddh or Sanskrit-heavy Hindi: शादी (not विवाह), ज़रूरी (not महत्वपूर्ण), मौका / चांस (not संभावना), हालत (not परिस्थिति), मुश्किल (not चुनौती), देखना (not विश्लेषण). Everyday English words written in Devanagari are fine (करियर, बिज़नेस, टेंशन, नौकरी). Do not mix in Roman-script words. Write numbers and years in ordinary digits (2027, not २०२७).`;
  }
  if (language === "english") {
    return `LANGUAGE FOR THIS REPLY: Write in simple, plain English. Short sentences, common words.`;
  }
  return `LANGUAGE FOR THIS REPLY: Write in simple Hinglish — everyday Hindi typed in English (Roman) letters, the way people text on WhatsApp. If their message is fully in English, reply in simple English instead. Do not use Devanagari script.`;
}

/** Short reminder placed right after the person's message, where the model follows it best. */
export function adviceReplyReminder(language: ReplyLanguage): string {
  const script =
    language === "devanagari"
      ? "केवल सरल हिंदी (देवनागरी) में लिखें"
      : language === "english"
        ? "Write in simple English"
        : "Simple Hinglish in Roman letters (or simple English if they wrote English)";
  return `[Reply rules: ${script}. First line = direct answer. 40-80 words. Everyday words, no jargon.]`;
}
