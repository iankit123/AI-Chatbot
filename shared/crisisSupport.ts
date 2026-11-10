/**
 * Suicide / self-harm safety. When a message matches, the app replies with the
 * Tele-MANAS helpline instead of the AI, never shows the paywall for it, and closes
 * the chat on that device.
 *
 * Patterns target intent to die or hurt oneself, not questions about death in general
 * (Kundli users often ask "maut kab hogi" or about "mrityu yog"; those must not match).
 * Romantic phrases like "tere liye jaan de dunga" are deliberately left out.
 */

export const CRISIS_HELPLINE = {
  name: "Tele-MANAS",
  number: "14416",
  emergencyNumber: "112",
} as const;

const SELF_HARM_PATTERNS: RegExp[] = [
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
  /(?:ज़हर|जहर)\s*खा/,
];

export function isSelfHarmMessage(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  return SELF_HARM_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function crisisSupportReply(language: "hindi" | "english"): string {
  const { name, number, emergencyNumber } = CRISIS_HELPLINE;
  if (language === "english") {
    return `What you're feeling sounds really heavy, and you don't have to go through it alone. Please call ${name} at ${number} now. It's free, open 24×7, and trained counsellors will listen in your language. If you're in danger right now, call ${emergencyNumber} or go to someone you trust.`;
  }
  return `आप जो महसूस कर रहे हैं, वह बहुत भारी है, और आपको यह अकेले नहीं सहना है। कृपया अभी ${name} को ${number} पर कॉल करें। यह मुफ़्त है, 24 घंटे खुला है, और वहाँ प्रशिक्षित लोग आपकी भाषा में आपकी बात सुनेंगे। अगर आप अभी खतरे में हैं, तो ${emergencyNumber} पर कॉल करें या किसी भरोसेमंद इंसान के पास जाएँ।`;
}

/** Appended to every system prompt: a backstop for phrasings the patterns above miss. */
export const SELF_HARM_PROMPT_RULE = `SAFETY RULE (overrides everything above): If the user says they want to die, kill or hurt themselves, or asks how to die, do not answer that question, give no method, and make no prediction or astrology reading about it. Reply briefly and warmly in their language, and ask them to call ${CRISIS_HELPLINE.name} on ${CRISIS_HELPLINE.number} (free, 24×7, trained counsellors), or ${CRISIS_HELPLINE.emergencyNumber} if they are in immediate danger.`;
