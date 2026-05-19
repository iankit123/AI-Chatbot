import type { AppEventName } from "@shared/appEvents";
import {
  auth,
  getDeviceId,
  getStoredBillingPhoneDigits,
} from "@/lib/supabase";

/** Persist event to Supabase via API (fire-and-forget). */
export function logAppEventToServer(
  eventName: AppEventName,
  properties?: Record<string, unknown>,
): void {
  const deviceId = getDeviceId();
  const phone = getStoredBillingPhoneDigits();
  const userId = auth.currentUser?.uid ?? null;

  void fetch("/api/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      event_name: eventName,
      device_id: deviceId,
      user_id: userId,
      phone_number: phone,
      properties: properties ?? {},
    }),
  }).catch((err) => {
    if (import.meta.env.DEV) {
      console.warn("[app_events] failed to log", eventName, err);
    }
  });
}
