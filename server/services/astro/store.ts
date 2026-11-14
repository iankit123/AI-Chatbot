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
  created_at: string;
};

const COLS = "id, report_type, device_id, input, facts, narrative, palm, has_portrait, paid, payment_id, created_at";

export async function insertReport(row: {
  report_type: AstroReportType;
  device_id: string;
  input: Record<string, unknown>;
  facts: Record<string, unknown>;
  palm: Record<string, unknown> | null;
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
