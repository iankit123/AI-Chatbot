import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Clock, Lock, MessageCircle, X } from "lucide-react";
import type { AppEventName } from "@shared/appEvents";
import { EditorialShell, TrustLine } from "@/components/astro/editorial";
import { ErrorNote, Segmented } from "@/components/astro/ui";
import { logAppEventToServer } from "@/lib/logAppEvent";

/**
 * /tayari: a free 7-question quiz for sarkari exam aspirants. It is a demand test: we learn
 * which exam, weak subject, time budget and pains people have, then show three ₹49 offers.
 * Nothing is sold. Tapping an offer says "coming soon, no money taken" and asks for a
 * WhatsApp number. Every answer is logged to app_events (see shared/appEvents.ts).
 */
export default function TayariPage() {
  useEffect(() => {
    document.title = "FREE Taiyari Test · Sarkari exam study plan | puchlo.in";
  }, []);
  return (
    <EditorialShell theme="tayari">
      <Quiz />
    </EditorialShell>
  );
}

const HERO_IMG = "/tayari/hero.webp";
const PRICE = 49;

type Exam = "ssc-gd" | "ssc-cgl" | "railway" | "police" | "army" | "teacher" | "bank" | "pcs" | "state" | "undecided";
type Subject = "maths" | "reasoning" | "english" | "gk" | "current" | "hindi" | "computer";
type Work = "fulltime" | "parttime" | "none";
type Hours = "lt1" | "1to3" | "3plus";
type Method = "coaching" | "youtube" | "app" | "books" | "notstarted";
type Attempts = "first" | "1to2" | "3plus";

type Answers = { exams: Exam[]; weak?: Subject; work?: Work; hours?: Hours; method?: Method; attempts?: Attempts; pain: string };

const EXAMS: { value: Exam; label: string; headline: string }[] = [
  { value: "ssc-gd", label: "SSC GD", headline: "SSC GD" },
  { value: "ssc-cgl", label: "SSC CGL / CHSL", headline: "SSC CGL / CHSL" },
  { value: "railway", label: "Railway", headline: "Railway" },
  { value: "police", label: "Police", headline: "Police bharti" },
  { value: "army", label: "Army / Agniveer", headline: "Army / Agniveer" },
  { value: "teacher", label: "Teacher (TET)", headline: "Teacher (TET)" },
  { value: "bank", label: "Bank", headline: "Bank exam" },
  { value: "pcs", label: "PCS / UPSC", headline: "PCS / UPSC" },
  { value: "state", label: "State exams (Patwari, VDO…)", headline: "State exam" },
  { value: "undecided", label: "Abhi decide nahi kiya", headline: "Sarkari exam" },
];

