/**
 * Little Bites (yobaby.in) payments, taken on puchlo.in's approved Razorpay account until yobaby.in's own
 * website approval comes through. Kept apart from puchlo's billing (payment_attempts / wallet): nothing here
 * touches puchlo's database, and these orders carry notes.site = "yobaby.in".
 *
 *   GET  /api/yb/checkout?phone=98xxxxxxxx&uid=<yobaby user id>
 *        yobaby.in's "Pay ₹29" sends the buyer here: creates the Razorpay order and opens Checkout.
 *   POST /api/yb/callback
 *        Razorpay's redirect after paying (callback_url). Verifies the signature, reads the phone and uid back from
 *        the order's notes, records the payment in yobaby's Supabase (record_payment() adds 30 days of Pro to that
 *        number) and sends the buyer back to yobaby.in/?pay=ok (or pending / failed; closing Checkout → cancelled).
 *
 * Env: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET (puchlo's), YOBABY_SUPABASE_SECRET_KEY (the yobaby Supabase project's
 * secret / service_role key); optional YOBABY_SUPABASE_URL and YOBABY_URL.
 */
import crypto from "crypto";
import type { Express, Request, Response } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** What yobaby.in sells here. Keep in step with MARKETS.IN in yobaby's site/account.js. */
const PRODUCTS = {
  pro_1m: { rupees: 29, label: "Pro · 1 month" },
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PayStatus = "ok" | "pending" | "failed" | "cancelled";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  /** Razorpay returns [] when an order has no notes. */
  notes: Record<string, string> | [];
};

const yobabyUrl = () => (process.env.YOBABY_URL?.trim() || "https://www.yobaby.in").replace(/\/+$/, "");
const backUrl = (status?: PayStatus) => `${yobabyUrl()}/${status ? `?pay=${status}` : ""}`;

function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)");
  }
  return { keyId, keySecret };
}

