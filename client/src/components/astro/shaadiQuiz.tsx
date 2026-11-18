import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Lock, Quote, ShieldCheck, Sparkles } from "lucide-react";
import {
  SHAADI_QUIZ_STEPS, shaadiQuizLabels, shaadiQuizQuestion,
  type ShaadiQuizAnswers, type ShaadiQuizStep, type ShaadiWorry,
} from "@shared/shaadiQuiz";
import { Analysing, AstroFooter, CITY_HINTS, ErrorNote, Faq, PayBar, ZodiacWheel } from "@/components/astro/ui";
import { ReportBanner, SectionHead, TrustLine } from "@/components/astro/editorial";
import { PaidReportBanner } from "@/components/astro/paid";
import { PartnerSilhouette } from "@/components/astro/partnerSilhouette";
import {
  cacheReport, createShaadiPreview, lastReportId, loadSelf, logAstro, rememberReport, saveSelf, trackAstro, wait,
  type Gender, type ShaadiReport,
} from "@/lib/astroApi";

/**
 * /shaadi quiz flow (SHAADI_QUIZ test, shared/astroProducts.ts), modelled on numsecret.com:
 * six one-tap questions about the shaadi worry, a short "we hear you" screen, birth details one per
 * screen, then a paywall that quotes the answers back, draws the real kundli and shows three
 * locked answer cards. ₹99 opens the same full Shaadi report as the classic page.
 */

const HERO = "/astro/milan-hero.webp";
const IMG = { when: "/astro/k-venus.webp", who: "/astro/k-door.webp", why: "/astro/k-saturn.webp" } as const;

