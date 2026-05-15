/** Relationship-chat companions only (not doctor/kundli/etc.). */

export const ROLE_ADVISOR_COMPANION_IDS = new Set<string>([
  "doctor",
  "kundli",
  "parenting",
  "finance",
  "career",
  "krishna",
  "english",
]);

export function isRelationshipCompanion(companionId: string | null | undefined): boolean {
  return !!companionId && !ROLE_ADVISOR_COMPANION_IDS.has(companionId);
}

/** Clear gallery photos shown without sign-in or photo-pack purchase. */
export const PUBLIC_FREE_PHOTO_COUNT = 2;

export type CompanionGalleryConfig = {
  photoUrls: string[];
  /** Unlocked after ₹29 photo pack payment (`public/images/paid/<id>/`). */
  paidPhotoFilenames?: string[];
  /** Promo row below thumbnails */
  promoCardTitle: string;
};

function paidPhotoUrl(companionId: string, filename: string): string {
  return `/images/paid/${companionId}/${encodeURIComponent(filename)}`;
}

const NAINA_PAID_FILENAMES = [
  "36632b7e-bf34-4862-9588-8ee06f04d212.png",
  "686357597_122101798755300090_393545078209131648_n.jpg",
  "685864398_122096114187300090_81180518830205799_n.jpg",
  "cb897d21-1acd-4d7e-bf71-2abeb097b613.png",
  "tmpuvx2b93h.webp",
  "ChatGPT Image May 1, 2026, 11_30_57 AM.png",
  "grok-image-25fddcc9-cad2-4ce9-b234-526d5513d684.png",
  "grok-image-23952430-0e7b-484f-9d90-34627b56fbee (1).png",
  "686393433_122096268375300090_4931840912243380200_n.jpg",
  "692505858_122101938951300090_2352948556268362659_n.jpg",
  "696344326_122102095305300090_1952962570642911334_n.jpg",
  "grok-image-73f486f1-f63c-4c6d-a602-57bf9fdef5e6.jpeg",
  "grok-image-d9bf20c9-65b1-4f1b-a453-3129f779e915.jpeg",
  "grok-image-4fb42586-43d5-4db4-8d9c-820d32c850c6.png",
  "naina.png",
  "686935816_122101216125300090_5942071756292021643_n.jpg",
] as const;

/** Premium photo teasers per companion (paths under `public/`). */
export const RELATIONSHIP_PHOTO_GALLERIES: Partial<Record<string, CompanionGalleryConfig>> = {
  priya: {
    photoUrls: [
      "/images/priya-gallery/priya-photo-1.png",
      "/images/priya-gallery/priya-photo-2.png",
      "/images/priya-gallery/priya-photo-3.png",
      "/images/priya-gallery/priya-photo-4.png",
      "/images/priya-gallery/priya-photo-5.png",
    ],
    promoCardTitle: "Priya ki aur 100+ photos and videos dekhe",
  },
  ananya: {
    photoUrls: [
      "/images/ananya-gallery/ananya-photo-1.png",
      "/images/ananya-gallery/ananya-photo-2.png",
      "/images/ananya-gallery/ananya-photo-3.png",
      "/images/ananya-gallery/ananya-photo-4.png",
      "/images/ananya-gallery/ananya-photo-5.png",
      "/images/ananya-gallery/ananya-photo-6.png",
    ],
    promoCardTitle: "Ananya ki aur 100+ photos and videos dekhe",
  },
  meera: {
    photoUrls: [
      "/images/meera-gallery/meera-photo-1.png",
      "/images/meera-gallery/meera-photo-2.png",
      "/images/meera-gallery/meera-photo-3.png",
      "/images/meera-gallery/meera-photo-4.png",
      "/images/meera-gallery/meera-photo-5.png",
    ],
    promoCardTitle: "Meera ki aur 100+ photos and videos dekhe",
  },
  naina: {
    photoUrls: [
      "/images/naina-gallery/naina-photo-1.png",
      "/images/naina-gallery/naina-photo-2.png",
      "/images/naina-gallery/naina-photo-3.png",
    ],
    paidPhotoFilenames: [...NAINA_PAID_FILENAMES],
    promoCardTitle: "Naina ki aur 100+ photos and videos dekhe",
  },
};

export function getPaidPhotoUrls(companionId: string): string[] {
  const filenames = RELATIONSHIP_PHOTO_GALLERIES[companionId]?.paidPhotoFilenames;
  if (!filenames?.length) return [];
  return filenames.map((name) => paidPhotoUrl(companionId, name));
}

/** Shown below the gallery grid after photo pack unlock. */
export function getDailyPhotosUpdateMessage(companionDisplayName: string): string {
  const name = companionDisplayName.trim() || "your companion";
  return `Everyday 3-4 new photos are uploaded by ${name}. Check tomorrow for her latest photos`;
}