const SUBJECTS: Record<Subject, { name: string; learn: string; practice: string; tip: string }> = {
  maths: {
    name: "Maths",
    learn: "Percentage ki buniyaad: 1/2 se 1/20 tak ke fraction ko percent me badalna yaad karein",
    practice: "Percentage ke 15 sawal, bina calculator",
    tip: "Maths me formula yaad karne se zyada roz ki practice kaam aati hai: roz 15 sawal, bina calculator.",
  },
  reasoning: {
    name: "Reasoning",
    learn: "Coding-decoding ke 5 tarah ke pattern samjhein",
    practice: "Coding-decoding ke 15 sawal, ghadi lagakar",
    tip: "Reasoning sabse jaldi sudharne wala subject hai: pattern pehchaniye aur roz 15 sawal ghadi lagakar kijiye.",
  },
  english: {
    name: "English",
    learn: "20 naye shabd (synonyms): likhein, bolein, har shabd se ek line banayein",
    practice: "Pichhle saal ke 10 sawal: synonyms, antonyms, idioms",
    tip: "English me sabse tez sudhaar shabdon se aata hai: roz 20 shabd, yaani 60 din me 1,200 shabd.",
  },
  gk: {
    name: "GK / GS",
    learn: "Rajya aur unki rajdhaniyan: ek page ke notes banayein",
    practice: "Static GK ke 20 MCQ",
    tip: "GK me sab kuch yaad nahi ho sakta. Pichhle saal ke sawal dekhiye, pata chalega kya baar-baar poocha jaata hai.",
  },
  current: {
    name: "Current affairs",
    learn: "Pichhle 7 din ki 10 badi khabrein, har khabar ek line me",
    practice: "Current affairs ke 15 MCQ",
    tip: "Current affairs roz 15 minute, har hafte ek baar dohrayein. Mahine ke aakhir me ek saath padhna bhaari padta hai.",
  },
  hindi: {
    name: "Hindi",
    learn: "Sandhi ke niyam, 10 udaharan likhkar",
    practice: "Hindi vyakaran ke 15 sawal",
    tip: "Hindi vyakaran ke niyam ginti ke hain. Roz 10 udaharan likhne se pakke ho jaate hain.",
  },
  computer: {
    name: "Computer",
    learn: "Computer ke mukhya hisse aur 15 zaroori shortcut",
    practice: "Computer awareness ke 15 MCQ",
    tip: "Computer ke zyada-tar sawal basic hote hain. Ek chhoti list banaiye aur roz dohraiye.",
  },
};

type SingleKey = "weak" | "work" | "hours" | "method" | "attempts";
const SINGLE: Record<SingleKey, { title: string; sub?: string; cols: number; options: { value: string; label: string }[] }> = {
  weak: {
    title: "Sabse kamzor subject kaunsa hai?",
    sub: "Jisme sabse kam number aate hain",
    cols: 2,
    options: (Object.keys(SUBJECTS) as Subject[]).map((k) => ({ value: k, label: SUBJECTS[k].name })),
  },
  work: {
    title: "Kya saath me job ya kaam karte hain?",
    cols: 1,
    options: [
      { value: "fulltime", label: "Haan, full-time job" },
      { value: "parttime", label: "Part-time kaam" },
      { value: "none", label: "Nahi, sirf padhai" },
    ],
  },
  hours: {
    title: "Roz padhai ke liye kitna time milta hai?",
    cols: 1,
    options: [
      { value: "lt1", label: "1 ghante se kam" },
      { value: "1to3", label: "1 se 3 ghante" },
      { value: "3plus", label: "3 ghante se zyada" },
    ],
  },
  method: {
    title: "Taiyari kaise kar rahe hain?",
    sub: "Jo sabse zyada karte hain",
    cols: 1,
    options: [
      { value: "coaching", label: "Coaching jaata / jaati hoon" },
      { value: "youtube", label: "YouTube se" },
      { value: "app", label: "App se (Testbook, Adda247…)" },
      { value: "books", label: "Sirf kitaabon se" },
      { value: "notstarted", label: "Abhi shuru nahi ki" },
    ],
  },
  attempts: {
    title: "Kitne attempt de chuke hain?",
    cols: 1,
    options: [
      { value: "first", label: "Pehli baar de raha / rahi hoon" },
      { value: "1to2", label: "1–2 attempt" },
      { value: "3plus", label: "3 ya zyada" },
    ],
  },
};

const STEPS = ["exam", "weak", "work", "hours", "method", "attempts", "pain"] as const;
type StepKey = (typeof STEPS)[number];

// ---------------------------------------------------------------- URL context and logging

function params(): URLSearchParams {
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return new URLSearchParams();
  }
}

function newRunId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function examLabel(e: Exam | undefined): string {
  return EXAMS.find((x) => x.value === e)?.headline ?? "Sarkari exam";
}

/**
 * Landing copy, picked by ?h= so each ad lands on its own headline (logged as properties.h).
 * job / weak / exam / attempt / english match the ads in marketing/tayari-ad.
 */
