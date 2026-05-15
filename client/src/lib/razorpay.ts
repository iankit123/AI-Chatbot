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
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
  return scriptLoadPromise;
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
): Promise<RazorpayCheckoutResult> {
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

  return new Promise<RazorpayCheckoutResult>((resolve, reject) => {
    const RazorpayCtor = window.Razorpay;
    if (!RazorpayCtor) {
      reject(new Error("Razorpay checkout script is not loaded"));
      return;
    }
    const instance = new RazorpayCtor({
      key: order.key_id,
      amount: order.amount_paise,
      currency: order.currency || "INR",
      order_id: order.razorpay_order_id || order.gateway_order_id,
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
          resolve({
            orderId: razorpay_order_id,
            paymentId: razorpay_payment_id,
            paymentRowId,
            billing,
          });
        } catch (err) {
          reject(err);
        }
      },
      modal: {
        ondismiss: () => {
          if (paymentRowId) void cancelPendingPayment(paymentRowId);
          reject(new Error("Payment cancelled"));
        },
      },
    });
    instance.on("payment.failed", () => {
      if (paymentRowId) void cancelPendingPayment(paymentRowId);
      reject(new Error("Payment failed"));
    });
    instance.open();
  });
}
