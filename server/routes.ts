import type { Express } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { z } from "zod";
import { generateResponse } from "./services/llm";
import express from "express";
import path from "path";
import {
  getChatConversationsFromSupabase,
  getChatMessagesFromSupabase,
  saveChatMessageToSupabase,
} from "./services/supabaseChat";
import {
  attachGatewayOrderToPayment,
  completePaymentSuccess,
  createPendingPaymentRow,
  findPendingPaymentByGatewayOrder,
  getBillingState,
  logPaymentAttemptRow,
  markPaymentCancelled,
  markPaymentFailed,
  PAYMENT_GATEWAY_RAZORPAY,
  upsertProfileRow,
  type PaymentProductType,
  deductChatMessageCredit,
} from "./services/supabaseBilling";
import { buildRazorpayGatewayNotes } from "@shared/razorpayProductCodes";
import {
  getKundliBirthForProfile,
  saveKundliBirthForProfile,
  type KundliBirthDetails,
} from "./services/kundliProfile";

const kundliBirthSchema = z.object({
  name: z.string().min(1).max(120),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1),
  timeOfBirth: z.string().min(1),
  cityOfBirth: z.string().min(1).max(200),
});

async function synthesizeGoogleTts(text: string, voiceName: string): Promise<Buffer> {
  const apiKey = process.env.GOOGLE_TTS_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_TTS_KEY is not configured");
  }
  const languageCode = voiceName.split("-").slice(0, 2).join("-");
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode, name: voiceName },
        audioConfig: { audioEncoding: "MP3" },
      }),
    },
  );
  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`Google TTS API failed: ${response.status} ${err}`.trim());
  }
  const data = (await response.json()) as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google TTS returned empty audio");
  return Buffer.from(data.audioContent, "base64");
}

/** Supabase / PostgREST errors may omit `message` or put causes on sibling keys — avoid opaque "Unknown error". */
function serializeSupabaseError(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;
  if (error !== null && typeof error === "object") {
    const o = error as Record<string, unknown>;
    const parts: string[] = [];
    const push = (v: unknown) => {
      if (typeof v === "string" && v.trim()) parts.push(v.trim());
    };
    push(o.message);
    push(o.details);
    push(o.hint);
    if (typeof o.error === "string") push(o.error);
    push(o.error_description);
    if (typeof o.code !== "undefined" && o.code !== null) parts.push(String(o.code));
    if (parts.length) return Array.from(new Set(parts)).join(" — ");
    try {
      const json = JSON.stringify(o);
      if (json && json !== "{}") return json;
    } catch {
      /* fall through */
    }
  }
  if (error === undefined || error === null) return "Empty error from database driver — check server logs.";
  return String(error);
}

function isMissingDbRelation(error: unknown): boolean {
  const msg = serializeSupabaseError(error).toLowerCase();
  if (msg.includes("does not exist") || msg.includes("schema cache")) return true;
  if (
    error !== null &&
    typeof error === "object" &&
    (error as { code?: string }).code === "42P01"
  )
    return true;
  return false;
}

function isSupabaseConfigError(error: unknown): boolean {
  const msg = serializeSupabaseError(error);
  return msg.includes("SUPABASE_URL") || msg.includes("SUPABASE_SERVICE_ROLE_KEY");
}

function getRazorpayCredentials(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) {
    throw new Error("Razorpay is not configured (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET)");
  }
  return { keyId, keySecret };
}

