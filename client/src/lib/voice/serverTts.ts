export type ServerTtsRequest = {
  text: string;
  voiceName: string;
};

export const fetchServerTtsAudio = async ({
  text,
  voiceName,
}: ServerTtsRequest): Promise<Blob> => {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
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
