import { createClient } from "@supabase/supabase-js";
import {
  CHAT_MESSAGE_COST_RUPEES,
  roundWalletRupees,
  serverShouldChargeForMessage,
} from "@shared/chatBilling";
import { buildWalletDisplaySummary, type WalletDisplaySummary } from "@shared/walletDisplay";

export type BillingWalletState = WalletDisplaySummary & {
  phone_number: string | null;
  name: string | null;
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export type PaymentStatus = "pending" | "success" | "failed" | "cancelled";

/** PSP identifier stored on each payment row. */
export const PAYMENT_GATEWAY_RAZORPAY = "razorpay" as const;
export type PaymentGateway = typeof PAYMENT_GATEWAY_RAZORPAY | (string & {});

export type PaymentProductType =
  | "chat_recharge"
  | "photo_pack"
  | "voice_chat"
  | "premium_photo"
  | "other";

export interface UpsertProfileInput {
  deviceId: string;
  phoneNumber?: string | null;
  name?: string | null;
}

export const upsertProfileRow = async (input: UpsertProfileInput) => {
  const supabase = getSupabaseAdmin();
  const digits = input.phoneNumber?.replace(/\D/g, "").slice(-10);

  const row: Record<string, unknown> = {
    device_id: input.deviceId,
    updated_at: new Date().toISOString(),
  };
  if (digits) row.phone_number = digits;
  if (input.name?.trim()) row.name = input.name.trim();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "device_id" })
    .select("id, device_id, phone_number, name, wallet_credits, unlocked_photo_packs, updated_at")
    .single();

  if (error) throw error;
  return data;
};

export interface CreatePendingPaymentInput {
  deviceId: string;
  phoneNumber: string;
  amountRupees: number;
  productType: PaymentProductType;
  paymentGateway?: PaymentGateway | null;
  companionId?: string | null;
  rateNote?: string | null;
  metadata?: Record<string, unknown>;
}

export function creditsForPayment(
  productType: PaymentProductType,
  amountRupees: number,
  metadata?: Record<string, unknown>,
): number {
  if (productType !== "chat_recharge") return 0;
  const bonus = String(metadata?.plan_bonus_label ?? "");
  if (bonus.includes("100%")) return amountRupees * 2;
  if (bonus.includes("50%")) return amountRupees * 1.5;
  return amountRupees;
}

type PaymentRowLite = {
  id?: string;
  product_type?: string | null;
  companion_id?: string | null;
  amount_rupees?: number | null;
  metadata?: unknown;
};

/** ₹29 photo pack activation (see PhotoPackActivationDialog). */
const PHOTO_PACK_AMOUNT_RUPEES = 29;

/** Column or metadata (legacy rows may only have metadata.source). */
export function resolvePaymentProductType(row: PaymentRowLite): PaymentProductType {
  const col = String(row.product_type ?? "").trim().toLowerCase();
  if (
    col === "chat_recharge" ||
    col === "photo_pack" ||
    col === "voice_chat" ||
    col === "premium_photo"
  ) {
    return col as PaymentProductType;
  }
  const meta = (row.metadata as Record<string, unknown>) ?? {};
  const source = String(meta.source ?? "").toLowerCase();
  if (source === "photo_pack_activation") return "photo_pack";
  if (source === "chat_recharge_gate") return "chat_recharge";
  if (
    source === "voice_chat_activation" ||
    source === "voice_chat_activation_request"
  ) {
    return "voice_chat";
  }
  const product = String(meta.product ?? meta.product_type ?? "").toLowerCase();
  if (product === "photo_pack" || product.includes("photo")) return "photo_pack";
  if (product === "voice_chat" || product.includes("voice")) return "voice_chat";
  if (product === "chat_recharge") return "chat_recharge";

  const amount = Number(row.amount_rupees ?? 0);
  if (amount === PHOTO_PACK_AMOUNT_RUPEES && resolvePaymentCompanionId(row)) {
    return "photo_pack";
  }

  return "other";
}

