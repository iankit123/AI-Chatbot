/** First token of a display name — for casual chat ("Ankit", not "Ankit Agarwal"). */
export function firstNameOnly(full: string | null | undefined): string {
  const trimmed = (full ?? "").trim();
  if (!trimmed) return "";
  const word = trimmed.split(/\s+/)[0];
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}
