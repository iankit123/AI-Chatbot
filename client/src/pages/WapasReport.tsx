import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowRight, Lock, MessageCircleHeart } from "lucide-react";
import {
  Analysing, AstroFooter, Bullets, ErrorNote, Faq, LevelMeter, LockedRow, PaperCard, PayBar,
  ScoreRing, Segmented, ZodiacWheel,
} from "@/components/astro/ui";
import {
  EditorialShell, FactorList, NumberedList, PhotoHero, ReflectionCard, ReportBanner, SectionHead, StepHead, TrustLine,
} from "@/components/astro/editorial";
import { PartnerFields, SelfFields, usePartnerForm, useSelfForm } from "@/components/astro/forms";
import { useAstroReport, useReadTracking } from "@/components/astro/useReport";
import { BirthDetailsCard, AskMoreCard, BuyerPhoneGate, PaidReportBanner } from "@/components/astro/paid";
import { WapasQuizPaywall } from "@/components/astro/quizPaywalls";
import { QuizLanding } from "@/components/astro/quizFlow";
import {
  cacheReport, createWapasPreview, lastReportId, logAstro, rememberReport, saveSelf, trackAstro, wait, wapasFlow,
  type WapasReport, type WapasStatus,
} from "@/lib/astroApi";

export default function WapasReportPage() {
  const [, params] = useRoute("/wapas/r/:id");
  // Wapas quiz test (WAPAS_QUIZ): half get the quiz flow (₹29 by day, ₹99 at night in India), half the classic page.
  const flow = useRef(wapasFlow()).current;
  useEffect(() => {
    document.title = "Kya aapka Ex wapas aayega? | puchlo.in";
  }, []);
  return (
    <EditorialShell theme="wapas">
      {params?.id ? <ReportView key={params.id} id={params.id} /> : flow === "classic" ? <Landing /> : <QuizLanding entry={flow} product="wapas" />}
    </EditorialShell>
  );
}

const HERO = "/astro/wapas-hero-couple.webp";

const STATUSES: { value: WapasStatus; label: string }[] = [
  { value: "no_contact", label: "Baat-cheet band hai" },
  { value: "breakup", label: "Breakup ho gaya hai" },
  { value: "fight", label: "Jhagda ya narazgi chal rahi hai" },
  { value: "separated", label: "Shaadi ke baad alag rah rahe hain" },
];

/**
 * Hero copy variants, picked with ?h=a|b|c|d|e so different ads can land on different
 * headlines. The variant is sent with the landing and form events for comparison.
 * a (default): the owner's line, as Astrotalk titles its posts ("Will my ex come back?",
 *   "How to know when will my ex come back"); sub-line covers "when" and "clarity, move forward".
 * b: Astrotalk's love-page banner, "what is on their mind" + "will they return".
 * c: timing, for people in no-contact or blocked ("kab contact hoga" in our chats).
 * d: names the behaviour first (the "you keep checking your phone" opener).
 * e: the original single question.
 */
type HeroVariant = { pre?: string; title: [string, string]; tag?: string; sub: string };
const HERO_VARIANTS: Record<string, HeroVariant> = {
  a: {
    title: ["क्या आपका Ex", "वापस आएगा?"],
    tag: "Jaaniye jawab, aapki aur Ex ki date of birth se",
    sub: "Kab aayega, aur unke mann me abhi kya hai, dono ki kundli se jaaniye. Saath me saaf jawab: intezaar karein ya aage badhein.",
  },
  b: {
    pre: "उनके मन में क्या चल रहा है?",
    title: ["क्या वो", "वापस आएंगे?"],
    sub: "Dono ki kundli milakar jaaniye unka mann, doori ki asli wajah, aur baat dobara kab ban sakti hai.",
  },
  c: {
    title: ["बात फिर से", "कब शुरू होगी?"],
    sub: "Baat-cheet band ho, block kiya ho, ya unhone 'thoda space' maanga ho. Dono ki kundli se jaaniye sahi samay, aur tab tak kya karein.",
  },
  d: {
    pre: "बार-बार उनका मैसेज देखते हैं?",
    title: ["क्या वो", "वापस आएंगे?"],
    sub: "Mann ka ek hissa intezaar karta hai, ek hissa thak chuka hai. Dono ki kundli se seedha jawab, aur aage ka raasta.",
  },
  e: {
    title: ["क्या वो", "वापस आएंगे?"],
    sub: "Dono ki kundli se jaaniye unke mann me kya hai, doori kyon aayi, aur baat dobara kab ban sakti hai.",
  },
};

