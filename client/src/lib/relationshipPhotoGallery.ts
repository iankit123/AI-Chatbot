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

export type CompanionGalleryConfig = {
  photoUrls: string[];
  /** Promo row below thumbnails */
  promoCardTitle: string;
};

/** Premium photo teasers per companion (paths under `client/public`). */
export const RELATIONSHIP_PHOTO_GALLERIES: Partial<Record<string, CompanionGalleryConfig>> = {
  naina: {
    photoUrls: [
      "/images/naina-gallery/naina-photo-1.png",
      "/images/naina-gallery/naina-photo-2.png",
      "/images/naina-gallery/naina-photo-3.png",
    ],
    promoCardTitle: "Naina ki aur 100+ photos and videos dekhe",
  },
};
