/**
 * Hindi (India) Google Cloud Text-to-Speech voices exposed in Voice Chat UI.
 * Server: POST /api/tts with `voiceName` (see `server/routes.ts` → `synthesizeGoogleTts`).
 */
export const RELATIONSHIP_GOOGLE_TTS_VOICE_OPTIONS = [
  "hi-IN-Wavenet-E",
  "hi-IN-Wavenet-D",
  "hi-IN-Wavenet-A",
  "hi-IN-Standard-E",
  "hi-IN-Standard-D",
  "hi-IN-Standard-A",
  "hi-IN-Neural2-D",
  "hi-IN-Neural2-A",
  "hi-IN-Chirp3-HD-Zephyr",
  "hi-IN-Chirp3-HD-Vindemiatrix",
  "hi-IN-Chirp3-HD-Sulafat",
  "hi-IN-Chirp3-HD-Pulcherrima",
  "hi-IN-Chirp3-HD-Leda",
  "hi-IN-Chirp3-HD-Laomedeia",
  "hi-IN-Chirp3-HD-Kore",
  "hi-IN-Chirp3-HD-Gacrux",
  "hi-IN-Chirp3-HD-Erinome",
  "hi-IN-Chirp3-HD-Despina",
  "hi-IN-Chirp3-HD-Callirrhoe",
  "hi-IN-Chirp3-HD-Autonoe",
  "hi-IN-Chirp3-HD-Aoede",
  "hi-IN-Chirp3-HD-Achernar",
] as const;

export type RelationshipGoogleTtsVoice = (typeof RELATIONSHIP_GOOGLE_TTS_VOICE_OPTIONS)[number];

export const DEFAULT_RELATIONSHIP_GOOGLE_TTS_VOICE: RelationshipGoogleTtsVoice = "hi-IN-Chirp3-HD-Zephyr";

const OPTION_SET = new Set<string>(RELATIONSHIP_GOOGLE_TTS_VOICE_OPTIONS);

export function normalizeRelationshipGoogleTtsVoice(raw: string | undefined | null): RelationshipGoogleTtsVoice {
  const v = raw?.trim();
  if (v && OPTION_SET.has(v)) return v as RelationshipGoogleTtsVoice;
  return DEFAULT_RELATIONSHIP_GOOGLE_TTS_VOICE;
}

export const RELATIONSHIP_GOOGLE_TTS_VOICE_STORAGE_KEY = "relationshipGoogleTtsVoice";
