import { createClient } from "@supabase/supabase-js";
import type { AppEventName } from "@shared/appEvents";

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

export type InsertAppEventInput = {
  eventName: AppEventName;
  deviceId: string;
  userId?: string | null;
  phoneNumber?: string | null;
  properties?: Record<string, unknown>;
};

export const insertAppEventRow = async (input: InsertAppEventInput) => {
  const supabase = getSupabaseAdmin();
  const digits = input.phoneNumber?.replace(/\D/g, "").slice(-10);

  const { data, error } = await supabase
    .from("app_events")
    .insert({
      event_name: input.eventName,
      device_id: input.deviceId,
      user_id: input.userId?.trim() || null,
      phone_number: digits || null,
      properties: input.properties ?? {},
    })
    .select(
      "id, event_name, device_id, user_id, phone_number, properties, created_at",
    )
    .single();

  if (error) throw error;
  return data;
};
