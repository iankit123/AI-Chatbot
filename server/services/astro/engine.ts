/**
 * Vedic (sidereal, Lahiri) chart maths for the Shaadi and Milan reports.
 * Everything here is deterministic: the same birth details always give the same result.
 * Planet positions come from astronomy-engine; rules are standard Parashari / Ashtakoot tables.
 */
import * as AstronomyNs from "astronomy-engine";

// astronomy-engine ships CommonJS; under Node ESM its exports arrive on `default`.
const Astronomy = ((AstronomyNs as { default?: typeof AstronomyNs }).default ?? AstronomyNs) as typeof AstronomyNs;
import { geocodeIndianPlace } from "./cities";

export type PlanetName =
  | "Sun" | "Moon" | "Mars" | "Mercury" | "Jupiter" | "Venus" | "Saturn" | "Rahu" | "Ketu";

export const RASHI = [
  { en: "Mesh", hi: "मेष", lord: "Mars", element: "fire" },
  { en: "Vrishabh", hi: "वृषभ", lord: "Venus", element: "earth" },
  { en: "Mithun", hi: "मिथुन", lord: "Mercury", element: "air" },
  { en: "Kark", hi: "कर्क", lord: "Moon", element: "water" },
  { en: "Singh", hi: "सिंह", lord: "Sun", element: "fire" },
  { en: "Kanya", hi: "कन्या", lord: "Mercury", element: "earth" },
  { en: "Tula", hi: "तुला", lord: "Venus", element: "air" },
  { en: "Vrishchik", hi: "वृश्चिक", lord: "Mars", element: "water" },
  { en: "Dhanu", hi: "धनु", lord: "Jupiter", element: "fire" },
  { en: "Makar", hi: "मकर", lord: "Saturn", element: "earth" },
  { en: "Kumbh", hi: "कुंभ", lord: "Saturn", element: "air" },
  { en: "Meen", hi: "मीन", lord: "Jupiter", element: "water" },
] as const satisfies ReadonlyArray<{ en: string; hi: string; lord: PlanetName; element: string }>;

export const PLANET_HI: Record<PlanetName, string> = {
  Sun: "सूर्य", Moon: "चंद्र", Mars: "मंगल", Mercury: "बुध", Jupiter: "गुरु",
  Venus: "शुक्र", Saturn: "शनि", Rahu: "राहु", Ketu: "केतु",
};
export const PLANET_HINGLISH: Record<PlanetName, string> = {
  Sun: "Surya", Moon: "Chandra", Mars: "Mangal", Mercury: "Budh", Jupiter: "Guru",
  Venus: "Shukra", Saturn: "Shani", Rahu: "Rahu", Ketu: "Ketu",
};

export const NAKSHATRA = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha",
  "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha", "Purva Bhadrapada",
  "Uttara Bhadrapada", "Revati",
] as const;

const norm360 = (d: number) => ((d % 360) + 360) % 360;
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Lahiri (Chitrapaksha) ayanamsa, linear model accurate to about 0.01° for 1900–2100. */
function lahiriAyanamsa(date: Date): number {
  const years = (date.getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * 86400000);
  return 23.853 + 0.0139689 * years;
}

function tropicalLongitudes(date: Date): Record<PlanetName, number> {
  const t = Astronomy.MakeTime(date);
  const lon = (body: AstronomyNs.Body) =>
    Astronomy.Ecliptic(Astronomy.GeoVector(body, t, true)).elon;
  const T = (t.tt) / 36525; // centuries from J2000
  const rahu = norm360(125.04452 - 1934.136261 * T + 0.0020708 * T * T);
  return {
    Sun: Astronomy.SunPosition(t).elon,
    Moon: Astronomy.EclipticGeoMoon(t).lon,
    Mars: lon(Astronomy.Body.Mars),
    Mercury: lon(Astronomy.Body.Mercury),
    Jupiter: lon(Astronomy.Body.Jupiter),
    Venus: lon(Astronomy.Body.Venus),
    Saturn: lon(Astronomy.Body.Saturn),
    Rahu: rahu,
    Ketu: norm360(rahu + 180),
  };
}

