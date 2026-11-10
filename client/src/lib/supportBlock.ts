/**
 * After a self-harm message, chat is closed on this device: the current chat shows the
 * helpline in place of the message box, and later visits show SupportBlockedPage.
 */
const SUPPORT_BLOCK_KEY = "puchlo_support_block";

export function isSupportBlocked(): boolean {
  try {
    return Boolean(localStorage.getItem(SUPPORT_BLOCK_KEY));
  } catch {
    return false;
  }
}

export function markSupportBlocked(): void {
  try {
    localStorage.setItem(SUPPORT_BLOCK_KEY, new Date().toISOString());
  } catch {
    /* storage blocked: the chat still closes for this session */
  }
}