function heroVariantKey(): string {
  try {
    const h = new URLSearchParams(window.location.search).get("h")?.toLowerCase() ?? "";
    return h in HERO_VARIANTS ? h : "a";
  } catch {
    return "a";
  }
}

/** What the report actually reads from the two charts (see buildWapasFacts / loveWindows). */
const FACTORS = [
  { img: "/astro/k-moon.webp", name: "Chandra rashi", en: "Moon", text: "Mann ka mel. Dono ki Chandra rashi aur nakshatra se dikhta hai ki dil aur soch kitni milti hai." },
  { img: "/astro/k-venus.webp", name: "Shukra aur prem bhaav", en: "Venus, 5th & 7th house", text: "Pyaar ka samay. Inki dasha me baat dobara banne ke yog sabse majboot hote hain." },
  { img: "/astro/k-door.webp", name: "36 gun milan", en: "Ashtakoot", text: "Rishte ki neev. Gana, Bhakoot aur Nadi batate hain ki takrav kahan hai." },
  { img: "/astro/k-saturn.webp", name: "Dasha ka daur", en: "Vimshottari", text: "Samay ka chakra. Abhi ki mahadasha batati hai ki yeh mushkil daur kab badlega." },
];

const REFLECT = [
  "Aap unhe yaad karte hain, ya unke saath ki aadat ko?",
  "Yeh sach me unki kami hai, ya akele rehne ka darr?",
  "Is rishte me khushi zyada thi, ya takleef?",
];

