/** Naukri ("sarkari naukri kab lagegi?") report payloads. */
import { analyseSarkari, bhaav, computeChart, PLANET_HINGLISH, RASHI, type BirthInput, type PlanetName, type SarkariFacts, type SarkariWindow } from "./engine";
import { generateJson } from "./ai";
import { chartSummary, monthYear, TONE } from "./reports";
import { ASTRO_PRICES } from "@shared/astroProducts";
import { quizWorryLine, type QuizAnswers } from "@shared/quizFlows";

const firstName = (n: string) => {
  const f = n.trim().split(/\s+/)[0];
  return f.charAt(0).toUpperCase() + f.slice(1);
};

/** Where the person is today. */
export type NaukriStatus = "taiyari" | "result" | "private" | "attempts";
/** Which exam they are preparing for ("open" = not decided). */
export type NaukriTarget = "railway" | "ssc_bank" | "police_army" | "teacher" | "upsc_pcs" | "open";
export type NaukriInput = BirthInput & { status: NaukriStatus; target: NaukriTarget };
export type NaukriFacts = { kind: "naukri"; chart: ReturnType<typeof chartSummary>; sarkari: SarkariFacts };

export function buildNaukriFacts(input: NaukriInput): NaukriFacts {
  const chart = computeChart(input);
  return { kind: "naukri", chart: chartSummary(chart), sarkari: analyseSarkari(chart) };
}

/** Traditional significations of each planet, as kinds of government work and the exams that lead there. */
const FIELD: Record<string, { field: string; exams: string }> = {
  Sun: { field: "Prashasan aur afsar pad", exams: "UPSC, State PCS, revenue vibhag (Lekhpal, Tehsildar)" },
  Mars: { field: "Police, sena aur suraksha bal", exams: "Army bharti, Police constable/SI, CAPF, Agniveer" },
  Jupiter: { field: "Shiksha aur nyay vibhag", exams: "Teacher (TET/CTET), lecturer, court ki naukri" },
  Mercury: { field: "Bank, daftar aur hisaab-kitab", exams: "SSC CGL/CHSL, Bank PO/Clerk, accounts" },
  Saturn: { field: "Railway, nirman aur technical vibhag", exams: "Railway (RRB), PWD, bijli vibhag, nagar nigam" },
  Moon: { field: "Swasthya, khadya aur jan-seva", exams: "ANM/GNM nursing, health vibhag, FCI, jal nigam" },
  Venus: { field: "Bank, vitt aur kosh vibhag", exams: "Bank PO/Clerk, treasury (kosh), GST aur revenue ke pad" },
  Rahu: { field: "Technical aur computer se jude pad", exams: "IT/computer posts, customs, defence technical" },
};

const TARGET_PLANET: Record<NaukriTarget, PlanetName | null> = {
  railway: "Saturn", ssc_bank: "Mercury", police_army: "Mars", teacher: "Jupiter", upsc_pcs: "Sun", open: null,
};
const TARGET_COPY: Record<NaukriTarget, string> = {
  railway: "Railway", ssc_bank: "SSC / Bank", police_army: "Police / Army", teacher: "Teacher", upsc_pcs: "UPSC / PCS", open: "Abhi tay nahi",
};
const STATUS_COPY: Record<NaukriStatus, string> = {
  taiyari: "Taiyari kar rahe hain",
  result: "Exam ya interview de chuke hain, result ka intezaar",
  private: "Private ya samvida (contract) naukri me hain",
  attempts: "Kai baar koshish ki, ab tak naukri nahi lagi",
};

const LEVEL_COPY: Record<SarkariFacts["level"], { label: string; hi: string; line: string }> = {
  prabal: { label: "Sarkari naukri ke prabal yog", hi: "प्रबल योग", line: "Aapki kundli me sarkari seva ke yog saaf dikhte hain. Sahi samay par ki gayi koshish ka phal milne ki sambhavna achhi hai." },
  madhyam: { label: "Sarkari naukri ke madhyam yog", hi: "मध्यम योग", line: "Yog maujood hain, par naukri sahi pariksha chunne aur anukool samay par poori taakat lagane se banegi." },
  sangharsh: { label: "Sarkari naukri mehnat se", hi: "संघर्ष से सफलता", line: "Seedhe sarkari yog kam hain, isliye raasta lamba ho sakta hai. Sahi kshetra aur anukool dasha me lagataar koshish se yog bante hain." },
};