let yobabyClient: SupabaseClient | null = null;
function yobabyDb(): SupabaseClient {
  const key = process.env.YOBABY_SUPABASE_SECRET_KEY?.trim();
  if (!key) throw new Error("YOBABY_SUPABASE_SECRET_KEY is not set");
  yobabyClient ??= createClient(
    process.env.YOBABY_SUPABASE_URL?.trim() || "https://waoctzqtrtckqdztvhxx.supabase.co",
    key,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return yobabyClient;
}

async function razorpay<T>(method: "GET" | "POST", apiPath: string, body?: unknown): Promise<T> {
  const { keyId, keySecret } = getRazorpayCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const upstream = await fetch(`https://api.razorpay.com/v1${apiPath}`, {
    method,
    headers: {
      Authorization: `Basic ${auth}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await upstream.text();
  if (!upstream.ok) throw new Error(`Razorpay ${method} ${apiPath} ${upstream.status}: ${raw.slice(0, 400)}`);
  return JSON.parse(raw) as T;
}

function validSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = getRazorpayCredentials();
  const expected = crypto.createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return (
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(signature, "utf8"))
  );
}

/** Opens Razorpay Checkout as soon as it loads; the button is there if it was closed or blocked. */
function checkoutPage(options: Record<string, unknown>, rupees: number): string {
  // JSON inside <script>: escape "<" so no value can end the tag.
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, "\\u003c");
  const icon = `${yobabyUrl()}/icons/icon-192.png`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Little Bites · Payment</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #FFF9F2; color: #2B2118;
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { width: min(360px, calc(100% - 32px)); text-align: center; }
  img { width: 64px; height: 64px; border-radius: 16px; }
  h1 { margin: 12px 0 4px; font-size: 22px; }
  p { margin: 0 0 20px; color: #6B5E52; }
  button { width: 100%; padding: 14px; border: 0; border-radius: 14px; background: #FF6B57; color: #fff;
    font: inherit; font-weight: 700; cursor: pointer; }
  a { display: inline-block; margin-top: 16px; color: #6B5E52; }
  small { display: block; margin-top: 24px; color: #9A8C80; }
</style>
</head>
<body>
<main>
  <img src="${icon}" alt="">
  <h1>Little Bites Pro</h1>
  <p>₹${rupees} · every recipe and video for 1 month</p>
  <button id="pay" type="button">Pay ₹${rupees}</button>
  <a href="${backUrl("cancelled")}">Back to Little Bites</a>
  <small>Secure payment by Razorpay</small>
</main>
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
  var options = ${json(options)};
  options.modal = { ondismiss: function () { location.replace(${json(backUrl("cancelled"))}); } };
  var checkout = null;
  function pay() {
    if (!window.Razorpay) return location.reload();
    checkout = checkout || new Razorpay(options);
    checkout.open();
  }
  document.getElementById("pay").addEventListener("click", pay);
  if (window.Razorpay) pay();
</script>
</body>
</html>`;
}

export function registerYobabyPayRoutes(app: Express): void {
  app.get("/api/yb/checkout", async (req: Request, res: Response) => {
    const phone = String(req.query.phone ?? "");
    const uid = String(req.query.uid ?? "");
    if (!/^[6-9]\d{9}$/.test(phone)) return res.redirect(303, backUrl("failed"));
    const product = PRODUCTS.pro_1m;
    try {
      yobabyDb(); // don't take money that can't be recorded
      const { keyId } = getRazorpayCredentials();
      const order = await razorpay<RazorpayOrder>("POST", "/orders", {
        amount: product.rupees * 100,
        currency: "INR",
        receipt: `YB_${Date.now().toString(36).toUpperCase()}`,
        notes: { site: "yobaby.in", product: "pro_1m", phone, ...(UUID.test(uid) ? { uid } : {}) },
      });
      const proto = String(req.get("x-forwarded-proto") || req.protocol).split(",")[0];
      res.set("Cache-Control", "no-store");
      res.type("html").send(
        checkoutPage(
          {
            key: keyId,
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            name: "Little Bites",
            description: product.label,
            image: `${yobabyUrl()}/icons/icon-192.png`,
            prefill: { contact: `+91${phone}` },
            callback_url: `${proto}://${req.get("host")}/api/yb/callback`,
            redirect: true,
            theme: { color: "#FF6B57" },
          },
          product.rupees,
        ),
      );
    } catch (error) {
      console.error("[yobaby-pay] checkout failed:", error);
      res.redirect(303, backUrl("failed"));
    }
  });

  app.post("/api/yb/callback", async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, string | undefined>;
    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    if (!orderId || !paymentId || !signature) {
      console.warn("[yobaby-pay] payment failed:", body["error[code]"], body["error[description]"]);
      return res.redirect(303, backUrl("failed"));
    }
    let verified = false;
    try {
      verified = validSignature(orderId, paymentId, signature);
    } catch (error) {
      console.error("[yobaby-pay] signature check failed:", error);
    }
    if (!verified) {
      console.warn(`[yobaby-pay] invalid signature order=${orderId} payment=${paymentId}`);
      return res.redirect(303, backUrl("failed"));
    }

    try {
      // The phone and uid come from the order we created, not from the browser.
      const order = await razorpay<RazorpayOrder>("GET", `/orders/${encodeURIComponent(orderId)}`);
      const notes = Array.isArray(order.notes) ? {} : order.notes;
      if (notes.site !== "yobaby.in" || !notes.phone) {
        console.warn(`[yobaby-pay] order ${orderId} is not a yobaby.in order`);
        return res.redirect(303, backUrl("failed"));
      }
      const { data, error } = await yobabyDb().rpc("record_payment", {
        p_payment_id: paymentId,
        p_order_id: orderId,
        p_phone: notes.phone,
        p_user_id: notes.uid || null,
        p_product: notes.product || "pro_1m",
        p_amount: order.amount / 100,
        p_currency: order.currency,
      });
      if (error) throw error;
      console.log(`[yobaby-pay] paid order=${orderId} payment=${paymentId}`, data);
      res.redirect(303, backUrl("ok"));
    } catch (error) {
      // Money taken (signature checked) but Pro not recorded: add it from these ids by hand.
      console.error(`[yobaby-pay] PAID BUT NOT RECORDED order=${orderId} payment=${paymentId}:`, error);
      res.redirect(303, backUrl("pending"));
    }
  });

  // Callback URL opened again (reload, back button): just go back.
  app.get("/api/yb/callback", (_req: Request, res: Response) => res.redirect(303, backUrl()));
}
