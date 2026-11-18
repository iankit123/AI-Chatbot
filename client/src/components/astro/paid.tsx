import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle2, Lock, Send } from "lucide-react";
import { PaperCard } from "@/components/astro/ui";
import { fetchReport, lastReportId, loadSelf, logAstro, saveBuyerPhone, type AstroReport, type BirthPerson, type PaidMeta } from "@/lib/astroApi";
import { rememberMilanPartner, suggestForQuestion, type QuestionSuggestion } from "@/lib/questionTopic";
import { isRealPhone, phoneDigits } from "@shared/astroProducts";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : null;
};
const fmtTime = (t: string | null) => {
  if (!t) return null;
  const [h, min] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

/** As typed, tidied for a formal report: "amit kumar" → "Amit Kumar", "Sanand,Gujarat" → "Sanand, Gujarat". */
const tidy = (v: string) =>
  v.trim().replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").replace(/(^|[\s,(])([a-z])/g, (_, pre: string, c: string) => pre + c.toUpperCase());

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8f6522]">{label}</dt>
      <dd className="mt-0.5 text-[14px] font-medium leading-snug text-[#3a1420]">{value}</dd>
    </div>
  );
}

/** Top of a paid report: whose report it is, from which birth details, and when it was made. */
export function BirthDetailsCard({ report }: { report: AstroReport }) {
  const { birth, madeOn } = report as AstroReport & PaidMeta;
  const people = [birth?.self, birth?.partner].filter(Boolean) as BirthPerson[];
  if (!people.length) return null;
  return (
    <PaperCard>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6522]">Janm vivaran</p>
        <p className="text-[11px] tracking-wide text-[#7a5560]">Report no. {report.id.slice(0, 8).toUpperCase()}</p>
      </div>
      {people.map((p, i) => (
        <div key={i} className={i ? "mt-4 border-t border-[#e6d6b6] pt-4" : "mt-3"}>
          {people.length > 1 && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a5560]">{i === 0 ? "Aap" : "Saathi"}</p>}
          <p className="font-display text-[1.35rem] leading-tight text-[#3a1420]">{tidy(p.name)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Detail label="Janm tithi" value={fmtDate(p.dob) ?? (i ? "Pata nahi (naam se dekha gaya)" : "Pata nahi")} />
            <Detail label="Janm samay" value={fmtTime(p.tob) ?? (p.dob ? "Pata nahi (Chandra kundli)" : "Pata nahi")} />
            <Detail label="Janm sthan" value={p.place ? tidy(p.place) : "Pata nahi"} />
            {p.gender && <Detail label="Ling" value={p.gender === "male" ? "Purush" : "Mahila"} />}
          </dl>
        </div>
      ))}
      <p className="mt-4 border-t border-[#e6d6b6] pt-3 text-[11.5px] leading-relaxed text-[#7a5560]">
        {madeOn ? `Report ki tareekh: ${fmtDate(madeOn)} · ` : ""}Lahiri ayanamsa · Vimshottari dasha
      </p>
    </PaperCard>
  );
}

/**
 * On the start page: if this phone's last report is paid, offer a way back to it. Renders
 * nothing otherwise, so visitors who have not paid see no change.
 */
