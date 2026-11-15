import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { AlertTriangle, ArrowRight, CheckCircle2, Heart, Lock, MessageCircle, Star } from "lucide-react";
import {
  Analysing, AstroFooter, CITY_HINTS, DateSelect, ErrorNote, Faq, LockedRow, PaperCard, PayBar,
  ScoreRing, Segmented, TimeSelect, ZodiacWheel,
} from "@/components/astro/ui";
import { EditorialShell, NumberedList, PhotoHero, ReportBanner, SectionHead, StepHead, TrustLine } from "@/components/astro/editorial";
import {
  cacheReport, createMilanPreview, lastReportId, loadSelf, logAstro, rememberReport,
  saveSelf, shareOnWhatsApp, trackAstro, wait,
  type Gender, type Koot, type MilanReport,
} from "@/lib/astroApi";
import { useAstroReport, useReadTracking } from "@/components/astro/useReport";
import { AskMoreCard, PaidReportBanner } from "@/components/astro/paid";

export default function MilanReportPage() {
  const [, params] = useRoute("/milan/r/:id");
  useEffect(() => {
    document.title = "Kundli Milan: kya inse shaadi hogi? | puchlo.in";
  }, []);
  return (
    <EditorialShell theme="milan">
      {params?.id ? <ReportView key={params.id} id={params.id} /> : <Landing />}
    </EditorialShell>
  );
}

const QUESTIONS: { value: MilanReport["question"]; label: string }[] = [
  { value: "shaadi", label: "Kya inse shaadi hogi?" },
  { value: "wapas", label: "Kya woh wapas aayenge?" },
  { value: "rishta", label: "Rishta kaisa rahega?" },
];

const HERO = "/astro/milan-hero.webp";

/** The eight koots and their points: 36 in total, 18 or more is the traditional pass mark. */
const KOOT_GUIDE = [
  { name: "Nadi", hi: "नाड़ी", text: "Sehat aur santaan sukh", max: 8 },
  { name: "Bhakoot", hi: "भकूट", text: "Parivar, dhan aur pyaar ka pravah", max: 7 },
  { name: "Gana", hi: "गण", text: "Swabhav aur gussa", max: 6 },
  { name: "Graha Maitri", hi: "ग्रह मैत्री", text: "Mann ka mel, dosti", max: 5 },
  { name: "Yoni", hi: "योनि", text: "Swabhav aur sharirik anukoolta", max: 4 },
  { name: "Tara", hi: "तारा", text: "Bhagya aur sehat ka saath", max: 3 },
  { name: "Vashya", hi: "वश्य", text: "Ek dusre par prabhav, aakarshan", max: 2 },
  { name: "Varna", hi: "वर्ण", text: "Soch aur ahankaar ka taalmel", max: 1 },
];

