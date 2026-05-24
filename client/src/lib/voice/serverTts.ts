import { stripTextForTts } from "@/lib/voice/stripTextForTts";

export type ServerTtsRequest = {
  text: string;
  voiceName: string;
};

export const fetchServerTtsAudio = async ({
  text,
  voiceName,
}: ServerTtsRequest): Promise<Blob> => {
  const spokenText = stripTextForTts(text);
  if (!spokenText) {
    throw new Error("No speakable text after removing emojis.");
  }
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: spokenText,
      voiceProvider: "google",
      voiceName,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`TTS failed (${res.status}) ${detail}`.trim());
  }
  return res.blob();
};
