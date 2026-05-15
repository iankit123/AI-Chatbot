import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Crown, Heart, X } from "lucide-react";
import {
  getPaidPhotoUrls,
  PUBLIC_FREE_PHOTO_COUNT,
  RELATIONSHIP_PHOTO_GALLERIES,
} from "@/lib/relationshipPhotoGallery";
import { PhotoPackActivationDialog } from "@/components/PhotoPackActivationDialog";
import { fetchBillingWallet } from "@/lib/billing";
import {
  clearPhotoPackUnlock,
  hasPhotoPackInWallet,
  PHOTO_PACK_UNLOCK_EVENT,
  setPhotoPackUnlocked,
} from "@/lib/photoPackUnlock";
import { getDeviceId, isUserRegisteredLocally } from "@/lib/supabase";
import { PhoneNameSignInDialog } from "@/components/PhoneNameSignInDialog";

interface CompanionPhotosTabProps {
  companionId: string;
  companionDisplayName: string;
}

const LOCKED_PREVIEW_ROWS = 3;
const LOCKED_PREVIEW_COLS = 3;
const LOCKED_PREVIEW_COUNT = LOCKED_PREVIEW_ROWS * LOCKED_PREVIEW_COLS;

function getFallbackPreviewUrls(): string[] {
  const allPhotoUrls = Object.values(RELATIONSHIP_PHOTO_GALLERIES).flatMap((entry) =>
    entry?.photoUrls ?? [],
  );
  const unique = Array.from(new Set(allPhotoUrls));
  if (unique.length > 0) return unique;
  return ["/images/companions/priya1.jpg"];
}

function GalleryPhotoTile({
  src,
  alt,
  onOpen,
}: {
  src: string;
  alt: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="overflow-hidden rounded-2xl border border-white/60 bg-white shadow-md outline-none ring-offset-2 transition hover:opacity-95 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-violet-500"
      aria-label={alt}
    >
      <img
        src={src}
        alt={alt}
        className="aspect-[3/4] w-full object-cover object-center"
        loading="lazy"
        decoding="async"
      />
    </button>
  );
}

type GalleryPhoto = { src: string; alt: string };

