import type { RoleBadgeTone } from "@/lib/homeRoleCards";
import { badgeToneClass } from "@/lib/homeRoleCardPresentation";

export interface HomeRoleCardProps {
  roleId: string;
  image: string;
  badge: string;
  overlayTitle: string;
  description: string;
  ctaClass: string;
  badgeTone: RoleBadgeTone;
  startChatLabel: string;
  onClick: () => void;
}

/** Matches Home page assistant cards: image band + left overlay (badge, title, subtitle, gradient CTA). */
export function HomeRoleCard({
  roleId,
  image,
  badge,
  overlayTitle,
  description,
  ctaClass,
  badgeTone,
  startChatLabel,
  onClick,
}: HomeRoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-3xl text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
    >
      <img
        src={image}
        alt={overlayTitle}
        className="block h-[190px] w-full rounded-3xl object-cover object-center"
      />
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-white/95 via-white/82 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center px-5">
        <div
          className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${badgeToneClass[badgeTone]}`}
        >
          {roleId === "doctor" ? (
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          ) : (
            <span className="text-[10px] leading-none">★</span>
          )}
          {badge}
        </div>
        <h3 className="mb-2 text-[20px] font-bold leading-[1.08] tracking-tight text-slate-950">
          {overlayTitle}
        </h3>
        <p className="mb-4 text-[13px] font-medium leading-snug text-slate-500">{description}</p>
        <span
          className={`inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md ${ctaClass}`}
        >
          {startChatLabel}
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.4}
              d="M5 12h14m-6-6 6 6-6 6"
            />
          </svg>
        </span>
      </div>
    </button>
  );
}
