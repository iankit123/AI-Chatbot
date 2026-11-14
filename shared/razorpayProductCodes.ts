/** Product codes sent to Razorpay (checkout + order notes). Full labels stay in our DB only. */

export type RazorpayProductCode = "CR" | "PP" | "VC" | "PM" | "OT";

export const RAZORPAY_MERCHANT_DISPLAY_NAME = "Puchlo.in";

const PRODUCT_TYPE_TO_CODE: Record<string, RazorpayProductCode> = {
  chat_recharge: "CR",
  photo_pack: "PP",
  voice_chat: "VC",
  premium_photo: "PM",
  other: "OT",
};

/** Opaque companion slots — not human-readable names. */
const COMPANION_SLOT: Record<string, string> = {
  naina: "R01",
  priya: "R02",
  ananya: "R03",
  meera: "R04",
  riya: "R05",
  neha: "R06",
  doctor: "A01",
  kundli: "A02",
  parenting: "A03",
  finance: "A04",
  career: "A05",
  krishna: "A06",
  english: "A07",
  relationship: "A08",
};

export function productTypeToCode(productType: string): RazorpayProductCode {
  return PRODUCT_TYPE_TO_CODE[productType] ?? "OT";
}

export function companionIdToSlot(companionId: string | null | undefined): string | undefined {
  if (!companionId?.trim()) return undefined;
  const key = companionId.trim().toLowerCase();
  if (COMPANION_SLOT[key]) return COMPANION_SLOT[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return `X${(hash % 10000).toString().padStart(4, "0")}`;
}

export function buildRazorpayCheckoutDisplay(
  productType: string,
  amountRupees: number,
): { name: string; description: string } {
  const code = productTypeToCode(productType);
  return {
    name: RAZORPAY_MERCHANT_DISPLAY_NAME,
    description: `${code}-${Math.round(amountRupees)}`,
  };
}

/** Minimal notes on Razorpay orders (pc = product code, pid = payment row id, cid = companion slot). */
export function buildRazorpayGatewayNotes(input: {
  paymentId: string;
  productType: string;
  companionId?: string | null;
}): Record<string, string> {
  const notes: Record<string, string> = {
    pc: productTypeToCode(input.productType),
    pid: input.paymentId,
  };
  const slot = companionIdToSlot(input.companionId);
  if (slot) notes.cid = slot;
  return notes;
}

export function receiptPrefixForProduct(productType: string): string {
  return productTypeToCode(productType);
}
