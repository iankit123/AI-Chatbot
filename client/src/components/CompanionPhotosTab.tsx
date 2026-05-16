import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Crown, Heart, X } from "lucide-react";
import {
  galleryTeaserImageSrc,
  getDailyPhotosUpdateMessage,
  getGalleryMedia,
  getPaidPhotoUrls,
  PUBLIC_FREE_PHOTO_COUNT,
  RELATIONSHIP_PHOTO_GALLERIES,
  type GalleryMedia,
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

function getFallbackTeaserImages(): string[] {
  const all = Object.values(RELATIONSHIP_PHOTO_GALLERIES).flatMap((entry) =>
    getGalleryMedia(entry).map(galleryTeaserImageSrc),
  );
  const unique = Array.from(new Set(all));
  if (unique.length > 0) return unique;
  return ["/images/companions/priya1.jpg"];
}

function GalleryMediaTile({
  item,
  alt,
  onOpen,
}: {
  item: GalleryMedia;
  alt: string;
  onOpen: () => void;
}) {
  const isVideo = item.type === "video";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative overflow-hidden rounded-2xl border border-white/60 bg-white shadow-md outline-none ring-offset-2 transition hover:opacity-95 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-violet-500"
      aria-label={alt}
    >
      {isVideo ? (
        <>
          <img
            src={item.poster ?? item.src}
            alt=""
            className="aspect-[3/4] w-full object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-md">
              <span className="ml-0.5 text-lg leading-none">▶</span>
            </span>
          </span>
        </>
      ) : (
        <img
          src={item.src}
          alt={alt}
          className="aspect-[3/4] w-full object-cover object-center"
          loading="lazy"
          decoding="async"
        />
      )}
    </button>
  );
}

type GalleryItem = GalleryMedia & { alt: string };

function seedLikeCount(photoSrc: string): number {
  let h = 2166136261;
  for (let i = 0; i < photoSrc.length; i++) {
    h ^= photoSrc.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 2100 + (Math.abs(h) % 1900);
}

function PhotoLikeButton({ photoSrc }: { photoSrc: string }) {
  const [likeCount, setLikeCount] = useState(() => seedLikeCount(photoSrc));
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    setLikeCount(seedLikeCount(photoSrc));
    setLiked(false);
  }, [photoSrc]);

  const onLike = useCallback(() => {
    setLikeCount((c) => c + 1);
    setLiked(true);
  }, []);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onLike();
      }}
      className="flex shrink-0 flex-col items-center gap-0.5 rounded-tl-xl rounded-br-xl border border-white/20 bg-black/60 px-2.5 py-1.5 text-white backdrop-blur-md transition active:scale-95 hover:bg-black/70"
      aria-label={`Like photo, ${likeCount} likes`}
    >
      <Heart
        className={`h-6 w-6 transition-colors ${liked ? "fill-rose-500 text-rose-500" : "text-white"}`}
        strokeWidth={liked ? 0 : 2}
      />
      <span className="text-xs font-semibold tabular-nums leading-none">
        {likeCount.toLocaleString("en-IN")}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-white/75">
        likes
      </span>
    </button>
  );
}

