import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAudioClock } from "@/hooks/useAudioClock";
import { resolveVoiceSource, type SpokenClip } from "@/lib/voice/speakingVoiceSource";
import { activeKaraokeAt } from "@shared/voice/karaoke";
import { Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Krishna is muted on purpose: the clip may carry its own background score, and the
 * only audio in this popup is the spoken answer. Swap in the .mp4 when it lands —
 * a still image renders through the same slot.
 */
const DEFAULT_MEDIA_SRC = "/images/krishna-speaking.mp4";
const FALLBACK_MEDIA_SRC = "/images/krishna-card.png";

const isVideo = (src: string) => /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(src);

interface KrishnaSpeakingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The assistant reply to speak and caption. */
  text: string;
  /** Video (muted, looping) or still image shown in the right half. */
  mediaSrc?: string;
}

type LoadState =
  | { kind: "idle" }
  | { kind: "loading"; fraction: number | null; note: string }
  | { kind: "ready"; clip: SpokenClip }
  | { kind: "error"; message: string };

export function KrishnaSpeakingDialog({
  open,
  onOpenChange,
  text,
  mediaSrc = DEFAULT_MEDIA_SRC,
}: KrishnaSpeakingDialogProps) {
  const [state, setState] = useState<LoadState>({ kind: "idle" });
  const [mediaFailed, setMediaFailed] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const activeLineRef = useRef<HTMLParagraphElement | null>(null);
  const { currentTime, playing } = useAudioClock(audioEl);

  const resolvedMedia = mediaFailed ? FALLBACK_MEDIA_SRC : mediaSrc;

  const generate = useCallback(
    (signal: AbortSignal) => {
      setState({ kind: "loading", fraction: null, note: "Preparing voice…" });
      resolveVoiceSource()({
        text,
        signal,
        onProgress: (fraction, note) => {
          if (!signal.aborted) setState({ kind: "loading", fraction, note });
        },
      })
        .then((clip) => {
          if (signal.aborted) {
            clip.release?.();
            return;
          }
          setState({ kind: "ready", clip });
        })
        .catch((err: unknown) => {
          if (signal.aborted || (err instanceof DOMException && err.name === "AbortError")) return;
          setState({
            kind: "error",
            message: err instanceof Error ? err.message : "Could not generate the voice.",
          });
        });
    },
    [text],
  );

  // Generate on open; tear down the clip (and any in-flight job) on close.
  useEffect(() => {
    if (!open || !text.trim()) return;
    const controller = new AbortController();
    generate(controller.signal);
    return () => controller.abort();
  }, [open, text, generate]);

  useEffect(() => {
    if (state.kind !== "ready") return;
    return () => state.clip.release?.();
  }, [state]);

  // Autoplay as soon as the clip is ready. The dialog only opens from a tap, so the
  // browser's autoplay gesture requirement is already satisfied; if it still refuses,
  // the play button below is the fallback.
  useEffect(() => {
    if (state.kind !== "ready") return;
    audioEl?.play().catch(() => {
      /* user can press play */
    });
  }, [state, audioEl]);

  const segments = state.kind === "ready" ? state.clip.segments : [];
  const duration = state.kind === "ready" ? state.clip.durationSec : 0;
  const active = useMemo(() => activeKaraokeAt(segments, currentTime), [segments, currentTime]);

  // Keep the line being spoken in view without yanking the panel on every word.
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [active.segmentIndex]);

  const toggle = () => {
    const el = audioEl;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  const replay = () => {
    const el = audioEl;
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => undefined);
  };

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(56rem,95vw)] gap-0 overflow-hidden border-none bg-[#140f2e] p-0 text-white sm:rounded-2xl [&>button]:border-white/25 [&>button]:bg-black/45 [&>button]:text-white [&>button]:backdrop-blur-sm [&>button:hover]:bg-black/65 [&>button:hover]:text-white [&>button:focus]:ring-white/40 [&>button:focus]:ring-offset-0">
        <DialogTitle className="sr-only">Krishna is speaking</DialogTitle>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          {/* Captions — left half on desktop, below the video on phones where a
              half-width column would be ~170px and unreadable. */}
          <div className="order-2 flex min-h-[13rem] flex-col justify-between p-5 sm:order-1 sm:min-h-[26rem] sm:p-7">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {state.kind === "loading" && (
                <div className="flex h-full flex-col items-start justify-center gap-3 text-white/70">
                  <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
                  <p className="text-sm">{state.note}</p>
                  {state.fraction !== null && (
                    <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-amber-300 transition-[width] duration-500"
                        style={{ width: `${Math.round(state.fraction * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {state.kind === "error" && (
                <div className="flex h-full flex-col items-start justify-center gap-3">
                  <p className="text-sm text-red-300">{state.message}</p>
                  <button
                    type="button"
                    onClick={() => {
                      const controller = new AbortController();
                      generate(controller.signal);
                    }}
                    className="rounded-full bg-amber-400/90 px-4 py-1.5 text-sm font-medium text-[#140f2e]"
                  >
                    Try again
                  </button>
                </div>
              )}

              {state.kind === "ready" &&
                segments.map((segment, si) => {
                  const isActiveLine = si === active.segmentIndex;
                  return (
                    <p
                      key={si}
                      ref={isActiveLine ? activeLineRef : undefined}
                      className={cn(
                        "mb-2 text-lg leading-relaxed transition-opacity duration-300 sm:text-xl",
                        isActiveLine ? "opacity-100" : si < active.segmentIndex ? "opacity-70" : "opacity-40",
                      )}
                    >
                      {segment.words.map((word, wi) => {
                        const spoken =
                          si < active.segmentIndex ||
                          (isActiveLine && wi <= active.wordIndex);
                        const isCurrent = isActiveLine && wi === active.wordIndex;
                        return (
                          <span
                            key={wi}
                            className={cn(
                              "transition-colors duration-150",
                              isCurrent
                                ? "font-semibold text-amber-300"
                                : spoken
                                  ? "text-white"
                                  : "text-white/45",
                            )}
                          >
                            {word.text}{" "}
                          </span>
                        );
                      })}
                    </p>
                  );
                })}
            </div>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={toggle}
                disabled={state.kind !== "ready"}
                aria-label={playing ? "Pause" : "Play"}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-[#140f2e] disabled:opacity-40"
              >
                {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={replay}
                disabled={state.kind !== "ready"}
                aria-label="Replay"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-300"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Krishna — right half on desktop, on top on phones. */}
          <div className="relative order-1 aspect-[4/3] overflow-hidden bg-[#1d1640] sm:order-2 sm:aspect-auto sm:min-h-[26rem]">
            {isVideo(resolvedMedia) ? (
              <video
                key={resolvedMedia}
                src={resolvedMedia}
                muted
                loop
                autoPlay
                playsInline
                onError={() => setMediaFailed(true)}
                className={cn(
                  "h-full w-full object-cover object-[72%_center] transition-transform [transition-duration:4000ms] ease-in-out",
                  playing ? "scale-[1.03]" : "scale-100",
                )}
              />
            ) : (
              <img
                src={resolvedMedia}
                alt="Krishna"
                onError={() => setMediaFailed(true)}
                className={cn(
                  "h-full w-full object-cover object-[72%_center] transition-transform [transition-duration:4000ms] ease-in-out",
                  playing ? "scale-[1.03]" : "scale-100",
                )}
              />
            )}

            {/* Gold halo that breathes while the voice plays — the cheapest cue that
                reads as "he is talking" without lip-sync. */}
            <div
              className={cn(
                "pointer-events-none absolute inset-0 transition-opacity duration-700",
                playing ? "animate-pulse opacity-100" : "opacity-0",
              )}
              style={{
                background:
                  "radial-gradient(circle at 50% 38%, rgba(252,211,77,0.28) 0%, rgba(252,211,77,0) 55%)",
              }}
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#140f2e]/70 to-transparent sm:hidden" />
          </div>
        </div>

        <audio ref={setAudioEl} src={state.kind === "ready" ? state.clip.audioUrl : undefined} />
      </DialogContent>
    </Dialog>
  );
}
