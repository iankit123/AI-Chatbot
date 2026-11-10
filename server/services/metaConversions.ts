import crypto from "crypto";
import type { Request } from "express";
import { z } from "zod";
import { META_PIXEL_ID } from "@shared/metaEvents";

/**
 * Meta Conversions API: the server sends key events to Meta directly, so ads still get
 * credit when the browser Pixel is blocked (ad blockers, in-app browsers, iOS settings).
 * Every event carries the same event_id the Pixel used, so Meta counts it once.
 *
 * Env: META_CAPI_ACCESS_TOKEN (Events Manager → pixel → Settings → Conversions API),
 * optional META_CAPI_TEST_EVENT_CODE to see events under Events Manager → Test events.
 */

const GRAPH_VERSION = "v20.0";
const SEND_TIMEOUT_MS = 3000;

/** App events from /api/events that are also sent to Meta (the ad sets optimize for these). */
export const META_CAPI_FORWARDED_EVENTS = new Set<string>(["payment_attempted"]);

export const metaBrowserContextSchema = z.object({
  event_id: z.string().min(1).max(100).optional(),
  fbp: z.string().max(200).nullable().optional(),
  fbc: z.string().max(500).nullable().optional(),
  event_source_url: z.string().max(2000).nullable().optional(),
});

type MetaBrowserContextInput = z.infer<typeof metaBrowserContextSchema>;

/** What Meta uses to match a server event to the person who saw the ad. */
export type MetaEventContext = {
  ip: string | null;
  userAgent: string | null;
  fbp: string | null;
  fbc: string | null;
  eventSourceUrl: string | null;
};

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function metaContextFromRequest(
  req: Request,
  browser?: MetaBrowserContextInput | null,
): MetaEventContext {
  const forwardedFor = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim();
  const cookies = req.headers.cookie;
  const referer = req.headers.referer ? String(req.headers.referer) : null;
  return {
    ip: forwardedFor || req.socket?.remoteAddress || null,
    userAgent: req.headers["user-agent"] ? String(req.headers["user-agent"]) : null,
    fbp: browser?.fbp || readCookie(cookies, "_fbp"),
    fbc: browser?.fbc || readCookie(cookies, "_fbc"),
    eventSourceUrl: browser?.event_source_url || referer,
  };
}

/** Value and product details from an app event's properties, in Meta's custom_data shape. */
export function metaCustomDataFromProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const p = properties ?? {};
  const value = Number(p.value);
  return {
    ...(Number.isFinite(value) ? { value } : {}),
    currency: typeof p.currency === "string" ? p.currency : "INR",
    ...(typeof p.product_type === "string" ? { product_type: p.product_type } : {}),
    ...(typeof p.companion_id === "string" ? { companion_id: p.companion_id } : {}),
  };
}

let warnedMissingToken = false;

/** Never throws: a Meta outage must not break events or payments. */
export async function sendMetaConversionEvent(input: {
  eventName: string;
  eventId: string;
  context: MetaEventContext;
  deviceId?: string | null;
  phoneDigits?: string | null;
  customData?: Record<string, unknown>;
}): Promise<void> {
  const token = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!token) {
    if (!warnedMissingToken) {
      console.warn("[meta-capi] META_CAPI_ACCESS_TOKEN not set; server events to Meta are off");
      warnedMissingToken = true;
    }
    return;
  }
  const pixelId = process.env.META_PIXEL_ID?.trim() || META_PIXEL_ID;

  const phone = input.phoneDigits?.replace(/\D/g, "").slice(-10) ?? "";
  const { ip, userAgent, fbp, fbc, eventSourceUrl } = input.context;
  const userData: Record<string, unknown> = {
    ...(ip ? { client_ip_address: ip } : {}),
    ...(userAgent ? { client_user_agent: userAgent } : {}),
    ...(fbp ? { fbp } : {}),
    ...(fbc ? { fbc } : {}),
    ...(input.deviceId ? { external_id: [sha256(input.deviceId)] } : {}),
    // Meta wants phone numbers with country code, then SHA-256.
    ...(phone.length === 10 ? { ph: [sha256(`91${phone}`)] } : {}),
  };

  const event = {
    event_name: input.eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    event_source_url: eventSourceUrl || "https://puchlo.in/",
    user_data: userData,
    ...(input.customData ? { custom_data: input.customData } : {}),
  };
  const testEventCode = process.env.META_CAPI_TEST_EVENT_CODE?.trim();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [event],
        access_token: token,
        ...(testEventCode ? { test_event_code: testEventCode } : {}),
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[meta-capi] ${input.eventName} rejected (${res.status}): ${body.slice(0, 300)}`);
    }
  } catch (error) {
    console.error(
      `[meta-capi] ${input.eventName} not sent:`,
      error instanceof Error ? error.message : error,
    );
  } finally {
    clearTimeout(timer);
  }
}
