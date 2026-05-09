import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { RELATIONSHIP_PHOTO_GALLERIES } from "@/lib/relationshipPhotoGallery";
import { PhotoPackActivationDialog } from "@/components/PhotoPackActivationDialog";

interface CompanionPhotosTabProps {
  companionId: string;
  companionDisplayName: string;
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