function PhotoLightbox({
  photos,
  index,
  open,
  onClose,
  onGoTo,
}: {
  photos: GalleryItem[];
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

      <div
        className="relative mx-12 flex max-h-[78vh] max-w-[min(80vw,100%)] items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          disabled={!hasPrev}
          onClick={(e) => {
            e.stopPropagation();
            onGoTo(index - 1);
          }}
          className={`${navBtnClass} -left-11 sm:-left-12`}
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-7 w-7" strokeWidth={2} />
        </button>

        <div className="relative inline-block max-h-[72vh] max-w-full">
          {current.type === "video" ? (
            <video
              key={current.src}
              src={current.src}
              poster={current.poster}
              className="block max-h-[72vh] max-w-[80vw] rounded-xl bg-black object-contain shadow-2xl"
              controls
              autoPlay
              playsInline
            />
          ) : (
            <img
              key={current.src}
              src={current.src}
              alt={current.alt}
              className="block max-h-[72vh] max-w-[80vw] rounded-xl object-contain shadow-2xl"
            />
          )}

          {/* Thumbnail: bottom-left. Like: bottom-right — change bottom-0 / left-0 / right-0 */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="pointer-events-auto absolute bottom-0 left-0 flex max-w-[55%] items-end gap-1 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {photos.length <= 2 ? (
            <div className="relative shrink-0 overflow-hidden rounded-xl border-2 border-white shadow-lg ring-2 ring-white/40">
              <img
                src={
                  current.type === "video"
                    ? current.poster ?? current.src
                    : current.src
                }
                alt=""
                className="h-14 w-11 object-cover object-center sm:h-16 sm:w-12"
              />
            </div>
          ) : (
            photos.map((photo, i) => (
              <button
                key={`${photo.type}-${photo.src}`}
                type="button"
                onClick={() => onGoTo(i)}
                className={`relative shrink-0 overflow-hidden rounded-xl border-2 transition ${
                  i === index
                    ? "border-white shadow-lg ring-2 ring-white/40"
                    : "border-white/25 opacity-70 hover:opacity-100"
                }`}
                aria-label={photo.alt}
                aria-current={i === index ? "true" : undefined}
              >
                <img
                  src={
                    photo.type === "video"
                      ? photo.poster ?? photo.src
                      : photo.src
                  }
                  alt=""
                  className="h-14 w-11 object-cover object-center sm:h-16 sm:w-12"
                />
              </button>
            ))
          )}
        </div>

            <div className="pointer-events-auto absolute bottom-0 right-0">
              <PhotoLikeButton photoSrc={current.src} />
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!hasNext}
          onClick={(e) => {
            e.stopPropagation();
            onGoTo(index + 1);
          }}
          className={`${navBtnClass} -right-11 sm:-right-12`}
          aria-label="Next photo"
        >
          <ChevronRight className="h-7 w-7" strokeWidth={2} />
        </button>
      </div>
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
  const promoCardTitle =
    gallery?.promoCardTitle ?? `Unlock ${companionDisplayName}'s premium photo pack`;

  const allMedia = useMemo(() => getGalleryMedia(gallery), [gallery]);

  const lockedTeaserUrls = useMemo(() => {
    const fromGallery = allMedia.map(galleryTeaserImageSrc);
    if (fromGallery.length > 0) return fromGallery;
    return getFallbackTeaserImages();
  }, [allMedia]);

  const publicPreviewMedia = useMemo(
    () => allMedia.slice(0, PUBLIC_FREE_PHOTO_COUNT),
    [allMedia],
  );

  const mediaAlt = (item: GalleryMedia, index: number) =>
    item.type === "video"
      ? `${companionDisplayName} video ${index + 1}`
      : `${companionDisplayName} photo ${index + 1}`;

  const viewablePhotos = useMemo((): GalleryItem[] => {
    const preview: GalleryItem[] = publicPreviewMedia.map((item, i) => ({
      ...item,
      alt: mediaAlt(item, i),
    }));
    if (!unlocked) return preview;
    const extraFree: GalleryItem[] = allMedia
      .slice(PUBLIC_FREE_PHOTO_COUNT)
      .map((item, i) => ({
        ...item,
        alt: mediaAlt(item, PUBLIC_FREE_PHOTO_COUNT + i),
      }));
    const paid: GalleryItem[] = paidPhotoUrls.map((src, i) => ({
      src,
      type: "image" as const,
      alt: `${companionDisplayName} premium photo ${i + 1}`,
    }));
    return [...preview, ...extraFree, ...paid];
  }, [
    allMedia,
    paidPhotoUrls,
    unlocked,
    companionDisplayName,
    publicPreviewMedia,
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
    if (index >= publicPreviewMedia.length) {
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
              {publicPreviewMedia.length > 0
                ? `Preview ${publicPreviewMedia.length} items below. Sign in to unlock the full gallery.`
                : `Sign in with your name and mobile number to view ${companionDisplayName}'s photos.`}
            </p>
          ) : !unlocked && packCheckDone ? (
            <p className="mb-3 rounded-xl border border-violet-200/80 bg-violet-50 px-3 py-2.5 text-center text-sm text-violet-950">
              Activate the photo pack (₹29) to unlock all of {companionDisplayName}&apos;s
              photos.
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            {publicPreviewMedia.map((item, i) => (
              <GalleryMediaTile
                key={`preview-${item.type}-${item.src}`}
                item={item}
                alt={mediaAlt(item, i)}
                onOpen={() => openPhotoAt(i)}
              />
            ))}
            {unlocked
              ? allMedia.slice(PUBLIC_FREE_PHOTO_COUNT).map((item, i) => (
                  <GalleryMediaTile
                    key={`free-${item.type}-${item.src}`}
                    item={item}
                    alt={mediaAlt(item, PUBLIC_FREE_PHOTO_COUNT + i)}
                    onOpen={() => openPhotoAt(PUBLIC_FREE_PHOTO_COUNT + i)}
                  />
                ))
              : null}
            {unlocked
              ? paidPhotoUrls.map((src, i) => {
                  const extraFreeCount = Math.max(
                    0,
                    allMedia.length - PUBLIC_FREE_PHOTO_COUNT,
                  );
                  return (
                    <GalleryMediaTile
                      key={src}
                      item={{ src, type: "image" }}
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

          {unlocked && packCheckDone ? (
            <p className="mt-4 rounded-xl border border-[#128C7E]/20 bg-[#e8f5f3] px-3.5 py-3 text-center text-sm leading-snug text-slate-800">
              {getDailyPhotosUpdateMessage(companionDisplayName)}
            </p>
          ) : null}

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
