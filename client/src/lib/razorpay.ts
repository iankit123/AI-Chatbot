import { apiRequest } from "@/lib/queryClient";
import {
  cancelPendingPayment,
  type PaymentVerifyResult,
  type RazorpayBillingContext,
  syncWalletCreditsToLocal,
} from "@/lib/billing";
import { applyServerPhotoPackUnlocks } from "@/lib/photoPackUnlock";
import { applyServerVoicePackUnlocks } from "@/lib/voicePackUnlock";
import {
  buildRazorpayCheckoutDisplay,
  buildRazorpayGatewayNotes,
  receiptPrefixForProduct,
} from "@shared/razorpayProductCodes";
import { trackPaymentAttempted, trackPurchase } from "@/lib/metaPixel";

type RazorpayCreateOrderRequest = {
  amount_rupees: number;
  receipt?: string;
  billing: RazorpayBillingContext;
};

type RazorpayCreateOrderResponse = {
  payment_id: string;
  payment_gateway: string;
  key_id: string;
  gateway_order_id: string;
  /** Same as gateway_order_id; required by Razorpay Checkout JS. */
  razorpay_order_id: string;
  amount_paise: number;
  currency?: string;
};

type RazorpayVerifyRequest = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  payment_id?: string;
};

export type RazorpayCheckoutResult = {
  orderId: string;
  paymentId: string;
  paymentRowId: string | null;
  billing: PaymentVerifyResult;
};

type RazorpayOptions = {
  amountRupees: number;
  billing: RazorpayBillingContext;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  /** Close parent dialogs before opening Razorpay (avoids Radix overlay blocking checkout). */
  onBeforeOpen?: () => void;
};

export type RazorpayCheckoutPrepared = {
  order: RazorpayCreateOrderResponse;
  checkoutDisplay: { name: string; description: string };
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, cb: (payload: unknown) => void) => void;
    };
  }
}

let scriptLoadPromise: Promise<void> | null = null;

async function ensureRazorpayScript(): Promise<void> {
  if (window.Razorpay) return;
  if (scriptLoadPromise) return scriptLoadPromise;
  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) resolve();
      else reject(new Error("Razorpay checkout script loaded but SDK is unavailable"));
    };
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
}

/** Pre-create order while the pay dialog is open so checkout can open faster on tap. */
export async function prepareRazorpayCheckout(
  options: RazorpayOptions,
): Promise<RazorpayCheckoutPrepared> {
  await ensureRazorpayScript();
  const receiptPrefix = receiptPrefixForProduct(options.billing.product_type);
  const receipt = `${receiptPrefix}_${Date.now().toString(36)}`.slice(0, 38);
  const checkoutDisplay = buildRazorpayCheckoutDisplay(
    options.billing.product_type,
    options.amountRupees,
  );
  const order = await createOrder({
    amount_rupees: options.amountRupees,
    receipt,
    billing: options.billing,
  });
  return { order, checkoutDisplay };
}

function waitForRazorpayContainer(timeoutMs: number): Promise<boolean> {
  if (document.querySelector(".razorpay-container")) return Promise.resolve(true);
  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.querySelector(".razorpay-container")) {
        observer.disconnect();
        resolve(true);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve(!!document.querySelector(".razorpay-container"));
    }, timeoutMs);
  });
}

async function createOrder(
  payload: RazorpayCreateOrderRequest,
): Promise<RazorpayCreateOrderResponse> {
  const res = await apiRequest("POST", "/api/payments/razorpay/create-order", payload);
  return (await res.json()) as RazorpayCreateOrderResponse;
}

async function verifyPayment(payload: RazorpayVerifyRequest): Promise<PaymentVerifyResult> {
  const res = await apiRequest("POST", "/api/payments/razorpay/verify", payload);
  return (await res.json()) as PaymentVerifyResult;
}