export function siderealLongitudes(date: Date): Record<PlanetName, number> {
  const ay = lahiriAyanamsa(date);
  const trop = tropicalLongitudes(date);
  const out = {} as Record<PlanetName, number>;
  (Object.keys(trop) as PlanetName[]).forEach((p) => (out[p] = norm360(trop[p] - ay)));
  return out;
}

/** Sidereal ascendant (lagna) longitude. */
function siderealAscendant(date: Date, lat: number, lon: number): number {
  const gmstHours = Astronomy.SiderealTime(date);
  const ramc = rad(norm360(gmstHours * 15 + lon));
  const eps = rad(23.4393 - 0.013 * ((date.getTime() - Date.UTC(2000, 0, 1, 12)) / (36525 * 86400000)));
  const phi = rad(lat);
  const y = Math.cos(ramc);
  const x = -(Math.sin(ramc) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
  const asc = norm360(deg(Math.atan2(y, x)));
  return norm360(asc - lahiriAyanamsa(date));
}

export type BirthInput = {
  name: string;
  gender: "male" | "female";
  /** YYYY-MM-DD */
  dob: string;
  /** HH:mm (24h, IST) or null when unknown */
  tob: string | null;
  place: string;
};

export type Chart = {
  birthUtc: string;
  timeKnown: boolean;
  placePrecise: boolean;
  positions: Record<PlanetName, number>;
  signOf: Record<PlanetName, number>;
  moonSign: number;
  nakshatra: number;
  pada: number;
  /** Lagna sign index, or null when birth time is unknown. */
  lagnaSign: number | null;
  /** House-1 sign used for house counting: lagna if known, else Moon sign (Chandra lagna). */
  baseSign: number;
  baseIsLagna: boolean;
};

const IST_OFFSET_MIN = 330;

export function birthDateUtc(dob: string, tob: string | null): Date {
  const [y, m, d] = dob.split("-").map(Number);
  const [hh, mm] = (tob ?? "12:00").split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MIN * 60000);
}

export function computeChart(input: BirthInput): Chart {
  const date = birthDateUtc(input.dob, input.tob);
  const positions = siderealLongitudes(date);
  const signOf = {} as Record<PlanetName, number>;
  (Object.keys(positions) as PlanetName[]).forEach((p) => (signOf[p] = Math.floor(positions[p] / 30)));
  const geo = geocodeIndianPlace(input.place);
  const timeKnown = !!input.tob;
  const lagnaSign = timeKnown ? Math.floor(siderealAscendant(date, geo.lat, geo.lon) / 30) : null;
  const nakFloat = positions.Moon / (360 / 27);
  const nakshatra = Math.floor(nakFloat);
  return {
    birthUtc: date.toISOString(),
    timeKnown,
    placePrecise: geo.precise,
    positions,
    signOf,
    moonSign: signOf.Moon,
    nakshatra,
    pada: Math.floor((nakFloat - nakshatra) * 4) + 1,
    lagnaSign,
    baseSign: lagnaSign ?? signOf.Moon,
    baseIsLagna: lagnaSign !== null,
  };
}

/** House number (1–12) of a sign counted from the base sign. */
const houseOf = (sign: number, base: number) => ((sign - base + 12) % 12) + 1;
const signOfHouse = (house: number, base: number) => (base + house - 1) % 12;

// ---------------------------------------------------------------- Vimshottari dasha

const DASHA_ORDER: PlanetName[] = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS: Record<string, number> = {
  Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17,
};
const YEAR_MS = 365.2425 * 86400000;

export type DashaPeriod = { md: PlanetName; ad: PlanetName; start: Date; end: Date };

/** Mahadasha/antardasha periods from birth, covering ~120 years. */
export function vimshottari(chart: Chart): DashaPeriod[] {
  const birth = new Date(chart.birthUtc).getTime();
  const nakSpan = 360 / 27;
  const elapsedFrac = (chart.positions.Moon % nakSpan) / nakSpan;
  const startIdx = chart.nakshatra % 9;
  // Shift the cycle start back so the first mahadasha's elapsed part falls before birth.
  let cursor = birth - elapsedFrac * DASHA_YEARS[DASHA_ORDER[startIdx]] * YEAR_MS;
  const out: DashaPeriod[] = [];
  for (let i = 0; i < 9; i++) {
    const md = DASHA_ORDER[(startIdx + i) % 9];
    const mdYears = DASHA_YEARS[md];
    const mdIdx = DASHA_ORDER.indexOf(md);
    for (let j = 0; j < 9; j++) {
      const ad = DASHA_ORDER[(mdIdx + j) % 9];
      const len = ((mdYears * DASHA_YEARS[ad]) / 120) * YEAR_MS;
      const start = new Date(cursor);
      const end = new Date(cursor + len);
      cursor += len;
      if (end.getTime() > birth) out.push({ md, ad, start, end });
    }
  }
  return out;
}

