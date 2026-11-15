/** Wapas ("will they come back") and Business ("which business suits me") report payloads. */
import {
  analyseBusiness, computeChart, loveWindows, PLANET_HINGLISH, RASHI,
  type BirthInput, type BusinessFacts, type LoveWindows, type PlanetName,
} from "./engine";
import { generateJson } from "./ai";
import {
  BAND_COPY, BASIS_NOTE, buildMilanFacts, chartSummary, monthYear, TONE,
  type MilanFacts,
} from "./reports";
import { ASTRO_PRICES } from "@shared/astroProducts";

const firstName = (n: string) => {
  const f = n.trim().split(/\s+/)[0];
  return f.charAt(0).toUpperCase() + f.slice(1);
};

// ---------------------------------------------------------------- Wapas

export type WapasStatus = "breakup" | "no_contact" | "fight" | "separated";
export type WapasInput = {
  self: BirthInput;
  partner: { name: string; dob: string | null; tob: string | null; place: string | null };
  status: WapasStatus;
};
export type WapasFacts = {
  kind: "wapas";
  milan: MilanFacts;
  love: LoveWindows;
  score: number;
  level: "prabal" | "madhyam" | "kam";
};

export function buildWapasFacts(input: WapasInput): WapasFacts {
  const milan = buildMilanFacts({ self: input.self, partner: input.partner, question: "wapas" });
  const love = loveWindows(computeChart(input.self));
  const k = (key: string) => milan.milan.koots.find((x) => x.key === key)!.score;
  let score = 35 + (milan.milan.total / 36) * 30 + (k("maitri") / 5) * 10;
  if (!milan.milan.bhakootDosh) score += 5;
  if (love.currentFavourable) score += 12;
  if (milan.milan.nadiDosh) score -= 4;
  if (milan.milan.ganaDosh) score -= 6;
  score = Math.round(Math.max(15, Math.min(88, score)));
  return { kind: "wapas", milan, love, score, level: score >= 65 ? "prabal" : score >= 45 ? "madhyam" : "kam" };
}

const LEVEL_COPY: Record<WapasFacts["level"], { label: string; hi: string; line: string }> = {
  prabal: { label: "Wapsi ke prabal sanket", hi: "प्रबल संकेत", line: "Dono ke beech ka judaav abhi khatm nahi hua hai. Dobara baat banne ke yog majboot hain." },
  madhyam: { label: "Wapsi ke madhyam sanket", hi: "मध्यम संकेत", line: "Judaav maujood hai, par wapsi sahi samay aur sahi tareeke par nirbhar karegi." },
  kam: { label: "Wapsi ke kam sanket", hi: "कम संकेत", line: "Grahon ke hisaab se is rishte me khichav zyada aur sthirta kam hai. Wapsi mushkil hai, namumkin nahi." },
};

const STATUS_COPY: Record<WapasStatus, string> = {
  breakup: "Breakup ho chuka hai",
  no_contact: "Baat-cheet band hai",
  fight: "Jhagda/narazgi chal rahi hai",
  separated: "Shaadi ke baad alag rah rahe hain",
};

