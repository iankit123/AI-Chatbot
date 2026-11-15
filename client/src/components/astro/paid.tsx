import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Send } from "lucide-react";
import { PaperCard } from "@/components/astro/ui";
import { fetchReport, lastReportId, logAstro, type AstroReport } from "@/lib/astroApi";

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
  return (
    <PaperCard eyebrow="Aapka sawal" title="Bataiye, aapko aur kya jaanna hai?">
      <p className="ink-soft text-[13px] leading-relaxed">Apni kundli se juda koi bhi sawal poochiye. Jawab aapki kundli dekhkar yahin milega.</p>
      {items.length > 0 && (
        <ul className="mt-4 space-y-3">
          {items.map((it) => (
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
