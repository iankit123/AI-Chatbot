import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const getSupabaseAdmin = () => {
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
    .select("id, device_id, phone_number, name, updated_at")
    .single();

  if (error) throw error;
  return data;
};

export interface LogPaymentAttemptInput {
  deviceId: string;
  phoneNumber: string;
  amountRupees: number;
  companionId?: string | null;
  rateNote?: string | null;
  /** Arbitrary JSON (plan labels, companion name/surface, future card refs). Stored in `payment_attempts.metadata`. */
  metadata?: Record<string, unknown>;
}

export const logPaymentAttemptRow = async (input: LogPaymentAttemptInput) => {
  const supabase = getSupabaseAdmin();
  const digits = input.phoneNumber.replace(/\D/g, "").slice(-10);

  const { data, error } = await supabase
    .from("payment_attempts")
    .insert({
      device_id: input.deviceId,
      phone_number: digits,
      amount_rupees: input.amountRupees,
      companion_id: input.companionId ?? null,
      rate_note: input.rateNote ?? "₹5/min (chat)",
      status: "technical_error_shown",
      metadata: input.metadata ?? {},
    })
    .select("id, created_at")
    .single();

  if (error) throw error;
  return data;
};