function wapasSections(input: WapasInput, f: WapasFacts) {
  const p = firstName(input.partner.name);
  const g = f.milan.milan;
  const k = (key: string) => g.koots.find((x) => x.key === key)!;
  const causes: string[] = [];
  if (k("gana").score <= 1) causes.push("Gussa aur ahankaar ka takrav: dono apni baat par ade rehte hain");
  if (k("maitri").score <= 1) causes.push("Soch ka antar: ek hi baat ko dono alag tarah samajhte hain");
  if (g.bhakootDosh) causes.push("Parivar ya paise se juda khichav rishte par bhaari pada");
  if (k("tara").score <= 1.5) causes.push("Kharab samay ka asar: galat waqt par kahi gayi baat ne doori badhayi");
  if (k("yoni").score <= 1) causes.push("Apekshaon ka antar: ek ko jo chahiye tha, dusra de nahi paya");
  if (k("vashya").score <= 0.5) causes.push("Ek ka zyada haavi hona, dusre ko ghutan mehsoos hui");
  if (!causes.length) causes.push("Doori ki wajah mel ki kami nahi, balki graha dasha ka kathin daur hai");

  const feel =
    k("maitri").score >= 4 && k("vashya").score >= 1
      ? `${p} ke mann me aapke liye lagaav abhi bhi bana hua hai. Mann ka mel (Graha Maitri) majboot hai, isliye yaad dono taraf hai.`
      : k("maitri").score >= 3
        ? `${p} ke mann me aapke liye jagah hai, par ahankaar ya halaat unhe pehal karne se rok rahe hain.`
        : `${p} is samay bhavnaon se zyada dimaag se soch rahe hain. Dabav daalne par woh aur door ja sakte hain.`;

  const w = f.love.windows;
  const contact = w[0] ? `${monthYear(w[0].start)} se ${monthYear(w[0].end)}` : null;
  // A second window years away is no comfort to someone asking today; show it only when it is within two years.
  const soon = w[1] && new Date(w[1].start).getTime() - Date.now() < 2 * 365 * 86400000;
  const next = w[1] && soon ? `${monthYear(w[1].start)} se ${monthYear(w[1].end)}` : null;
  const act = f.love.currentFavourable
    ? { title: "Pehal karne ka samay hai", text: `Abhi aapki ${PLANET_HINGLISH[f.love.current.ad]} ki antardasha chal rahi hai, jo prem aur rishte ke bhaav ko sakriya karti hai. Ek chhota, bina shikayat wala sandesh bhejna shubh rahega.` }
    : { title: "Abhi intezaar behtar hai", text: `Abhi ki dasha rishton ke liye utni anukool nahi hai. ${contact ? `${contact} ke dauraan` : "Aane wale anukool samay me"} baat banne ke yog zyada hain. Tab tak dabav na banayein.` };

  return {
    level: LEVEL_COPY[f.level],
    meter: f.level === "prabal" ? 3 : f.level === "madhyam" ? 2 : 1,
    feel,
    causes: causes.slice(0, 3),
    act,
    timing: { contact, next, dasha: `${PLANET_HINGLISH[f.love.current.md]} mahadasha, ${PLANET_HINGLISH[f.love.current.ad]} antardasha` },
    doList: [
      "Pehla sandesh chhota rakhein: haal-chaal, koi shikayat ya safai nahi",
      "Purani ladai ka zikr pehli 2-3 baat-cheet me na karein",
      "Jawab na aaye to 10-15 din ka antar rakhein, baar baar message na karein",
    ],
    dontList: [
      "Unke dost ya parivar se sifarish na karwayein",
      "Social media par jatane wale status na lagayein",
      "Tantra-mantra ya vashikaran ke chakkar me paisa na gawayein",
    ],
    upay: [
      "Shukravar ko Maa Lakshmi ya Radha-Krishna ko safed phool aur mishri chadhayein",
      "Somvar ko Shivling par jal chadhakar rishte ki shanti ki prarthana karein",
      ...(g.ganaDosh ? ["Gusse par kaabu ke liye roz 11 baar 'Om Namah Shivay' ka jaap"] : []),
    ],
    gun: { total: g.total, band: BAND_COPY[f.milan.band] },
    care: "Agar yeh rishta aapko baar baar dukh de raha hai, to khud ko pehle rakhna bhi utna hi shubh hai. Wapsi na ho, tab bhi aapki kundli me prem ke yog khatm nahi hote.",
    basisNote: BASIS_NOTE[f.milan.partner.basis],
  };
}

