import type { Express } from "express";
import { z } from "zod";
import { generateImage, readPalm } from "./services/astro/ai";
import {
  buildMilanFacts, buildShaadiFacts, milanNarrative, milanView, MilanInputError,
  portraitPrompt, shaadiNarrative, shaadiView,
  type MilanFacts, type MilanInput, type ShaadiFacts, type ShaadiInput,
} from "./services/astro/reports";
import {
  findSuccessfulPayment, getPortrait, getReport, insertReport, updateReport, type AstroReportRow,
} from "./services/astro/store";

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
  return row.report_type === "shaadi"
    ? shaadiView(row as AstroReportRow & { input: ShaadiInput; facts: ShaadiFacts })
    : milanView(row as AstroReportRow & { input: MilanInput; facts: MilanFacts });
}

/** Marks the report paid (when a successful payment exists) and writes the narrative once. */
async function unlockIfPaid(row: AstroReportRow): Promise<AstroReportRow> {
  if (!row.paid) {
    const paymentId = await findSuccessfulPayment(row.id);
    if (!paymentId) return row;
    row = { ...row, paid: true, payment_id: paymentId };
    await updateReport(row.id, { paid: true, payment_id: paymentId });
  }
  if (!row.narrative) {
    const narrative =
      row.report_type === "shaadi"
        ? await shaadiNarrative(row.input as ShaadiInput, row.facts as ShaadiFacts, (row.palm as any) ?? null)
        : await milanNarrative(row.input as MilanInput, row.facts as MilanFacts);
    row = { ...row, narrative };
    // Keep only AI-written text; a fallback is rebuilt next time so a brief AI outage does not stick.
    if (narrative.ai) await updateReport(row.id, { narrative });
  }
  return row;
}

export function registerAstroRoutes(app: Express) {
  app.post("/api/astro/shaadi/preview", async (req, res) => {
    try {
      const body = selfSchema
        .extend({
          device_id: z.string().min(1).max(120),
          palm_image: z.string().startsWith("data:image/").max(1_400_000).optional(),
        })
        .parse(req.body);
      const input: ShaadiInput = {
        name: body.name, gender: body.gender, dob: body.dob, tob: body.tob ?? null, place: body.place,
      };
      const facts = buildShaadiFacts(input);
      // The palm photo is read once and discarded; only the text reading is stored.
      const palm = body.palm_image ? await readPalm(body.palm_image) : null;
      const row = await insertReport({ report_type: "shaadi", device_id: body.device_id, input, facts, palm });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
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
      const row = await insertReport({ report_type: "milan", device_id: body.device_id, input, facts, palm: null });
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya sabhi jaankari sahi bharein", errors: error.errors });
      if (error instanceof MilanInputError) return res.status(400).json({ message: error.message });
      console.error("[astro] milan preview failed:", error);
      res.status(500).json({ message: "Milan nahi ban paya. Kripya dobara koshish karein." });
    }
  });

  app.get("/api/astro/report/:id", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      let row = await getReport(id);
      if (!row) return res.status(404).json({ message: "Report nahi mili" });
      row = await unlockIfPaid(row);
      res.json(view(row));
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(404).json({ message: "Report nahi mili" });
      console.error("[astro] report fetch failed:", error);
      res.status(500).json({ message: "Report load nahi ho payi" });
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