function heroCopy(h: string, exam: Exam | undefined): { title: string; tag: string } {
  switch (h) {
    case "job":
      return { title: "Job ke saath sarkari exam ki taiyari?", tag: "Roz jitna time milta hai, usi hisaab se FREE study plan" };
    case "weak":
      return { title: "Aapka sabse kamzor subject kaunsa hai?", tag: "1 minute ka FREE test, aur usi subject ka aaj ka plan" };
    case "exam":
      return { title: `${examLabel(exam)} ki taiyari?`, tag: "1 minute me apna FREE study plan banaiye" };
    case "attempt":
      return { title: "2–3 attempt ke baad bhi selection nahi?", tag: "7 sawal ka FREE test: jaaniye kahan chook ho rahi hai" };
    case "english":
      return { title: "English ki wajah se marks kat rahe hain?", tag: "Hindi medium walon ke liye FREE study plan" };
    default:
      return { title: "Sarkari exam ki taiyari kar rahe hain?", tag: "1 minute ka FREE test, aur aapke liye aaj ka study plan" };
  }
}

function useTayariLog() {
  const ctx = useRef<{ run: string; h: string; ad: string | null; campaign: string | null; source: string | null; exam_param: string | null } | null>(null);
  if (!ctx.current) {
    const p = params();
    ctx.current = {
      run: newRunId(),
      h: p.get("h")?.toLowerCase() || "a",
      ad: p.get("utm_content"),
      campaign: p.get("utm_campaign"),
      source: p.get("utm_source"),
      exam_param: p.get("exam"),
    };
  }
  const c = ctx.current;
  return {
    ctx: c,
    /** Server log always; `pixel` also sends a Meta custom event (never with free text or phone). */
    log(event: AppEventName, props: Record<string, unknown>, opts?: { pixel?: Record<string, unknown>; phone?: string }) {
      if (opts?.pixel) {
        try {
          window.fbq?.("trackCustom", event, { h: c.h, ...opts.pixel });
        } catch {
          /* analytics must never block the page */
        }
      }
      logAppEventToServer(event, { run: c.run, h: c.h, ad: c.ad, campaign: c.campaign, source: c.source, ...props }, undefined, opts?.phone);
    },
  };
}

// ---------------------------------------------------------------- plan and observations (rule-based, no AI)

type Block = { minutes: number; title: string; text: string };

function dayOnePlan(a: Answers): Block[] {
  const s = SUBJECTS[a.weak ?? "maths"];
  const second = a.weak === "gk" || a.weak === "current" ? "Reasoning ke 15 sawal" : "GK / Current affairs ke 15 sawal";
  const learn = (m: number): Block => ({ minutes: m, title: `${s.name}: naya padhein`, text: s.learn });
  const practice = (m: number): Block => ({ minutes: m, title: `${s.name}: practice`, text: s.practice });
  const other = (m: number): Block => ({ minutes: m, title: "Doosra subject", text: `${second}, taaki baaki subject peechhe na chhootein` });
  const mock = (m: number): Block => ({ minutes: m, title: "Chhota mock test", text: "25 mixed sawal, 20 minute me. Score copy me likh lein." });
  const review = (m: number): Block => ({ minutes: m, title: "Galti ki copy", text: "Aaj jo sawal galat hue, unhe ek alag copy me sahi tareeke ke saath likhein." });

  const blocks =
    a.hours === "3plus"
      ? [learn(40), practice(45), other(45), mock(30), review(20)]
      : a.hours === "1to3"
        ? [learn(25), practice(30), other(25), review(10)]
        : [learn(15), practice(20), review(10)];
  if (a.exams.includes("police") || a.exams.includes("army")) {
    blocks.unshift({ minutes: 20, title: "Subah: daud aur stretching", text: "Halki daud se shuruaat. Physical ki taiyari pehle din se." });
  }
  return blocks;
}

