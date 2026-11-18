import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { Camera, Compass, Heart, Lock, MapPin, MessageCircle, Sparkles, Star, X } from "lucide-react";
import {
  Analysing, AstroFooter, AstroShell, CITY_HINTS, DateSelect, ErrorNote, Faq, LockedRow, PaperCard, PayBar,
  Segmented, Steps, TimeSelect, ZodiacWheel,
} from "@/components/astro/ui";
import { EditorialShell } from "@/components/astro/editorial";
import { PartnerSilhouette } from "@/components/astro/partnerSilhouette";
import { QuizLanding } from "@/components/astro/quizFlow";
import { ShaadiQuizPaywall } from "@/components/astro/quizPaywalls";
import {
  cacheReport, compressImage, createShaadiPreview, lastReportId, loadSelf, logAstro,
  portraitUrl, rememberReport, requestPortrait, saveSelf, shaadiFlow, shareOnWhatsApp, trackAstro, wait,
  type Gender, type ShaadiReport,
} from "@/lib/astroApi";
import { useAstroReport, useReadTracking } from "@/components/astro/useReport";
import { AskMoreCard, BuyerPhoneGate, PaidReportBanner } from "@/components/astro/paid";

/**
 * /shaadi has three flows (SHAADI_QUIZ test in shared/astroProducts.ts): the classic page below, the
 * Shaadi quiz flow, and the problem picker that branches into any report's quiz flow
 * (components/astro/quizFlow.tsx). A report keeps the look of the flow it was made in.
 */
export default function ShaadiReportPage() {
  const [, params] = useRoute("/shaadi/r/:id");
  const flow = useRef(shaadiFlow()).current;
  useEffect(() => {
    document.title = "Shaadi kab hogi aur kisse? | puchlo.in";
  }, []);
  if (params?.id) return <ReportView key={params.id} id={params.id} guess={flow} />;
  return <Frame quiz={flow !== "classic"}>{flow === "classic" ? <Landing /> : <QuizLanding entry={flow} />}</Frame>;
}

function Frame({ quiz, children }: { quiz: boolean; children: ReactNode }) {
  return quiz ? <EditorialShell theme="shaadi">{children}</EditorialShell> : <AstroShell tagline="Vivah Jyotish">{children}</AstroShell>;
}

// ---------------------------------------------------------------- landing + form

