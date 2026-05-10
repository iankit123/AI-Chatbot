import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { upsertProfileRow } from "../../server/services/supabaseBilling";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

function serializeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function missingProfilesTable(error: unknown): boolean {
  const msg = serializeError(error).toLowerCase();
  return (
    ((msg.includes("relation") || msg.includes("table")) && msg.includes("does not exist")) ||
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
      device_id: z.string().min(1),
      phone_number: z.string().optional().nullable(),
      name: z.string().optional().nullable(),
    });
    const data = bodySchema.parse(JSON.parse(event.body || "{}"));
    const row = await upsertProfileRow({
      deviceId: data.device_id,
      phoneNumber: data.phone_number ?? undefined,
      name: data.name ?? undefined,
    });
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(row),
    };
  } catch (error) {
    console.error("[profiles-upsert]", error);
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ message: "Invalid profile payload", errors: error.errors }),
      };
    }
    const msg = serializeError(error);
    if (msg.includes("SUPABASE_URL") || msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        statusCode: 503,
        headers: jsonHeaders,
        body: JSON.stringify({ message: "Profile sync unavailable" }),
      };
    }
    if (missingProfilesTable(error) && msg.toLowerCase().includes("profiles")) {
      return {
        statusCode: 503,
        headers: jsonHeaders,
        body: JSON.stringify({
          message: "Profiles table missing",
          error: msg,
          hint: "Run migrations/0002_profiles_payment.sql in your Supabase SQL editor.",
        }),
      };
    }
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ message: "Failed to upsert profile", error: msg }),
    };
  }
};

export { handler };