function observations(a: Answers): string[] {
  const out: string[] = [];
  if (a.attempts === "3plus") out.push("Aap 3 ya zyada attempt de chuke hain. Is stage par naya padhne se zyada fayda purane galat sawal dobara karne se hota hai.");
  else if (a.attempts === "1to2") out.push("Pichhle attempt ka score dekhiye: jis section me sabse kam number aaye, wahi asli kamzori hai. Plan usi se shuru hota hai.");

  const working = a.work === "fulltime" || a.work === "parttime";
  if (working && a.hours === "lt1") out.push("Job ke saath roz 45 minute, bina naaga, kabhi-kabhi ke 4 ghante se zyada kaam aate hain.");
  else if (working) out.push("Job ke saath padhai me sabse badi cheez hai roz ek tay samay. Har din usi waqt padhiye, aadat ban jaayegi.");
  else if (a.hours === "3plus") out.push("Aapke paas time hai. Use teen hisson me baantiye: subah naya topic, dopahar practice, shaam revision.");
  else if (a.hours === "lt1") out.push("Sirf padhai kar rahe hain to dheere-dheere roz 3 ghante tak pahunchiye. Shuruaat 1 ghante se bhi theek hai.");

  if (a.method === "youtube") out.push("YouTube par ek hi teacher ki ek playlist chuniye aur use poora kijiye. Baar-baar channel badalne se time jaata hai.");
  else if (a.method === "app") out.push("Mock test ke baad galat sawalon ki list banaiye. Asli sudhaar wahin se aata hai, sirf score dekhne se nahi.");
  else if (a.method === "notstarted") out.push("Shuruaat ka sabse aasaan tareeka: pichhle saal ka ek paper dekhiye, taaki pata chale exam me kya aata hai.");
  else if (a.method === "books") out.push("Kitaab ke saath pichhle saal ke paper zaroor kijiye, taaki pata chale kya baar-baar aata hai.");
  else if (a.method === "coaching") out.push("Coaching ke baad usi din 30 minute khud dohraiye, warna aadha agle din tak bhool jaata hai.");

  if (a.weak) out.push(SUBJECTS[a.weak].tip);
  return out.slice(0, 3);
}

// ---------------------------------------------------------------- the quiz

