import { createClient } from "@supabase/supabase-js";
import type { AstroReportType } from "@shared/astroProducts";

const admin = () => {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

export type AstroReportRow = {
  id: string;
  report_type: AstroReportType;
  device_id: string;
  input: Record<string, any>;
  facts: Record<string, any>;
  narrative: Record<string, any> | null;
  palm: Record<string, any> | null;
  has_portrait: boolean;
  paid: boolean;
  payment_id: string | null;
  price_rupees: number | null;
  created_at: string;
};

const COLS = "id, report_type, device_id, input, facts, narrative, palm, has_portrait, paid, payment_id, price_rupees, created_at";

export async function insertReport(row: {
  report_type: AstroReportType;
  device_id: string;
  input: Record<string, unknown>;
  facts: Record<string, unknown>;
  palm: Record<string, unknown> | null;
  price_rupees: number;
}): Promise<AstroReportRow> {
  const { data, error } = await admin().from("astro_reports").insert(row).select(COLS).single();
  if (error) throw error;
  return data as AstroReportRow;
}

export async function getReport(id: string): Promise<AstroReportRow | null> {
  const { data, error } = await admin().from("astro_reports").select(COLS).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as AstroReportRow) ?? null;
}

export async function updateReport(id: string, patch: Record<string, unknown>): Promise<void> {
  const { error } = await admin()
    .from("astro_reports")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getPortrait(id: string): Promise<string | null> {
  const { data, error } = await admin().from("astro_reports").select("portrait").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data?.portrait as string | null) ?? null;
}

/** A successful payment whose metadata points at this report. */
export async function findSuccessfulPayment(reportId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from("payment_attempts")
    .select("id")
    .eq("status", "success")
    .eq("metadata->>astro_report_id", reportId)
    .limit(1);
  if (error) throw error;
  return data?.[0]?.id ? String(data[0].id) : null;
}

/** Checkouts for this report that never confirmed (handler did not run, or the modal was closed), newest first. */
export async function findOpenPayments(reportId: string): Promise<{ id: string; gateway_order_id: string }[]> {
  const since = new Date(Date.now() - 3 * 86400000).toISOString();
  const { data, error } = await admin()
    .from("payment_attempts")
    .select("id, gateway_order_id")
    .in("status", ["pending", "cancelled"])
    .eq("metadata->>astro_report_id", reportId)
    .not("gateway_order_id", "is", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(3);
  if (error) throw error;
  return (data ?? []).map((r) => ({ id: String(r.id), gateway_order_id: String(r.gateway_order_id) }));
}

export async function getPaymentForContact(
  paymentRowId: string,
): Promise<{ device_id: string; gateway_payment_id: string | null; phone_number: string | null } | null> {
  const { data, error } = await admin()
    .from("payment_attempts")
    .select("device_id, gateway_payment_id, phone_number")
    .eq("id", paymentRowId)
    .maybeSingle();
  if (error) throw error;
  return (data as { device_id: string; gateway_payment_id: string | null; phone_number: string | null }) ?? null;
}

export async function setPaymentPhone(paymentRowId: string, digits: string): Promise<void> {
  const { error } = await admin().from("payment_attempts").update({ phone_number: digits }).eq("id", paymentRowId);
  if (error) throw error;
}

/** Status of every checkout opened for this report (empty for a first-time buyer). */
export async function findReportPaymentStatuses(reportId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from("payment_attempts")
    .select("status")
    .eq("metadata->>astro_report_id", reportId)
    .limit(20);
  if (error) throw error;
  return (data ?? []).map((r) => String(r.status));
}