// ---------------------------------------------------------------- Marriage analysis

export type MarriageFacts = {
  seventhSign: number;
  seventhLord: PlanetName;
  seventhLordSign: number;
  seventhLordHouse: number;
  planetsInSeventh: PlanetName[];
  karaka: PlanetName;
  karakaSign: number;
  karakaHouse: number;
  mangalDosh: { present: boolean; fromLagna: boolean; fromMoon: boolean; marsHouse: number };
  loveScore: number;
  marriageType: "love" | "love_arranged" | "arranged";
  window: { start: string; end: string; md: PlanetName; ad: PlanetName; strength: "prabal" | "madhyam" };
  nextWindow: { start: string; end: string } | null;
  jupiterBlessing: { from: string; to: string } | null;
  letters: { latin: string; hi: string }[];
  letterSource: string;
  partnerDirection: { en: string; hi: string };
  partnerDistance: "near" | "far" | "abroad";
  delayFactors: string[];
};

const MANGAL_HOUSES = [1, 2, 4, 7, 8, 12];

/** Traditional naam-akshar initials per rashi (most common starting sounds first). */
const RASHI_LETTERS: { latin: string; hi: string }[][] = [
  [{ latin: "A", hi: "अ" }, { latin: "L", hi: "ल" }, { latin: "Ch", hi: "च" }],
  [{ latin: "V", hi: "व" }, { latin: "B", hi: "ब" }, { latin: "U", hi: "उ" }],
  [{ latin: "K", hi: "क" }, { latin: "G", hi: "ग" }, { latin: "Chh", hi: "छ" }],
  [{ latin: "H", hi: "ह" }, { latin: "D", hi: "ड" }],
  [{ latin: "M", hi: "म" }, { latin: "T", hi: "ट" }],
  [{ latin: "P", hi: "प" }, { latin: "N", hi: "ण" }, { latin: "Th", hi: "ठ" }],
  [{ latin: "R", hi: "र" }, { latin: "T", hi: "त" }],
  [{ latin: "N", hi: "न" }, { latin: "Y", hi: "य" }],
  [{ latin: "Bh", hi: "भ" }, { latin: "Dh", hi: "ध" }, { latin: "F", hi: "फ" }],
  [{ latin: "J", hi: "ज" }, { latin: "Kh", hi: "ख" }],
  [{ latin: "S", hi: "स" }, { latin: "G", hi: "ग" }, { latin: "Sh", hi: "श" }],
  [{ latin: "D", hi: "द" }, { latin: "Ch", hi: "च" }, { latin: "Z", hi: "झ" }],
];

const DIRECTION: Record<string, { en: string; hi: string }> = {
  fire: { en: "Purab (East)", hi: "पूर्व" },
  earth: { en: "Dakshin (South)", hi: "दक्षिण" },
  air: { en: "Paschim (West)", hi: "पश्चिम" },
  water: { en: "Uttar (North)", hi: "उत्तर" },
};

function addMonths(d: Date, months: number): Date {
  const r = new Date(d.getTime());
  r.setUTCMonth(r.getUTCMonth() + months);
  return r;
}
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Months (first-of-month dates) in [from, to] when transiting Jupiter occupies or aspects any target sign. */
function jupiterSupportMonths(from: Date, to: Date, targets: number[]): Date[] {
  const out: Date[] = [];
  let cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 15));
  while (cur <= to) {
    const jSign = Math.floor(siderealLongitudes(cur).Jupiter / 30);
    const touched = [jSign, (jSign + 4) % 12, (jSign + 6) % 12, (jSign + 8) % 12];
    if (targets.some((t) => touched.includes(t))) out.push(new Date(cur));
    cur = addMonths(cur, 1);
  }
  return out;
}

