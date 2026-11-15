import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { CalendarHeart, HeartHandshake, Lock, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";
import {
  Analysing, AstroFooter, AstroShell, Bullets, ErrorNote, Faq, LevelMeter, LockedRow, PaperCard, PayBar,
  ScoreRing, Segmented, Steps, ZodiacWheel,
} from "@/components/astro/ui";
import { PartnerFields, SelfFields, usePartnerForm, useSelfForm } from "@/components/astro/forms";
import { useAstroReport, useReadTracking } from "@/components/astro/useReport";
import { AskMoreCard, PaidReportBanner } from "@/components/astro/paid";
import {
  cacheReport, createWapasPreview, lastReportId, logAstro, rememberReport, saveSelf, trackAstro, wait,
  type WapasReport, type WapasStatus,
} from "@/lib/astroApi";

export default function WapasReportPage() {
  const [, params] = useRoute("/wapas/r/:id");
  useEffect(() => {
    document.title = "Kya woh wapas aayenge? | puchlo.in";
  }, []);
  return (
    <AstroShell tagline="Prem Jyotish" theme="wapas">
      {params?.id ? <ReportView key={params.id} id={params.id} /> : <Landing />}
    </AstroShell>
  );
}

const STATUSES: { value: WapasStatus; label: string }[] = [
  { value: "no_contact", label: "Baat-cheet band hai" },
  { value: "breakup", label: "Breakup ho gaya hai" },
  { value: "fight", label: "Jhagda / narazgi chal rahi hai" },
  { value: "separated", label: "Shaadi ke baad alag rah rahe hain" },
];

/** Two people under a crescent moon, joined by a thread with a heartbeat in the middle. */
function HeroArt({ a = "", b = "" }: { a?: string; b?: string }) {
  return (
    <svg viewBox="0 0 320 170" className="mx-auto w-full max-w-[330px]" aria-hidden>
      <defs>
        <linearGradient id="wp-rose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffe6ee" />
          <stop offset="1" stopColor="#e58ea9" />
        </linearGradient>
        <radialGradient id="wp-orb" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0" stopColor="#6d43a0" />
          <stop offset="1" stopColor="#2c1640" />
        </radialGradient>
      </defs>
      {/* crescent moon */}
      <path d="M252 20a26 26 0 1 0 26 34 21 21 0 1 1-26-34z" fill="url(#wp-rose)" opacity="0.9" />
      <circle cx="60" cy="24" r="1.6" fill="#ffe6ee" className="pulse" />
      <circle cx="150" cy="12" r="1.2" fill="#fff" />
      <circle cx="205" cy="40" r="1.4" fill="#ffe6ee" className="pulse" />
      {/* thread between the two */}
      <path d="M92 108 C 130 60, 190 60, 228 108" fill="none" stroke="url(#wp-rose)" strokeWidth="1.6" strokeDasharray="3 7" strokeLinecap="round" />
      <g className="beat">
        <path d="M160 82c-4-7-15-6-15 3 0 7 9 12 15 17 6-5 15-10 15-17 0-9-11-10-15-3z" fill="url(#wp-rose)" />
      </g>
      {[[72, a], [248, b]].map(([x, l]) => (
        <g key={x as number}>
          <circle cx={x as number} cy="118" r="38" fill="url(#wp-orb)" stroke="url(#wp-rose)" strokeWidth="1.4" />
          <text x={x as number} y="120" textAnchor="middle" dominantBaseline="central" fontFamily="Marcellus, serif" fontSize="34" fill="#ffe6ee">
            {(l as string) || "?"}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Landing() {
  const [, navigate] = useLocation();
  const self = useSelfForm();
  const partner = usePartnerForm();
  const [status, setStatus] = useState<WapasStatus>("no_contact");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const last = useRef(lastReportId("wapas")).current;

  useEffect(() => {
    trackAstro("astro_landing", "wapas");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = self.error() ?? partner.error();
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    window.scrollTo({ top: 0 });
    const me = self.value();
    trackAstro("astro_form_submitted", "wapas", { status, partner_dob: partner.knows === "yes" });
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
      <PaidReportBanner type="wapas" />
      <section className="rise pt-1 text-center">
        <HeroArt a={self.name.trim().charAt(0).toUpperCase()} b={partner.name.trim().charAt(0).toUpperCase()} />
        <h1 className="font-hindi gold-text mt-3 text-[2.35rem] leading-[1.25]">
          क्या वो
          <br />
          वापस आएंगे?
        </h1>
        <p className="mx-auto mt-4 max-w-[330px] text-[15px] leading-relaxed text-[#eadff5]">
          Dono ki kundli se jaaniye: unke mann me kya hai, doori kyon aayi, aur baat dobara kab ban sakti hai.
        </p>
        <button type="button" className="btn-gold mt-7" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <Sparkles className="h-4 w-4" /> Apna jawab dekhein
        </button>
        {last && (
          <Link href={`/wapas/r/${last}`} className="mt-3 inline-block text-[13px] text-[#f8bccd] underline underline-offset-4">
            Pichhli report dobara kholein
          </Link>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] leading-snug text-[#d9cbe6]">
          {(
            [
              [ShieldCheck, "Poori tarah gopniya, unhe pata nahi chalega"],
              [HeartHandshake, "Sirf naam se bhi dekha ja sakta hai"],
              [CalendarHeart, "Samay ke saath, sirf haan-na nahi"],
            ] as const
          ).map(([Icon, text]) => (
            <div key={text} className="glass px-2 py-3">
              <Icon className="mx-auto mb-1.5 h-4 w-4 text-[#f8bccd]" />
              {text}
            </div>
          ))}
        </div>
      </section>

      <div ref={formRef} className="scroll-mt-4 pt-9">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <PaperCard eyebrow="Abhi kya sthiti hai">
            <Segmented cols={1} value={status} onChange={setStatus} options={STATUSES} />
          </PaperCard>
          <PaperCard eyebrow="Aapki kundli" title="Aapka vivaran">
            <SelfFields form={self} id="wp" />
          </PaperCard>
          <PaperCard eyebrow="Unki kundli" title="Jinke baare me jaanna hai">
            <PartnerFields form={partner} id="wp" />
          </PaperCard>
          <ErrorNote message={error} />
          <button type="submit" className="btn-gold">
            <MessageCircleHeart className="h-4 w-4" /> Dekhein, woh wapas aayenge ya nahi
          </button>
          <p className="text-center text-[11px] text-[#d9cbe6]">Dono ka judaav (36 me se gun) turant dikhega.</p>
        </form>
      </div>

      <section className="pt-10">
        <h2 className="gold-text mb-4 text-center text-2xl">Report me kya milega</h2>
        <Steps
          items={[
            { title: "Wapsi ke sanket", text: "Prabal, madhyam ya kam. Seedha aur imaandar jawab." },
            { title: "Unke mann me kya hai", text: "Kya woh bhi yaad karte hain, ya aage badh chuke hain." },
            { title: "Doori ki asli wajah", text: "Dono ki kundli me kahan takrav hai, taaki wahi galti dobara na ho." },
            { title: "Pehal karein ya intezaar", text: "Baat kab banne ke yog hain, aur pehla sandesh kaise bhejein." },
          ]}
        />
      </section>

      <section className="pt-10">
        <h2 className="gold-text mb-4 text-center text-2xl">Aksar puche jaane wale sawal</h2>
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
  const { report, error, paying, unlocking, pay } = useAstroReport<WapasReport>(id, "wapas");
  useReadTracking(report);

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
  const header = (
    <section className="rise pt-1 text-center">
      <p className="chip mx-auto">{report.paid ? "Aapka poora jawab" : "Kundli milan taiyaar hai"}</p>
      <div className="mt-3">
        <HeroArt a={a.charAt(0)} b={b.charAt(0)} />
      </div>
      <h1 className="gold-text mt-2 text-[1.7rem] leading-tight">{a} aur {b}</h1>
    </section>
  );

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

  const s = report.sections!;
  const n = report.narrative;
  return (
    <>
      {header}
      <div className="mt-6 space-y-4">
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
