/**
 * Vedic (sidereal, Lahiri) birth chart for the Kundli chat.
 *
 * The AI model cannot work out planet positions, so before this file existed it made
 * them up. Here the chart is calculated from the birth details, and the result is
 * given to the model as plain facts it must stick to.
 *
 * Method: planet longitudes from astronomy-engine, Lahiri ayanamsa, whole-sign houses,
 * mean lunar node for Rahu/Ketu, Vimshottari dasha from the Moon's nakshatra.
 */
import * as AstronomyModule from "astronomy-engine";
import {
  parseBirthDate,
  parseBirthTime,
  type KundliBirthDetails,
} from "@shared/kundliBirth";

// astronomy-engine is CommonJS: under Node's ES module loader its functions sit on
// `default`, while the bundled server build exposes them directly.
const Astronomy: typeof AstronomyModule =
  (AstronomyModule as unknown as { default?: typeof AstronomyModule }).default ?? AstronomyModule;
type AstronomyBody = AstronomyModule.Body;

type PlanetId =
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu";

const PLANET_ORDER: PlanetId[] = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
];

const PLANET_NAMES: Record<PlanetId, { roman: string; hindi: string; english: string }> = {
  sun: { roman: "Surya", hindi: "सूर्य", english: "Sun" },
  moon: { roman: "Chandra", hindi: "चंद्र", english: "Moon" },
  mars: { roman: "Mangal", hindi: "मंगल", english: "Mars" },
  mercury: { roman: "Budh", hindi: "बुध", english: "Mercury" },
  jupiter: { roman: "Guru", hindi: "गुरु", english: "Jupiter" },
  venus: { roman: "Shukra", hindi: "शुक्र", english: "Venus" },
  saturn: { roman: "Shani", hindi: "शनि", english: "Saturn" },
  rahu: { roman: "Rahu", hindi: "राहु", english: "Rahu" },
  ketu: { roman: "Ketu", hindi: "केतु", english: "Ketu" },
};

const SIGNS: { roman: string; hindi: string; english: string; lord: PlanetId }[] = [
  { roman: "Mesh", hindi: "मेष", english: "Aries", lord: "mars" },
  { roman: "Vrishabh", hindi: "वृषभ", english: "Taurus", lord: "venus" },
  { roman: "Mithun", hindi: "मिथुन", english: "Gemini", lord: "mercury" },
  { roman: "Kark", hindi: "कर्क", english: "Cancer", lord: "moon" },
  { roman: "Singh", hindi: "सिंह", english: "Leo", lord: "sun" },
  { roman: "Kanya", hindi: "कन्या", english: "Virgo", lord: "mercury" },
  { roman: "Tula", hindi: "तुला", english: "Libra", lord: "venus" },
  { roman: "Vrishchik", hindi: "वृश्चिक", english: "Scorpio", lord: "mars" },
  { roman: "Dhanu", hindi: "धनु", english: "Sagittarius", lord: "jupiter" },
  { roman: "Makar", hindi: "मकर", english: "Capricorn", lord: "saturn" },
  { roman: "Kumbh", hindi: "कुंभ", english: "Aquarius", lord: "saturn" },
  { roman: "Meen", hindi: "मीन", english: "Pisces", lord: "jupiter" },
];

const NAKSHATRAS: { roman: string; hindi: string }[] = [
  { roman: "Ashwini", hindi: "अश्विनी" },
  { roman: "Bharani", hindi: "भरणी" },
  { roman: "Krittika", hindi: "कृत्तिका" },
  { roman: "Rohini", hindi: "रोहिणी" },
  { roman: "Mrigashira", hindi: "मृगशिरा" },
  { roman: "Ardra", hindi: "आर्द्रा" },
  { roman: "Punarvasu", hindi: "पुनर्वसु" },
  { roman: "Pushya", hindi: "पुष्य" },
  { roman: "Ashlesha", hindi: "आश्लेषा" },
  { roman: "Magha", hindi: "मघा" },
  { roman: "Purva Phalguni", hindi: "पूर्वा फाल्गुनी" },
  { roman: "Uttara Phalguni", hindi: "उत्तरा फाल्गुनी" },
  { roman: "Hasta", hindi: "हस्त" },
  { roman: "Chitra", hindi: "चित्रा" },
  { roman: "Swati", hindi: "स्वाति" },
  { roman: "Vishakha", hindi: "विशाखा" },
  { roman: "Anuradha", hindi: "अनुराधा" },
  { roman: "Jyeshtha", hindi: "ज्येष्ठा" },
  { roman: "Mula", hindi: "मूल" },
  { roman: "Purva Ashadha", hindi: "पूर्वाषाढ़ा" },
  { roman: "Uttara Ashadha", hindi: "उत्तराषाढ़ा" },
  { roman: "Shravana", hindi: "श्रवण" },
  { roman: "Dhanishta", hindi: "धनिष्ठा" },
  { roman: "Shatabhisha", hindi: "शतभिषा" },
  { roman: "Purva Bhadrapada", hindi: "पूर्वा भाद्रपद" },
  { roman: "Uttara Bhadrapada", hindi: "उत्तरा भाद्रपद" },
  { roman: "Revati", hindi: "रेवती" },
];

