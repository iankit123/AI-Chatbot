import { useEffect, useRef, useState } from "react";

/**
 * Reports an <audio> element's playback position on every animation frame.
 *
 * `timeupdate` fires only ~4x/second, which is far too coarse to drive a per-word
 * highlight — it makes the caption visibly lag then jump. rAF gives us the position
 * once per painted frame, which is what a karaoke highlight needs.
 *
 * Takes the element itself rather than a ref object. The <audio> is rendered inside
 * a Radix portal, which mounts after this component's effects run, so a ref would be
 * null on the first pass and — with a stable ref object as the only dependency — the
 * effect would never re-run to attach its listeners. Pass a callback-ref element and
 * the effect re-runs the moment it mounts.
 *
 * ── Handoff seam ──
 * The VoxCPM handoff exports a `useAudioClock` from `drop-in/KaraokeCaption.tsx`.
 * If its behaviour differs, prefer theirs and delete this file.
 */
export function useAudioClock(el: HTMLAudioElement | null) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!el) {
      setCurrentTime(0);
      setDuration(0);
      setPlaying(false);
      return;
    }

    const tick = () => {
      setCurrentTime(el.currentTime);
      frameRef.current = requestAnimationFrame(tick);
    };

    const start = () => {
      setPlaying(true);
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(tick);
    };
    const stop = () => {
      setPlaying(false);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      // One final read so the highlight lands exactly on the last word.
      setCurrentTime(el.currentTime);
    };
    const onLoaded = () => {
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    };

    el.addEventListener("play", start);
    el.addEventListener("playing", start);
    el.addEventListener("pause", stop);
    el.addEventListener("ended", stop);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("durationchange", onLoaded);
    if (!el.paused) start();
    onLoaded();

    return () => {
      el.removeEventListener("play", start);
      el.removeEventListener("playing", start);
      el.removeEventListener("pause", stop);
      el.removeEventListener("ended", stop);
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("durationchange", onLoaded);
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [el]);

  return { currentTime, duration, playing };
}
