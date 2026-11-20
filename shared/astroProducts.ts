/** Paid astrology reports. Prices are enforced server-side. */

export const ASTRO_REPORT_TYPES = ["shaadi", "milan", "wapas", "business", "naukri"] as const;
export type AstroReportType = (typeof ASTRO_REPORT_TYPES)[number];

export type AstroProductType = `${AstroReportType}_report`;

export const ASTRO_PRODUCT_TYPE = {
  shaadi: "shaadi_report",
  milan: "milan_report",
  wapas: "wapas_report",
  business: "business_report",
  naukri: "naukri_report",
} as const satisfies Record<AstroReportType, AstroProductType>;

export const ASTRO_PRODUCT_TYPES = Object.values(ASTRO_PRODUCT_TYPE) as [AstroProductType, ...AstroProductType[]];

export const ASTRO_PRICES: Record<AstroReportType, { rupees: number; strike: number }> = {
  shaadi: { rupees: 29, strike: 149 },
  milan: { rupees: 99, strike: 299 },
  wapas: { rupees: 29, strike: 149 },
  business: { rupees: 29, strike: 149 },
  naukri: { rupees: 29, strike: 149 },
};

export const ASTRO_ROUTES: Record<AstroReportType, string> = {
  shaadi: "/shaadi",
  milan: "/milan",
  wapas: "/wapas",
  business: "/business",
  naukri: "/naukri",
};

export function astroTypeFromProduct(v: string): AstroReportType | null {
  const hit = (Object.keys(ASTRO_PRODUCT_TYPE) as AstroReportType[]).find((t) => ASTRO_PRODUCT_TYPE[t] === v);
  return hit ?? null;
}

export function isAstroProductType(v: string): v is AstroProductType {
  return astroTypeFromProduct(v) !== null;
}

/**
 * Pricing test: each device is assigned one of PRICE_TEST_ARMS for these reports, sticky per
 * device. Milan stays at its own price. Change PRICE_TEST_SALT to reshuffle arms.
 * Round 1 (2026-11-15 12:27): 19/49/99. Round 2 (13:52): 19/29/49, after 99 sold nothing.
 * Round 3: 39/29/49. Same salt and slots, so the 29 and 49 groups keep their devices and only
 * the old 19 slot moves to 39. Keep the slot order when changing prices.
 * Ended 2026-11-16 ~12:00 IST: 29 won (Rs 10.60 per price-page viewer vs 8.54 at 39 and 7.74 at 49,
 * and about twice as many buyers), so every report is now Rs 29 for everyone, except Milan.
 * Milan is back at Rs 99 since 2026-11-16 ~23:30: nearly all its buyers already bought a report.
 * To run a new test, list the reports again in PRICE_TEST_REPORTS.
 */
export const PRICE_TEST_ARMS = [39, 29, 49] as const;
export const PRICE_TEST_REPORTS: readonly AstroReportType[] = [];
const PRICE_TEST_SALT = "price-test-2";
const STRIKE_FOR: Record<number, number> = { 19: 99, 29: 149, 39: 179, 49: 199, 99: 299 };

