const STORAGE_PREFIX = "voice_pack_unlocked_";

export const VOICE_PACK_UNLOCK_EVENT = "voice-pack-unlocked";

export function isVoicePackUnlocked(companionId: string): boolean {
  if (!companionId) return false;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${companionId}`) === "1";
  } catch {
    return false;
  }
}

export function setVoicePackUnlocked(companionId: string): void {
  if (!companionId) return;
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${companionId}`, "1");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent(VOICE_PACK_UNLOCK_EVENT, { detail: { companionId } }),
  );
}

export function clearVoicePackUnlock(companionId: string): void {
  if (!companionId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${companionId}`);
  } catch {
    /* ignore */
  }
}

export function clearAllVoicePackUnlocks(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function hasVoicePackInWallet(
  wallet: { voice_packs: { companion_id: string }[] },
  companionId: string,
): boolean {
  const id = companionId.trim().toLowerCase();
  if (!id) return false;
  return wallet.voice_packs.some((p) => p.companion_id === id);
}

export function syncVoicePackUnlocksFromServer(companionIds: string[]): void {
  clearAllVoicePackUnlocks();
  applyServerVoicePackUnlocks(companionIds);
}

export function applyServerVoicePackUnlocks(
  packs: { companion_id: string }[] | string[],
): void {
  for (const entry of packs) {
    const id = typeof entry === "string" ? entry : entry.companion_id;
    if (id) setVoicePackUnlocked(id);
  }
}