export function analyseMarriage(chart: Chart, input: BirthInput, now = new Date()): MarriageFacts {
  const base = chart.baseSign;
  const seventhSign = signOfHouse(7, base);
  const seventhLord = RASHI[seventhSign].lord as PlanetName;
  const seventhLordSign = chart.signOf[seventhLord];
  const seventhLordHouse = houseOf(seventhLordSign, base);
  const planets = Object.keys(chart.signOf) as PlanetName[];
  const planetsInSeventh = planets.filter((p) => chart.signOf[p] === seventhSign);
  const karaka: PlanetName = input.gender === "male" ? "Venus" : "Jupiter";
  const karakaSign = chart.signOf[karaka];
  const karakaHouse = houseOf(karakaSign, base);

  // Mangal dosh from lagna (when known) and from Moon.
  const marsFromMoon = houseOf(chart.signOf.Mars, chart.moonSign);
  const marsFromLagna = chart.lagnaSign !== null ? houseOf(chart.signOf.Mars, chart.lagnaSign) : null;
  const fromLagna = marsFromLagna !== null && MANGAL_HOUSES.includes(marsFromLagna);
  const fromMoon = MANGAL_HOUSES.includes(marsFromMoon);
  const mangalDosh = {
    present: chart.lagnaSign !== null ? fromLagna : fromMoon,
    fromLagna,
    fromMoon,
    marsHouse: marsFromLagna ?? marsFromMoon,
  };

  // Love vs arranged: links between 5th (romance) and 7th (marriage), plus Venus/Rahu emphasis.
  const fifthSign = signOfHouse(5, base);
  const fifthLord = RASHI[fifthSign].lord as PlanetName;
  const fifthLordHouse = houseOf(chart.signOf[fifthLord], base);
  let loveScore = 0;
  if (fifthLord === seventhLord) loveScore += 2;
  if (chart.signOf[fifthLord] === chart.signOf[seventhLord]) loveScore += 3;
  if (fifthLordHouse === 7) loveScore += 3;
  if (seventhLordHouse === 5) loveScore += 3;
  if ([5, 7].includes(houseOf(chart.signOf.Venus, base))) loveScore += 2;
  if ([5, 7].includes(houseOf(chart.signOf.Rahu, base))) loveScore += 2;
  if (chart.signOf.Venus === chart.signOf.Mars) loveScore += 2;
  if (chart.signOf.Venus === chart.signOf.Rahu) loveScore += 1;
  if ([5, 7, 11].includes(houseOf(chart.signOf.Moon, base)) && chart.baseIsLagna) loveScore += 1;
  if ([1, 5, 7].includes(houseOf(chart.signOf.Saturn, base))) loveScore -= 1;
  const marriageType: MarriageFacts["marriageType"] =
    loveScore >= 5 ? "love" : loveScore >= 2 ? "love_arranged" : "arranged";

  // Marriage window: first future antardasha where dasha lords signify marriage, refined by Jupiter transit.
  const favourable = new Set<PlanetName>([seventhLord, "Venus", "Jupiter", ...planetsInSeventh]);
  if (input.gender === "female") favourable.add("Jupiter");
  favourable.add("Rahu");
  const birth = new Date(chart.birthUtc);
  const minAge = input.gender === "male" ? 21 : 18;
  const earliest = new Date(Math.max(addMonths(now, 2).getTime(), addMonths(birth, minAge * 12).getTime()));
  const periods = vimshottari(chart).filter((p) => p.end > earliest);
  const scorePeriod = (p: DashaPeriod) => {
    let s = 0;
    if (favourable.has(p.ad)) s += 2;
    if (favourable.has(p.md)) s += 1;
    if (p.ad === seventhLord || p.ad === karaka) s += 1;
    return s;
  };
  const horizon = addMonths(earliest, 12 * 7);
  const candidates = periods.filter((p) => p.start < horizon && scorePeriod(p) >= 2);
  const chosen = candidates.find((p) => scorePeriod(p) >= 3) ?? candidates[0] ?? periods[0];
  const strength: "prabal" | "madhyam" = scorePeriod(chosen) >= 3 ? "prabal" : "madhyam";

  let winStart = new Date(Math.max(chosen.start.getTime(), earliest.getTime()));
  let winEnd = chosen.end;
  const targets = [seventhSign, base, chart.moonSign, seventhLordSign];
  const support = jupiterSupportMonths(winStart, winEnd, targets);
  let jupiterBlessing: MarriageFacts["jupiterBlessing"] = null;
  if (support.length) {
    // Longest run of consecutive supported months.
    let bestS = 0, bestLen = 1, runS = 0;
    for (let i = 1; i <= support.length; i++) {
      const contiguous =
        i < support.length &&
        support[i].getUTCFullYear() * 12 + support[i].getUTCMonth() ===
          support[i - 1].getUTCFullYear() * 12 + support[i - 1].getUTCMonth() + 1;
      if (!contiguous) {
        if (i - runS > bestLen) { bestLen = i - runS; bestS = runS; }
        runS = i;
      }
    }
    const jStart = support[bestS];
    const jEnd = support[bestS + bestLen - 1];
    jupiterBlessing = { from: iso(jStart), to: iso(jEnd) };
    if (bestLen >= 3) {
      winStart = new Date(Math.max(winStart.getTime(), addMonths(jStart, -1).getTime()));
      winEnd = new Date(Math.min(winEnd.getTime(), addMonths(jEnd, 1).getTime()));
    }
  }
  // Keep the headline window readable: at most 14 months.
  if (winEnd.getTime() - winStart.getTime() > 14 * 30.44 * 86400000) winEnd = addMonths(winStart, 14);
  if (winEnd.getTime() - winStart.getTime() < 4 * 30.44 * 86400000) winEnd = addMonths(winStart, 5);

  const after = candidates.find((p) => p.start >= chosen.end);
  const nextWindow = after
    ? { start: iso(after.start), end: iso(new Date(Math.min(after.end.getTime(), addMonths(after.start, 12).getTime()))) }
    : null;

  // Naam akshar: initials of the 7th-house rashi plus the rashi where the 7th lord sits.
  const pool = [...RASHI_LETTERS[seventhSign].slice(0, 2), ...RASHI_LETTERS[seventhLordSign].slice(0, 2), ...RASHI_LETTERS[seventhSign].slice(2)];
  const letters: MarriageFacts["letters"] = [];
  for (const l of pool) {
    if (!letters.some((x) => x.latin === l.latin)) letters.push(l);
    if (letters.length === 4) break;
  }

  const partnerDistance: MarriageFacts["partnerDistance"] =
    seventhLordHouse === 12 || planetsInSeventh.includes("Rahu")
      ? "abroad"
      : [3, 9, 8].includes(seventhLordHouse) || planetsInSeventh.includes("Ketu")
        ? "far"
        : "near";

  const delayFactors: string[] = [];
  if (planetsInSeventh.includes("Saturn")) delayFactors.push("Saptam bhaav me Shani");
  if ([6, 8, 12].includes(seventhLordHouse)) delayFactors.push(`Saptamesh ${seventhLordHouse}ve bhaav me`);
  if (mangalDosh.present) delayFactors.push("Mangal dosh");
  if (planetsInSeventh.includes("Rahu") || planetsInSeventh.includes("Ketu")) delayFactors.push("Saptam bhaav par Rahu-Ketu ka prabhav");
  if (houseOf(chart.signOf.Saturn, base) === 1) delayFactors.push("Lagna me Shani");

  return {
    seventhSign, seventhLord, seventhLordSign, seventhLordHouse, planetsInSeventh,
    karaka, karakaSign, karakaHouse, mangalDosh, loveScore, marriageType,
    window: { start: iso(winStart), end: iso(winEnd), md: chosen.md, ad: chosen.ad, strength },
    nextWindow, jupiterBlessing, letters,
    letterSource: `${RASHI[seventhSign].en} (saptam bhaav) aur ${RASHI[seventhLordSign].en} (saptamesh ${PLANET_HINGLISH[seventhLord]} ki rashi)`,
    partnerDirection: DIRECTION[RASHI[seventhSign].element],
    partnerDistance, delayFactors,
  };
}

