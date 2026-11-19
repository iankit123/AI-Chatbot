import type { Express, Request } from "express";
import { metaPurchaseEventId } from "@shared/metaEvents";
import { isRealPhone, phoneDigits, priceForNewReport, priceOfReport, SHAADI_QUIZ } from "@shared/astroProducts";
import { isQuizAnswers, pickQuizAnswers, type QuizProduct } from "@shared/quizFlows";
import type { BirthInput } from "./services/astro/engine";
import { completePaymentSuccess, PAYMENT_GATEWAY_RAZORPAY, upsertProfileRow } from "./services/supabaseBilling";
import { metaContextFromRequest, sendMetaConversionEvent } from "./services/metaConversions";
import { z } from "zod";
import { generateImage, readPalm } from "./services/astro/ai";
import {
  buildMilanFacts, buildShaadiFacts, kundliHouses, milanNarrative, milanView, MilanInputError,
  portraitPrompt, shaadiNarrative, shaadiView,
  type MilanFacts, type MilanInput, type ShaadiFacts, type ShaadiInput,
} from "./services/astro/reports";
import {
  buildBusinessFacts, buildWapasFacts, businessNarrative, businessView, wapasNarrative, wapasView,
  type BusinessInput, type WapasInput,
} from "./services/astro/reports2";
import { buildNaukriFacts, naukriNarrative, naukriView, type NaukriInput } from "./services/astro/naukri";
import {
  getProfilePhone,
  getSuccessfulPaymentContact,
  findOpenPayments,
  findReportPaymentStatuses,
  findSuccessfulPayment,
  getPaymentForContact,
  setPaymentPhone, getPortrait, getReport, insertReport, updateReport, type AstroReportRow,
} from "./services/astro/store";
import { findCheckoutStatuses, findDeviceReports } from "./services/astro/store";

const dob = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const y = Number(v.slice(0, 4));
    return y >= 1930 && new Date(v).getTime() < Date.now();
  }, "Invalid date of birth");
const tob = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const personName = z.string().trim().min(2).max(60);

const selfSchema = z.object({
  name: personName,
  gender: z.enum(["male", "female"]),
  dob,
  tob: tob.nullable().optional(),
  place: z.string().trim().min(2).max(80),
});

function view(row: AstroReportRow) {
  const r = row as any;
  const v = (() => {
    switch (row.report_type) {
      case "shaadi": return shaadiView(r);
      case "milan": return milanView(r);
      case "wapas": return wapasView(r);
      case "business": return businessView(r);
      case "naukri": return naukriView(r);
    }
  })();
  // A paid report opens with the birth details it was made from, like a formal kundli report.
  const paidMeta = row.paid ? { birth: birthDetails(row.input), madeOn: row.created_at } : {};
  // Quiz-flow reports (any type) show their own strike price (₹999) and carry the buyer's answers;
  // the free preview also gets the birth chart to draw.
  const f = row.facts as { flow?: "quiz"; quiz?: unknown; entry?: string; kundli?: unknown } | null;
  if (f?.flow !== "quiz") return { ...v, ...paidMeta, ...(f?.entry ? { entry: f.entry } : {}), price: priceOfReport(row.report_type, row.price_rupees) };
  return {
    ...v,
    ...paidMeta,
    flow: "quiz" as const,
    quiz: f.quiz,
    entry: f.entry ?? null,
    ...(row.paid ? {} : { kundli: f.kundli }),
    // ₹99 shows ₹999 struck out; the ₹29 picker arm shows the usual strike for ₹29.
    price: row.price_rupees && row.price_rupees !== SHAADI_QUIZ.rupees
      ? priceOfReport(row.report_type, row.price_rupees)
      : { rupees: SHAADI_QUIZ.rupees, strike: SHAADI_QUIZ.strike },
  };
}

type BirthPerson = { name: string; gender: "male" | "female" | null; dob: string | null; tob: string | null; place: string | null };

