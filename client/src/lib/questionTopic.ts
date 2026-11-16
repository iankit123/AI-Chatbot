import type { AstroReport } from "@/lib/astroApi";

/**
 * Which other report fits a question asked in a paid report's question box.
 * Buyers type a specific person ("Priyanka rohit se pyar krti hai?", "Sourabh DOB 24/09/1997 se
 * vivah?"), a job or a business into the box; each gets a card for the report that answers it.
 */
export type QuestionSuggestion =
  | { kind: "milan"; partnerName: string | null; partnerDob: string | null }
  | { kind: "naukri" }
  | { kind: "business" };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const NAUKRI = /\b(naukri|naukari|nokri|nukri|nokari|job|jobs|career|carier|carrier|sarkari|govt|government|salary|promotion|exam|placement|interview)\b|नौकरी|नोकरी|करियर|कैरियर|सरकारी|जॉब|परीक्षा/i;
const BUSINESS = /\b(business|buisness|bussiness|busines|bijnes|vyapar|vyapaar|vypar|vyaapar|dhandha|dhanda|dukan|dukaan|shop|startup)\b|व्यापार|व्यवसाय|धंधा|धंधे|दुकान|बिज़नेस|बिजनेस/i;
const MILAN = new RegExp(
  [
    "\\b(gun|kundli|kundali|kundali)\\s*milan\\b",
    "\\bmilan\\b",
    "\\b(match|matching)\\b",
    "\\b(rishta|rista|rishtaa|rishte)\\b.{0,15}\\b(aaya|aya|aayaa|aa raha|aaye|aya hai)\\b",
    "\\b(is|iss|isi|issi)\\s+(ladki|ladke|ladka|larki|ldki|ldhki|ladaki|rishte)\\b",
    "\\b(usse|unse|uss?e|un se|us se)\\s+(hi\\s+)?(shadi|shaadi|sadi|sadhi|vivah|vivaah|rishta|relationship)\\b",
    "\\b(shadi|shaadi|sadi|sadhi|vivah)\\b.{0,12}\\b(usse|unse|us se|un se)\\b",
    "\\b(dob|d\\.o\\.b|date of birth)\\b",
    "रिश्ता.{0,20}आया",
    "गुण\\s*मिलान|कुंडली\\s*मिलान",
  ].join("|"),
  "i",
);

/** Words that sit where a name would but are not one. */
const NOT_A_NAME = new Set(
  (
    "us usse uss un unse is iss isse isi issi kis kisi jis mujh mujhe mere meri mera aap aapki aapka tum hum ham " +
    "ghar ladki ladke ladka larki ldki kab kaise kaisa kaisi kya koi kaun kon ex bf gf boyfriend girlfriend boyfrnd " +
    "pati patni wife husband pehle phir fir aur or ki ka ke ko se me mai main love arrange jaldi kahan kaha abhi " +
    "dusri dusre dhushri apne apni family wo vo bo woh ye yeh inse unke uske uski name naam meri shadi shaadi sadi " +
    "vivah rishta rista relationship pyar pyaar baat bat hogi hoga hai h nahi nhi kar karna marriage the ek bhi to " +
    "dob birth time date place frnd friend dost sir ji mam madam baby jaan babu crush partner spouse soulmate bhai didi"
  ).split(" "),
);

const titleCase = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** Turns captured words into a name, skipping filler and the buyer's own name. `last` keeps one word. */
function cleanName(raw: string | undefined, own: Set<string>, last = false): string | null {
  if (!raw) return null;
  const words = raw
    .trim()
    .split(/\s+/)
    .filter((w) => /^[a-z]{3,20}$/i.test(w) && !NOT_A_NAME.has(w.toLowerCase()) && !own.has(w.toLowerCase()));
  if (!words.length) return null;
  return (last ? words.slice(-1) : words.slice(0, 2)).map(titleCase).join(" ");
}

/** A date of birth written in the question, as yyyy-mm-dd, or null. Dates equal to `ownDob` are ignored. */
function findDob(text: string, ownDob?: string | null): { dob: string; index: number } | null {
  const valid = (d: number, m: number, y: number) => y >= 1945 && y <= new Date().getFullYear() - 14 && m >= 1 && m <= 12 && d >= 1 && d <= 31;
  const iso = (d: number, m: number, y: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const found: { dob: string; index: number }[] = [];
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})\b/g))) {
    const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (valid(d, mo, y)) found.push({ dob: iso(d, mo, y), index: m.index ?? 0 });
  }
  for (const m of Array.from(text.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3,9})\s*,?\s*(\d{4})\b/gi))) {
    const mo = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
    const [d, y] = [Number(m[1]), Number(m[3])];
    if (mo > 0 && valid(d, mo, y)) found.push({ dob: iso(d, mo, y), index: m.index ?? 0 });
  }
  return found.find((f) => f.dob !== ownDob) ?? null;
}