// ---------------------------------------------------------------- Ashtakoot Gun Milan

const VARNA = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0]; // 0 Brahmin(highest) … by sign: fire=Kshatriya(1), earth=Vaishya(2), air=Shudra(3), water=Brahmin(0)

type Vashya = 0 | 1 | 2 | 3 | 4; // Chatushpad, Manav, Jalchar, Vanchar, Keet
function vashyaOf(moonLon: number): Vashya {
  const sign = Math.floor(moonLon / 30);
  const within = moonLon % 30;
  switch (sign) {
    case 0: case 1: return 0;
    case 2: case 5: case 6: case 10: return 1;
    case 3: case 11: return 2;
    case 4: return 3;
    case 7: return 4;
    case 8: return within < 15 ? 1 : 0;
    default: return within < 15 ? 0 : 2; // Makar
  }
}
const VASHYA_TABLE = [
  [2, 1, 1, 0.5, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];

// Yoni animal index per nakshatra: 0 Horse,1 Elephant,2 Sheep,3 Serpent,4 Dog,5 Cat,6 Rat,7 Cow,8 Buffalo,9 Tiger,10 Deer,11 Monkey,12 Mongoose,13 Lion
export const YONI = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1];
export const YONI_NAMES = ["Ashwa", "Gaj", "Mesh", "Sarp", "Shwan", "Marjar", "Mushak", "Gau", "Mahish", "Vyaghra", "Mrig", "Vanar", "Nakul", "Singh"];
const YONI_TABLE = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