/** Vimshottari dasha order and length in years, starting from Ashwini's lord. */
const DASHA_SEQUENCE: { lord: PlanetId; years: number }[] = [
  { lord: "ketu", years: 7 },
  { lord: "venus", years: 20 },
  { lord: "sun", years: 6 },
  { lord: "moon", years: 10 },
  { lord: "mars", years: 7 },
  { lord: "rahu", years: 18 },
  { lord: "jupiter", years: 16 },
  { lord: "saturn", years: 19 },
  { lord: "mercury", years: 17 },
];

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;
const NAKSHATRA_SPAN = 360 / 27;
const IST_OFFSET_MINUTES = 330;

const normalize360 = (deg: number) => ((deg % 360) + 360) % 360;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** Julian centuries since J2000 for a UTC instant. */
function julianCenturies(date: Date): number {
  const julianDay = date.getTime() / 86400000 + 2440587.5;
  return (julianDay - 2451545.0) / 36525;
}

/** Lahiri (Chitrapaksha) ayanamsa in degrees. */
function lahiriAyanamsa(date: Date): number {
  const t = julianCenturies(date);
  return 23.85306 + 1.39722 * t + 0.00031 * t * t;
}

function tropicalLongitude(body: AstronomyBody, date: Date): number {
  return Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
}

/** Mean ascending node of the Moon (Rahu), tropical longitude of date. */
function meanNodeLongitude(date: Date): number {
  const t = julianCenturies(date);
  return normalize360(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000);
}

function tropicalAscendant(date: Date, lat: number, lon: number): number {
  const t = julianCenturies(date);
  const obliquity = toRad(23.4392911 - 0.0130042 * t);
  const localSidereal = toRad(normalize360(Astronomy.SiderealTime(date) * 15 + lon));
  const ascendant = Math.atan2(
    Math.cos(localSidereal),
    -(Math.sin(localSidereal) * Math.cos(obliquity) + Math.tan(toRad(lat)) * Math.sin(obliquity)),
  );
  return normalize360(toDeg(ascendant));
}

const ASTRONOMY_BODIES: Partial<Record<PlanetId, AstronomyBody>> = {
  sun: Astronomy.Body.Sun,
  moon: Astronomy.Body.Moon,
  mars: Astronomy.Body.Mars,
  mercury: Astronomy.Body.Mercury,
  jupiter: Astronomy.Body.Jupiter,
  venus: Astronomy.Body.Venus,
  saturn: Astronomy.Body.Saturn,
};

/** Sidereal longitude (0-360) of every planet at a UTC instant. */
export function siderealLongitudes(date: Date): Record<PlanetId, number> {
  const ayanamsa = lahiriAyanamsa(date);
  const result = {} as Record<PlanetId, number>;
  for (const planet of PLANET_ORDER) {
    const body = ASTRONOMY_BODIES[planet];
    if (body) result[planet] = normalize360(tropicalLongitude(body, date) - ayanamsa);
  }
  result.rahu = normalize360(meanNodeLongitude(date) - ayanamsa);
  result.ketu = normalize360(result.rahu + 180);
  return result;
}

const signOf = (longitude: number) => Math.floor(normalize360(longitude) / 30);

export type DashaPeriod = { lord: PlanetId; start: Date; end: Date };

/** Mahadashas from birth for 120 years. */
function mahadashas(moonLongitude: number, birth: Date): DashaPeriod[] {
  const nakshatraIndex = Math.floor(moonLongitude / NAKSHATRA_SPAN);
  const fractionDone = (moonLongitude % NAKSHATRA_SPAN) / NAKSHATRA_SPAN;
  const firstIndex = nakshatraIndex % 9;
  const first = DASHA_SEQUENCE[firstIndex];

  const periods: DashaPeriod[] = [];
  let start = new Date(birth.getTime() - fractionDone * first.years * YEAR_MS);
  for (let i = 0; i < 9; i++) {
    const { lord, years } = DASHA_SEQUENCE[(firstIndex + i) % 9];
    const end = new Date(start.getTime() + years * YEAR_MS);
    periods.push({ lord, start, end });
    start = end;
  }
  return periods;
}

