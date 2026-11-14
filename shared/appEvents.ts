/** Server-validated app event names (Meta Pixel custom events + analytics). */
export const APP_EVENT_NAMES = [
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
  "crisis_detected",
] as const;

export type AppEventName = (typeof APP_EVENT_NAMES)[number];

export function isAppEventName(value: string): value is AppEventName {
  return (APP_EVENT_NAMES as readonly string[]).includes(value);
}
