import { useEffect, useRef, useState } from "react";
import { navigate } from "wouter/use-browser-location";
import {
  cacheReport, cachedReport, contactTestArm, fetchReport, logAstro, payForReport, rememberReport, reportFlow, trackAstro, wait,
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
    trackAstro(report.paid ? "astro_report_viewed" : "astro_preview_viewed", type, {
      price: report.price.rupees,
      contact_test: contactTestArm(),
      flow: reportFlow(report),
    });
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

  /** Shows the unlocked report, polling briefly because verification can land a moment after checkout closes. */
  const showPaidReport = async () => {
    // Checkout sometimes sends the browser back a page; bring the buyer to the report they paid for.
    const reportPath = `/${type}/r/${id}`;
    if (window.location.pathname !== reportPath) navigate(reportPath);
    setUnlocking(true);
    window.scrollTo({ top: 0 });
    let r = await load();
    for (let i = 0; i < 4 && r && !r.paid; i++) {
      await wait(1500);
      r = await load();
    }
  };

  const pay = async () => {
    if (!report) return;
    setPaying(true);
    setError(null);
    try {
      await payForReport(report);
      await showPaidReport();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (/already_paid/.test(msg)) {
        // Paid earlier (often in a UPI app) and the page never caught up: open the report, never charge again.
        await showPaidReport();
      } else {
        if (!/cancel/i.test(msg)) setError(msg || "Payment poora nahi ho paya. Dobara koshish karein.");
        // People often pay in the UPI app and then close the checkout; check once more shortly after.
        window.setTimeout(() => void load(), 2500);
      }
    } finally {
      setPaying(false);
      setUnlocking(false);
    }
  };

  return { report, error, paying, unlocking, pay, reload: load };
}

/** On a paid report: how far the buyer scrolls (25/50/75/100%) and how long the page is visible. */
export function useReadTracking(report: AstroReport | null) {
  const active = !!report?.paid && !report.needsPhone;
  const id = report?.id;
  const type = report?.type;
  useEffect(() => {
    if (!active || !id || !type) return;
    let visibleMs = 0;
    let visibleSince = document.visibilityState === "visible" ? Date.now() : 0;
    let maxDepth = 0;
    const reached = new Set<number>();
    const seconds = () => Math.round((visibleMs + (visibleSince ? Date.now() - visibleSince : 0)) / 1000);
    const onScroll = () => {
      const h = document.documentElement.scrollHeight;
      if (!h) return;
      const depth = Math.min(100, Math.round(((window.scrollY + window.innerHeight) / h) * 100));
      maxDepth = Math.max(maxDepth, depth);
      for (const m of [25, 50, 75, 100]) {
        if (depth >= m - 2 && !reached.has(m)) {
          reached.add(m);
          logAstro("astro_report_read", type, { report_id: id, depth: m, seconds: seconds() });
        }
      }
    };
    const flush = () => logAstro("astro_report_read", type, { report_id: id, depth: maxDepth, seconds: seconds(), final: true });
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        if (visibleSince) visibleMs += Date.now() - visibleSince;
        visibleSince = 0;
        flush();
      } else {
        visibleSince = Date.now();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [active, id, type]);
}
