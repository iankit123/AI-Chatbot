import { getEnglishChatOpeningHtml } from "./englishChatOpening";

export const WELCOME_MESSAGE_HINDI = "Hi";
export const WELCOME_MESSAGE_ENGLISH = "Hi";

export const KRISHNA_WELCOME_MESSAGE =
  "Bolo beta, Koi Samasya hai yaa kuch baat karni hai?";

export function getRoleWelcomeMessage(roleId: string): string {
  if (roleId === "krishna") return KRISHNA_WELCOME_MESSAGE;
  return WELCOME_MESSAGE_HINDI;
}

export function isGenericAssistantWelcome(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  return normalized === "hi" || normalized === "hello";
}

/** Replace a saved generic "Hi" opener with the role-specific welcome (e.g. Krishna). */
export function upgradeStaleRoleWelcomeMessages<
  T extends { role: string; content: string; id?: string | number },
>(messages: T[], roleId: string): { messages: T[]; messageIdsToPersist: string[] } {
  const targetWelcome = getRoleWelcomeMessage(roleId);
  if (targetWelcome === WELCOME_MESSAGE_HINDI) {
    return { messages, messageIdsToPersist: [] };
  }

  let seenFirstAssistant = false;
  const messageIdsToPersist: string[] = [];

  const upgraded = messages.map((msg) => {
    if (msg.role !== "assistant" || seenFirstAssistant) return msg;
    seenFirstAssistant = true;
    if (!isGenericAssistantWelcome(msg.content)) return msg;

    if (typeof msg.id === "string") {
      messageIdsToPersist.push(msg.id);
    }
    return { ...msg, content: targetWelcome };
  });

  return { messages: upgraded, messageIdsToPersist };
}

const normalizeContent = (content: string) =>
  content.replace(/\s+/g, " ").trim().toLowerCase();

/** True when an assistant message is a chat opener (role welcome, generic "Hi", or the Learn English opening). */
export function isAssistantOpenerMessage(
  msg: { role: string; content: string; contextInfo?: string | null },
  roleId: string,
): boolean {
  if (msg.role !== "assistant") return false;
  if (msg.contextInfo === "english_lesson_opening") return true;
  if (isGenericAssistantWelcome(msg.content)) return true;
  const normalized = normalizeContent(msg.content);
  if (normalized === normalizeContent(getRoleWelcomeMessage(roleId))) return true;
  if (roleId === "english") {
    return (
      normalized === normalizeContent(getEnglishChatOpeningHtml("hindi")) ||
      normalized === normalizeContent(getEnglishChatOpeningHtml("english"))
    );
  }
  return false;
}

/**
 * Keep only the first opener/welcome message in a loaded history and drop
 * consecutive identical assistant messages. Old sessions saved a fresh welcome
 * row each visit; this collapses them to the single opener the user should see.
 */
export function dedupeAssistantOpenerMessages<
  T extends { role: string; content: string; contextInfo?: string | null },
>(messages: T[], roleId: string): T[] {
  const result: T[] = [];
  let openerSeen = false;
  let prevAssistantContent: string | null = null;

  for (const msg of messages) {
    if (msg.role === "assistant") {
      const normalized = normalizeContent(msg.content);
      if (isAssistantOpenerMessage(msg, roleId)) {
        if (openerSeen) continue;
        openerSeen = true;
      } else if (prevAssistantContent === normalized) {
        continue;
      }
      prevAssistantContent = normalized;
    } else {
      prevAssistantContent = null;
    }
    result.push(msg);
  }

  return result;
}

export const LANGUAGE_OPTIONS = {
  HINDI: 'hindi',
  ENGLISH: 'english'
} as const;

/** Voice tab — premium activation amount shown in UI and logged to payment_attempts */
export const VOICE_CHAT_ACTIVATION_RUPEES = 29;

export type RoleType = 'doctor' | 'kundli' | 'parenting' | 'finance' | 'career' | 'relationship' | 'krishna' | 'english';

// Role-specific suggestion prompts
export const ROLE_SUGGESTIONS: Record<RoleType, string[]> = {
  doctor: [
    "Mere sar ke left side me dard hai, kya karu?",
    "Mujhe cold aur cough ho raha hai, kuchh upay bataiye",
    "Mera BP high hai, diet me kya changes karu?",
    "Exercise karne ke baad body me pain hota hai"
  ],
  kundli: [
    "Mai 2-Dec-1992 me born hua tha, mera future bataiye",
    "Mera career kaisa rahega?",
    "Meri shadi kab hogi?",
    "Mere health ke bare me kuchh bataiye"
  ],
  parenting: [
    "Baby ko kaise sleep train karu?",
    "6 months ke baby ke liye kya food de sakte hain?",
    "Baby ko fever hai, kya karu?",
    "Baby ka weight gain nahi ho raha"
  ],
  finance: [
    "Mujhe savings kaise karni chahiye?",
    "Investment ke liye kya options hain?",
    "Credit card debt kaise manage karu?",
    "Emergency fund kitna hona chahiye?"
  ],
  career: [
    "Resume kaise improve karu?",
    "Interview me kaise prepare karu?",
    "Career change kaise karu?",
    "Salary negotiation kaise karein?"
  ],
  relationship: [],
  krishna: [
    "Mujhe life me clarity chahiye",
    "Stress me shaant kaise rahu?",
    "Gita se ek practical advice do",
    "Apne karm par focus kaise karu?"
  ],
  english: [],
};
