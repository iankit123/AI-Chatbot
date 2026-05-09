import { Link } from "wouter";
import { FileText, Mail, Shield } from "lucide-react";
import { legalFooterLinks, legalFooterSectionTitle } from "@/lib/legalCopy";

function LinkIcon({ pageKey }: { pageKey: (typeof legalFooterLinks)[number]["key"] }) {
  if (pageKey === "privacy") {
    return <Shield className="h-[18px] w-[18px] shrink-0 text-slate-800" strokeWidth={1.75} aria-hidden />;
  }
  if (pageKey === "contact") {
    return <Mail className="h-[18px] w-[18px] shrink-0 text-slate-800" strokeWidth={1.75} aria-hidden />;
  }
  return <FileText className="h-[18px] w-[18px] shrink-0 text-slate-800" strokeWidth={1.75} aria-hidden />;
}

export function LegalFooter() {
  const section = legalFooterSectionTitle.en;

  return (
    <footer className="mt-10 border-t border-stone-200/80 bg-[#faf8f5] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-5 text-xs font-bold uppercase tracking-[0.12em] text-slate-900">
          {section}
        </h2>
        <nav aria-label={section}>
          <ul className="flex flex-col gap-3.5">
            {legalFooterLinks.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 text-[15px] font-medium text-slate-800 transition-opacity hover:opacity-80 active:opacity-70"
                >
                  <LinkIcon pageKey={item.key} />
                  <span>{item.en}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
