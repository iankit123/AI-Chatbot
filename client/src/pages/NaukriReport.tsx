import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { ArrowRight, Check, Lock, Sparkles } from "lucide-react";
import {
  Analysing, AstroFooter, Bullets, ErrorNote, Faq, LevelMeter, LockedRow, PaperCard, PayBar, Segmented, ZodiacWheel,
} from "@/components/astro/ui";
import {
  EditorialShell, FactorList, NumberedList, PhotoHero, ReflectionCard, ReportBanner, SectionHead, StepHead, TrustLine,
} from "@/components/astro/editorial";
import { SelfFields, useSelfForm } from "@/components/astro/forms";
import { useAstroReport, useReadTracking } from "@/components/astro/useReport";
import { AskMoreCard, BuyerPhoneGate, PaidReportBanner } from "@/components/astro/paid";
import {
  cacheReport, createNaukriPreview, lastReportId, logAstro, rememberReport, saveSelf, trackAstro, wait,
  type NaukriReport, type NaukriStatus, type NaukriTarget,
} from "@/lib/astroApi";

export default function NaukriReportPage() {
  const [, params] = useRoute("/naukri/r/:id");
  useEffect(() => {
    document.title = "Sarkari naukri kab lagegi? | puchlo.in";
  }, []);
  return (
    <EditorialShell theme="naukri">
      {params?.id ? <ReportView key={params.id} id={params.id} /> : <Landing />}
    </EditorialShell>
  );
}

const HERO = "/astro/naukri-hero.webp";

const STATUSES: { value: NaukriStatus; label: string }[] = [
  { value: "taiyari", label: "Taiyari kar raha/rahi hun" },
  { value: "result", label: "Exam/interview de diya, result ka intezaar" },
  { value: "private", label: "Private ya samvida naukri me hun" },
  { value: "attempts", label: "Kai baar koshish ki, ab tak nahi lagi" },
];

const TARGETS: { value: NaukriTarget; label: string }[] = [
  { value: "railway", label: "Railway" },
  { value: "ssc_bank", label: "SSC / Bank" },
  { value: "police_army", label: "Police / Army" },
  { value: "teacher", label: "Teacher" },
  { value: "upsc_pcs", label: "UPSC / PCS" },
  { value: "open", label: "Abhi tay nahi" },
];

/**
 * Hero copy variants, picked with ?h=a|b|c so different ads can land on different headlines.
 * The variant is sent with the landing and form events for comparison. All three are the words
 * people type in our chats: "kab lagegi" (most common), "lagegi ya nahi", "kis saal".
 */
