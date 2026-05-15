import { Mic } from "lucide-react";

type VoiceChatCtaCardProps = {
  label: string;
  onClick: () => void;
};

export function VoiceChatCtaCard({ label, onClick }: VoiceChatCtaCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full touch-manipulation text-left transition-transform active:scale-[0.98]"
    >
      <div className="overflow-hidden rounded-2xl border border-[#128C7E]/25 bg-gradient-to-br from-white via-white to-[#e8f5f3] shadow-[0_4px_14px_rgba(18,140,126,0.18)] ring-1 ring-[#128C7E]/10">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#128C7E] text-white shadow-md shadow-[#128C7E]/30 transition-transform group-hover:scale-105">
            <Mic className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#128C7E]">
              Voice chat
            </span>
            <span className="block text-[14px] font-medium leading-snug text-neutral-900">
              {label}
            </span>
          </span>
          <span
            className="material-icons shrink-0 text-[22px] text-[#128C7E] transition-transform group-hover:translate-x-0.5"
            aria-hidden
          >
            chevron_right
          </span>
        </div>
      </div>
    </button>
  );
}