function antardashas(maha: DashaPeriod): DashaPeriod[] {
  const mahaIndex = DASHA_SEQUENCE.findIndex((d) => d.lord === maha.lord);
  const mahaYears = DASHA_SEQUENCE[mahaIndex].years;
  const periods: DashaPeriod[] = [];
  let start = maha.start;
  for (let i = 0; i < 9; i++) {
    const { lord, years } = DASHA_SEQUENCE[(mahaIndex + i) % 9];
    const end = new Date(start.getTime() + ((mahaYears * years) / 120) * YEAR_MS);
    periods.push({ lord, start, end });
    start = end;
  }
  return periods;
}

export type KundliChart = {
  /** Sidereal longitudes at birth. */
  longitudes: Record<PlanetId, number>;
  /** Sign index (0 = Mesh) of the lagna, or null when birth time or place is unknown. */
  lagnaSign: number | null;
  lagnaDegree: number | null;
  /** Sign that houses are counted from: the lagna, or the Moon sign when there is no lagna. */
  firstHouseSign: number;
  retrograde: Record<PlanetId, boolean>;
  moonSign: number;
  /** True when the birth time is unknown and the Moon changed sign during that day. */
  moonSignUncertain: boolean;
  nakshatraIndex: number;
  nakshatraPada: number;
  mahadashas: DashaPeriod[];
};

export type ChartInput = {
  /** Birth moment in UTC. For an unknown birth time, local noon. */
  birthUtc: Date;
  hasBirthTime: boolean;
  lat?: number;
  lon?: number;
};

export function computeKundliChart(input: ChartInput): KundliChart {
  const { birthUtc, hasBirthTime, lat, lon } = input;
  const longitudes = siderealLongitudes(birthUtc);
  const nextDay = siderealLongitudes(new Date(birthUtc.getTime() + 86400000));

  const retrograde = {} as Record<PlanetId, boolean>;
  for (const planet of PLANET_ORDER) {
    const movement = normalize360(nextDay[planet] - longitudes[planet] + 180) - 180;
    retrograde[planet] = planet !== "rahu" && planet !== "ketu" && movement < 0;
  }

  let lagnaSign: number | null = null;
  let lagnaDegree: number | null = null;
  if (hasBirthTime && typeof lat === "number" && typeof lon === "number") {
    const lagna = normalize360(tropicalAscendant(birthUtc, lat, lon) - lahiriAyanamsa(birthUtc));
    lagnaSign = signOf(lagna);
    lagnaDegree = lagna % 30;
  }

  const moonSign = signOf(longitudes.moon);
  let moonSignUncertain = false;
  if (!hasBirthTime) {
    const halfDay = 12 * 60 * 60 * 1000;
    const dayStart = siderealLongitudes(new Date(birthUtc.getTime() - halfDay)).moon;
    const dayEnd = siderealLongitudes(new Date(birthUtc.getTime() + halfDay)).moon;
    moonSignUncertain = signOf(dayStart) !== signOf(dayEnd);
  }

  const nakshatraIndex = Math.floor(longitudes.moon / NAKSHATRA_SPAN);
  const nakshatraPada = Math.floor((longitudes.moon % NAKSHATRA_SPAN) / (NAKSHATRA_SPAN / 4)) + 1;

  return {
    longitudes,
    lagnaSign,
    lagnaDegree,
    firstHouseSign: lagnaSign ?? moonSign,
    retrograde,
    moonSign,
    moonSignUncertain,
    nakshatraIndex,
    nakshatraPada,
    mahadashas: mahadashas(longitudes.moon, birthUtc),
  };
}

// ---------------------------------------------------------------------------
// Birth place → latitude / longitude
// ---------------------------------------------------------------------------

export type ResolvedPlace = { lat: number; lon: number; utcOffsetMinutes: number };

