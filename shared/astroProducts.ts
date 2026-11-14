/** Paid astrology reports sold on /shaadi and /milan. Prices are enforced server-side. */

export type AstroReportType = "shaadi" | "milan";

export const ASTRO_PRODUCT_TYPE: Record<AstroReportType, "shaadi_report" | "milan_report"> = {
  shaadi: "shaadi_report",
  milan: "milan_report",
};

export const ASTRO_PRICES: Record<AstroReportType, { rupees: number; strike: number }> = {
  shaadi: { rupees: 49, strike: 199 },
  milan: { rupees: 99, strike: 299 },
};

export const ASTRO_ROUTES: Record<AstroReportType, string> = {
  shaadi: "/shaadi",
  milan: "/milan",
};

export function isAstroProductType(v: string): v is "shaadi_report" | "milan_report" {
  return v === "shaadi_report" || v === "milan_report";
}

export function astroTypeFromProduct(v: string): AstroReportType | null {
  if (v === "shaadi_report") return "shaadi";
  if (v === "milan_report") return "milan";
  return null;
}