/** The person (and, for Wapas and Milan, the partner) a report was made for, as they typed it. */
function birthDetails(input: Record<string, any>): { self: BirthPerson | null; partner: BirthPerson | null } {
  const person = (p: Record<string, any> | null | undefined): BirthPerson | null =>
    p?.name ? { name: String(p.name), gender: p.gender ?? null, dob: p.dob ?? null, tob: p.tob ?? null, place: p.place ?? null } : null;
  return input?.self ? { self: person(input.self), partner: person(input.partner) } : { self: person(input), partner: null };
}

class QuizInputError extends Error {}
const quizBody = {
  /** The quiz flow (SHAADI_QUIZ test) sends its six answers; they price the report at ₹99. */
  flow: z.literal("quiz").optional(),
  quiz: z.unknown().optional(),
  /**
   * "picker" / "picker29": came through the problem picker into a quiz flow (₹99 / ₹29). "quiz29": a
   * single-report quiz flow at ₹29 (the Wapas test). "steps": the picker, then the classic questions.
   */
  entry: z.enum(["picker", "picker29", "quiz29", "steps"]).optional(),
};

/**
 * Quiz-flow fields stored in facts (null for the classic flow). Kept out of `input`, so a buyer
 * who refills the same details still finds their earlier report.
 */
function quizFacts(product: QuizProduct, body: { flow?: "quiz"; quiz?: unknown; entry?: "picker" | "picker29" | "quiz29" | "steps" }, self: BirthInput) {
  if (body.flow !== "quiz") return null;
  if (!isQuizAnswers(product, body.quiz)) throw new QuizInputError("Kripya sabhi sawalon ke jawab chunein");
  const entry = body.entry && body.entry !== "steps" ? { entry: body.entry } : {};
  return { flow: "quiz" as const, quiz: pickQuizAnswers(body.quiz), ...entry, kundli: kundliHouses(self) };
}

/** Price of a quiz-flow report: ₹99, or ₹29 in the picker29 and quiz29 arms. */
const quizPrice = (body: { entry?: string }) => (body.entry === "picker29" || body.entry === "quiz29" ? SHAADI_QUIZ.lowRupees : SHAADI_QUIZ.rupees);

/** Tag for reports made through the "steps" flow (classic questions one per screen, normal price). */
const stepsTag = (body: { flow?: "quiz"; entry?: "picker" | "picker29" | "quiz29" | "steps" }) =>
  body.flow !== "quiz" && body.entry === "steps" ? { entry: "steps" as const } : {};

