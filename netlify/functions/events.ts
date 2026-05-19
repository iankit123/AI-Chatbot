import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { APP_EVENT_NAMES } from "../../shared/appEvents";
import { insertAppEventRow } from "../../server/services/appEvents";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function missingDbRelation(error: unknown): boolean {
  const msg = serializeError(error).toLowerCase();
  return (
    (msg.includes("relation") && msg.includes("does not exist")) ||
    msg.includes("could not find the table")
  );
}

const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: jsonHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const bodySchema = z.object({
      event_name: z.enum(APP_EVENT_NAMES),
      device_id: z.string().min(1),
      user_id: z.string().optional().nullable(),
      phone_number: z.string().optional().nullable(),
      properties: z.record(z.unknown()).optional(),
    });
    const data = bodySchema.parse(JSON.parse(event.body || "{}"));
    const row = await insertAppEventRow({
      eventName: data.event_name,
      deviceId: data.device_id,
      userId: data.user_id,
      phoneNumber: data.phone_number,
      properties: data.properties,
    });
    return {
      statusCode: 201,
      headers: jsonHeaders,
      body: JSON.stringify(row),
    };
  } catch (error) {
    console.error("[events]", error);
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          message: "Invalid event payload",
          errors: error.errors,
        }),
      };
    }
    const msg = serializeError(error);
    if (msg.includes("SUPABASE_URL") || msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        statusCode: 503,
        headers: jsonHeaders,
        body: JSON.stringify({ message: "Event logging unavailable" }),
      };
    }
    if (missingDbRelation(error)) {
      return {
        statusCode: 503,
        headers: jsonHeaders,
        body: JSON.stringify({
          message: "app_events table missing",
          error: msg,
          hint: "Run migrations/0007_app_events.sql in your Supabase SQL editor.",
        }),
      };
    }
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ message: "Failed to log event", error: msg }),
    };
  }
};

export { handler };