/** The person a question is about, when it says so plainly. */
function findName(text: string, dobIndex: number | null, own: Set<string>): string | null {
  const patterns: [RegExp, boolean][] = [
    // "Aarti verma date of birth 16 july 1988", "Sourabh sharma DOB:24/09/1997"
    [/([a-z]+(?:\s+[a-z]+)?)\s*[,:-]?\s*(?:dob|d\.o\.b|date of birth|janam|born)\b/i, false],
    // "Meri shadi mansi se hogi"
    [/\b(?:shadi|shaadi|sadi|sadhi|vivah|rishta|rista|marriage)\s+([a-z]+)\s+se\b/i, true],
    // "Rashmi se baat", "Priyanka rohit se pyar" (asked by Rohit: his own name is skipped)
    [/((?:[a-z]+\s+)?[a-z]+)\s+se\s+(?:shadi|shaadi|sadi|vivah|rishta|rista|relationship|pyar|pyaar|baat|bat|connection)\b/i, true],
    // "Jayoti shadi karegi mere se"
    [/\b([a-z]+)\s+(?:shadi|shaadi|sadi)\s+(?:karegi|karega|karenge)\b/i, true],
    // "Snehal naam ki", "uska naam Riya hai"
    [/\b([a-z]+)\s+naam\s+(?:ki|ka|ke)\b/i, true],
    [/\bnaam\s+([a-z]+)\s+(?:hai|h)\b/i, true],
  ];
  for (const [p, last] of patterns) {
    const name = cleanName(text.match(p)?.[1], own, last);
    if (name) return name;
  }
  if (dobIndex !== null) {
    // A name written just before the date: "abhijit sutradhar, 04/01/1992"
    const before = text.slice(Math.max(0, dobIndex - 30), dobIndex).match(/([a-z]+(?:\s+[a-z]+)?)\s*[,:-]?\s*$/i);
    const name = cleanName(before?.[1], own);
    if (name) return name;
  }
  return null;
}

export function suggestForQuestion(
  question: string,
  currentType: AstroReport["type"],
  buyer: { name?: string | null; dob?: string | null } = {},
): QuestionSuggestion | null {
  const text = question.replace(/\s+/g, " ").trim();
  if (!text) return null;
  const own = new Set((buyer.name ?? "").toLowerCase().split(/\s+/).filter(Boolean));
  const dob = findDob(text, buyer.dob);
  const name = findName(text, dob?.index ?? null, own);
  if (currentType !== "milan" && (dob || name || MILAN.test(text))) {
    return { kind: "milan", partnerName: name, partnerDob: dob?.dob ?? null };
  }
  const job = text.search(NAUKRI);
  const biz = text.search(BUSINESS);
  const options: { kind: "naukri" | "business"; at: number }[] = [];
  if (job >= 0 && currentType !== "naukri") options.push({ kind: "naukri", at: job });
  if (biz >= 0 && currentType !== "business") options.push({ kind: "business", at: biz });
  options.sort((a, b) => a.at - b.at);
  return options[0] ? { kind: options[0].kind } : null;
}

/** Hand-off to the Milan form: the partner named in a question, kept for one visit to /milan. */
const MILAN_PARTNER_KEY = "astroMilanPartner";

export function rememberMilanPartner(partner: { name: string | null; dob: string | null }) {
  try {
    sessionStorage.setItem(MILAN_PARTNER_KEY, JSON.stringify(partner));
  } catch {
    /* storage may be unavailable in some in-app browsers */
  }
}

export function takeMilanPartner(): { name: string | null; dob: string | null } | null {
  try {
    const raw = sessionStorage.getItem(MILAN_PARTNER_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(MILAN_PARTNER_KEY);
    const p = JSON.parse(raw) as { name?: unknown; dob?: unknown };
    return {
      name: typeof p.name === "string" ? p.name : null,
      dob: typeof p.dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.dob) ? p.dob : null,
    };
  } catch {
    return null;
  }
}
