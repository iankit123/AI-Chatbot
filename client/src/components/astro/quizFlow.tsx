import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Camera, Check, Lock, Quote, ShieldCheck, Sparkles, X } from "lucide-react";
import {
  PROBLEMS, QUIZ_KEYS, QUOTE_KEY, quizLabels, quizStep,
  type QuizAnswers, type QuizProduct,
} from "@shared/quizFlows";
import { Analysing, AstroFooter, CITY_HINTS, ErrorNote, Faq, ZodiacWheel } from "@/components/astro/ui";
import { SectionHead, TrustLine } from "@/components/astro/editorial";
import { PaidReportBanner } from "@/components/astro/paid";
import {
  cacheReport, compressImage, createBusinessPreview, createNaukriPreview, createShaadiPreview, createWapasPreview,
  lastReportId, loadSelf, logAstro, rememberReport, saveSelf, trackAstro, wait,
  type AstroReport, type BusinessBudget, type BusinessSituation, type Gender, type NaukriStatus, type NaukriTarget,
  type SelfDetails, type WapasStatus,
} from "@/lib/astroApi";
import type { ShaadiQuizAnswers } from "@shared/shaadiQuiz";

/**
 * Quiz flows (SHAADI_QUIZ test, shared/astroProducts.ts), modelled on numsecret.com: six one-tap
 * questions about the worry, a short "we hear you" screen, birth details one per screen, then the
 * report's quiz paywall (quizPaywalls.tsx / ShaadiQuizPaywall). `entry="picker"` starts with
 * "which part of life hurts" and branches into that report's questions; `entry="quiz"` is Shaadi only.
 * `entry="steps"` asks the same first question, then only the classic form's questions for that
 * report (STEPS_INPUTS, plus the optional palm photo for Shaadi), one per screen, and makes a
 * classic report at the normal price.
 */

/** In the steps flow: which quiz questions to ask, by index. They are the classic form's own inputs. */
const STEPS_INPUTS: Record<QuizProduct, number[]> = { shaadi: [], wapas: [0], business: [1, 4], naukri: [0, 1] };

const HERO = "/astro/milan-hero.webp";

const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
const QUICK_CITIES = ["Delhi", "Lucknow", "Jaipur", "Patna", "Mumbai", "Kanpur"];

const pad = (n: number | string) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();

/** What each report's flow says, computes and sends. */
const PRODUCT: Record<QuizProduct, { hear: string; making: { title: string; steps: string[] } }> = {
  shaadi: {
    hear: "शादी का समय और जीवनसाथी के संकेत जन्म कुंडली के सातवें भाव और दशा से देखे जाते हैं। अब बस आपकी जन्म की जानकारी चाहिए।",
    making: { title: "आपकी कुंडली बन रही है", steps: ["ग्रहों की स्थिति की गणना", "लग्न और चंद्र राशि", "सातवाँ भाव (विवाह भाव)", "विंशोत्तरी दशा का समय", "जीवनसाथी के संकेत"] },
  },
  wapas: {
    hear: "रिश्ते की दिशा दोनों की कुंडली के चंद्र, शुक्र, गुण मिलान और दशा से देखी जाती है। अब आपकी और उनकी जानकारी चाहिए।",
    making: { title: "दोनों कुंडलियाँ देखी जा रही हैं", steps: ["दोनों की चंद्र राशि और नक्षत्र", "मन का मेल (ग्रह मैत्री)", "दूरी की वजह", "प्रेम भाव की दशा", "बात बनने का समय"] },
  },
  business: {
    hear: "काम-धंधे और पैसे के योग जन्म कुंडली के दसवें भाव (कर्म), उसके स्वामी और दशा से देखे जाते हैं। अब बस आपकी जन्म की जानकारी चाहिए।",
    making: { title: "आपकी कुंडली बन रही है", steps: ["ग्रहों की स्थिति की गणना", "दसवाँ भाव (कर्म)", "धन और लाभ के योग", "आपकी पूँजी के हिसाब से काम", "शुभ समय"] },
  },
  naukri: {
    hear: "सरकारी नौकरी के योग जन्म कुंडली के दसवें भाव, सूर्य और दशा से देखे जाते हैं। अब बस आपकी जन्म की जानकारी चाहिए।",
    making: { title: "आपकी कुंडली बन रही है", steps: ["ग्रहों की स्थिति की गणना", "दसवाँ भाव और सूर्य", "सरकारी नौकरी के योग", "दशा का समय", "रुकावटें"] },
  },
};

type DetailStep = "name" | "gender" | "year" | "month" | "day" | "time" | "place" | "palm" | "pname" | "pknows" | "pyear" | "pmonth" | "pday";
const SELF_STEPS: DetailStep[] = ["name", "gender", "year", "month", "day", "time", "place"];

type Phase = { kind: "pick" } | { kind: "quiz"; i: number } | { kind: "hear" } | { kind: "detail"; i: number } | { kind: "making" };

