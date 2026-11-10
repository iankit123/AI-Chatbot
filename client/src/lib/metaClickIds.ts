import type { MetaBrowserContext } from "@shared/metaEvents";

/** Ad click id kept from the landing URL, in Meta's `_fbc` format. */
const FBC_STORAGE_KEY = "meta_fbc";

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Save the `fbclid` from an ad click. The Pixel normally stores it as the `_fbc` cookie,
 * but when the Pixel is blocked the server still needs it to credit the ad.
 */
export function rememberMetaClickId(): void {
  try {
    const fbclid = new URLSearchParams(window.location.search).get("fbclid");
    if (!fbclid) return;
    const stored = localStorage.getItem(FBC_STORAGE_KEY);
    if (stored?.endsWith(`.${fbclid}`)) return;
    localStorage.setItem(FBC_STORAGE_KEY, `fb.1.${Date.now()}.${fbclid}`);
  } catch {
    /* storage blocked: the Pixel cookie is the only source */
  }
}

export function getMetaBrowserContext(eventId?: string): MetaBrowserContext {
  let storedFbc: string | null = null;
  try {
    storedFbc = localStorage.getItem(FBC_STORAGE_KEY);
  } catch {
    /* storage blocked */
  }
  return {
    ...(eventId ? { event_id: eventId } : {}),
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc") ?? storedFbc,
    event_source_url: window.location.href,
  };
}

export function newMetaEventId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* older in-app browsers */
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
