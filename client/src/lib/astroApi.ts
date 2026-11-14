import type { AppEventName } from "@shared/appEvents";
import type { AstroReportType } from "@shared/astroProducts";
import { ASTRO_PRODUCT_TYPE } from "@shared/astroProducts";
import { getDeviceId } from "@/lib/supabase";
import { logAppEventToServer } from "@/lib/logAppEvent";
import { runRazorpayCheckout } from "@/lib/razorpay";

export type Gender = "male" | "female";
export type SelfDetails = { name: string; gender: Gender; dob: string; tob: string | null; place: string };

export type Koot = { key: string; name: string; hi: string; meaning: string; score: number | null; max: number };
export type Price = { rupees: number; strike: number };

export type ShaadiReport = {
  id: string; type: "shaadi"; paid: boolean; name: string; gender: Gender; price: Price;
  chart: { lagna: string | null; moonRashi: string; moonRashiHi: string; nakshatra: string; pada: number; timeKnown: boolean; placePrecise: boolean };
  palmRead: boolean; headline: string; letterCount: number;
  /** Paid only. */
  windowYears?: string;
  /** Free preview only: whether the hidden window spans two years. */
  windowIsRange?: boolean;
  firstLetter?: { latin: string; hi: string }; delayCount?: number;
  sections?: {
    snapshot: { label: string; value: string }[];
    timing: { window: string; strength: string; dasha: string; jupiter: string | null; next: string | null; delays: string[] };
    type: { label: string; hi: string; reason: string };
    partner: { who: string; letters: { latin: string; hi: string }[]; letterSource: string; looks: string; nature: string; work: string; direction: string; distance: string };
    mangal: { present: boolean; title: string; text: string; upay: string[] };
    upay: string[];
  };
  narrative?: { summary: string; timing: string; partner: string; meeting: string; advice: string } | null;
  palm?: { heart_line: string; marriage_line: string; fate_line: string; summary: string } | null;
  hasPortrait?: boolean;
};

export type MilanReport = {
  id: string; type: "milan"; paid: boolean; price: Price; selfName: string; partnerName: string;
  question: "shaadi" | "wapas" | "rishta"; total: number;
  band: { label: string; hi: string; line: string };
  self: { moonRashi: string; nakshatra: string };
  partner: { moonRashi: string; nakshatra: string; basis: "kundli" | "dob_only" | "naam" };
  basisNote: string;
  koots?: Koot[]; doshCount?: number;
  sections?: {
    koots: Koot[];
    doshas: { name: string; present: boolean; text: string }[];
    verdict: { line: string; band: { label: string; hi: string; line: string } };
    strengths: string[]; challenges: string[];
    timing: { self: string; partner: string | null; both: string | null };
    pair: { yoni: [string, string]; gana: [string, string]; nadi: [string, string] };
    upay: string[]; basisNote: string;
  };
  narrative?: { summary: string; bond: string; caution: string; advice: string } | null;
};

export type AstroReport = ShaadiReport | MilanReport;

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message || "Kuch gadbad ho gayi. Dobara koshish karein.");
  return data as T;
}

export const createShaadiPreview = (self: SelfDetails, palmImage?: string | null) =>
  request<ShaadiReport>("/api/astro/shaadi/preview", {
    method: "POST",
    body: JSON.stringify({ device_id: getDeviceId(), ...self, ...(palmImage ? { palm_image: palmImage } : {}) }),
  });

export const createMilanPreview = (payload: {
  self: SelfDetails;
  partner: { name: string; dob: string | null; tob: string | null; place: string | null };
  question: MilanReport["question"];
}) =>
  request<MilanReport>("/api/astro/milan/preview", {
    method: "POST",
    body: JSON.stringify({ device_id: getDeviceId(), ...payload }),
  });

export const fetchReport = <T extends AstroReport>(id: string) => request<T>(`/api/astro/report/${id}`);

export const requestPortrait = (id: string) =>
  request<{ ready: boolean }>(`/api/astro/report/${id}/portrait`, { method: "POST" }).catch(() => ({ ready: false }));

export const portraitUrl = (id: string) => `/api/astro/report/${id}/portrait`;

/** Opens Razorpay straight away (no phone step). Resolves once the payment is verified. */
export async function payForReport(report: AstroReport): Promise<void> {
  await runRazorpayCheckout({
    amountRupees: report.price.rupees,
    billing: {
      device_id: getDeviceId(),
      phone_number: "",
      product_type: ASTRO_PRODUCT_TYPE[report.type],
      companion_id: null,
      rate_note: report.type === "shaadi" ? "Shaadi report" : "Kundli milan report",
      metadata: { astro_report_id: report.id, source: `${report.type}_report` },
    },
  });
}

export function trackAstro(event: Extract<AppEventName, `astro_${string}`>, report: AstroReportType, extra?: Record<string, unknown>) {
  const props = { report, ...extra };
  try {
    window.fbq?.("trackCustom", event, props);
  } catch {
    /* analytics must never block the page */
  }
  logAppEventToServer(event, props);
}

// ---- remembered details, so the second product opens pre-filled

const SELF_KEY = "astroSelfDetails";
export function loadSelf(): Partial<SelfDetails> {
  try {
    return JSON.parse(localStorage.getItem(SELF_KEY) || "{}") as Partial<SelfDetails>;
  } catch {
    return {};
  }
}
export function saveSelf(self: SelfDetails) {
  try {
    localStorage.setItem(SELF_KEY, JSON.stringify(self));
  } catch {
    /* storage may be unavailable in some in-app browsers */
  }
}
const lastKey = (t: AstroReportType) => `astroLastReport:${t}`;
export function rememberReport(t: AstroReportType, id: string) {
  try {
    localStorage.setItem(lastKey(t), id);
  } catch {
    /* ignore */
  }
}
export function lastReportId(t: AstroReportType): string | null {
  try {
    return localStorage.getItem(lastKey(t));
  } catch {
    return null;
  }
}

/** Shrinks a photo to a small JPEG data URL so it uploads fast on mobile data. */
export function compressImage(file: File, maxSide = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Photo load nahi ho payi"));
    };
    img.src = url;
  });
}

export function shareOnWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}

/** Reports just created or fetched, so navigating to the report URL does not refetch. */
const reportCache = new Map<string, AstroReport>();
export const cacheReport = (r: AstroReport) => reportCache.set(r.id, r);
export const cachedReport = <T extends AstroReport>(id: string) => reportCache.get(id) as T | undefined;

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
