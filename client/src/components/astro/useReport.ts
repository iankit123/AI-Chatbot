import { useEffect, useRef, useState } from "react";
import {
  cacheReport, cachedReport, fetchReport, payForReport, rememberReport, trackAstro, wait,
  type AstroReport,
} from "@/lib/astroApi";

/** Loads a report by id, re-checks payment with the server, and runs checkout. */
export function useAstroReport<T extends AstroReport>(id: string, type: T["type"]) {
  const [report, setReport] = useState<T | null>(() => cachedReport<T>(id) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const viewed = useRef<string | null>(null);

  const load = async () => {
    try {
      const r = await fetchReport<T>(id);
      if (r.type !== type) throw new Error("Report nahi mili");
      cacheReport(r);
      setReport(r);
      setError(null);
      return r;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report load nahi ho payi");
      return null;
    }
  };

  useEffect(() => {
    // Always ask the server: a payment may have completed while the page was in the background.
    void load();
    rememberReport(type, id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!report) return;
    const key = `${report.id}:${report.paid}`;
    if (viewed.current === key) return;
    viewed.current = key;
    trackAstro(report.paid ? "astro_report_viewed" : "astro_preview_viewed", type, { price: report.price.rupees });
  }, [report, type]);

  // Coming back from a UPI app: ask the server again, it checks Razorpay for a completed payment.
  const paid = report?.paid ?? false;
  useEffect(() => {
    if (paid) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paid, id]);

  const pay = async () => {
    if (!report) return;
    setPaying(true);
    setError(null);
    try {
      await payForReport(report);
      setUnlocking(true);
      window.scrollTo({ top: 0 });
      let r = await load();
      // Verification can land a moment after checkout closes.
      for (let i = 0; i < 4 && r && !r.paid; i++) {
        await wait(1500);
        r = await load();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!/cancel/i.test(msg)) setError(msg || "Payment poora nahi ho paya. Dobara koshish karein.");
      // People often pay in the UPI app and then close the checkout; check once more shortly after.
      window.setTimeout(() => void load(), 2500);
    } finally {
      setPaying(false);
      setUnlocking(false);
    }
  };

  return { report, error, paying, unlocking, pay };
}
