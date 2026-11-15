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
  /** Paid report reading: scroll depth milestones and time on page. */
  "astro_report_read",
  /** Taps on Share and cross-sell links in a paid report. */
  "astro_report_action",
  /** "Aur kya jaanna hai?" question typed at the end of a paid report. */
  "astro_question",
  /** Self-harm message detected; logged to our DB only, never sent to Meta. */
  "crisis_detected",
] as const;

export type AppEventName = (typeof APP_EVENT_NAMES)[number];

export function isAppEventName(value: string): value is AppEventName {
  return (APP_EVENT_NAMES as readonly string[]).includes(value);
}
