import type { Handler } from "@netlify/functions";
import { z } from "zod";
import {
  getChatMessagesFromSupabase,
  saveChatMessageToSupabase,
} from "../../server/services/supabaseChat";

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

    if (event.httpMethod === "POST") {
      const chatMessageSchema = ownerSchema.extend({
        companionId: z.string().min(1),
        companionName: z.string().nullable().optional(),
        companionAvatar: z.string().nullable().optional(),
        userName: z.string().nullable().optional(),
        userAge: z.number().nullable().optional(),
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
        language: z.enum(["hindi", "english"]).nullable().optional(),
        photoUrl: z.string().nullable().optional(),
        isPremium: z.boolean().nullable().optional(),
        contextInfo: z.string().nullable().optional(),
        metadata: z.record(z.unknown()).optional(),
      });

      const data = chatMessageSchema.parse(JSON.parse(event.body || "{}"));
      const message = await saveChatMessageToSupabase(data);
      return {
        statusCode: 201,
        headers: jsonHeaders,
        body: JSON.stringify(message),
      };
    }

    if (event.httpMethod === "GET") {
      const qs = event.queryStringParameters || {};
      const query = ownerSchema
        .extend({
          companionId: z.string().min(1),
        })
        .parse(qs);

      const messages = await getChatMessagesFromSupabase(
        query.companionId,
        query.userId,
        query.anonymousUserId,
      );

      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify(messages),
      };
    }

    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  } catch (error) {
    console.error("[chat-messages]", error);
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
        message: "Failed to process chat messages request",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};

export { handler };