function Quiz() {
  const { ctx, log } = useTayariLog();
  const examParam = EXAMS.some((e) => e.value === ctx.exam_param) ? (ctx.exam_param as Exam) : undefined;
  const hero = heroCopy(ctx.h, examParam);

  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"quiz" | "making" | "result">("quiz");
  const [answers, setAnswers] = useState<Answers>({ exams: examParam ? [examParam] : [], pain: "" });
  const [heroOk, setHeroOk] = useState(true);

  useEffect(() => {
    log("tayari_landing", { exam_param: ctx.exam_param });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step > 0 || phase !== "quiz") window.scrollTo({ top: 0 });
  }, [step, phase]);

  const key: StepKey = STEPS[step];

  const commit = (k: StepKey, value: unknown, next: Answers) => {
    log("tayari_step", { step: k, n: step + 1, value });
    if (k === "pain") return finish(next);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const pickSingle = (k: SingleKey, value: string) => {
    const next = { ...answers, [k]: value } as Answers;
    setAnswers(next);
    window.setTimeout(() => commit(k, value, next), 170);
  };

  const finish = (a: Answers) => {
    setPhase("making");
    const summary = { exams: a.exams, weak: a.weak, work: a.work, hours: a.hours, method: a.method, attempts: a.attempts };
    log("tayari_completed", { ...summary, pain: a.pain.trim().slice(0, 500), exam_param: ctx.exam_param }, { pixel: summary });
    window.setTimeout(() => setPhase("result"), 2600);
  };

  if (phase === "making") return <Making />;
  if (phase === "result") return <Result answers={answers} log={log} />;

  const card = (
    <div className="paper rise p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep((s) => s - 1)} className="ink-soft -ml-1 inline-flex items-center gap-1 text-[13px]">
            <ArrowLeft className="h-4 w-4" /> Pichhla
          </button>
        ) : (
          <span className="ink-soft text-[12px] font-semibold uppercase tracking-[0.14em]">FREE test</span>
        )}
        <span className="ink-soft text-[12.5px]">Sawal {step + 1} / {STEPS.length}</span>
      </div>
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-[#e9e4dc]">
        <div className="h-full rounded-full bg-[var(--ed-accent)] transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>

      {key === "exam" && (
        <ExamStep
          value={answers.exams}
          onChange={(exams) => setAnswers((a) => ({ ...a, exams }))}
          onNext={() => commit("exam", answers.exams, answers)}
        />
      )}
      {key !== "exam" && key !== "pain" && (
        <div key={key}>
          <QuestionHead title={SINGLE[key].title} sub={SINGLE[key].sub} />
          <Segmented cols={SINGLE[key].cols} value={(answers[key] as string | undefined) ?? ""} onChange={(v) => pickSingle(key, v)} options={SINGLE[key].options} />
        </div>
      )}
      {key === "pain" && (
        <PainStep
          value={answers.pain}
          onChange={(pain) => setAnswers((a) => ({ ...a, pain }))}
          onNext={(pain) => commit("pain", pain ? "written" : "skipped", { ...answers, pain })}
        />
      )}
    </div>
  );

  if (step > 0) return <div className="pt-16">{card}</div>;

  return (
    <>
      <section className="relative">
        <div className="relative -mx-4 overflow-hidden">
          {heroOk ? (
            <img src={HERO_IMG} alt="Raat me lamp ki roshni me padhai karta ek yuva" width={768} height={1152} decoding="async" onError={() => setHeroOk(false)} className="block aspect-[4/3] w-full object-cover" style={{ objectPosition: "50% 30%" }} />
          ) : (
            <div className="aspect-[4/3] w-full bg-[radial-gradient(420px_300px_at_78%_22%,rgba(245,181,68,0.35),transparent_65%),linear-gradient(180deg,#18213a,#0c111d)]" aria-hidden />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(8,10,18,0.55)] via-transparent via-35% to-[var(--ed-bg)]" />
          <div className="rise absolute inset-x-0 bottom-0 px-4 pb-4">
            <span className="inline-block rounded-full bg-[var(--ed-accent)] px-3 py-1 text-[12px] font-bold tracking-wide text-[var(--ed-accent-ink)]">100% FREE</span>
            <h1 className="mt-2.5 text-[2rem] font-bold leading-[1.15] text-[var(--ed-text)] [text-shadow:0_2px_20px_rgba(0,0,0,0.6)] [text-wrap:balance]" style={{ fontFamily: "Poppins, system-ui, sans-serif", letterSpacing: 0 }}>
              {hero.title}
            </h1>
            <p className="mt-2 max-w-[330px] text-[15px] font-medium leading-snug text-[var(--ed-text)] [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">{hero.tag}</p>
          </div>
        </div>
        <TrustLine items={["1 minute, 7 sawal", "Login nahi chahiye", "Hindi me plan"]} />
      </section>
      <div className="pt-5">{card}</div>
      <Footer />
    </>
  );
}

function QuestionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-4">
      <p className="ink text-[18px] font-semibold leading-snug">{title}</p>
      {sub && <p className="ink-soft mt-1 text-[13px]">{sub}</p>}
    </div>
  );
}

