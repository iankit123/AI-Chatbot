import type { Handler } from "@netlify/functions";
import { z } from "zod";
import { getChatConversationsFromSupabase } from "../../server/services/supabaseChat";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

const ownerSchema = z.object({
  userId: z.string().nullable().optional(),
  anonymousUserId: z.string().nullable().optional(),
});

const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: jsonHeaders, body: "" };
    }

    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const qs = event.queryStringParameters || {};
    const query = ownerSchema.parse(qs);
    const conversations = await getChatConversationsFromSupabase(
      query.userId,
      query.anonymousUserId,
    );

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(conversations),
    };
  } catch (error) {
    console.error("[chat-conversations]", error);
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({
          message: "Invalid request",
          errors: error.errors,
        }),
      };
    }
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({
        message: "Failed to load chat conversations",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
