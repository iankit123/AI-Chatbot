import { Images } from "lucide-react";

type PhotoGalleryCtaCardProps = {
  label: string;
  onClick: () => void;
};

export function PhotoGalleryCtaCard({ label, onClick }: PhotoGalleryCtaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full touch-manipulation text-left transition-transform active:scale-[0.98]"
    >
      <div className="overflow-hidden rounded-2xl border border-violet-200/80 bg-gradient-to-br from-white via-white to-violet-50 shadow-[0_4px_14px_rgba(124,58,237,0.15)] ring-1 ring-violet-200/60">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-600 text-white shadow-md shadow-violet-600/30 transition-transform group-hover:scale-105">
            <Images className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-violet-700">
              Photo / Video
            </span>
            <span className="block text-[14px] font-medium leading-snug text-neutral-900">
              {label}
            </span>
          </span>
          <span
            className="material-icons shrink-0 text-[22px] text-violet-600 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          >
            chevron_right
          </span>
        </div>
      </div>
    </button>
  );
}
