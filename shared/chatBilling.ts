import {
  KUNDLI_CONTEXT_AUTOMATED,
  KUNDLI_CONTEXT_DETAILS,
} from "./kundliMessageKinds";

/** Default free user messages per companion before paid chat (₹0.20/message) applies. */
export const FREE_USER_MESSAGE_ALLOWANCE = 8;

/**
 * Companions with a different free allowance. Kundli: by the 6th message most people
 * are on their most personal question, and few drop off before that (Nov 2026 ad traffic).
 */
const FREE_USER_MESSAGE_ALLOWANCE_BY_COMPANION: Record<string, number> = {
  kundli: 5,
};

export function freeMessageAllowance(companionId: string | null | undefined): number {
  if (!companionId) return FREE_USER_MESSAGE_ALLOWANCE;
  return FREE_USER_MESSAGE_ALLOWANCE_BY_COMPANION[companionId] ?? FREE_USER_MESSAGE_ALLOWANCE;
}

/** Saved with role "user" but not typed by the person (Kundli birth-form bubbles). */
const AUTO_USER_MESSAGE_CONTEXTS = new Set<string>([
  KUNDLI_CONTEXT_DETAILS,
  KUNDLI_CONTEXT_AUTOMATED,
]);

/** Only messages the person typed count toward the free allowance. */
export function countsTowardFreeMessages(message: {
  role: string;
  contextInfo?: string | null;
}): boolean {
  return (
    message.role === "user" &&
    !AUTO_USER_MESSAGE_CONTEXTS.has(message.contextInfo ?? "")
  );
}

/** Rupees deducted per user message after free allowance (₹1 → 5 messages, ₹20 → 100). */
export const CHAT_MESSAGE_COST_RUPEES = 0.2;

const EPS = 1e-9;

export function roundWalletRupees(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function canAffordChatMessage(walletCredits: number): boolean {
  return walletCredits >= CHAT_MESSAGE_COST_RUPEES - EPS;
}

export function chatMessagesRemaining(walletCredits: number): number {
  if (walletCredits < CHAT_MESSAGE_COST_RUPEES - EPS) return 0;
  return Math.floor(walletCredits / CHAT_MESSAGE_COST_RUPEES + EPS);
}

/** Client `messageCount` before send; server uses `messageCount` from body (client sends count after increment). */
export function clientShouldBlockForPaywall(
  messageCountBeforeSend: number,
  companionId: string | null | undefined,
): boolean {
  return messageCountBeforeSend >= freeMessageAllowance(companionId);
}

/** Server: charge when this message's index (1-based) exceeds the free allowance. */
export function serverShouldChargeForMessage(
  messageIndex: number,
  companionId: string | null | undefined,
): boolean {
  return messageIndex > freeMessageAllowance(companionId);
}
