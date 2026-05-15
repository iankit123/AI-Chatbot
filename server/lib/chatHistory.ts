export function isAssistantWelcomeMessage(content: string): boolean {
  const normalized = content.trim().toLowerCase();
  return (
    normalized === "hi" ||
    normalized === "hello" ||
    normalized.startsWith("hi, main") ||
    normalized.startsWith("hello, main")
  );
}

export function filterWelcomeMessagesFromHistory<
  T extends { role: string; content: string },
>(history: T[]): T[] {
  return history.filter(
    (msg) => !(msg.role === "assistant" && isAssistantWelcomeMessage(msg.content)),
  );
}

/** User sent only a short hi/hello-style opener (no real topic yet). */
export function isSimpleGreeting(text: string): boolean {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[!?.]+$/g, "")
    .replace(/\s+/g, " ");
  return /^(hi|hello|hey|hii|heyy|hiii|hlw|hallo|namaste|sup|yo)$/.test(normalized);
}

/** User is asking what the companion is doing right now. */
export function isAskingWhatCompanionIsDoing(text: string): boolean {
  const n = text.trim().toLowerCase();
  return (
    /kya\s+kar\s+rahi\s+ho/.test(n) ||
    /kya\s+kar\s+rahe\s+ho/.test(n) ||
    /kya\s+kar\s+rahi\s+hu/.test(n) ||
    /what\s+are\s+you\s+doing/.test(n) ||
    /what\s+you\s+doing/.test(n) ||
    /tum\s+kya\s+kar\s+rahi/.test(n)
  );
}