export async function wapasNarrative(input: WapasInput, f: WapasFacts) {
  const s = wapasSections(input, f);
  const a = firstName(input.self.name), p = firstName(input.partner.name);
  const fallback = {
    summary: `${a} ji, aapki aur ${p} ki kundli ke hisaab se ${s.level.label.toLowerCase()} hain. ${s.level.line}`,
    feelings: s.feel,
    cause: `Doori ki sabse badi wajah: ${s.causes[0].split(":")[0].toLowerCase()}. Ise samjhe bina wapsi tikau nahi hogi.`,
    advice: "Sabse zaroori baat: pehle apna mann shaant karein, phir kadam uthayein. Jo bhi ho, apni neend, kaam aur apnon ka saath na chhodein.",
  };
  const ai = await generateJson(
    `Tum ek samvedansheel Vedic jyotishi ho. Koi vyakti apne bichhde saathi ke baare me pooch raha hai aur dukhi hai. ${TONE} Kabhi yeh mat kaho ki woh pakka wapas aayenge ya kabhi nahi aayenge. Vashikaran, tantra ya kisi ko control karne ki baat bilkul mat karo. Vyakti ko sammaan aur himmat do.`,
    `${a} (${input.self.gender === "male" ? "purush" : "mahila"}) pooch rahe hain ki ${p} wapas aayenge ya nahi. Sthiti: ${STATUS_COPY[input.status]}.
Tathya:
${JSON.stringify({ sanket: s.level.label, gun: `${s.gun.total}/36`, unke_mann_me: s.feel, doori_ki_wajah: s.causes, kya_karein: s.act, anukool_samay: s.timing, aadhar: s.basisNote }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sawal ka imaandar, narm jawab, dono ke naam ke saath",
 "feelings": "2 vakya: ${p} ke mann ki sthiti, tathyon ke aadhar par",
 "cause": "2 vakya: doori ki asli wajah aasan bhasha me",
 "advice": "3 vakya: ab kya karein aur kab, aur khud ka khayal rakhne ki ek baat"}`,
    800,
  );
  const pick = (key: keyof typeof fallback) => {
    const v = ai ? String(ai[key] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[key];
  };
  return { summary: pick("summary"), feelings: pick("feelings"), cause: pick("cause"), advice: pick("advice"), ai: !!ai };
}

export function wapasView(row: { id: string; paid: boolean; input: WapasInput; facts: WapasFacts; narrative: any }) {
  const { input, facts: f } = row;
  const common = {
    id: row.id,
    type: "wapas" as const,
    paid: row.paid,
    price: ASTRO_PRICES.wapas,
    selfName: firstName(input.self.name),
    partnerName: firstName(input.partner.name),
    status: input.status,
    gunTotal: f.milan.milan.total,
    gunBand: BAND_COPY[f.milan.band].label,
    self: { moonRashi: f.milan.self.moonRashi, nakshatra: f.milan.self.nakshatra },
    partner: { moonRashi: f.milan.partner.moonRashi, nakshatra: f.milan.partner.nakshatra },
    basisNote: BASIS_NOTE[f.milan.partner.basis],
  };
  if (!row.paid) return common;
  return { ...common, sections: wapasSections(input, f), narrative: row.narrative };
}

// ---------------------------------------------------------------- Business

export type BusinessSituation = "naukri" | "business" | "berozgar" | "student";
/** 1 no money, 2 up to ₹25k, 3 ₹25–50k, 4 ₹50k–2 lakh, 5 ₹2–5 lakh, 6 above ₹5 lakh. */
export type BusinessBudget = 1 | 2 | 3 | 4 | 5 | 6;
export type BusinessInput = BirthInput & {
  situation: BusinessSituation;
  budget: number;
  /** 2 for the six-step budget. Reports made before 2026-11-15 evening used four steps and have no scale. */
  budget_scale?: number;
};

/** Old four-step answers (≤50k, 50k–2L, 2–10L, 10L+) mapped onto today's six steps. */
function budgetOf(input: BusinessInput): BusinessBudget {
  if (input.budget_scale === 2) return Math.min(6, Math.max(1, input.budget)) as BusinessBudget;
  return (({ 1: 3, 2: 4, 3: 5, 4: 6 } as Record<number, BusinessBudget>)[input.budget] ?? 4);
}
export type BizFacts = { kind: "business"; chart: ReturnType<typeof chartSummary>; biz: BusinessFacts };

export function buildBusinessFacts(input: BusinessInput): BizFacts {
  const chart = computeChart(input);
  return { kind: "business", chart: chartSummary(chart), biz: analyseBusiness(chart) };
}

/**
 * Traditional significations (karakatva) per planet, as businesses by starting capital.
 * Every planet has two no-money ideas (step 1) and one or more for each higher step.
 */
const PLANET_BIZ: Record<string, { field: string; ideas: [BusinessBudget, string][] }> = {
  Sun: { field: "Sarkari kaam, dawai aur sona-chandi", ideas: [
    [1, "Sarkari form aur yojanaon me logon ki madad, commission par"],
    [1, "Dawa companies ke liye medical representative ka kaam"],
    [2, "Online form, Aadhaar-PAN aur photocopy ki chhoti dukan"],
    [3, "Jan Seva Kendra (CSC) ya e-mitra centre"],
    [4, "Medical store ya generic dawai ki dukan"],
    [4, "Sarkari daftar/school me saman supply ka chhota theka"],
    [5, "Artificial ya chandi ki jewellery ki dukan"],
    [6, "Sarkari thekedari ya gas/petrol agency"]] },
  Moon: { field: "Doodh, khana-peena aur rozmarra ka saman", ideas: [
    [1, "Ghar ka bana khana, achaar ya papad WhatsApp par bechna"],
    [1, "Dairy ke liye ghar-ghar doodh pahunchana, commission par"],
    [2, "Chai-nashta ka thela"],
    [3, "Tiffin seva ya juice-lassi corner"],
    [4, "Kirana ya general store"],
    [5, "Dairy booth, dhaba ya chhota restaurant"],
    [6, "Packaged paani ya food processing unit"]] },
  Mars: { field: "Zameen, nirman, hardware aur bijli ka kaam", ideas: [
    [1, "Kisi thekedar ke saath bijli ya plumbing ka kaam seekhkar karna"],
    [1, "Property dealer ke saath commission par kaam"],
    [2, "Bijli-plumbing repair ki seva, apne auzaar lekar"],
    [3, "Fast food ya tandoor ka thela"],
    [4, "Hardware ya bijli ke saman ki dukan"],
    [5, "Building material (cement, sariya) ki dukan"],
    [6, "Property dealing ya construction ka theka"]] },
  Mercury: { field: "Kharid-bikri, hisaab-kitab aur mobile/online kaam", ideas: [
    [1, "Online reselling (WhatsApp, Meesho), bina maal khareede"],
    [1, "Kisi dukan ya company ke liye commission agent"],
    [2, "Mobile recharge, online form aur print-photocopy"],
    [3, "Mobile accessories ki chhoti dukan"],
    [4, "Stationery ya mobile accessories ki badi dukan"],
    [5, "Kisi company ki distribution agency"],
    [6, "Thok vyapar, super-stockist ya apna online brand"]] },
  Jupiter: { field: "Shiksha, salah aur dhan se juda kaam", ideas: [
    [1, "Ghar se tuition padhana"],
    [1, "Bima (LIC) ya mutual fund ka agent banna"],
    [2, "Online tuition ya ghar par chhoti coaching"],
    [3, "Puja samagri ya dharmik kitabon ki chhoti dukan"],
    [4, "Coaching centre ya computer class"],
    [5, "Anaaj-dal ka thok kaam"],
    [6, "School, finance firm ya consultancy"]] },
  Venus: { field: "Kapda, shringar, sajawat aur mithai", ideas: [
    [1, "Ghar se mehndi, makeup ya silai ka kaam"],
    [1, "Shaadi-party decoration team ke saath kaam"],
    [2, "Ghar se boutique ya silai centre"],
    [3, "Cosmetic aur artificial jewellery ki chhoti dukan"],
    [4, "Readymade kapde ki dukan ya beauty parlour"],
    [5, "Mithai, bakery ya shaadi decoration ka kaam"],
    [6, "Garment showroom, jewellery ya banquet/event ka kaam"]] },
  Saturn: { field: "Loha, tel, transport aur kheti ke saman ka kaam", ideas: [
    [1, "Kabaad (scrap) ikattha karke bechna"],
    [1, "Thekedar ke liye labour jutane ka kaam"],
    [2, "Purane saman aur scrap ki kharid-bikri"],
    [3, "Khad-beej ki chhoti dukan"],
    [4, "Auto parts, tyre ya lubricant ki dukan"],
    [5, "Loading gaadi (transport) ya labour contracting"],
    [6, "Loha/plastic ki factory, godown ya cold storage"]] },
  Rahu: { field: "Online, electronics aur bahar ke maal ka kaam", ideas: [
    [1, "Social media, video editing ya online marketing ki seva"],
    [1, "Online freelancing (data entry, design)"],
    [2, "Mobile-computer repair ka kaam"],
    [3, "Purane phone ki kharid-bikri"],
    [4, "CCTV, solar ya electronics ki dukan"],
    [5, "Import ka maal (khilone, gadgets) ya travel agency"],
    [6, "Import-export ya technology ka vyapar"]] },
};

const PLANET_LUCK: Record<string, { day: string; colour: string; direction: string }> = {
  Sun: { day: "Ravivar", colour: "Kesariya ya laal", direction: "Purab (East)" },
  Moon: { day: "Somvar", colour: "Safed ya chandi", direction: "Uttar-Paschim (North-West)" },
  Mars: { day: "Mangalvar", colour: "Laal", direction: "Dakshin (South)" },
  Mercury: { day: "Budhvar", colour: "Hara", direction: "Uttar (North)" },
  Jupiter: { day: "Guruvar", colour: "Peela", direction: "Uttar-Purab (North-East)" },
  Venus: { day: "Shukravar", colour: "Safed ya gulabi", direction: "Dakshin-Purab (South-East)" },
  Saturn: { day: "Shanivar", colour: "Neela", direction: "Paschim (West)" },
  Rahu: { day: "Shanivar", colour: "Slaty neela", direction: "Dakshin-Paschim (South-West)" },
};

const BIZ_LEVEL: Record<BusinessFacts["level"], { label: string; hi: string; line: string }> = {
  prabal: { label: "Vyapar ke prabal yog", hi: "व्यापार के प्रबल योग", line: "Aapki kundli apna kaam karne walon ki hai. Sahi kshetra aur sahi samay par shuruaat aapko naukri se aage le ja sakti hai." },
  mishrit: { label: "Vyapar aur naukri dono ke yog", hi: "मिश्रित योग", line: "Aapke liye sabse surakshit raasta hai: pehle chhote star par ya side me shuru karein, jamne par poora samay dein." },
  seva: { label: "Seva kshetra zyada anukool", hi: "सेवा क्षेत्र अनुकूल", line: "Aapki kundli me naukri ya seva wale kaam ke yog zyada majboot hain. Vyapar karna ho to kam poonji aur sajhedari ke saath karein." },
};

const BUDGET_COPY: Record<BusinessBudget, string> = {
  1: "Bina poonji",
  2: "₹25,000 tak",
  3: "₹25,000 – 50,000",
  4: "₹50,000 – 2 lakh",
  5: "₹2 – 5 lakh",
  6: "₹5 lakh se zyada",
};
/** How each idea's starting cost is shown under it. */
const IDEA_COST: Record<BusinessBudget, string> = {
  1: "bina poonji ke shuru",
  2: "₹25,000 tak me shuru",
  3: "₹25,000 – 50,000 me shuru",
  4: "₹50,000 – 2 lakh me shuru",
  5: "₹2 – 5 lakh me shuru",
  6: "₹5 lakh se upar",
};
const PARTNER_COPY: Record<BusinessFacts["partnership"], { title: string; text: string }> = {
  solo: { title: "Akele karna behtar", text: "Aapke saptam bhaav ki sthiti sajhedari me vivaad ke sanket deti hai. Malikana haq apne paas rakhein, madad ke liye karmchari rakhein." },
  partner: { title: "Sajhedari shubh hai", text: "Saptam bhaav majboot hai. Bharosemand partner ke saath kaam tezi se badhega. Hissedari aur zimmedari likhit me rakhein." },
  family: { title: "Parivar ke saath karein", text: "Bahar ke partner ki jagah bhai, jeevansathi ya parivar ke kisi sadasya ko saath lena zyada shubh rahega." },
};
const SITUATION_TIP: Record<BusinessSituation, string> = {
  naukri: "Naukri turant na chhodein. Pehle 3-6 mahine side me shuru karke kamai dekhein.",
  business: "Jo kaam chal raha hai use band karne ki jagah, neeche diye kshetra ka ek saman/seva usi me jodkar dekhein.",
  berozgar: "Sabse kam poonji wale vikalp se shuru karein, taaki jokhim kam rahe aur anubhav mile.",
  student: "Padhai ke saath chhote star par shuru karein. Pehla lakshya kamai nahi, seekhna rakhein.",
};

function businessSections(input: BusinessInput, f: BizFacts) {
  const b = f.biz;
  const budget = budgetOf(input);
  const rulers = b.rulers.filter((p) => PLANET_BIZ[p]);
  const top = rulers[0] ?? "Mercury";
  // Two ideas per ruling planet, closest to the person's budget first.
  const ideas: { text: string; planet: string; field: string; budget: string }[] = [];
  for (const p of rulers) {
    const fit = PLANET_BIZ[p].ideas
      .filter(([tier]) => tier <= budget)
      .sort((x, y) => y[0] - x[0])
      .slice(0, 2);
    for (const [tier, text] of fit) ideas.push({ text, planet: PLANET_HINGLISH[p as PlanetName], field: PLANET_BIZ[p].field, budget: IDEA_COST[tier] });
  }
  const luck = PLANET_LUCK[top];
  return {
    level: BIZ_LEVEL[b.level],
    meter: b.level === "prabal" ? 3 : b.level === "mishrit" ? 2 : 1,
    reasons: b.reasons,
    fields: rulers.map((p) => ({ planet: PLANET_HINGLISH[p as PlanetName], field: PLANET_BIZ[p].field })),
    ideas: ideas.slice(0, 6),
    budget: BUDGET_COPY[budget],
    partnership: PARTNER_COPY[b.partnership],
    timing: {
      start: `${monthYear(b.startWindow.start)} se ${monthYear(b.startWindow.end)}`,
      dasha: `${PLANET_HINGLISH[b.startWindow.md]} mahadasha, ${PLANET_HINGLISH[b.startWindow.ad]} antardasha`,
      next: b.nextWindow ? `${monthYear(b.nextWindow.start)} se ${monthYear(b.nextWindow.end)}` : null,
    },
    name: { letters: b.nameLetters, note: "Dukan ya business ka naam in aksharon se rakhna shubh maana jaata hai." },
    luck,
    cautions: b.cautions,
    tip:
      budget === 1
        ? "Bina poonji ke shuruaat ka sabse achha tareeka: pehle kisi aur ke saath ya commission par kaam karein, aur pehli kamai se apna saman ya auzaar khareedein."
        : SITUATION_TIP[input.situation],
    snapshot: [
      { label: "Lagna", value: f.chart.lagna ?? "Chandra lagna (janm samay nahi tha)" },
      { label: "Dasham bhaav (karm)", value: `${RASHI[b.tenthSign].en} rashi` },
      { label: "Dashamesh", value: `${PLANET_HINGLISH[b.tenthLord]}, ${b.tenthLordHouse}ve bhaav me` },
      { label: "Sabse prabhavi graha", value: PLANET_HINGLISH[top as PlanetName] },
    ],
  };
}

export async function businessNarrative(input: BusinessInput, f: BizFacts) {
  const s = businessSections(input, f);
  const a = firstName(input.name);
  const fallback = {
    summary: `${a} ji, aapki kundli me ${s.level.label.toLowerCase()} hain. Aapke liye sabse anukool kshetra hai: ${s.fields[0]?.field.toLowerCase()}. ${s.level.line}`,
    why: `Aapke dasham bhaav (karm) me ${RASHI[f.biz.tenthSign].en} rashi hai aur uske swami ${PLANET_HINGLISH[f.biz.tenthLord]} ${f.biz.tenthLordHouse}ve bhaav me hain. Yahi aapke kaam ki disha tay karte hain.`,
    how: `Shuruaat ke liye sabse shubh samay ${s.timing.start} hai. Usse pehle bazaar ko chhote star par parakh lein: kaun kharidega, kitne me, aur kahan se maal aayega.`,
    caution: `${s.cautions[0]}. ${s.partnership.title}: ${s.partnership.text}`,
  };
  const ai = await generateJson(
    `Tum ek anubhavi Vedic jyotishi ho jo chhote sheher ke logon ko vyapar ki salah dete ho. ${TONE} Kamai ki koi rakam ya guarantee mat do. Salah vyavaharik aur zameeni rakho.`,
    `${a} (${input.gender === "male" ? "purush" : "mahila"}), abhi: ${input.situation}, poonji: ${s.budget}.
Tathya:
${JSON.stringify({ yog: s.level.label, karan: s.reasons, anukool_kshetra: s.fields, sujhaav: s.ideas.map((i) => i.text), sajhedari: s.partnership.title, shubh_samay: s.timing, savdhani: s.cautions, salah: s.tip }, null, 1)}

Yeh JSON do:
{"summary": "3 vakya: sabse zaroori nishkarsh, naam lekar, sabse anukool kshetra ke saath",
 "why": "2 vakya: kundli ke kaun se yog yeh bata rahe hain, aasan bhasha me",
 "how": "3 vakya: is poonji aur sthiti me pehla kadam kya ho, aur kab",
 "caution": "2 vakya: kis galti se bachna hai"}`,
    800,
  );
  const pick = (key: keyof typeof fallback) => {
    const v = ai ? String(ai[key] ?? "").trim() : "";
    return v.length > 20 ? v.slice(0, 700) : fallback[key];
  };
  return { summary: pick("summary"), why: pick("why"), how: pick("how"), caution: pick("caution"), ai: !!ai };
}

export function businessView(row: { id: string; paid: boolean; input: BusinessInput; facts: BizFacts; narrative: any }) {
  const { input, facts: f } = row;
  const s = businessSections(input, f);
  const common = {
    id: row.id,
    type: "business" as const,
    paid: row.paid,
    price: ASTRO_PRICES.business,
    name: firstName(input.name),
    chart: f.chart,
    level: s.level,
    meter: s.meter,
    budget: s.budget,
  };
  if (!row.paid) {
    // Free preview: the yog level and the single best field. Specific ideas, timing and the rest stay server-side.
    return { ...common, topField: s.fields[0], ideaCount: s.ideas.length, letterCount: s.name.letters.length };
  }
  return { ...common, sections: s, narrative: row.narrative };
}
