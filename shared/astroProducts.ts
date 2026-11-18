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
 * Sticky per device. `?flow=quiz` or `?flow=classic` on /shaadi forces one flow (for checking).
 * Reports made in the quiz flow carry facts.flow = "quiz"; events and checkouts carry `flow`.
 */
export const SHAADI_QUIZ = { percent: 50, rupees: 99, strike: 999 } as const;
const SHAADI_QUIZ_SALT = "shaadi-quiz-1";

export function inShaadiQuizFlow(deviceId: string): boolean {
  let h = 2166136261;
  for (const ch of SHAADI_QUIZ_SALT + deviceId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return h % 100 < SHAADI_QUIZ.percent;
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
