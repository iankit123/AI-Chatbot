import { getAnonymousUserId } from "@/lib/supabase";

/** Matches submitted birth form fields (stored per logged-in user or anonymous device id). */
export type StoredKundliBirthDetails = {
  name: string;
  gender: string;
  dateOfBirth: string;
  timeOfBirth: string;
  cityOfBirth: string;
};

const STORAGE_NS = "kundliBirthV1";

/** Align with chat ownership: real Supabase uid vs stable anonymous id. */
export function getKundliBirthOwnerKey(): string {
  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const u = JSON.parse(raw) as { uid?: string };
      if (u?.uid && typeof u.uid === "string" && !u.uid.startsWith("anonymous-")) {
        return `user:${u.uid}`;
      }
    }
  } catch {
    /* ignore */
  }
  return `anon:${getAnonymousUserId()}`;
}

function storageKey(): string {
  return `${STORAGE_NS}:${getKundliBirthOwnerKey()}`;
}

export function loadStoredKundliBirth(): StoredKundliBirthDetails | null {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredKundliBirthDetails>;
    if (
      typeof parsed.name === "string" &&
      typeof parsed.gender === "string" &&
      typeof parsed.dateOfBirth === "string" &&
      typeof parsed.timeOfBirth === "string" &&
      typeof parsed.cityOfBirth === "string"
    ) {
      return {
        name: parsed.name,
        gender: parsed.gender,
        dateOfBirth: parsed.dateOfBirth,
        timeOfBirth: parsed.timeOfBirth,
        cityOfBirth: parsed.cityOfBirth,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function saveStoredKundliBirth(details: StoredKundliBirthDetails): void {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(details));
  } catch (e) {
    console.error("[kundliBirthStorage] Failed to save", e);
  }
}
