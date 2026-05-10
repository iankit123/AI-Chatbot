import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { logPaymentAttemptRow } from "../../server/services/supabaseBilling";

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
      device_id: z.string().min(1),
      phone_number: z.string().min(10),
      amount_rupees: z.number().positive(),
      companion_id: z.string().optional().nullable(),
      rate_note: z.string().optional().nullable(),
      metadata: z.record(z.unknown()).optional(),
    });
    const data = bodySchema.parse(JSON.parse(event.body || "{}"));
    const row = await logPaymentAttemptRow({
      deviceId: data.device_id,
      phoneNumber: data.phone_number,
      amountRupees: data.amount_rupees,
      companionId: data.companion_id,
      rateNote: data.rate_note ?? undefined,
      metadata: data.metadata,
    });
    return {
      statusCode: 201,
      headers: jsonHeaders,
      body: JSON.stringify(row),
    };
  } catch (error) {
    console.error("[billing-payment-attempt]", error);
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          message: "Invalid payment attempt payload",
          errors: error.errors,
        }),
      };
    }
    const msg = serializeError(error);
    if (msg.includes("SUPABASE_URL") || msg.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return {
        statusCode: 503,
        headers: jsonHeaders,
        body: JSON.stringify({ message: "Billing log unavailable" }),
      };
    }
    if (missingDbRelation(error)) {
      return {
        statusCode: 503,
        headers: jsonHeaders,
        body: JSON.stringify({
          message: "Billing tables missing",
          error: msg,
          hint: "Run migrations/0002_profiles_payment.sql in your Supabase SQL editor.",
        }),
      };
    }
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ message: "Failed to log payment attempt", error: msg }),
    };
  }
};

export { handler };
