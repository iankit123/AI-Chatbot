import { ReactNode } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { legalPageTitles, type LegalPageKey } from "@/lib/legalCopy";

interface LegalPageShellProps {
  pageKey: LegalPageKey;
  children: ReactNode;
}

export function LegalPageShell({ pageKey, children }: LegalPageShellProps) {
  const [, setLocation] = useLocation();
  const title = legalPageTitles[pageKey].en;
  const back = "Back to home";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-800 transition-colors hover:bg-slate-100"
            aria-label={back}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden />
          </button>
          <h1 className="min-w-0 flex-1 text-lg font-bold tracking-tight text-slate-900">
            {title}
          </h1>
        </div>
      </header>

      <article className="mx-auto max-w-2xl px-4 py-8 prose prose-sm prose-slate prose-headings:font-semibold prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600">
        {children}
      </article>
    </div>
  );
}