type Entry = "quiz" | "picker" | "picker29" | "steps";

/** Creates the report for the chosen product from the answers and birth details. */
function createReport(product: QuizProduct, self: SelfDetails, a: QuizAnswers, partner: { name: string; dob: string | null }, entry: Entry, palm: string | null): Promise<AstroReport> {
  const extra = entry === "steps" ? { entry: "steps" as const } : { quiz: a, ...(entry === "picker" || entry === "picker29" ? { entry } : {}) };
  switch (product) {
    case "shaadi":
      return entry === "steps"
        ? createShaadiPreview(self, palm, undefined, "steps")
        : createShaadiPreview(self, null, a as ShaadiQuizAnswers, entry === "picker" || entry === "picker29" ? entry : undefined);
    case "wapas":
      return createWapasPreview({ self, partner: { name: partner.name, dob: partner.dob, tob: null, place: null }, status: a.worry as WapasStatus }, extra);
    case "business":
      return createBusinessPreview({ ...self, situation: a.detail as BusinessSituation, budget: Number(a.impact) as BusinessBudget }, extra);
    case "naukri":
      return createNaukriPreview({ ...self, status: a.worry as NaukriStatus, target: a.detail as NaukriTarget }, extra);
  }
}

// ---------------------------------------------------------------- landing: picker → quiz → details

