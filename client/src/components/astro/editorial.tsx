import type { ReactNode } from "react";
import { Link } from "wouter";
import { Check, Quote } from "lucide-react";

/**
 * Photo-led "editorial" look for /wapas, /milan and /naukri: full-bleed photographs, flat surfaces,
 * left-aligned type. Scoped by the `ed` class, so /shaadi and /business keep their look.
 * The root keeps the `astro` class so form fields, pay bar and loaders still get their styles.
 */
export function EditorialShell({ theme, children }: { theme: "wapas" | "milan" | "naukri" | "tayari" | "shaadi"; children: ReactNode }) {
  return (
    <div className={`astro ed ed-${theme}`}>
      <div className="relative mx-auto w-full max-w-md px-4 pb-40">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4">
          <Link href="/" className="font-display text-[17px] tracking-wide text-[var(--ed-text)]">
            puchlo<span className="text-[var(--ed-accent)]">.in</span>
          </Link>
        </header>
        <div className="pt-0">{children}</div>
      </div>
    </div>
  );
}

const imgAttrs = { fetchpriority: "high", decoding: "async" } as Record<string, string>;

export function PhotoHero({
  src, alt, kicker, title, tagline, sub, children, position = "50% 100%", ornament,
}: {
  src: string; alt: string; kicker: string; title: ReactNode; sub: string; children?: ReactNode; position?: string;
  /** Short line right under the headline, over the photo. */
  tagline?: string;
  /** Optional decoration drawn over the photo's sky (e.g. a zodiac wheel), behind the headline. */
  ornament?: ReactNode;
}) {
  return (
    <section className="relative">
      <div className="relative -mx-4 overflow-hidden">
        <img src={src} alt={alt} width={768} height={1152} {...imgAttrs} className="block aspect-[3/4] w-full object-cover" style={{ objectPosition: position }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(8,5,10,0.82)] via-transparent via-45% to-[var(--ed-bg)]" />
        {ornament && <div className="pointer-events-none absolute inset-0" aria-hidden>{ornament}</div>}
        <div className="rise absolute inset-x-0 top-0 px-4 pt-[4.5rem]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ed-accent)]">{kicker}</p>
          <h1 className="font-hindi mt-2 text-[2.75rem] leading-[1.12] text-[var(--ed-text)] [text-shadow:0_2px_24px_rgba(0,0,0,0.5)]">{title}</h1>
          {tagline && <p className="mt-2.5 max-w-[290px] text-[16px] font-medium leading-snug text-[var(--ed-text)] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)] [text-wrap:balance]">{tagline}</p>}
        </div>
      </div>
      <div className="relative -mt-8">
        <p className="max-w-[350px] text-[15px] leading-relaxed text-[var(--ed-muted)]">{sub}</p>
        {children}
      </div>
    </section>
  );
}

export function TrustLine({ items }: { items: string[] }) {
  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-[var(--ed-muted)]">
      {items.map((t) => (
        <li key={t} className="flex items-center gap-1.5">
          <Check className="h-3.5 w-3.5 text-[var(--ed-accent)]" strokeWidth={2.5} />
          {t}
        </li>
      ))}
    </ul>
  );
}

export function SectionHead({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <div className="mb-5">
      {kicker && <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ed-accent)]">{kicker}</p>}
      <h2 className="mt-1.5 text-[1.6rem] leading-snug text-[var(--ed-text)]">{title}</h2>
      {sub && <p className="mt-2 text-[14px] leading-relaxed text-[var(--ed-muted)]">{sub}</p>}
    </div>
  );
}

export function FactorList({ items }: { items: { img: string; name: string; en: string; text: string }[] }) {
  return (
    <ul className="divide-y divide-[var(--ed-line)] border-y border-[var(--ed-line)]">
      {items.map((f) => (
        <li key={f.name} className="flex items-center gap-4 py-4">
          <img src={f.img} alt="" width={480} height={480} loading="lazy" decoding="async" className="h-[76px] w-[76px] shrink-0 rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="text-[16px] font-medium text-[var(--ed-text)]">
              {f.name} <span className="text-[12px] font-normal text-[var(--ed-muted)]">· {f.en}</span>
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--ed-muted)]">{f.text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function NumberedList({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className="divide-y divide-[var(--ed-line)] border-y border-[var(--ed-line)]">
      {items.map((it, i) => (
        <li key={it.title} className="flex gap-4 py-4">
          <span className="font-display w-7 shrink-0 pt-0.5 text-[15px] text-[var(--ed-accent)]">{String(i + 1).padStart(2, "0")}</span>
          <span>
            <span className="block text-[15px] font-medium text-[var(--ed-text)]">{it.title}</span>
            <span className="mt-0.5 block text-[13.5px] leading-relaxed text-[var(--ed-muted)]">{it.text}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Before deciding to wait or move on: a few honest questions to ask yourself. */
export function ReflectionCard({ title, questions, footer }: { title: string; questions: string[]; footer?: string }) {
  return (
    <section className="rounded-2xl border border-[var(--ed-line)] bg-[var(--ed-surface)] p-5">
      <Quote className="h-5 w-5 text-[var(--ed-accent)]" />
      <h3 className="mt-2 text-[1.25rem] leading-snug text-[var(--ed-text)]">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {questions.map((q) => (
          <li key={q} className="flex gap-3 text-[14.5px] leading-relaxed text-[var(--ed-text)]">
            <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--ed-accent)]" aria-hidden />
            {q}
          </li>
        ))}
      </ul>
      {footer && <p className="mt-4 border-t border-[var(--ed-line)] pt-3 text-[13px] leading-relaxed text-[var(--ed-muted)]">{footer}</p>}
    </section>
  );
}

/** Top of a report: the hero photo as a short banner with the two names over it. */
export function ReportBanner({ src, kicker, title, position = "50% 40%" }: { src: string; kicker: string; title: string; position?: string }) {
  return (
    <section className="relative">
      <div className="relative -mx-4 overflow-hidden">
        <img src={src} alt="" width={768} height={1152} {...imgAttrs} className="block aspect-[16/11] w-full object-cover" style={{ objectPosition: position }} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(0,0,0,0.45)] via-transparent to-[var(--ed-bg)]" />
      </div>
      <div className="relative -mt-20 rise">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--ed-accent)]">{kicker}</p>
        <h1 className="mt-1.5 text-[2rem] leading-tight text-[var(--ed-text)]">{title}</h1>
      </div>
    </section>
  );
}

export function StepHead({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--ink)] text-[13px] font-semibold text-white">{n}</span>
      <div>
        <p className="ink text-[17px] font-semibold leading-tight">{title}</p>
        {sub && <p className="ink-soft mt-0.5 text-[12.5px]">{sub}</p>}
      </div>
    </div>
  );
}
