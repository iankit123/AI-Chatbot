import type { Handler } from "@netlify/functions";
import { generateResponse } from "../../server/services/llm";
import { deductChatMessageCredit } from "../../server/services/supabaseBilling";
import { z } from "zod";

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };

const conversationTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: jsonHeaders, body: "" };
  }

  // Stateless Netlify: no shared DB like Express memory — client must send prior turns.
  if (event.httpMethod === "DELETE") {
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ message: "All messages cleared" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const messageSchema = z.object({
      content: z.string().min(1),
      language: z.enum(["hindi", "english"]).default("hindi"),
      companionId: z.string().default("priya"),
      companionName: z.string().optional(),
      userName: z.string().optional(),
      deviceId: z.string().optional(),
      phoneNumber: z.string().optional(),
      photoUrl: z.string().optional(),
      isPremium: z.boolean().optional(),
      skipUserMessage: z.boolean().optional(),
      /** Prior turns for this companion (excludes the message in `content`; LLM appends it). */
      conversationHistory: z.array(conversationTurnSchema).max(40).optional(),
      messageCount: z.number().optional(),
      isAuthenticated: z.boolean().optional(),
      recentPhotoContext: z.record(z.unknown()).nullable().optional(),
      role: z.enum(["user", "assistant"]).optional(),
    });

    const validatedData = messageSchema.parse(body);

    const history = validatedData.conversationHistory ?? [];
    const messageCount = validatedData.messageCount ?? 0;

    if (validatedData.deviceId) {
      const phoneDigits =
        validatedData.phoneNumber?.replace(/\D/g, "").slice(-10) || "";
      const deduct = await deductChatMessageCredit({
        deviceId: validatedData.deviceId,
        phoneHint: phoneDigits || null,
        messageCountFromClient: messageCount,
      });
      if (!deduct.ok) {
        return {
          statusCode: 402,
          headers: jsonHeaders,
          body: JSON.stringify({
            code: "INSUFFICIENT_WALLET",
            wallet_credits: deduct.wallet_credits,
          }),
        };
      }
    }

    const responseContent = await generateResponse(
      validatedData.content,
      history,
      validatedData.language,
      {
        companionId: validatedData.companionId,
        companionName: validatedData.companionName,
        userName: validatedData.userName,
      },
    );

    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify({ content: responseContent }),
    };
  } catch (error) {
    console.error("[messages]", error);
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        headers: jsonHeaders,
        body: JSON.stringify({ error: "Invalid request", errors: error.errors }),
      };
    }
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: "Failed to process message" }),
    };
  }
};

export { handler };
