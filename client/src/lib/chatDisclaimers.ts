/**
 * Shown once at the top of the chat (above suggestions). Keep in sync with server safety rules — do not repeat in model replies.
 *
 * Relationship / companion personas (Landing Page) intentionally have no banner — only specialized assistants show notes.
 */
const RELATIONSHIP_COMPANION_IDS = new Set([
  "naina",
  "priya",
  "ananya",
  "meera",
  "riya",
  "neha",
]);

export function getPersistentChatDisclaimer(companionId: string): string | null {
  const id = companionId.toLowerCase();

  const byRole: Record<string, string> = {
    doctor:
      "Yeh sirf educational information hai. Kisi bhi serious health issue ke liye qualified doctor se consult karein.",
    kundli:
      "Yeh astrology guidance hai, guaranteed predictions nahi. Apni life ke important decisions ke liye proper planning aur consultation karein.",
    parenting:
      "Yeh general parenting guidance hai. Baby ke health concerns ke liye hamesha pediatrician se consult karein.",
    finance:
      "Yeh educational finance information hai. Investment decisions ke liye qualified financial advisor se consult karein. Past performance future results guarantee nahi karti.",
    career:
      "Yeh career guidance hai. Job opportunities aur placements guarantee nahi ki ja sakti. Proper skills aur networking important hai.",
    krishna:
      "Yeh spiritual life guidance hai inspired by Gita values — miracles ya guaranteed predictions nahi. Medical, legal ya finance ke liye qualified professionals se consult karein.",
    english:
      "यह अंग्रेज़ी सीखने में मदद है — कोई परीक्षा या वीज़ा की गारंटी नहीं। ज़रूरत हो तो किसी योग्य शिक्षक या संस्थान से भी सीखें।",
  };

  if (byRole[id]) return byRole[id];

  if (RELATIONSHIP_COMPANION_IDS.has(id)) return null;

  // Non-relationship companion ids we don't recognize — optional generic (none today)
  return null;
}