function ExamStep({ value, onChange, onNext }: { value: Exam[]; onChange: (v: Exam[]) => void; onNext: () => void }) {
  const toggle = (e: Exam) => {
    if (e === "undecided") return onChange(value.includes("undecided") ? [] : ["undecided"]);
    const rest = value.filter((x) => x !== "undecided");
    onChange(rest.includes(e) ? rest.filter((x) => x !== e) : [...rest, e]);
  };
  return (
    <div>
      <QuestionHead title="Kaunse exam ki taiyari kar rahe hain?" sub="Ek se zyada chun sakte hain" />
      <div className="seg" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        {EXAMS.map((e) => (
          <button key={e.value} type="button" aria-pressed={value.includes(e.value)} onClick={() => toggle(e.value)} className={e.value === "undecided" || e.value === "state" ? "col-span-2" : ""}>
            {e.label}
          </button>
        ))}
      </div>
      <button type="button" className="btn-gold mt-5" disabled={value.length === 0} onClick={onNext}>
        Aage <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function PainStep({ value, onChange, onNext }: { value: string; onChange: (v: string) => void; onNext: (pain: string) => void }) {
  return (
    <div>
      <QuestionHead title="Taiyari me sabse badi pareshani kya hai?" sub="Apne shabdon me likhiye. Hindi ya English, jaise aasaan ho." />
      <textarea
        className="field !h-28 resize-none py-3 leading-relaxed"
        maxLength={500}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Jaise: job ke baad thak jaata hoon, maths samajh nahi aata, coaching ke paise nahi hain…"
      />
      <button type="button" className="btn-gold mt-4" onClick={() => onNext(value.trim())}>
        Mera FREE plan dekhein <ArrowRight className="h-4 w-4" />
      </button>
      {!value.trim() && (
        <button type="button" className="ink-soft mt-3 block w-full text-center text-[13px] underline underline-offset-4" onClick={() => onNext("")}>
          Chhod kar plan dekhein
        </button>
      )}
    </div>
  );
}

function Making() {
  const steps = ["Aapke jawab dekhe ja rahe hain", "Kamzor subject ka plan", "Aaj ka time-table"];
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 850);
    return () => window.clearInterval(t);
  }, [steps.length]);
  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center text-center">
      <div className="h-14 w-14 animate-spin rounded-full border-4 border-[var(--ed-line)] border-t-[var(--ed-accent)]" aria-hidden />
      <h2 className="mt-7 text-[1.4rem] text-[var(--ed-text)]">Aapka plan ban raha hai</h2>
      <ul className="mt-5 w-full max-w-[270px] space-y-3 text-left text-[14px]">
        {steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i <= active ? "opacity-100" : "opacity-30"}`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${i < active ? "border-[var(--ed-accent)] bg-[var(--ed-accent)] text-[var(--ed-accent-ink)]" : "border-[var(--ed-accent)]"}`}>
              {i < active && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="text-[var(--ed-text)]">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- result + "coming soon" offers

type Log = ReturnType<typeof useTayariLog>["log"];

function Result({ answers: a, log }: { answers: Answers; log: Log }) {
  const plan = dayOnePlan(a);
  const total = plan.reduce((n, b) => n + b.minutes, 0);
  const notes = observations(a);
  const weakName = SUBJECTS[a.weak ?? "maths"].name;
  const exam = a.exams.find((e) => e !== "undecided");
  const examName = exam ? examLabel(exam) : "Aapke exam";
  const hoursLabel = SINGLE.hours.options.find((o) => o.value === a.hours)?.label;

  const offers = [
    { id: "plan7", title: "7 din ka poora plan", text: `Din 2 se 7 tak roz kya padhna hai, ${weakName} par khaas dhyan, har din ki checklist.` },
    { id: "plan30", title: "30 din ka plan", text: `${examName} ke liye poora mahina: har hafte ek revision test aur galti ki copy.` },
    { id: "flashcards", title: `${weakName} flashcards`, text: "Roz 20 card, pichhle saal ke sawalon se. Jo bhool gaye, woh dobara saamne aayenge." },
  ];

  const [sheet, setSheet] = useState<{ id: string; title: string } | null>(null);
  const [clicked, setClicked] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const tapOffer = (o: { id: string; title: string }) => {
    const order = clicked.length + 1;
    setClicked((c) => (c.includes(o.id) ? c : [...c, o.id]));
    log("tayari_offer_click", { offer: o.id, price: PRICE, order, weak: a.weak, exams: a.exams }, { pixel: { offer: o.id, price: PRICE } });
    setSheet(o);
  };

  return (
    <div className="pt-16">
      <section className="rise">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ed-accent)]">Aapka FREE plan taiyaar hai</p>
        <h1 className="mt-1.5 text-[1.9rem] font-bold leading-tight text-[var(--ed-text)]" style={{ fontFamily: "Poppins, system-ui, sans-serif", letterSpacing: 0 }}>
          Aaj ka study plan
        </h1>
        <div className="mt-3 flex flex-wrap gap-2 text-[12.5px]">
          {a.exams.map((e) => (
            <span key={e} className="chip rounded-full border px-3 py-1">{EXAMS.find((x) => x.value === e)?.label}</span>
          ))}
          <span className="chip rounded-full border px-3 py-1">Kamzor: {weakName}</span>
          {hoursLabel && <span className="chip rounded-full border px-3 py-1">Roz: {hoursLabel}</span>}
        </div>
      </section>

      {notes.length > 0 && (
        <section className="paper mt-6 p-5">
          <p className="ink-soft text-[11px] font-semibold uppercase tracking-[0.16em]">Aapke jawabon se</p>
          <ul className="mt-3 space-y-3">
            {notes.map((t) => (
              <li key={t} className="ink flex gap-3 text-[14.5px] leading-relaxed">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ed-accent)]" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="paper mt-4 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="ink text-[18px] font-semibold">Din 1</p>
          <p className="ink-soft inline-flex items-center gap-1 text-[13px]"><Clock className="h-3.5 w-3.5" /> {total} minute</p>
        </div>
        <ol className="mt-3 divide-y divide-[#ece6dd]">
          {plan.map((b, i) => (
            <li key={b.title} className="flex gap-3 py-3">
              <span className="w-12 shrink-0 pt-0.5 text-[13px] font-semibold text-[#b07a12]">{b.minutes} min</span>
              <span>
                <span className="ink block text-[15px] font-medium">{i + 1}. {b.title}</span>
                <span className="ink-soft mt-0.5 block text-[13.5px] leading-relaxed">{b.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="ink-soft mt-2 rounded-xl bg-[#f6f1ea] px-3 py-2 text-[12.5px]">Is plan ka screenshot le lijiye, aaj isi se shuruaat kijiye.</p>
      </section>

      <section className="paper mt-4 p-5">
        <p className="ink text-[16px] font-semibold">Din 2 se 7</p>
        <div className="relative mt-3">
          <ul className="blur-lock space-y-2 text-[14px]">
            <li className="ink">Din 2: {weakName}, agla topic aur kal ka revision</li>
            <li className="ink">Din 3: Practice set aur galti ki copy</li>
            <li className="ink">Din 4: Doosre subject ka din</li>
            <li className="ink">Din 5–7: Mock test aur revision</li>
          </ul>
          <div className="absolute inset-0 grid place-items-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--ink)] text-white shadow-lg"><Lock className="h-4 w-4" /></span>
          </div>
        </div>
      </section>

      <section className="pt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ed-accent)]">Aage ki taiyari</p>
        <h2 className="mt-1.5 text-[1.5rem] font-bold leading-snug text-[var(--ed-text)]" style={{ fontFamily: "Poppins, system-ui, sans-serif", letterSpacing: 0 }}>Aapko inme se kya chahiye?</h2>
        <p className="mt-1.5 text-[14px] leading-relaxed text-[var(--ed-muted)]">Aapke jawabon ke hisaab se, {examName} aur {weakName} ke liye.</p>
        <ul className="mt-5 space-y-3">
          {offers.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => tapOffer(o)} className="glass flex w-full items-center gap-4 p-4 text-left">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-[var(--ed-text)]">{o.title}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-[var(--ed-muted)]">{o.text}</span>
                </span>
                <span className="shrink-0 rounded-full bg-[var(--ed-accent)] px-3.5 py-2 text-[14px] font-bold text-[var(--ed-accent-ink)]">
                  {clicked.includes(o.id) ? <Check className="h-4 w-4" strokeWidth={3} /> : `₹${PRICE}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <Footer />
      {sheet && (
        <WaitlistSheet
          offer={sheet}
          saved={saved}
          onClose={(how) => {
            if (!saved && how === "dismiss") log("tayari_step", { step: "waitlist", value: "dismissed", offer: sheet.id });
            setSheet(null);
          }}
          onSave={(phone) => {
            setSaved(true);
            log("tayari_lead", { offer: sheet.id, offers: clicked, weak: a.weak, exams: a.exams }, { phone, pixel: { offer: sheet.id } });
            try {
              window.fbq?.("track", "Lead", { content_name: `tayari_${sheet.id}` });
            } catch {
              /* ignore */
            }
          }}
        />
      )}
    </div>
  );
}

function WaitlistSheet({ offer, saved, onClose, onSave }: { offer: { id: string; title: string }; saved: boolean; onClose: (how: "dismiss" | "done") => void; onSave: (phone: string) => void }) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    let digits = phone.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (!/^[6-9]\d{9}$/.test(digits)) return setError("Sahi 10 ank ka mobile number daaliye.");
    setError(null);
    onSave(digits);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" role="dialog" aria-modal="true" onClick={() => onClose("dismiss")}>
      <div className="paper rise relative w-full max-w-md rounded-b-none p-5 pb-[max(20px,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <button type="button" aria-label="Band karein" className="ink-soft absolute right-4 top-4" onClick={() => onClose(saved ? "done" : "dismiss")}>
          <X className="h-5 w-5" />
        </button>
        {saved ? (
          <div className="py-4 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e8f5e9] text-[#2e7d32]"><Check className="h-6 w-6" strokeWidth={3} /></span>
            <p className="ink mt-3 text-[18px] font-semibold">Ho gaya!</p>
            <p className="ink-soft mt-1 text-[14px] leading-relaxed">"{offer.title}" taiyaar hote hi aapko WhatsApp par message aayega. Tab tak aaj ka plan shuru kijiye.</p>
            <button type="button" className="btn-gold mt-5" onClick={() => onClose("done")}>Theek hai</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b07a12]">Jald aa raha hai</p>
            <p className="ink mt-1.5 pr-6 text-[19px] font-semibold leading-snug">"{offer.title}" abhi taiyaar ho raha hai</p>
            <p className="ink-soft mt-2 text-[14px] leading-relaxed">Aapse koi paisa nahi liya gaya hai. Jaise hi yeh taiyaar hoga, hum aapko WhatsApp par bata denge.</p>
            <label htmlFor="ty-phone" className="label mt-4">WhatsApp number</label>
            <input id="ty-phone" className="field" type="tel" inputMode="numeric" autoComplete="tel" placeholder="10 ank ka number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <div className="mt-3"><ErrorNote message={error} /></div>
            <button type="submit" className="btn-gold mt-3">
              <MessageCircle className="h-4 w-4" /> Haan, WhatsApp par bata dena
            </button>
            <p className="ink-soft mt-2 text-center text-[11.5px]">Sirf launch ki khabar ke liye. Koi spam nahi.</p>
            <button type="button" className="ink-soft mt-2 block w-full text-center text-[13px] underline underline-offset-4" onClick={() => onClose("dismiss")}>
              Nahi, rehne dijiye
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-12 text-center text-[11px] leading-relaxed text-[var(--ed-muted)]">
      <div className="mb-5 h-px bg-[var(--ed-line)]" />
      <p>
        Yeh puchlo.in ka ek free study tool hai. Yeh kisi sarkari vibhag ya exam board se juda nahi hai.
        Exam ki tareekh aur yogyata ki jaankari sirf official notification se lein.
      </p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}
