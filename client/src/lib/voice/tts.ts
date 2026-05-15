export interface BrowserTTSOptions {
  voiceName?: string;
  rate?: number;
  pitch?: number;
  lang?: string;
}

const pickVoice = (voiceName?: string, langHint?: string): SpeechSynthesisVoice | null => {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  if (voiceName) {
    const exact = voices.find((v) => v.name === voiceName);
    if (exact) return exact;
    const partial = voices.find((v) =>
      v.name.toLowerCase().includes(voiceName.toLowerCase()),
    );
    if (partial) return partial;
  }
  if (langHint) {
    const langVoice = voices.find((v) =>
      v.lang.toLowerCase().startsWith(langHint.toLowerCase()),
    );
    if (langVoice) return langVoice;
  }
  return voices[0] ?? null;
};

const loadVoices = async (): Promise<void> => {
  const synth = window.speechSynthesis;
  if (synth.getVoices().length > 0) return;
  await new Promise<void>((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(), 1200);
    const onVoicesChanged = () => {
      window.clearTimeout(timeoutId);
      synth.removeEventListener("voiceschanged", onVoicesChanged);
      resolve();
    };
    synth.addEventListener("voiceschanged", onVoicesChanged);
    // Trigger lazy voice list loading in some Chromium builds.
    synth.getVoices();
  });
};

export const speakWithBrowserTTS = (
  text: string,
  options: BrowserTTSOptions = {},
): Promise<void> => {
  if (!("speechSynthesis" in window)) {
    return Promise.reject(new Error("Speech synthesis is not supported in this browser."));
  }
  const content = text.trim();
  if (!content) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const synth = window.speechSynthesis;
    synth.cancel();
    // Chromium can fire `interrupted` if speak() runs in the same tick as cancel().
    window.setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(content);
      utterance.rate = Math.min(2, Math.max(0.5, options.rate ?? 1));
      utterance.pitch = Math.min(2, Math.max(0, options.pitch ?? 1));
      utterance.volume = 1;
      if (options.lang) utterance.lang = options.lang;
      utterance.onend = () => resolve();
      utterance.onerror = (event) =>
        reject(new Error(`Failed to synthesize speech (${event.error || "unknown"}).`));

      void loadVoices().finally(() => {
        const selected = pickVoice(options.voiceName, options.lang);
        if (selected) utterance.voice = selected;
        if (synth.paused) synth.resume();
        synth.speak(utterance);
      });
    }, 60);
  });
};
