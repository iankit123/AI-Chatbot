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

export function applyServerVoicePackUnlocks(
  packs: { companion_id: string }[] | string[],
): void {
  for (const entry of packs) {
    const id = typeof entry === "string" ? entry : entry.companion_id;
    if (id) setVoicePackUnlocked(id);
  }
}
