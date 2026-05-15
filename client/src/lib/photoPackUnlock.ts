const STORAGE_PREFIX = "photo_pack_unlocked_";

export const PHOTO_PACK_UNLOCK_EVENT = "photo-pack-unlocked";

export function isPhotoPackUnlocked(companionId: string): boolean {
  if (!companionId) return false;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${companionId}`) === "1";
  } catch {
    return false;
  }
}

export function setPhotoPackUnlocked(companionId: string): void {
  if (!companionId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${companionId}`, "1");
    localStorage.setItem(
      `${STORAGE_PREFIX}${companionId}_at`,
      new Date().toISOString(),
    );
  } catch {
    /* ignore quota / private mode */
  }
  window.dispatchEvent(
    new CustomEvent(PHOTO_PACK_UNLOCK_EVENT, { detail: { companionId } }),
  );
}

/** Sync unlock flags from `profiles.unlocked_photo_packs` after payment verify / wallet fetch. */
export function applyServerPhotoPackUnlocks(companionIds: string[]): void {
  for (const id of companionIds) {
    if (id) setPhotoPackUnlocked(id);
  }
}

export function clearPhotoPackUnlock(companionId: string): void {
  if (!companionId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${companionId}`);
    localStorage.removeItem(`${STORAGE_PREFIX}${companionId}_at`);
  } catch {
    /* ignore */
  }
}

/** True only when wallet lists a successful photo_pack payment for this companion. */
export function hasPhotoPackInWallet(
  wallet: { photo_packs: { companion_id: string }[] },
  companionId: string,
): boolean {
  const id = companionId.trim().toLowerCase();
  if (!id) return false;
  return wallet.photo_packs.some((p) => p.companion_id === id);
}
