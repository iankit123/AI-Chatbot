/** Paid astrology reports. Prices are enforced server-side. */

export const ASTRO_REPORT_TYPES = ["shaadi", "milan", "wapas", "business"] as const;
export type AstroReportType = (typeof ASTRO_REPORT_TYPES)[number];

export type AstroProductType = `${AstroReportType}_report`;

export const ASTRO_PRODUCT_TYPE = {
  shaadi: "shaadi_report",
  milan: "milan_report",
  wapas: "wapas_report",
  business: "business_report",
} as const satisfies Record<AstroReportType, AstroProductType>;

export const ASTRO_PRODUCT_TYPES = Object.values(ASTRO_PRODUCT_TYPE) as [AstroProductType, ...AstroProductType[]];

export const ASTRO_PRICES: Record<AstroReportType, { rupees: number; strike: number }> = {
  shaadi: { rupees: 49, strike: 199 },
  milan: { rupees: 99, strike: 299 },
  wapas: { rupees: 49, strike: 199 },
  business: { rupees: 49, strike: 199 },
};

export const ASTRO_ROUTES: Record<AstroReportType, string> = {
  shaadi: "/shaadi",
  milan: "/milan",
  wapas: "/wapas",
  business: "/business",
};

export function astroTypeFromProduct(v: string): AstroReportType | null {
  const hit = (Object.keys(ASTRO_PRODUCT_TYPE) as AstroReportType[]).find((t) => ASTRO_PRODUCT_TYPE[t] === v);
  return hit ?? null;
}

export function isAstroProductType(v: string): v is AstroProductType {
  return astroTypeFromProduct(v) !== null;
}
