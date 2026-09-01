/**
 * Karaoke caption model shared by the server (which computes timings) and the client
 * (which renders them).
 *
 * ── Handoff seam ──────────────────────────────────────────────────────────────
 * The VoxCPM handoff ships `drop-in/karaokeCaptions.ts` with the real implementations
 * of `getKaraokeTimedCaptions` / `buildKaraokeFromChunks` / `activeKaraokeAt`, which
 * derive word timings from the *measured* duration of each synthesised chunk.
 *
 * When those files land, replace `estimateKaraokeFromText` below with
 * `buildKaraokeFromChunks(result.chunks)` and keep everything else. The rendering side
 * only depends on the `KaraokeSegment` shape and on `activeKaraokeAt`, so nothing in
 * the UI has to change. If the drop-in's segment shape differs from the one here,
 * adapt it in this file only.
 */

export interface KaraokeWord {
  text: string;
  startSec: number;
  endSec: number;
}

export interface KaraokeSegment {
  text: string;
  startSec: number;
  endSec: number;
  words: KaraokeWord[];
}

export interface ActiveKaraoke {
  /** -1 before the first segment starts. */
  segmentIndex: number;
  /** -1 when no word inside the active segment has started yet. */
  wordIndex: number;
}

/**
 * Which segment/word is lit at time `t`.
 *
 * Deliberately clamps past the end: once the audio finishes, the final word stays
 * highlighted instead of blinking out. Gaps between segments hold the previous
 * segment rather than clearing the panel.
 */
export function activeKaraokeAt(segments: KaraokeSegment[], t: number): ActiveKaraoke {
  if (segments.length === 0) return { segmentIndex: -1, wordIndex: -1 };
  if (t < segments[0].startSec) return { segmentIndex: -1, wordIndex: -1 };

  let segmentIndex = 0;
  for (let i = 0; i < segments.length; i += 1) {
    if (t >= segments[i].startSec) segmentIndex = i;
    else break;
  }

  const { words } = segments[segmentIndex];
  let wordIndex = words.length > 0 ? 0 : -1;
  for (let i = 0; i < words.length; i += 1) {
    if (t >= words[i].startSec) wordIndex = i;
    else break;
  }

  return { segmentIndex, wordIndex };
}

/** Word-ish tokens, keeping punctuation attached so the rendered line reads naturally. */
function tokenize(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * Rough per-word timings for a single audio blob of known duration.
 *
 * Used until the VoxCPM chunk timings are available. Weights each word by its length
 * (a proxy for how long it takes to say) rather than splitting the duration evenly,
 * which keeps long words from running ahead of the voice. Expect drift of a few
 * hundred ms on long paragraphs — acceptable for a highlight, not for burn-in.
 */
export function estimateKaraokeFromText(
  text: string,
  durationSec: number,
  wordsPerSegment = 7,
): KaraokeSegment[] {
  const tokens = tokenize(text);
  if (tokens.length === 0 || !Number.isFinite(durationSec) || durationSec <= 0) return [];

  // A trailing pause is baked into most TTS output; reserve a little so the last word
  // does not stay un-highlighted while the tail plays out.
  const speechSec = durationSec * 0.98;
  // Punctuation should not lengthen a word's share. Latin + Devanagari cover the
  // Hinglish this app actually speaks; the tsconfig target predates \p{...} escapes.
  const weights = tokens.map((w) =>
    Math.max(1, w.replace(/[^0-9A-Za-z\u00C0-\u024F\u0900-\u097F]/g, "").length),
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  let cursor = 0;
  const timed: KaraokeWord[] = tokens.map((text, i) => {
    const startSec = cursor;
    cursor += (weights[i] / totalWeight) * speechSec;
    return { text, startSec, endSec: cursor };
  });

  const segments: KaraokeSegment[] = [];
  for (let i = 0; i < timed.length; i += wordsPerSegment) {
    const words = timed.slice(i, i + wordsPerSegment);
    segments.push({
      text: words.map((w) => w.text).join(" "),
      startSec: words[0].startSec,
      endSec: words[words.length - 1].endSec,
      words,
    });
  }
  return segments;
}