function KootGuide() {
  return (
    <ul className="divide-y divide-[var(--ed-line)] border-y border-[var(--ed-line)]">
      {KOOT_GUIDE.map((k) => (
        <li key={k.name} className="flex items-center gap-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-medium text-[var(--ed-text)]">
              {k.name} <span className="font-hindi text-[13px] font-normal text-[var(--ed-muted)]">{k.hi}</span>
            </p>
            <p className="text-[12.5px] text-[var(--ed-muted)]">{k.text}</p>
          </div>
          <div className="flex w-[104px] shrink-0 items-center gap-2">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--ed-line)]">
              <span className="block h-full rounded-full bg-[var(--ed-accent)]" style={{ width: `${(k.max / 8) * 100}%` }} />
            </span>
            <span className="font-display w-9 text-right text-[14px] text-[var(--ed-text)]">{k.max}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Landing() {
  const [, navigate] = useLocation();
  const saved = useRef(loadSelf()).current;
  const [name, setName] = useState(saved.name ?? "");
  const [gender, setGender] = useState<Gender | "">(saved.gender ?? "");
  const [dob, setDob] = useState(saved.dob ?? "");
  const [tob, setTob] = useState<string | null>(saved.tob ?? null);
  const [place, setPlace] = useState(saved.place ?? "");
  const [pName, setPName] = useState("");
  const [pKnowsDob, setPKnowsDob] = useState<"yes" | "no">("yes");
  const [pDob, setPDob] = useState("");
  const [pTob, setPTob] = useState<string | null>(null);
  const [pPlace, setPPlace] = useState("");
  const [question, setQuestion] = useState<MilanReport["question"]>("shaadi");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const last = useRef(lastReportId("milan")).current;

  useEffect(() => {
    trackAstro("astro_landing", "milan");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Kripya apna naam likhein.");
    if (!gender) return setError("Kripya apna ling chunein.");
    if (!dob) return setError("Kripya apni janm tithi chunein.");
    if (place.trim().length < 2) return setError("Kripya apna janm sthan likhein.");
    if (pName.trim().length < 2) return setError("Kripya unka naam likhein.");
    if (pKnowsDob === "yes" && !pDob) return setError("Unki janm tithi chunein, ya 'Pata nahi' chunein.");
    setError(null);
    setBusy(true);
    window.scrollTo({ top: 0 });
    const self = { name: name.trim(), gender, dob, tob, place: place.trim() };
    const knows = pKnowsDob === "yes";
    trackAstro("astro_form_submitted", "milan", { question, partner_dob: knows });
    try {
      const [report] = await Promise.all([
        createMilanPreview({
          self,
          partner: { name: pName.trim(), dob: knows ? pDob : null, tob: knows ? pTob : null, place: knows && pPlace.trim() ? pPlace.trim() : null },
          question,
        }),
        wait(5200),
      ]);
      saveSelf(self);
      rememberReport("milan", report.id);
      cacheReport(report);
      navigate(`/milan/r/${report.id}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Kuch gadbad ho gayi. Dobara koshish karein.");
    }
  };

  if (busy) {
    return (
      <Analysing
        title="Dono kundliyon ka milan ho raha hai"
        steps={["Dono ki Chandra rashi aur nakshatra", "Ashtakoot ke 8 koot", "Nadi aur Bhakoot dosh", "Mangal dosh ki jaanch", "Rishte ka nishkarsh"]}
      />
    );
  }

  return (
    <>
      <PhotoHero
        src={HERO}
        alt="Diyon ki roshni me mehendi lage haathon se haath thaame dulha aur dulhan"
        kicker="Kundli Milan · 36 gun"
        title={<>क्या इनसे<br />शादी होगी?</>}
        sub="Ashtakoot gun milan, Mangal dosh aur rishte ka seedha nishkarsh. Sirf naam se bhi milan ho sakta hai."
        position="50% 100%"
      >
        <button type="button" className="btn-gold mt-6" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          Gun milan dekhein <ArrowRight className="h-4 w-4" />
        </button>
        <TrustLine items={["Sirf naam se bhi", "Turant nateeja", "Poori tarah gopniya"]} />
        {last && (
          <Link href={`/milan/r/${last}`} className="mt-3 inline-block text-[13px] text-[var(--ed-accent)] underline underline-offset-4">
            Pichhla milan dobara kholein
          </Link>
        )}
      </PhotoHero>

      <div className="mt-8"><PaidReportBanner type="milan" /></div>

      <div ref={formRef} className="scroll-mt-4 pt-4">
        <form onSubmit={submit} className="paper rise space-y-6 p-5" noValidate>
          <div>
            <StepHead n={1} title="Aapka sawal" />
            <Segmented cols={1} value={question} onChange={setQuestion} options={QUESTIONS} />
          </div>

          <div className="border-t border-[#ece2da] pt-6">
            <StepHead n={2} title="Aapki kundli" sub="Janm ki jaankari, jitni pata ho" />
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="ml-name">Aapka naam</label>
                <input id="ml-name" className="field" placeholder="Jaise: Rahul" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </div>
              <div>
                <span className="label">Aap</span>
                <Segmented value={gender} onChange={setGender} options={[{ value: "male", label: "Purush" }, { value: "female", label: "Mahila" }]} />
              </div>
              <div>
                <label className="label" htmlFor="ml-dob-day">Janm tithi</label>
                <DateSelect idPrefix="ml-dob" value={dob} onChange={setDob} />
              </div>
              <div>
                <span className="label">Janm samay</span>
                <TimeSelect value={tob} onChange={setTob} unknownLabel="Janm samay pata nahi" />
              </div>
              <div>
                <label className="label" htmlFor="ml-place">Janm sthan</label>
                <input id="ml-place" className="field" list="astro-cities" placeholder="Jaise: Lucknow" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} />
                <datalist id="astro-cities">{CITY_HINTS.map((c) => <option key={c} value={c} />)}</datalist>
              </div>
            </div>
          </div>

          <div className="border-t border-[#ece2da] pt-6">
            <StepHead n={3} title="Unki kundli" sub="Janm tithi na pata ho to sirf naam bhi chalega" />
            <div className="space-y-4">
              <div>
                <label className="label" htmlFor="ml-pname">Unka naam</label>
                <input id="ml-pname" className="field" placeholder="Jaise: Priya" value={pName} onChange={(e) => setPName(e.target.value)} maxLength={60} />
              </div>
              <div>
                <span className="label">Unki janm tithi pata hai?</span>
                <Segmented value={pKnowsDob} onChange={setPKnowsDob} options={[{ value: "yes", label: "Haan, pata hai" }, { value: "no", label: "Pata nahi" }]} />
              </div>
              {pKnowsDob === "yes" ? (
                <>
                  <div>
                    <label className="label" htmlFor="ml-pdob-day">Unki janm tithi</label>
                    <DateSelect idPrefix="ml-pdob" value={pDob} onChange={setPDob} />
                  </div>
                  <div>
                    <span className="label">Unka janm samay <span className="font-normal">(vaikalpik)</span></span>
                    <TimeSelect value={pTob} onChange={setPTob} unknownLabel="Samay pata nahi" />
                  </div>
                  <div>
                    <label className="label" htmlFor="ml-pplace">Unka janm sthan <span className="font-normal">(vaikalpik)</span></label>
                    <input id="ml-pplace" className="field" list="astro-cities" placeholder="Jaise: Jaipur" value={pPlace} onChange={(e) => setPPlace(e.target.value)} maxLength={80} />
                  </div>
                </>
              ) : (
                <p className="rounded-xl bg-[#fffaf0] px-3.5 py-3 text-[13px] leading-relaxed text-[#7a5560] ring-1 ring-[#e6d6b6]">
                  Koi baat nahi. Unke naam ke pehle akshar se naam-rashi nikalkar milan kiya jaayega.
                </p>
              )}
            </div>
          </div>

          <ErrorNote message={error} />
          <div>
            <button type="submit" className="btn-gold">
              <Heart className="h-4 w-4" /> Gun milan karein
            </button>
            <p className="ink-soft mt-2 text-center text-[12px]">36 me se kitne gun mile, yeh turant dikhega.</p>
          </div>
        </form>
      </div>

      <section className="pt-14">
        <SectionHead kicker="Ashtakoot" title="36 gun kaise milte hain" sub="Dono ki Chandra rashi aur nakshatra se aath koot milaye jaate hain. 18 ya usse zyada gun vivah ke liye sweekarya maane jaate hain." />
        <KootGuide />
      </section>

      <section className="pt-14">
        <SectionHead kicker="Poori report" title="Milan report me kya milega" />
        <NumberedList
          items={[
            { title: "36 gun ka poora hisaab", text: "Varna se Nadi tak aathon koot, har ek ka matlab aasan bhasha me." },
            { title: "Nadi, Bhakoot aur Mangal dosh", text: "Kaun sa dosh hai, kitna gambhir hai, aur kya woh kat raha hai." },
            { title: "Aapke sawal ka seedha jawab", text: "Shaadi ke yog, rishte ki taakat aur kamzori, anukool samay." },
            { title: "Upay", text: "Dosh nivaran aur rishte ko majboot karne ke saral upay." },
          ]}
        />
      </section>

      <section className="pt-14">
        <SectionHead title="Aksar puche jaane wale sawal" />
        <Faq
          items={[
            { q: "Gun milan kya hota hai?", a: "Ashtakoot milan me dono ke janm nakshatra aur Chandra rashi se 8 koot milaye jaate hain, kul 36 gun. 18 ya usse zyada gun vivah ke liye sweekarya maane jaate hain." },
            { q: "Sirf naam se milan kitna sahi hai?", a: "Naam ke pehle akshar se naam-rashi nikalti hai, jo parampara me maanya hai. Par janm tithi se kiya milan zyada sateek hota hai." },
            { q: "Kam gun aaye to?", a: "Kam gun ka matlab rishta namumkin nahi. Report me dosh ke upay aur dhyan dene wali baatein bhi di jaati hain." },
            { q: "Kya unki jaankari surakshit hai?", a: "Haan. Jaankari sirf is report ko banane ke liye use hoti hai aur kisi ke saath share nahi ki jaati." },
          ]}
        />
      </section>
      <AstroFooter />
    </>
  );
}

// ---------------------------------------------------------------- report

function KootRow({ k }: { k: Koot }) {
  const locked = k.score === null;
  const pct = locked ? 0 : ((k.score as number) / k.max) * 100;
  return (
    <li className="rounded-xl bg-[#fffaf0] px-3.5 py-3 ring-1 ring-[#e6d6b6]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[14px] font-semibold text-[#3a1420]">
          {k.name} <span className="font-hindi text-[12px] font-normal text-[#8f6522]">{k.hi}</span>
        </span>
        {locked ? (
          <span className="flex items-center gap-1 text-[12px] text-[#8f6522]"><Lock className="h-3 w-3" /> ?/{k.max}</span>
        ) : (
          <span className="font-display text-[15px] text-[#3a1420]">{k.score}/{k.max}</span>
        )}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eadcc0]">
        {locked ? (
          <div className="shimmer h-full w-full" />
        ) : (
          <div className="h-full rounded-full bg-gradient-to-r from-[#8f6522] to-[#d9a94e] transition-[width] duration-700" style={{ width: `${Math.max(pct, 4)}%` }} />
        )}
      </div>
      <p className="mt-1.5 text-[12px] text-[#7a5560]">{k.meaning}</p>
    </li>
  );
}

function ReportView({ id }: { id: string }) {
  const { report, error, paying, unlocking, pay } = useAstroReport<MilanReport>(id, "milan");
  useReadTracking(report);

  if (unlocking) return <Analysing title="Poori milan report khul rahi hai" steps={["Payment ki pushti", "Aathon koot ka vivaran", "Dosh ki jaanch", "Rishte ka nishkarsh"]} />;
  if (!report) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        {error ? (
          <div>
            <p className="text-[#f1e3c8]">{error}</p>
            <Link href="/milan" className="btn-ghost mt-4">Naya milan karein</Link>
          </div>
        ) : (
          <ZodiacWheel size={150} />
        )}
      </div>
    );
  }

  const cap = (n: string) => { const f = n.split(/\s+/)[0]; return f.charAt(0).toUpperCase() + f.slice(1); };
  const a = cap(report.selfName);
  const b = cap(report.partnerName);

  const header = (
    <section>
      <ReportBanner src={HERO} kicker={report.paid ? "Sampoorn milan report" : "Gun milan taiyaar hai"} title={`${a} aur ${b}`} position="50% 70%" />
      <div className="glass mt-6 p-5 text-center">
        <ScoreRing score={report.total} />
        <p className="font-display mt-4 text-[1.35rem] text-[var(--ed-text)]">{report.band.label}</p>
        <p className="mx-auto mt-1 max-w-[320px] text-[14px] leading-relaxed text-[var(--ed-muted)]">{report.band.line}</p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-left text-[12px]">
        {[
          [a, report.self],
          [b, report.partner],
        ].map(([n, p]) => {
          const person = p as MilanReport["self"];
          return (
            <div key={n as string} className="glass px-3 py-2.5">
              <p className="truncate text-[13px] font-medium text-[#fbefd3]">{n as string}</p>
              <p className="text-[#d9c7a3]">{person.moonRashi} rashi</p>
              <p className="text-[#d9c7a3]">{person.nakshatra}</p>
            </div>
          );
        })}
      </div>
    </section>
  );

  if (!report.paid) {
    return (
      <>
        {header}
        <div className="mt-7 space-y-4">
          <PaperCard eyebrow="Ashtakoot milan" title="8 koot ka hisaab">
            <ul className="space-y-2">{report.koots!.map((k) => <KootRow key={k.key} k={k} />)}</ul>
            <p className="mt-3 text-[13px] text-[#7a5560]">Sabse bhaari 5 koot (36 me se 30 gun) poori report me khulenge.</p>
          </PaperCard>

          <PaperCard eyebrow="Poori report me" title={QUESTIONS.find((q) => q.value === report.question)!.label}>
            <ul className="space-y-2">
              <LockedRow title="Aapke sawal ka seedha jawab" hint={`${b} ke saath rishte ka nishkarsh`} />
              <LockedRow title="Nadi, Bhakoot aur Mangal dosh" hint={report.doshCount ? `${report.doshCount} dosh mile hain, vivaran aur upay` : "Teeno dosh ki poori jaanch"} />
              <LockedRow title="Rishte ki taakat aur kamzori" hint="Kahan mel hai, kahan savdhani chahiye" />
              <LockedRow title="Sabse anukool samay" hint="Baat aage badhane ke shubh mahine" />
              <LockedRow title="Saral upay" hint="Dosh nivaran aur rishte ki majbooti ke liye" />
            </ul>
          </PaperCard>
          <p className="px-1 text-center text-[12px] leading-relaxed text-[#d9c7a3]">{report.basisNote}</p>
          <ErrorNote message={error} />
        </div>
        <AstroFooter />
        <PayBar price={report.price} label="Poori milan report kholein" sub="Razorpay se surakshit · UPI, card · Turant khulegi" busy={paying} onPay={pay} />
      </>
    );
  }

  const s = report.sections!;
  const n = report.narrative;
  return (
    <>
      {header}
      <div className="mt-7 space-y-4">
        <PaperCard eyebrow={QUESTIONS.find((q) => q.value === report.question)!.label} title={s.verdict.line}>
          {n?.summary && <p className="text-[14px] leading-relaxed text-[#3a1420]">{n.summary}</p>}
        </PaperCard>

        <PaperCard eyebrow="Ashtakoot milan" title="8 koot ka poora hisaab">
          <ul className="space-y-2">{s.koots.map((k) => <KootRow key={k.key} k={k} />)}</ul>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-[12px]">
            {([["Yoni", s.pair.yoni], ["Gana", s.pair.gana], ["Nadi", s.pair.nadi]] as const).map(([label, pair]) => (
              <div key={label} className="rounded-xl bg-[#fffaf0] px-2 py-2 ring-1 ring-[#e6d6b6]">
                <dt className="font-semibold uppercase tracking-[0.1em] text-[#8f6522]">{label}</dt>
                <dd className="mt-0.5 text-[#3a1420]">{pair[0]} · {pair[1]}</dd>
              </div>
            ))}
          </dl>
        </PaperCard>

        <PaperCard eyebrow="Dosh ki jaanch" title="Teen mukhya dosh">
          <ul className="space-y-2.5">
            {s.doshas.map((d) => (
              <li key={d.name} className={`rounded-xl px-3.5 py-3 ring-1 ${d.present ? "bg-[#fdf1e7] ring-[#e7b98a]" : "bg-[#f1f7ec] ring-[#bfd6ad]"}`}>
                <p className="flex items-center gap-2 text-[14px] font-semibold text-[#3a1420]">
                  {d.present ? <AlertTriangle className="h-4 w-4 text-[#b9641c]" /> : <CheckCircle2 className="h-4 w-4 text-[#4f8a35]" />}
                  {d.name}: {d.present ? "hai" : "nahi hai"}
                </p>
                <p className="mt-1 text-[13px] leading-relaxed text-[#5a3a44]">{d.text}</p>
              </li>
            ))}
          </ul>
        </PaperCard>

        <PaperCard eyebrow="Rishte ki taakat">
          {n?.bond && <p className="text-[14px] leading-relaxed text-[#3a1420]">{n.bond}</p>}
          {s.strengths.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {s.strengths.map((t) => <li key={t} className="flex gap-2 text-[13px] text-[#3a1420]"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4f8a35]" />{t}</li>)}
            </ul>
          )}
        </PaperCard>

        <PaperCard eyebrow="Kahan savdhani chahiye">
          {n?.caution && <p className="text-[14px] leading-relaxed text-[#3a1420]">{n.caution}</p>}
          {s.challenges.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {s.challenges.map((t) => <li key={t} className="flex gap-2 text-[13px] text-[#3a1420]"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#b9641c]" />{t}</li>)}
            </ul>
          )}
        </PaperCard>

        <PaperCard eyebrow="Anukool samay" title={s.timing.both ?? s.timing.self}>
          <p className="text-[13px] text-[#7a5560]">
            {s.timing.both ? "Is dauraan dono ki kundli me vivah ke yog ek saath sakriya hain." : `${a} ki kundli me is dauraan vivah aur rishton ke yog sakriya hain.`}
          </p>
          <dl className="mt-3 grid gap-2 text-[13px]">
            <div className="flex justify-between gap-3 rounded-xl bg-[#fffaf0] px-3 py-2 ring-1 ring-[#e6d6b6]"><dt className="text-[#7a5560]">{a}</dt><dd className="text-right font-medium text-[#3a1420]">{s.timing.self}</dd></div>
            {s.timing.partner && <div className="flex justify-between gap-3 rounded-xl bg-[#fffaf0] px-3 py-2 ring-1 ring-[#e6d6b6]"><dt className="text-[#7a5560]">{b}</dt><dd className="text-right font-medium text-[#3a1420]">{s.timing.partner}</dd></div>}
          </dl>
          {n?.advice && <p className="mt-3 text-[14px] leading-relaxed text-[#3a1420]">{n.advice}</p>}
        </PaperCard>

        <PaperCard eyebrow="Upay" title="Rishte ko majboot karein">
          <ul className="space-y-2">
            {s.upay.map((u) => <li key={u} className="flex gap-2.5 text-[14px] leading-relaxed text-[#3a1420]"><Star className="mt-1 h-3.5 w-3.5 shrink-0 fill-[#c9973f] text-[#c9973f]" />{u}</li>)}
          </ul>
        </PaperCard>

        <p className="px-1 text-center text-[12px] leading-relaxed text-[#d9c7a3]">{s.basisNote}</p>

        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            logAstro("astro_report_action", "milan", { report_id: report.id, action: "share" });
            shareOnWhatsApp(`${a} aur ${b} ke 36 me se ${report.total} gun mile ✨\nApna gun milan dekho: ${window.location.origin}/milan`);
          }}
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp par share karein
        </button>
        <Link href="/milan" className="btn-ghost w-full" onClick={() => logAstro("astro_report_action", "milan", { report_id: report.id, action: "milan_again" })}>Kisi aur ke saath milan karein</Link>
        <AskMoreCard type="milan" reportId={report.id} />
      </div>
      <AstroFooter />
    </>
  );
}