export async function runRazorpayCheckout(
  options: RazorpayOptions,
  prepared?: RazorpayCheckoutPrepared,
): Promise<RazorpayCheckoutResult> {
  await ensureRazorpayScript();
  const { order, checkoutDisplay } = prepared ?? (await prepareRazorpayCheckout(options));
  if (!order.razorpay_order_id && !order.gateway_order_id) {
    throw new Error("Server did not return a Razorpay order id");
  }
  if (!order.key_id) {
    throw new Error("Razorpay key_id missing from server response");
  }
  if (!window.Razorpay) throw new Error("Razorpay SDK unavailable");

  const paymentRowId = order.payment_id ?? null;
  if (paymentRowId) {
    console.info("[razorpay] payment_attempts pending row:", paymentRowId);
  } else {
    console.warn(
      "[razorpay] No payment_id in create-order response — restart API (npm run dev) and run migrations/0003_payment_ledger.sql. Checkout will still open.",
    );
  }

  const orderId = order.razorpay_order_id || order.gateway_order_id;

  return new Promise<RazorpayCheckoutResult>((resolve, reject) => {
    const RazorpayCtor = window.Razorpay;
    if (!RazorpayCtor) {
      reject(new Error("Razorpay checkout script is not loaded"));
      return;
    }
    let settled = false;
    const cleanupOverlayClass = () => {
      document.body.classList.remove("razorpay-checkout-active");
    };
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanupOverlayClass();
      fn();
    };

    const instance = new RazorpayCtor({
      key: order.key_id,
      currency: order.currency || "INR",
      order_id: orderId,
      name: checkoutDisplay.name,
      description: checkoutDisplay.description,
      prefill: options.prefill,
      notes: paymentRowId
        ? buildRazorpayGatewayNotes({
            paymentId: paymentRowId,
            productType: options.billing.product_type,
            companionId: options.billing.companion_id,
          })
        : {},
      handler: async (response: Record<string, unknown>) => {
        try {
          const razorpay_order_id = String(response.razorpay_order_id || "");
          const razorpay_payment_id = String(response.razorpay_payment_id || "");
          const razorpay_signature = String(response.razorpay_signature || "");
          if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            throw new Error("Missing Razorpay success fields");
          }
          const billing = await verifyPayment({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            ...(paymentRowId ? { payment_id: paymentRowId } : {}),
          });
          syncWalletCreditsToLocal(billing.wallet_credits);
          if (billing.photo_packs?.length) {
            applyServerPhotoPackUnlocks(
              billing.photo_packs.map((p) => p.companion_id),
            );
          }
          if (billing.voice_packs?.length) {
            applyServerVoicePackUnlocks(
              billing.voice_packs.map((p) => p.companion_id),
            );
          }
          try {
            trackPurchase({
              value: options.amountRupees,
              product_type: options.billing.product_type,
              companion_id: options.billing.companion_id,
              order_id: razorpay_order_id,
              payment_id: razorpay_payment_id,
            });
          } catch {
            /* analytics must not block payment */
          }
          finish(() =>
            resolve({
              orderId: razorpay_order_id,
              paymentId: razorpay_payment_id,
              paymentRowId,
              billing,
            }),
          );
        } catch (err) {
          finish(() => reject(err));
        }
      },
      modal: {
        ondismiss: () => {
          if (paymentRowId) void cancelPendingPayment(paymentRowId);
          finish(() => reject(new Error("Payment cancelled")));
        },
      },
    });
    instance.on("payment.failed", () => {
      if (paymentRowId) void cancelPendingPayment(paymentRowId);
      finish(() => reject(new Error("Payment failed")));
    });

    options.onBeforeOpen?.();
    document.body.classList.add("razorpay-checkout-active");

    void (async () => {
      try {
        instance.open();
        const appeared = await waitForRazorpayContainer(4000);
        if (!appeared) {
          cleanupOverlayClass();
          if (paymentRowId) void cancelPendingPayment(paymentRowId);
          finish(() =>
            reject(
              new Error(
                "Payment window did not open. Close other pop-ups and try again.",
              ),
            ),
          );
          return;
        }
        try {
          trackPaymentAttempted({
            value: options.amountRupees,
            product_type: options.billing.product_type,
            companion_id: options.billing.companion_id,
          });
        } catch {
          /* analytics must not block payment */
        }
      } catch (err) {
        cleanupOverlayClass();
        if (paymentRowId) void cancelPendingPayment(paymentRowId);
        finish(() =>
          reject(err instanceof Error ? err : new Error("Failed to open payment")),
        );
      }
    })();
  });
}