/** Common Indian birth places, so most people need no network lookup. */
const KNOWN_PLACES: Record<string, [number, number]> = {
  delhi: [28.61, 77.21], "new delhi": [28.61, 77.21], mumbai: [19.08, 72.88], bombay: [19.08, 72.88],
  kolkata: [22.57, 88.36], calcutta: [22.57, 88.36], chennai: [13.08, 80.27], madras: [13.08, 80.27],
  bengaluru: [12.97, 77.59], bangalore: [12.97, 77.59], hyderabad: [17.39, 78.49],
  ahmedabad: [23.02, 72.57], pune: [18.52, 73.86], jaipur: [26.91, 75.79], lucknow: [26.85, 80.95],
  kanpur: [26.45, 80.33], nagpur: [21.15, 79.09], indore: [22.72, 75.86], bhopal: [23.26, 77.41],
  patna: [25.59, 85.14], vadodara: [22.31, 73.18], baroda: [22.31, 73.18], surat: [21.17, 72.83],
  ludhiana: [30.9, 75.86], agra: [27.18, 78.01], nashik: [20.0, 73.79], faridabad: [28.41, 77.31],
  meerut: [28.98, 77.71], rajkot: [22.3, 70.8], varanasi: [25.32, 82.97], banaras: [25.32, 82.97],
  srinagar: [34.08, 74.8], aurangabad: [19.88, 75.34], dhanbad: [23.8, 86.43], amritsar: [31.63, 74.87],
  prayagraj: [25.44, 81.85], allahabad: [25.44, 81.85], ranchi: [23.34, 85.31], howrah: [22.59, 88.26],
  coimbatore: [11.02, 76.96], jabalpur: [23.18, 79.99], gwalior: [26.22, 78.18],
  vijayawada: [16.51, 80.65], jodhpur: [26.24, 73.02], madurai: [9.93, 78.12], raipur: [21.25, 81.63],
  kota: [25.18, 75.83], guwahati: [26.14, 91.74], chandigarh: [30.73, 76.78], solapur: [17.66, 75.91],
  bareilly: [28.37, 79.43], moradabad: [28.84, 78.77], mysuru: [12.3, 76.64], mysore: [12.3, 76.64],
  gurgaon: [28.46, 77.03], gurugram: [28.46, 77.03], aligarh: [27.88, 78.08], jalandhar: [31.33, 75.58],
  bhubaneswar: [20.3, 85.82], salem: [11.66, 78.15], thiruvananthapuram: [8.52, 76.94],
  trivandrum: [8.52, 76.94], kochi: [9.93, 76.27], cochin: [9.93, 76.27], kozhikode: [11.26, 75.78],
  gorakhpur: [26.76, 83.37], bikaner: [28.02, 73.31], noida: [28.54, 77.39], ghaziabad: [28.67, 77.45],
  jamshedpur: [22.8, 86.2], bhilai: [21.19, 81.38], cuttack: [20.46, 85.88], dehradun: [30.32, 78.03],
  ajmer: [26.45, 74.64], udaipur: [24.58, 73.71], jammu: [32.73, 74.86], ujjain: [23.18, 75.78],
  siliguri: [26.73, 88.4], jhansi: [25.45, 78.57], mathura: [27.49, 77.67], shimla: [31.1, 77.17],
  panaji: [15.49, 73.83], goa: [15.49, 73.83], visakhapatnam: [17.69, 83.22], vizag: [17.69, 83.22],
  thane: [19.22, 72.98], saharanpur: [29.97, 77.55], muzaffarpur: [26.12, 85.39], gaya: [24.8, 85.0],
  bhagalpur: [25.24, 86.97], darbhanga: [26.15, 85.9], alwar: [27.55, 76.63], sikar: [27.61, 75.14],
  bhilwara: [25.35, 74.64], rohtak: [28.9, 76.61], hisar: [29.15, 75.72], panipat: [29.39, 76.97],
  karnal: [29.69, 76.99], ambala: [30.38, 76.78], patiala: [30.34, 76.39], bathinda: [30.21, 74.95],
  haridwar: [29.95, 78.16], ayodhya: [26.79, 82.2], jaunpur: [25.75, 82.68], azamgarh: [26.07, 83.19],
  sultanpur: [26.26, 82.07], firozabad: [27.15, 78.4], muzaffarnagar: [29.47, 77.71],
  rampur: [28.81, 79.03], shahjahanpur: [27.88, 79.91], bilaspur: [22.08, 82.15], korba: [22.36, 82.75],
  durg: [21.19, 81.28], satna: [24.58, 80.83], sagar: [23.84, 78.74], rewa: [24.53, 81.3],
  ratlam: [23.33, 75.04], dewas: [22.97, 76.05], kolhapur: [16.7, 74.24], nanded: [19.14, 77.32],
  amravati: [20.94, 77.78], akola: [20.7, 77.01], jalgaon: [21.0, 75.56], latur: [18.4, 76.58],
  sangli: [16.85, 74.58], bhavnagar: [21.76, 72.15], jamnagar: [22.47, 70.06], junagadh: [21.52, 70.46],
  gandhinagar: [23.22, 72.65], anand: [22.56, 72.93], hubli: [15.36, 75.12], belgaum: [15.85, 74.5],
  belagavi: [15.85, 74.5], mangalore: [12.91, 74.86], mangaluru: [12.91, 74.86], gulbarga: [17.33, 76.83],
  kalaburagi: [17.33, 76.83], warangal: [17.97, 79.59], guntur: [16.31, 80.44], nellore: [14.44, 79.99],
  tirupati: [13.63, 79.42], tiruchirappalli: [10.79, 78.7], trichy: [10.79, 78.7],
  tirunelveli: [8.71, 77.76], thrissur: [10.53, 76.21], kollam: [8.89, 76.61], asansol: [23.68, 86.95],
  durgapur: [23.52, 87.31], rourkela: [22.26, 84.85], sambalpur: [21.47, 83.98], bokaro: [23.67, 86.15],
  imphal: [24.82, 93.94], shillong: [25.58, 91.89], agartala: [23.83, 91.29], aizawl: [23.73, 92.72],
  gangtok: [27.33, 88.61], itanagar: [27.08, 93.61], kohima: [25.67, 94.11], puducherry: [11.94, 79.81],
  pondicherry: [11.94, 79.81],
  "दिल्ली": [28.61, 77.21], "मुंबई": [19.08, 72.88], "जयपुर": [26.91, 75.79], "लखनऊ": [26.85, 80.95],
  "पटना": [25.59, 85.14], "कानपुर": [26.45, 80.33], "भोपाल": [23.26, 77.41], "इंदौर": [22.72, 75.86],
  "वाराणसी": [25.32, 82.97], "आगरा": [27.18, 78.01], "कोलकाता": [22.57, 88.36], "पुणे": [18.52, 73.86],
};

