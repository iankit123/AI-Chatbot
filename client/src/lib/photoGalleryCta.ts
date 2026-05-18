import { FREE_USER_MESSAGE_ALLOWANCE } from "@/lib/chatPaywall";
import { isRelationshipCompanion } from "@/lib/relationshipPhotoGallery";

/** Stored on Message.contextInfo — renders as photo/video tab CTA card. */
export const PHOTO_GALLERY_CTA_CONTEXT = "photo_gallery_cta";

const GALLERY_CTA_SHOWN_KEY = (companionId: string) =>
  `galleryCtaShown_${companionId}`;

export function hasShownPhotoGalleryCta(companionId: string): boolean {
  return localStorage.getItem(GALLERY_CTA_SHOWN_KEY(companionId)) === "1";
}

export function markPhotoGalleryCtaShown(companionId: string): void {
  localStorage.setItem(GALLERY_CTA_SHOWN_KEY(companionId), "1");
}

export function clearPhotoGalleryCtaShown(companionId: string): void {
  localStorage.removeItem(GALLERY_CTA_SHOWN_KEY(companionId));
}

/** User message index before send; last free reply is on the 5th user message. */
export function shouldOfferPhotoGalleryCta(
  companionId: string,
  messageCountBeforeSend: number,
): boolean {
  if (!isRelationshipCompanion(companionId)) return false;
  if (hasShownPhotoGalleryCta(companionId)) return false;
  return messageCountBeforeSend + 1 === FREE_USER_MESSAGE_ALLOWANCE;
}

export function photoGalleryIntroReply(language: "hindi" | "english"): string {
  if (language === "hindi") {
    return "Ye meri pictures hai, agar tum interested ho to..";
  }
  return "These are my pictures — if you're interested..";
}

export function buildPhotoGalleryCtaLabel(companionName: string): string {
  const name = companionName.trim();
  return name
    ? `${name} ki images k liye yaha click kare`
    : "Images dekhne ke liye yaha click kare";
}