function PhotoLightbox({
  photos,
  index,
  open,
  onClose,
  onGoTo,
}: {
  photos: GalleryPhoto[];
  index: number;
  open: boolean;
  onClose: () => void;
  onGoTo: (index: number) => void;
}) {
  const current = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onGoTo(index - 1);
      if (e.key === "ArrowRight" && hasNext) onGoTo(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onGoTo, index, hasPrev, hasNext]);

  if (!open || !current) return null;

  const navBtnClass =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:pointer-events-none disabled:opacity-30";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.alt}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
        aria-label="Close photo"
      >
        <X className="h-5 w-5" />
      </button>

      {photos.length > 1 && (
        <p className="absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/45 px-3 py-1 text-xs font-medium tabular-nums text-white backdrop-blur-sm">
          {index + 1} / {photos.length}
        </p>
      )}

      <button
        type="button"
        disabled={!hasPrev}
        onClick={(e) => {
          e.stopPropagation();
          onGoTo(index - 1);
        }}
        className={`${navBtnClass} left-3 sm:left-4`}
        aria-label="Previous photo"
      >
        <ChevronLeft className="h-7 w-7" strokeWidth={2} />
      </button>

      <button
        type="button"
        disabled={!hasNext}
        onClick={(e) => {
          e.stopPropagation();
          onGoTo(index + 1);
        }}
        className={`${navBtnClass} right-3 sm:right-4`}
        aria-label="Next photo"
      >
        <ChevronRight className="h-7 w-7" strokeWidth={2} />
      </button>

      <img
        key={current.src}
        src={current.src}
        alt={current.alt}
        className="max-h-[80vh] max-w-[80vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

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
  const [signInOpen, setSignInOpen] = useState(false);
  const [registered, setRegistered] = useState(isUserRegisteredLocally);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [packCheckDone, setPackCheckDone] = useState(false);
  const gallery = RELATIONSHIP_PHOTO_GALLERIES[companionId];
  const paidPhotoUrls = getPaidPhotoUrls(companionId);
  const fallbackPreviewUrls = getFallbackPreviewUrls();
  const lockedTeaserUrls =
    gallery?.photoUrls.length ? gallery.photoUrls : fallbackPreviewUrls;
  const promoCardTitle =
    gallery?.promoCardTitle ?? `Unlock ${companionDisplayName}'s premium photo pack`;

  const publicPreviewUrls = useMemo(
    () => (gallery?.photoUrls ?? []).slice(0, PUBLIC_FREE_PHOTO_COUNT),
    [gallery?.photoUrls],
  );

  const viewablePhotos = useMemo((): GalleryPhoto[] => {
    const preview = publicPreviewUrls.map((src, i) => ({
      src,
      alt: `${companionDisplayName} photo ${i + 1}`,
    }));
    if (!unlocked) return preview;
    const extraFree =
      gallery?.photoUrls.slice(PUBLIC_FREE_PHOTO_COUNT).map((src, i) => ({
        src,
        alt: `${companionDisplayName} photo ${PUBLIC_FREE_PHOTO_COUNT + i + 1}`,
      })) ?? [];
    const paid = paidPhotoUrls.map((src, i) => ({
      src,
      alt: `${companionDisplayName} premium photo ${i + 1}`,
    }));
    return [...preview, ...extraFree, ...paid];
  }, [
    gallery?.photoUrls,
    paidPhotoUrls,
    unlocked,
    companionDisplayName,
    publicPreviewUrls,
  ]);

  useEffect(() => {
    const refreshAuth = () => setRegistered(isUserRegisteredLocally());
    refreshAuth();
    window.addEventListener("local-storage-auth", refreshAuth);
    window.addEventListener("storage", refreshAuth);
    return () => {
      window.removeEventListener("local-storage-auth", refreshAuth);
      window.removeEventListener("storage", refreshAuth);
    };
  }, []);

  useEffect(() => {
    setPackCheckDone(false);
    void fetchBillingWallet(getDeviceId()).then((wallet) => {
      if (wallet) {
        const hasPack = hasPhotoPackInWallet(wallet, companionId);
        if (hasPack) {
          setPhotoPackUnlocked(companionId);
        } else {
          clearPhotoPackUnlock(companionId);
        }
        setUnlocked(hasPack);
      } else {
        clearPhotoPackUnlock(companionId);
        setUnlocked(false);
      }
      setPackCheckDone(true);
    });
    const onUnlock = (e: Event) => {
      const detail = (e as CustomEvent<{ companionId?: string }>).detail;
      if (!detail?.companionId || detail.companionId === companionId) {
        void fetchBillingWallet(getDeviceId()).then((wallet) => {
          const hasPack = wallet ? hasPhotoPackInWallet(wallet, companionId) : false;
          setUnlocked(hasPack);
          if (hasPack) setPhotoPackUnlocked(companionId);
          else clearPhotoPackUnlock(companionId);
        });
      }
    };
    window.addEventListener(PHOTO_PACK_UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(PHOTO_PACK_UNLOCK_EVENT, onUnlock);
  }, [companionId]);

  const requestUnlock = () => {
    if (!registered) {
      setSignInOpen(true);
      return;
    }
    setActivationOpen(true);
  };

  const openPhotoAt = (index: number) => {
    if (index >= publicPreviewUrls.length) {
      requestUnlock();
      return;
    }
    setViewerIndex(index);
  };

  return (
    <div className="relative min-h-0 flex-1">
      <div className="absolute inset-0 overflow-y-auto overscroll-contain pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3">
        <div className="mx-auto w-full max-w-lg px-4">
          {!registered ? (
            <p className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-center text-sm text-amber-950">
              {publicPreviewUrls.length > 0
                ? `Preview ${publicPreviewUrls.length} photos below. Sign in to unlock the full gallery.`
                : `Sign in with your name and mobile number to view ${companionDisplayName}'s photos.`}
            </p>
          ) : !unlocked && packCheckDone ? (
            <p className="mb-3 rounded-xl border border-violet-200/80 bg-violet-50 px-3 py-2.5 text-center text-sm text-violet-950">
              Activate the photo pack (₹29) to unlock all of {companionDisplayName}&apos;s
              photos.
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            {publicPreviewUrls.map((src, i) => (
              <GalleryPhotoTile
                key={`preview-${src}`}
                src={src}
                alt={`${companionDisplayName} photo ${i + 1}`}
                onOpen={() => openPhotoAt(i)}
              />
            ))}
            {unlocked
              ? gallery?.photoUrls.slice(PUBLIC_FREE_PHOTO_COUNT).map((src, i) => (
                  <GalleryPhotoTile
                    key={`free-${src}`}
                    src={src}
                    alt={`${companionDisplayName} photo ${PUBLIC_FREE_PHOTO_COUNT + i + 1}`}
                    onOpen={() => openPhotoAt(PUBLIC_FREE_PHOTO_COUNT + i)}
                  />
                ))
              : null}
            {unlocked
              ? paidPhotoUrls.map((src, i) => {
                  const extraFreeCount = Math.max(
                    0,
                    (gallery?.photoUrls.length ?? 0) - PUBLIC_FREE_PHOTO_COUNT,
                  );
                  return (
                    <GalleryPhotoTile
                      key={src}
                      src={src}
                      alt={`${companionDisplayName} premium photo ${i + 1}`}
                      onOpen={() =>
                        openPhotoAt(PUBLIC_FREE_PHOTO_COUNT + extraFreeCount + i)
                      }
                    />
                  );
                })
              : null}
            {!unlocked
              ? Array.from({ length: LOCKED_PREVIEW_COUNT }).map((_, i) => {
                  const src = lockedTeaserUrls[i % lockedTeaserUrls.length];
                  return (
                    <LockedPhotoTile
                      key={`locked-${i}`}
                      src={src}
                      alt={
                        registered
                          ? `Unlock premium photos — ${companionDisplayName}`
                          : `Sign in to view more — ${companionDisplayName}`
                      }
                      onUnlock={requestUnlock}
                    />
                  );
                })
              : null}
          </div>

          {registered && !unlocked ? (
            <>
              <button
                type="button"
                onClick={requestUnlock}
                className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-100 via-fuchsia-50 to-rose-100 px-4 py-4 text-left shadow-md transition hover:opacity-95 active:scale-[0.99]"
              >
                <span className="text-base font-semibold leading-snug text-slate-900">
                  {promoCardTitle}
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </button>
              <p className="mt-2 pb-1 text-center text-[11px] text-slate-500">
                Tap to view ₹29 activation options
              </p>
            </>
          ) : !registered ? (
            <>
              <button
                type="button"
                onClick={requestUnlock}
                className="mt-6 flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-200/80 bg-gradient-to-r from-violet-100 via-fuchsia-50 to-rose-100 px-4 py-4 text-left shadow-md transition hover:opacity-95 active:scale-[0.99]"
              >
                <span className="text-base font-semibold leading-snug text-slate-900">
                  Sign in to view {companionDisplayName}&apos;s photos
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
                  <ChevronRight className="h-5 w-5" />
                </span>
              </button>
              <p className="mt-2 pb-1 text-center text-[11px] text-slate-500">
                Or use Sign in in the bottom navigation bar
              </p>
            </>
          ) : null}
        </div>
      </div>

      <PhotoLightbox
        photos={viewablePhotos}
        index={viewerIndex ?? 0}
        open={viewerIndex !== null && viewablePhotos.length > 0}
        onClose={() => setViewerIndex(null)}
        onGoTo={setViewerIndex}
      />

      <PhoneNameSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onSignedIn={() => {
          setRegistered(true);
          setSignInOpen(false);
          void fetchBillingWallet(getDeviceId()).then((wallet) => {
            if (!wallet) return;
            const hasPack = hasPhotoPackInWallet(wallet, companionId);
            if (hasPack) setPhotoPackUnlocked(companionId);
            else clearPhotoPackUnlock(companionId);
            setUnlocked(hasPack);
            setPackCheckDone(true);
          });
        }}
      />

      <PhotoPackActivationDialog
        open={activationOpen}
        onOpenChange={setActivationOpen}
        companionId={companionId}
        companionDisplayName={companionDisplayName}
      />
    </div>
  );
}
