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

export type WapasStatus = "breakup" | "no_contact" | "fight" | "separated";
export type WapasReport = {
  id: string; type: "wapas"; paid: boolean; price: Price; selfName: string; partnerName: string; status: WapasStatus;
  gunTotal: number; gunBand: string;
  self: { moonRashi: string; nakshatra: string }; partner: { moonRashi: string; nakshatra: string };
  basisNote: string;
  sections?: {
    level: { label: string; hi: string; line: string }; meter: number; feel: string; causes: string[];
    act: { title: string; text: string };
    timing: { contact: string | null; next: string | null; dasha: string };
    doList: string[]; dontList: string[]; upay: string[];
    gun: { total: number; band: { label: string; hi: string; line: string } };
    care: string; basisNote: string;
  };
  narrative?: { summary: string; feelings: string; cause: string; advice: string } | null;
};

export type BusinessSituation = "naukri" | "business" | "berozgar" | "student";
export type BusinessReport = {
  id: string; type: "business"; paid: boolean; price: Price; name: string;
  chart: ShaadiReport["chart"];
  level: { label: string; hi: string; line: string }; meter: number; budget: string;
  topField?: { planet: string; field: string }; ideaCount?: number; letterCount?: number;
  sections?: {
    reasons: string[];
    fields: { planet: string; field: string }[];
    ideas: { text: string; planet: string; field: string; budget: string }[];
    partnership: { title: string; text: string };
    timing: { start: string; dasha: string; next: string | null };
    name: { letters: { latin: string; hi: string }[]; note: string };
    luck: { day: string; colour: string; direction: string };
    cautions: string[]; tip: string;
    snapshot: { label: string; value: string }[];
  };
  narrative?: { summary: string; why: string; how: string; caution: string } | null;
};

export type NaukriStatus = "taiyari" | "result" | "private" | "attempts";
export type NaukriTarget = "railway" | "ssc_bank" | "police_army" | "teacher" | "upsc_pcs" | "open";
export type NaukriReport = {
  id: string; type: "naukri"; paid: boolean; price: Price; name: string; status: NaukriStatus; target: NaukriTarget;
  chart: ShaadiReport["chart"]; dasha: string; yogCount: number;
  /** Free preview only. */
  firstYog?: string | null; obstacleCount?: number; hasWindow?: boolean;
  sections?: {
    level: { label: string; hi: string; line: string }; meter: number;
    yogas: { key: string; name: string; text: string }[];
    timing: { first: string | null; best: string | null; bestYear: number | null; dasha: string; bestDasha: string | null; jupiter: string | null; now: string; others: string[] };
    fields: { planet: string; field: string; exams: string }[];
    target: { label: string; note: string; match: boolean | null };
    competition: { label: string; text: string };
    status: { title: string; text: string };
    obstacles: string[];
    shani: { title: string; text: string } | null;
    doList: string[]; dontList: string[]; upay: string[];
    luck: { day: string; colour: string };
    snapshot: { label: string; value: string }[];
    basisNote: string;
  };
  narrative?: { summary: string; timing: string; field: string; advice: string } | null;
};

export type AstroReport = ShaadiReport | MilanReport | WapasReport | BusinessReport | NaukriReport;

export const createNaukriPreview = (payload: SelfDetails & { status: NaukriStatus; target: NaukriTarget }) =>
  request<NaukriReport>("/api/astro/naukri/preview", {
    method: "POST",
    body: JSON.stringify({ device_id: getDeviceId(), ...payload }),
  });

export type PartnerDetails = { name: string; dob: string | null; tob: string | null; place: string | null };

export const createWapasPreview = (payload: { self: SelfDetails; partner: PartnerDetails; status: WapasStatus }) =>
  request<WapasReport>("/api/astro/wapas/preview", {
    method: "POST",
    body: JSON.stringify({ device_id: getDeviceId(), ...payload }),
  });

export type BusinessBudget = 1 | 2 | 3 | 4 | 5 | 6;
export const createBusinessPreview = (payload: SelfDetails & { situation: BusinessSituation; budget: BusinessBudget }) =>
  request<BusinessReport>("/api/astro/business/preview", {
    method: "POST",
    body: JSON.stringify({ device_id: getDeviceId(), ...payload, budget_scale: 2 }),
  });

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
      rate_note: `${report.type} report`,
      metadata: { astro_report_id: report.id, source: `${report.type}_report` },
    },
  });
}

/**
 * The Meta ad's URL parameters (site, placement, ad set id, ad id), so a landing can be tied to the
 * ad that brought it. The ads carry
 * utm_source={{site_source_name}}&utm_medium={{placement}}&utm_campaign={{adset.id}}&utm_content={{ad.id}}.
 */
function adParams(): Record<string, string> {
  try {
    const q = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content"]) {
      const v = q.get(k);
      if (v) out[k] = v.slice(0, 100);
    }
    return out;
  } catch {
    return {};
  }
}

export function trackAstro(event: Extract<AppEventName, `astro_${string}`>, report: AstroReportType, extra?: Record<string, unknown>) {
  const props = { report, ...extra };
  try {
    window.fbq?.("trackCustom", event, props);
  } catch {
    /* analytics must never block the page */
  }
  logAppEventToServer(event, event === "astro_landing" ? { ...props, ...adParams() } : props);
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
/** Fills the report forms' saved details, only when none are saved yet (e.g. from the Kundli chat). */
export function saveSelfIfEmpty(self: Partial<SelfDetails>) {
  if (loadSelf().name) return;
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

/** Report-page events stored for our own analysis only (never sent to the Meta Pixel). */
export function logAstro(
  event: "astro_report_read" | "astro_report_action" | "astro_question",
  report: AstroReport["type"],
  props: Record<string, unknown>,
) {
  logAppEventToServer(event, { report, ...props });
}
