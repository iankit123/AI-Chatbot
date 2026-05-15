import { getDeviceId, getStoredBillingPhoneDigits } from "@/lib/supabase";
import { normalizeBillingWalletPayload } from "@/lib/normalizeWallet";
import { applyServerPhotoPackUnlocks } from "@/lib/photoPackUnlock";
import { applyServerVoicePackUnlocks } from "@/lib/voicePackUnlock";
import type { WalletDisplaySummary } from "@shared/walletDisplay";

export type PaymentProductType =
  | "chat_recharge"
  | "photo_pack"
  | "voice_chat"
  | "premium_photo"
  | "other";

export type RazorpayBillingContext = {
  device_id: string;
  phone_number: string;
  product_type: PaymentProductType;
  companion_id?: string | null;
  rate_note?: string | null;
  metadata?: Record<string, unknown>;
};

export type BillingWalletState = WalletDisplaySummary & {
  phone_number: string | null;
  name: string | null;
};

export type PaymentVerifyResult = BillingWalletState & {
  success: boolean;
  payment_id: string;
  payment_gateway?: string;
  gateway_order_id?: string;
  gateway_payment_id?: string;
  credits_allocated: number;
};

export const PAYMENT_GATEWAY_RAZORPAY = "razorpay" as const;

const WALLET_STORAGE_KEY = "wallet_credits";

export function syncWalletCreditsToLocal(credits: number): void {
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, String(Math.max(0, credits)));
    window.dispatchEvent(new Event("wallet-credits-updated"));
  } catch {
    /* ignore */
  }
}

export function readLocalWalletCredits(): number {
  try {
    return Number(localStorage.getItem(WALLET_STORAGE_KEY) || "0");
  } catch {
    return 0;
  }
}

export async function fetchBillingWallet(
  deviceId = getDeviceId(),
  phoneDigits = getStoredBillingPhoneDigits(),
): Promise<BillingWalletState | null> {
  try {
    const params = new URLSearchParams({ device_id: deviceId });
    if (phoneDigits) params.set("phone_number", phoneDigits);
    const res = await fetch(`/api/billing/wallet?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn("[billing] wallet fetch failed", res.status, await res.text().catch(() => ""));
      return null;
    }
    const raw = (await res.json()) as Record<string, unknown>;
    const data = normalizeBillingWalletPayload(raw);
    syncWalletCreditsToLocal(data.wallet_credits);
    if (data.photo_packs?.length) {
      applyServerPhotoPackUnlocks(data.photo_packs.map((p) => p.companion_id));
    }
    if (data.voice_packs?.length) {
      applyServerVoicePackUnlocks(data.voice_packs.map((p) => p.companion_id));
    }
    return data;
  } catch (err) {
    console.warn("[billing] wallet fetch error", err);
    return null;
  }
}

export async function cancelPendingPayment(paymentId: string): Promise<void> {
  try {
    await fetch(`/api/billing/payments/${encodeURIComponent(paymentId)}/cancel`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
  } catch {
    /* ignore */
  }
}
