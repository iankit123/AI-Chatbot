import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Check, ChevronDown, Lock, ShieldCheck, Sparkles } from "lucide-react";
import type { Price } from "@/lib/astroApi";

const RASHI_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

/** Decorative zodiac wheel: outer ring of signs turning slowly around a kundli diamond. */
export function ZodiacWheel({ size = 220, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="zw-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e2b3" />
          <stop offset="0.5" stopColor="#ecc97f" />
          <stop offset="1" stopColor="#c9973f" />
        </linearGradient>
      </defs>
      <g className="spin-slow">
        <circle cx="100" cy="100" r="96" fill="none" stroke="url(#zw-gold)" strokeWidth="0.8" opacity="0.9" />
        <circle cx="100" cy="100" r="74" fill="none" stroke="url(#zw-gold)" strokeWidth="0.6" opacity="0.7" />
        {RASHI_GLYPHS.map((g, i) => {
          const a = (i * 30 - 90 + 15) * (Math.PI / 180);
          const la = (i * 30 - 90) * (Math.PI / 180);
          return (
            <g key={g}>
              <line x1={100 + 74 * Math.cos(la)} y1={100 + 74 * Math.sin(la)} x2={100 + 96 * Math.cos(la)} y2={100 + 96 * Math.sin(la)} stroke="url(#zw-gold)" strokeWidth="0.5" opacity="0.6" />
              <text x={100 + 85 * Math.cos(a)} y={100 + 85 * Math.sin(a)} fontSize="11" textAnchor="middle" dominantBaseline="central" fill="#f0d59a">
                {g}︎
              </text>
            </g>
          );
        })}
      </g>
      {/* North-Indian kundli diamond */}
      <g stroke="url(#zw-gold)" strokeWidth="0.9" fill="none" opacity="0.95">
        <rect x="52" y="52" width="96" height="96" />
        <path d="M52 52L148 148M148 52L52 148M100 52L148 100L100 148L52 100Z" />
      </g>
      <circle cx="100" cy="100" r="3" fill="#f6e2b3" className="pulse" />
    </svg>
  );
}

export function AstroShell({ children, tagline }: { children: ReactNode; tagline: string }) {
  return (
    <div className="astro">
      <div className="stars" />
      <div className="relative mx-auto w-full max-w-md px-4 pb-40">
        <header className="flex items-center justify-between py-4">
          <Link href="/" className="font-display text-lg tracking-wide text-[#f6e2b3]">
            puchlo<span className="text-[#c9973f]">.in</span>
          </Link>
          <span className="chip">
            <Sparkles className="h-3 w-3" /> {tagline}
          </span>
        </header>
        {children}
      </div>
    </div>
  );
}

export function PaperCard({ eyebrow, title, children, className = "" }: { eyebrow?: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`paper rise p-5 ${className}`}>
      {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8f6522]">{eyebrow}</p>}
      {title && <h2 className="mb-3 text-[1.35rem] leading-snug text-[#3a1420]">{title}</h2>}
      {children}
    </section>
  );
}

// ---------------------------------------------------------------- form controls

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number | string) => String(n).padStart(2, "0");

