/** User asked for phone number, call, WhatsApp, etc. */
export function isCallOrNumberRequest(text: string): boolean {
  const n = text.trim().toLowerCase();
  if (!n) return false;
  return (
    /\b(call|phone|number|mobile|whatsapp)\b/.test(n) ||
    /\bno\.?\b/.test(n) ||
    /\bnumber\s*do\b/.test(n) ||
    /\bapna\s*number\b/.test(n) ||
    /\bcall\s*kar/.test(n) ||
    /\bvideo\s*call\b/.test(n) ||
    /नंबर/.test(n) ||
    /कॉल/.test(n) ||
    /फ़ोन|फोन/.test(n)
  );
}
