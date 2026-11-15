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

/** End of a paid report: the buyer asks a question and gets an answer from their own chart, right here. */
export function AskMoreCard({ type, reportId }: { type: AstroReport["type"]; reportId: string }) {
  type Item = { id: string; question: string; answer: string | null };
  const [items, setItems] = useState<Item[]>([]);
  const [remaining, setRemaining] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // Earlier questions with their answers; ones asked before answering existed get answered now.
    let alive = true;
    fetch(`/api/astro/report/${reportId}/questions`, { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive || !d) return;
        setItems(d.items ?? []);
        setRemaining(typeof d.remaining === "number" ? d.remaining : 5);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [reportId]);
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
      if (!res.ok) setError(d.message || "Abhi jawab nahi ban paya. Kripya dobara koshish karein.");
    } catch {
      setError("Abhi jawab nahi ban paya. Kripya dobara koshish karein.");
    } finally {
      setBusy(false);
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
                    {remaining > 0 ? "Jawab taiyaar ho raha hai. Report dobara kholne par yahin milega." : "Is sawal ko hum nayi reports banane me use karenge."}
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
          <p className="ink-soft text-center text-[12px]">Is report par aap {remaining} aur sawal pooch sakte hain.</p>
        </form>
      ) : (
        <p className="ink-soft mt-4 text-center text-[13px]">Is report par 5 sawalon ke jawab de diye gaye hain.</p>
      )}
    </PaperCard>
  );
}