/** Three selects instead of a native date picker: reliable inside Instagram/Facebook in-app browsers. */
export function DateSelect({ value, onChange, idPrefix }: { value: string; onChange: (v: string) => void; idPrefix: string }) {
  const [y0, m0, d0] = value ? value.split("-") : ["", "", ""];
  const [d, setD] = useState(d0 ? String(Number(d0)) : "");
  const [m, setM] = useState(m0 ? String(Number(m0)) : "");
  const [y, setY] = useState(y0);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 14 - 1945 + 1 }, (_, i) => now - 14 - i);
  }, []);
  useEffect(() => {
    onChange(d && m && y ? `${y}-${pad(m)}-${pad(d)}` : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d, m, y]);
  return (
    <div className="grid grid-cols-[1fr_1.5fr_1.2fr] gap-2">
      <select id={`${idPrefix}-day`} aria-label="Din" className="field" value={d} onChange={(e) => setD(e.target.value)}>
        <option value="">Din</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <select aria-label="Mahina" className="field" value={m} onChange={(e) => setM(e.target.value)}>
        <option value="">Mahina</option>
        {MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
      </select>
      <select aria-label="Saal" className="field" value={y} onChange={(e) => setY(e.target.value)}>
        <option value="">Saal</option>
        {years.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    </div>
  );
}

/** 12-hour time selects. Emits 24h "HH:mm", or null when the time is unknown. */
export function TimeSelect({ value, onChange, unknownLabel }: { value: string | null; onChange: (v: string | null) => void; unknownLabel: string }) {
  const init = value ? value.split(":").map(Number) : null;
  const [unknown, setUnknown] = useState(false);
  const [h, setH] = useState(init ? String(init[0] % 12 || 12) : "");
  const [min, setMin] = useState(init ? pad(init[1]) : "");
  const [ap, setAp] = useState(init ? (init[0] >= 12 ? "PM" : "AM") : "AM");
  useEffect(() => {
    if (unknown || !h || min === "") return onChange(null);
    const h24 = (Number(h) % 12) + (ap === "PM" ? 12 : 0);
    onChange(`${pad(h24)}:${min}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unknown, h, min, ap]);
  return (
    <div>
      <div className={`grid grid-cols-3 gap-2 ${unknown ? "pointer-events-none opacity-40" : ""}`}>
        <select aria-label="Ghanta" className="field" value={h} onChange={(e) => setH(e.target.value)}>
          <option value="">Ghanta</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select aria-label="Minute" className="field" value={min} onChange={(e) => setMin(e.target.value)}>
          <option value="">Minute</option>
          {Array.from({ length: 12 }, (_, i) => pad(i * 5)).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select aria-label="AM ya PM" className="field" value={ap} onChange={(e) => setAp(e.target.value)}>
          <option value="AM">AM (subah)</option>
          <option value="PM">PM (shaam)</option>
        </select>
      </div>
      <label className="mt-2 flex items-center gap-2 text-[13px] text-[#7a5560]">
        <input type="checkbox" checked={unknown} onChange={(e) => setUnknown(e.target.checked)} className="h-4 w-4 accent-[#4d1a2d]" />
        {unknownLabel}
      </label>
    </div>
  );
}

export function Segmented<T extends string>({ value, onChange, options, cols }: { value: T | ""; onChange: (v: T) => void; options: { value: T; label: string }[]; cols?: number }) {
  return (
    <div className="seg" style={{ gridTemplateColumns: `repeat(${cols ?? options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const CITY_HINTS = ["Delhi", "Mumbai", "Lucknow", "Jaipur", "Patna", "Kanpur", "Indore", "Bhopal", "Ahmedabad", "Surat", "Pune", "Nagpur", "Varanasi", "Agra", "Meerut", "Chandigarh", "Ludhiana", "Kolkata", "Ranchi", "Raipur", "Hyderabad", "Bengaluru", "Chennai", "Guwahati", "Dehradun", "Gorakhpur", "Prayagraj", "Jodhpur", "Kota", "Gwalior"];

// ---------------------------------------------------------------- analysing screen

export function Analysing({ steps, title }: { steps: string[]; title: string }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive((a) => Math.min(a + 1, steps.length - 1)), 1100);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center text-center">
      <ZodiacWheel size={210} />
      <h2 className="gold-text mt-8 text-2xl">{title}</h2>
      <ul className="mt-6 w-full max-w-[280px] space-y-3 text-left text-sm">
        {steps.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 transition-opacity duration-500 ${i <= active ? "opacity-100" : "opacity-30"}`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border ${i < active ? "border-[#ecc97f] bg-[#ecc97f] text-[#2a0f1c]" : "border-[#ecc97f]/60"}`}>
              {i < active ? <Check className="h-3 w-3" strokeWidth={3} /> : i === active ? <span className="pulse h-1.5 w-1.5 rounded-full bg-[#ecc97f]" /> : null}
            </span>
            <span className="text-[#f1e3c8]">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- paywall pieces

export function LockedRow({ title, hint }: { title: string; hint: string }) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-[#e0cfae] bg-[#fffaf0] px-3.5 py-3">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#4d1a2d] text-[#f6e2b3]">
        <Lock className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-semibold text-[#3a1420]">{title}</span>
        <span className="block truncate text-[12px] text-[#7a5560]">{hint}</span>
      </span>
    </li>
  );
}

export function PayBar({ price, label, sub, busy, onPay }: { price: Price; label: string; sub: string; busy: boolean; onPay: () => void }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ecc97f]/25 bg-[rgba(20,7,13,0.96)] backdrop-blur-md">
      <div className="mx-auto w-full max-w-md px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
        <button type="button" className="btn-gold" disabled={busy} onClick={onPay}>
          {busy ? (
            "Payment khul raha hai…"
          ) : (
            <>
              <Lock className="h-4 w-4" /> {label}
              <span className="ml-1 font-display text-[1.1rem]">₹{price.rupees}</span>
              <span className="text-sm font-normal text-[#5c3b12] line-through">₹{price.strike}</span>
            </>
          )}
        </button>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] leading-tight text-[#e9d9bb]">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" /> {sub}
        </p>
      </div>
    </div>
  );
}

/** Animated ring gauge for the gun-milan score. */
export function ScoreRing({ score, max = 36, size = 190 }: { score: number; max?: number; size?: number }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400);
      setShown(score * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);
  const r = 84;
  const c = 2 * Math.PI * r;
  const frac = shown / max;
  const display = Number.isInteger(score) ? Math.round(shown) : shown.toFixed(1);
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="sr-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6e2b3" />
            <stop offset="1" stopColor="#c9973f" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r={r} fill="none" stroke="rgba(236,201,127,0.16)" strokeWidth="12" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="url(#sr-gold)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="font-display text-[3.2rem] leading-none text-[#fbefd3]">{display}</div>
          <div className="mt-1 text-xs tracking-[0.18em] text-[#d9c7a3]">36 ME SE GUN</div>
        </div>
      </div>
    </div>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={it.q} className="glass overflow-hidden">
          <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-[14px] font-medium text-[#f6ead7]" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {it.q}
            <ChevronDown className={`h-4 w-4 shrink-0 text-[#ecc97f] transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && <p className="px-4 pb-4 text-[13px] leading-relaxed text-[#d9c7a3]">{it.a}</p>}
        </div>
      ))}
    </div>
  );
}

export function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => (
        <li key={it.title} className="glass flex gap-4 p-4">
          <span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#ecc97f]/60 text-[#f6e2b3]">{i + 1}</span>
          <span>
            <span className="block text-[15px] font-medium text-[#fbefd3]">{it.title}</span>
            <span className="block text-[13px] leading-relaxed text-[#d9c7a3]">{it.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

export function AstroFooter() {
  return (
    <footer className="mt-10 text-center text-[11px] leading-relaxed text-[#b9a688]">
      <div className="gold-rule mb-5" />
      <p>
        Yeh report Vedic jyotish ke paramparik niyamon par aadharit hai aur sambhavnayein batati hai, nishchit bhavishya nahi.
        Zindagi ke bade faisle apni samajh aur parivar ki salah se lein.
      </p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[#d9c7a3]">
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/refund">Refund</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </footer>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <p role="alert" className="rounded-xl border border-[#c0392b]/40 bg-[#fdecea] px-3.5 py-2.5 text-[13px] text-[#8e2b20]">{message}</p>;
}
