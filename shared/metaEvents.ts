/** Meta Pixel ID — base script lives in client/index.html */
export const META_PIXEL_ID = "1838700220429198";

/**
 * The Pixel and the Conversions API send a purchase with this same id, so Meta counts it
 * once. Both the browser and the server know the Razorpay order id.
 */
export function metaPurchaseEventId(razorpayOrderId: string): string {
  return `purchase_${razorpayOrderId}`;
}

/** Browser details the server forwards to the Conversions API. */
export type MetaBrowserContext = {
  /** Same id the Pixel used for this event (lets Meta drop the duplicate). */
  event_id?: string;
  fbp?: string | null;
  fbc?: string | null;
  event_source_url?: string | null;
};