const FRIENDS: Record<string, { f: string[]; e: string[] }> = {
  Sun: { f: ["Moon", "Mars", "Jupiter"], e: ["Venus", "Saturn"] },
  Moon: { f: ["Sun", "Mercury"], e: [] },
  Mars: { f: ["Sun", "Moon", "Jupiter"], e: ["Mercury"] },
  Mercury: { f: ["Sun", "Venus"], e: ["Moon"] },
  Jupiter: { f: ["Sun", "Moon", "Mars"], e: ["Mercury", "Venus"] },
  Venus: { f: ["Mercury", "Saturn"], e: ["Sun", "Moon"] },
  Saturn: { f: ["Mercury", "Venus"], e: ["Sun", "Moon", "Mars"] },
};
function relation(a: string, b: string): 1 | 0 | -1 {
  if (a === b || FRIENDS[a].f.includes(b)) return 1;
  if (FRIENDS[a].e.includes(b)) return -1;
  return 0;
}

// Gana: 0 Deva, 1 Manushya, 2 Rakshasa
export const GANA = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0];
export const GANA_NAMES = ["Dev", "Manushya", "Rakshas"];
const GANA_TABLE = [ // [groom][bride]
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
];
// Nadi: 0 Aadi, 1 Madhya, 2 Antya
export const NADI = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0, 0, 1, 2];
export const NADI_NAMES = ["Aadi", "Madhya", "Antya"];

export type MoonPoint = { moonLon: number; moonSign: number; nakshatra: number };

export type Koot = { key: string; name: string; hi: string; meaning: string; score: number; max: number };
export type GunMilan = {
  total: number;
  koots: Koot[];
  nadiDosh: boolean;
  bhakootDosh: boolean;
  ganaDosh: boolean;
  bhakootPattern: string | null;
};