const COMPETITION_COPY: Record<SarkariFacts["competition"], { label: string; text: string }> = {
  prabal: { label: "Pratiyogita me jeet ke prabal yog", text: "Chhatha bhaav (pratiyogita) majboot hai. Badi bheed wali pariksha me bhi aage nikalne ki kshamta hai. Aapko apni taiyari par bharosa rakhna chahiye." },
  madhyam: { label: "Pratiyogita me safalta mehnat se", text: "Pratiyogita ka bhaav theek hai. Cut-off ke aas-paas rehne ke sanket hain, isliye practice paper aur speed par zyada dhyaan dein." },
  kam: { label: "Pratiyogita kathin, interview/merit wali naukri behtar", text: "Chhathe bhaav par dabav hai. Jahan seedhi bheed kam ho, jaise samvida se pakki hone wali naukri, merit ya interview wali bharti, wahan mauke zyada hain." },
};

const UPAY: Record<string, string> = {
  Sun: "Roz subah tambe ke lote se Surya ko jal dein aur 11 baar 'Om Suryaya Namah' bolein",
  Saturn: "Shanivar ko Hanuman Chalisa padhein aur shaam ko peepal ke neeche sarson ke tel ka diya jalayein",
  Mars: "Mangalvar ko Hanuman ji ko gud-chana chadhayein aur Sundarkand ka paath karein",
  Mercury: "Budhvar ko Ganesh ji ko durva chadhayein aur gaay ko hara chara khilayein",
  Jupiter: "Guruvar ko kele ke ped me jal dein aur maathe par haldi ka tilak lagayein",
  Moon: "Somvar ko Shivling par doodh-mishrit jal chadhayein",
  Venus: "Shukravar ko Maa Lakshmi ke saamne ghee ka diya jalayein",
  Rahu: "Shanivar ko kale til ka daan karein aur 'Om Rahave Namah' ka jaap karein",
};

const LUCK: Record<string, { day: string; colour: string }> = {
  Sun: { day: "Ravivar", colour: "Kesariya ya laal" },
  Moon: { day: "Somvar", colour: "Safed" },
  Mars: { day: "Mangalvar", colour: "Laal" },
  Mercury: { day: "Budhvar", colour: "Hara" },
  Jupiter: { day: "Guruvar", colour: "Peela" },
  Venus: { day: "Shukravar", colour: "Safed ya halka gulabi" },
  Saturn: { day: "Shanivar", colour: "Neela" },
  Rahu: { day: "Shanivar", colour: "Gehra neela ya grey" },
};

const span = (w: SarkariWindow) => {
  const a = monthYear(w.start), b = monthYear(w.end);
  return a === b ? a : `${a} se ${b}`;
};
const year = (w: SarkariWindow | null) => (w ? Number(w.start.slice(0, 4)) : null);

