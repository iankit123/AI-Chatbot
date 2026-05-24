import { fetchBillingWallet } from "@/lib/billing";
import { clearAllPhotoPackUnlocks } from "@/lib/photoPackUnlock";
import { clearAllVoicePackUnlocks } from "@/lib/voicePackUnlock";
import { getDeviceId, getStoredBillingPhoneDigits } from "@/lib/supabase";

export const ACCOUNT_SESSION_REFRESH_EVENT = "account-session-refreshed";

/** Drop cached pack flags before re-loading entitlements for the signed-in phone. */
export function clearLocalEntitlementCache(): void {
  clearAllVoicePackUnlocks();
  clearAllPhotoPackUnlocks();
}

/** Re-sync wallet + pack unlocks from server for the current phone on this device. */
export async function refreshAccountSession(): Promise<void> {
  clearLocalEntitlementCache();
  const phone = getStoredBillingPhoneDigits();
  await fetchBillingWallet(getDeviceId(), phone ?? undefined);
  window.dispatchEvent(new Event(ACCOUNT_SESSION_REFRESH_EVENT));
}
