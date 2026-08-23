import type { AppEventName } from "@shared/appEvents";
import { logAppEventToServer } from "@/lib/logAppEvent";

/** Meta Pixel ID — base script lives in client/index.html */
export const META_PIXEL_ID = "1838700220429198";

type FbqCommand = "init" | "track" | "trackCustom";

declare global {
  interface Window {
    fbq?: (
      command: FbqCommand,
      eventName: string,
      params?: Record<string, unknown>,
    ) => void;
  }
}

function fbqReady(): boolean {
  return typeof window !== "undefined" && typeof window.fbq === "function";
}

function trackCustom(
  eventName: AppEventName,
  params?: Record<string, unknown>,
): void {
  try {
    if (fbqReady()) {
      window.fbq!("trackCustom", eventName, params);
    }
  } catch {
    /* Meta Pixel must not block checkout */
  }
  logAppEventToServer(eventName, params);
}

/** Guest or signed-in user completed name/age (or phone) profile setup. */
export function trackProfileCreated(
  params?: Record<string, unknown>,
): void {
  trackCustom("profile_created", params);
}

/**
 * User sent their first message in this chat (per companion, per browser session).
 * This is the mid-funnel signal Meta ad sets optimize for — it fires far more often
 * than `purchase`, so campaigns can actually exit the learning phase on a small budget.
 */
export function trackChatStarted(params: {
  companion_id: string;
  companion_name?: string;
  language?: string;
  is_authenticated?: boolean;
}): void {
  const companionId = params.companion_id || "unknown";
  const sessionKey = `chat_started_${companionId}`;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    /* private mode / storage disabled — fall through and still fire once per page load */
  }
  trackCustom("chat_started", params);
}

/** User hit the chat recharge paywall (free messages exhausted). */
export function trackPaywallTriggered(
  params?: Record<string, unknown>,
): void {
  trackCustom("paywall_triggered", params);
}

/** Razorpay checkout opened after order creation. */
export function trackPaymentAttempted(params: {
  value: number;
  currency?: string;
  product_type?: string;
  companion_id?: string;
}): void {
  trackCustom("payment_attempted", {
    currency: "INR",
    ...params,
  });
}

/** Payment verified successfully. */
export function trackPurchase(params: {
  value: number;
  currency?: string;
  product_type?: string;
  companion_id?: string;
  order_id?: string;
  payment_id?: string;
}): void {
  const { value, currency = "INR", order_id, payment_id, ...rest } = params;
  trackCustom("purchase", {
    value,
    currency,
    order_id,
    payment_id,
    ...rest,
  });
  if (!fbqReady()) return;
  window.fbq!("track", "Purchase", {
    value,
    currency,
    content_ids: order_id ? [order_id] : undefined,
    ...rest,
  });
}
