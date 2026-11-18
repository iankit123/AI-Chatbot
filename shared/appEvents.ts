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
  /**
   * /shaadi quiz flow (SHAADI_QUIZ): one event per answered screen, quiz questions and birth
   * details alike (properties.step, n, value; never the name or birth details themselves).
   * Stored for our analysis only, never sent to the Meta Pixel.
   */
  "astro_quiz_step",
  /** Paid report reading: scroll depth milestones and time on page. */
  "astro_report_read",
  /** Taps on Share and cross-sell links in a paid report. */
  "astro_report_action",
  /** "Aur kya jaanna hai?" question typed at the end of a paid report. */
  "astro_question",
  /** Self-harm message detected; logged to our DB only, never sent to Meta. */
  "crisis_detected",
  /**
   * /tayari: free exam-prep quiz for sarkari aspirants (a demand test, nothing is sold).
   * landing → one tayari_step per answer → tayari_completed (all answers) → tayari_offer_click
   * on a "coming soon" ₹49 offer → tayari_lead when they leave a WhatsApp number.
   */
  "tayari_landing",
  "tayari_step",
  "tayari_completed",
  "tayari_offer_click",
  "tayari_lead",
] as const;

export type AppEventName = (typeof APP_EVENT_NAMES)[number];

export function isAppEventName(value: string): value is AppEventName {
  return (APP_EVENT_NAMES as readonly string[]).includes(value);
}
