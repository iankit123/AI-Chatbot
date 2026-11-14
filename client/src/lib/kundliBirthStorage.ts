import {
  getAnonymousUserId,
  getDeviceId,
  getStoredBillingPhoneDigits,
  isSignedInLocally,
} from "@/lib/supabase";
import { parseKundliBirthDetails, type KundliBirthDetails } from "@shared/kundliBirth";

/** Birth form fields, stored per phone / user / device. */
export type StoredKundliBirthDetails = KundliBirthDetails;

const STORAGE_NS = "kundliBirthV1";

function parseStored(raw: string | null): StoredKundliBirthDetails | null {
  if (!raw) return null;
  try {
    return parseKundliBirthDetails(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** All localStorage keys that may hold birth details for this session. */
export function getKundliBirthStorageKeys(): string[] {
  const keys: string[] = [];
  const phone = getStoredBillingPhoneDigits();
  if (phone) keys.push(`${STORAGE_NS}:phone:${phone}`);

  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const u = JSON.parse(raw) as { uid?: string };
      const uid = u?.uid;
      if (uid && typeof uid === "string" && !uid.startsWith("anonymous-")) {
        keys.push(`${STORAGE_NS}:user:${uid}`);
      }
    }
  } catch {
    /* ignore */
  }

  keys.push(`${STORAGE_NS}:anon:${getAnonymousUserId()}`);
  return Array.from(new Set(keys));
}

export function loadStoredKundliBirth(): StoredKundliBirthDetails | null {
  for (const key of getKundliBirthStorageKeys()) {
    const hit = parseStored(localStorage.getItem(key));
    if (hit) return hit;
  }
  return null;
}

export function saveStoredKundliBirth(details: StoredKundliBirthDetails): void {
  try {
    for (const key of getKundliBirthStorageKeys()) {
      localStorage.setItem(key, JSON.stringify(details));
    }
  } catch (e) {
    console.error("[kundliBirthStorage] Failed to save", e);
  }
}

/** Copy anon → phone/user keys after sign-in so the form is not shown again. */
export function migrateKundliBirthAcrossAuthKeys(): void {
  const details = loadStoredKundliBirth();
  if (!details) return;
  saveStoredKundliBirth(details);
}

export async function fetchServerKundliBirth(): Promise<StoredKundliBirthDetails | null> {
  if (!isSignedInLocally() && !getStoredBillingPhoneDigits()) return null;
  try {
    const params = new URLSearchParams({ device_id: getDeviceId() });
    const phone = getStoredBillingPhoneDigits();
    if (phone) params.set("phone_number", phone);
    const res = await fetch(`/api/profiles/kundli-birth?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { kundli_birth_details?: unknown };
    return parseKundliBirthDetails(data.kundli_birth_details);
  } catch {
    return null;
  }
}

export async function saveServerKundliBirth(
  details: StoredKundliBirthDetails,
): Promise<void> {
  if (!isSignedInLocally() && !getStoredBillingPhoneDigits()) return;
  try {
    await fetch("/api/profiles/kundli-birth", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        device_id: getDeviceId(),
        phone_number: getStoredBillingPhoneDigits(),
        kundli_birth_details: details,
      }),
    });
  } catch {
    /* offline — local copy still saved */
  }
}

export type KundliChartSummary = {
  lagna: { roman: string; hindi: string; english: string } | null;
  rashi: { roman: string; hindi: string; english: string };
  nakshatra: { roman: string; hindi: string };
  mahadasha: { roman: string; hindi: string; english: string } | null;
  place: { lat: number; lon: number } | null;
};

/** Rashi, lagna and nakshatra for the welcome message. Null when the server cannot be reached. */
export async function fetchKundliChartSummary(
  details: StoredKundliBirthDetails,
): Promise<KundliChartSummary | null> {
  try {
    const res = await fetch("/api/kundli/chart", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ kundli_birth_details: details }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: KundliChartSummary };
    return data.summary ?? null;
  } catch {
    return null;
  }
}