export async function registerRoutes(
  app: Express,
  opts?: { createHttpServer?: boolean },
): Promise<Server | undefined> {
  // Serve static files from the client/public directory
  app.use(express.static(path.join(process.cwd(), 'client/public')));

  const ownerSchema = z.object({
    userId: z.string().nullable().optional(),
    anonymousUserId: z.string().nullable().optional(),
  });

  app.post('/api/chat/messages', async (req, res) => {
    try {
      const chatMessageSchema = ownerSchema.extend({
        companionId: z.string().min(1),
        companionName: z.string().nullable().optional(),
        companionAvatar: z.string().nullable().optional(),
        userName: z.string().nullable().optional(),
        userAge: z.number().nullable().optional(),
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
        language: z.enum(['hindi', 'english']).nullable().optional(),
        photoUrl: z.string().nullable().optional(),
        isPremium: z.boolean().nullable().optional(),
        contextInfo: z.string().nullable().optional(),
        metadata: z.record(z.unknown()).optional(),
      });

      const data = chatMessageSchema.parse(req.body);
      const message = await saveChatMessageToSupabase(data);
      res.status(201).json(message);
    } catch (error) {
      console.error('Error saving chat message:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid chat message', errors: error.errors });
      }
      const detail = serializeSupabaseError(error);
      if (isSupabaseConfigError(error)) {
        return res.status(503).json({
          message:
            "Chat persistence unavailable — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your server environment (e.g. Vercel project env).",
          error: detail,
        });
      }
      const hint = isMissingDbRelation(error)
        ? "Ensure Supabase has the chat tables from migrations/0001_chat_storage.sql applied."
        : undefined;
      res.status(500).json({
        message: "Failed to save chat message",
        error: detail,
        ...(hint ? { hint } : {}),
      });
    }
  });

  app.get('/api/chat/messages', async (req, res) => {
    try {
      const query = ownerSchema.extend({
        companionId: z.string().min(1),
      }).parse(req.query);

      const messages = await getChatMessagesFromSupabase(
        query.companionId,
        query.userId,
        query.anonymousUserId,
      );

      res.json(messages);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid chat query', errors: error.errors });
      }
      if (isSupabaseConfigError(error)) {
        return res.status(503).json({
          message:
            "Chat persistence unavailable — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your server environment (e.g. Vercel project env).",
          error: serializeSupabaseError(error),
        });
      }
      res.status(500).json({
        message: "Failed to load chat messages",
        error: serializeSupabaseError(error),
      });
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const bodySchema = z.object({
        text: z.string().min(1),
        voiceProvider: z.enum(["google", "edge"]).optional().default("google"),
        voiceName: z.string().optional(),
      });
      const body = bodySchema.parse(req.body);
      const text = body.text.trim();
      if (!text) return res.status(400).json({ error: "Missing text" });

      // We only support Google in this app runtime right now.
      const selectedVoice = body.voiceName?.trim() || "en-IN-Standard-A";
      const audioBuffer = await synthesizeGoogleTts(text, selectedVoice);
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
        "Cache-Control": "no-store",
      });
      return res.send(audioBuffer);
    } catch (error) {
      console.error("TTS error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      const details = error instanceof Error ? error.message : String(error);
      if (details.includes("GOOGLE_TTS_KEY")) {
        return res.status(503).json({
          error: "TTS not configured",
          details,
          hint: "Set GOOGLE_TTS_KEY in the project root .env file, then restart the dev server (npm run dev).",
        });
      }
      return res.status(500).json({
        error: "Failed to generate TTS audio",
        details,
      });
    }
  });

  app.get("/api/profiles/kundli-birth", async (req, res) => {
    try {
      const query = z
        .object({
          device_id: z.string().min(1),
          phone_number: z.string().optional(),
        })
        .parse(req.query);
      const phoneHint = query.phone_number?.replace(/\D/g, "").slice(-10) || null;
      const details = await getKundliBirthForProfile(query.device_id, phoneHint);
      res.json({ kundli_birth_details: details });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Profile sync unavailable" });
      }
      res.status(500).json({ message: "Failed to load kundli birth details", error: msg });
    }
  });

  app.put("/api/profiles/kundli-birth", async (req, res) => {
    try {
      const bodySchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().optional().nullable(),
        kundli_birth_details: kundliBirthSchema,
      });
      const data = bodySchema.parse(req.body);
      const phoneHint = data.phone_number?.replace(/\D/g, "").slice(-10) || null;
      await saveKundliBirthForProfile(
        data.device_id,
        phoneHint,
        data.kundli_birth_details as KundliBirthDetails,
      );
      res.json({ ok: true, kundli_birth_details: data.kundli_birth_details });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      res.status(500).json({ message: "Failed to save kundli birth details", error: msg });
    }
  });

  app.post("/api/profiles/upsert", async (req, res) => {
    try {
      const bodySchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().optional().nullable(),
        name: z.string().optional().nullable(),
      });
      const data = bodySchema.parse(req.body);
      const row = await upsertProfileRow({
        deviceId: data.device_id,
        phoneNumber: data.phone_number ?? undefined,
        name: data.name ?? undefined,
      });
      res.status(200).json(row);
    } catch (error) {
      console.error("Error upserting profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid profile payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Profile sync unavailable" });
      }
      if (isMissingDbRelation(error) && msg.toLowerCase().includes("profiles")) {
        return res.status(503).json({
          message: "Profiles table missing",
          error: msg,
          hint: "Run migrations/0002_profiles_payment.sql in your Supabase SQL editor.",
        });
      }
      res.status(500).json({ message: "Failed to upsert profile", error: msg });
    }
  });

  app.post("/api/billing/payment-attempt", async (req, res) => {
    try {
      const bodySchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().min(10),
        amount_rupees: z.number().positive(),
        companion_id: z.string().optional().nullable(),
        rate_note: z.string().optional().nullable(),
        metadata: z.record(z.unknown()).optional(),
      });
      const data = bodySchema.parse(req.body);
      const row = await logPaymentAttemptRow({
        deviceId: data.device_id,
        phoneNumber: data.phone_number,
        amountRupees: data.amount_rupees,
        companionId: data.companion_id,
        rateNote: data.rate_note ?? undefined,
        metadata: data.metadata,
      });
      res.status(201).json(row);
    } catch (error) {
      console.error("Error logging payment attempt:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment attempt payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Billing log unavailable" });
      }
      if (isMissingDbRelation(error)) {
        return res.status(503).json({
          message: "Billing tables missing",
          error: msg,
          hint: "Run migrations/0002_profiles_payment.sql in your Supabase SQL editor.",
        });
      }
      res.status(500).json({ message: "Failed to log payment attempt", error: msg });
    }
  });

  app.get("/api/billing/wallet", async (req, res) => {
    try {
      const query = z
        .object({
          device_id: z.string().min(1),
          phone_number: z.string().optional(),
        })
        .parse(req.query);
      const phoneHint = query.phone_number?.replace(/\D/g, "").slice(-10) || null;
      const state = await getBillingState(query.device_id, phoneHint);
      res.json(state);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid query", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (msg.includes("SUPABASE_URL")) {
        return res.status(503).json({ message: "Billing unavailable" });
      }
      res.status(500).json({ message: "Failed to load wallet", error: msg });
    }
  });

  app.post("/api/billing/payments/:paymentId/cancel", async (req, res) => {
    try {
      const params = z.object({ paymentId: z.string().uuid() }).parse(req.params);
      const row = await markPaymentCancelled(params.paymentId);
      res.json({ cancelled: !!row });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payment id", errors: error.errors });
      }
      res.status(500).json({
        message: "Failed to cancel payment",
        error: serializeSupabaseError(error),
      });
    }
  });

  app.post("/api/payments/razorpay/create-order", async (req, res) => {
    try {
      const billingSchema = z.object({
        device_id: z.string().min(1),
        phone_number: z.string().min(10),
        product_type: z.enum([
          "chat_recharge",
          "photo_pack",
          "voice_chat",
          "premium_photo",
          "other",
        ]),
        companion_id: z.string().optional().nullable(),
        rate_note: z.string().optional().nullable(),
        metadata: z.record(z.unknown()).optional(),
      });
      const schema = z.object({
        amount_rupees: z.number().positive(),
        receipt: z.string().min(3).max(40).optional(),
        notes: z.record(z.string()).optional(),
        billing: billingSchema,
      });
      const body = schema.parse(req.body);
      const { keyId, keySecret } = getRazorpayCredentials();
      const amountPaise = Math.round(body.amount_rupees * 100);
      if (!Number.isFinite(amountPaise) || amountPaise < 100) {
        return res.status(400).json({ error: "Invalid amount (minimum is ₹1)" });
      }

      const pending = await createPendingPaymentRow({
        deviceId: body.billing.device_id,
        phoneNumber: body.billing.phone_number,
        amountRupees: body.amount_rupees,
        productType: body.billing.product_type as PaymentProductType,
        paymentGateway: PAYMENT_GATEWAY_RAZORPAY,
        companionId: body.billing.companion_id,
        rateNote: body.billing.rate_note ?? undefined,
        metadata: body.billing.metadata,
      });

      const receipt =
        body.receipt ?? `RCP_${Date.now().toString(36).toUpperCase()}`.slice(0, 40);
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const razorpayNotes = buildRazorpayGatewayNotes({
        paymentId: pending.id,
        productType: body.billing.product_type,
        companionId: body.billing.companion_id,
      });
      const upstream = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt,
          notes: razorpayNotes,
        }),
      });
      const raw = await upstream.text();
      if (!upstream.ok) {
        await markPaymentFailed(pending.id, `${PAYMENT_GATEWAY_RAZORPAY}_order_create_failed`);
        return res.status(502).json({
          error: "Failed to create Razorpay order",
          details: raw.slice(0, 400),
        });
      }
      const data = JSON.parse(raw) as { id: string; amount: number; currency: string };
      try {
        await attachGatewayOrderToPayment(
          pending.id,
          PAYMENT_GATEWAY_RAZORPAY,
          data.id,
        );
      } catch (attachErr) {
        console.error("[razorpay] Failed to attach order id to payment row:", attachErr);
        await markPaymentFailed(pending.id, "gateway_order_attach_failed");
        return res.status(500).json({
          error: "Payment row created but order link failed",
          payment_id: pending.id,
          details: serializeSupabaseError(attachErr),
        });
      }

      console.log(
        `[razorpay] create-order ok payment_id=${pending.id} razorpay_order=${data.id}`,
      );

      return res.json({
        payment_id: pending.id,
        payment_gateway: PAYMENT_GATEWAY_RAZORPAY,
        key_id: keyId,
        gateway_order_id: data.id,
        /** Razorpay Checkout SDK expects this field name. */
        razorpay_order_id: data.id,
        amount_paise: data.amount,
        currency: data.currency,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      const msg = serializeSupabaseError(error);
      if (isMissingDbRelation(error)) {
        return res.status(503).json({
          message: "Billing tables missing",
          hint: "Run migrations/0002_profiles_payment.sql and 0003_payment_ledger.sql in Supabase.",
          error: msg,
        });
      }
      return res.status(500).json({
        error: "Unable to create Razorpay order",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.post("/api/payments/razorpay/verify", async (req, res) => {
    try {
      const schema = z.object({
        razorpay_order_id: z.string().min(1),
        razorpay_payment_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
        payment_id: z.string().uuid().optional(),
      });
      const body = schema.parse(req.body);
      const { keySecret } = getRazorpayCredentials();
      const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
      const expected = crypto.createHmac("sha256", keySecret).update(payload).digest("hex");
      let verified = false;
      try {
        verified =
          expected.length === body.razorpay_signature.length &&
          crypto.timingSafeEqual(
            Buffer.from(expected, "utf8"),
            Buffer.from(body.razorpay_signature, "utf8"),
          );
      } catch {
        verified = false;
      }
      if (!verified) {
        const pending = await findPendingPaymentByGatewayOrder(
          PAYMENT_GATEWAY_RAZORPAY,
          body.razorpay_order_id,
        );
        if (pending?.id) {
          await markPaymentFailed(String(pending.id), "invalid_signature");
        }
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      let paymentId = body.payment_id;
      if (!paymentId) {
        const pending = await findPendingPaymentByGatewayOrder(
          PAYMENT_GATEWAY_RAZORPAY,
          body.razorpay_order_id,
        );
        paymentId = pending?.id ? String(pending.id) : undefined;
      }
      if (!paymentId) {
        return res.status(404).json({ error: "Payment record not found for this order" });
      }

      const result = await completePaymentSuccess({
        paymentId,
        paymentGateway: PAYMENT_GATEWAY_RAZORPAY,
        gatewayOrderId: body.razorpay_order_id,
        gatewayPaymentId: body.razorpay_payment_id,
      });

      return res.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid payload", errors: error.errors });
      }
      return res.status(500).json({
        error: "Unable to verify Razorpay payment",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  app.get('/api/chat/conversations', async (req, res) => {
    try {
      const query = ownerSchema.parse(req.query);
      const conversations = await getChatConversationsFromSupabase(
        query.userId,
        query.anonymousUserId,
      );

      res.json(conversations);
    } catch (error) {
      console.error('Error loading chat conversations:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid conversations query', errors: error.errors });
      }
      if (isSupabaseConfigError(error)) {
        return res.status(503).json({
          message:
            "Chat persistence unavailable — add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your server environment (e.g. Vercel project env).",
          error: serializeSupabaseError(error),
        });
      }
      res.status(500).json({
        message: "Failed to load chat conversations",
        error: serializeSupabaseError(error),
      });
    }
  });

  // Get messages - can filter by companion ID
  app.get('/api/messages', async (req, res) => {
    try {
      const companionId = req.query.companionId as string | undefined;
      const messages = await storage.getMessages(companionId);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send a message
  app.post('/api/messages', async (req, res) => {
    // Log detailed request information
    console.log('=== INCOMING REQUEST ===');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    console.log('Query:', JSON.stringify(req.query, null, 2));
    console.log('Params:', JSON.stringify(req.params, null, 2));
    console.log('========================');
    try {
      const conversationTurnSchema = z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      });
      // Validate request body with extended schema for premium photos
      const messageSchema = z.object({
        content: z.string().min(1),
        language: z.enum(['hindi', 'english']).default('hindi'),
        companionId: z.string().default('priya'),
        companionName: z.string().optional(),
        userName: z.string().optional(),
        // Optional photo fields for premium messages
        photoUrl: z.string().optional(),
        isPremium: z.boolean().optional(),
        skipUserMessage: z.boolean().optional(),
        role: z.enum(['user', 'assistant']).optional(), // Add role to schema
        messageCount: z.number().optional(), // Add message count to schema
        deviceId: z.string().optional(),
        phoneNumber: z.string().optional(),
        isAuthenticated: z.boolean().optional(), // Add auth state to schema
        /** Prior turns from the client (required on serverless — seeded UI messages are not in MemStorage). */
        conversationHistory: z.array(conversationTurnSchema).max(40).optional(),
      });
      
      const validatedData = messageSchema.parse(req.body);
      
      // User name: request body first, then guest profile cookie
      let userName = validatedData.userName?.trim() || '';
      const guestProfile = req.cookies?.guestProfile;
      if (!userName && guestProfile) {
        try {
          const profile = JSON.parse(guestProfile);
          userName = profile.name || '';
        } catch (e) {
          console.error('Error parsing user profile from cookie:', e);
        }
      }
      const companionName = validatedData.companionName?.trim() || '';
      // Check for premium photo offer BEFORE attempting LLM call
      const messageCount = validatedData.messageCount || 0;
      const isAuthenticated = validatedData.isAuthenticated || false;
      console.log('=== Premium Photo Check Debug ===');
      console.log('From req.body:', {
        messageCount: validatedData.messageCount,
        isAuthenticated: validatedData.isAuthenticated
      });
      console.log('Used for check:', {
        messageCount,
        isAuthenticated,
        meetsCriteria: isAuthenticated && messageCount >= 10 && messageCount % 10 === 0,
        modulo: messageCount % 10
      });
      
      if (isAuthenticated && messageCount >= 10 && messageCount % 10 === 0) {
        console.log('Premium photo offer triggered!');
        // This is a premium photo offer message
        const photoOfferMessage = `${userName ? userName + ", " : ""}Kya aap meri picture dekhna chahte ho jo maine kal click kari thi?`;
        
        console.log('Sending photo offer:', photoOfferMessage);
        
        // Save the premium photo offer message
        const botMessage = await storage.createMessage({
          content: photoOfferMessage,
          role: 'assistant',
          companionId: validatedData.companionId,
          isPremium: true
        });
        
        console.log('Photo offer message saved:', botMessage);
        
        // Only create a user message if not explicitly skipped
        let userMessage;
        if (!validatedData.skipUserMessage) {
          userMessage = await storage.createMessage({
            content: validatedData.content,
            role: 'user',
            companionId: validatedData.companionId,
            photoUrl: validatedData.photoUrl,
            isPremium: validatedData.isPremium
          });
        }
        // Return both messages
        return res.status(201).json({ userMessage, botMessage });
      }
      
      // Check if this is a photo message (premium or regular)
      const isPhotoMessage = !!validatedData.photoUrl;
      
      // Normal message flow (non-photo message) - Check if this is first user message BEFORE saving
      // Get conversation history for this specific companion BEFORE saving the new message
      const allMessages = await storage.getMessages();
      console.log('[DEBUG] All messages in storage:', allMessages.length);
      console.log('[DEBUG] All messages:', allMessages.map(m => ({ role: m.role, content: m.content.substring(0, 50) })));
      
      // Filter messages for this companion
      const companionMessages = allMessages.filter(
        msg => !msg.companionId || msg.companionId === validatedData.companionId
      );
      console.log('[DEBUG] Companion messages (filtered):', companionMessages.length);
      console.log('[DEBUG] Companion messages:', companionMessages.map(m => ({ role: m.role, content: m.content.substring(0, 50) })));
      
      // Check if this is the first user message (no previous user messages)
      const userMessages = companionMessages.filter(msg => msg.role === 'user');
      const isFirstUserMessage = userMessages.length === 0;
      console.log('[DEBUG] User messages count:', userMessages.length);
      console.log('[DEBUG] Is first user message:', isFirstUserMessage);
      
      // Only create a user message if not explicitly skipped
      let userMessage;
      if (!validatedData.skipUserMessage) {
        userMessage = await storage.createMessage({
          content: validatedData.content,
          role: 'user',
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
      }
      
      // If this is just saving a photo message (for premium photos), skip the LLM response
      if (isPhotoMessage && validatedData.isPremium) {
        console.log("Processing premium photo message with URL:", validatedData.photoUrl);
        
        // For premium photos, we directly create the bot response with the photo
        const botMessage = await storage.createMessage({
          content: validatedData.content,
          role: validatedData.role || 'assistant', // Use provided role or default to assistant
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        
        // Return both messages
        return res.status(201).json({ userMessage, botMessage });
      }
      
      // If a role is explicitly provided and it's 'assistant', create the message directly
      if (validatedData.role === 'assistant') {
        const botMessage = await storage.createMessage({
          content: validatedData.content,
          role: 'assistant',
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        
        return res.status(201).json({ userMessage, botMessage });
      }
      
      // Normal message flow (non-photo message)
      try {
        
        // Filter out welcome messages (simple "Hi" or "Hello" from assistant) if this is the first user message
        let filteredMessages = companionMessages;
        if (isFirstUserMessage) {
          console.log('[DEBUG] First user message detected. Filtering welcome messages...');
          console.log('[DEBUG] Companion messages before filter:', companionMessages.map(m => ({ role: m.role, content: m.content })));
          filteredMessages = companionMessages.filter(msg => {
            // Exclude welcome messages (assistant messages that are just "Hi" or "Hello")
            if (msg.role === 'assistant') {
              const content = msg.content.trim().toLowerCase();
              const isWelcomeMessage = content === 'hi' || content === 'hello' || 
                      content.startsWith('hi, main') || content.startsWith('hello, main');
              if (isWelcomeMessage) {
                console.log('[DEBUG] Filtering out welcome message:', msg.content);
              }
              return !isWelcomeMessage;
            }
            return true;
          });
          console.log('[DEBUG] Companion messages after filter:', filteredMessages.map(m => ({ role: m.role, content: m.content })));
        }
        
        const historyFromStorage = filteredMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        }));
        const fromClient = validatedData.conversationHistory;
        const conversationHistory =
          fromClient && fromClient.length > 0 ? fromClient.slice(-40) : historyFromStorage;
        
        console.log('[DEBUG] Conversation history being sent to LLM:', conversationHistory);
        console.log(
          '[DEBUG] History source:',
          fromClient && fromClient.length > 0 ? 'client' : 'storage',
        );
        console.log('[DEBUG] Is first user message:', isFirstUserMessage);

        let walletCreditsAfter: number | undefined;
        if (validatedData.deviceId) {
          const phoneDigits =
            validatedData.phoneNumber?.replace(/\D/g, "").slice(-10) || "";
          const deduct = await deductChatMessageCredit({
            deviceId: validatedData.deviceId,
            phoneHint: phoneDigits || null,
            messageCountFromClient: messageCount,
          });
          if (!deduct.ok) {
            return res.status(402).json({
              message: "Insufficient wallet balance for chat",
              code: "INSUFFICIENT_WALLET",
              wallet_credits: deduct.wallet_credits,
            });
          }
          walletCreditsAfter = deduct.wallet_credits;
        }
        
        // Generate AI response with additional context
        const responseContent = await generateResponse(
          validatedData.content,
          conversationHistory,
          validatedData.language,
          {
            companionId: validatedData.companionId,
            companionName: companionName || undefined,
            userName: userName || undefined,
          }
        );
        
        // Save the AI response with companion ID
        const botMessage = await storage.createMessage({
          content: responseContent,
          role: 'assistant',
          companionId: validatedData.companionId,
          photoUrl: validatedData.photoUrl,
          isPremium: validatedData.isPremium
        });
        
        // Return both messages
        res.status(201).json({
          userMessage,
          botMessage,
          ...(walletCreditsAfter !== undefined
            ? { wallet_credits: walletCreditsAfter }
            : {}),
        });
      } catch (error) {
        console.error('Error in message processing:', error);
        
        // If it's a rate limit error, send a friendly message
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage.toLowerCase().includes('rate limit')) {
          const botMessage = await storage.createMessage({
            content: "I'm getting too many messages right now. Can you please wait a moment and try again?",
            role: 'assistant',
            companionId: validatedData.companionId
          });
          return res.status(201).json({ userMessage, botMessage });
        }
        
        // For other errors, throw to be caught by outer catch block
        throw error;
      }
    } catch (error) {
      console.error('Error creating message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid request data', 
          errors: error.errors 
        });
      }
      
      // Return the actual error message for transparency
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({ 
        message: 'Failed to process message',
        error: errorMessage
      });
    }
  });

  // Clear all messages
  app.delete('/api/messages', async (req, res) => {
    try {
      await storage.clearMessages();
      res.status(200).json({ message: 'All messages cleared' });
    } catch (error) {
      console.error('Error clearing messages:', error);
      res.status(500).json({ message: 'Failed to clear messages' });
    }
  });

  // Never attach http.Server unless explicitly requested (`tsx server/index.ts`).
  // Vercel bundle (`api/index.js` from `server/vercel-express.ts`) passes `{ createHttpServer: false }`.
  if (opts?.createHttpServer !== true) {
    return undefined;
  }

  const httpServer = createServer(app);
  return httpServer;
}