export function resolvePaymentCompanionId(row: PaymentRowLite): string {
  if (row.companion_id) {
    return String(row.companion_id).trim().toLowerCase();
  }
  const meta = (row.metadata as Record<string, unknown>) ?? {};
  const fromMeta = meta.companion_id ?? meta.companionId;
  if (fromMeta) return String(fromMeta).trim().toLowerCase();
  const productKey = String(meta.product_key ?? "");
  const keyMatch = productKey.match(/^([a-z0-9]+)_/i);
  if (keyMatch) return keyMatch[1].toLowerCase();
  const display = String(meta.companion_display_name ?? "").trim().toLowerCase();
  if (display) return display;
  return "";
}

function isMissingColumnError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("column") &&
    (lower.includes("does not exist") || lower.includes("could not find"))
  );
}

let walletSpentColumnExists: boolean | undefined;

async function hasWalletSpentColumn(): Promise<boolean> {
  if (walletSpentColumnExists !== undefined) return walletSpentColumnExists;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("profiles").select("wallet_spent").limit(0);
  walletSpentColumnExists = !error || !isMissingColumnError(error);
  return walletSpentColumnExists;
}

function withoutWalletSpent<T extends Record<string, unknown>>(row: T): T {
  if (walletSpentColumnExists === false) {
    const next = { ...row };
    delete next.wallet_spent;
    return next;
  }
  return row;
}

export const createPendingPaymentRow = async (input: CreatePendingPaymentInput) => {
  const supabase = getSupabaseAdmin();
  const digits = input.phoneNumber.replace(/\D/g, "").slice(-10);
  const metadata: Record<string, unknown> = {
    ...(input.metadata ?? {}),
    product_type: input.productType,
    payment_gateway: input.paymentGateway ?? null,
    lifecycle: "pending",
  };

  const fullRow = {
    device_id: input.deviceId,
    phone_number: digits,
    amount_rupees: input.amountRupees,
    companion_id: input.companionId ?? null,
    rate_note: input.rateNote ?? null,
    product_type: input.productType,
    payment_gateway: input.paymentGateway ?? null,
    status: "pending",
    credits_allocated: 0,
    metadata,
  };

  let result = await supabase
    .from("payment_attempts")
    .insert(fullRow)
    .select("id, status, payment_gateway, created_at")
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    console.warn(
      "[billing] Extended payment_attempts columns missing — insert using base schema. Run migrations/0003_payment_ledger.sql",
    );
    result = await supabase
      .from("payment_attempts")
      .insert({
        device_id: input.deviceId,
        phone_number: digits,
        amount_rupees: input.amountRupees,
        companion_id: input.companionId ?? null,
        rate_note: input.rateNote ?? null,
        status: "pending",
        metadata,
      })
      .select("id, status, created_at")
      .single();
  }

  if (result.error) throw result.error;
  const data = result.data as {
    id: string;
    status: PaymentStatus;
    payment_gateway?: string | null;
    created_at: string;
  };

  console.log(
    `[billing] payment_attempts pending row id=${data.id} device=${input.deviceId} product=${input.productType} gateway=${input.paymentGateway ?? "—"}`,
  );

  return {
    id: data.id,
    status: data.status,
    payment_gateway: data.payment_gateway ?? input.paymentGateway ?? null,
    created_at: data.created_at,
  };
};

