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

/** End of a paid report: an open question box, so we learn what buyers want next. */
export function AskMoreCard({ type, reportId }: { type: AstroReport["type"]; reportId: string }) {
  const [text, setText] = useState("");
  const [sent, setSent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const question = text.trim();
    if (question.length < 3) return setError("Kripya apna sawal likhein.");
    logAstro("astro_question", type, { report_id: reportId, question: question.slice(0, 500) });
    setText("");
    setError(null);
    setSent((n) => n + 1);
  };
  return (
    <PaperCard eyebrow="Aapka sawal" title="Bataiye, aapko aur kya jaanna hai?">
      {sent > 0 ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-[#4f8a35]" />
          <p className="ink mt-2 text-[15px] font-semibold">Shukriya! Aapka sawal hum tak pahunch gaya.</p>
          <button type="button" className="ink-soft mt-2 text-[13px] underline underline-offset-4" onClick={() => setSent(0)}>
            Ek aur sawal likhein
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3" noValidate>
          <p className="ink-soft text-[13px] leading-relaxed">Jo bhi mann me ho, likhiye. Aapke sawal padhkar hum nayi reports banate hain.</p>
          <label htmlFor={`ask-${reportId}`} className="sr-only">Aapka sawal</label>
          <textarea
            id={`ask-${reportId}`}
            className="field !h-28 resize-none py-3 leading-relaxed"
            placeholder="Apna sawal yahan likhiye…"
            maxLength={500}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          {error && <p role="alert" className="text-[13px] text-[#8e2b20]">{error}</p>}
          <button type="submit" className="btn-gold">
            <Send className="h-4 w-4" /> Sawal bhejein
          </button>
        </form>
      )}
    </PaperCard>
  );
}
