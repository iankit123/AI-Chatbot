import { stripTextForTts } from "@/lib/voice/stripTextForTts";
import { estimateKaraokeFromText, type KaraokeSegment } from "@shared/voice/karaoke";

export interface SpokenClip {
  /** Object URL or server URL for an <audio src>. Revoke object URLs via `release`. */
  audioUrl: string;
  durationSec: number;
  segments: KaraokeSegment[];
  release?: () => void;
}

export interface SpeakOptions {
  text: string;
  signal?: AbortSignal;
  /** Coarse progress for the UI: 0..1, or null when the provider is synchronous. */
  onProgress?: (fraction: number | null, note: string) => void;
}

export type VoiceSource = (opts: SpeakOptions) => Promise<SpokenClip>;

const readAudioDuration = (url: string) =>
  new Promise<number>((resolve) => {
    const probe = new Audio();
    probe.preload = "metadata";
    probe.onloadedmetadata = () => resolve(Number.isFinite(probe.duration) ? probe.duration : 0);
    probe.onerror = () => resolve(0);
    probe.src = url;
  });

/** Deep, calm Indian-English voice; closest match in the Google set to the god-voice reference. */
const KRISHNA_GOOGLE_VOICE = "en-IN-Wavenet-B";

/**
 * Existing Google TTS path (`POST /api/tts`), already wired in this app.
 *
 * Synchronous and good enough to drive the speaking popup today. Word timings are
 * estimated from the clip's measured duration — see `estimateKaraokeFromText`.
 */
export const googleVoiceSource: VoiceSource = async ({ text, signal, onProgress }) => {
  const spoken = stripTextForTts(text);
  if (!spoken) throw new Error("Nothing to speak.");

  onProgress?.(null, "Preparing voice…");
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: spoken, voiceProvider: "google", voiceName: KRISHNA_GOOGLE_VOICE }),
    signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Voice failed (${res.status}) ${detail}`.trim());
  }

  const blob = await res.blob();
  const audioUrl = URL.createObjectURL(blob);
  const durationSec = await readAudioDuration(audioUrl);
  return {
    audioUrl,
    durationSec,
    segments: estimateKaraokeFromText(spoken, durationSec),
    release: () => URL.revokeObjectURL(audioUrl),
  };
};

interface VoiceJobStatus {
  state: "pending" | "running" | "done" | "failed";
  audioUrl?: string;
  durationSec?: number;
  segments?: KaraokeSegment[];
  error?: string;
  /** Optional 0..1 hint from the server; falls back to a word-rate estimate. */
  progress?: number;
}

/**
 * VoxCPM path. Implements the async job contract from the handoff:
 *   POST /api/voice/generate  -> { jobId }
 *   GET  /api/voice/status/:jobId -> VoiceJobStatus
 *
 * The server half of this (pod pool, `synthesizeLong` with the god-voice reference,
 * ffmpeg transcode, `buildKaraokeFromChunks`) is NOT implemented yet — it needs the
 * drop-in files and `VOXCPM_VOICE_URL` from the handoff. Until then this source is
 * unreachable; `resolveVoiceSource` selects Google.
 */
export const voxcpmVoiceSource: VoiceSource = async ({ text, signal, onProgress }) => {
  const spoken = stripTextForTts(text);
  if (!spoken) throw new Error("Nothing to speak.");

  const startRes = await fetch("/api/voice/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: spoken }),
    signal,
  });
  if (!startRes.ok) throw new Error(`Could not start voice job (${startRes.status})`);
  const { jobId } = (await startRes.json()) as { jobId: string };

  // Chunked across 4 pods the handoff measures ~0.2s/word, so we can show a real ETA
  // instead of an indeterminate spinner.
  const etaSec = Math.max(4, spoken.split(/\s+/).filter(Boolean).length * 0.2);
  const startedAt = Date.now();

  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    await new Promise((r) => setTimeout(r, 1000));

    const res = await fetch(`/api/voice/status/${encodeURIComponent(jobId)}`, { signal });
    if (!res.ok) throw new Error(`Voice job lookup failed (${res.status})`);
    const status = (await res.json()) as VoiceJobStatus;

    if (status.state === "failed") throw new Error(status.error || "Voice generation failed.");
    if (status.state === "done") {
      if (!status.audioUrl) throw new Error("Voice job finished without audio.");
      const durationSec = status.durationSec ?? (await readAudioDuration(status.audioUrl));
      return {
        audioUrl: status.audioUrl,
        durationSec,
        segments: status.segments ?? estimateKaraokeFromText(spoken, durationSec),
      };
    }

    const elapsed = (Date.now() - startedAt) / 1000;
    const fraction = status.progress ?? Math.min(0.95, elapsed / etaSec);
    const remaining = Math.max(1, Math.round(etaSec - elapsed));
    onProgress?.(fraction, `Krishna is preparing to speak… about ${remaining}s`);
  }
};

/**
 * Set `VITE_VOICE_PROVIDER=voxcpm` once the server job endpoints exist.
 * Anything else (including unset) uses the Google path that works today.
 */
export function resolveVoiceSource(): VoiceSource {
  return import.meta.env.VITE_VOICE_PROVIDER === "voxcpm" ? voxcpmVoiceSource : googleVoiceSource;
}