export const attachGatewayOrderToPayment = async (
  paymentId: string,
  paymentGateway: PaymentGateway,
  gatewayOrderId: string,
) => {
  const supabase = getSupabaseAdmin();
  const updatedAt = new Date().toISOString();

  let result = await supabase
    .from("payment_attempts")
    .update({
      payment_gateway: paymentGateway,
      gateway_order_id: gatewayOrderId,
      updated_at: updatedAt,
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id, payment_gateway, gateway_order_id, status")
    .single();

  if (result.error && isMissingColumnError(result.error)) {
    const { data: existing } = await supabase
      .from("payment_attempts")
      .select("metadata")
      .eq("id", paymentId)
      .single();
    const meta = (existing?.metadata as Record<string, unknown>) ?? {};
    result = await supabase
      .from("payment_attempts")
      .update({
        metadata: {
          ...meta,
          payment_gateway: paymentGateway,
          gateway_order_id: gatewayOrderId,
        },
        updated_at: updatedAt,
      })
      .eq("id", paymentId)
      .eq("status", "pending")
      .select("id, status")
      .single();
  }

  if (result.error) throw result.error;
  console.log(
    `[billing] attached gateway order payment_id=${paymentId} gateway=${paymentGateway} order=${gatewayOrderId}`,
  );
  return result.data;
};

export const findPendingPaymentByGatewayOrder = async (
  paymentGateway: PaymentGateway,
  gatewayOrderId: string,
) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_attempts")
    .select(
      "id, device_id, phone_number, amount_rupees, companion_id, product_type, payment_gateway, status, metadata",
    )
    .eq("payment_gateway", paymentGateway)
    .eq("gateway_order_id", gatewayOrderId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

async function ensureProfileRow(deviceId: string, phoneDigits?: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, device_id, wallet_credits, unlocked_photo_packs")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (existing) return existing;

  const row: Record<string, unknown> = {
    device_id: deviceId,
    wallet_credits: 0,
    unlocked_photo_packs: [],
    updated_at: new Date().toISOString(),
  };
  if (phoneDigits) row.phone_number = phoneDigits;

  const { data, error } = await supabase
    .from("profiles")
    .insert(row)
    .select("id, device_id, wallet_credits, unlocked_photo_packs")
    .single();

  if (error) throw error;
  return data;
}

export const completePaymentSuccess = async (input: {
  paymentId: string;
  paymentGateway: PaymentGateway;
  gatewayOrderId: string;
  gatewayPaymentId: string;
}) => {
  const supabase = getSupabaseAdmin();

  const { data: payment, error: fetchErr } = await supabase
    .from("payment_attempts")
    .select(
      "id, device_id, phone_number, amount_rupees, companion_id, product_type, payment_gateway, status, metadata",
    )
    .eq("id", input.paymentId)
    .single();

  if (fetchErr) throw fetchErr;
  if (!payment) throw new Error("Payment row not found");
  const deviceId = String(payment.device_id);
  const phoneDigits = String(payment.phone_number ?? "").replace(/\D/g, "").slice(-10);

  if (payment.status === "success") {
    if (phoneDigits.length === 10) {
      return syncWalletCreditsForPhone(phoneDigits, deviceId);
    }
    return getBillingState(deviceId, phoneDigits || null);
  }
  if (payment.status !== "pending" && payment.status !== "cancelled") {
    throw new Error(`Payment is already ${payment.status}`);
  }

  const productType = (payment.product_type as PaymentProductType) || "other";
  const metadata = (payment.metadata as Record<string, unknown>) ?? {};
  const credits = creditsForPayment(
    productType,
    Number(payment.amount_rupees),
    metadata,
  );
  const companionId = payment.companion_id ? String(payment.companion_id) : null;

  const { error: payErr } = await supabase
    .from("payment_attempts")
    .update({
      status: "success",
      payment_gateway: input.paymentGateway,
      gateway_order_id: input.gatewayOrderId,
      gateway_payment_id: input.gatewayPaymentId,
      credits_allocated: credits,
      metadata: {
        ...metadata,
        payment_status: "success",
        payment_gateway: input.paymentGateway,
        completed_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.paymentId);

  if (payErr) throw payErr;

  await ensureProfileRow(deviceId, phoneDigits);

  const synced =
    phoneDigits.length === 10
      ? await syncWalletCreditsForPhone(phoneDigits, deviceId)
      : await getBillingState(deviceId, phoneDigits || null);

  return {
    payment_id: input.paymentId,
    payment_gateway: input.paymentGateway,
    gateway_order_id: input.gatewayOrderId,
    gateway_payment_id: input.gatewayPaymentId,
    status: "success" as const,
    credits_allocated: credits,
    wallet_credits: synced.wallet_credits,
    unlocked_photo_packs: synced.unlocked_photo_packs,
    phone_number: synced.phone_number,
    name: synced.name,
  };
};

export const markPaymentCancelled = async (paymentId: string) => {
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("payment_attempts")
    .select("metadata")
    .eq("id", paymentId)
    .eq("status", "pending")
    .maybeSingle();

  if (!existing) return null;

  const meta = (existing.metadata as Record<string, unknown>) ?? {};
  const { data, error } = await supabase
    .from("payment_attempts")
    .update({
      status: "cancelled",
      metadata: { ...meta, payment_status: "cancelled", cancelled_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const markPaymentFailed = async (
  paymentId: string,
  reason?: string,
) => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_attempts")
    .update({
      status: "failed",
      metadata: { payment_status: "failed", failure_reason: reason ?? null },
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending")
    .select("id, status")
    .maybeSingle();

  if (error) throw error;
  return data;
};

type PurchasedCreditsResult = {
  totalCredits: number;
  unlockedPacks: Set<string>;
  deviceIds: Set<string>;
};

async function sumPurchasedCreditsForPhone(
  phoneDigits: string,
  activeDeviceId?: string,
): Promise<PurchasedCreditsResult> {
  const supabase = getSupabaseAdmin();
  const digits = phoneDigits.replace(/\D/g, "").slice(-10);

  const { data: payments, error: payErr } = await supabase
    .from("payment_attempts")
    .select(
      "id, device_id, amount_rupees, product_type, metadata, credits_allocated, companion_id",
    )
    .eq("phone_number", digits)
    .eq("status", "success");

  if (payErr) throw payErr;

  let totalCredits = 0;
  const unlockedPacks = new Set<string>();
  const deviceIds = new Set<string>();
  if (activeDeviceId) deviceIds.add(activeDeviceId);

  for (const row of payments ?? []) {
    if (row.device_id) deviceIds.add(String(row.device_id));
    const productType = resolvePaymentProductType(row);
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    let allocated = Number(row.credits_allocated ?? 0);

    if (productType === "chat_recharge") {
      if (allocated <= 0) {
        allocated = creditsForPayment(productType, Number(row.amount_rupees), meta);
        if (allocated > 0) {
          await supabase
            .from("payment_attempts")
            .update({ credits_allocated: allocated })
            .eq("id", row.id);
        }
      }
      totalCredits += allocated;
    } else if (allocated > 0 && row.id) {
      // Legacy rows: photo/voice packs must not add chat wallet credits.
      await supabase
        .from("payment_attempts")
        .update({ credits_allocated: 0 })
        .eq("id", row.id);
    }

    if (productType === "photo_pack") {
      const companionId = resolvePaymentCompanionId(row);
      if (companionId) unlockedPacks.add(companionId);
    }
  }

  return { totalCredits, unlockedPacks, deviceIds };
}

async function sumPurchasedCreditsForDevice(deviceId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { data: payments, error: payErr } = await supabase
    .from("payment_attempts")
    .select("id, amount_rupees, product_type, metadata, credits_allocated")
    .eq("device_id", deviceId)
    .eq("status", "success");

  if (payErr) throw payErr;

  let totalCredits = 0;
  for (const row of payments ?? []) {
    const productType = resolvePaymentProductType(row);
    const meta = (row.metadata as Record<string, unknown>) ?? {};
    let allocated = Number(row.credits_allocated ?? 0);
    if (productType !== "chat_recharge") continue;
    if (allocated <= 0) {
      allocated = creditsForPayment(productType, Number(row.amount_rupees), meta);
    }
    totalCredits += allocated;
  }
  return totalCredits;
}

async function readWalletSpentForPhone(phoneDigits: string): Promise<number> {
  if (!(await hasWalletSpentColumn())) return 0;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("wallet_spent")
    .eq("phone_number", phoneDigits)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) {
    if (isMissingColumnError(error)) return 0;
    throw error;
  }
  return Number(data?.[0]?.wallet_spent ?? 0);
}

async function readWalletSpentForDevice(deviceId: string): Promise<number> {
  if (!(await hasWalletSpentColumn())) return 0;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("wallet_spent")
    .eq("device_id", deviceId)
    .maybeSingle();

  if (error) {
    if (isMissingColumnError(error)) return 0;
    throw error;
  }
  return Number(data?.wallet_spent ?? 0);
}

function walletBalance(purchased: number, spent: number): number {
  return Math.max(0, roundWalletRupees(purchased - spent));
}

type PaymentEntitlements = {
  hasAnyPayment: boolean;
  hasChatRecharge: boolean;
  photoPackCompanionIds: string[];
  voicePackCompanionIds: string[];
};

async function fetchPaymentEntitlements(
  phoneDigits?: string,
  deviceId?: string,
): Promise<PaymentEntitlements> {
  const supabase = getSupabaseAdmin();
  const digits = phoneDigits?.replace(/\D/g, "").slice(-10) || "";

  if (digits.length !== 10 && !deviceId) {
    return {
      hasAnyPayment: false,
      hasChatRecharge: false,
      photoPackCompanionIds: [],
      voicePackCompanionIds: [],
    };
  }

  const seen = new Set<string>();
  const rows: PaymentRowLite[] = [];

  const collect = (batch: PaymentRowLite[] | null) => {
    for (const row of batch ?? []) {
      const id = row.id ? String(row.id) : JSON.stringify(row);
      if (seen.has(id)) continue;
      seen.add(id);
      rows.push(row);
    }
  };

  const select =
    "id, product_type, companion_id, metadata, amount_rupees, phone_number, device_id, status";

  if (digits.length === 10) {
    const { data, error } = await supabase
      .from("payment_attempts")
      .select(select)
      .eq("phone_number", digits)
      .eq("status", "success");
    if (error) throw error;
    collect(data);
  }

  if (deviceId) {
    const { data, error } = await supabase
      .from("payment_attempts")
      .select(select)
      .eq("device_id", deviceId)
      .eq("status", "success");
    if (error) throw error;
    collect(data);
  }

  let hasAnyPayment = false;
  let hasChatRecharge = false;
  const photoPackCompanionIds: string[] = [];
  const voicePackCompanionIds: string[] = [];

  for (const row of rows) {
    hasAnyPayment = true;
    const productType = resolvePaymentProductType(row);
    const companionId = resolvePaymentCompanionId(row);
    if (productType === "chat_recharge") hasChatRecharge = true;
    if (productType === "photo_pack" && companionId) photoPackCompanionIds.push(companionId);
    if (productType === "voice_chat" && companionId) voicePackCompanionIds.push(companionId);
  }

  return {
    hasAnyPayment,
    hasChatRecharge,
    photoPackCompanionIds,
    voicePackCompanionIds,
  };
}

function toBillingWalletState(
  base: {
    chatBalance: number;
    unlockedPhotoPacks: string[];
    phone_number: string | null;
    name: string | null;
  },
  entitlements: PaymentEntitlements,
): BillingWalletState {
  const summary = buildWalletDisplaySummary({
    chatBalance: base.chatBalance,
    unlockedPhotoPacks: base.unlockedPhotoPacks,
    hasAnyPayment: entitlements.hasAnyPayment,
    hasChatRecharge: entitlements.hasChatRecharge,
    photoPackCompanionIds: entitlements.photoPackCompanionIds,
    voicePackCompanionIds: entitlements.voicePackCompanionIds,
  });
  return {
    ...summary,
    phone_number: base.phone_number,
    name: base.name,
  };
}

/**
 * Recompute wallet + photo unlocks from all successful payments for this phone,
 * then mirror balances onto every profile row for that phone (and the active device).
 */
export const syncWalletCreditsForPhone = async (
  phoneDigits: string,
  activeDeviceId?: string,
) => {
  const supabase = getSupabaseAdmin();
  const digits = phoneDigits.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) {
    throw new Error("Invalid phone for wallet sync");
  }

  const { totalCredits: purchased, unlockedPacks, deviceIds } =
    await sumPurchasedCreditsForPhone(digits, activeDeviceId);
  const walletSpent = await readWalletSpentForPhone(digits);
  const balance = walletBalance(purchased, walletSpent);

  const packList = Array.from(unlockedPacks);
  const updatedAt = new Date().toISOString();

  await hasWalletSpentColumn();
  await supabase
    .from("profiles")
    .update(
      withoutWalletSpent({
        wallet_credits: balance,
        unlocked_photo_packs: packList,
        phone_number: digits,
        updated_at: updatedAt,
      }),
    )
    .eq("phone_number", digits);

  for (const did of Array.from(deviceIds)) {
    await supabase.from("profiles").upsert(
      withoutWalletSpent({
        device_id: did,
        phone_number: digits,
        wallet_credits: balance,
        wallet_spent: walletSpent,
        unlocked_photo_packs: packList,
        updated_at: updatedAt,
      }),
      { onConflict: "device_id" },
    );
  }

  let name: string | null = null;
  if (activeDeviceId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("device_id", activeDeviceId)
      .maybeSingle();
    name = profile?.name ?? null;
  }

  console.log(
    `[billing] synced wallet phone=${digits} purchased=${purchased} spent=${walletSpent} balance=${balance} packs=${packList.join(",") || "—"}`,
  );

  const entitlements = await fetchPaymentEntitlements(digits, activeDeviceId);
  return toBillingWalletState(
    {
      chatBalance: balance,
      unlockedPhotoPacks: packList,
      phone_number: digits,
      name,
    },
    entitlements,
  );
};

export type DeductChatMessageResult =
  | { ok: true; wallet_credits: number; charged: boolean }
  | { ok: false; reason: "insufficient"; wallet_credits: number };

/** Deduct ₹0.20 after free messages when the user has recharge balance. */
export const deductChatMessageCredit = async (input: {
  deviceId: string;
  phoneHint?: string | null;
  messageCountFromClient: number;
}): Promise<DeductChatMessageResult> => {
  if (!serverShouldChargeForMessage(input.messageCountFromClient)) {
    const state = await getBillingState(input.deviceId, input.phoneHint);
    return { ok: true, wallet_credits: state.wallet_credits, charged: false };
  }

  const supabase = getSupabaseAdmin();
  const phoneDigits =
    input.phoneHint?.replace(/\D/g, "").slice(-10) || "";

  let purchased = 0;
  let walletSpent = 0;

  if (phoneDigits.length === 10) {
    const summed = await sumPurchasedCreditsForPhone(phoneDigits, input.deviceId);
    purchased = summed.totalCredits;
    walletSpent = await readWalletSpentForPhone(phoneDigits);
  } else {
    await ensureProfileRow(input.deviceId);
    purchased = await sumPurchasedCreditsForDevice(input.deviceId);
    walletSpent = await readWalletSpentForDevice(input.deviceId);
  }

  const balanceBefore = walletBalance(purchased, walletSpent);
  if (balanceBefore < CHAT_MESSAGE_COST_RUPEES - 1e-9) {
    return { ok: false, reason: "insufficient", wallet_credits: balanceBefore };
  }

  const newSpent = roundWalletRupees(walletSpent + CHAT_MESSAGE_COST_RUPEES);
  const balanceAfter = walletBalance(purchased, newSpent);
  const updatedAt = new Date().toISOString();

  await hasWalletSpentColumn();
  if (phoneDigits.length === 10) {
    const { error } = await supabase
      .from("profiles")
      .update(
        withoutWalletSpent({
          wallet_spent: newSpent,
          wallet_credits: balanceAfter,
          updated_at: updatedAt,
        }),
      )
      .eq("phone_number", phoneDigits);
    if (error) throw error;
  }

  const { error: deviceErr } = await supabase
    .from("profiles")
    .update(
      withoutWalletSpent({
        wallet_spent: newSpent,
        wallet_credits: balanceAfter,
        updated_at: updatedAt,
      }),
    )
    .eq("device_id", input.deviceId);

  if (deviceErr) throw deviceErr;

  console.log(
    `[billing] chat debit device=${input.deviceId} spent=${newSpent} balance=${balanceAfter}`,
  );

  return { ok: true, wallet_credits: balanceAfter, charged: true };
};

async function derivePhoneFromDevicePayments(deviceId: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("payment_attempts")
    .select("phone_number")
    .eq("device_id", deviceId)
    .eq("status", "success")
    .not("phone_number", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return "";
  return String(data?.[0]?.phone_number ?? "")
    .replace(/\D/g, "")
    .slice(-10);
}

export const getBillingState = async (
  deviceId: string,
  phoneHint?: string | null,
) => {
  const supabase = getSupabaseAdmin();
  await hasWalletSpentColumn();
  type ProfileBillingRow = {
    wallet_credits?: number | null;
    wallet_spent?: number | null;
    unlocked_photo_packs?: string[] | null;
    phone_number?: string | null;
    name?: string | null;
  };

  const profileQuery = walletSpentColumnExists
    ? supabase
        .from("profiles")
        .select("wallet_credits, wallet_spent, unlocked_photo_packs, phone_number, name")
    : supabase
        .from("profiles")
        .select("wallet_credits, unlocked_photo_packs, phone_number, name");

  const { data: profileRaw, error: profileErr } = await profileQuery
    .eq("device_id", deviceId)
    .maybeSingle();
  if (profileErr) throw profileErr;
  const profile = profileRaw as ProfileBillingRow | null;

  let phone =
    phoneHint?.replace(/\D/g, "").slice(-10) ||
    (profile?.phone_number
      ? String(profile.phone_number).replace(/\D/g, "").slice(-10)
      : "");

  if (phone.length !== 10) {
    phone = await derivePhoneFromDevicePayments(deviceId);
  }

  if (phone.length === 10) {
    const synced = await syncWalletCreditsForPhone(phone, deviceId);
    return {
      ...synced,
      name: synced.name ?? profile?.name ?? null,
    };
  }

  const purchased = await sumPurchasedCreditsForDevice(deviceId);
  const walletSpent = await readWalletSpentForDevice(deviceId);
  const walletCredits = walletBalance(purchased, walletSpent);
  const unlockedPhotoPacks = Array.isArray(profile?.unlocked_photo_packs)
    ? (profile.unlocked_photo_packs as string[])
    : [];

  const entitlements = await fetchPaymentEntitlements(undefined, deviceId);
  return toBillingWalletState(
    {
      chatBalance: walletCredits,
      unlockedPhotoPacks,
      phone_number: profile?.phone_number ?? null,
      name: profile?.name ?? null,
    },
    entitlements,
  );
};

/** @deprecated Prefer Razorpay create-order + verify (writes gateway columns). */
export interface LogPaymentAttemptInput {
  deviceId: string;
  phoneNumber: string;
  amountRupees: number;
  companionId?: string | null;
  rateNote?: string | null;
  metadata?: Record<string, unknown>;
}

export const logPaymentAttemptRow = async (input: LogPaymentAttemptInput) => {
  const meta = input.metadata ?? {};
  const productType =
    (meta.source === "photo_pack_activation"
      ? "photo_pack"
      : meta.source === "chat_recharge_gate"
        ? "chat_recharge"
        : meta.source === "voice_chat_activation" ||
            meta.source === "voice_chat_activation_request"
          ? "voice_chat"
          : "other") as PaymentProductType;

  const gateway =
    (meta.payment_gateway as PaymentGateway) || PAYMENT_GATEWAY_RAZORPAY;

  const pending = await createPendingPaymentRow({
    deviceId: input.deviceId,
    phoneNumber: input.phoneNumber,
    amountRupees: input.amountRupees,
    productType,
    paymentGateway: gateway,
    companionId: input.companionId,
    rateNote: input.rateNote,
    metadata: meta,
  });

  const gatewayOrderId = String(
    meta.gateway_order_id ?? meta.razorpay_order_id ?? "",
  );
  const gatewayPaymentId = String(
    meta.gateway_payment_id ?? meta.razorpay_payment_id ?? "",
  );
  const isSuccess =
    meta.payment_status === "success" && gatewayOrderId && gatewayPaymentId;

  if (isSuccess) {
    await attachGatewayOrderToPayment(pending.id, gateway, gatewayOrderId);
    await completePaymentSuccess({
      paymentId: pending.id,
      paymentGateway: gateway,
      gatewayOrderId,
      gatewayPaymentId,
    });
  } else {
    await markPaymentFailed(pending.id, "legacy_log_without_verification");
  }

  return { id: pending.id, created_at: pending.created_at };
};