function naukriSections(input: NaukriInput, f: NaukriFacts) {
  const s = f.sarkari;
  const first = s.windows[0] ?? null;
  const best = s.best;
  const soonIsBest = !!first && !!best && first.start === best.start;
  const fields = s.fields.filter((p) => FIELD[p]).slice(0, 2);
  const topPlanet = fields[0] ?? "Sun";
  const targetPlanet = TARGET_PLANET[input.target];
  const targetRank = targetPlanet ? fields.indexOf(targetPlanet) : -1;
  const targetNote =
    input.target === "open"
      ? `Abhi tay nahi kiya hai, to kundli ke hisaab se ${FIELD[topPlanet].field.toLowerCase()} se shuruaat karein: ${FIELD[topPlanet].exams}.`
      : targetRank === 0
        ? `Aapki chuni hui taiyari (${TARGET_COPY[input.target]}) aapki kundli ke sabse prabal kshetra se mel khaati hai. Isi par tike rahein.`
        : targetRank === 1
          ? `Aapki chuni hui taiyari (${TARGET_COPY[input.target]}) kundli ke anukool kshetron me hai. Saath me ${FIELD[topPlanet].field.toLowerCase()} ki bharti bhi dekhein.`
          : `Aapki kundli ${FIELD[topPlanet].field.toLowerCase()} ki taraf zyada jhukti hai. ${TARGET_COPY[input.target]} ki taiyari jaari rakhein, par ${FIELD[topPlanet].exams} ke form bhi bharein.`;

  const timing = {
    first: first ? span(first) : null,
    best: best && !soonIsBest ? span(best) : null,
    bestYear: year(best ?? first),
    dasha: `${PLANET_HINGLISH[s.current.md]} mahadasha, ${PLANET_HINGLISH[s.current.ad]} antardasha (${monthYear(s.current.end)} tak)`,
    // Null when the best stretch falls inside the period running now (its pratyantar is what changes).
    bestDasha: (() => {
      const w = best ?? first;
      if (!w || (w.md === s.current.md && w.ad === s.current.ad)) return null;
      return `${PLANET_HINGLISH[w.md]} mahadasha, ${PLANET_HINGLISH[w.ad]} antardasha`;
    })(),
    jupiter: (best ?? first)?.jupiter ? "Is samay Guru ka gochar bhi aapke karm bhaav ko bal dega." : null,
    now: s.current.favourable
      ? "Abhi ki dasha naukri ke bhaav ko sakriya kar rahi hai. Jo bhi form ya pariksha saamne hai, use poori taakat se dein."
      : "Abhi ki dasha taiyari aur dhairya ki hai. Is samay padhai majboot karein, taaki anukool samay aate hi pariksha me aage rahein.",
    others: s.windows.filter((w) => w !== first && w !== best).slice(0, 2).map(span),
  };

  const statusTip: Record<NaukriStatus, { title: string; text: string }> = {
    taiyari: {
      title: "Taiyari ka sahi samay",
      text: first
        ? `${timing.first} ke dauraan hone wali pariksha aur bharti par sabse zyada dhyaan dein. Us samay ke form chhootne na paayein.`
        : "Har mahine ki bharti ki list banayein aur kundli ke anukool kshetra ke form zaroor bharein.",
    },
    result: {
      title: s.current.favourable ? "Result ke anukool sanket" : "Result me der ke sanket",
      text: s.current.favourable
        ? "Abhi chal rahi dasha naukri ke bhaav ko jagati hai, isliye is result se achhi ummeed rakhi ja sakti hai. Saath me agli pariksha ki taiyari dheeli na karein."
        : `Abhi ki dasha me result, waiting list ya joining me der ke sanket hain. ${first ? `${timing.first} ka samay zyada anukool hai.` : ""} Tab tak agli pariksha ki taiyari jaari rakhein.`.trim(),
    },
    private: {
      title: "Pakki sarkari naukri kab",
      text: `Abhi ki naukri jaldbaazi me na chhodein. ${first ? `${timing.first} ke aas-paas` : "Anukool dasha me"} pakki ya sarkari naukri ke yog zyada hain. Samvida (contract) wale pad pakke hone ki bharti par nazar rakhein.`,
    },
    attempts: {
      title: "Baar baar kyon atak rahe hain",
      text: s.obstacles.length
        ? `Kundli me rukavat ki mukhya wajah: ${s.obstacles[0].split(":")[0].toLowerCase()}. Isliye mehnat ke baad bhi phal der se mil raha hai. Pariksha ka kshetra kundli ke anukool chunein aur anukool samay par poori taakat lagayein.`
        : "Kundli me koi bada dosh nahi hai. Asafalta ki wajah samay aur kshetra ka mel na baithna ho sakta hai. Kundli ke anukool kshetra aur anukool samay par dhyaan dein.",
    },
  };

  const weak = new Set<string>(["Sun"]);
  if (f.sarkari.shani.kind) weak.add("Saturn");
  if (targetPlanet) weak.add(targetPlanet);
  weak.add(topPlanet);
  const upay = Array.from(weak).filter((p) => UPAY[p]).slice(0, 4).map((p) => UPAY[p]);

  const luck = LUCK[topPlanet];
  return {
    level: LEVEL_COPY[s.level],
    meter: s.level === "prabal" ? 3 : s.level === "madhyam" ? 2 : 1,
    yogas: s.yogas.slice(0, 6),
    timing,
    fields: fields.map((p) => ({ planet: PLANET_HINGLISH[p as PlanetName], ...FIELD[p] })),
    target: { label: TARGET_COPY[input.target], note: targetNote, match: input.target === "open" ? null : targetRank >= 0 },
    competition: COMPETITION_COPY[s.competition],
    status: statusTip[input.status],
    obstacles: s.obstacles,
    shani: s.shani.kind
      ? {
          title: s.shani.kind === "sade_sati" ? "Shani ki sade sati chal rahi hai" : "Shani ki dhaiya chal rahi hai",
          text: `Shani naukri aur sthirta ke karak hain, isliye yeh samay mehnat zyada maangta hai par niyam se kaam karne walon ko pakka phal bhi deta hai.${s.shani.until ? ` Iska asar ${monthYear(s.shani.until)} ke aas-paas kam hoga.` : ""}`,
        }
      : null,
    doList: [
      "Har mahine bharti ki list dekhein aur anukool samay ke form pehle bharein",
      "Roz kam se kam ek pichhle saal ka paper samay lagakar hal karein",
      `Pariksha ya interview ke din ${luck.colour.toLowerCase()} rang pehnna shubh rahega`,
    ],
    dontList: [
      "Naukri lagwane ya 'setting' ke naam par kisi ko paisa na dein. Yeh dhokha hota hai",
      "Ek saath bahut saari alag-alag pariksha ki taiyari na karein",
      "Ek-do asafalta se niraash hokar taiyari beech me na chhodein",
    ],
    upay,
    luck,
    snapshot: [
      { label: "Lagna", value: f.chart.lagna ?? "Chandra lagna (janm samay nahi tha)" },
      { label: "Dasham bhaav (karm)", value: `${RASHI[s.tenthSign].en} rashi` },
      { label: "Dashamesh", value: `${PLANET_HINGLISH[s.tenthLord]}, ${bhaav(s.tenthLordHouse)} me` },
      { label: "Surya (sarkar ka karak)", value: `${bhaav(s.sunHouse)} me` },
    ],
    basisNote: f.chart.timeKnown
      ? "Yeh report aapke janm samay, tithi aur sthan se bani lagna kundli par aadharit hai."
      : "Janm samay na hone se bhaav Chandra lagna se dekhe gaye hain. Samay pata ho to jawab aur sateek hota hai.",
  };
}