type HeroVariant = { title: [string, string]; tag: string; sub: string };
const HERO_VARIANTS: Record<string, HeroVariant> = {
  a: {
    title: ["सरकारी नौकरी", "कब लगेगी?"],
    tag: "Jaaniye jawab, apni date of birth se",
    sub: "Kundli me sarkari naukri ka yog hai ya nahi, kis saal aur kin mahino me, aur kaun si naukri aapke liye bani hai.",
  },
  b: {
    title: ["क्या मेरी सरकारी", "नौकरी लगेगी?"],
    tag: "Jaaniye jawab, apni date of birth se",
    sub: "Aapki kundli ke sarkari yog, naukri lagne ka samay, aur Railway, Police, Bank ya Teacher me se kaun sa raasta aapke liye hai.",
  },
  c: {
    title: ["सरकारी नौकरी", "किस साल लगेगी?"],
    tag: "Saal aur mahine, apni date of birth se",
    sub: "Aane wale 4 saal ki dasha se jaaniye pehla mauka kab hai, sabse prabal samay kab hai, aur tab tak kya karein.",
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

/** What the report actually reads from the chart (see analyseSarkari in engine.ts). */
const FACTORS = [
  { img: "/astro/k-sun.webp", name: "Surya", en: "Sun", text: "Sarkar aur pad ka karak. Surya kis bhaav me hai aur kitna bali hai, isse sarkari yog dikhta hai." },
  { img: "/astro/k-office.webp", name: "Dasham bhaav", en: "10th house", text: "Karm ka ghar. Iske swami ki sthiti batati hai ki kaam kis disha me aur kab banega." },
  { img: "/astro/k-exam.webp", name: "Chhatha bhaav", en: "6th house", text: "Naukri aur pratiyogita ka ghar. Pariksha me doosron se aage nikalne ki shakti yahin se." },
  { img: "/astro/k-saturn.webp", name: "Shani aur dasha", en: "Saturn, Vimshottari", text: "Shani pakki naukri ke karak hain. Dasha aur sade sati se naukri lagne ka samay nikalta hai." },
];

const REFLECT = [
  "Kya main wahi pariksha de raha/rahi hun jo mere liye bani hai, ya sirf sab de rahe hain isliye?",
  "Pichhli baar number kahan kate: padhai me, speed me, ya ghabrahat me?",
  "Is saal na hua, to mera Plan B kya hai?",
];

function Landing() {
  const [, navigate] = useLocation();
  const self = useSelfForm();
  const [status, setStatus] = useState<NaukriStatus>("taiyari");
  const [target, setTarget] = useState<NaukriTarget | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const last = useRef(lastReportId("naukri")).current;
  const heroKey = useRef(heroVariantKey()).current;
  const hero = HERO_VARIANTS[heroKey];

  useEffect(() => {
    trackAstro("astro_landing", "naukri", { h: heroKey });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = !target ? "Kripya chunein ki kis naukri ki taiyari hai (pata na ho to 'Abhi tay nahi')." : self.error();
    if (problem) return setError(problem);
    setError(null);
    setBusy(true);
    window.scrollTo({ top: 0 });
    const me = self.value();
    trackAstro("astro_form_submitted", "naukri", { status, target, h: heroKey });
    try {
      const [report] = await Promise.all([createNaukriPreview({ ...me, status, target: target as NaukriTarget }), wait(5200)]);
      saveSelf(me);
      rememberReport("naukri", report.id);
      cacheReport(report);
      navigate(`/naukri/r/${report.id}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Kuch gadbad ho gayi. Dobara koshish karein.");
    }
  };

  if (busy) {
    return (
      <Analysing
        title="Aapki kundli dekhi ja rahi hai"
        steps={["Dasham bhaav (karm) aur uske swami", "Surya: sarkar ka karak", "Chhatha bhaav: pratiyogita", "Shani ki sthiti aur sade sati", "Aane wali dasha me naukri ka samay"]}
      />
    );
  }

  return (
    <>
      <PhotoHero
        src={HERO}
        alt="Shaam ki roshni me ghar ke darwaze par maa apne bete ko laddu khila rahi hai, bete ke haath me lifafa hai"
        ornament={<ZodiacWheel size={220} className="absolute -right-16 top-4 opacity-[0.2]" />}
        kicker="Naukri Jyotish · Dasham bhaav"
        title={
          <>
            {hero.title[0]}
            <br />
            {hero.title[1]}
          </>
        }
        tagline={hero.tag}
        sub={hero.sub}
        position="50% 100%"
      >
        <button type="button" className="btn-gold mt-6" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          Check kariye <ArrowRight className="h-4 w-4" />
        </button>
        <TrustLine items={["Saal aur mahine ke saath", "Janm samay na pata ho tab bhi", "Koi 'setting' ya totka nahi"]} />
        {last && (
          <Link href={`/naukri/r/${last}`} className="mt-3 inline-block text-[13px] text-[var(--ed-accent)] underline underline-offset-4">
            Pichhli report dobara kholein
          </Link>
        )}
      </PhotoHero>

      <div className="mt-8"><PaidReportBanner type="naukri" /></div>

      <div ref={formRef} className="scroll-mt-4 pt-10">
        <form onSubmit={submit} noValidate className="paper rise space-y-6 p-5">
          <div>
            <StepHead n={1} title="Abhi kya sthiti hai?" />
            <Segmented cols={1} value={status} onChange={setStatus} options={STATUSES} />
          </div>
          <div className="border-t border-[#e4dde8] pt-6">
            <StepHead n={2} title="Kis naukri ki taiyari?" sub="Report batayegi ki kundli kis kshetra ke anukool hai" />
            <Segmented cols={2} value={target} onChange={setTarget} options={TARGETS} />
          </div>
          <div className="border-t border-[#e4dde8] pt-6">
            <StepHead n={3} title="Aapki kundli" sub="Janm ki jaankari, jitni pata ho" />
            <SelfFields form={self} id="nk" />
          </div>
          <ErrorNote message={error} />
          <div>
            <button type="submit" className="btn-gold">
              <Sparkles className="h-4 w-4" /> Mera jawab dekhein
            </button>
            <p className="ink-soft mt-2 text-center text-[12px]">Aapki kundli ke sarkari yog turant dikhenge.</p>
          </div>
        </form>
      </div>

      <section className="pt-14">
        <SectionHead
          kicker="Kundli me kya dekha jaata hai"
          title="Jawab andaaze se nahi, aapki kundli se"
          sub="Sarkari naukri ke liye jyotish me yeh chaar baatein sabse pehle dekhi jaati hain."
        />
        <FactorList items={FACTORS} />
      </section>

      <section className="pt-14">
        <SectionHead kicker="Poori report" title="Report me kya milega" />
        <NumberedList
          items={[
            { title: "Sarkari naukri ka yog", text: "Prabal, madhyam ya mehnat se. Aapki kundli ke asli yogon ke naam ke saath." },
            { title: "Kis saal, kin mahino me", text: "Aane wale 4 saal me pehla mauka aur sabse prabal samay, mahine ke saath." },
            { title: "Kaun si naukri aapke liye", text: "Railway, Police-Army, SSC-Bank, Teacher ya Prashasan: kundli kis taraf jhukti hai." },
            { title: "Rukavat aur upay", text: "Shani ki sade sati, kamzor graha, aur ghar par karne wale saral, muft upay." },
          ]}
        />
      </section>

      <section className="pt-14">
        <ReflectionCard
          title="Agle form se pehle, khud se poochhiye"
          questions={REFLECT}
          footer="Kundli samay aur disha batati hai. Mehnat aapki hai. Dono milte hain tabhi naukri lagti hai."
        />
      </section>

      <section className="pt-14">
        <SectionHead title="Aksar puche jaane wale sawal" />
        <Faq
          items={[
            { q: "Janm samay nahi pata, to?", a: "Sirf janm tithi aur sthan se bhi report ban jaati hai. Tab bhaav Chandra lagna se dekhe jaate hain. Samay pata ho to jawab zyada sateek hota hai." },
            { q: "Kya yeh pakka batata hai ki naukri lagegi?", a: "Nahi. Jyotish yog aur anukool samay batata hai, guarantee nahi. Mehnat aur sahi samay par sahi form, dono zaroori hain." },
            { q: "Kya aap naukri lagwane ka upay ya 'setting' karte hain?", a: "Bilkul nahi. Naukri lagwane ke naam par paisa maangne wale dhokhebaaz hote hain. Yahan sirf kundli ka vishleshan aur muft, saral upay hain." },
            { q: "Agar kundli me sarkari yog kam hue to?", a: "Report yeh bhi saaf batati hai, aur bataati hai ki kaun sa kshetra aapke liye zyada anukool hai, taaki aapki mehnat sahi jagah lage." },
          ]}
        />
      </section>
      <AstroFooter />
    </>
  );
}

function ChartFacts({ report }: { report: NaukriReport }) {
  const rows: [string, string][] = [
    ["Lagna", report.chart.lagna ?? "Chandra lagna"],
    ["Chandra rashi", report.chart.moonRashi],
    ["Nakshatra", report.chart.nakshatra],
    ["Abhi ki dasha", report.dasha.replace(/ \(.*\)$/, "")],
  ];
  return (
    <dl className="mt-4 grid grid-cols-2 gap-2 text-left">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-[var(--ed-line)] px-3 py-2">
          <dt className="text-[11px] uppercase tracking-[0.12em] text-[var(--ed-muted)]">{k}</dt>
          <dd className="mt-0.5 text-[13.5px] font-medium leading-snug text-[var(--ed-text)]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 rounded-xl bg-[#f6f3f8] px-3 py-2 ring-1 ring-[#e4dde8]">
      <dt className="ink-soft">{k}</dt>
      <dd className="ink text-right font-medium">{v}</dd>
    </div>
  );
}

const STATUS_ROW: Record<NaukriStatus, { title: string; hint: string }> = {
  taiyari: { title: "Taiyari ka sahi samay", hint: "Kin mahino ke form chhootne nahi chahiye" },
  result: { title: "Is result ke sanket", hint: "Abhi ki dasha result ke liye kaisi hai" },
  private: { title: "Pakki sarkari naukri kab", hint: "Private ya samvida se sarkari tak" },
  attempts: { title: "Baar baar kyon atak rahe hain", hint: "Kundli me rukavat ki asli wajah" },
};

function ReportView({ id }: { id: string }) {
  const { report, error, paying, unlocking, pay, reload } = useAstroReport<NaukriReport>(id, "naukri");
  useReadTracking(report);

  if (unlocking) return <Analysing title="Aapka poora jawab khul raha hai" steps={["Payment ki pushti", "Naukri ka saal aur mahine", "Aapke liye sahi kshetra", "Rukavat aur upay"]} />;
  if (!report) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        {error ? (
          <div>
            <p className="text-[var(--ed-text)]">{error}</p>
            <Link href="/naukri" className="btn-ghost mt-4">Nayi report banayein</Link>
          </div>
        ) : (
          <ZodiacWheel size={150} />
        )}
      </div>
    );
  }

  const header = (
    <ReportBanner src={HERO} kicker={report.paid ? "Aapka poora jawab" : "Aapki kundli taiyaar hai"} title={`${report.name}, sarkari naukri ka jawab`} position="50% 62%" />
  );

  if (!report.paid) {
    const hidden = Math.max(0, report.yogCount - 1);
    return (
      <>
        {header}
        <div className="mt-6 space-y-4">
          <section className="glass rise p-5">
            <p className="text-[12px] uppercase tracking-[0.16em] text-[var(--ed-accent)]">Aapki kundli me</p>
            {report.yogCount > 0 ? (
              <>
                <p className="mt-2 text-[var(--ed-text)]">
                  <span className="font-display text-[3rem] leading-none">{report.yogCount}</span>
                  <span className="ml-2 text-[1.15rem]">sarkari {report.yogCount === 1 ? "yog mila" : "yog mile"}</span>
                </p>
                <ul className="mt-4 space-y-2">
                  {report.firstYog && (
                    <li className="flex items-center gap-2.5 text-[14.5px] text-[var(--ed-text)]">
                      <Check className="h-4 w-4 shrink-0 text-[var(--ed-accent)]" strokeWidth={2.5} /> {report.firstYog}
                    </li>
                  )}
                  {Array.from({ length: Math.min(hidden, 4) }, (_, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-[14.5px] text-[var(--ed-muted)]">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      <span className="blur-lock">Kundli ka sarkari yog</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[15px] leading-relaxed text-[var(--ed-text)]">
                Seedhe sarkari yog kam mile, par aane wali dasha me naukri ke samay ban rahe hain.
              </p>
            )}
            <ChartFacts report={report} />
          </section>

          <PaperCard eyebrow="Aapka sawal" title="Sarkari naukri kab lagegi?">
            <div className="relative">
              <div className="blur-lock">
                <p className="ink-soft text-[12px]">Sabse anukool samay</p>
                <p className="ink font-display text-[1.7rem] leading-tight">March se August 2027</p>
                <div className="mt-2"><LevelMeter level={2} labels={["Mehnat se", "Madhyam", "Prabal"]} /></div>
              </div>
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-[var(--ink)] text-[var(--ed-accent)] shadow-lg"><Lock className="h-4 w-4" /></span>
              </div>
            </div>
            <p className="ink-soft mt-3 text-[13px] leading-relaxed">
              {report.hasWindow === false
                ? "Jawab taiyaar hai. Aapki abhi ki dasha aur aane wale saalon ki dasha dekhkar nikala gaya hai."
                : "Saal aur mahine taiyaar hain. Aapki abhi ki dasha aur aane wale 4 saal ki dasha dekhkar nikale gaye hain."}
            </p>
          </PaperCard>

          <PaperCard eyebrow="Poori report me" title="Yeh sab khulega">
            <ul className="space-y-2">
              <LockedRow title="Kis saal aur kin mahino me" hint="Pehla mauka aur sabse prabal samay" />
              <LockedRow title="Kaun si naukri aapke liye" hint="Railway, Police, Bank, Teacher ya Prashasan" />
              <LockedRow title={STATUS_ROW[report.status].title} hint={STATUS_ROW[report.status].hint} />
              {!!report.obstacleCount && <LockedRow title={`Rukavat: ${report.obstacleCount} mili`} hint="Shani, dasha aur kamzor graha" />}
              <LockedRow title="Saral upay" hint="Ghar par karne wale, bina kharch ke" />
            </ul>
          </PaperCard>
          <p className="px-1 text-center text-[12px] leading-relaxed text-[var(--ed-muted)]">
            {report.chart.timeKnown
              ? "Yeh report aapke janm samay, tithi aur sthan se bani lagna kundli par aadharit hai."
              : "Janm samay na hone se bhaav Chandra lagna se dekhe gaye hain. Samay pata ho to jawab aur sateek hota hai."}
          </p>
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
          <BuyerPhoneGate type="naukri" reportId={report.id} onSaved={reload} />
        </div>
      </>
    );
  }

  const s = report.sections!;
  const n = report.narrative;
  const when = s.timing.best ?? s.timing.first;
  const toBusiness = s.meter === 1 || report.status === "private";
  return (
    <>
      {header}
      <div className="mt-6 space-y-4">
        <PaperCard eyebrow="Sarkari naukri ke yog" title={s.level.label}>
          <LevelMeter level={s.meter} labels={["Mehnat se", "Madhyam", "Prabal"]} />
          <p className="ink mt-4 text-[14px] leading-relaxed">{n?.summary ?? s.level.line}</p>
        </PaperCard>

        <PaperCard eyebrow="Kab lagegi" title={when ?? "Aane wala samay"}>
          <dl className="grid gap-2 text-[13px]">
            {s.timing.first && <Row k="Pehla anukool samay" v={s.timing.first} />}
            {s.timing.best && <Row k="Sabse prabal samay" v={s.timing.best} />}
            {s.timing.bestDasha && <Row k="Us samay ki dasha" v={s.timing.bestDasha} />}
            <Row k="Abhi ki dasha" v={s.timing.dasha} />
          </dl>
          {s.timing.jupiter && <p className="ink mt-3 text-[13.5px] leading-relaxed">{s.timing.jupiter}</p>}
          <p className="ink mt-3 text-[14px] leading-relaxed">{n?.timing ?? s.timing.now}</p>
          {s.timing.others.length > 0 && <p className="ink-soft mt-3 text-[13px]">Aur mauke: {s.timing.others.join(", ")}</p>}
        </PaperCard>

        <PaperCard eyebrow="Kaun si naukri aapke liye" title={s.fields[0]?.field ?? "Sarkari seva"}>
          <ul className="space-y-2.5">
            {s.fields.map((f, i) => (
              <li key={f.field} className="rounded-xl bg-[#f6f3f8] px-3.5 py-3 ring-1 ring-[#e4dde8]">
                <p className="ink text-[14.5px] font-semibold">{i + 1}. {f.field} <span className="ink-soft text-[12px] font-normal">· {f.planet}</span></p>
                <p className="ink-soft mt-0.5 text-[13px] leading-relaxed">{f.exams}</p>
              </li>
            ))}
          </ul>
          <p className="ink mt-3 text-[14px] leading-relaxed">{s.target.note}</p>
          {n?.field && <p className="ink mt-3 border-t border-[#e4dde8] pt-3 text-[14px] leading-relaxed">{n.field}</p>}
        </PaperCard>

        {s.yogas.length > 0 && (
          <PaperCard eyebrow="Kundli ke sarkari yog" title={`${s.yogas.length} ${s.yogas.length === 1 ? "yog mila" : "yog mile"}`}>
            <ul className="space-y-3">
              {s.yogas.map((y) => (
                <li key={y.key} className="flex gap-2.5">
                  <Check className="mt-1 h-4 w-4 shrink-0 text-[#4f8a35]" strokeWidth={2.5} />
                  <span>
                    <span className="ink block text-[14.5px] font-semibold">{y.name}</span>
                    <span className="ink-soft block text-[13px] leading-relaxed">{y.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </PaperCard>
        )}

        <PaperCard eyebrow="Aapki sthiti" title={s.status.title}>
          <p className="ink text-[14px] leading-relaxed">{s.status.text}</p>
        </PaperCard>

        <PaperCard eyebrow="Pariksha aur pratiyogita" title={s.competition.label}>
          <p className="ink text-[14px] leading-relaxed">{s.competition.text}</p>
        </PaperCard>

        <PaperCard eyebrow="Rukavat" title={s.shani?.title ?? (s.obstacles.length ? "Kya rok raha hai" : "Koi badi rukavat nahi")}>
          {s.obstacles.length > 0 ? <Bullets items={s.obstacles} tone="no" /> : <p className="ink text-[14px] leading-relaxed">Aapki kundli me naukri ko rokne wala koi bada dosh nahi dikhta. Samay aur sahi kshetra par dhyaan dein.</p>}
          {s.shani && <p className="ink mt-3 border-t border-[#e4dde8] pt-3 text-[14px] leading-relaxed">{s.shani.text}</p>}
        </PaperCard>

        <PaperCard eyebrow="Ab kya karein" title="Taiyari ke saath yeh dhyaan rakhein">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4f8a35]">Yeh karein</p>
          <div className="mt-1.5"><Bullets items={s.doList} tone="yes" /></div>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b9441c]">Yeh na karein</p>
          <div className="mt-1.5"><Bullets items={s.dontList} tone="no" /></div>
          {n?.advice && <p className="ink mt-3 border-t border-[#e4dde8] pt-3 text-[14px] leading-relaxed">{n.advice}</p>}
        </PaperCard>

        <PaperCard eyebrow="Upay" title="Naukri ke yog majboot karne ke liye">
          <Bullets items={s.upay} />
          <p className="ink-soft mt-3 text-[13px]">Pariksha/interview ke liye shubh din: <b className="ink">{s.luck.day}</b> · shubh rang: <b className="ink">{s.luck.colour}</b></p>
        </PaperCard>

        <PaperCard eyebrow="Kundli ka saar">
          <dl className="grid gap-2 text-[13px]">{s.snapshot.map((r) => <Row key={r.label} k={r.label} v={r.value} />)}</dl>
        </PaperCard>
        <p className="px-1 text-center text-[12px] leading-relaxed text-[var(--ed-muted)]">{s.basisNote}</p>

        <ReflectionCard
          title="Agle form se pehle, khud se poochhiye"
          questions={REFLECT}
          footer="Kundli samay aur disha batati hai. Mehnat aapki hai, aur wahi sabse bada yog hai."
        />

        {toBusiness ? (
          <section className="glass p-5 text-center">
            <h2 className="text-[1.4rem] leading-snug text-[var(--ed-text)]">Saath me apna kaam bhi?</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ed-muted)]">Apni kundli se jaaniye kaun sa business aapke liye shubh hai, aapke budget me, bina poonji wale vikalp bhi.</p>
            <Link href="/business" className="btn-gold mt-4" onClick={() => logAstro("astro_report_action", "naukri", { report_id: report.id, action: "business_cta" })}>Business yog dekhein</Link>
          </section>
        ) : (
          <section className="glass p-5 text-center">
            <h2 className="text-[1.4rem] leading-snug text-[var(--ed-text)]">Aapki shaadi kab aur kisse hogi?</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-[var(--ed-muted)]">Apni kundli se vivah ka samay aur jeevansathi ke naam ka pehla akshar jaaniye.</p>
            <Link href="/shaadi" className="btn-gold mt-4" onClick={() => logAstro("astro_report_action", "naukri", { report_id: report.id, action: "shaadi_cta" })}>Shaadi ka yog dekhein</Link>
          </section>
        )}
        <AskMoreCard type="naukri" reportId={report.id} />
      </div>
      <AstroFooter />
    </>
  );
}
