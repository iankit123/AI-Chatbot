/**
 * Turns chart maths into the Shaadi and Milan report payloads.
 * `facts` hold everything computed; `publicView` decides what a free preview may see,
 * so locked content never reaches an unpaid browser.
 */
import {
  analyseMarriage, computeChart, gunMilan, houseOf, moonPointFromName, moonPointOf,
  GANA, GANA_NAMES, NADI, NADI_NAMES, NAKSHATRA, PLANET_HI, PLANET_HINGLISH, RASHI, YONI, YONI_NAMES,
  type BirthInput, type Chart, type GunMilan, type MarriageFacts, type MoonPoint, type PlanetName,
} from "./engine";
import { generateJson, type PalmReading } from "./ai";
import { ASTRO_PRICES } from "@shared/astroProducts";
import { shaadiQuizLabels, type ShaadiQuizAnswers } from "@shared/shaadiQuiz";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const monthYear = (isoDate: string) => {
  const d = new Date(isoDate);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
const yearSpan = (a: string, b: string) => {
  const y1 = new Date(a).getUTCFullYear(), y2 = new Date(b).getUTCFullYear();
  // A window that only clips the edges of two outer years is really about the middle one.
  if (y2 - y1 >= 2) return `${y1 + 1}`;
  return y1 === y2 ? `${y1}` : `${y1}–${String(y2).slice(2)}`;
};
const ordinal = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;

/** Partner tendencies by the sign on the 7th house. */
const PARTNER_BY_SIGN: { looks: string; nature: string; work: string; sketch: string }[] = [
  { looks: "Athletic kad-kaathi, tez nazar, chehre par aatmavishwas", nature: "Josheela, seedhi baat karne wala, thoda gussail par dil ka saaf", work: "Police, sena, engineering, sports ya apna business", sketch: "sharp jawline, confident intense eyes, athletic build" },
  { looks: "Sundar aur bhara hua chehra, badi aankhen, aakarshak muskaan", nature: "Shaant, bharosemand, ghar-parivar se juda, thoda ziddi", work: "Bank, finance, khana, fashion ya kala se juda kaam", sketch: "soft rounded face, large calm eyes, gentle smile" },
  { looks: "Lamba-patla sharir, chanchal aankhen, umar se chhota dikhna", nature: "Baatuni, hasmukh, buddhiman, har cheez me dilchaspi", work: "Sales, media, likhna-padhna, IT ya vyapar", sketch: "slim face, bright lively eyes, youthful playful expression" },
  { looks: "Gol chehra, gora ya saaf rang, bhavuk aankhen", nature: "Bahut caring, bhavuk, parivar ko sabse upar rakhne wala", work: "Teaching, medical, hotel, sarkari seva", sketch: "round soft face, fair glowing skin, kind emotional eyes" },
  { looks: "Rob-daar vyaktitva, chauda maatha, ghane baal", nature: "Dildaar, swabhimani, leader jaisa, tareef pasand", work: "Sarkari pad, prashasan, rajneeti ya management", sketch: "broad forehead, thick hair, dignified proud expression" },
  { looks: "Saaf-suthra roop, patla sharir, tez aur samajhdar aankhen", nature: "Samajhdar, mehnati, har kaam me perfection, thoda chinta karne wala", work: "Accounts, doctor, teacher, analyst", sketch: "neat delicate features, slim face, thoughtful intelligent eyes" },
  { looks: "Bahut aakarshak, santulit naak-naksh, madhur muskaan", nature: "Milansaar, romantic, ladai se door rehne wala, sundarta pasand", work: "Design, kanoon, beauty, hospitality", sketch: "symmetrical attractive features, charming sweet smile, graceful look" },
  { looks: "Gehri aur tez aankhen, majboot sharir, rahasyamayi andaaz", nature: "Bahut gehra pyaar karne wala, wafadaar, possessive, raaz rakhne wala", work: "Research, medical, police, technical field", sketch: "deep piercing eyes, strong features, mysterious intense gaze" },
  { looks: "Lamba kad, chauda maatha, khula hasmukh chehra", nature: "Imaandar, dharmik, ghoomne ka shaukeen, azaad khayal", work: "Shiksha, kanoon, dharm, videsh se juda kaam", sketch: "tall build, broad forehead, open cheerful face" },
  { looks: "Gambhir chehra, patla-majboot sharir, umar ke saath nikharta roop", nature: "Zimmedar, mehnati, kam bolne wala par bharosemand", work: "Sarkari naukri, nirman, prashasan, purana jama hua business", sketch: "serious composed face, lean strong build, mature look" },
  { looks: "Lamba kad, alag sa aakarshak chehra, sochti hui aankhen", nature: "Alag soch wala, dost jaisa saathi, samaj ke liye kuch karne wala", work: "IT, vigyan, samaj seva, bade sangathan", sketch: "tall, distinctive features, thoughtful friendly eyes" },
  { looks: "Komal chehra, sapneeli badi aankhen, saumya muskaan", nature: "Dayalu, bhavuk, adhyatmik, tyag karne wala", work: "Kala, sangeet, chikitsa, adhyatm ya videsh", sketch: "soft gentle face, large dreamy eyes, serene smile" },
];

const REMEDY_BY_PLANET: Record<string, string[]> = {
  Sun: ["Roz subah Surya ko jal chadhayein", "Ravivar ko gud aur gehun ka daan karein"],
  Moon: ["Somvar ko Shivling par doodh-jal chadhayein", "Maa ka aashirwad lekar hi shubh kaam shuru karein"],
  Mars: ["Mangalvar ko Hanuman Chalisa ka paath karein", "Mangalvar ko masoor dal ya gud ka daan karein"],
  Mercury: ["Budhvar ko Ganesh ji ko durva chadhayein", "Budhvar ko hari moong ka daan karein"],
  Jupiter: ["Guruvar ko kele ke ped me jal chadhayein", "Guruvar ko chane ki dal aur haldi ka daan karein"],
  Venus: ["Shukravar ko Maa Lakshmi ko safed mithai ka bhog lagayein", "Shukravar ko chawal ya doodh ka daan karein"],
  Saturn: ["Shanivar ko peepal ke neeche sarson ke tel ka diya jalayein", "Shanivar ko zarooratmand ko kale til ya kambal daan karein"],
};

const TYPE_COPY: Record<MarriageFacts["marriageType"], { label: string; hi: string; reason: string }> = {
  love: { label: "Love marriage ke prabal yog", hi: "प्रेम विवाह", reason: "Pancham (prem) aur saptam (vivah) bhaav ke swami ka aapas me seedha sambandh ban raha hai." },
  love_arranged: { label: "Love-cum-arranged ke yog", hi: "प्रेम + पारिवारिक", reason: "Prem ke yog maujood hain, par rishta parivar ki sehmati se hi pakka hone ke sanket hain." },
  arranged: { label: "Arranged marriage ke yog", hi: "पारिवारिक विवाह", reason: "Saptam bhaav par paramparik grahon ka prabhav hai, rishta parivar ya jaan-pehchan ke zariye aane ke sanket hain." },
};

const DISTANCE_COPY: Record<MarriageFacts["partnerDistance"], string> = {
  near: "Apne hi shehar ya aas-paas ke ilaake se",
  far: "Dusre shehar ya rajya se",
  abroad: "Kaafi door se, dusre rajya ya videsh se jude hone ke sanket",
};

export type ShaadiInput = BirthInput;
/** A North Indian chart: house 1 first; `sign` is the rashi number (1 = Mesh), `planets` short Hindi names. */
export type KundliHouses = { baseIsLagna: boolean; houses: { sign: number; planets: string[] }[] };
export type ShaadiFacts = {
  kind: "shaadi";
  chart: { lagna: string | null; moonRashi: string; moonRashiHi: string; nakshatra: string; pada: number; timeKnown: boolean; placePrecise: boolean };
  marriage: MarriageFacts;
  /** Set on reports made in the /shaadi quiz flow (SHAADI_QUIZ test). */
  flow?: "quiz";
  /** How the buyer arrived: the problem picker (quiz flow) or the "steps" flow (classic questions one per screen). */
  entry?: "picker" | "picker29" | "quiz29" | "steps";
  quiz?: ShaadiQuizAnswers;
  kundli?: KundliHouses;
};

const PLANET_SHORT: Record<PlanetName, string> = {
  Sun: "सू", Moon: "चं", Mars: "मं", Mercury: "बु", Jupiter: "गु", Venus: "शु", Saturn: "श", Rahu: "रा", Ketu: "के",
};

/** The birth chart as houses with the planets in each, for drawing the kundli on the quiz-flow paywall. */
export function kundliHouses(input: BirthInput): KundliHouses {
  const chart = computeChart(input);
  const houses = Array.from({ length: 12 }, (_, i) => ({ sign: ((chart.baseSign + i) % 12) + 1, planets: [] as string[] }));
  for (const p of Object.keys(chart.signOf) as PlanetName[]) {
    houses[houseOf(chart.signOf[p], chart.baseSign) - 1].planets.push(PLANET_SHORT[p]);
  }
  return { baseIsLagna: chart.baseIsLagna, houses };
}

export function chartSummary(c: Chart) {
  return {
    lagna: c.lagnaSign !== null ? RASHI[c.lagnaSign].en : null,
    moonRashi: RASHI[c.moonSign].en,
    moonRashiHi: RASHI[c.moonSign].hi,
    nakshatra: NAKSHATRA[c.nakshatra],
    pada: c.pada,
    timeKnown: c.timeKnown,
    placePrecise: c.placePrecise,
  };
}

export function buildShaadiFacts(input: ShaadiInput): ShaadiFacts {
  const chart = computeChart(input);
  return { kind: "shaadi", chart: chartSummary(chart), marriage: analyseMarriage(chart, input) };
}

function shaadiSections(input: ShaadiInput, f: ShaadiFacts) {
  const m = f.marriage;
  const partner = PARTNER_BY_SIGN[m.seventhSign];
  const who = input.gender === "male" ? "patni" : "pati";
  const base = f.chart.timeKnown ? "lagna" : "Chandra lagna";
  const mangal = m.mangalDosh.present
    ? {
        present: true,
        title: "Mangal dosh maujood hai",
        text: `Aapki kundli me Mangal ${base} se ${ordinal(m.mangalDosh.marsHouse)} bhaav me hai, isliye Mangal dosh ban raha hai. Iska matlab shaadi rukna nahi hai. Manglik saathi se vivah ya saral upay se iska asar kaafi kam ho jaata hai.`,
        upay: ["Mangalvar ko Hanuman ji ko sindoor aur chameli ka tel chadhayein", "Vivah se pehle Mangal shanti ya Kumbh vivah ki salah kisi pandit se lein"],
      }
    : {
        present: false,
        title: "Mangal dosh nahi hai",
        text: `Aapki kundli me Mangal ${base} se ${ordinal(m.mangalDosh.marsHouse)} bhaav me hai, jo Mangal dosh nahi banata. Is taraf se vivah me koi rukavat nahi hai.`,
        upay: [] as string[],
      };
  return {
    snapshot: [
      { label: "Lagna", value: f.chart.lagna ?? "Janm samay na hone se Chandra lagna liya gaya" },
      { label: "Chandra rashi", value: `${f.chart.moonRashi} (${f.chart.moonRashiHi})` },
      { label: "Nakshatra", value: `${f.chart.nakshatra}, charan ${f.chart.pada}` },
      { label: "Saptam bhaav (vivah)", value: `${RASHI[m.seventhSign].en} rashi` },
      { label: "Saptamesh", value: `${PLANET_HINGLISH[m.seventhLord]}, ${ordinal(m.seventhLordHouse)} bhaav me` },
      { label: `${who === "patni" ? "Patni" : "Pati"} karak`, value: `${PLANET_HINGLISH[m.karaka]}, ${ordinal(m.karakaHouse)} bhaav me` },
    ],
    timing: {
      window: `${monthYear(m.window.start)} se ${monthYear(m.window.end)}`,
      strength: m.window.strength === "prabal" ? "Prabal yog" : "Madhyam yog",
      dasha: `${PLANET_HINGLISH[m.window.md]} mahadasha, ${PLANET_HINGLISH[m.window.ad]} antardasha`,
      jupiter: m.jupiterBlessing
        ? `${monthYear(m.jupiterBlessing.from)} se ${monthYear(m.jupiterBlessing.to)} tak gochar ka Guru aapke vivah bhaav ko bal de raha hai.`
        : null,
      next: m.nextWindow ? `${monthYear(m.nextWindow.start)} se ${monthYear(m.nextWindow.end)}` : null,
      delays: m.delayFactors,
    },
    type: TYPE_COPY[m.marriageType],
    partner: {
      who,
      letters: m.letters,
      letterSource: m.letterSource,
      looks: partner.looks,
      nature: partner.nature,
      work: partner.work,
      direction: m.partnerDirection.en,
      distance: DISTANCE_COPY[m.partnerDistance],
    },
    mangal,
    upay: REMEDY_BY_PLANET[m.seventhLord] ?? REMEDY_BY_PLANET.Venus,
  };
}

/** Sketch prompt for the partner portrait (a symbolic illustration, never a real person). */
export function portraitPrompt(input: ShaadiInput, f: ShaadiFacts): string {
  const partner = PARTNER_BY_SIGN[f.marriage.seventhSign];
  const age = Math.max(21, Math.min(45, new Date().getUTCFullYear() - Number(input.dob.slice(0, 4)) + (input.gender === "male" ? -2 : 2)));
  const subject = input.gender === "male"
    ? `a young Indian woman of about ${age}, in an elegant traditional outfit with a soft dupatta`
    : `a young Indian man of about ${age}, in a simple kurta`;
  return `A delicate hand-drawn pencil and soft watercolor portrait sketch of ${subject}. Features: ${partner.sketch}. Shoulders-up, facing slightly to the side, warm gentle expression. Style: fine graphite lines with light sepia and rose watercolor wash on textured ivory paper, artistic, tasteful, like an illustration in a keepsake book. Plain background. No text, no letters, no watermark, no frame.`;
}

export const TONE = `Likho simple, garmjoshi bhari Hinglish me (Roman lipi, jaise log WhatsApp par likhte hain). Vakya chhote rakho. "Sambhavna", "yog", "sanket" jaise shabd use karo, kabhi pakka dava ya guarantee mat do. Diye gaye tathyon se bahar koi nayi tareekh, akshar ya graha sthiti mat banao. Sirf JSON lautao.`;

export async function shaadiNarrative(input: ShaadiInput, f: ShaadiFacts, palm: PalmReading | null) {
  const s = shaadiSections(input, f);
  const fallback = {
    summary: `${input.name.split(/\s+/)[0]} ji, aapki kundli me vivah ka ${s.timing.strength.toLowerCase()} ${s.timing.window} ke beech ban raha hai. Aapke liye ${s.type.label.toLowerCase()} hain. Jeevansathi ka naam ${s.partner.letters.map((l) => l.latin).join(", ")} me se kisi akshar se shuru hone ki sambhavna hai.`,
    timing: `Is samay ${s.timing.dasha} chal rahi hogi, jo aapke saptam bhaav ko jagati hai. ${s.timing.jupiter ?? ""}`.trim(),
    partner: `Aapke saptam bhaav me ${RASHI[f.marriage.seventhSign].en} rashi hai, isliye jeevansathi ${s.partner.nature.charAt(0).toLowerCase() + s.partner.nature.slice(1)} hone ke sanket hain.`,
    meeting: `Rishta ${s.partner.distance.charAt(0).toLowerCase() + s.partner.distance.slice(1)} aur ${s.partner.direction} disha se aane ke sanket hain.`,
    advice: s.timing.delays.length
      ? `Thodi der ke yog ${s.timing.delays.join(", ")} ki wajah se hain. Sabr rakhein aur neeche diye upay niyamit karein.`
      : "Aapki kundli me vivah ko rokne wala koi bada dosh nahi hai. Sahi samay par aaye rishte ko gambhirta se dekhein.",
  };
  // Quiz-flow buyers told us their worry in their own words; the report should speak to it.
  const q = f.quiz ? shaadiQuizLabels(f.quiz) : null;
  const worryLine = q
    ? `\nUnki chinta (unke tappe hue jawab, Hindi me): "${q.detail}", ${q.since}. Unhe sabse pehle jaanna hai: "${q.want}". Summary ke pehle vakya me is chinta ko naam lekar seedha sambodhit karo, phir kundli ka jawab do.`
    : "";
  const ai = await generateJson(
    `Tum ek anubhavi Vedic jyotishi ho jo vivah bhavishya ki report likhte ho. ${TONE}`,
    `Vyakti: ${input.name}, ${input.gender === "male" ? "purush" : "mahila"}, janm ${input.dob}.${worryLine}
Kundli ke tathya (inhe hi aadhar banao):
${JSON.stringify({ snapshot: s.snapshot, vivah_samay: s.timing, vivah_prakar: s.type, jeevansathi: s.partner, mangal: s.mangal.title, hast_rekha: palm }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sabse zaroori nishkarsh, naam lekar",
 "timing": "2-3 vakya: yeh samay kyon, dasha aur Guru ke gochar ko aasan bhasha me",
 "partner": "3 vakya: jeevansathi ka swabhav aur roop, upar ke tathyon se",
 "meeting": "2 vakya: mulaqat kaise/kahan se hone ke sanket",
 "advice": "2 vakya: is samay ko safal banane ki vyavaharik salah"}`,
  );
  const pick = (k: keyof typeof fallback) => {
    const v = ai ? String(ai[k] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[k];
  };
  return { summary: pick("summary"), timing: pick("timing"), partner: pick("partner"), meeting: pick("meeting"), advice: pick("advice"), ai: !!ai };
}

export function shaadiView(row: { id: string; paid: boolean; input: ShaadiInput; facts: ShaadiFacts; narrative: any; palm: any; has_portrait: boolean }) {
  const { input, facts: f } = row;
  const m = f.marriage;
  const common = {
    id: row.id,
    type: "shaadi" as const,
    paid: row.paid,
    name: input.name,
    gender: input.gender,
    price: ASTRO_PRICES.shaadi,
    chart: f.chart,
    palmRead: !!row.palm,
    headline: m.window.strength === "prabal" ? "Aapki kundli me vivah ka prabal yog ban raha hai" : "Aapki kundli me vivah ka yog ban raha hai",
    letterCount: m.letters.length,
  };
  const years = yearSpan(m.window.start, m.window.end);
  const quizFlow = f.flow === "quiz" ? { flow: "quiz" as const, quiz: f.quiz } : {};
  if (!row.paid) {
    // The year itself is paid content: the free preview only learns whether it is one year or a span.
    const preview = { ...common, ...quizFlow, windowIsRange: years.includes("–"), firstLetter: m.letters[0], delayCount: m.delayFactors.length };
    if (f.flow !== "quiz") return preview;
    // The quiz-flow paywall draws the chart and names the 7th house; the readings stay locked.
    return {
      ...preview,
      kundli: f.kundli,
      seventh: { rashi: RASHI[m.seventhSign].hi, lord: PLANET_HI[m.seventhLord], lordHouse: m.seventhLordHouse },
    };
  }
  return {
    ...common,
    ...quizFlow,
    windowYears: years,
    sections: shaadiSections(input, f),
    narrative: row.narrative,
    palm: row.palm,
    hasPortrait: row.has_portrait,
  };
}

// ---------------------------------------------------------------- Milan

export type MilanQuestion = "shaadi" | "wapas" | "rishta";
export type MilanInput = {
  self: BirthInput;
  partner: { name: string; dob: string | null; tob: string | null; place: string | null };
  question: MilanQuestion;
};
export type MilanFacts = {
  kind: "milan";
  self: { moonRashi: string; nakshatra: string; mangal: boolean };
  partner: { moonRashi: string; nakshatra: string; mangal: boolean | null; basis: "kundli" | "dob_only" | "naam" };
  milan: GunMilan;
  yoni: [string, string];
  gana: [string, string];
  nadi: [string, string];
  band: "uttam" | "achha" | "madhyam" | "kamzor";
  mangalMatch: "none" | "both" | "one" | "unknown";
  selfWindow: { start: string; end: string };
  partnerWindow: { start: string; end: string } | null;
};

export class MilanInputError extends Error {}

export function buildMilanFacts(input: MilanInput): MilanFacts {
  const selfChart = computeChart(input.self);
  const selfMarriage = analyseMarriage(selfChart, input.self);
  const partnerGender = input.self.gender === "male" ? "female" : "male";

  let partnerPoint: MoonPoint;
  let basis: MilanFacts["partner"]["basis"];
  let partnerMangal: boolean | null = null;
  let partnerWindow: MilanFacts["partnerWindow"] = null;
  if (input.partner.dob) {
    const pInput: BirthInput = {
      name: input.partner.name, gender: partnerGender, dob: input.partner.dob,
      tob: input.partner.tob, place: input.partner.place || "India",
    };
    const pChart = computeChart(pInput);
    const pMarriage = analyseMarriage(pChart, pInput);
    partnerPoint = moonPointOf(pChart);
    basis = input.partner.tob ? "kundli" : "dob_only";
    partnerMangal = pMarriage.mangalDosh.present;
    partnerWindow = { start: pMarriage.window.start, end: pMarriage.window.end };
  } else {
    const fromName = moonPointFromName(input.partner.name);
    if (!fromName) throw new MilanInputError("Naam se rashi nahi nikal payi. Kripya janm tithi bharein.");
    partnerPoint = fromName;
    basis = "naam";
  }

  const selfPoint = moonPointOf(selfChart);
  const [groom, bride] = input.self.gender === "male" ? [selfPoint, partnerPoint] : [partnerPoint, selfPoint];
  const milan = gunMilan(groom, bride);
  const total = milan.total;
  const band: MilanFacts["band"] = total >= 28 ? "uttam" : total >= 21 ? "achha" : total >= 18 ? "madhyam" : "kamzor";
  const selfMangal = selfMarriage.mangalDosh.present;
  const mangalMatch: MilanFacts["mangalMatch"] =
    partnerMangal === null ? "unknown" : selfMangal && partnerMangal ? "both" : selfMangal || partnerMangal ? "one" : "none";

  const nSelf = selfPoint.nakshatra, nPartner = partnerPoint.nakshatra;
  return {
    kind: "milan",
    self: { moonRashi: RASHI[selfPoint.moonSign].en, nakshatra: NAKSHATRA[nSelf], mangal: selfMangal },
    partner: { moonRashi: RASHI[partnerPoint.moonSign].en, nakshatra: NAKSHATRA[nPartner], mangal: partnerMangal, basis },
    milan,
    yoni: [yoniName(nSelf), yoniName(nPartner)],
    gana: [ganaName(nSelf), ganaName(nPartner)],
    nadi: [nadiName(nSelf), nadiName(nPartner)],
    band,
    mangalMatch,
    selfWindow: { start: selfMarriage.window.start, end: selfMarriage.window.end },
    partnerWindow,
  };
}

const yoniName = (n: number) => YONI_NAMES[YONI[n]];
const ganaName = (n: number) => GANA_NAMES[GANA[n]];
const nadiName = (n: number) => NADI_NAMES[NADI[n]];

export const BAND_COPY: Record<MilanFacts["band"], { label: string; hi: string; line: string }> = {
  uttam: { label: "Uttam milan", hi: "उत्तम मिलान", line: "Yeh jodi shastron ke hisaab se bahut shubh maani jaati hai." },
  achha: { label: "Achha milan", hi: "अच्छा मिलान", line: "Yeh jodi vivah ke liye anukool maani jaati hai." },
  madhyam: { label: "Madhyam milan", hi: "मध्यम मिलान", line: "Milan seema par hai. Samajhdari aur upay ke saath rishta chal sakta hai." },
  kamzor: { label: "Kamzor milan", hi: "कमज़ोर मिलान", line: "Gun kam mile hain. Rishta namumkin nahi, par mehnat aur upay zaroori honge." },
};

export const BASIS_NOTE: Record<MilanFacts["partner"]["basis"], string> = {
  kundli: "Dono ki janm kundli se milan kiya gaya hai.",
  dob_only: "Saathi ka janm samay nahi tha, isliye unki rashi dopahar 12 baje ke Chandra se li gayi hai. Nakshatra me halka antar ho sakta hai.",
  naam: "Saathi ki janm tithi nahi thi, isliye naam ke pehle akshar se naam-rashi li gayi hai. Janm tithi dene par milan zyada sateek hoga.",
};

function overlap(a: { start: string; end: string }, b: { start: string; end: string } | null) {
  if (!b) return null;
  const s = a.start > b.start ? a.start : b.start;
  const e = a.end < b.end ? a.end : b.end;
  return s < e ? { start: s, end: e } : null;
}

function milanSections(input: MilanInput, f: MilanFacts) {
  const g = f.milan;
  const p = input.partner.name;
  const doshas: { name: string; present: boolean; text: string }[] = [
    {
      name: "Nadi dosh",
      present: g.nadiDosh,
      text: g.nadiDosh
        ? `Dono ki nadi ${f.nadi[0]} hai, isliye Nadi dosh ban raha hai. Shastron me ise sehat aur santaan sukh se joda jaata hai. Nadi dosh nivaran puja aur daan se iska asar kam maana jaata hai.`
        : `Aapki nadi ${f.nadi[0]} aur ${p} ki ${f.nadi[1]} hai. Nadi dosh nahi hai, jo sabse zaroori shubh sanket hai.`,
    },
    {
      name: "Bhakoot dosh",
      present: g.bhakootDosh,
      text: g.bhakootDosh
        ? `Dono ki rashiyon me ${g.bhakootPattern} sambandh hai, isliye Bhakoot dosh ban raha hai. Iska asar aapsi taalmel aur dhan par pad sakta hai. Rashi swami mitra hon to iska prabhav ghat jaata hai.`
        : "Dono ki rashiyon ka aapsi sthan shubh hai. Bhakoot dosh nahi hai.",
    },
    {
      name: "Mangal dosh",
      present: f.mangalMatch === "one",
      text:
        f.mangalMatch === "both" ? "Dono kundliyon me Mangal dosh hai, isliye yeh ek dusre ko kaat deta hai. Yeh shubh sthiti hai."
        : f.mangalMatch === "one" ? `${f.self.mangal ? "Aapki" : `${p} ki`} kundli me Mangal dosh hai aur dusre ki nahi. Vivah se pehle Mangal shanti karwana uchit rahega.`
        : f.mangalMatch === "none" ? "Dono me se kisi ki kundli me Mangal dosh nahi hai."
        : `${f.self.mangal ? "Aapki kundli me Mangal dosh hai." : "Aapki kundli me Mangal dosh nahi hai."} ${p} ka Mangal dosh janm tithi ke bina nahi dekha ja sakta.`,
    },
  ];
  const serious = (g.nadiDosh ? 1 : 0) + (g.bhakootDosh ? 1 : 0) + (f.mangalMatch === "one" ? 1 : 0);
  const good = f.band === "uttam" || f.band === "achha";
  const verdictLine =
    input.question === "wapas"
      ? good && serious === 0 ? `${p} ke saath aapka judaav gehra hai. Dobara baat banne ke sanket maujood hain.`
        : good ? `Judaav achha hai, par beech ke dosh doori ki wajah ban rahe hain. Pehal aur sabr se baat ban sakti hai.`
        : `Is rishte me khichav hai par sthirta kam hai. Wapsi ho bhi to pehle wali galtiyan dohraane se bachna hoga.`
      : input.question === "shaadi"
        ? good && serious === 0 ? `${p} ke saath vivah ke yog anukool hain.`
          : good ? `${p} ke saath vivah sambhav hai, par neeche diye dosh ka nivaran pehle karna uchit rahega.`
          : f.band === "madhyam" ? `${p} ke saath vivah ho sakta hai, par dono taraf se samjhaute aur upay zaroori honge.`
          : `${p} ke saath vivah me rukavatein dikh rahi hain. Faisla jaldbaazi me na lein aur upay zaroor karein.`
        : good ? `${p} ke saath aapka rishta sukhad rehne ke sanket hain.`
          : `${p} ke saath rishte me utaar-chadhav rahenge. Samajh aur sanvaad se ise sambhala ja sakta hai.`;

  const strengths = g.koots.filter((k) => k.score / k.max >= 0.75).map((k) => `${k.name} (${k.score}/${k.max}): ${k.meaning.toLowerCase()} me achha mel`);
  const challenges = g.koots.filter((k) => k.score / k.max <= 0.34).map((k) => `${k.name} (${k.score}/${k.max}): ${k.meaning.toLowerCase()} par dhyan dena hoga`);
  const both = overlap(f.selfWindow, f.partnerWindow);
  const upay = [
    ...(g.nadiDosh ? ["Nadi dosh nivaran ke liye Mahamrityunjaya jaap aur swarn/anna daan"] : []),
    ...(g.bhakootDosh ? ["Bhakoot dosh ke liye dono milkar Somvar ko Shiv-Parvati ki puja karein"] : []),
    ...(f.mangalMatch === "one" ? ["Mangal shanti puja, aur Mangalvar ko Hanuman Chalisa"] : []),
    "Shukravar ko Maa Lakshmi ya Radha-Krishna ko safed phool chadhayein",
    "Koi bhi bada faisla Guruvar ya Shukravar ko lein",
  ].slice(0, 4);

  return {
    koots: g.koots,
    doshas,
    verdict: { line: verdictLine, band: BAND_COPY[f.band] },
    strengths: strengths.slice(0, 4),
    challenges: challenges.slice(0, 4),
    timing: {
      self: `${monthYear(f.selfWindow.start)} se ${monthYear(f.selfWindow.end)}`,
      partner: f.partnerWindow ? `${monthYear(f.partnerWindow.start)} se ${monthYear(f.partnerWindow.end)}` : null,
      both: both ? `${monthYear(both.start)} se ${monthYear(both.end)}` : null,
    },
    pair: { yoni: f.yoni, gana: f.gana, nadi: f.nadi },
    upay,
    basisNote: BASIS_NOTE[f.partner.basis],
  };
}

/** "Varna, Vashya aur Tara" from the labelled koot lines. */
const g0 = (lines: string[]) => {
  const names = lines.map((l) => l.split(" (")[0]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} aur ${names[names.length - 1]}` : names[0];
};

export async function milanNarrative(input: MilanInput, f: MilanFacts) {
  const s = milanSections(input, f);
  const p = input.partner.name;
  const fallback = {
    summary: `${input.self.name.split(/\s+/)[0]} aur ${p.split(/\s+/)[0]} ke 36 me se ${f.milan.total} gun mile hain. ${s.verdict.band.line}`,
    bond: s.strengths.length
      ? `Is jodi ka sabse majboot paksh ${g0(s.strengths)} hai. In kooton me poora ya lagbhag poora mel hai.`
      : "Is jodi me taalmel banane ke liye dono ko barabar koshish karni hogi.",
    caution: s.challenges.length
      ? `${g0(s.challenges)} me ank kam aaye hain, isliye yahan samajhdari aur sabr ki zaroorat rahegi.`
      : "Koi badi chunauti nahi dikh rahi. Chhoti baaton ko bada na banne dein.",
    advice: s.timing.both
      ? `Dono ke liye sabse anukool samay ${s.timing.both} hai. Is dauraan baat aage badhana shubh rahega.`
      : `Aapke liye anukool samay ${s.timing.self} hai. Is dauraan rishte par dhyan dena shubh rahega.`,
  };
  const qText = input.question === "wapas" ? "Kya woh wapas aayenge / rishta dobara judega?" : input.question === "shaadi" ? "Kya inse shaadi hogi?" : "Hamara rishta kaisa rahega?";
  const ai = await generateJson(
    `Tum ek anubhavi Vedic jyotishi ho jo kundli milan (Ashtakoot gun milan) ki report likhte ho. ${TONE} Kisi ko yeh mat kaho ki rishta pakka tootega ya pakka hoga. Kam gun hone par bhi sammaan aur ummeed ke saath raasta batao.`,
    `Jodi: ${input.self.name} (${input.self.gender === "male" ? "purush" : "mahila"}) aur ${p}. Unka sawal: "${qText}"
Tathya:
${JSON.stringify({ kul_gun: `${f.milan.total}/36`, shreni: s.verdict.band.label, nishkarsh: s.verdict.line, koot: f.milan.koots.map((k) => `${k.name} ${k.score}/${k.max}`), dosh: s.doshas.map((d) => `${d.name}: ${d.present ? "hai" : "nahi"}`), mangal: f.mangalMatch, anukool_samay: s.timing, aadhar: s.basisNote }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sawal ka seedha jawab, dono ke naam aur gun sankhya ke saath",
 "bond": "2-3 vakya: is jodi ki sabse badi taakat, kooton ke aadhar par aasan bhasha me",
 "caution": "2-3 vakya: kahan savdhani chahiye aur kyon",
 "advice": "2 vakya: anukool samay aur ek vyavaharik salah"}`,
    800,
  );
  const pick = (k: keyof typeof fallback) => {
    const v = ai ? String(ai[k] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[k];
  };
  return { summary: pick("summary"), bond: pick("bond"), caution: pick("caution"), advice: pick("advice"), ai: !!ai };
}

export function milanView(row: { id: string; paid: boolean; input: MilanInput; facts: MilanFacts; narrative: any }) {
  const { input, facts: f } = row;
  const common = {
    id: row.id,
    type: "milan" as const,
    paid: row.paid,
    price: ASTRO_PRICES.milan,
    selfName: input.self.name,
    partnerName: input.partner.name,
    question: input.question,
    total: f.milan.total,
    band: BAND_COPY[f.band],
    self: { moonRashi: f.self.moonRashi, nakshatra: f.self.nakshatra },
    partner: { moonRashi: f.partner.moonRashi, nakshatra: f.partner.nakshatra, basis: f.partner.basis },
    basisNote: BASIS_NOTE[f.partner.basis],
  };
  if (!row.paid) {
    // Free preview: total score plus the three smallest koots; the rest stay locked server-side.
    return {
      ...common,
      koots: f.milan.koots.map((k, i) => (i < 3 ? k : { key: k.key, name: k.name, hi: k.hi, meaning: k.meaning, max: k.max, score: null })),
      doshCount: (f.milan.nadiDosh ? 1 : 0) + (f.milan.bhakootDosh ? 1 : 0) + (f.mangalMatch === "one" ? 1 : 0),
    };
  }
  return { ...common, sections: milanSections(input, f), narrative: row.narrative };
}