export function QuizLanding({ entry }: { entry: Entry }) {
  const [, navigate] = useLocation();
  const saved = useRef(loadSelf()).current;
  const last = useRef(lastReportId("shaadi")).current;
  const flowName = entry;
  const stepsMode = entry === "steps";
  const [product, setProduct] = useState<QuizProduct>("shaadi");
  const [phase, setPhase] = useState<Phase>(entry === "quiz" ? { kind: "quiz", i: 0 } : { kind: "pick" });
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [name, setName] = useState(saved.name ?? "");
  const [gender, setGender] = useState<Gender | "">(saved.gender ?? "");
  const [year, setYear] = useState(saved.dob?.slice(0, 4) ?? "");
  const [month, setMonth] = useState(saved.dob ? Number(saved.dob.slice(5, 7)) : 0);
  const [day, setDay] = useState(saved.dob ? Number(saved.dob.slice(8, 10)) : 0);
  const [tob, setTob] = useState<string | null>(saved.tob ?? null);
  const [place, setPlace] = useState(saved.place ?? "");
  const [pName, setPName] = useState("");
  const [pKnows, setPKnows] = useState<"yes" | "no" | "">("");
  const [pYear, setPYear] = useState("");
  const [pMonth, setPMonth] = useState(0);
  const [pDay, setPDay] = useState(0);
  const [palm, setPalm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackAstro("astro_landing", "shaadi", { flow: flowName });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const partnerSteps = (knows: string): DetailStep[] => ["pname", "pknows", ...(knows === "no" ? [] : (["pyear", "pmonth", "pday"] as DetailStep[]))];
  const steps: DetailStep[] = [
    ...SELF_STEPS,
    ...(product === "shaadi" && stepsMode ? (["palm"] as DetailStep[]) : []),
    ...(product === "wapas" ? partnerSteps(pKnows) : []),
  ];
  /** The questions asked before the birth details: all six, or in the steps flow only the report's inputs. */
  const questions = stepsMode ? STEPS_INPUTS[product] : QUIZ_KEYS.map((_, k) => k);

  const phaseKey = "i" in phase ? `${phase.kind}${phase.i}` : phase.kind;
  useEffect(() => {
    if (phaseKey !== (entry === "quiz" ? "quiz0" : "pick")) window.scrollTo({ top: 0 });
  }, [phaseKey, entry]);

  /** Moves to another screen, dropping any error shown on this one. */
  const go = (p: Phase) => {
    setError(null);
    setPhase(p);
  };
  const offset = entry === "quiz" ? 0 : 1;
  const step = (n: number, stepName: string, value?: string) =>
    logAstro("astro_quiz_step", "shaadi", { flow: flowName, product, step: stepName, n, ...(value ? { value } : {}) });

  const pickProblem = (p: QuizProduct) => {
    setProduct(p);
    setAnswers({});
    logAstro("astro_quiz_step", "shaadi", { flow: flowName, product: p, step: "problem", n: 1, value: p });
    // The steps flow has no questions for Shaadi before the birth details.
    const none = stepsMode && STEPS_INPUTS[p].length === 0;
    window.setTimeout(() => go(none ? { kind: "detail", i: 0 } : { kind: "quiz", i: 0 }), 220);
  };

  const pick = (key: string, value: string, i: number) => {
    const next = { ...answers, [key]: value };
    // Shaadi's second question depends on the first: a new first answer clears it.
    if (key === "worry" && answers.worry !== value) delete next.detail;
    setAnswers(next);
    step(offset + i + 1, key, value);
    const after: Phase = stepsMode ? { kind: "detail", i: 0 } : { kind: "hear" };
    window.setTimeout(() => go(i + 1 < questions.length ? { kind: "quiz", i: i + 1 } : after), 220);
  };

  const submit = async () => {
    const dob = `${year}-${pad(month)}-${pad(day)}`;
    const pDob = product === "wapas" && pKnows === "yes" && pMonth && pDay ? `${pYear}-${pad(pMonth)}-${pad(pDay)}` : null;
    if (!gender || !month || !day || (!stepsMode && !answers.want) || place.trim().length < 2) return setError("कुछ जानकारी छूट गई है। कृपया पीछे जाकर भरें।");
    go({ kind: "making" });
    const self: SelfDetails = { name: name.trim(), gender, dob, tob, place: place.trim() };
    trackAstro("astro_form_submitted", product, { flow: flowName, has_time: !!tob, has_palm: !!palm, worry: answers.worry, want: answers.want });
    try {
      const [report] = await Promise.all([createReport(product, self, answers, { name: pName.trim(), dob: pDob }, entry, palm), wait(5200)]);
      saveSelf(self);
      rememberReport(product, report.id);
      cacheReport(report);
      navigate(`/${product}/r/${report.id}`);
    } catch (err) {
      setPhase({ kind: "detail", i: steps.length - 1 });
      setError(err instanceof Error ? err.message : "कुछ गड़बड़ हो गई। दोबारा कोशिश करें।");
    }
  };

  // Tiles advance on a timer after setting state, so the last step must submit with the newest values.
  const submitRef = useRef(submit);
  submitRef.current = submit;
  const nextDetail = (i: number, value?: string, list = steps) => {
    step(offset + questions.length + i + 1, list[i], value);
    if (i + 1 < list.length) go({ kind: "detail", i: i + 1 });
    else void submitRef.current();
  };
  const back = () => {
    if (phase.kind === "quiz") go(phase.i > 0 ? { kind: "quiz", i: phase.i - 1 } : { kind: "pick" });
    else if (phase.kind === "detail") go(phase.i > 0 ? { kind: "detail", i: phase.i - 1 } : questions.length ? { kind: "quiz", i: questions.length - 1 } : { kind: "pick" });
  };

  if (phase.kind === "making") {
    return (
      <div className="pt-16">
        <Analysing title={PRODUCT[product].making.title} steps={PRODUCT[product].making.steps} />
      </div>
    );
  }

  if (phase.kind === "hear") return <HearYou product={product} answers={answers} onNext={() => go({ kind: "detail", i: 0 })} />;

  if (phase.kind === "detail") {
    const i = phase.i;
    const key = steps[i];
    const y = Number(year);
    const py = Number(pYear);
    const maxYear = new Date().getFullYear() - 14;
    const yearForm = (value: string, set: (v: string) => void, title: string, sub?: string) => (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!/^\d{4}$/.test(value) || Number(value) < 1945 || Number(value) > maxYear) return setError(`कृपया 1945 से ${maxYear} के बीच का साल लिखें।`);
          nextDetail(i);
        }}
      >
        <QuestionTitle title={title} sub={sub} />
        <input className="field text-center text-[1.25rem] tracking-[0.2em]" autoFocus inputMode="numeric" pattern="[0-9]*" placeholder="जैसे 1996" value={value} onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        <ErrorNote message={error} />
        <NextButton />
      </form>
    );
    const monthGrid = (value: number, set: (m: number) => void, title: string) => (
      <div>
        <QuestionTitle title={title} />
        <div className="grid grid-cols-3 gap-2">
          {MONTHS_HI.map((m, k) => (
            <button key={m} type="button" className="quiz-tile" aria-pressed={value === k + 1} onClick={() => { set(k + 1); window.setTimeout(() => nextDetail(i), 180); }}>
              {m}
            </button>
          ))}
        </div>
      </div>
    );
    const dayGrid = (value: number, set: (d: number) => void, yy: number, mm: number, yearText: string) => (
      <div>
        <QuestionTitle title="कौन सी तारीख़?" sub={`${MONTHS_HI[mm - 1] ?? ""} ${yearText}`} />
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: daysIn(yy || 2000, mm || 1) }, (_, k) => k + 1).map((d) => (
            <button key={d} type="button" className="quiz-tile !h-11 !text-[15px]" aria-pressed={value === d} onClick={() => { set(d); window.setTimeout(() => nextDetail(i), 180); }}>
              {d}
            </button>
          ))}
        </div>
      </div>
    );
    return (
      <div className="pt-16">
        <StepCard onBack={back} label={key.startsWith("p") && key !== "place" && key !== "palm" ? "उनकी जानकारी" : "आपकी कुंडली के लिए"} progress={<Dots n={steps.length} at={i} />}>
          {key === "name" && (
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim().length < 2) return setError("कृपया अपना नाम लिखें।"); nextDetail(i); }}>
              <QuestionTitle title="आपका पूरा नाम?" sub="जन्म के समय का नाम, जैसा घर में लिखा जाता है।" />
              <input className="field" autoFocus autoComplete="name" placeholder="जैसे: Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <ErrorNote message={error} />
              <NextButton />
            </form>
          )}
          {key === "gender" && (
            <div>
              <QuestionTitle title="आप पुरुष हैं या महिला?" sub="कुंडली के कुछ योग इसी से पढ़े जाते हैं।" />
              <Options options={[{ value: "male", label: "पुरुष" }, { value: "female", label: "महिला" }]} value={gender} onPick={(v) => { setGender(v as Gender); window.setTimeout(() => nextDetail(i, v), 200); }} />
            </div>
          )}
          {key === "year" && yearForm(year, setYear, "आपका जन्म किस साल हुआ?", "साल से आपकी दशा का क्रम निकलता है।")}
          {key === "month" && monthGrid(month, (m) => { setMonth(m); if (day > daysIn(y || 2000, m)) setDay(0); }, "किस महीने में?")}
          {key === "day" && dayGrid(day, setDay, y, month, year)}
          {key === "time" && <TimeStep value={tob} onDone={(t) => { setTob(t); nextDetail(i, t ? "known" : "unknown"); }} />}
          {key === "place" && (
            <form onSubmit={(e) => { e.preventDefault(); if (place.trim().length < 2) return setError("कृपया जन्म स्थान लिखें।"); nextDetail(i); }}>
              <QuestionTitle title="जन्म स्थान?" sub="शहर या ज़िला। इससे लग्न सही निकलता है।" />
              <input className="field" autoFocus list="qf-cities" placeholder="जैसे: Jaipur, Rajasthan" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} />
              <datalist id="qf-cities">{CITY_HINTS.map((c) => <option key={c} value={c} />)}</datalist>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_CITIES.map((c) => (
                  <button key={c} type="button" onClick={() => setPlace(c)} className="rounded-full border border-[#eadbcf] bg-white px-3 py-1.5 text-[13px] text-[var(--ink)]">{c}</button>
                ))}
              </div>
              <ErrorNote message={error} />
              {i === steps.length - 1 ? (
                <button type="submit" className="btn-gold mt-5"><Sparkles className="h-4 w-4" /> मेरी कुंडली देखें</button>
              ) : (
                <NextButton />
              )}
            </form>
          )}
          {key === "palm" && (
            <div>
              <QuestionTitle title="हथेली की फ़ोटो (वैकल्पिक)" sub="हस्त रेखा से विवाह रेखा भी देखी जाएगी। फ़ोटो सेव नहीं होती, सिर्फ़ पढ़ी जाती है।" />
              {palm ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#eadbcf] bg-white p-2">
                  <img src={palm} alt="Aapki hatheli" className="h-14 w-14 rounded-lg object-cover" />
                  <span className="ink flex-1 text-[13.5px]">फ़ोटो जुड़ गई।</span>
                  <button type="button" aria-label="फ़ोटो हटाएँ" className="grid h-8 w-8 place-items-center rounded-full bg-[#f3e8d2] text-[var(--ink)]" onClick={() => setPalm(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#cdb9a8] bg-white px-3.5 py-3 text-[13.5px] text-[var(--ink)]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-white"><Camera className="h-4 w-4" /></span>
                  सीधे हाथ की साफ़ फ़ोटो लें
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setPalm(await compressImage(file));
                      } catch {
                        setError("फ़ोटो लोड नहीं हो पाई। दोबारा कोशिश करें या बिना फ़ोटो के आगे बढ़ें।");
                      }
                    }}
                  />
                </label>
              )}
              <ErrorNote message={error} />
              <button type="button" className="btn-gold mt-5" onClick={() => nextDetail(i, palm ? "photo" : "none")}>
                <Sparkles className="h-4 w-4" /> {palm ? "मेरी कुंडली देखें" : "बिना फ़ोटो के कुंडली देखें"}
              </button>
            </div>
          )}
          {key === "pname" && (
            <form onSubmit={(e) => { e.preventDefault(); if (pName.trim().length < 2) return setError("कृपया उनका नाम लिखें।"); nextDetail(i); }}>
              <QuestionTitle title="उनका नाम?" sub="जिनके बारे में जानना है। उन्हें कुछ पता नहीं चलेगा।" />
              <input className="field" autoFocus placeholder="जैसे: Rohit" value={pName} onChange={(e) => setPName(e.target.value)} maxLength={60} />
              <ErrorNote message={error} />
              <NextButton />
            </form>
          )}
          {key === "pknows" && (
            <div>
              <QuestionTitle title="क्या आपको उनकी जन्म तारीख़ पता है?" sub="पता हो तो जवाब ज़्यादा सटीक होता है।" />
              <Options
                options={[{ value: "yes", label: "हाँ, पता है" }, { value: "no", label: "नहीं, सिर्फ़ नाम से देखें" }]}
                value={pKnows}
                onPick={(v) => {
                  const knows = v as "yes" | "no";
                  setPKnows(knows);
                  // The step list changes with this answer, so advance against the new list.
                  const list: DetailStep[] = [...SELF_STEPS, ...partnerSteps(knows)];
                  window.setTimeout(() => nextDetail(i, v, list), 200);
                }}
              />
              <ErrorNote message={error} />
            </div>
          )}
          {key === "pyear" && yearForm(pYear, setPYear, "उनका जन्म किस साल हुआ?")}
          {key === "pmonth" && monthGrid(pMonth, (m) => { setPMonth(m); if (pDay > daysIn(py || 2000, m)) setPDay(0); }, "उनका जन्म किस महीने में?")}
          {key === "pday" && (
            <>
              {dayGrid(pDay, setPDay, py, pMonth, pYear)}
              <ErrorNote message={error} />
            </>
          )}
        </StepCard>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-[var(--ed-muted)]">
          <Lock className="h-3.5 w-3.5" /> आपकी जानकारी गोपनीय है, किसी को नहीं दिखाई जाती।
        </p>
      </div>
    );
  }

  // ---- the first screen (photo + first question), then one question per screen
  const total = QUIZ_KEYS.length + offset;
  const progressText = (n: number) => (stepsMode ? `सवाल ${n}` : `सवाल ${n} / ${total}`);
  let card: ReactNode;
  if (phase.kind === "pick") {
    card = (
      <StepCard label="दिल से बताइए" progress={<span className="ink-soft text-[12.5px]">{progressText(1)}</span>} bar={stepsMode ? undefined : 1 / total}>
        <QuestionTitle title="ज़िंदगी के किस हिस्से में सबसे ज़्यादा परेशानी है?" sub="जो सबसे सही लगे, वो चुनें" />
        <Options options={PROBLEMS} value="" onPick={(v) => pickProblem(v as QuizProduct)} />
      </StepCard>
    );
  } else {
    const i = phase.i;
    const q = quizStep(product, questions[i], answers);
    card = (
      <StepCard
        onBack={i > 0 || entry !== "quiz" ? back : undefined}
        label={stepsMode ? "आपकी कुंडली के लिए" : q.kicker}
        progress={<span className="ink-soft text-[12.5px]">{progressText(offset + i + 1)}</span>}
        bar={stepsMode ? undefined : (offset + i + 1) / total}
      >
        <QuestionTitle title={q.title} sub="जो सबसे सही लगे, वो चुनें" />
        <Options key={`${product}-${q.key}`} options={q.options} value={answers[q.key] ?? ""} onPick={(v) => pick(q.key, v, i)} />
      </StepCard>
    );
  }

  const first = phase.kind === "pick" || (entry === "quiz" && phase.kind === "quiz" && phase.i === 0);
  if (!first) return <div className="pt-16">{card}</div>;

  const footer = (
    <>
      {last && (
        <p className="mt-4 text-center">
          <Link href={`/shaadi/r/${last}`} className="text-[13px] text-[var(--ed-accent)] underline underline-offset-4">पिछली रिपोर्ट दोबारा खोलें</Link>
        </p>
      )}
      <div className="mt-6"><PaidReportBanner type="shaadi" /></div>
      <AstroFooter />
    </>
  );

  // The picker covers every problem, so no wedding photo: the first question sits at the top.
  if (entry !== "quiz") {
    return (
      <>
        <div className="pt-16">{card}</div>
        <p className="mt-5 max-w-[340px] text-[14.5px] leading-relaxed text-[var(--ed-muted)]">
          {stepsMode ? "बताइए किस बात से परेशान हैं, फिर जन्म की जानकारी से आपकी कुंडली का जवाब।" : "बताइए किस बात से परेशान हैं। 7 छोटे सवाल, फिर आपकी जन्म कुंडली से जवाब।"}
        </p>
        <TrustLine items={["1 मिनट", "पूरी तरह गोपनीय", "लाहिड़ी अयनांश से गणना"]} />
        {footer}
      </>
    );
  }

  return (
    <>
      <section className="relative">
        <div className="relative -mx-4 overflow-hidden">
          <img src={HERO} alt="Shaadi ke mandap me mehendi lage haathon ko thaame dulha-dulhan" width={768} height={1152} decoding="async" {...({ fetchpriority: "high" } as Record<string, string>)} className="block aspect-[4/3.6] w-full object-cover" style={{ objectPosition: "50% 33%" }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(12,5,8,0.85)] via-[rgba(12,5,8,0.1)] via-50% to-[var(--ed-bg)]" />
          <ZodiacWheel size={210} className="pointer-events-none absolute -right-16 top-24 opacity-20" />
          <div className="rise absolute inset-x-0 top-0 px-4 pt-[3.9rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ed-accent)]">Vivah Jyotish · Janm kundli se</p>
            <h1 className="font-hindi mt-2 text-[2.3rem] leading-[1.18] text-[var(--ed-text)] [text-shadow:0_2px_22px_rgba(0,0,0,0.65)]">
              आपकी शादी कब होगी<br />और किससे?
            </h1>
          </div>
        </div>
        <p className="mt-1 max-w-[340px] text-[15px] leading-relaxed text-[var(--ed-muted)]">
          6 छोटे सवाल, फिर आपकी जन्म कुंडली से जवाब: शादी का साल, जीवनसाथी के नाम का अक्षर और देर की वजह।
        </p>
        <TrustLine items={["1 मिनट", "पूरी तरह गोपनीय", "लाहिड़ी अयनांश से गणना"]} />
      </section>
      <div className="pt-5">{card}</div>
      {footer}
    </>
  );
}