/** Price to charge for a new report of this type on this device. */
export function priceForNewReport(type: AstroReportType, deviceId: string): number {
  if (!PRICE_TEST_REPORTS.includes(type)) return ASTRO_PRICES[type].rupees;
  let h = 2166136261;
  for (const ch of PRICE_TEST_SALT + deviceId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return PRICE_TEST_ARMS[h % PRICE_TEST_ARMS.length];
}

/**
 * Contact-skip test (started 2026-11-17): for CONTACT_TEST_PERCENT of devices, Razorpay opens with
 * a placeholder phone (the owner's number) and the phone field hidden, so checkout starts at the
 * payment methods. Those buyers are asked for their real number after paying. Razorpay rejects
 * 9876543210 as a prefill, so the placeholder must be a real-looking number.
 * Ended 2026-11-18 ~12:30 IST at 0%: after ~100 checkouts the skip arm paid no better (30% vs 33%).
 * The placeholder stays listed so isRealPhone keeps rejecting it on rows from the test.
 */
export const CONTACT_PLACEHOLDER = "7829234220";
export const CONTACT_TEST_PERCENT = 0;
const CONTACT_TEST_SALT = "skip-contact-1";

export function skipsContactScreen(deviceId: string): boolean {
  let h = 2166136261;
  for (const ch of CONTACT_TEST_SALT + deviceId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h % 100 < CONTACT_TEST_PERCENT;
}

/**
 * Shaadi quiz-flow test (from 2026-11-18). SHAADI_QUIZ.percent of devices that open /shaadi get a
 * flow modelled on numsecret.com: six one-tap questions about their shaadi worry, birth details one
 * per screen, then a paywall that quotes their answers, draws their kundli and shows three locked
 * answer cards at ₹99 (strike ₹999). The rest keep the classic page at ASTRO_PRICES.shaadi.
 * Sticky per device. `?flow=quiz|picker|classic` on /shaadi forces one flow (for checking).
 * Live for 50% from 2026-11-18 ~14:35 IST; thirds (quiz / picker / classic) from ~14:52 IST.
 * From ~16:03 IST 18 Nov the Shaadi ad was split in quarters (quiz / picker / steps / classic).
 * From ~09:30 IST 19 Nov steps (the picker, then the classic questions one per screen at ₹29) is
 * replaced by picker29 in the same hash range:
 *   quiz     (hash 0–24)  — the Shaadi quiz flow above, ₹99;
 *   picker   (hash 25–49) — first asks which part of life hurts (shaadi, breakup, paisa, sarkari
 *                           naukri), then that report's own quiz flow (shared/quizFlows.ts), ₹99;
 *   picker29 (hash 50–74) — exactly the picker flow and paywall, at ₹29 (strike ₹149);
 *   classic  (hash 75–99) — the classic page at the normal price.
 * From ~01:30 IST 20 Nov it is 50/50, and the picker's price depends on the time in India:
 *   picker  (hash 25–74) — the picker flow at ₹29 (picker29) by day, ₹99 (picker) from 22:00 to 06:00 IST;
 *   classic (hash 0–24, 75–99) — the classic page at the normal price, day and night.
 * The old picker ₹99 and picker29 devices stay in the picker; the old Shaadi quiz devices move to
 * classic (?flow=quiz still shows that flow). The time is read once, when the page opens.
 * Ended ~15:15 IST 20 Nov (SHAADI_QUIZ.live = false): everyone gets the classic page. By day the picker
 * at ₹29 tied classic (32 buyers each, ₹3.81 vs ₹3.99 per visitor over 1.5 days), and ₹99 lost by day.
 * The flows stay reachable with ?flow= and old quiz reports keep their own look and price.
 * Quiz-flow reports of any type carry facts.flow = "quiz" (facts.entry = "picker" or "picker29"
 * from the picker). Old steps reports carry facts.entry = "steps". Events and checkouts carry
 * `flow`. Compare arms on revenue per landing visitor only: what comes before each paywall differs.
 */
export const SHAADI_QUIZ = { live: false, pickerFrom: 25, pickerTo: 75, rupees: 99, strike: 999, lowRupees: 29 } as const;
const SHAADI_QUIZ_SALT = "shaadi-quiz-1";
export type ShaadiArm = "quiz" | "picker" | "picker29" | "steps" | "classic";

/** The night-price window of the picker/quiz arms: 22:00 to 05:59 India time. */
export const NIGHT_PRICE = { fromHour: 22, toHour: 6 } as const;

/** True during NIGHT_PRICE hours in India, whatever time zone the phone is set to. */
export function isIndiaNight(now: number = Date.now()): boolean {
  const hour = new Date(now + 5.5 * 3_600_000).getUTCHours();
  return hour >= NIGHT_PRICE.fromHour || hour < NIGHT_PRICE.toHour;
}

export function shaadiArm(deviceId: string, now: number = Date.now()): ShaadiArm {
  let h = 2166136261;
  for (const ch of SHAADI_QUIZ_SALT + deviceId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const b = h % 100;
  if (SHAADI_QUIZ.live && b >= SHAADI_QUIZ.pickerFrom && b < SHAADI_QUIZ.pickerTo) return isIndiaNight(now) ? "picker" : "picker29";
  return "classic";
}

/**
 * Wapas quiz test (from 2026-11-19 ~16:30 IST), like the Shaadi one: devices opening /wapas are split
 *   quiz    (hash 0–32)  — Wapas photo, the six breakup questions (shared/quizFlows.ts), your and the
 *                          partner's details one per screen, the Wapas quiz paywall, ₹99 (strike ₹999);
 *   quiz29  (hash 33–65) — exactly the same flow at ₹29 (strike ₹149);
 *   classic (hash 66–99) — the classic /wapas page at ₹29.
 * From ~01:30 IST 20 Nov it is 50/50, with the quiz priced by the time in India (like the Shaadi picker):
 *   quiz    (hash 0–49)  — the quiz flow at ₹29 (quiz29) by day, ₹99 (quiz) from 22:00 to 06:00 IST;
 *   classic (hash 50–99) — the classic /wapas page at ₹29, day and night.
 * Ended ~15:15 IST 20 Nov with the Shaadi test (WAPAS_QUIZ.live = false): everyone gets the classic page.
 * Sticky per device, own salt (independent of the Shaadi arms). ?flow=quiz|quiz29|classic forces one.
 * Quiz reports carry facts.flow = "quiz" (facts.entry = "quiz29" at ₹29). Read per landing visitor.
 */
export const WAPAS_QUIZ = { live: false, quizPercent: 50 } as const;
const WAPAS_QUIZ_SALT = "wapas-quiz-1";
export type WapasArm = "quiz" | "quiz29" | "classic";

export function wapasArm(deviceId: string, now: number = Date.now()): WapasArm {
  let h = 2166136261;
  for (const ch of WAPAS_QUIZ_SALT + deviceId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const b = h % 100;
  if (WAPAS_QUIZ.live && b < WAPAS_QUIZ.quizPercent) return isIndiaNight(now) ? "quiz" : "quiz29";
  return "classic";
}

/** Last 10 digits of a typed or stored phone (drops +91, a leading 0, spaces). */
export function phoneDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

/** A real Indian mobile number: 10 digits starting 6–9, and not our checkout placeholder. */
export function isRealPhone(value: string | null | undefined): boolean {
  const d = phoneDigits(value);
  return /^[6-9]\d{9}$/.test(d) && d !== CONTACT_PLACEHOLDER;
}

/** Display price for a stored report; older rows have no stored price and use the default. */
export function priceOfReport(type: AstroReportType, storedRupees: number | null | undefined): { rupees: number; strike: number } {
  if (!storedRupees) return ASTRO_PRICES[type];
  return { rupees: storedRupees, strike: STRIKE_FOR[storedRupees] ?? Math.max(storedRupees * 3, ASTRO_PRICES[type].strike) };
}
