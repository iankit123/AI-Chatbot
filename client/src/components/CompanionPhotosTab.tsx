import { useState } from "react";
import { ChevronRight, Crown, Heart } from "lucide-react";
import { RELATIONSHIP_PHOTO_GALLERIES } from "@/lib/relationshipPhotoGallery";
import { PhotoPackActivationDialog } from "@/components/PhotoPackActivationDialog";

interface CompanionPhotosTabProps {
  companionId: string;
  companionDisplayName: string;
}

const LOCKED_PREVIEW_ROWS = 3;
const LOCKED_PREVIEW_COLS = 3;

function LockedPhotoTile({
  src,
  alt,
  onUnlock,
}: {
  src: string;
  alt: string;
  onUnlock: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUnlock}
      className="group relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-white/50 bg-slate-900/90 shadow-md outline-none ring-offset-2 transition hover:border-violet-300/60 hover:shadow-lg focus-visible:ring-2 focus-visible:ring-violet-500"
      aria-label={alt}
    >
      <img
        src={src}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full scale-[1.35] object-cover opacity-95 blur-[32px] saturate-125 transition duration-300 group-hover:blur-[28px]"
        loading="lazy"
        decoding="async"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/40" />
      <div className="pointer-events-none absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-white/85 bg-black/20 backdrop-blur-[2px]">
        <Heart className="h-3.5 w-3.5 fill-white/35 text-white" strokeWidth={2} />
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <Crown className="h-9 w-9 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]" strokeWidth={1.75} />
      </div>
    </button>
  );
}

export function CompanionPhotosTab({ companionId, companionDisplayName }: CompanionPhotosTabProps) {
  const [activationOpen, setActivationOpen] = useState(false);
  const gallery = RELATIONSHIP_PHOTO_GALLERIES[companionId];

  if (!gallery) {
    return (
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain px-6 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4">
          <div className="flex flex-col items-center justify-start gap-2 text-center">
            <p className="text-sm font-medium text-slate-700">Photos</p>
            <p className="max-w-xs text-xs text-slate-500">
              Gallery for this companion is coming soon.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0 overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3">
        <div className="mx-auto w-full max-w-lg px-4">
          <div className="grid grid-cols-3 gap-2">
            {gallery.photoUrls.map((src, i) => (
              <div
                key={src}
                className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-md"
              >
                <img
                  src={src}
                  alt={`${companionDisplayName} photo ${i + 1}`}
                  className="aspect-[3/4] w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ))}
            {Array.from({ length: LOCKED_PREVIEW_ROWS * LOCKED_PREVIEW_COLS }).map((_, i) => {
              const src = gallery.photoUrls[i % gallery.photoUrls.length];
              return (
                <LockedPhotoTile
                  key={`locked-${i}`}
                  src={src}
                  alt={`Unlock premium photos — ${companionDisplayName}`}
                  onUnlock={() => setActivationOpen(true)}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setActivationOpen(true)}
            className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-100 via-fuchsia-50 to-rose-100 px-4 py-4 text-left shadow-md transition hover:opacity-95 active:scale-[0.99]"
          >
            <span className="text-base font-semibold leading-snug text-slate-900">
              {gallery.promoCardTitle}
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
              <ChevronRight className="h-5 w-5" />
            </span>
          </button>
          <p className="mt-2 pb-1 text-center text-[11px] text-slate-500">
            Tap to view ₹299 activation options
          </p>
        </div>
      </div>

      <PhotoPackActivationDialog
        open={activationOpen}
        onOpenChange={setActivationOpen}
        companionId={companionId}
        companionDisplayName={companionDisplayName}
      />
    </div>
  );
}
