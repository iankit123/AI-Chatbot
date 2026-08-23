/** Server-validated app event names (Meta Pixel custom events + analytics). */
export const APP_EVENT_NAMES = [
  "profile_created",
  "chat_started",
  "paywall_triggered",
  "payment_attempted",
  "purchase",
] as const;

export type AppEventName = (typeof APP_EVENT_NAMES)[number];

export function isAppEventName(value: string): value is AppEventName {
  return (APP_EVENT_NAMES as readonly string[]).includes(value);
}
