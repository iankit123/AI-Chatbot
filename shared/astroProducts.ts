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
  shaadi: { rupees: 49, strike: 199 },
  milan: { rupees: 99, strike: 299 },
  wapas: { rupees: 49, strike: 199 },
  business: { rupees: 49, strike: 199 },
  naukri: { rupees: 49, strike: 199 },
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
 */
export const PRICE_TEST_ARMS = [39, 29, 49] as const;
export const PRICE_TEST_REPORTS: readonly AstroReportType[] = ["shaadi", "wapas", "business", "naukri"];
const PRICE_TEST_SALT = "price-test-2";
const STRIKE_FOR: Record<number, number> = { 19: 99, 29: 149, 39: 179, 49: 199, 99: 299 };

/** Price to charge for a new report of this type on this device. */
export function priceForNewReport(type: AstroReportType, deviceId: string): number {
  if (!PRICE_TEST_REPORTS.includes(type)) return ASTRO_PRICES[type].rupees;
  let h = 2166136261;
  for (const ch of PRICE_TEST_SALT + deviceId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  return PRICE_TEST_ARMS[h % PRICE_TEST_ARMS.length];
}

/** Display price for a stored report; older rows have no stored price and use the default. */
export function priceOfReport(type: AstroReportType, storedRupees: number | null | undefined): { rupees: number; strike: number } {
  if (!storedRupees) return ASTRO_PRICES[type];
  return { rupees: storedRupees, strike: STRIKE_FOR[storedRupees] ?? Math.max(storedRupees * 3, ASTRO_PRICES[type].strike) };
}