function StepCard({ children, onBack, label, progress, bar }: { children: ReactNode; onBack?: () => void; label: string; progress: ReactNode; bar?: number }) {
  return (
    <div className="paper rise p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className="ink-soft -ml-1 inline-flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> पिछला
          </button>
        ) : (
          <span className="text-[12px] font-semibold tracking-[0.08em] text-[#9a6a2a]">{label}</span>
        )}
        {progress}
      </div>
      {bar !== undefined && (
        <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[#efe4d8]">
          <div className="h-full rounded-full bg-[var(--ed-accent)] transition-all duration-300" style={{ width: `${bar * 100}%` }} />
        </div>
      )}
      {onBack && <p className="mb-1 text-[12px] font-semibold tracking-[0.08em] text-[#9a6a2a]">{label}</p>}
      {children}
    </div>
  );
}

function Dots({ n, at }: { n: number; at: number }) {
  return (
    <span className="flex items-center gap-1.5" aria-label={`${at + 1} / ${n}`}>
      {Array.from({ length: n }, (_, k) => (
        <span key={k} className={`h-1.5 rounded-full transition-all ${k === at ? "w-5 bg-[var(--ink)]" : k < at ? "w-1.5 bg-[var(--ink)]" : "w-1.5 bg-[#e3d4c6]"}`} />
      ))}
    </span>
  );
}

function QuestionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <h2 className="ink text-[1.45rem] leading-snug" style={{ fontFamily: '"Tiro Devanagari Hindi", serif' }}>{title}</h2>
      {sub && <p className="ink-soft mt-1 text-[13px]">{sub}</p>}
    </div>
  );
}

function Options({ options, value, onPick }: { options: readonly { value: string; label: string }[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="space-y-2.5">
      {options.map((o) => (
        <button key={o.value} type="button" className="quiz-opt" aria-pressed={value === o.value} onClick={() => onPick(o.value)}>
          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${value === o.value ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[#cdb9a8]"}`}>
            {value === o.value && <Check className="h-3 w-3" strokeWidth={3} />}
          </span>
          <span className="flex-1">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

function NextButton() {
  return (
    <button type="submit" className="btn-gold mt-5">
      आगे <ArrowRight className="h-4 w-4" />
    </button>
  );
}

function TimeStep({ value, onDone }: { value: string | null; onDone: (tob: string | null) => void }) {
  const init = value ? value.split(":").map(Number) : null;
  const [h, setH] = useState(init ? String(init[0] % 12 || 12) : "");
  const [min, setMin] = useState(init ? pad(init[1] - (init[1] % 5)) : "00");
  const [ap, setAp] = useState(init ? (init[0] >= 12 ? "PM" : "AM") : "AM");
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <QuestionTitle title="जन्म का समय?" sub="सही समय से लग्न भी निकलता है। पता न हो तो छोड़ दें, चंद्र कुंडली से देखेंगे।" />
      <div className="grid grid-cols-3 gap-2">
        <select aria-label="घंटा" className="field" value={h} onChange={(e) => setH(e.target.value)}>
          <option value="">घंटा</option>
          {Array.from({ length: 12 }, (_, k) => k + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select aria-label="मिनट" className="field" value={min} onChange={(e) => setMin(e.target.value)}>
          {Array.from({ length: 12 }, (_, k) => pad(k * 5)).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select aria-label="सुबह या शाम" className="field" value={ap} onChange={(e) => setAp(e.target.value)}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <ErrorNote message={error} />
      <button
        type="button"
        className="btn-gold mt-5"
        onClick={() => {
          if (!h) return setError("घंटा चुनें, या नीचे 'समय पता नहीं' दबाएँ।");
          onDone(`${pad((Number(h) % 12) + (ap === "PM" ? 12 : 0))}:${min}`);
        }}
      >
        आगे <ArrowRight className="h-4 w-4" />
      </button>
      <button type="button" className="ink-soft mt-3 w-full py-2 text-center text-[14px] underline underline-offset-4" onClick={() => onDone(null)}>
        समय पता नहीं, आगे बढ़ें
      </button>
    </div>
  );
}

/** Between the quiz and the birth details: their worry, acknowledged, and what happens next. */
function HearYou({ product, answers, onNext }: { product: QuizProduct; answers: QuizAnswers; onNext: () => void }) {
  const l = quizLabels(product, answers);
  useEffect(() => {
    const t = window.setTimeout(onNext, 4500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="flex min-h-[82dvh] flex-col items-center justify-center pt-12 text-center">
      <div className="rise relative">
        <ZodiacWheel size={150} className="opacity-70" />
      </div>
      <p className="font-hindi rise mt-7 text-[1.7rem] leading-snug text-[var(--ed-text)]">आपकी चिंता सच्ची है।</p>
      <p className="rise mx-auto mt-3 max-w-[320px] text-[15px] leading-relaxed text-[var(--ed-muted)]">
        “{l[QUOTE_KEY[product]]}”, और वो भी {l.since}। यह आसान नहीं होता।
      </p>
      <p className="rise mx-auto mt-4 max-w-[320px] text-[14px] leading-relaxed text-[var(--ed-muted)]">{PRODUCT[product].hear}</p>
      <button type="button" className="btn-gold mt-8 max-w-[300px]" onClick={onNext}>
        आगे बढ़ें <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- shared paywall pieces

/** Where each house's planets and sign number sit in a 300×300 North Indian chart (house 1 at the top). */
const HOUSE_POS: { p: [number, number]; s: [number, number]; wide: boolean; poly: string }[] = [
  { p: [150, 62], s: [150, 128], wide: true, poly: "150,0 75,75 150,150 225,75" },
  { p: [75, 24], s: [75, 60], wide: false, poly: "0,0 150,0 75,75" },
  { p: [24, 75], s: [60, 75], wide: false, poly: "0,0 75,75 0,150" },
  { p: [62, 150], s: [128, 150], wide: true, poly: "0,150 75,75 150,150 75,225" },
  { p: [24, 225], s: [60, 225], wide: false, poly: "0,150 75,225 0,300" },
  { p: [75, 278], s: [75, 242], wide: false, poly: "0,300 75,225 150,300" },
  { p: [150, 240], s: [150, 172], wide: true, poly: "150,300 75,225 150,150 225,225" },
  { p: [225, 278], s: [225, 242], wide: false, poly: "150,300 225,225 300,300" },
  { p: [276, 225], s: [240, 225], wide: false, poly: "300,300 225,225 300,150" },
  { p: [238, 150], s: [172, 150], wide: true, poly: "300,150 225,225 150,150 225,75" },
  { p: [276, 75], s: [240, 75], wide: false, poly: "300,150 225,75 300,0" },
  { p: [225, 24], s: [225, 60], wide: false, poly: "300,0 225,75 150,0" },
];

export type KundliData = { baseIsLagna: boolean; houses: { sign: number; planets: string[] }[] };

export function KundliChart({ houses, highlight = 7 }: { houses: KundliData["houses"]; highlight?: number }) {
  const line = "#b88a52";
  return (
    <svg viewBox="-4 -4 308 308" className="mx-auto block w-full max-w-[300px]" role="img" aria-label="Aapki janm kundli (North Indian chart)">
      <rect x="0" y="0" width="300" height="300" rx="6" fill="#fffaf2" stroke={line} strokeWidth="2" />
      <polygon points={HOUSE_POS[highlight - 1].poly} fill="#f1b45c" opacity="0.28" />
      <path d="M0 0L300 300M300 0L0 300M150 0L0 150L150 300L300 150Z" fill="none" stroke={line} strokeWidth="1.6" />
      {houses.map((h, k) => {
        const pos = HOUSE_POS[k];
        const per = pos.wide ? 3 : 2;
        const rows: string[][] = [];
        for (let r = 0; r < h.planets.length; r += per) rows.push(h.planets.slice(r, r + per));
        const y0 = pos.p[1] - ((rows.length - 1) * 15) / 2;
        return (
          <g key={k}>
            <text x={pos.s[0]} y={pos.s[1]} textAnchor="middle" dominantBaseline="middle" fontSize="11" fill="#9a7a5a" fontFamily="Marcellus, serif">{h.sign}</text>
            {rows.map((row, r) => (
              <text key={r} x={pos.p[0]} y={y0 + r * 15} textAnchor="middle" dominantBaseline="middle" fontSize="13.5" fill="#2c1219" fontFamily="'Tiro Devanagari Hindi', serif">
                {row.join(" ")}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** The birth chart card: the chart with one house marked, and a line about why that house. */
export function KundliCard({ kundli, highlight, title, text }: { kundli: KundliData; highlight: number; title: string; text: string }) {
  return (
    <section className="paper rise p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a6a2a]">आपकी जन्म कुंडली</p>
      <h2 className="ink mt-1 text-[1.35rem] leading-snug" style={{ fontFamily: '"Tiro Devanagari Hindi", serif' }}>{title}</h2>
      <div className="mt-4"><KundliChart houses={kundli.houses} highlight={highlight} /></div>
      <p className="ink mt-4 text-[14px] leading-relaxed">{text}</p>
      {!kundli.baseIsLagna && <p className="ink-soft mt-2 text-[12.5px]">जन्म समय न होने से चंद्र कुंडली दिखाई गई है।</p>}
    </section>
  );
}

/** The buyer's own words, quoted back. */
export function QuoteCard({ quote, meta, line }: { quote: string; meta: string; line: string }) {
  return (
    <section className="rise rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-surface)] p-5">
      <Quote className="h-5 w-5 text-[var(--ed-accent)]" />
      <p className="font-hindi mt-2 text-[1.25rem] leading-snug text-[var(--ed-text)]">“{quote}”</p>
      <p className="mt-2 text-[13px] text-[var(--ed-muted)]">{meta}</p>
      <p className="mt-3 border-t border-[var(--ed-line)] pt-3 text-[14px] leading-relaxed text-[var(--ed-text)]">{line}</p>
    </section>
  );
}

export function LockPill({ text = "पूरी रिपोर्ट में खुलेगा" }: { text?: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-1.5 text-[12px] font-medium text-[#fbe9cf]">
      <Lock className="h-3.5 w-3.5" /> {text}
    </span>
  );
}

export function AnswerCard({ n, img, title, children }: { n: number; img: string; title: string; children: ReactNode }) {
  return (
    <section className="paper rise overflow-hidden">
      <div className="flex items-center gap-3.5 border-b border-[#efe3d6] p-4">
        <img src={img} alt="" width={480} height={480} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a6a2a]">जवाब {n} / 3</p>
          <h3 className="ink mt-0.5 text-[1.2rem] leading-snug" style={{ fontFamily: '"Tiro Devanagari Hindi", serif' }}>{title}</h3>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Rows of locked items with a lock at the end. */
export function LockedList({ items }: { items: string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((t) => (
        <li key={t} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbf3ea] px-3 py-2.5 ring-1 ring-[#efe0cf]">
          <span className="ink text-[13.5px]">{t}</span>
          <Lock className="h-4 w-4 shrink-0 text-[#9a6a2a]" />
        </li>
      ))}
    </ul>
  );
}

/** Blurred filler lines standing in for the locked reading. */
export function BlurLines({ lines = 2 }: { lines?: number }) {
  const words = ["Aapki kundli me yeh yog", "dasham bhaav ke swami ki dasha", "aur Guru ka gochar milkar", "sabse anukool samay banata hai"];
  return (
    <div className="blur-lock mt-3 space-y-1 text-[14px] text-[#3a1a22]" aria-hidden>
      {Array.from({ length: lines }, (_, k) => <p key={k}>{words[k % words.length]} {words[(k + 1) % words.length]}</p>)}
    </div>
  );
}

/** What the full report holds, the ₹99 / ₹999 price and the pay button. */
export function PriceCard({ items, price, paying, onPay }: { items: string[]; price: { rupees: number; strike: number }; paying: boolean; onPay: () => void }) {
  return (
    <section className="paper rise p-5 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a6a2a]">पूरी रिपोर्ट</p>
      <ul className="mx-auto mt-3 max-w-[300px] space-y-2 text-left">
        {[...items, "रिपोर्ट के बाद 2 सवाल मुफ़्त"].map((t) => (
          <li key={t} className="ink flex gap-2.5 text-[14px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7a4a]" strokeWidth={2.5} />{t}</li>
        ))}
      </ul>
      <div className="mt-5 flex items-end justify-center gap-3">
        <span className="ink-soft text-[1.3rem] line-through">₹{price.strike}</span>
        <span className="font-display ink text-[2.8rem] leading-none">₹{price.rupees}</span>
      </div>
      <p className="mt-1 text-[13px] font-medium text-[#2f7a4a]">एक बार का भुगतान · कोई subscription नहीं</p>
      <button type="button" className="btn-gold mt-4" disabled={paying} onClick={onPay}>
        {paying ? "Payment खुल रहा है…" : <><Lock className="h-4 w-4" /> पूरी रिपोर्ट खोलें · ₹{price.rupees}</>}
      </button>
      <p className="ink-soft mt-2 flex items-center justify-center gap-1.5 text-[12px]"><ShieldCheck className="h-3.5 w-3.5" /> Razorpay से सुरक्षित · UPI, कार्ड · तुरंत खुलेगी</p>
    </section>
  );
}

export function QuizFaq({ how }: { how: string }) {
  return (
    <section className="pt-6">
      <SectionHead title="अक्सर पूछे जाने वाले सवाल" />
      <Faq
        items={[
          { q: "यह कैसे निकाला जाता है?", a: how },
          { q: "क्या यह पक्का है?", a: "ज्योतिष योग और संभावना बताता है, गारंटी नहीं। इस रिपोर्ट को मार्गदर्शन की तरह लें।" },
          { q: "भुगतान के बाद रिपोर्ट कहाँ मिलेगी?", a: "भुगतान होते ही इसी पेज पर पूरी रिपोर्ट खुल जाती है। इसी फ़ोन पर यह लिंक दोबारा खोलकर आप इसे कभी भी देख सकते हैं।" },
        ]}
      />
    </section>
  );
}