/** GET from the Razorpay API with the server's keys; null on any failure. */
async function razorpayGet<T>(path: string): Promise<T | null> {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId || !keySecret) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(`https://api.razorpay.com/v1/${path}`, {
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}` },
      signal: ctrl.signal,
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** A captured (or authorized) Razorpay payment id for this order, or null. */
async function paidRazorpayPayment(orderId: string): Promise<string | null> {
  const data = await razorpayGet<{ items?: { id: string; status: string }[] }>(`orders/${encodeURIComponent(orderId)}/payments`);
  const paid = data?.items?.find((p) => p.status === "captured" || p.status === "authorized");
  return paid?.id ?? null;
}

/** The phone the buyer typed on Razorpay's checkout, as 10 digits, or null. */
export async function razorpayBuyerPhone(gatewayPaymentId: string): Promise<string | null> {
  const payment = await razorpayGet<{ contact?: string }>(`payments/${encodeURIComponent(gatewayPaymentId)}`);
  const digits = phoneDigits(payment?.contact);
  // The contact-skip test sends a placeholder; never store it or pass it to Meta as the buyer's phone.
  return isRealPhone(digits) ? digits : null;
}

/** Save the buyer's phone on the payment row and link it to the device's profile. */
export async function rememberBuyerPhone(paymentRowId: string, deviceId: string, digits: string): Promise<void> {
  await setPaymentPhone(paymentRowId, digits);
  // Link this device's profile to the number, so the buyer is the same person across devices and products.
  await upsertProfileRow({ deviceId, phoneNumber: digits });
}

/**
 * Fallback for payments completed before the phone was fetched at payment time: report buyers
 * enter their phone on Razorpay's own screen, not ours, so copy it over when the report opens.
 */
async function captureBuyerPhone(paymentRowId: string): Promise<void> {
  const row = await getPaymentForContact(paymentRowId);
  if (!row?.gateway_payment_id || isRealPhone(row.phone_number)) return;
  const digits = await razorpayBuyerPhone(row.gateway_payment_id);
  if (digits) await rememberBuyerPhone(paymentRowId, row.device_id, digits);
}

/** True when this report already has a completed payment (including one Razorpay has but we never heard about). */
export async function reportAlreadyPaid(row: AstroReportRow, req?: Request, knownStatuses?: string[]): Promise<boolean> {
  if (row.paid) return true;
  const statuses = knownStatuses ?? (await findReportPaymentStatuses(row.id));
  // First checkout for this report: one quick lookup and nothing more, so first-time buyers wait no longer.
  if (statuses.length === 0) return false;
  if (statuses.includes("success")) return true;
  // A repeat attempt: the earlier one may have been paid in a UPI app without the page knowing.
  try {
    return (await reconcileWithRazorpay(row, req)) !== null;
  } catch (err) {
    console.error("[astro] reconcile before checkout failed:", err);
    return false;
  }
}

/**
 * Buyers who pay in a UPI app often never return to the page that opened checkout, so the
 * browser never confirms the payment. Ask Razorpay directly about this report's open orders
 * and complete any that were paid.
 */
async function reconcileWithRazorpay(row: AstroReportRow, req?: Request): Promise<string | null> {
  const open = await findOpenPayments(row.id);
  for (const p of open) {
    const gatewayPaymentId = await paidRazorpayPayment(p.gateway_order_id);
    if (!gatewayPaymentId) continue;
    const [result, buyerPhone] = await Promise.all([
      completePaymentSuccess({
        paymentId: p.id,
        paymentGateway: PAYMENT_GATEWAY_RAZORPAY,
        gatewayOrderId: p.gateway_order_id,
        gatewayPaymentId,
      }),
      razorpayBuyerPhone(gatewayPaymentId).catch(() => null),
    ]);
    console.log(`[astro] reconciled payment ${p.id} order=${p.gateway_order_id} report=${row.id}`);
    const purchase = "purchase" in result ? result.purchase : null;
    const phone = purchase?.phone_digits || buyerPhone;
    if (purchase && !purchase.phone_digits && buyerPhone) {
      await rememberBuyerPhone(p.id, purchase.device_id, buyerPhone).catch((err) => console.error("[astro] saving buyer phone failed:", err));
    }
    if (purchase && req) {
      // The browser never sent its Purchase, so tell Meta from here (same event id as the Pixel would use).
      await sendMetaConversionEvent({
        eventName: "Purchase",
        eventId: metaPurchaseEventId(p.gateway_order_id),
        context: metaContextFromRequest(req, null),
        deviceId: purchase.device_id,
        // Hashed by sendMetaConversionEvent; lets Meta match the buyer for Purchase audiences and lookalikes.
        phoneDigits: phone,
        customData: {
          value: purchase.amount_rupees,
          currency: "INR",
          content_ids: [p.gateway_order_id],
          content_type: "product",
          product_type: purchase.product_type,
        },
      }).catch((err) => console.error("[astro] Meta purchase after reconcile failed:", err));
    }
    return p.id;
  }
  return null;
}

function writeNarrative(row: AstroReportRow) {
  const input = row.input as any, facts = row.facts as any;
  switch (row.report_type) {
    case "shaadi": return shaadiNarrative(input, facts, (row.palm as any) ?? null);
    case "milan": return milanNarrative(input, facts);
    case "wapas": return wapasNarrative(input, facts);
    case "business": return businessNarrative(input, facts);
    case "naukri": return naukriNarrative(input, facts);
  }
}

/** Marks the report paid (when a successful payment exists) and writes the narrative once. */
async function unlockIfPaid(row: AstroReportRow, req?: Request): Promise<AstroReportRow> {
  let phoneTask: Promise<void> = Promise.resolve();
  if (!row.paid) {
    let paymentId = await findSuccessfulPayment(row.id);
    if (!paymentId) {
      try {
        paymentId = await reconcileWithRazorpay(row, req);
      } catch (err) {
        console.error("[astro] Razorpay reconcile failed:", err);
      }
    }
    if (!paymentId) return row;
    row = { ...row, paid: true, payment_id: paymentId };
    await updateReport(row.id, { paid: true, payment_id: paymentId });
    // Runs alongside the AI text below, so it adds no wait for the buyer.
    phoneTask = captureBuyerPhone(paymentId).catch((err) => console.error("[astro] buyer phone capture failed:", err));
  }
  if (!row.narrative) {
    const narrative = await writeNarrative(row);
    row = { ...row, narrative };
    // Keep only AI-written text; a fallback is rebuilt next time so a brief AI outage does not stick.
    if (narrative.ai) await updateReport(row.id, { narrative });
  }
  await phoneTask;
  return row;
}

/** Report details compared loosely: key order, letter case and extra spaces do not matter. */
function detailsKey(v: unknown): string {
  if (typeof v === "string") return JSON.stringify(v.trim().replace(/\s+/g, " ").toLowerCase());
  if (Array.isArray(v)) return `[${v.map(detailsKey).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${detailsKey(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}

/**
 * A report this phone already made from the same details that was paid for, or at least taken to
 * checkout. Buyers who pay in a UPI app often come back to a reloaded start page, fill the same
 * form again and used to land on a new unpaid report, with the pay button showing again. Reusing
 * the earlier report opens what they paid for, and keeps any further checkout on the report its
 * payment belongs to. Visitors who never opened checkout always get a fresh report, as before.
 */
async function sameDetailsReport(
  type: AstroReportRow["report_type"],
  deviceId: string,
  input: object,
  req: Request,
): Promise<AstroReportRow | null> {
  try {
    const key = detailsKey(input);
    const same = (await findDeviceReports(type, deviceId)).filter((r) => detailsKey(r.input) === key);
    if (!same.length) return null;
    const checkouts = await findCheckoutStatuses(same.map((r) => r.id));
    const pick =
      same.find((r) => r.paid || checkouts.get(r.id)?.includes("success")) ?? same.find((r) => checkouts.has(r.id));
    if (!pick) return null;
    const row = await getReport(pick.id);
    if (!row) return null;
    const unlocked = await unlockIfPaid(row, req);
    console.log(`[astro] same details again: reusing ${type} report ${row.id} (paid=${unlocked.paid})`);
    return unlocked;
  } catch (err) {
    console.error("[astro] same-details lookup failed:", err);
    return null;
  }
}

const partnerSchema = z.object({
  name: personName,
  dob: dob.nullable().optional(),
  tob: tob.nullable().optional(),
  place: z.string().trim().max(80).nullable().optional(),
});
const partnerInput = (p: z.infer<typeof partnerSchema>) => ({
  name: p.name,
  dob: p.dob ?? null,
  tob: p.dob ? p.tob ?? null : null,
  place: p.place || null,
});

export function registerAstroRoutes(app: Express) {
  app.post("/api/astro/shaadi/preview", async (req, res) => {
    try {
      const body = selfSchema
        .extend({
          device_id: z.string().min(1).max(120),
          palm_image: z.string().startsWith("data:image/").max(1_400_000).optional(),
          ...quizBody,
        })
        .parse(req.body);
      const input: ShaadiInput = {
        name: body.name, gender: body.gender, dob: body.dob, tob: body.tob ?? null, place: body.place,
      };
      const quiz = quizFacts("shaadi", body, input);
      const earlier = await sameDetailsReport("shaadi", body.device_id, input, req);
      // A new palm photo on a report that is not paid yet gets a fresh report, so the palm is read.
      if (earlier && (earlier.paid || !body.palm_image)) return res.json(view(earlier));
      const facts: ShaadiFacts = { ...buildShaadiFacts(input), ...(quiz as Partial<ShaadiFacts> | null), ...stepsTag(body) };
      // The palm photo is read once and discarded; only the text reading is stored.
      const palm = body.palm_image ? await readPalm(body.palm_image) : null;
      const price = quiz ? quizPrice(body) : priceForNewReport("shaadi", body.device_id);
      const row = await insertReport({ report_type: "shaadi", device_id: body.device_id, input, facts, palm, price_rupees: price });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof QuizInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] shaadi preview failed:", error);
      res.status(500).json({ message: "Report nahi ban payi. Kripya dobara koshish karein." });
    }
  });

  app.post("/api/astro/milan/preview", async (req, res) => {
    try {
      const body = z
        .object({
          device_id: z.string().min(1).max(120),
          self: selfSchema,
          partner: z.object({
            name: personName,
            dob: dob.nullable().optional(),
            tob: tob.nullable().optional(),
            place: z.string().trim().max(80).nullable().optional(),
          }),
          question: z.enum(["shaadi", "wapas", "rishta"]).default("shaadi"),
        })
        .parse(req.body);
      const input: MilanInput = {
        self: { ...body.self, tob: body.self.tob ?? null },
        partner: {
          name: body.partner.name,
          dob: body.partner.dob ?? null,
          tob: body.partner.dob ? body.partner.tob ?? null : null,
          place: body.partner.place || null,
        },
        question: body.question,
      };
      const facts = buildMilanFacts(input);
      const earlier = await sameDetailsReport("milan", body.device_id, input, req);
      if (earlier) return res.json(view(earlier));
      const row = await insertReport({ report_type: "milan", device_id: body.device_id, input, facts, palm: null, price_rupees: priceForNewReport("milan", body.device_id) });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof QuizInputError) return res.status(400).json({ message: error.message });
      if (error instanceof MilanInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] milan preview failed:", error);
      res.status(500).json({ message: "Milan nahi ban paya. Kripya dobara koshish karein." });
    }
  });

  app.post("/api/astro/wapas/preview", async (req, res) => {
    try {
      const body = z
        .object({
          device_id: z.string().min(1).max(120),
          self: selfSchema,
          partner: partnerSchema,
          status: z.enum(["breakup", "no_contact", "fight", "separated"]).default("no_contact"),
          ...quizBody,
        })
        .parse(req.body);
      const input: WapasInput = { self: { ...body.self, tob: body.self.tob ?? null }, partner: partnerInput(body.partner), status: body.status };
      const quiz = quizFacts("wapas", body, input.self);
      const facts = { ...buildWapasFacts(input), ...quiz, ...stepsTag(body) };
      const earlier = await sameDetailsReport("wapas", body.device_id, input, req);
      if (earlier) return res.json(view(earlier));
      const price = quiz ? quizPrice(body) : priceForNewReport("wapas", body.device_id);
      const row = await insertReport({ report_type: "wapas", device_id: body.device_id, input, facts, palm: null, price_rupees: price });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof QuizInputError) return res.status(400).json({ message: error.message });
      if (error instanceof MilanInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] wapas preview failed:", error);
      res.status(500).json({ message: "Report nahi ban payi. Kripya dobara koshish karein." });
    }
  });

  app.post("/api/astro/business/preview", async (req, res) => {
    try {
      const body = selfSchema
        .extend({
          device_id: z.string().min(1).max(120),
          situation: z.enum(["naukri", "business", "berozgar", "student"]),
          budget: z.number().int().min(1).max(6),
          /** 2 = six budget steps. Pages built before this change send no scale and four steps. */
          budget_scale: z.literal(2).optional(),
          ...quizBody,
        })
        .parse(req.body);
      const input: BusinessInput = {
        name: body.name, gender: body.gender, dob: body.dob, tob: body.tob ?? null, place: body.place,
        situation: body.situation, budget: body.budget,
        ...(body.budget_scale ? { budget_scale: body.budget_scale } : {}),
      };
      const quiz = quizFacts("business", body, input);
      const facts = { ...buildBusinessFacts(input), ...quiz, ...stepsTag(body) };
      const earlier = await sameDetailsReport("business", body.device_id, input, req);
      if (earlier) return res.json(view(earlier));
      const price = quiz ? quizPrice(body) : priceForNewReport("business", body.device_id);
      const row = await insertReport({ report_type: "business", device_id: body.device_id, input, facts, palm: null, price_rupees: price });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof QuizInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] business preview failed:", error);
      res.status(500).json({ message: "Report nahi ban payi. Kripya dobara koshish karein." });
    }
  });

  app.post("/api/astro/naukri/preview", async (req, res) => {
    try {
      const body = selfSchema
        .extend({
          device_id: z.string().min(1).max(120),
          status: z.enum(["taiyari", "result", "private", "attempts"]),
          target: z.enum(["railway", "ssc_bank", "police_army", "teacher", "upsc_pcs", "open"]),
          ...quizBody,
        })
        .parse(req.body);
      const input: NaukriInput = {
        name: body.name, gender: body.gender, dob: body.dob, tob: body.tob ?? null, place: body.place,
        status: body.status, target: body.target,
      };
      const quiz = quizFacts("naukri", body, input);
      const facts = { ...buildNaukriFacts(input), ...quiz, ...stepsTag(body) };
      const earlier = await sameDetailsReport("naukri", body.device_id, input, req);
      if (earlier) return res.json(view(earlier));
      const price = quiz ? quizPrice(body) : priceForNewReport("naukri", body.device_id);
      const row = await insertReport({ report_type: "naukri", device_id: body.device_id, input, facts, palm: null, price_rupees: price });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof QuizInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] naukri preview failed:", error);
      res.status(500).json({ message: "Report nahi ban payi. Kripya dobara koshish karein." });
    }
  });

  app.get("/api/astro/report/:id", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      let row = await getReport(id);
      if (!row) return res.status(404).json({ message: "Report nahi mili" });
      row = await unlockIfPaid(row, req);
      if (!row.paid) return res.json(view(row));
      // Paid: ask for the buyer's number when neither Razorpay nor an earlier purchase gave a real one.
      const [payment, profilePhone] = await Promise.all([
        getSuccessfulPaymentContact(row.id),
        getProfilePhone(row.device_id).catch(() => null),
      ]);
      const needsPhone = !isRealPhone(payment?.phone_number) && !isRealPhone(profilePhone);
      res.json({ ...view(row), needsPhone });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(404).json({ message: "Report nahi mili" });
      console.error("[astro] report fetch failed:", error);
      res.status(500).json({ message: "Report load nahi ho payi" });
    }
  });

  /** The buyer's phone, typed after payment when checkout did not provide a real one. */
  app.post("/api/astro/report/:id/phone", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const digits = phoneDigits(z.object({ phone: z.string().max(20) }).parse(req.body).phone);
      if (!isRealPhone(digits)) return res.status(400).json({ message: "Kripya sahi 10 ankon ka mobile number daalein." });
      const row = await getReport(id);
      if (!row) return res.status(404).json({ message: "Report nahi mili" });
      const payment = await getSuccessfulPaymentContact(row.id);
      if (!payment) return res.status(409).json({ message: "Is report ka payment nahi mila" });
      // Never overwrite a real number that is already stored.
      if (!isRealPhone(payment.phone_number)) await rememberBuyerPhone(payment.id, row.device_id, digits);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sahi mobile number daalein." });
      console.error("[astro] saving buyer phone failed:", error);
      res.status(500).json({ message: "Number save nahi ho paya. Dobara koshish karein." });
    }
  });

  /** Draws the partner sketch for a paid Shaadi report (slow, so the page calls it separately). */
  app.post("/api/astro/report/:id/portrait", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const row = await getReport(id);
      if (!row || row.report_type !== "shaadi") return res.status(404).json({ ready: false });
      if (!row.paid) return res.status(402).json({ ready: false });
      if (row.has_portrait) return res.json({ ready: true });
      const image = await generateImage(portraitPrompt(row.input as ShaadiInput, row.facts as ShaadiFacts));
      if (!image) return res.json({ ready: false });
      await updateReport(id, { portrait: image, has_portrait: true });
      res.json({ ready: true });
    } catch (error) {
      console.error("[astro] portrait failed:", error);
      res.status(500).json({ ready: false });
    }
  });

  app.get("/api/astro/report/:id/portrait", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const row = await getReport(id);
      if (!row?.paid || !row.has_portrait) return res.status(404).end();
      const dataUrl = await getPortrait(id);
      const match = dataUrl?.match(/^data:(image\/[a-z+]+);base64,([\s\S]+)$/);
      if (!match) return res.status(404).end();
      res.setHeader("Content-Type", match[1]);
      res.setHeader("Cache-Control", "private, max-age=86400");
      res.end(Buffer.from(match[2], "base64"));
    } catch {
      res.status(404).end();
    }
  });
}
