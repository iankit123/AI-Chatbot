/**
 * "Bataiye, aapko aur kya jaanna hai?" at the end of a paid report: the buyer's question is
 * answered from their own chart and their report's findings, and stored with the answer.
 * Questions asked before answering existed are answered the next time the report is opened.
 */
import type { Express } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { crisisSupportReply, isSelfHarmMessage } from "@shared/crisisSupport";
import { insertAppEventRow } from "./services/appEvents";
import { generateJson } from "./services/astro/ai";
import {
  computeChart, houseOf, NAKSHATRA, PLANET_HINGLISH, RASHI, vimshottari,
  type BirthInput, type PlanetName,
} from "./services/astro/engine";
import { milanView, monthYear, shaadiView } from "./services/astro/reports";
import { businessView, wapasView } from "./services/astro/reports2";
import { getReport, type AstroReportRow } from "./services/astro/store";

/** Answers per report; questions beyond this are still recorded for product ideas. */
const MAX_ANSWERS = 5;

const admin = () => {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

type QuestionRow = { id: string; created_at: string; properties: Record<string, any> };

async function listQuestions(reportId: string): Promise<QuestionRow[]> {
  const { data, error } = await admin()
    .from("app_events")
    .select("id, created_at, properties")
    .eq("event_name", "astro_question")
    .eq("properties->>report_id", reportId)
    .order("created_at", { ascending: true })
    .limit(30);
  if (error) throw error;
  return (data ?? []) as QuestionRow[];
}

async function saveAnswer(row: QuestionRow, answer: string): Promise<void> {
  const { error } = await admin()
    .from("app_events")
    .update({ properties: { ...row.properties, answer, answered_at: new Date().toISOString() } })
    .eq("id", row.id);
  if (error) throw error;
}

const selfInput = (row: AstroReportRow): BirthInput => ((row.input as any).self ?? row.input) as BirthInput;

/** The buyer's chart in plain terms, including the next few planetary periods with dates. */
function chartBrief(b: BirthInput) {
  const c = computeChart(b);
  const now = new Date();
  return {
    lagna: c.lagnaSign !== null ? RASHI[c.lagnaSign].en : "janm samay nahi, Chandra lagna se dekha",
    chandra_rashi: RASHI[c.moonSign].en,
    nakshatra: NAKSHATRA[c.nakshatra],
    graha: (Object.keys(c.signOf) as PlanetName[]).map(
      (p) => `${PLANET_HINGLISH[p]}: ${RASHI[c.signOf[p]].en}, ${houseOf(c.signOf[p], c.baseSign)}va bhaav`,
    ),
    aane_wali_dasha: vimshottari(c)
      .filter((p) => p.end > now)
      .slice(0, 8)
      .map((p) => `${PLANET_HINGLISH[p.md]} mahadasha, ${PLANET_HINGLISH[p.ad]} antardasha: ${monthYear(p.start.toISOString())} se ${monthYear(p.end.toISOString())}`),
  };
}

/** What the buyer's paid report already told them, so the answer never contradicts it. */
function reportFindings(row: AstroReportRow) {
  const r = { ...row, paid: true } as any;
  const v: any =
    row.report_type === "shaadi" ? shaadiView(r)
    : row.report_type === "milan" ? milanView(r)
    : row.report_type === "wapas" ? wapasView(r)
    : businessView(r);
  return JSON.stringify({ report: row.report_type, nishkarsh: v.sections, saar: v.narrative?.summary }).slice(0, 3500);
}

const SYSTEM = `Tum ek anubhavi, samvedansheel Vedic jyotishi ho. Ek grahak ne apni paid report padhne ke baad sawal poocha hai. Uski kundli ke tathyon aur report ke nishkarshon ke aadhar par seedha jawab do.
Niyam:
- Jis bhasha aur lipi me sawal hai, usi me jawab do: Devanagari me sawal ho to Devanagari Hindi, Roman Hinglish me ho to Roman Hinglish, English me ho to simple English.
- 60 se 130 shabd. Pehle seedha jawab, phir kundli ka chhota karan (dasha, bhaav ya graha), phir ek vyavaharik salah.
- Report ke samay, akshar aur nishkarsh ke ulta mat bolo. Koi bhi tareekh sirf di gayi dasha list se lo.
- "Sambhavna", "yog", "sanket" ki bhasha. Pakka dava ya guarantee kabhi nahi.
- Kisi aur vyakti (dost, rishtedar) ki kundli pooche to batao ki yeh report unki apni kundli ki hai; doosre vyakti ke liye puchlo.in par uski alag report banayein, aur rishta milana ho to Milan report.
- Photo, WhatsApp ya phone par baat maange to narmi se batao ki yahan photo nahi dekhi ja sakti, phir kundli ke aadhar par jo bata sakte ho woh batao.
- Kisi aur jyotishi ki baat se asahmati ho to bina behas ke batao ki yeh report kis dasha par aadharit hai, aur alag paddhatiyon me thoda antar ho sakta hai.
- Dukh, udaasi ya rishta tootne ki baat ho to pehle unki bhavna samjho, himmat do, apno se baat karne ki salah do. Darr mat dikhao.
- Sehat, garbh, kanoon ya bade paise ke faisle par pakki baat nahi; zaroorat ho to doctor ya visheshagya se milne ko kaho.
- Koi paid puja, ratna ya mehnga upay mat sujhao. Saral, muft upay chalega.
- Khud ko AI mat kaho. Sirf JSON lautao.`;

async function answerQuestion(row: AstroReportRow, question: string): Promise<string | null> {
  if (isSelfHarmMessage(question)) {
    const english = !/[\u0900-\u097F]/.test(question) && /\b(i|me|my|want|life)\b/i.test(question);
    return crisisSupportReply(english ? "english" : "hindi");
  }
  const b = selfInput(row);
  const ai = await generateJson(
    SYSTEM,
    `Grahak: ${b.name}, ${b.gender === "male" ? "purush" : "mahila"}, janm ${b.dob}${b.tob ? ` ${b.tob}` : ""}, ${b.place}.
Kundli: ${JSON.stringify(chartBrief(b))}
Report ke nishkarsh: ${reportFindings(row)}

Sawal: "${question}"

Yeh JSON do: {"answer": "jawab"}`,
    700,
  );
  const answer = ai ? String(ai.answer ?? "").trim() : "";
  return answer.length > 20 ? answer.slice(0, 1500) : null;
}

const view = (q: QuestionRow) => ({
  id: q.id,
  question: String(q.properties.question ?? ""),
  answer: (q.properties.answer as string | undefined) ?? null,
});

export function registerAstroAskRoutes(app: Express) {
  /** The report's questions with answers. Unanswered ones (asked before answering existed) are answered now. */
  app.get("/api/astro/report/:id/questions", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const row = await getReport(id);
      if (!row?.paid) return res.status(404).json({ items: [], remaining: 0 });
      const rows = await listQuestions(id);
      let answered = rows.filter((q) => q.properties.answer).length;
      const pending = rows.filter((q) => !q.properties.answer && q.properties.question).slice(0, Math.max(0, MAX_ANSWERS - answered)).slice(0, 3);
      await Promise.all(
        pending.map(async (q) => {
          const answer = await answerQuestion(row, String(q.properties.question).slice(0, 500));
          if (!answer) return;
          await saveAnswer(q, answer);
          q.properties = { ...q.properties, answer };
          answered += 1;
        }),
      );
      res.json({ items: rows.map(view), remaining: Math.max(0, MAX_ANSWERS - answered) });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(404).json({ items: [], remaining: 0 });
      console.error("[astro-ask] list failed:", error);
      res.status(500).json({ items: [], remaining: 0 });
    }
  });

  app.post("/api/astro/report/:id/questions", async (req, res) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const { question } = z.object({ question: z.string().trim().min(3).max(500) }).parse(req.body);
      const row = await getReport(id);
      if (!row) return res.status(404).json({ message: "Report nahi mili" });
      if (!row.paid) return res.status(402).json({ message: "Pehle report kholein" });
      const answered = (await listQuestions(id)).filter((q) => q.properties.answer).length;
      const answer = answered < MAX_ANSWERS ? await answerQuestion(row, question) : null;
      const saved = await insertAppEventRow({
        eventName: "astro_question",
        deviceId: row.device_id,
        properties: {
          report: row.report_type,
          report_id: row.id,
          question,
          ...(answer ? { answer, answered_at: new Date().toISOString() } : {}),
        },
      });
      const remaining = Math.max(0, MAX_ANSWERS - answered - (answer ? 1 : 0));
      if (!answer && answered < MAX_ANSWERS) {
        // Kept unanswered; the next time the report opens it is answered.
        return res.status(503).json({ message: "Abhi jawab nahi ban paya. Thodi der baad report dobara kholein, jawab yahin milega.", item: { id: saved.id, question, answer: null }, remaining });
      }
      res.json({ item: { id: saved.id, question, answer }, remaining });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Kripya apna sawal likhein (3 se 500 akshar)." });
      console.error("[astro-ask] answer failed:", error);
      res.status(500).json({ message: "Abhi jawab nahi ban paya. Kripya dobara koshish karein." });
    }
  });
}
