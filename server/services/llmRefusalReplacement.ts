/** In-character reply when the model returns a generic explicit-content refusal. */
export const EXPLICIT_CONTENT_REFUSAL_REPLY =
  "Mai aisi baate abhi nahi karna chahti. Phele thodi der baat karo, phir hum yaha tak aaenge. hihi";

/**
 * Detects common provider refusals for explicit/sexual content and swaps for persona text.
 */
export function replaceLlmExplicitContentRefusal(
  content: string | null | undefined,
): string {
  if (content == null || typeof content !== "string") {
    return "";
  }
  const trimmed = content.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLowerCase();

  const isGenericExplicitRefusal =
    lower.includes("cannot create content that is explicit or sexual") ||
    (lower.includes("explicit or sexual in nature") &&
      (lower.includes("cannot") ||
        lower.includes("can't") ||
        lower.includes("unable") ||
        lower.includes("i'm not able")));

  if (isGenericExplicitRefusal) {
    return EXPLICIT_CONTENT_REFUSAL_REPLY;
  }
  return content;
}