export function gunMilan(groom: MoonPoint, bride: MoonPoint): GunMilan {
  // 1. Varna
  const varna = VARNA[groom.moonSign] <= VARNA[bride.moonSign] ? 1 : 0;
  // 2. Vashya
  const vashya = VASHYA_TABLE[vashyaOf(groom.moonLon)][vashyaOf(bride.moonLon)];
  // 3. Tara
  const taraOk = (from: number, to: number) => ![3, 5, 7].includes((((to - from + 27) % 27) + 1) % 9);
  const tara = (taraOk(bride.nakshatra, groom.nakshatra) ? 1.5 : 0) + (taraOk(groom.nakshatra, bride.nakshatra) ? 1.5 : 0);
  // 4. Yoni
  const yoni = YONI_TABLE[YONI[groom.nakshatra]][YONI[bride.nakshatra]];
  // 5. Graha Maitri
  const lg = RASHI[groom.moonSign].lord, lb = RASHI[bride.moonSign].lord;
  const r1 = relation(lg, lb), r2 = relation(lb, lg);
  const sum = r1 + r2;
  const maitri =
    r1 === 1 && r2 === 1 ? 5 : sum === 1 ? 4 : r1 === 0 && r2 === 0 ? 3 : sum === 0 ? 1 : sum === -1 ? 0.5 : 0;
  // 6. Gana
  const gana = GANA_TABLE[GANA[groom.nakshatra]][GANA[bride.nakshatra]];
  // 7. Bhakoot
  const dist = ((bride.moonSign - groom.moonSign + 12) % 12) + 1;
  const pattern = [2, 12].includes(dist) ? "2-12 (Dwi-Dwadash)" : [5, 9].includes(dist) ? "5-9 (Nav-Pancham)" : [6, 8].includes(dist) ? "6-8 (Shadashtak)" : null;
  const bhakoot = pattern ? 0 : 7;
  // 8. Nadi
  const nadi = NADI[groom.nakshatra] === NADI[bride.nakshatra] ? 0 : 8;

  const koots: Koot[] = [
    { key: "varna", name: "Varna", hi: "वर्ण", meaning: "Soch aur ahankaar ka taalmel", score: varna, max: 1 },
    { key: "vashya", name: "Vashya", hi: "वश्य", meaning: "Ek dusre par prabhav aur aakarshan", score: vashya, max: 2 },
    { key: "tara", name: "Tara", hi: "तारा", meaning: "Bhagya aur sehat ka saath", score: tara, max: 3 },
    { key: "yoni", name: "Yoni", hi: "योनि", meaning: "Sharirik aur swabhavik anukoolta", score: yoni, max: 4 },
    { key: "maitri", name: "Graha Maitri", hi: "ग्रह मैत्री", meaning: "Mann ka mel, dosti", score: maitri, max: 5 },
    { key: "gana", name: "Gana", hi: "गण", meaning: "Swabhav aur gussa", score: gana, max: 6 },
    { key: "bhakoot", name: "Bhakoot", hi: "भकूट", meaning: "Parivar, dhan aur pyaar ka pravah", score: bhakoot, max: 7 },
    { key: "nadi", name: "Nadi", hi: "नाड़ी", meaning: "Sehat aur santaan sukh", score: nadi, max: 8 },
  ];
  return {
    total: koots.reduce((s, k) => s + k.score, 0),
    koots,
    nadiDosh: nadi === 0,
    bhakootDosh: bhakoot === 0,
    ganaDosh: gana <= 1,
    bhakootPattern: pattern,
  };
}

// ---------------------------------------------------------------- Naam rashi (when partner's DOB is unknown)

/** First syllable → nakshatra index, from the traditional naam-akshar chart (first match wins on shared sounds). */
const SYLLABLE_NAK: Record<string, number> = {
  chu: 0, che: 0, cho: 0, la: 0, li: 1, lu: 1, le: 1, lo: 1,
  a: 2, i: 2, u: 2, e: 2, o: 3, va: 3, vi: 3, vu: 3, ve: 4, vo: 4, ka: 4, ki: 4,
  ku: 5, gha: 5, chha: 5, ke: 6, ko: 6, ha: 6, hi: 6, hu: 7, he: 7, ho: 7, da: 7,
  di: 8, du: 8, de: 8, do: 8, ma: 9, mi: 9, mu: 9, me: 9, mo: 10, ta: 10, ti: 10, tu: 10,
  te: 11, to: 11, pa: 11, pi: 11, pu: 12, sha: 12, na: 12, tha: 12, pe: 13, po: 13, ra: 13, ri: 13,
  ru: 14, re: 14, ro: 14, ni: 16, nu: 16, ne: 16, no: 17, ya: 17, yi: 17, yu: 17,
  ye: 18, yo: 18, bha: 18, bhi: 18, bhu: 19, dha: 19, pha: 19, fa: 19, bhe: 20, bho: 20, ja: 20, ji: 20,
  ju: 21, je: 21, jo: 21, khi: 21, khu: 21, khe: 21, kho: 21, ga: 22, gi: 22, gu: 22, ge: 22,
  go: 23, sa: 23, si: 23, su: 23, se: 24, so: 24, dhi: 24, jha: 25, de2: 26, cha: 26, chi: 26,
  ba: 3, bi: 3, bu: 3, be: 3, bo: 3, wa: 3, wi: 3, wu: 3, we: 4, wo: 4, gho: 5,
  she: 23, shi: 23, shu: 23, sho: 23, kha: 21, za: 26, zi: 26, fi: 19, fu: 19, fe: 19, fo: 19,
  dhu: 19, dhe: 19, dho: 19, thi: 12, thu: 12, the: 12, tho: 12, chhi: 5, chhu: 5, phi: 19, phu: 19,
  ghi: 5, ghu: 5, jhi: 25, jhu: 25,
};