export function PaidReportBanner({ type }: { type: AstroReport["type"] }) {
  const [paidId, setPaidId] = useState<string | null>(null);
  useEffect(() => {
    const id = lastReportId(type);
    if (!id) return;
    let alive = true;
    // This request also lets the server pick up a UPI payment the browser never confirmed.
    fetchReport(id)
      .then((r) => alive && r.type === type && r.paid && setPaidId(r.id))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [type]);
  if (!paidId) return null;
  return (
    <Link
      href={`/${type}/r/${paidId}`}
      className="glass rise mb-4 flex items-center gap-3 px-4 py-3 text-left"
      onClick={() => logAstro("astro_report_action", type, { report_id: paidId, action: "banner_open" })}
    >
      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#7fd18f]" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-[#fbefd3]">Aapki poori report taiyaar hai</span>
        <span className="block text-[12px] text-[#d9c7a3]">Payment ho chuka hai. Yahan dekhein</span>
      </span>
      <span className="text-[13px] font-semibold text-[#ecc97f]">Kholein →</span>
    </Link>
  );
}

/** Under an answer: the report that fits what the buyer asked about (a person, a job, a business). */
function QuestionCrossSell({ type, reportId, suggestion }: { type: AstroReport["type"]; reportId: string; suggestion: QuestionSuggestion }) {
  const target = suggestion.kind;
  useEffect(() => {
    logAstro("astro_report_action", type, { report_id: reportId, action: "question_xsell_shown", target });
  }, [type, reportId, target]);
  const partnerName = suggestion.kind === "milan" ? suggestion.partnerName : null;
  const copy = {
    milan: {
      eyebrow: "Kundli milan",
      title: partnerName ? `${partnerName} ke saath aapke kitne gun milte hain?` : "Jinke baare me pooch rahe hain, unse aapke kitne gun milte hain?",
      body: "Aap dono ki kundli milakar 36 me se gun, dosh aur rishta aage kaisa chalega, ek alag report me.",
      cta: "Gun milan dekhein",
    },
    naukri: {
      eyebrow: "Naukri yog",
      title: "Naukri kab lagegi?",
      body: "Aapki kundli se kis saal aur kin mahino me naukri ka mauka hai, aur Railway, Police, Bank, Teacher me se kaunsi aapke liye.",
      cta: "Naukri ka yog dekhein",
    },
    business: {
      eyebrow: "Vyapar yog",
      title: "Kaunsa business aapke liye shubh hai?",
      body: "Janm kundli se sabse shubh vyapar, shuruaat ka sahi samay aur dukan ke naam ka akshar, ek alag report me.",
      cta: "Vyapar yog dekhein",
    },
  }[target];
  const onClick = () => {
    if (suggestion.kind === "milan") rememberMilanPartner({ name: suggestion.partnerName, dob: suggestion.partnerDob });
    logAstro("astro_report_action", type, { report_id: reportId, action: "question_xsell_click", target });
  };
  return (
    <div className="rounded-2xl bg-[#fbeedd] p-3.5 ring-1 ring-[#e3c48c]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#9a6b1f]">{copy.eyebrow}</p>
      <p className="ink mt-1 text-[15px] font-semibold leading-snug">{copy.title}</p>
      <p className="ink-soft mt-1 text-[13px] leading-relaxed">{copy.body}</p>
      <Link href={`/${target}`} onClick={onClick} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--wine-700)] px-4 py-2 text-[13px] font-semibold text-[#fbefd3]">
        {copy.cta} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/**
 * End of a paid report: the buyer asks a question and gets an answer from their own chart, right
 * here. The first few answers are free; after that a small pack unlocks more.
 */
export function AskMoreCard({ type, reportId }: { type: AstroReport["type"]; reportId: string }) {
  type Item = { id: string; question: string; answer: string | null };
  const [items, setItems] = useState<Item[]>([]);
  const [remaining, setRemaining] = useState(2);
  const [free, setFree] = useState(2);
  const [pack, setPack] = useState({ rupees: 20, questions: 10 });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buyer = useRef(loadSelf()).current;
  // Earlier questions with their answers; unanswered ones get answered here when allowance exists.
  const loadThread = async () => {
    try {
      const r = await fetch(`/api/astro/report/${reportId}/questions`, { headers: { Accept: "application/json" } });
      if (!r.ok) return;
      const d = await r.json();
      setItems(d.items ?? []);
      if (typeof d.remaining === "number") setRemaining(d.remaining);
      if (typeof d.free === "number") setFree(d.free);
      if (d.pack) setPack(d.pack);
    } catch {
      /* the box still works without the earlier thread */
    }
  };
  useEffect(() => {
    void loadThread();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);
  // Back from a UPI app after buying a pack: the server picks up the payment and answers.
  useEffect(() => {
    if (remaining > 0) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void loadThread();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, reportId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = text.trim();
    if (question.length < 3) return setError("Kripya apna sawal likhein.");
    setBusy(true);
    setError(null);
    logAstro("astro_report_action", type, { report_id: reportId, action: "question_asked" });
    try {
      const res = await fetch(`/api/astro/report/${reportId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ question }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.item) {
        setItems((list) => [...list, d.item]);
        setText("");
      }
      if (typeof d.remaining === "number") setRemaining(d.remaining);
      if (d.pack) setPack(d.pack);
      if (!res.ok && !d.needsPack) setError(d.message || "Abhi jawab nahi ban paya. Kripya dobara koshish karein.");
    } catch {
      setError("Abhi jawab nahi ban paya. Kripya dobara koshish karein.");
    } finally {
      setBusy(false);
    }
  };
  const buy = async () => {
    setBuying(true);
    setError(null);
    logAstro("astro_report_action", type, { report_id: reportId, action: "question_pack_checkout" });
    try {
      const { buyQuestionPack } = await import("@/lib/questionPack");
      await buyQuestionPack(type, reportId);
      await loadThread();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!/cancel/i.test(msg)) setError(msg || "Payment poora nahi ho paya. Dobara koshish karein.");
      // Paid in the UPI app and closed checkout: check again shortly.
      window.setTimeout(() => void loadThread(), 2500);
    } finally {
      setBuying(false);
    }
  };
  // One card per kind of report, under the latest answered question that asks about it.
  const suggestionAt = new Map<number, QuestionSuggestion>();
  const seenKinds = new Set<string>();
  for (let i = items.length - 1; i >= 0; i--) {
    if (!items[i].answer) continue;
    const s = suggestForQuestion(items[i].question, type, buyer);
    if (s && !seenKinds.has(s.kind)) {
      seenKinds.add(s.kind);
      suggestionAt.set(i, s);
    }
  }
  return (
    <PaperCard eyebrow="Aapka sawal" title="Bataiye, aapko aur kya jaanna hai?">
      <p className="ink-soft text-[13px] leading-relaxed">Apni kundli se juda koi bhi sawal poochiye. Jawab aapki kundli dekhkar yahin milega.</p>
      {items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((it, i) => (
            <li key={it.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-[var(--wine-700)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[#fbefd3]">
                {it.question}
              </p>
              <div className="rounded-2xl rounded-bl-md bg-[#fffaf0] px-3.5 py-3 ring-1 ring-[#e6d6b6]">
                {it.answer ? (
                  <p className="ink whitespace-pre-line text-[14px] leading-relaxed">{it.answer}</p>
                ) : (
                  <p className="ink-soft text-[13px]">
                    {remaining > 0
                      ? "Jawab taiyaar ho raha hai. Report dobara kholne par yahin milega."
                      : `Is sawal ka jawab ₹${pack.rupees} ke recharge ke baad turant yahin milega.`}
                  </p>
                )}
              </div>
              {suggestionAt.has(i) && <QuestionCrossSell type={type} reportId={reportId} suggestion={suggestionAt.get(i)!} />}
            </li>
          ))}
        </ul>
      )}
      {remaining > 0 ? (
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <label htmlFor={`ask-${reportId}`} className="sr-only">Aapka sawal</label>
          <textarea
            id={`ask-${reportId}`}
            className="field !h-28 resize-none py-3 leading-relaxed"
            placeholder="Apna sawal yahan likhiye…"
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          {error && <p role="alert" className="text-[13px] text-[#8e2b20]">{error}</p>}
          <button type="submit" className="btn-gold" disabled={busy}>
            {busy ? (
              "Aapki kundli dekh kar jawab likh rahe hain…"
            ) : (
              <>
                <Send className="h-4 w-4" /> Sawal poochein
              </>
            )}
          </button>
          <p className="ink-soft text-center text-[12px]">
            {remaining === 1 ? "Is report par 1 aur sawal pooch sakte hain." : `Is report par aap ${remaining} aur sawal pooch sakte hain.`}
          </p>
        </form>
      ) : (
        <div className="mt-4 rounded-2xl bg-[#fffaf0] p-4 text-center ring-1 ring-[#e6d6b6]">
          <p className="ink text-[15px] font-semibold">Aapke {free} muft sawal ho gaye</p>
          <p className="ink-soft mt-1 text-[13px] leading-relaxed">
            ₹{pack.rupees} me {pack.questions} aur sawal poochiye. Har jawab aapki kundli dekhkar yahin milega.
          </p>
          <button type="button" className="btn-gold mt-3" onClick={buy} disabled={buying}>
            {buying ? "Payment khul raha hai…" : `₹${pack.rupees} me ${pack.questions} sawal`}
          </button>
          {error && <p role="alert" className="mt-2 text-[13px] text-[#8e2b20]">{error}</p>}
        </div>
      )}
    </PaperCard>
  );
}

/**
 * After payment, when checkout did not give us a real number: ask for it before the report opens.
 * Only paid buyers ever see this.
 */
export function BuyerPhoneGate({ type, reportId, onSaved }: { type: AstroReport["type"]; reportId: string; onSaved: () => Promise<unknown> }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    logAstro("astro_report_action", type, { report_id: reportId, action: "phone_gate_shown" });
  }, [type, reportId]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneDigits(phone);
    if (!isRealPhone(digits)) return setError("Kripya apna sahi 10 ankon ka mobile number daalein.");
    setBusy(true);
    setError(null);
    try {
      await saveBuyerPhone(reportId, digits);
      logAstro("astro_report_action", type, { report_id: reportId, action: "phone_submitted" });
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Number save nahi ho paya. Dobara koshish karein.");
      setBusy(false);
    }
  };
  return (
    <PaperCard eyebrow="Payment ho gaya ✓" title="Bas ek aakhri kadam">
      <form onSubmit={submit} className="space-y-3" noValidate>
        <p className="ink-soft text-[13.5px] leading-relaxed">
          Aapki poori report taiyaar hai. Apna mobile number daalein, aapka payment aur report isi number se jude
          rahenge.
        </p>
        <label htmlFor={`buyer-phone-${reportId}`} className="label">Mobile number</label>
        <div className="flex items-center gap-2">
          <span className="ink grid h-12 shrink-0 place-items-center rounded-xl border border-[#dcc9a6] bg-[#fffaf0] px-3 text-[15px] font-medium">+91</span>
          <input
            id={`buyer-phone-${reportId}`}
            className="field"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="10 ankon ka number"
            maxLength={18}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              if (error) setError(null);
            }}
          />
        </div>
        {error && <p role="alert" className="text-[13px] text-[#8e2b20]">{error}</p>}
        <button type="submit" className="btn-gold" disabled={busy}>
          {busy ? "Report khul rahi hai…" : <><Lock className="h-4 w-4" /> Meri report dekhein</>}
        </button>
        <p className="ink-soft text-center text-[11px]">Aapka number kisi ke saath share nahi kiya jaata.</p>
      </form>
    </PaperCard>
  );
}
