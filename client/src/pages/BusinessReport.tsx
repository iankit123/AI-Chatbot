import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { CalendarClock, Compass, Lock, MessageCircle, Sparkles, Store, TrendingUp, Users } from "lucide-react";
import {
  Analysing, AstroFooter, AstroShell, Bullets, ErrorNote, Faq, LevelMeter, LockedRow, PaperCard, PayBar,
  Segmented, Steps, ZodiacWheel,
} from "@/components/astro/ui";
import { SelfFields, useSelfForm } from "@/components/astro/forms";
import { useAstroReport } from "@/components/astro/useReport";
import {
  cacheReport, createBusinessPreview, lastReportId, rememberReport, saveSelf, shareOnWhatsApp, trackAstro, wait,
  type BusinessReport, type BusinessSituation,
} from "@/lib/astroApi";

export default function BusinessReportPage() {
  const [, params] = useRoute("/business/r/:id");
  useEffect(() => {
    document.title = "Kaun sa business karun? | puchlo.in";
  }, []);
  return (
    <AstroShell tagline="Vyapar Jyotish" theme="business">
      {params?.id ? <ReportView key={params.id} id={params.id} /> : <Landing />}
    </AstroShell>
  );
}

const SITUATIONS: { value: BusinessSituation; label: string }[] = [
  { value: "naukri", label: "Naukri karta/karti hun" },
  { value: "business", label: "Apna kaam hai" },
  { value: "berozgar", label: "Abhi kaam nahi hai" },
  { value: "student", label: "Padhai kar raha/rahi hun" },
];
const BUDGETS: { value: "1" | "2" | "3" | "4"; label: string }[] = [
  { value: "1", label: "₹50 hazaar tak" },
  { value: "2", label: "₹50 hazaar – 2 lakh" },
  { value: "3", label: "₹2 – 10 lakh" },
  { value: "4", label: "₹10 lakh se zyada" },
];

/** Shop shutter with shubh-labh and a rising line: the audience's own picture of a good start. */
function HeroArt() {
  return (
    <svg viewBox="0 0 320 180" className="mx-auto w-full max-w-[330px]" aria-hidden>
      <defs>
        <linearGradient id="bz-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2b3" />
          <stop offset="1" stopColor="#c9973f" />
        </linearGradient>
        <linearGradient id="bz-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1c6a54" />
          <stop offset="1" stopColor="#0c2a22" />
        </linearGradient>
      </defs>
      {/* awning */}
      <path d="M52 62h216l14 26H38z" fill="url(#bz-gold)" />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <path key={i} d={`M${38 + i * 30.5} 88a15.25 13 0 0 0 30.5 0z`} fill={i % 2 ? "#f6e2b3" : "#c9973f"} />
      ))}
      {/* shop front */}
      <rect x="52" y="88" width="216" height="80" fill="url(#bz-wall)" stroke="url(#bz-gold)" strokeWidth="1.5" />
      <rect x="52" y="34" width="216" height="28" rx="6" fill="#0c2a22" stroke="url(#bz-gold)" strokeWidth="1.5" />
      <text x="160" y="49" textAnchor="middle" dominantBaseline="central" fontFamily="'Tiro Devanagari Hindi', serif" fontSize="17" fill="#f6e2b3">शुभ ॥ लाभ</text>
      {/* rising earnings line */}
      <path d="M76 150 L118 132 L150 140 L192 112 L238 100" fill="none" stroke="url(#bz-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M226 98h14v14" fill="none" stroke="url(#bz-gold)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {[[76, 150], [118, 132], [150, 140], [192, 112]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="4" fill="#0c2a22" stroke="#f6e2b3" strokeWidth="2" />)}
      <circle cx="286" cy="26" r="2" fill="#f6e2b3" className="pulse" />
      <circle cx="30" cy="44" r="1.5" fill="#fff" className="pulse" />
    </svg>
  );
}