const DEV_CONS: Record<string, string> = {
  क: "k", ख: "kh", ग: "g", घ: "gh", च: "ch", छ: "chh", ज: "j", झ: "jh", ट: "t", ठ: "th", ड: "d", ढ: "dh",
  ण: "n", त: "t", थ: "th", द: "d", ध: "dh", न: "n", प: "p", फ: "ph", ब: "b", भ: "bh", म: "m", य: "y",
  र: "r", ल: "l", व: "v", श: "sh", ष: "sh", स: "s", ह: "h",
};
const DEV_VOWEL: Record<string, string> = { अ: "a", आ: "a", इ: "i", ई: "i", उ: "u", ऊ: "u", ए: "e", ऐ: "e", ओ: "o", औ: "o", ऋ: "ri" };
const DEV_MATRA: Record<string, string> = { "ा": "a", "ि": "i", "ी": "i", "ु": "u", "ू": "u", "े": "e", "ै": "e", "ो": "o", "ौ": "o", "ृ": "ri" };

function firstSyllable(name: string): string | null {
  const s = name.trim();
  if (!s) return null;
  const ch = s[0];
  if (DEV_VOWEL[ch]) return DEV_VOWEL[ch];
  if (DEV_CONS[ch]) {
    // Skip a conjunct (halant + consonant) and read the matra that follows.
    let i = 1;
    while (s[i] === "्" && i + 1 < s.length) i += 2;
    return DEV_CONS[ch] + (DEV_MATRA[s[i]] ?? "a");
  }
  const lower = s.toLowerCase().replace(/[^a-z]/g, "");
  if (!lower) return null;
  const m = lower.match(/^(chh|ch|sh|bh|dh|th|kh|gh|ph|jh|[bcdfghjklmnpqrstvwxyz])?[rlywhn]*([aeiou]+)?/);
  if (!m) return null;
  let cons = m[1] ?? "";
  if (cons === "c") cons = "k";
  if (cons === "q") cons = "k";
  if (cons === "x") cons = "z";
  let v = m[2] ?? "a";
  v = v.startsWith("aa") ? "a" : v.startsWith("ee") || v.startsWith("ii") ? "i" : v.startsWith("oo") || v.startsWith("uu") ? "u"
    : v.startsWith("ai") ? "e" : v.startsWith("au") || v.startsWith("ou") ? "o" : v[0];
  return cons + v;
}

/** Moon point guessed from the name's first sound (naam rashi). Null when the sound is not in the chart. */
export function moonPointFromName(name: string): (MoonPoint & { syllable: string }) | null {
  const syl = firstSyllable(name);
  if (!syl) return null;
  let nak = SYLLABLE_NAK[syl];
  if (nak === undefined) nak = SYLLABLE_NAK[syl.slice(0, -1) + "a"];
  if (nak === undefined) {
    const cons = syl.replace(/[aeiou]+$/, "");
    const key = Object.keys(SYLLABLE_NAK).find((k) => k.startsWith(cons) && cons.length > 0);
    if (key) nak = SYLLABLE_NAK[key];
  }
  if (nak === undefined) return null;
  const moonLon = nak * (360 / 27) + 360 / 54; // middle of the nakshatra
  return { moonLon, moonSign: Math.floor(moonLon / 30), nakshatra: nak, syllable: syl };
}

export const moonPointOf = (c: Chart): MoonPoint => ({ moonLon: c.positions.Moon, moonSign: c.moonSign, nakshatra: c.nakshatra });