function Landing() {
  const [, navigate] = useLocation();
  const self = useSelfForm();
  const partner = usePartnerForm();
  const [status, setStatus] = useState<WapasStatus>("no_contact");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const last = useRef(lastReportId("wapas")).current;
  const heroKey = useRef(heroVariantKey()).current;
  const hero = HERO_VARIANTS[heroKey];

  useEffect(() => {
    trackAstro("astro_landing", "wapas", { flow: "classic", h: heroKey });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = self.error() ?? partner.error();
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    window.scrollTo({ top: 0 });
    const me = self.value();
    trackAstro("astro_form_submitted", "wapas", { flow: "classic", status, partner_dob: partner.knows === "yes", h: heroKey });
    try {
      const [report] = await Promise.all([createWapasPreview({ self: me, partner: partner.value(), status }), wait(5200)]);
      saveSelf(me);
      rememberReport("wapas", report.id);
      cacheReport(report);
      navigate(`/wapas/r/${report.id}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Kuch gadbad ho gayi. Dobara koshish karein.");
    }
  };

  if (busy) {
    return (
      <Analysing
        title="Dono kundliyon ko dekha ja raha hai"
        steps={["Dono ki Chandra rashi aur nakshatra", "Mann ka mel (Graha Maitri)", "Doori ki wajah", "Prem bhaav ki dasha", "Baat banne ka samay"]}
      />
    );
  }

  return (
    <>
      <PhotoHero
        src={HERO}
        alt="Shaam ki roshni me terrace par muskurate hue ek yuva jode ki tasveer"
        ornament={<ZodiacWheel size={250} className="absolute -right-16 top-10 opacity-[0.32]" />}
        kicker="Prem Jyotish · Kundli milan"
        title={
          <>
            {hero.pre && <span className="mb-2 block text-[1.4rem] leading-snug text-[var(--ed-accent)]">{hero.pre}</span>}
            {hero.title[0]}
            <br />
            {hero.title[1]}
          </>
        }
        tagline={hero.tag}
        sub={hero.sub}
        position="50% 0%"
      >
        <button type="button" className="btn-gold mt-6" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          Check kariye <ArrowRight className="h-4 w-4" />
        </button>
        <TrustLine items={["Unhe pata nahi chalega", "Sirf naam se bhi", "Koi vashikaran nahi"]} />
        {last && (
          <Link href={`/wapas/r/${last}`} className="mt-3 inline-block text-[13px] text-[var(--ed-accent)] underline underline-offset-4">
            Pichhli report dobara kholein
          </Link>
        )}
      </PhotoHero>

      <div className="mt-8"><PaidReportBanner type="wapas" /></div>

      <div ref={formRef} className="scroll-mt-4 pt-10">
        <form onSubmit={submit} noValidate className="paper rise space-y-6 p-5">
          <div>
            <StepHead n={1} title="Abhi kya sthiti hai?" />
            <Segmented cols={1} value={status} onChange={setStatus} options={STATUSES} />
          </div>
          <div className="border-t border-[#ece2da] pt-6">
            <StepHead n={2} title="Aapki kundli" sub="Janm ki jaankari, jitni pata ho" />
            <SelfFields form={self} id="wp" />
          </div>
          <div className="border-t border-[#ece2da] pt-6">
            <StepHead n={3} title="Unki kundli" sub="Janm tithi na pata ho to sirf naam bhi chalega" />
            <PartnerFields form={partner} id="wp" />
          </div>
          <ErrorNote message={error} />
          <div>
            <button type="submit" className="btn-gold">
              <MessageCircleHeart className="h-4 w-4" /> Mera jawab dekhein
            </button>
            <p className="ink-soft mt-2 text-center text-[12px]">Dono ka judaav (36 me se gun) turant dikhega.</p>
          </div>
        </form>
      </div>

      <section className="pt-14">
        <SectionHead
          kicker="Kundli me kya dekha jaata hai"
          title="Jawab andaaze se nahi, dono kundliyon se"
          sub="Aapki aur unki janm kundli ko saath rakhkar yeh chaar baatein dekhi jaati hain."
        />
        <FactorList items={FACTORS} />
      </section>

      <section className="pt-14">
        <SectionHead kicker="Poori report" title="Report me kya milega" />
        <NumberedList
          items={[
            { title: "Wapsi ke sanket", text: "Prabal, madhyam ya kam. Seedha aur imaandar jawab." },
            { title: "Unke mann me kya hai", text: "Kya woh bhi yaad karte hain, ya aage badh chuke hain." },
            { title: "Doori ki asli wajah", text: "Dono ki kundli me kahan takrav hai, taaki wahi galti dobara na ho." },
            { title: "Pehal karein ya intezaar", text: "Baat kab banne ke yog hain, aur abhi kya karein, kya na karein." },
          ]}
        />
      </section>

      <section className="pt-14">
        <ReflectionCard
          title="Faisla lene se pehle, khud se poochhiye"
          questions={REFLECT}
          footer="Jawab jo bhi ho, yeh report aapko tay karne me madad karti hai ki intezaar karein ya aage badhein."
        />
      </section>

      <section className="pt-14">
        <SectionHead title="Aksar puche jaane wale sawal" />
        <Faq
          items={[
            { q: "Kya unhe pata chalega?", a: "Nahi. Yeh report sirf aap dekhte hain. Unhe koi sandesh ya soochna nahi jaati." },
            { q: "Unki janm tithi nahi pata, to?", a: "Sirf naam se bhi report ban jaati hai. Naam ke pehle akshar se naam-rashi nikali jaati hai. Janm tithi ho to jawab zyada sateek hota hai." },
            { q: "Kya yeh pakka batata hai ki woh wapas aayenge?", a: "Nahi. Jyotish sanket aur sahi samay batata hai, guarantee nahi. Yeh report aapko samajhdari se kadam uthane me madad karti hai." },
            { q: "Kya isme vashikaran ya totka hai?", a: "Bilkul nahi. Kisi ko control karne ka koi tareeka yahan nahi hai. Sirf kundli milan, samay aur saral, saatvik upay hain." },
          ]}
        />
      </section>
      <AstroFooter />
    </>
  );
}

function ReportView({ id }: { id: string }) {
  const { report, error, paying, unlocking, pay, reload } = useAstroReport<WapasReport>(id, "wapas");
  useReadTracking(report);
  // Made in the quiz flow (SHAADI_QUIZ test): its own paywall at ₹99. Paid reports look the same as ever.
  if (report?.flow === "quiz" && !report.paid && !unlocking) return <WapasQuizPaywall report={report} error={error} paying={paying} onPay={pay} />;

  if (unlocking) return <Analysing title="Aapka poora jawab khul raha hai" steps={["Payment ki pushti", "Wapsi ke sanket", "Unke mann ki sthiti", "Sahi samay"]} />;
  if (!report) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        {error ? (
          <div>
            <p className="text-[#eadff5]">{error}</p>
            <Link href="/wapas" className="btn-ghost mt-4">Nayi report banayein</Link>
          </div>
        ) : (
          <ZodiacWheel size={150} />
        )}
      </div>
    );
  }

  const a = report.selfName, b = report.partnerName;
  const header = <ReportBanner src={HERO} kicker={report.paid ? "Aapka poora jawab" : "Kundli milan taiyaar hai"} title={`${a} aur ${b}`} position="50% 63%" />;

  if (!report.paid) {
    return (
      <>
        {header}
        <div className="mt-6 space-y-4">
          <section className="glass rise p-5 text-center">
            <p className="text-[12px] uppercase tracking-[0.16em] text-[#f8bccd]">Dono ka judaav</p>
            <div className="mt-3"><ScoreRing score={report.gunTotal} size={170} /></div>
            <p className="font-display mt-3 text-[1.2rem] text-[#fff0f5]">{report.gunBand}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-[12px] text-[#d9cbe6]">
              <div className="glass px-3 py-2"><b className="block text-[13px] font-medium text-[#fff0f5]">{a}</b>{report.self.moonRashi} · {report.self.nakshatra}</div>
              <div className="glass px-3 py-2"><b className="block text-[13px] font-medium text-[#fff0f5]">{b}</b>{report.partner.moonRashi} · {report.partner.nakshatra}</div>
            </div>
          </section>

          <PaperCard eyebrow="Aapka sawal" title={`Kya ${b} wapas aayenge?`}>
            <div className="relative">
              <div className="blur-lock">
                <p className="ink text-[1.05rem] font-semibold">Wapsi ke prabal sanket</p>
                <div className="mt-2"><LevelMeter level={2} labels={["Kam", "Madhyam", "Prabal"]} /></div>
              </div>
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[rgba(44,22,64,0.9)] text-[#ffe6ee] shadow-lg"><Lock className="h-4 w-4" /></span>
              </div>
            </div>
            <p className="ink-soft mt-3 text-[13px] leading-relaxed">Jawab taiyaar hai. Dono ki kundli aur aapki abhi ki dasha, dono ko dekhkar nikala gaya hai.</p>
          </PaperCard>

          <PaperCard eyebrow="Poori report me" title="Yeh sab khulega">
            <ul className="space-y-2">
              <LockedRow title={`${b} ke mann me kya hai`} hint="Yaad karte hain ya aage badh chuke hain" />
              <LockedRow title="Doori ki asli wajah" hint="Dono ki kundli me kahan takrav hai" />
              <LockedRow title="Baat dobara kab banegi" hint="Sampark ke sabse anukool mahine" />
              <LockedRow title="Pehal karein ya intezaar" hint="Kya karein aur kya bilkul na karein" />
              <LockedRow title="Saral upay" hint="Rishte ki shanti ke liye" />
            </ul>
          </PaperCard>
          <p className="px-1 text-center text-[12px] leading-relaxed text-[#d9cbe6]">{report.basisNote}</p>
          <ErrorNote message={error} />
        </div>
        <AstroFooter />
        <PayBar price={report.price} label="Poora jawab kholein" sub="Razorpay se surakshit · UPI, card · Turant khulega" busy={paying} onPay={pay} />
      </>
    );
  }

  if (report.needsPhone) {
    return (
      <>
        {header}
        <div className="mt-6">
          <BuyerPhoneGate type="wapas" reportId={report.id} onSaved={reload} />
        </div>
      </>
    );
  }

  const s = report.sections!;
  const n = report.narrative;
  return (
    <>
      {header}
      <div className="mt-6 space-y-4">
        <BirthDetailsCard report={report} />
        <PaperCard eyebrow={`Kya ${b} wapas aayenge?`} title={s.level.label}>
          <LevelMeter level={s.meter} labels={["Kam", "Madhyam", "Prabal"]} />
          <p className="ink mt-4 text-[14px] leading-relaxed">{n?.summary ?? s.level.line}</p>
        </PaperCard>

        <PaperCard eyebrow="Unka mann" title={`${b} ke mann me kya hai`}>
          <p className="ink text-[14px] leading-relaxed">{n?.feelings ?? s.feel}</p>
        </PaperCard>

        <PaperCard eyebrow="Doori ki wajah" title="Yeh rishta kahan atka">
          <Bullets items={s.causes} />
          {n?.cause && <p className="ink mt-3 border-t border-[#e6d6b6] pt-3 text-[14px] leading-relaxed">{n.cause}</p>}
        </PaperCard>

        <PaperCard eyebrow="Sahi samay" title={s.timing.contact ?? "Abhi ka samay"}>
          <p className="ink-soft text-[13px]">Is dauraan aapki kundli me prem aur rishte ke bhaav sakriya hain. Baat banne ke yog isi samay sabse majboot hain.</p>
          <dl className="mt-3 grid gap-2 text-[13px]">
            <div className="flex justify-between gap-3 rounded-xl bg-[#fffaf0] px-3 py-2 ring-1 ring-[#e6d6b6]"><dt className="ink-soft">Abhi ki dasha</dt><dd className="ink text-right font-medium">{s.timing.dasha}</dd></div>
            {s.timing.next && <div className="flex justify-between gap-3 rounded-xl bg-[#fffaf0] px-3 py-2 ring-1 ring-[#e6d6b6]"><dt className="ink-soft">Agla anukool samay</dt><dd className="ink text-right font-medium">{s.timing.next}</dd></div>}
          </dl>
        </PaperCard>

        <PaperCard eyebrow="Ab kya karein" title={s.act.title}>
          <p className="ink text-[14px] leading-relaxed">{s.act.text}</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4f8a35]">Yeh karein</p>
          <div className="mt-1.5"><Bullets items={s.doList} tone="yes" /></div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b9441c]">Yeh na karein</p>
          <div className="mt-1.5"><Bullets items={s.dontList} tone="no" /></div>
          {n?.advice && <p className="ink mt-3 border-t border-[#e6d6b6] pt-3 text-[14px] leading-relaxed">{n.advice}</p>}
        </PaperCard>

        <PaperCard eyebrow="Upay" title="Rishte ki shanti ke liye">
          <Bullets items={s.upay} />
        </PaperCard>

        <PaperCard eyebrow="Kundli milan">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display ink text-[2.2rem] leading-none">{s.gun.total}<span className="ink-soft text-base">/36 gun</span></p>
              <p className="ink mt-1 text-[14px] font-medium">{s.gun.band.label}</p>
            </div>
            <Link href="/milan" className="rounded-full bg-[#2c1640] px-4 py-2.5 text-[13px] font-medium text-[#ffe6ee]" onClick={() => logAstro("astro_report_action", "wapas", { report_id: report.id, action: "milan_cta" })}>Poora gun milan</Link>
          </div>
        </PaperCard>

        <section className="glass p-5 text-center">
          <p className="text-[14px] leading-relaxed text-[#eadff5]">{s.care}</p>
        </section>
        <p className="px-1 text-center text-[12px] leading-relaxed text-[#d9cbe6]">{s.basisNote}</p>

        <ReflectionCard
          title="Intezaar karein ya aage badhein?"
          questions={REFLECT}
          footer="Kundli samay aur sanket batati hai. Aakhri faisla aapka hai, aur aapki khushi sabse pehle hai."
        />

        <section className="glass p-5 text-center">
          <h2 className="gold-text text-[1.4rem] leading-snug">Aapki shaadi kab aur kisse hogi?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#eadff5]">Apni kundli se vivah ka samay aur jeevansathi ke naam ka pehla akshar jaaniye.</p>
          <Link href="/shaadi" className="btn-gold mt-4" onClick={() => logAstro("astro_report_action", "wapas", { report_id: report.id, action: "shaadi_cta" })}>Shaadi ka yog dekhein</Link>
        </section>
        <AskMoreCard type="wapas" reportId={report.id} />
      </div>
      <AstroFooter />
    </>
  );
}