function Landing() {
  const [, navigate] = useLocation();
  const self = useSelfForm();
  const [situation, setSituation] = useState<BusinessSituation | "">("");
  const [budget, setBudget] = useState<"1" | "2" | "3" | "4" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const last = useRef(lastReportId("business")).current;

  useEffect(() => {
    trackAstro("astro_landing", "business");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = self.error();
    if (problem) return setError(problem);
    if (!situation) return setError("Kripya batayein ki abhi aap kya karte hain.");
    if (!budget) return setError("Kripya chunein ki aap kitni poonji laga sakte hain.");
    setError(null);
    setBusy(true);
    window.scrollTo({ top: 0 });
    const me = self.value();
    trackAstro("astro_form_submitted", "business", { situation, budget });
    try {
      const [report] = await Promise.all([
        createBusinessPreview({ ...me, situation, budget: Number(budget) as 1 | 2 | 3 | 4 }),
        wait(5200),
      ]);
      saveSelf(me);
      rememberReport("business", report.id);
      cacheReport(report);
      navigate(`/business/r/${report.id}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Kuch gadbad ho gayi. Dobara koshish karein.");
    }
  };

  if (busy) {
    return (
      <Analysing
        title="Aapki vyapar kundli ban rahi hai"
        steps={["Graha sthiti ki ganana", "Dasham bhaav (karm) ka vishleshan", "Saptam aur labh bhaav", "Aapke liye anukool kshetra", "Shuruaat ka shubh samay"]}
      />
    );
  }

  return (
    <>
      <section className="rise pt-1 text-center">
        <HeroArt />
        <h1 className="font-hindi gold-text mt-3 text-[2.35rem] leading-[1.25]">
          कौन सा
          <br />
          बिज़नेस करूँ?
        </h1>
        <p className="mx-auto mt-4 max-w-[330px] text-[15px] leading-relaxed text-[#e3eee8]">
          Janm kundli se jaaniye aapke liye sabse shubh vyapar, shuruaat ka sahi samay aur dukan ke naam ka akshar.
        </p>
        <button type="button" className="btn-gold mt-7" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <Sparkles className="h-4 w-4" /> Apna vyapar yog dekhein
        </button>
        {last && (
          <Link href={`/business/r/${last}`} className="mt-3 inline-block text-[13px] text-[#ecc97f] underline underline-offset-4">
            Pichhli report dobara kholein
          </Link>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] leading-snug text-[#cfe0d8]">
          {(
            [
              [Store, "Aapki poonji ke hisaab se sujhaav"],
              [CalendarClock, "Shuruaat ka shubh samay"],
              [Users, "Akele karein ya sajhedari me"],
            ] as const
          ).map(([Icon, text]) => (
            <div key={text} className="glass px-2 py-3">
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-[#ecc97f]" />
              {text}
            </div>
          ))}
        </div>
      </section>

      <div ref={formRef} className="scroll-mt-4 pt-9">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <PaperCard eyebrow="Pehla kadam" title="Apna janm vivaran bharein">
            <SelfFields form={self} id="bz" />
          </PaperCard>
          <PaperCard eyebrow="Aapki sthiti" title="Abhi aap kya karte hain?">
            <Segmented cols={1} value={situation} onChange={setSituation} options={SITUATIONS} />
          </PaperCard>
          <PaperCard eyebrow="Aapki poonji" title="Kitna paisa laga sakte hain?">
            <Segmented cols={2} value={budget} onChange={setBudget} options={BUDGETS} />
            <p className="ink-soft mt-2 text-[12px]">Sujhaav isi poonji ke hisaab se diye jaayenge.</p>
          </PaperCard>
          <ErrorNote message={error} />
          <button type="submit" className="btn-gold">
            <TrendingUp className="h-4 w-4" /> Mera vyapar yog dekhein
          </button>
          <p className="text-center text-[11px] text-[#cfe0d8]">Vyapar yog aur sabse anukool kshetra turant dikhega.</p>
        </form>
      </div>

      <section className="pt-10">
        <h2 className="gold-text mb-4 text-center text-2xl">Report me kya milega</h2>
        <Steps
          items={[
            { title: "Vyapar ya naukri", text: "Aapki kundli me apna kaam karne ke yog kitne majboot hain." },
            { title: "5-6 business ke sujhaav", text: "Aapke grahon aur aapki poonji, dono ke hisaab se chune hue." },
            { title: "Shuruaat ka shubh samay", text: "Dasha ke aadhar par kaun se mahine sabse anukool hain." },
            { title: "Naam, din, disha aur savdhani", text: "Dukan ke naam ka akshar, shubh din-rang-disha, sajhedari aur kin galtiyon se bachna hai." },
          ]}
        />
      </section>

      <section className="pt-10">
        <h2 className="gold-text mb-4 text-center text-2xl">Aksar puche jaane wale sawal</h2>
        <Faq
          items={[
            { q: "Yeh kaise pata chalta hai?", a: "Kundli ka dasham bhaav karm ka, saptam vyapar ka aur gyarahvan labh ka hota hai. In bhaavon ke swami aur unme baithe graha batate hain ki kaun sa kshetra aapke liye anukool hai." },
            { q: "Kya isse kamai ki guarantee hai?", a: "Nahi. Jyotish anukool disha aur samay batata hai. Mehnat, bazaar ki samajh aur hisaab-kitab utne hi zaroori hain." },
            { q: "Mere paas kam paisa hai, to?", a: "Report me sujhaav aapki batayi poonji ke andar hi diye jaate hain, ₹50 hazaar se kam wale vikalp bhi." },
            { q: "Janm samay pata nahi ho to?", a: "Tab report Chandra kundli se banti hai. Kshetra aur samay phir bhi milte hain, bas lagna aadharit baatein thodi kam sateek hoti hain." },
          ]}
        />
      </section>
      <AstroFooter />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fffaf0] px-3 py-2.5 ring-1 ring-[#e6d6b6]">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8f6522]">{label}</dt>
      <dd className="ink mt-0.5 text-[14px] font-medium leading-snug">{value}</dd>
    </div>
  );
}

function ReportView({ id }: { id: string }) {
  const { report, error, paying, unlocking, pay } = useAstroReport<BusinessReport>(id, "business");

  if (unlocking) return <Analysing title="Aapki poori report khul rahi hai" steps={["Payment ki pushti", "Business ke sujhaav", "Shuruaat ka samay", "Naam aur shubh disha"]} />;
  if (!report) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        {error ? (
          <div>
            <p className="text-[#e3eee8]">{error}</p>
            <Link href="/business" className="btn-ghost mt-4">Nayi report banayein</Link>
          </div>
        ) : (
          <ZodiacWheel size={150} />
        )}
      </div>
    );
  }

  const header = (
    <section className="rise pt-2 text-center">
      <p className="chip mx-auto">{report.paid ? "Sampoorn vyapar report" : "Aapki vyapar kundli taiyaar hai"}</p>
      <h1 className="gold-text mt-4 text-[1.85rem] leading-tight">{report.name} ji, aapki kundli me {report.level.label.charAt(0).toLowerCase() + report.level.label.slice(1)}</h1>
      <div className="mt-5 flex flex-wrap justify-center gap-2 text-[12px]">
        {report.chart.lagna && <span className="glass px-3 py-1.5">Lagna: <b className="font-semibold text-[#fbefd3]">{report.chart.lagna}</b></span>}
        <span className="glass px-3 py-1.5">Rashi: <b className="font-semibold text-[#fbefd3]">{report.chart.moonRashi}</b></span>
        <span className="glass px-3 py-1.5">Poonji: <b className="font-semibold text-[#fbefd3]">{report.budget}</b></span>
      </div>
    </section>
  );

  const yogCard = (text: string) => (
    <PaperCard eyebrow="Vyapar yog" title={report.level.label}>
      <LevelMeter level={report.meter} labels={["Seva kshetra", "Mishrit", "Prabal"]} />
      <p className="ink mt-4 text-[14px] leading-relaxed">{text}</p>
    </PaperCard>
  );

  if (!report.paid) {
    return (
      <>
        {header}
        <div className="mt-7 space-y-4">
          {yogCard(report.level.line)}

          <PaperCard eyebrow="Sabse anukool kshetra" title={report.topField?.field}>
            <p className="ink-soft text-[13px] leading-relaxed">
              Aapki kundli me <b className="ink">{report.topField?.planet}</b> sabse prabhavi graha hai, isliye isse jude kaam aapko phalte hain.
            </p>
            <div className="relative mt-4">
              <ul className="blur-lock space-y-2">
                {["Readymade kapde ya cosmetic ki dukan", "Thok vyapar ya distribution agency", "Mobile accessories ki dukan"].map((t) => (
                  <li key={t} className="ink rounded-xl bg-[#fffaf0] px-3.5 py-3 text-[14px] ring-1 ring-[#e6d6b6]">{t}</li>
                ))}
              </ul>
              <div className="absolute inset-0 grid place-items-center">
                <span className="flex items-center gap-2 rounded-full bg-[rgba(12,42,34,0.92)] px-4 py-2.5 text-[13px] font-medium text-[#f6e2b3] shadow-lg">
                  <Lock className="h-4 w-4" /> {report.ideaCount} business aapki poonji me
                </span>
              </div>
            </div>
          </PaperCard>

          <PaperCard eyebrow="Poori report me" title="Yeh sab bhi khulega">
            <ul className="space-y-2">
              <LockedRow title="Shuruaat ka shubh samay" hint="Kaun se mahine sabse anukool hain" />
              <LockedRow title="Dukan/business ke naam ka akshar" hint={`${report.letterCount} shubh akshar aapki kundli se`} />
              <LockedRow title="Akele karein ya sajhedari me" hint="Saptam bhaav ke aadhar par" />
              <LockedRow title="Shubh din, rang aur disha" hint="Dukan ka mukh aur muhurat ka din" />
              <LockedRow title="Kin galtiyon se bachna hai" hint="Aapki kundli ki savdhaniyan" />
            </ul>
          </PaperCard>
          <ErrorNote message={error} />
        </div>
        <AstroFooter />
        <PayBar price={report.price} label="Poori report kholein" sub="Razorpay se surakshit · UPI, card · Turant khulegi" busy={paying} onPay={pay} />
      </>
    );
  }

  const s = report.sections!;
  const n = report.narrative;
  return (
    <>
      {header}
      <div className="mt-7 space-y-4">
        {yogCard(n?.summary ?? report.level.line)}

        {(n?.why || s.reasons.length > 0) && (
          <PaperCard eyebrow="Kundli kya kehti hai">
            {n?.why && <p className="ink mb-3 text-[14px] leading-relaxed">{n.why}</p>}
            <Bullets items={s.reasons} />
          </PaperCard>
        )}

        <PaperCard eyebrow="Anukool kshetra" title="Aapke grahon ke kaam">
          <ul className="space-y-2">
            {s.fields.map((f, i) => (
              <li key={f.planet} className="flex items-center gap-3 rounded-xl bg-[#fffaf0] px-3.5 py-3 ring-1 ring-[#e6d6b6]">
                <span className="letter-tile !aspect-auto h-9 w-9 shrink-0 !rounded-full !text-base">{i + 1}</span>
                <span>
                  <span className="ink block text-[14px] font-semibold">{f.field}</span>
                  <span className="ink-soft block text-[12px]">{f.planet} ka kshetra</span>
                </span>
              </li>
            ))}
          </ul>
        </PaperCard>

        <PaperCard eyebrow={`Aapki poonji: ${report.budget}`} title="Yeh business aap par phalenge">
          <ol className="space-y-2">
            {s.ideas.map((idea, i) => (
              <li key={idea.text} className="rounded-xl bg-[#fffaf0] px-3.5 py-3 ring-1 ring-[#e6d6b6]">
                <p className="ink text-[14.5px] font-semibold leading-snug">{i + 1}. {idea.text}</p>
                <p className="ink-soft mt-1 text-[12px]">{idea.planet} · lagbhag {idea.budget} me</p>
              </li>
            ))}
          </ol>
          {n?.how && <p className="ink mt-3 border-t border-[#e6d6b6] pt-3 text-[14px] leading-relaxed">{n.how}</p>}
        </PaperCard>

        <PaperCard eyebrow="Shuruaat ka shubh samay" title={s.timing.start}>
          <p className="ink-soft text-[13px]">{s.timing.dasha}. Is dauraan karm aur labh ke graha sakriya hain.</p>
          {s.timing.next && <p className="ink-soft mt-2 text-[13px]">Agla anukool samay: <b className="ink">{s.timing.next}</b></p>}
          <p className="ink mt-3 rounded-xl bg-[#fffaf0] px-3.5 py-3 text-[13.5px] leading-relaxed ring-1 ring-[#e6d6b6]">{s.tip}</p>
        </PaperCard>

        <PaperCard eyebrow="Naam ka akshar" title="Dukan ya business ka naam">
          <div className="flex items-end">
            {s.name.letters.flatMap((l, i) => [
              <div key={l.latin} className="min-w-0 flex-1 basis-0">
                <div className="letter-tile flex-col !gap-0">
                  <span>{l.latin}</span>
                  <span className="font-hindi text-[0.8rem] text-[#ecc97f]">{l.hi}</span>
                </div>
              </div>,
              i < s.name.letters.length - 1 ? (
                <span key={`s${i}`} className="font-display w-6 shrink-0 pb-1 text-center text-[#8f6522]" aria-hidden>
                  {i === s.name.letters.length - 2 ? <span className="text-[12px] font-semibold">ya</span> : <span className="text-[1.7rem] leading-none">,</span>}
                </span>
              ) : null,
            ])}
          </div>
          <p className="ink-soft mt-3 text-[13px] leading-relaxed">{s.name.note}</p>
        </PaperCard>

        <PaperCard eyebrow="Sajhedari" title={s.partnership.title}>
          <p className="ink text-[14px] leading-relaxed">{s.partnership.text}</p>
        </PaperCard>

        <PaperCard eyebrow="Shubh sanket" title="Din, rang aur disha">
          <dl className="grid grid-cols-3 gap-2">
            <Fact label="Shubh din" value={s.luck.day} />
            <Fact label="Rang" value={s.luck.colour} />
            <Fact label="Disha" value={s.luck.direction} />
          </dl>
          <p className="ink-soft mt-3 flex gap-2 text-[13px] leading-relaxed"><Compass className="mt-0.5 h-4 w-4 shrink-0 text-[#8f6522]" />Dukan ka mukh ya baithne ki disha is taraf rakhna, aur shuruaat is din karna shubh maana jaata hai.</p>
        </PaperCard>

        <PaperCard eyebrow="Savdhani" title="In galtiyon se bachein">
          <Bullets items={s.cautions} tone="no" />
          {n?.caution && <p className="ink mt-3 border-t border-[#e6d6b6] pt-3 text-[14px] leading-relaxed">{n.caution}</p>}
        </PaperCard>

        <PaperCard eyebrow="Kundli ka saar">
          <dl className="grid grid-cols-2 gap-2">{s.snapshot.map((f) => <Fact key={f.label} label={f.label} value={f.value} />)}</dl>
        </PaperCard>

        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => shareOnWhatsApp(`Meri kundli ke hisaab se mere liye "${s.fields[0]?.field}" ka kaam sabse shubh hai 🙂\nTum bhi apna dekho: ${window.location.origin}/business`)}
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp par share karein
        </button>
      </div>
      <AstroFooter />
    </>
  );
}