function SampleCard() {
  return (
    <div className="paper mx-auto w-full max-w-[330px] rotate-[-1.5deg] p-4">
      <div className="flex gap-4">
        <div className="relative h-[104px] w-[86px] shrink-0 overflow-hidden rounded-xl ring-1 ring-[#c9973f]/60">
          <PartnerSilhouette className="h-full w-full scale-110 blur-[3.5px]" />
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[rgba(58,20,32,0.82)] text-[#f6e2b3]"><Lock className="h-3.5 w-3.5" /></span>
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f6522]">Vivah ka yog</p>
          <p className="font-display text-[1.7rem] leading-tight text-[#3a1420]">2027</p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8f6522]">Naam ka pehla akshar</p>
          <div className="mt-1 flex items-end gap-1">
            {["R", "?", "?", "?"].map((l, i) => (
              <span key={i} className="flex items-end gap-1">
                <span className={`letter-tile !aspect-auto h-8 w-8 !rounded-lg !text-base ${i ? "locked" : ""}`}>{l}</span>
                {i < 3 && <span className="font-display text-[#8f6522]">{i === 2 ? <span className="text-[10px] font-semibold">ya</span> : ","}</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
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
  const [palm, setPalm] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const last = useRef(lastReportId("shaadi")).current;

  useEffect(() => {
    trackAstro("astro_landing", "shaadi", { flow: "classic" });
  }, []);

  const onPalm = async (file?: File) => {
    if (!file) return;
    try {
      setPalm(await compressImage(file));
    } catch {
      setError("Photo load nahi ho payi. Dobara koshish karein ya bina photo ke aage badhein.");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Kripya apna naam likhein.");
    if (!gender) return setError("Kripya ling chunein.");
    if (!dob) return setError("Kripya janm tithi (din, mahina, saal) chunein.");
    if (place.trim().length < 2) return setError("Kripya janm sthan likhein.");
    setError(null);
    setBusy(true);
    window.scrollTo({ top: 0 });
    const self = { name: name.trim(), gender, dob, tob, place: place.trim() };
    trackAstro("astro_form_submitted", "shaadi", { flow: "classic", has_time: !!tob, has_palm: !!palm });
    try {
      const [report] = await Promise.all([createShaadiPreview(self, palm), wait(5200)]);
      saveSelf(self);
      rememberReport("shaadi", report.id);
      cacheReport(report);
      navigate(`/shaadi/r/${report.id}`);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Kuch gadbad ho gayi. Dobara koshish karein.");
    }
  };

  if (busy) {
    return (
      <Analysing
        title="Aapki kundli ban rahi hai"
        steps={[
          "Graha sthiti ki ganana",
          "Lagna aur Chandra rashi",
          "Saptam bhaav ka vishleshan",
          "Vimshottari dasha ka samay",
          ...(palm ? ["Hast rekha ka adhyayan"] : []),
          "Jeevansathi ke sanket",
        ]}
      />
    );
  }

  return (
    <>
      <PaidReportBanner type="shaadi" />
      <section className="rise pt-3 text-center">
        <div className="relative mx-auto mb-[-92px] h-[150px] w-[150px] opacity-60">
          <ZodiacWheel size={150} />
        </div>
        <h1 className="font-hindi gold-text relative text-[2.35rem] leading-[1.25]">
          आपकी शादी कब होगी
          <br />
          और किससे?
        </h1>
        <p className="mx-auto mt-4 max-w-[330px] text-[15px] leading-relaxed text-[#e9d9bb]">
          Janm kundli se jaaniye vivah ka samay, jeevansathi ke naam ka pehla akshar aur unki ek jhalak.
        </p>
        <div className="mt-7">
          <SampleCard />
        </div>
        <button type="button" className="btn-gold mt-8" onClick={() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          <Sparkles className="h-4 w-4" /> Apni kundli dekhein
        </button>
        {last && (
          <Link href={`/shaadi/r/${last}`} className="mt-3 inline-block text-[13px] text-[#ecc97f] underline underline-offset-4">
            Pichhli report dobara kholein
          </Link>
        )}
        <div className="mt-6 grid grid-cols-3 gap-2 text-[11px] leading-snug text-[#d9c7a3]">
          {[
            [Star, "Lahiri ayanamsa se sateek ganana"],
            [Compass, "Vimshottari dasha aur Guru gochar"],
            [Lock, "Aapki jaankari gopniya"],
          ].map(([Icon, text]) => {
            const I = Icon as typeof Star;
            return (
              <div key={text as string} className="glass px-2 py-3">
                <I className="mx-auto mb-1.5 h-4 w-4 text-[#ecc97f]" />
                {text as string}
              </div>
            );
          })}
        </div>
      </section>

      <div ref={formRef} className="scroll-mt-4 pt-9">
        <PaperCard eyebrow="Pehla kadam" title="Apna janm vivaran bharein">
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label className="label" htmlFor="sh-name">Aapka naam</label>
              <input id="sh-name" className="field" autoComplete="given-name" placeholder="Jaise: Rahul Sharma" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </div>
            <div>
              <span className="label">Ling</span>
              <Segmented value={gender} onChange={setGender} options={[{ value: "male", label: "Purush" }, { value: "female", label: "Mahila" }]} />
            </div>
            <div>
              <label className="label" htmlFor="sh-dob-day">Janm tithi</label>
              <DateSelect idPrefix="sh-dob" value={dob} onChange={setDob} />
            </div>
            <div>
              <span className="label">Janm samay</span>
              <TimeSelect value={tob} onChange={setTob} unknownLabel="Janm samay pata nahi (Chandra kundli se dekhenge)" />
            </div>
            <div>
              <label className="label" htmlFor="sh-place">Janm sthan</label>
              <input id="sh-place" className="field" list="astro-cities" placeholder="Jaise: Jaipur, Rajasthan" value={place} onChange={(e) => setPlace(e.target.value)} maxLength={80} />
              <datalist id="astro-cities">{CITY_HINTS.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <span className="label">Hatheli ki photo <span className="font-normal">(vaikalpik, hast rekha ke liye)</span></span>
              {palm ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#dcc9a6] bg-[#fffdf8] p-2">
                  <img src={palm} alt="Aapki hatheli" className="h-14 w-14 rounded-lg object-cover" />
                  <span className="flex-1 text-[13px] text-[#3a1420]">Photo jud gayi. Vivah rekha bhi dekhi jaayegi.</span>
                  <button type="button" aria-label="Photo hatayein" className="grid h-8 w-8 place-items-center rounded-full bg-[#f3e8d2] text-[#7a5560]" onClick={() => setPalm(null)}>
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#c9a96a] bg-[#fffaf0] px-3.5 py-3 text-[13px] text-[#7a5560]">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#4d1a2d] text-[#f6e2b3]"><Camera className="h-4 w-4" /></span>
                  Seedhe haath ki saaf photo lein. Photo save nahi hoti, sirf padhi jaati hai.
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPalm(e.target.files?.[0])} />
                </label>
              )}
            </div>
            <ErrorNote message={error} />
            <button type="submit" className="btn-gold">
              <Sparkles className="h-4 w-4" /> Meri shaadi ka yog dekhein
            </button>
            <p className="text-center text-[11px] text-[#7a5560]">Kundli aur naam ka pehla akshar turant dikhega.</p>
          </form>
        </PaperCard>
      </div>

      <section className="pt-10">
        <h2 className="gold-text mb-4 text-center text-2xl">Report me kya milega</h2>
        <Steps
          items={[
            { title: "Vivah ka samay", text: "Dasha aur Guru ke gochar se shaadi ke sabse prabal mahine." },
            { title: "Naam ke akshar", text: "Saptam bhaav ki rashi se jeevansathi ke naam ke 3-4 sambhavit pehle akshar." },
            { title: "Jeevansathi ki jhalak", text: "Roop, swabhav, kaam, disha, aur kundli ke aadhar par bana ek sketch." },
            { title: "Love ya arranged, Mangal dosh, upay", text: "Aapke vivah ka prakar, dosh ki jaanch aur saral upay." },
          ]}
        />
      </section>

      <section className="pt-10">
        <h2 className="gold-text mb-4 text-center text-2xl">Aksar puche jaane wale sawal</h2>
        <Faq
          items={[
            { q: "Yeh kaise nikala jaata hai?", a: "Aapki janm tithi, samay aur sthan se grahon ki sthiti nikali jaati hai (Lahiri ayanamsa). Phir saptam bhaav, uske swami, Vimshottari dasha aur Guru ke gochar se vivah ka samay aur jeevansathi ke sanket dekhe jaate hain." },
            { q: "Janm samay pata nahi ho to?", a: "Tab report Chandra kundli se banti hai. Vivah ka samay aur naam ke akshar phir bhi milte hain, bas lagna aadharit baatein thodi kam sateek hoti hain." },
            { q: "Kya yeh pakka hai?", a: "Jyotish sambhavna aur yog batata hai, guarantee nahi. Is report ko margdarshan ki tarah lein." },
            { q: "Payment ke baad report kahan milegi?", a: "Payment hote hi isi page par poori report khul jaati hai. Isi phone par yeh link dobara kholkar aap ise kabhi bhi dekh sakte hain." },
          ]}
        />
      </section>
      <AstroFooter />
    </>
  );
}

// ---------------------------------------------------------------- report (preview + paid)

/** Letter tiles separated by commas and a final "ya", so they read as alternatives and not as one word. */
function LetterRow({ tiles }: { tiles: React.ReactNode[] }) {
  return (
    <div className="flex items-end">
      {tiles.flatMap((tile, i) => [
        <div key={`t${i}`} className="min-w-0 flex-1 basis-0">{tile}</div>,
        i < tiles.length - 1 ? (
          <span key={`s${i}`} className="font-display w-6 shrink-0 pb-1 text-center text-[#8f6522]" aria-hidden>
            {i === tiles.length - 2 ? <span className="text-[12px] font-semibold">ya</span> : <span className="text-[1.7rem] leading-none">,</span>}
          </span>
        ) : null,
      ])}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fffaf0] px-3 py-2.5 ring-1 ring-[#e6d6b6]">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8f6522]">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-medium leading-snug text-[#3a1420]">{value}</dd>
    </div>
  );
}

function Portrait({ report }: { report: ShaadiReport }) {
  const [state, setState] = useState<"loading" | "ready" | "none">(report.hasPortrait ? "ready" : "loading");
  useEffect(() => {
    if (report.hasPortrait) return;
    let alive = true;
    requestPortrait(report.id).then((r) => alive && setState(r.ready ? "ready" : "none"));
    return () => {
      alive = false;
    };
  }, [report.id, report.hasPortrait]);
  return (
    <div className="mx-auto w-[210px]">
      <div className="relative aspect-[5/6] overflow-hidden rounded-2xl ring-1 ring-[#c9973f]/70 shadow-[0_18px_40px_-20px_rgba(58,20,32,0.8)]">
        {state === "ready" ? (
          <img src={portraitUrl(report.id)} alt="Kundli ke aadhar par jeevansathi ka sanketik sketch" className="h-full w-full object-cover" onError={() => setState("none")} />
        ) : state === "loading" ? (
          <div className="shimmer grid h-full w-full place-items-center px-4 text-center text-[12px] text-[#7a5560]">Sketch ban raha hai, 20-30 second lagenge…</div>
        ) : (
          <PartnerSilhouette variant={report.gender === "male" ? "woman" : "man"} className="h-full w-full scale-110 blur-[5px]" />
        )}
      </div>
      <p className="mt-2 text-center text-[11px] leading-snug text-[#7a5560]">
        Kundli ke lakshanon par bana sanketik chitra. Yeh kisi asli vyakti ki tasveer nahi hai.
      </p>
    </div>
  );
}

function ReportView({ id, guess }: { id: string; guess: "quiz" | "picker" | "classic" }) {
  const r = useAstroReport<ShaadiReport>(id, "shaadi");
  useReadTracking(r.report);
  // Before the report loads, assume this phone's own flow; then use the flow the report was made in.
  const quiz = r.report ? r.report.flow === "quiz" : guess !== "classic";
  return <Frame quiz={quiz}><ReportBody {...r} /></Frame>;
}

function ReportBody({ report, error, paying, unlocking, pay, reload }: ReturnType<typeof useAstroReport<ShaadiReport>>) {
  if (report?.flow === "quiz" && !report.paid && !unlocking) {
    return <ShaadiQuizPaywall report={report} error={error} paying={paying} onPay={pay} />;
  }

  if (unlocking) return <Analysing title="Aapki poori report khul rahi hai" steps={["Payment ki pushti", "Vivah ke mahine", "Naam ke sabhi akshar", "Jeevansathi ka vivaran"]} />;
  if (!report) {
    return (
      <div className="grid min-h-[60dvh] place-items-center text-center">
        {error ? (
          <div>
            <p className="text-[#f1e3c8]">{error}</p>
            <Link href="/shaadi" className="btn-ghost mt-4">Nayi report banayein</Link>
          </div>
        ) : (
          <ZodiacWheel size={150} />
        )}
      </div>
    );
  }

  const rawFirst = report.name.split(/\s+/)[0];
  const first = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);
  const who = report.gender === "male" ? "patni" : "pati";

  const header = (
    <section className="rise pt-2 text-center">
      <p className="chip mx-auto">{report.paid ? "Sampoorn vivah report" : "Aapki kundli taiyaar hai"}</p>
      <h1 className="gold-text mt-4 text-[1.9rem] leading-tight">{first} ji, {report.headline.charAt(0).toLowerCase() + report.headline.slice(1)}</h1>
      <div className="mt-5 flex flex-wrap justify-center gap-2 text-[12px]">
        {report.chart.lagna && <span className="glass px-3 py-1.5">Lagna: <b className="font-semibold text-[#fbefd3]">{report.chart.lagna}</b></span>}
        <span className="glass px-3 py-1.5">Rashi: <b className="font-semibold text-[#fbefd3]">{report.chart.moonRashi}</b></span>
        <span className="glass px-3 py-1.5">Nakshatra: <b className="font-semibold text-[#fbefd3]">{report.chart.nakshatra}</b></span>
      </div>
    </section>
  );

  if (!report.paid) {
    return (
      <>
        {header}
        <div className="mt-7 space-y-4">
          <PaperCard eyebrow="Vivah ka samay">
            <p className="text-[14px] text-[#7a5560]">Aapki shaadi ka sabse prabal yog</p>
            <p className="font-display mt-1 text-[3rem] leading-none text-[#3a1420]" aria-label="Saal poori report me khulega">
              20<span className="blur-lock inline-block !blur-[10px]" aria-hidden>88</span>
              {report.windowIsRange && (
                <>
                  –<span className="blur-lock inline-block !blur-[10px]" aria-hidden>88</span>
                </>
              )}
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#fffaf0] px-3 py-2.5 ring-1 ring-[#e6d6b6]">
              <Lock className="h-4 w-4 shrink-0 text-[#8f6522]" />
              <span className="text-[13px] text-[#3a1420]">Saal aur mahine:</span>
              <span className="blur-lock font-semibold text-[#3a1420]">March se November</span>
            </div>
          </PaperCard>

          <PaperCard eyebrow={who === "patni" ? "Honewali patni ka naam" : "Honewale pati ka naam"} title="Naam in me se kisi ek akshar se shuru ho sakta hai">
            <LetterRow
              tiles={[
                <div className="letter-tile">{report.firstLetter?.latin}</div>,
                ...Array.from({ length: report.letterCount - 1 }).map(() => (
                  <div className="letter-tile locked"><Lock className="h-5 w-5 text-[#8f6522]" /></div>
                )),
              ]}
            />
            <p className="mt-3 text-[13px] leading-relaxed text-[#7a5560]">
              Pehla akshar <b className="text-[#3a1420]">{report.firstLetter?.latin} ({report.firstLetter?.hi})</b> aapke saptam bhaav ki rashi se nikla hai.
              Baaki {report.letterCount - 1} akshar poori report me hain.
            </p>
          </PaperCard>

          <PaperCard eyebrow={`${who === "patni" ? "Patni" : "Pati"} ki jhalak`} title="Woh dikhne me kaise honge">
            <div className="relative mx-auto w-[190px] overflow-hidden rounded-2xl ring-1 ring-[#c9973f]/70">
              <PartnerSilhouette variant={report.gender === "male" ? "woman" : "man"} className="aspect-[5/6] w-full scale-110 blur-[7px]" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(58,20,32,0.82)] text-[#f6e2b3] shadow-lg"><Lock className="h-5 w-5" /></span>
              </div>
            </div>
            <p className="mt-3 text-center text-[13px] text-[#7a5560]">Kundli ke lakshanon se bana sketch, roop aur swabhav ke saath.</p>
          </PaperCard>

          <PaperCard eyebrow="Poori report me" title="Yeh sab bhi khulega">
            <ul className="space-y-2">
              <LockedRow title="Love ya arranged marriage" hint="Pancham aur saptam bhaav ke sambandh se" />
              <LockedRow title="Mangal dosh ki jaanch" hint="Hai ya nahi, aur uska upay" />
              <LockedRow title={`${who === "patni" ? "Patni" : "Pati"} ka swabhav aur kaam`} hint="Kis disha se, paas se ya door se" />
              {report.delayCount ? <LockedRow title="Shaadi me der kyon" hint={`${report.delayCount} karan aapki kundli me mile`} /> : null}
              {report.palmRead && <LockedRow title="Aapki hast rekha" hint="Hriday aur vivah rekha ka vishleshan" />}
              <LockedRow title="Saral upay" hint="Vivah yog ko majboot karne ke liye" />
            </ul>
          </PaperCard>
          <ErrorNote message={error} />
        </div>
        <AstroFooter />
        <PayBar price={report.price} label="Poori report kholein" sub="Razorpay se surakshit · UPI, card · Turant khulegi" busy={paying} onPay={pay} />
      </>
    );
  }

  if (report.needsPhone) {
    return (
      <>
        {header}
        <div className="mt-6">
          <BuyerPhoneGate type="shaadi" reportId={report.id} onSaved={reload} />
        </div>
      </>
    );
  }

  const s = report.sections!;
  const n = report.narrative;
  const letters = s.partner.letters.map((l) => l.latin).join(", ");
  return (
    <>
      {header}
      <div className="mt-7 space-y-4">
        {n?.summary && (
          <PaperCard eyebrow="Nishkarsh">
            <p className="font-display text-[1.12rem] leading-relaxed text-[#3a1420]">{n.summary}</p>
          </PaperCard>
        )}

        <PaperCard eyebrow="Vivah ka samay" title={s.timing.window}>
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-full bg-[#4d1a2d] px-3 py-1 font-medium text-[#f6e2b3]">{s.timing.strength}</span>
            <span className="rounded-full bg-[#fffaf0] px-3 py-1 text-[#3a1420] ring-1 ring-[#e6d6b6]">{s.timing.dasha}</span>
          </div>
          <p className="mt-3 text-[14px] leading-relaxed text-[#3a1420]">{n?.timing ?? s.timing.jupiter}</p>
          {s.timing.next && <p className="mt-3 text-[13px] text-[#7a5560]">Agla anukool samay: <b className="text-[#3a1420]">{s.timing.next}</b></p>}
          {s.timing.delays.length > 0 && (
            <div className="mt-3 rounded-xl bg-[#fffaf0] p-3 ring-1 ring-[#e6d6b6]">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8f6522]">Der ke karan</p>
              <ul className="mt-1 list-disc pl-4 text-[13px] text-[#3a1420]">{s.timing.delays.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
          )}
        </PaperCard>

        <PaperCard eyebrow={who === "patni" ? "Honewali patni ka naam" : "Honewale pati ka naam"} title="Naam in me se kisi ek akshar se shuru ho sakta hai">
          <LetterRow
            tiles={s.partner.letters.map((l) => (
              <div className="letter-tile flex-col !gap-0">
                <span>{l.latin}</span>
                <span className="font-hindi text-[0.8rem] text-[#ecc97f]">{l.hi}</span>
              </div>
            ))}
          />
          <p className="mt-3 text-[13px] leading-relaxed text-[#7a5560]">Yeh akshar {s.partner.letterSource} se nikle hain.</p>
        </PaperCard>

        <PaperCard eyebrow={`${who === "patni" ? "Patni" : "Pati"} ki jhalak`} title="Woh kaise honge">
          <Portrait report={report} />
          <dl className="mt-4 grid gap-2">
            <Fact label="Roop" value={s.partner.looks} />
            <Fact label="Swabhav" value={s.partner.nature} />
            <Fact label="Kaam-dhandha" value={s.partner.work} />
          </dl>
          {n?.partner && <p className="mt-3 text-[14px] leading-relaxed text-[#3a1420]">{n.partner}</p>}
        </PaperCard>

        <PaperCard eyebrow="Mulaqat" title="Rishta kahan se aayega">
          <dl className="grid grid-cols-2 gap-2">
            <Fact label="Disha" value={s.partner.direction} />
            <Fact label="Doori" value={s.partner.distance} />
          </dl>
          {n?.meeting && <p className="mt-3 flex gap-2 text-[14px] leading-relaxed text-[#3a1420]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8f6522]" />{n.meeting}</p>}
        </PaperCard>

        <PaperCard eyebrow="Vivah ka prakar" title={s.type.label}>
          <p className="flex gap-2 text-[14px] leading-relaxed text-[#3a1420]"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-[#8f6522]" />{s.type.reason}</p>
        </PaperCard>

        <PaperCard eyebrow="Mangal dosh" title={s.mangal.title}>
          <p className="text-[14px] leading-relaxed text-[#3a1420]">{s.mangal.text}</p>
          {s.mangal.upay.length > 0 && <ul className="mt-2 list-disc pl-4 text-[13px] text-[#3a1420]">{s.mangal.upay.map((u) => <li key={u}>{u}</li>)}</ul>}
        </PaperCard>

        {report.palm && (
          <PaperCard eyebrow="Hast rekha" title="Aapki hatheli kya kehti hai">
            <dl className="grid gap-2">
              <Fact label="Hriday rekha" value={report.palm.heart_line} />
              <Fact label="Vivah rekha" value={report.palm.marriage_line} />
              {report.palm.fate_line && <Fact label="Bhagya rekha" value={report.palm.fate_line} />}
            </dl>
          </PaperCard>
        )}

        <PaperCard eyebrow="Upay" title="Vivah yog ko majboot karein">
          <ul className="space-y-2">
            {s.upay.map((u) => (
              <li key={u} className="flex gap-2.5 text-[14px] leading-relaxed text-[#3a1420]"><Star className="mt-1 h-3.5 w-3.5 shrink-0 fill-[#c9973f] text-[#c9973f]" />{u}</li>
            ))}
          </ul>
          {n?.advice && <p className="mt-3 border-t border-[#e6d6b6] pt-3 text-[14px] leading-relaxed text-[#3a1420]">{n.advice}</p>}
        </PaperCard>

        <PaperCard eyebrow="Kundli ka saar">
          <dl className="grid grid-cols-2 gap-2">{s.snapshot.map((f) => <Fact key={f.label} label={f.label} value={f.value} />)}</dl>
        </PaperCard>

        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            logAstro("astro_report_action", "shaadi", { report_id: report.id, action: "share" });
            shareOnWhatsApp(`Meri kundli ke hisaab se shaadi ka yog ${report.windowYears} me hai aur jeevansathi ka naam ${letters} se shuru ho sakta hai 😄\nTum bhi apna dekho: ${window.location.origin}/shaadi`);
          }}
        >
          <MessageCircle className="h-4 w-4" /> WhatsApp par share karein
        </button>

        <section className="glass p-5 text-center">
          <p className="chip mx-auto">Agla kadam</p>
          <h2 className="gold-text mt-3 text-[1.5rem] leading-snug">Kisi khaas ka naam {letters.split(", ")[0]} se shuru hota hai?</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[#e9d9bb]">36 gun milan se jaaniye ki unse aapki shaadi ke yog kitne majboot hain.</p>
          <Link href="/milan" className="btn-gold mt-4" onClick={() => logAstro("astro_report_action", "shaadi", { report_id: report.id, action: "milan_cta" })}>Kundli milan karein</Link>
        </section>
        <AskMoreCard type="shaadi" reportId={report.id} />
      </div>
      <AstroFooter />
    </>
  );
}
