import { createClient } from "@supabase/supabase-js";

export type KundliBirthDetails = {
  name: string;
  gender: string;
  dateOfBirth: string;
  timeOfBirth: string;
  cityOfBirth: string;
};

const getSupabaseAdmin = () => {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

function isMissingColumnError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  const lower = msg.toLowerCase();
  return (
    lower.includes("column") &&
    (lower.includes("does not exist") || lower.includes("could not find"))
  );
}

export function parseKundliBirthDetails(raw: unknown): KundliBirthDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.name === "string" &&
    typeof o.gender === "string" &&
    typeof o.dateOfBirth === "string" &&
    typeof o.timeOfBirth === "string" &&
    typeof o.cityOfBirth === "string"
  ) {
    return {
      name: o.name.trim(),
      gender: o.gender,
      dateOfBirth: o.dateOfBirth,
      timeOfBirth: o.timeOfBirth,
      cityOfBirth: o.cityOfBirth.trim(),
    };
  }
  return null;
}

export async function getKundliBirthForProfile(
  deviceId: string,
  phoneHint?: string | null,
): Promise<KundliBirthDetails | null> {
  const supabase = getSupabaseAdmin();
  const digits = phoneHint?.replace(/\D/g, "").slice(-10) || "";

  const select = "kundli_birth_details, device_id, phone_number";

  if (digits.length === 10) {
    const { data, error } = await supabase
      .from("profiles")
      .select(select)
      .eq("phone_number", digits)
      .not("kundli_birth_details", "is", null)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      if (isMissingColumnError(error)) return null;
      throw error;
    }
    const parsed = parseKundliBirthDetails(data?.[0]?.kundli_birth_details);
    if (parsed) return parsed;
  }

  const { data: byDevice, error: deviceErr } = await supabase
    .from("profiles")
    .select(select)
    .eq("device_id", deviceId)
    .maybeSingle();

  if (deviceErr) {
    if (isMissingColumnError(deviceErr)) return null;
    throw deviceErr;
  }

  return parseKundliBirthDetails(byDevice?.kundli_birth_details);
}

export async function saveKundliBirthForProfile(
  deviceId: string,
  phoneHint: string | null | undefined,
  details: KundliBirthDetails,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const digits = phoneHint?.replace(/\D/g, "").slice(-10) || "";

  const row: Record<string, unknown> = {
    device_id: deviceId,
    kundli_birth_details: details,
    updated_at: new Date().toISOString(),
  };
  if (digits.length === 10) row.phone_number = digits;
  if (details.name) row.name = details.name;

  const { error } = await supabase.from("profiles").upsert(row, { onConflict: "device_id" });
  if (error && isMissingColumnError(error)) return;
  if (error) throw error;

  if (digits.length === 10) {
    await supabase
      .from("profiles")
      .update({
        kundli_birth_details: details,
        updated_at: new Date().toISOString(),
      })
      .eq("phone_number", digits);
  }
}
