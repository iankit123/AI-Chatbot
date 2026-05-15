/** Free user messages per companion before paid chat (₹0.20/message) applies. */
export const FREE_USER_MESSAGE_ALLOWANCE = 5;

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
export function clientShouldBlockForPaywall(messageCountBeforeSend: number): boolean {
  return messageCountBeforeSend >= FREE_USER_MESSAGE_ALLOWANCE;
}

/** Server: charge when client-reported message index exceeds free allowance. */
export function serverShouldChargeForMessage(messageCountFromClient: number): boolean {
  return messageCountFromClient > FREE_USER_MESSAGE_ALLOWANCE;
}
