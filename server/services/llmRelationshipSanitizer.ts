/** Clauses that imply the user was away/busy — removed from relationship replies. */
const BANNED_CLAUSE_PATTERNS: RegExp[] = [
  /\s*,?\s*tum\s+busy\s+the(?:\s+kya)?\s*\??/gi,
  /\s*,?\s*busy\s+the\s+kya\s*\??/gi,
  /\s*,?\s*acha\s*,?\s*tum\s+busy\s+the\s*\??/gi,
  /\s*,?\s*kahan\s+gaye\s+the(?:\s+kya)?\s*\??/gi,
  /\s*,?\s*itne\s+der\s+se\s+kahan\s+the\s*\??/gi,
  /\s*,?\s*itne\s+time\s+baad\s*/gi,
  /\s*,?\s*tum\s+kahan\s+the\s*\??/gi,
];

function tidySanitizedText(text: string): string {
  return text
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/,\s*,+/g, ",")
    .replace(/^[\s,.-]+|[\s,.-]+$/g, "")
    .trim();
}

/** Strip "tum busy the kya?" and similar off-topic clauses from model output. */
export function sanitizeRelationshipReply(content: string | null | undefined): string {
  if (content == null || typeof content !== "string") {
    return "";
  }
  let out = content.trim();
  if (!out) return out;

  for (const pattern of BANNED_CLAUSE_PATTERNS) {
    out = out.replace(pattern, "");
  }

  out = tidySanitizedText(out);
  if (out) return out;

  return "bas yahi, tum batao scene kya hai aaj 😊";
}
