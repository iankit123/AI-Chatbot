import type { AppEventName } from "@shared/appEvents";
import {
  auth,
  getDeviceId,
  getStoredBillingPhoneDigits,
} from "@/lib/supabase";
import { getMetaBrowserContext } from "@/lib/metaClickIds";

/**
 * Persist event to Supabase via API (fire-and-forget). With `metaEventId`, the server
 * also forwards the event to Meta's Conversions API under that id.
 */
export function logAppEventToServer(
  eventName: AppEventName,
  properties?: Record<string, unknown>,
  metaEventId?: string,
  /** A number the user just typed (e.g. a waitlist form), used instead of the stored billing phone. */
  phoneOverride?: string,
): void {
  const deviceId = getDeviceId();
  const phone = phoneOverride ?? getStoredBillingPhoneDigits();
  const userId = auth.currentUser?.uid ?? null;

  void fetch("/api/events", {
    method: "POST",
    // Finish sending even if the page is backgrounded (e.g. switching to a UPI app).
    keepalive: true,
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
      ...(metaEventId ? { meta: getMetaBrowserContext(metaEventId) } : {}),
    }),
  }).catch((err) => {
    if (import.meta.env.DEV) {
      console.warn("[app_events] failed to log", eventName, err);
    }
  });
}
