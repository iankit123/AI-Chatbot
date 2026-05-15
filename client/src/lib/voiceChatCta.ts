/** Stored on Message.contextInfo — renders as voice-chat CTA card (not plain text). */
export const VOICE_CHAT_CTA_CONTEXT = "voice_chat_cta";

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

export function voiceChatOkReply(language: "hindi" | "english"): string {
  return language === "hindi" ? "Ok.. 😊" : "Ok.. 😊";
}

export function buildVoiceChatCtaLabel(
  companionName: string,
  language: "hindi" | "english",
): string {
  const name = companionName.trim() || "Saathi";
  if (language === "hindi") {
    return `${name} se voice chat karne ke liye click karein`;
  }
  return `Click for voice chat with ${name}`;
}