export async function naukriNarrative(input: NaukriInput, f: NaukriFacts) {
  const s = naukriSections(input, f);
  const a = firstName(input.name);
  const when = s.timing.best ?? s.timing.first;
  const fallback = {
    summary: `${a} ji, aapki kundli me ${s.level.label.toLowerCase()} hain. ${when ? `Sabse anukool samay ${when} ka hai.` : ""} ${s.level.line}`.replace(/\s+/g, " ").trim(),
    timing: `${s.timing.bestDasha ? `Us samay ${s.timing.bestDasha} chal rahi hogi, jo naukri aur karm ke bhaav ko jagati hai.` : "Abhi chal rahi dasha ke andar hi chhoti (pratyantar) dasha naukri ke bhaav ko jagayegi."} ${s.timing.now}`.trim(),
    field: "Jis kshetra ko aapke graha bal dete hain, wahan mehnat ka phal jaldi milta hai. Isliye form bharte samay pehle inhi kshetron ki bharti chunein.",
    advice: "Sahi kshetra chunein, anukool samay ke form pehle bharein aur roz thoda hi sahi, par niyam se padhein. Naukri lagwane ke naam par paisa maangne walon se door rahein.",
  };
  const ai = await generateJson(
    `Tum ek anubhavi Vedic jyotishi ho jo chhote sheher ke yuvaon ko sarkari naukri ke baare me salah dete ho. ${TONE} Kabhi mat kaho ki naukri pakki lagegi ya kabhi nahi lagegi. Mehnat ko hamesha zaroori batao. Kisi 'setting', rishwat ya paid puja ki baat mat karo. Vyakti ko himmat do.`,
    `${a} (${input.gender === "male" ? "purush" : "mahila"}) pooch rahe hain ki sarkari naukri kab lagegi. Sthiti: ${STATUS_COPY[input.status]}. Taiyari: ${TARGET_COPY[input.target]}.${quizWorryLine("naukri", (f as { quiz?: QuizAnswers }).quiz)}
Tathya:
${JSON.stringify({ yog: s.level.label, kundli_ke_yog: s.yogas.map((y) => y.name), pehla_anukool_samay: s.timing.first, sabse_prabal_samay: s.timing.best ?? s.timing.first, abhi_ki_dasha: s.timing.dasha, abhi_ka_samay: s.timing.now, anukool_kshetra: s.fields.map((x) => x.field), chuni_taiyari: s.target.note, pratiyogita: s.competition.label, rukavat: s.obstacles }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sawal ka imaandar jawab, naam lekar, sabse anukool samay ke saath",
 "timing": "2 vakya: yeh samay kyon anukool hai aur abhi kya chal raha hai, aasan bhasha me",
 "field": "2 vakya: kaun si sarkari naukri kundli ke anukool hai aur unki chuni taiyari ke baare me",
 "advice": "3 vakya: ab kya karein, aur himmat ki ek baat"}`,
    800,
  );
  const pick = (key: keyof typeof fallback) => {
    const v = ai ? String(ai[key] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[key];
  };
  return { summary: pick("summary"), timing: pick("timing"), field: pick("field"), advice: pick("advice"), ai: !!ai };
}

export function naukriView(row: { id: string; paid: boolean; input: NaukriInput; facts: NaukriFacts; narrative: any }) {
  const { input, facts: f } = row;
  const s = naukriSections(input, f);
  const common = {
    id: row.id,
    type: "naukri" as const,
    paid: row.paid,
    price: ASTRO_PRICES.naukri,
    name: firstName(input.name),
    status: input.status,
    target: input.target,
    chart: f.chart,
    dasha: s.timing.dasha,
    yogCount: s.yogas.length,
  };
  if (!row.paid) {
    // Free preview: the chart, how many yogas were found and the first one's name. The verdict,
    // the year and months, the fields and the remedies stay server-side.
    return { ...common, firstYog: s.yogas[0]?.name ?? null, obstacleCount: s.obstacles.length, hasWindow: s.timing.bestYear !== null };
  }
  return { ...common, sections: s, narrative: row.narrative };
}