const MONTHS_HI = ["जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
const QUICK_CITIES = ["Delhi", "Lucknow", "Jaipur", "Patna", "Mumbai", "Kanpur"];

const pad = (n: number | string) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate();

type DetailStep = "name" | "gender" | "year" | "month" | "day" | "time" | "place";
const DETAIL_STEPS: DetailStep[] = ["name", "gender", "year", "month", "day", "time", "place"];

type Phase = { kind: "quiz"; i: number } | { kind: "hear" } | { kind: "detail"; i: number } | { kind: "making" };

// ---------------------------------------------------------------- landing: quiz + details

export function ShaadiQuizLanding() {
  const [, navigate] = useLocation();
  const saved = useRef(loadSelf()).current;
  const last = useRef(lastReportId("shaadi")).current;
  const [phase, setPhase] = useState<Phase>({ kind: "quiz", i: 0 });
  const [answers, setAnswers] = useState<Partial<ShaadiQuizAnswers>>({});
  const [name, setName] = useState(saved.name ?? "");
  const [gender, setGender] = useState<Gender | "">(saved.gender ?? "");
  const [year, setYear] = useState(saved.dob?.slice(0, 4) ?? "");
  const [month, setMonth] = useState(saved.dob ? Number(saved.dob.slice(5, 7)) : 0);
  const [day, setDay] = useState(saved.dob ? Number(saved.dob.slice(8, 10)) : 0);
  const [tob, setTob] = useState<string | null>(saved.tob ?? null);
  const [place, setPlace] = useState(saved.place ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackAstro("astro_landing", "shaadi", { flow: "quiz" });
  }, []);

  const phaseKey = phase.kind === "quiz" || phase.kind === "detail" ? `${phase.kind}${phase.i}` : phase.kind;
  useEffect(() => {
    if (phaseKey !== "quiz0") window.scrollTo({ top: 0 });
  }, [phaseKey]);
  /** Moves to another screen, dropping any error shown on this one. */
  const go = (p: Phase) => {
    setError(null);
    setPhase(p);
  };

  const step = (n: number, stepName: string, value?: string) =>
    logAstro("astro_quiz_step", "shaadi", { flow: "quiz", step: stepName, n, ...(value ? { value } : {}) });

  // ---- quiz answers: one tap, then the next question
  const pick = (key: ShaadiQuizStep, value: string, i: number) => {
    const next = { ...answers, [key]: value } as Partial<ShaadiQuizAnswers>;
    // A different worry makes the earlier detail answer meaningless.
    if (key === "worry" && answers.worry !== value) delete next.detail;
    setAnswers(next);
    step(i + 1, key, value);
    window.setTimeout(() => go(i + 1 < SHAADI_QUIZ_STEPS.length ? { kind: "quiz", i: i + 1 } : { kind: "hear" }), 220);
  };

  // ---- details, one per screen
  const nextDetail = (i: number, value?: string) => {
    step(SHAADI_QUIZ_STEPS.length + i + 1, DETAIL_STEPS[i], value);
    if (i + 1 < DETAIL_STEPS.length) go({ kind: "detail", i: i + 1 });
  };
  const back = () => {
    if (phase.kind === "quiz" && phase.i > 0) go({ kind: "quiz", i: phase.i - 1 });
    else if (phase.kind === "detail") go(phase.i > 0 ? { kind: "detail", i: phase.i - 1 } : { kind: "quiz", i: SHAADI_QUIZ_STEPS.length - 1 });
  };

  const submit = async (cityValue = place) => {
    const city = cityValue.trim();
    if (city.length < 2) return setError("कृपया जन्म स्थान लिखें।");
    const quiz = answers as ShaadiQuizAnswers;
    const dob = `${year}-${pad(month)}-${pad(day)}`;
    if (!gender || !month || !day || !quiz.want) return setError("कुछ जानकारी छूट गई है। कृपया पीछे जाकर भरें।");
    setPlace(city);
    step(SHAADI_QUIZ_STEPS.length + DETAIL_STEPS.length, "place");
    go({ kind: "making" });
    const self = { name: name.trim(), gender, dob, tob, place: city };
    trackAstro("astro_form_submitted", "shaadi", { flow: "quiz", has_time: !!tob, has_palm: false, worry: quiz.worry, want: quiz.want });
    try {
      const [report] = await Promise.all([createShaadiPreview(self, null, quiz), wait(5200)]);
      saveSelf(self);
      rememberReport("shaadi", report.id);
      cacheReport(report);
      navigate(`/shaadi/r/${report.id}`);
    } catch (err) {
      setPhase({ kind: "detail", i: DETAIL_STEPS.length - 1 });
      setError(err instanceof Error ? err.message : "कुछ गड़बड़ हो गई। दोबारा कोशिश करें।");
    }
  };

  if (phase.kind === "making") {
    return (
      <div className="pt-16">
        <Analysing
          title="आपकी कुंडली बन रही है"
          steps={["ग्रहों की स्थिति की गणना", "लग्न और चंद्र राशि", "सातवाँ भाव (विवाह भाव)", "विंशोत्तरी दशा का समय", "जीवनसाथी के संकेत"]}
        />
      </div>
    );
  }

  if (phase.kind === "hear") return <HearYou answers={answers as ShaadiQuizAnswers} onNext={() => go({ kind: "detail", i: 0 })} />;

  if (phase.kind === "detail") {
    const i = phase.i;
    const key = DETAIL_STEPS[i];
    const y = Number(year);
    return (
      <div className="pt-16">
        <StepCard
          onBack={back}
          label="आपकी कुंडली के लिए"
          progress={<Dots n={DETAIL_STEPS.length} at={i} />}
        >
          {key === "name" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim().length < 2) return setError("कृपया अपना नाम लिखें।");
                nextDetail(i);
              }}
            >
              <QuestionTitle title="आपका पूरा नाम?" sub="जन्म के समय का नाम, जैसा घर में लिखा जाता है।" />
              <input className="field" autoFocus autoComplete="name" placeholder="जैसे: Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              <ErrorNote message={error} />
              <NextButton />
            </form>
          )}
          {key === "gender" && (
            <div>
              <QuestionTitle title="आप पुरुष हैं या महिला?" sub="इससे पता चलता है कि रिपोर्ट पति के बारे में बताए या पत्नी के।" />
              <Options
                options={[{ value: "male", label: "पुरुष" }, { value: "female", label: "महिला" }]}
                value={gender}
                onPick={(v) => {
                  setGender(v as Gender);
                  window.setTimeout(() => nextDetail(i, v), 200);
                }}
              />
            </div>
          )}
          {key === "year" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const max = new Date().getFullYear() - 14;
                if (!/^\d{4}$/.test(year) || y < 1945 || y > max) return setError(`कृपया 1945 से ${max} के बीच का साल लिखें।`);
                nextDetail(i);
              }}
            >
              <QuestionTitle title="आपका जन्म किस साल हुआ?" sub="साल से आपकी दशा का क्रम निकलता है।" />
              <input className="field text-center text-[1.25rem] tracking-[0.2em]" autoFocus inputMode="numeric" pattern="[0-9]*" placeholder="जैसे 1996" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} />
              <ErrorNote message={error} />
              <NextButton />
            </form>
          )}
          {key === "month" && (
            <div>
              <QuestionTitle title="किस महीने में?" />
              <div className="grid grid-cols-3 gap-2">
                {MONTHS_HI.map((m, k) => (
                  <button
                    key={m}
                    type="button"
                    className="quiz-tile"
                    aria-pressed={month === k + 1}
                    onClick={() => {
                      setMonth(k + 1);
                      if (day > daysIn(y || 2000, k + 1)) setDay(0);
                      window.setTimeout(() => nextDetail(i), 180);
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}
          {key === "day" && (
            <div>
              <QuestionTitle title="कौन सी तारीख़?" sub={`${MONTHS_HI[month - 1] ?? ""} ${year}`} />
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: daysIn(y || 2000, month || 1) }, (_, k) => k + 1).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="quiz-tile !h-11 !text-[15px]"
                    aria-pressed={day === d}
                    onClick={() => {
                      setDay(d);
                      window.setTimeout(() => nextDetail(i), 180);
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
          {key === "time" && (
            <TimeStep
              value={tob}
              onDone={(t) => {
                setTob(t);
                nextDetail(i, t ? "known" : "unknown");
              }}
            />
          )}
          {key === "place" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <QuestionTitle title="जन्म स्थान?" sub="शहर या ज़िला। इससे लग्न सही निकलता है।" />
              <input className="field" autoFocus list="sq-cities" placeholder="जैसे: Jaipur, Rajasthan" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} />
              <datalist id="sq-cities">{CITY_HINTS.map((c) => <option key={c} value={c} />)}</datalist>
              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_CITIES.map((c) => (
                  <button key={c} type="button" onClick={() => setPlace(c)} className="rounded-full border border-[#eadbcf] bg-white px-3 py-1.5 text-[13px] text-[var(--ink)]">
                    {c}
                  </button>
                ))}
              </div>
              <ErrorNote message={error} />
              <button type="submit" className="btn-gold mt-5">
                <Sparkles className="h-4 w-4" /> मेरी कुंडली देखें
              </button>
            </form>
          )}
        </StepCard>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] text-[var(--ed-muted)]">
          <Lock className="h-3.5 w-3.5" /> आपकी जानकारी गोपनीय है, किसी को नहीं दिखाई जाती।
        </p>
      </div>
    );
  }

  // ---- the six quiz questions (the first one sits under the photo)
  const i = phase.i;
  const key = SHAADI_QUIZ_STEPS[i];
  const q = shaadiQuizQuestion(key, answers.worry as ShaadiWorry | undefined);
  const card = (
    <StepCard
      onBack={i > 0 ? back : undefined}
      label={q.kicker}
      progress={<span className="ink-soft text-[12.5px]">सवाल {i + 1} / {SHAADI_QUIZ_STEPS.length}</span>}
      bar={(i + 1) / SHAADI_QUIZ_STEPS.length}
    >
      <QuestionTitle title={q.title} sub="जो सबसे सही लगे, वो चुनें" />
      <Options key={key} options={q.options} value={(answers[key] as string | undefined) ?? ""} onPick={(v) => pick(key, v, i)} />
    </StepCard>
  );

  if (i > 0) return <div className="pt-16">{card}</div>;

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
              आपकी शादी कब होगी
              <br />
              और किससे?
            </h1>
          </div>
        </div>
        <p className="mt-1 max-w-[340px] text-[15px] leading-relaxed text-[var(--ed-muted)]">6 छोटे सवाल, फिर आपकी जन्म कुंडली से जवाब: शादी का साल, जीवनसाथी के नाम का अक्षर और देर की वजह।</p>
        <TrustLine items={["1 मिनट", "पूरी तरह गोपनीय", "लाहिड़ी अयनांश से गणना"]} />
      </section>
      <div className="pt-5">{card}</div>
      {last && (
        <p className="mt-4 text-center">
          <Link href={`/shaadi/r/${last}`} className="text-[13px] text-[var(--ed-accent)] underline underline-offset-4">पिछली रिपोर्ट दोबारा खोलें</Link>
        </p>
      )}
      <div className="mt-6"><PaidReportBanner type="shaadi" /></div>
      <AstroFooter />
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
      <h2 className="font-hindi ink text-[1.45rem] leading-snug" style={{ fontFamily: '"Tiro Devanagari Hindi", serif' }}>{title}</h2>
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
function HearYou({ answers, onNext }: { answers: ShaadiQuizAnswers; onNext: () => void }) {
  const l = shaadiQuizLabels(answers);
  useEffect(() => {
    const t = window.setTimeout(onNext, 4200);
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
        “{l.detail}”, और वो भी {l.since}। यह आसान नहीं होता।
      </p>
      <p className="rise mx-auto mt-4 max-w-[320px] text-[14px] leading-relaxed text-[var(--ed-muted)]">
        शादी का समय और जीवनसाथी के संकेत जन्म कुंडली के सातवें भाव और दशा से देखे जाते हैं। अब बस आपकी जन्म की जानकारी चाहिए।
      </p>
      <button type="button" className="btn-gold mt-8 max-w-[300px]" onClick={onNext}>
        आगे बढ़ें <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- North Indian kundli

/** Where each house's planets and sign number sit in a 300×300 North Indian chart (house 1 at the top). */
const HOUSE_POS: { p: [number, number]; s: [number, number]; wide: boolean }[] = [
  { p: [150, 62], s: [150, 128], wide: true },
  { p: [75, 24], s: [75, 60], wide: false },
  { p: [24, 75], s: [60, 75], wide: false },
  { p: [62, 150], s: [128, 150], wide: true },
  { p: [24, 225], s: [60, 225], wide: false },
  { p: [75, 278], s: [75, 242], wide: false },
  { p: [150, 240], s: [150, 172], wide: true },
  { p: [225, 278], s: [225, 242], wide: false },
  { p: [276, 225], s: [240, 225], wide: false },
  { p: [238, 150], s: [172, 150], wide: true },
  { p: [276, 75], s: [240, 75], wide: false },
  { p: [225, 24], s: [225, 60], wide: false },
];

export function KundliChart({ houses, highlight = 7 }: { houses: { sign: number; planets: string[] }[]; highlight?: number }) {
  const line = "#b88a52";
  return (
    <svg viewBox="-4 -4 308 308" className="mx-auto block w-full max-w-[300px]" role="img" aria-label="Aapki janm kundli (North Indian chart)">
      <rect x="0" y="0" width="300" height="300" rx="6" fill="#fffaf2" stroke={line} strokeWidth="2" />
      {highlight === 7 && <polygon points="150,300 75,225 150,150 225,225" fill="#f1b45c" opacity="0.28" />}
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

// ---------------------------------------------------------------- paywall

const WANT_ORDER: Record<ShaadiQuizAnswers["want"], ("when" | "who" | "why")[]> = {
  when: ["when", "who", "why"],
  kind: ["when", "who", "why"],
  who: ["who", "when", "why"],
  why: ["why", "when", "who"],
};

function LockPill({ text = "पूरी रिपोर्ट में खुलेगा" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--ink)] px-3 py-1.5 text-[12px] font-medium text-[#fbe9cf]">
      <Lock className="h-3.5 w-3.5" /> {text}
    </span>
  );
}

function AnswerCard({ n, img, title, children }: { n: number; img: string; title: string; children: ReactNode }) {
  return (
    <section className="paper rise overflow-hidden">
      <div className="flex items-center gap-3.5 border-b border-[#efe3d6] p-4">
        <img src={img} alt="" width={480} height={480} loading="lazy" decoding="async" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a6a2a]">जवाब {n} / 3</p>
          <h3 className="font-hindi ink mt-0.5 text-[1.2rem] leading-snug" style={{ fontFamily: '"Tiro Devanagari Hindi", serif' }}>{title}</h3>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** Blurred filler lines standing in for the locked reading. */
function BlurLines({ lines = 2 }: { lines?: number }) {
  const words = ["Aapki kundli me yeh yog", "saptam bhaav ke swami ki dasha", "aur Guru ka gochar milkar", "vivah ke liye sabse anukool"];
  return (
    <div className="blur-lock mt-3 space-y-1 text-[14px] text-[#3a1a22]" aria-hidden>
      {Array.from({ length: lines }, (_, k) => <p key={k}>{words[k % words.length]} {words[(k + 1) % words.length]}</p>)}
    </div>
  );
}

export function ShaadiQuizPaywall({ report, error, paying, onPay }: { report: ShaadiReport; error: string | null; paying: boolean; onPay: () => void }) {
  const first = useMemo(() => {
    const raw = report.name.split(/\s+/)[0];
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [report.name]);
  const who = report.gender === "male" ? "पत्नी" : "पति";
  const strong = /prabal/i.test(report.headline);
  const l = report.quiz ? shaadiQuizLabels(report.quiz) : null;
  const order = report.quiz ? WANT_ORDER[report.quiz.want] : WANT_ORDER.when;
  const delays = report.delayCount ?? 0;

  const cards: Record<"when" | "who" | "why", (n: number) => ReactNode> = {
    when: (n) => (
      <AnswerCard key="when" n={n} img={IMG.when} title="शादी कब होगी">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="ink-soft text-[13px]">{strong ? "विवाह का प्रबल योग" : "विवाह का योग"}</p>
            <p className="font-display ink mt-1 text-[2.6rem] leading-none" aria-label="Saal poori report me khulega">
              20<span className="blur-lock inline-block !blur-[9px]" aria-hidden>88</span>
              {report.windowIsRange && <>–<span className="blur-lock inline-block !blur-[9px]" aria-hidden>88</span></>}
            </p>
          </div>
          <LockPill text="साल और महीने" />
        </div>
        <p className="ink mt-3 text-[14px] leading-relaxed">
          आपकी कुंडली में शादी का सबसे मज़बूत समय निकल आया है{report.windowIsRange ? ", जो दो साल के बीच फैला है" : ""}। यह समय आपकी विंशोत्तरी दशा और विवाह भाव से निकाला गया है।
        </p>
        {report.quiz?.want === "kind" && <p className="ink-soft mt-2 text-[13px]">लव मैरिज होगी या अरेंज, यह भी इसी हिस्से में है।</p>}
        <BlurLines />
      </AnswerCard>
    ),
    who: (n) => (
      <AnswerCard key="who" n={n} img={IMG.who} title={`होने वाले ${who} का नाम और झलक`}>
        <div className="flex gap-4">
          <div className="relative h-[112px] w-[92px] shrink-0 overflow-hidden rounded-xl ring-1 ring-[#d9b98a]">
            <PartnerSilhouette variant={report.gender === "male" ? "woman" : "man"} className="h-full w-full scale-110 blur-[6px]" />
            <span className="absolute inset-0 grid place-items-center">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[rgba(44,18,25,0.85)] text-[#fbe9cf]"><Lock className="h-4 w-4" /></span>
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="ink-soft text-[12.5px]">नाम इनमें से किसी अक्षर से</p>
            <div className="mt-1.5 flex gap-1.5">
              <span className="letter-tile !aspect-auto h-10 w-10 !rounded-lg !text-[1.25rem]">{report.firstLetter?.latin}</span>
              {Array.from({ length: Math.max(0, report.letterCount - 1) }).map((_, k) => (
                <span key={k} className="letter-tile locked !aspect-auto h-10 w-10 !rounded-lg"><Lock className="h-4 w-4 text-[#9a6a2a]" /></span>
              ))}
            </div>
            <p className="ink mt-2.5 text-[13.5px] leading-relaxed">
              पहला अक्षर <b>{report.firstLetter?.latin} ({report.firstLetter?.hi})</b> आपके विवाह भाव की राशि से निकला है।
            </p>
          </div>
        </div>
        <p className="ink-soft mt-3 text-[13px] leading-relaxed">बाक़ी {Math.max(0, report.letterCount - 1)} अक्षर, {who} का रूप-स्वभाव, काम और रिश्ता किस दिशा से आएगा: पूरी रिपोर्ट में।</p>
      </AnswerCard>
    ),
    why: (n) => (
      <AnswerCard key="why" n={n} img={IMG.why} title="देर की वजह और उपाय">
        <p className="ink text-[14.5px] leading-relaxed">
          {delays > 0 ? (
            <>आपकी कुंडली में <b>{delays} कारण</b> मिले हैं जो शादी में देर करा सकते हैं।</>
          ) : (
            <>आपकी कुंडली में शादी रोकने वाला कोई बड़ा कारण नहीं दिखा। सही समय पहचानना सबसे ज़रूरी है।</>
          )}
        </p>
        <ul className="mt-3 space-y-2">
          {[delays > 0 ? "देर के कारण, एक-एक करके" : "सही समय पर क्या करें", "मंगल दोष है या नहीं", "आपकी कुंडली के हिसाब से सरल उपाय"].map((t) => (
            <li key={t} className="flex items-center justify-between gap-3 rounded-xl bg-[#fbf3ea] px-3 py-2.5 ring-1 ring-[#efe0cf]">
              <span className="ink text-[13.5px]">{t}</span>
              <Lock className="h-4 w-4 shrink-0 text-[#9a6a2a]" />
            </li>
          ))}
        </ul>
      </AnswerCard>
    ),
  };

  return (
    <>
      <ReportBanner src={HERO} kicker="आपकी कुंडली तैयार है" title={`${first} जी, ${strong ? "आपकी कुंडली में विवाह का प्रबल योग है" : "आपकी कुंडली में विवाह का योग है"}`} position="50% 60%" />
      <div className="mt-4 flex flex-wrap gap-2 text-[12px]">
        {report.chart.lagna && <span className="glass px-3 py-1.5">लग्न: <b className="font-semibold">{report.chart.lagna}</b></span>}
        <span className="glass px-3 py-1.5">राशि: <b className="font-semibold">{report.chart.moonRashiHi}</b></span>
        <span className="glass px-3 py-1.5">नक्षत्र: <b className="font-semibold">{report.chart.nakshatra}</b></span>
      </div>

      <div className="mt-6 space-y-4">
        {l && (
          <section className="rise rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-surface)] p-5">
            <Quote className="h-5 w-5 text-[var(--ed-accent)]" />
            <p className="font-hindi mt-2 text-[1.25rem] leading-snug text-[var(--ed-text)]">“{l.detail}”</p>
            <p className="mt-2 text-[13px] text-[var(--ed-muted)]">{l.since} · असर: {l.impact.replace(/ पर$/, "")}</p>
            <p className="mt-3 border-t border-[var(--ed-line)] pt-3 text-[14px] leading-relaxed text-[var(--ed-text)]">
              आपने बताया था। इसलिए आपकी कुंडली में सबसे पहले विवाह भाव (सातवाँ घर) देखा गया।
            </p>
          </section>
        )}

        {report.kundli && (
          <section className="paper rise p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a6a2a]">आपकी जन्म कुंडली</p>
            <h2 className="font-hindi ink mt-1 text-[1.35rem] leading-snug">विवाह भाव में {report.seventh?.rashi} राशि</h2>
            <div className="mt-4"><KundliChart houses={report.kundli.houses} /></div>
            <p className="ink mt-4 text-[14px] leading-relaxed">
              सातवें घर (हल्का सुनहरा) में {report.seventh?.rashi} राशि है और उसके स्वामी {report.seventh?.lord} {report.seventh?.lordHouse}वें घर में हैं। शादी का समय और जीवनसाथी के संकेत यहीं से पढ़े जाते हैं।
            </p>
            {!report.kundli.baseIsLagna && <p className="ink-soft mt-2 text-[12.5px]">जन्म समय न होने से चंद्र कुंडली दिखाई गई है।</p>}
          </section>
        )}

        <div className="pt-4">
          <SectionHead kicker="आपकी कुंडली से" title="आपके 3 जवाब तैयार हैं" sub="तीनों आपकी कुंडली से निकाले गए हैं। पूरी रिपोर्ट में खुलेंगे।" />
          <div className="space-y-4">{order.map((k, idx) => cards[k](idx + 1))}</div>
        </div>

        <section className="paper rise p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9a6a2a]">पूरी रिपोर्ट</p>
          <ul className="mx-auto mt-3 max-w-[300px] space-y-2 text-left">
            {["शादी का साल और महीने", `${who} के नाम के ${report.letterCount} संभावित अक्षर`, `${who} का स्केच, रूप और स्वभाव`, "लव मैरिज या अरेंज", "मंगल दोष की जाँच", "देर के कारण और सरल उपाय", "रिपोर्ट के बाद 2 सवाल मुफ़्त"].map((t) => (
              <li key={t} className="ink flex gap-2.5 text-[14px]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2f7a4a]" strokeWidth={2.5} />{t}</li>
            ))}
          </ul>
          <div className="mt-5 flex items-end justify-center gap-3">
            <span className="ink-soft text-[1.3rem] line-through">₹{report.price.strike}</span>
            <span className="font-display ink text-[2.8rem] leading-none">₹{report.price.rupees}</span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-[#2f7a4a]">एक बार का भुगतान · कोई subscription नहीं</p>
          <button type="button" className="btn-gold mt-4" disabled={paying} onClick={onPay}>
            {paying ? "Payment खुल रहा है…" : <><Lock className="h-4 w-4" /> पूरी रिपोर्ट खोलें · ₹{report.price.rupees}</>}
          </button>
          <p className="ink-soft mt-2 flex items-center justify-center gap-1.5 text-[12px]"><ShieldCheck className="h-3.5 w-3.5" /> Razorpay से सुरक्षित · UPI, कार्ड · तुरंत खुलेगी</p>
        </section>
        <ErrorNote message={error} />

        <section className="pt-6">
          <SectionHead title="अक्सर पूछे जाने वाले सवाल" />
          <Faq
            items={[
              { q: "यह कैसे निकाला जाता है?", a: "आपकी जन्म तिथि, समय और स्थान से ग्रहों की स्थिति निकाली जाती है (लाहिड़ी अयनांश)। फिर सातवाँ भाव, उसके स्वामी, विंशोत्तरी दशा और गुरु के गोचर से शादी का समय और जीवनसाथी के संकेत देखे जाते हैं।" },
              { q: "क्या यह पक्का है?", a: "ज्योतिष योग और संभावना बताता है, गारंटी नहीं। इस रिपोर्ट को मार्गदर्शन की तरह लें।" },
              { q: "भुगतान के बाद रिपोर्ट कहाँ मिलेगी?", a: "भुगतान होते ही इसी पेज पर पूरी रिपोर्ट खुल जाती है। इसी फ़ोन पर यह लिंक दोबारा खोलकर आप इसे कभी भी देख सकते हैं।" },
            ]}
          />
        </section>
      </div>
      <AstroFooter />
      <PayBar price={report.price} label="पूरी रिपोर्ट खोलें" sub="Razorpay से सुरक्षित · UPI, कार्ड · तुरंत खुलेगी" busy={paying} onPay={onPay} />
    </>
  );
}