/** Minutes ahead of UTC for countries people here are most often born in. */
const COUNTRY_UTC_OFFSETS: Record<string, number> = {
  in: 330, lk: 330, np: 345, pk: 300, bd: 360, bt: 360, ae: 240, om: 240, sa: 180, qa: 180,
  kw: 180, bh: 180, sg: 480, my: 480, gb: 0,
};

const placeCache = new Map<string, ResolvedPlace | null>();

function lookupKnownPlace(place: string): ResolvedPlace | null {
  const cleaned = place.toLowerCase().replace(/[.()]/g, " ").replace(/\s+/g, " ").trim();
  const candidates = [cleaned, ...cleaned.split(/[,\-/]/).map((part) => part.trim())];
  for (const candidate of candidates) {
    const hit = KNOWN_PLACES[candidate];
    if (hit) return { lat: hit[0], lon: hit[1], utcOffsetMinutes: IST_OFFSET_MINUTES };
  }
  return null;
}

async function geocodeOnline(place: string): Promise<ResolvedPlace | null> {
  const search = async (extraParams: string) => {
    const url =
      "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1" +
      `&accept-language=en&q=${encodeURIComponent(place)}${extraParams}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "puchlo.in kundli chat" },
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return null;
    const rows = (await response.json()) as {
      lat: string;
      lon: string;
      address?: { country_code?: string };
    }[];
    return rows[0] ?? null;
  };

  // Indian places first: a village name alone often matches somewhere abroad.
  const row = (await search("&countrycodes=in")) ?? (await search(""));
  if (!row) return null;
  const lat = Number(row.lat);
  const lon = Number(row.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const country = row.address?.country_code?.toLowerCase() ?? "in";
  // Outside the listed countries, estimate the time zone from longitude (to the half hour).
  const utcOffsetMinutes = COUNTRY_UTC_OFFSETS[country] ?? Math.round(lon / 7.5) * 30;
  return { lat, lon, utcOffsetMinutes };
}

/** Latitude and longitude for a typed birth place, or null when it cannot be found. */
export async function resolveBirthPlace(place: string): Promise<ResolvedPlace | null> {
  const key = place.trim().toLowerCase();
  if (!key) return null;
  const known = lookupKnownPlace(key);
  if (known) return known;
  if (placeCache.has(key)) return placeCache.get(key) ?? null;

  try {
    const found = await geocodeOnline(place.trim());
    placeCache.set(key, found);
    return found;
  } catch (error) {
    // Not cached: the lookup may work on the next message.
    console.warn("[kundli] birth place lookup failed:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Chart → facts for the AI prompt and the welcome message
// ---------------------------------------------------------------------------

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthYear = (date: Date) => `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
const planetLabel = (planet: PlanetId) =>
  `${PLANET_NAMES[planet].roman} (${PLANET_NAMES[planet].english}, ${PLANET_NAMES[planet].hindi})`;
const signLabel = (sign: number) =>
  `${SIGNS[sign].roman} (${SIGNS[sign].english}, ${SIGNS[sign].hindi})`;

/** Life areas people ask about: the house that rules each, in everyday words. */
const TOPICS: {
  label: string;
  house: number;
  houseName: string;
  /** Other houses and planets whose dasha also brings results for this topic. */
  supportHouses: number[];
  extra: (gender: string) => PlanetId[];
}[] = [
  { label: "SHAADI / RISHTA", house: 7, houseName: "shaadi ka ghar", supportHouses: [], extra: (g) => (g === "female" ? ["venus", "jupiter"] : ["venus"]) },
  { label: "KAAM / NAUKRI / BUSINESS", house: 10, houseName: "kaam ka ghar", supportHouses: [11], extra: () => [] },
  { label: "PAISA", house: 2, houseName: "paise ka ghar", supportHouses: [11], extra: () => ["jupiter"] },
  { label: "SANTAAN (BACHCHE) / PADHAI", house: 5, houseName: "santaan aur padhai ka ghar", supportHouses: [], extra: () => ["jupiter"] },
  { label: "GHAR / GAADI / ZAMEEN", house: 4, houseName: "ghar-sukh ka ghar", supportHouses: [], extra: () => [] },
  { label: "SEHAT", house: 1, houseName: "sharir ka ghar", supportHouses: [], extra: () => [] },
  { label: "VIDESH (FOREIGN)", house: 12, houseName: "videsh ka ghar", supportHouses: [], extra: () => ["rahu"] },
];

const EXALTATION_SIGN: Partial<Record<PlanetId, number>> = {
  sun: 0, moon: 1, mars: 9, mercury: 5, jupiter: 3, venus: 11, saturn: 6,
};

export type KundliSummary = {
  lagna: { roman: string; hindi: string; english: string } | null;
  rashi: { roman: string; hindi: string; english: string };
  nakshatra: { roman: string; hindi: string };
  mahadasha: { roman: string; hindi: string; english: string } | null;
  /** Found location, so the app can save it and skip the lookup next time. */
  place: { lat: number; lon: number } | null;
};

export type KundliReading = { promptContext: string; summary: KundliSummary };

function findPeriod(periods: DashaPeriod[], at: Date): DashaPeriod | null {
  return periods.find((p) => p.start <= at && at < p.end) ?? null;
}

/**
 * Calculates the chart for these birth details and describes it in text for the AI.
 * Returns null when the birth date itself is not usable.
 */
export async function buildKundliReading(
  details: KundliBirthDetails,
  now: Date = new Date(),
): Promise<KundliReading | null> {
  const date = parseBirthDate(details.dateOfBirth);
  if (!date) return null;
  const time = parseBirthTime(details.timeOfBirth);

  let place: ResolvedPlace | null = null;
  if (typeof details.lat === "number" && typeof details.lon === "number") {
    const known = lookupKnownPlace(details.cityOfBirth);
    place = {
      lat: details.lat,
      lon: details.lon,
      utcOffsetMinutes: known?.utcOffsetMinutes ?? IST_OFFSET_MINUTES,
    };
    // A saved location outside India: re-resolve to get its time zone.
    if (!known && (details.lon < 68 || details.lon > 97.5 || details.lat < 6 || details.lat > 37)) {
      place = (await resolveBirthPlace(details.cityOfBirth)) ?? place;
    }
  } else {
    place = await resolveBirthPlace(details.cityOfBirth);
  }

  const utcOffsetMinutes = place?.utcOffsetMinutes ?? IST_OFFSET_MINUTES;
  const localAsUtc = Date.UTC(date.year, date.month - 1, date.day, time?.hour ?? 12, time?.minute ?? 0);
  const birthUtc = new Date(localAsUtc - utcOffsetMinutes * 60000);
  if (birthUtc > now) return null;

  const chart = computeKundliChart({
    birthUtc,
    hasBirthTime: !!time,
    lat: place?.lat,
    lon: place?.lon,
  });

  const houseOf = (planet: PlanetId) =>
    ((signOf(chart.longitudes[planet]) - chart.firstHouseSign + 12) % 12) + 1;
  const signOfHouse = (house: number) => (chart.firstHouseSign + house - 1) % 12;
  const planetsInHouse = (house: number) => PLANET_ORDER.filter((p) => houseOf(p) === house);

  const ageYears = Math.floor((now.getTime() - birthUtc.getTime()) / YEAR_MS);
  const lines: string[] = [];

  lines.push(`Aaj ki date: ${now.getUTCDate()} ${monthYear(now)}.`);
  lines.push(
    `Jatak: ${details.name}, ${details.gender}, janm ${date.day} ${MONTHS[date.month - 1]} ${date.year}` +
      `${time ? `, ${time.hour % 12 || 12}:${String(time.minute).padStart(2, "0")} ${time.hour >= 12 ? "PM" : "AM"}` : ", janm samay pata nahi"}, ${details.cityOfBirth}. Umar abhi: ${ageYears} saal.`,
  );

  if (chart.lagnaSign !== null) {
    lines.push(`Lagna: ${signLabel(chart.lagnaSign)}.`);
  } else if (!time) {
    lines.push(
      "Lagna: pata nahi (janm samay nahi diya). Neeche ke bhav (houses) Chandra rashi se gine gaye hain. Lagna ka naam mat batana.",
    );
  } else {
    lines.push(
      "Lagna: pata nahi (janm sthan map par nahi mila). Neeche ke bhav (houses) Chandra rashi se gine gaye hain. Lagna ka naam mat batana.",
    );
  }
  lines.push(
    `Rashi (Chandra rashi): ${signLabel(chart.moonSign)}${chart.moonSignUncertain ? " — pakka nahi, us din Chandra ne rashi badli thi" : ""}.`,
  );
  lines.push(
    `Nakshatra: ${NAKSHATRAS[chart.nakshatraIndex].roman} (${NAKSHATRAS[chart.nakshatraIndex].hindi}), charan ${chart.nakshatraPada}.`,
  );

  lines.push("Grah (planet → rashi, bhav/house):");
  for (const planet of PLANET_ORDER) {
    lines.push(
      `- ${planetLabel(planet)}: ${SIGNS[signOf(chart.longitudes[planet])].roman}, bhav ${houseOf(planet)}` +
        `${chart.retrograde[planet] ? ", vakri (retrograde)" : ""}`,
    );
  }

  // Dasha timeline
  const maha = findPeriod(chart.mahadashas, now);
  let upcoming: { maha: PlanetId; antar: DashaPeriod }[] = [];
  if (maha) {
    const mahaIndex = chart.mahadashas.indexOf(maha);
    const horizon = new Date(now.getTime() + 15 * YEAR_MS);
    upcoming = chart.mahadashas
      .slice(mahaIndex, mahaIndex + 3)
      .flatMap((m) => antardashas(m).map((antar) => ({ maha: m.lord, antar })))
      .filter(({ antar }) => antar.end > now && antar.start < horizon);

    const current = upcoming[0];
    lines.push(
      `Dasha abhi: ${PLANET_NAMES[maha.lord].roman} ki mahadasha (${monthYear(maha.start)} se ${monthYear(maha.end)} tak)` +
        (current
          ? `, usme ${PLANET_NAMES[current.antar.lord].roman} ki antardasha (${monthYear(current.antar.start)} se ${monthYear(current.antar.end)} tak).`
          : "."),
    );
    lines.push("Aage ki antardasha:");
    for (const { maha: mahaLord, antar } of upcoming.slice(1, 8)) {
      lines.push(
        `- ${PLANET_NAMES[mahaLord].roman}/${PLANET_NAMES[antar.lord].roman}: ${monthYear(antar.start)} se ${monthYear(antar.end)}`,
      );
    }

  }

  // One ready-made block per life area, so the model rephrases instead of working it out.
  /** How well placed a house lord is, in plain words. */
  const lordStrength = (lord: PlanetId): { text: string; score: number } => {
    const sign = signOf(chart.longitudes[lord]);
    const house = houseOf(lord);
    if (SIGNS[sign].lord === lord) return { text: "apni hi rashi me — bahut mazboot", score: 2 };
    if (EXALTATION_SIGN[lord] === sign) return { text: "uchch rashi me — bahut mazboot", score: 2 };
    if (EXALTATION_SIGN[lord] !== undefined && (EXALTATION_SIGN[lord]! + 6) % 12 === sign) {
      return { text: "neech rashi me — kamzor, deri aur mehnat zyada", score: -1 };
    }
    if ([6, 8, 12].includes(house)) return { text: `ghar ${house} me — kamzor jagah, rukawat aur deri`, score: -1 };
    if ([1, 4, 5, 7, 9, 10, 11, 2].includes(house)) return { text: `ghar ${house} me — achhi jagah`, score: 1 };
    return { text: `ghar ${house} me — mehnat se fal`, score: 0 };
  };

  lines.push("");
  lines.push("TOPIC-WISE READING (sawaal jis topic ka ho, usi block se jawab banao; 'achha samay' ke saal yahin se lo):");
  for (const topic of TOPICS) {
    const lord = SIGNS[signOfHouse(topic.house)].lord;
    const occupants = planetsInHouse(topic.house);
    const strength = lordStrength(lord);

    const significators = new Set<PlanetId>([lord, ...occupants, ...topic.extra(details.gender)]);
    for (const house of topic.supportHouses) significators.add(SIGNS[signOfHouse(house)].lord);

    const windows = upcoming
      .filter(({ antar }) => significators.has(antar.lord))
      .slice(0, 3)
      .map(({ maha: mahaLord, antar }) => {
        const range =
          antar.start <= now
            ? `abhi se ${monthYear(antar.end)} tak (abhi chal raha hai)`
            : `${monthYear(antar.start)} se ${monthYear(antar.end)}`;
        return `${range}, ${PLANET_NAMES[antar.lord].roman} ka samay${significators.has(mahaLord) ? " [sabse mazboot]" : ""}`;
      });

    lines.push(`# ${topic.label}`);
    lines.push(
      `- ${topic.houseName} (ghar ${topic.house}, rashi ${SIGNS[signOfHouse(topic.house)].roman}): ` +
        `isme ${occupants.length ? occupants.map((p) => PLANET_NAMES[p].roman).join(", ") + " baithe hain" : "koi grah nahi baitha"}. ` +
        `Is ghar ka swami ${PLANET_NAMES[lord].roman} hai, jo ${strength.text}.`,
    );
    lines.push(
      `- Kul milakar: ${strength.score >= 2 ? "mazboot — achhe nateeje" : strength.score === 1 ? "theek-thaak se achha" : strength.score === 0 ? "beech ka — mehnat se milega" : "thoda kamzor — deri ya rukawat, par hoga"}.`,
    );
    if (topic.label !== "SEHAT") {
      lines.push(
        `- Achha samay: ${windows.length ? windows.join("; ") : "agle 15 saal me koi khaas mazboot samay nahi — mehnat aur sahi faisle par zyada nirbhar"}.`,
      );
    }
  }
  lines.push("");

  // Slow planets today, which people know as "Shani chal raha hai" / sade sati.
  const today = siderealLongitudes(now);
  const fromMoon = (planet: PlanetId) => ((signOf(today[planet]) - chart.moonSign + 12) % 12) + 1;
  const saturnFromMoon = fromMoon("saturn");
  const sadeSati = saturnFromMoon === 12 || saturnFromMoon === 1 || saturnFromMoon === 2;
  lines.push(
    `Gochar (aaj): Guru ${SIGNS[signOf(today.jupiter)].roman} me (rashi se ${fromMoon("jupiter")}va), ` +
      `Shani ${SIGNS[signOf(today.saturn)].roman} me (rashi se ${saturnFromMoon}va), ` +
      `Rahu ${SIGNS[signOf(today.rahu)].roman} me (rashi se ${fromMoon("rahu")}va).`,
  );
  lines.push(
    `Sade sati: ${sadeSati ? "haan, abhi chal rahi hai" : saturnFromMoon === 4 || saturnFromMoon === 8 ? "nahi, par Shani ki dhaiya chal rahi hai" : "nahi"}.`,
  );

  const names = (entry: { roman: string; hindi: string; english: string }) => ({
    roman: entry.roman,
    hindi: entry.hindi,
    english: entry.english,
  });

  return {
    promptContext: lines.join("\n"),
    summary: {
      lagna: chart.lagnaSign !== null ? names(SIGNS[chart.lagnaSign]) : null,
      rashi: names(SIGNS[chart.moonSign]),
      nakshatra: NAKSHATRAS[chart.nakshatraIndex],
      mahadasha: maha ? names(PLANET_NAMES[maha.lord]) : null,
      place: place ? { lat: place.lat, lon: place.lon } : null,
    },
  };
}
