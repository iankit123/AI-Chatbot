import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, MicOff, Pause, Play, Volume2 } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { WebSpeechSTTService } from "@/lib/voice/stt";
import { speakWithBrowserTTS } from "@/lib/voice/tts";
import { fetchServerTtsAudio } from "@/lib/voice/serverTts";
import { TypingIndicator } from "@/components/TypingIndicator";
import { VoicePackPaywall } from "@/components/chat/VoicePackPaywall";
import { fetchBillingWallet } from "@/lib/billing";
import {
  applyServerVoicePackUnlocks,
  isVoicePackUnlocked,
  VOICE_PACK_UNLOCK_EVENT,
} from "@/lib/voicePackUnlock";
import {
  DEFAULT_RELATIONSHIP_GOOGLE_TTS_VOICE,
  normalizeRelationshipGoogleTtsVoice,
  RELATIONSHIP_GOOGLE_TTS_VOICE_STORAGE_KEY,
} from "@/lib/relationshipGoogleTtsVoices";
import {
  getRelationshipVoicePitch,
  getRelationshipVoiceRate,
} from "@/lib/experiments";

export function RelationshipVoiceChat() {
  const { companionId } = useChat();
  const [voiceUnlocked, setVoiceUnlocked] = useState(() =>
    isVoicePackUnlocked(companionId),
  );

  useEffect(() => {
    setVoiceUnlocked(isVoicePackUnlocked(companionId));
    void fetchBillingWallet().then((wallet) => {
      if (wallet?.voice_packs?.length) {
        applyServerVoicePackUnlocks(
          wallet.voice_packs.map((p) => p.companion_id),
        );
      }
      setVoiceUnlocked(isVoicePackUnlocked(companionId));
    });
    const onUnlock = (event: Event) => {
      const detail = (event as CustomEvent<{ companionId?: string }>).detail;
      if (!detail?.companionId || detail.companionId === companionId) {
        setVoiceUnlocked(isVoicePackUnlocked(companionId));
      }
    };
    window.addEventListener(VOICE_PACK_UNLOCK_EVENT, onUnlock);
    return () => window.removeEventListener(VOICE_PACK_UNLOCK_EVENT, onUnlock);
  }, [companionId]);

  if (!voiceUnlocked) {
    return (
      <VoicePackPaywall
        companionId={companionId}
        onActivated={() => setVoiceUnlocked(true)}
      />
    );
  }

  return <RelationshipVoiceChatSession />;
}

function RelationshipVoiceChatSession() {
  const {
    sendMessage,
    messages,
    currentLanguage,
    isTyping,
    botAvatar,
    botName,
  } = useChat();
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [lastAssistantText, setLastAssistantText] = useState("");
  const sttRef = useRef<WebSpeechSTTService | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);
  const chatAreaRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const spokenAssistantIdsRef = useRef<Set<number>>(new Set());
  const initializedSpokenBaselineRef = useRef(false);
  const [playingMessageKey, setPlayingMessageKey] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  const sttLang = currentLanguage === "english" ? "en-IN" : "hi-IN";

  const assistantGoogleVoice = useMemo(() => {
    try {
      const saved = localStorage.getItem(RELATIONSHIP_GOOGLE_TTS_VOICE_STORAGE_KEY);
      return normalizeRelationshipGoogleTtsVoice(
        saved ?? (import.meta.env.VITE_RELATIONSHIP_VOICE_NAME as string | undefined),
      );
    } catch {
      return DEFAULT_RELATIONSHIP_GOOGLE_TTS_VOICE;
    }
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as Window & {
      __testRelationshipTts?: (text?: string, voiceName?: string) => Promise<void>;
    };
    w.__testRelationshipTts = async (text, voiceName) => {
      const t = text ?? "hello, mera naam naina hai";
      const v = normalizeRelationshipGoogleTtsVoice(voiceName ?? assistantGoogleVoice);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t, voiceName: v, voiceProvider: "google" }),
      });
      if (!res.ok) {
        console.error("[__testRelationshipTts]", res.status, await res.text());
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    };
    return () => {
      delete w.__testRelationshipTts;
    };
  }, [assistantGoogleVoice]);

  const ttsBase = useMemo(
    () => ({
      rate: getRelationshipVoiceRate(),
      pitch: getRelationshipVoicePitch(),
      lang: currentLanguage === "english" ? "en-IN" : "hi-IN",
    }),
    [currentLanguage],
  );

  useEffect(() => {
    return () => {
      sttRef.current?.stopTranscription();
      window.speechSynthesis?.cancel();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
    };
  }, []);

  const stopActiveAudio = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setPlayingMessageKey(null);
    setAudioProgress(0);
  };

  const playMessageAudio = async (messageKey: string, text: string, isBot: boolean) => {
    if (!text.trim()) return;
    if (playingMessageKey === messageKey) {
      stopActiveAudio();
      return;
    }
    stopActiveAudio();
    setPlayingMessageKey(messageKey);

    const voiceName = isBot
      ? assistantGoogleVoice
      : currentLanguage === "english"
        ? "en-IN-Standard-B"
        : "hi-IN-Chirp3-HD-Zephyr";

    try {
      const blob = await fetchServerTtsAudio({ text, voiceName });
      const url = URL.createObjectURL(blob);
      activeObjectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      setAudioProgress(0);
      audio.ontimeupdate = () => {
        const progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
        setAudioProgress(progress);
      };
      audio.onended = () => {
        if (activeObjectUrlRef.current === url) {
          URL.revokeObjectURL(url);
          activeObjectUrlRef.current = null;
        }
        if (audioRef.current === audio) {
          audioRef.current = null;
        }
        setPlayingMessageKey(null);
        setAudioProgress(0);
      };
      await audio.play();
    } catch {
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
        activeObjectUrlRef.current = null;
      }
      audioRef.current = null;
      try {
        await speakWithBrowserTTS(text, {
          ...ttsBase,
          voiceName: isBot ? assistantGoogleVoice : undefined,
        });
        setPlayingMessageKey(null);
      } catch {
        setPlayingMessageKey(null);
        setAudioProgress(0);
        toast({
          title: "Voice playback unavailable",
          description:
            "Server voice (/api/tts) failed and browser speech is blocked. Restart dev after setting GOOGLE_TTS_KEY in .env, then tap play again.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    const assistantMessages = messages.filter((m) => m.role === "assistant");
    if (!initializedSpokenBaselineRef.current) {
      assistantMessages.forEach((message) => {
        spokenAssistantIdsRef.current.add(message.id);
      });
      initializedSpokenBaselineRef.current = true;
      return;
    }
    const latestAssistant = [...assistantMessages]
      .reverse()
      .find((message) => !spokenAssistantIdsRef.current.has(message.id));
    if (!latestAssistant) return;
    spokenAssistantIdsRef.current.add(latestAssistant.id);
    setLastAssistantText(latestAssistant.content);
    void (async () => {
      try {
        await playMessageAudio(
          `assistant-${latestAssistant.id}`,
          latestAssistant.content,
          true,
        );
      } catch {
        void speakWithBrowserTTS(latestAssistant.content, {
          ...ttsBase,
          voiceName: assistantGoogleVoice,
        }).catch(() => {
          // Keep UI quiet when autoplay voice cannot be played.
        });
      }
    })();
  }, [messages, ttsBase]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    }, 50);
    return () => window.clearTimeout(timer);
  }, [messages, isTyping, interimText]);

  const processTranscript = async (text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setInterimText("");
    setIsListening(false);
    sttRef.current?.stopTranscription();

    try {
      await sendMessage(cleaned);
    } catch {
      toast({
        title: "Voice message failed",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    }
  };

  const startListening = async () => {
    if (isTyping) return;
    try {
      if (!sttRef.current) {
        sttRef.current = new WebSpeechSTTService(sttLang);
        sttRef.current.onInterimResult((text) => setInterimText(text));
        sttRef.current.onTranscript((result) => {
          void processTranscript(result.text);
        });
      }
      await sttRef.current.startTranscription();
      setIsListening(true);
      setInterimText("");
    } catch (error) {
      console.error("STT start failed:", error);
      toast({
        title: "Microphone unavailable",
        description: "Please allow mic access and use Chrome/Edge.",
        variant: "destructive",
      });
    }
  };

  const stopListening = () => {
    sttRef.current?.stopTranscription();
    setIsListening(false);
    setInterimText("");
  };

  const composerDisabled = isTyping;
  const hasTranscript = interimText.trim().length > 0;
  const renderWaveBars = (active: boolean) => {
    const bars = [22, 12, 26, 18, 14, 24, 16, 20, 28, 13, 25, 17, 21, 15, 23, 12];
    return (
      <div className="flex h-7 items-end gap-1">
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={`w-[3px] rounded-full transition-opacity ${
              active ? "bg-white/90" : "bg-white/45"
            }`}
            style={{ height: `${height}px` }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col wa-chat-pattern">
      <div
        ref={chatAreaRef}
        className="flex-1 w-full overflow-y-auto px-3 pb-[170px] pt-3 sm:px-4"
      >
        {messages.map((message) => {
          const isUser = message.role === "user";
          const isBot = !isUser;
          const messageKey = `${message.role}-${message.id}`;
          const isPlaying = playingMessageKey === messageKey;
          const timeLabel = new Date(message.timestamp).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          });

          if (isUser) {
            const ack =
              currentLanguage === "english"
                ? `Message sent to ${botName}.`
                : `Message sent to ${botName}`;
            return (
              <div key={message.id} className="mb-2 flex w-full justify-end">
                <div className="max-w-[min(88%,22rem)] rounded-2xl bg-[#dcf8c6] px-3 py-2 text-right shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                  <p className="text-[14px] leading-snug text-neutral-800">{ack}</p>
                  <span className="mt-0.5 block text-[11px] text-neutral-500 tabular-nums">
                    {timeLabel}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={message.id}
              className="mb-2 flex w-full justify-start"
            >
              <div
                className="relative flex w-fit max-w-[min(88%,22rem)] items-center gap-2 rounded-2xl bg-[#1f2937] px-3 py-2 text-white shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]"
              >
                <button
                  type="button"
                  onClick={() => void playMessageAudio(messageKey, message.content, isBot)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                  aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  {renderWaveBars(isPlaying)}
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full bg-white/85 transition-all"
                      style={{ width: `${isPlaying ? audioProgress : 0}%` }}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-xs text-white/85">{timeLabel}</span>
              </div>
            </div>
          );
        })}
        {hasTranscript ? (
          <div className="mb-2 flex justify-end">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[#0d7b66] px-3 py-2 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
              <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:0ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:150ms]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:300ms]" />
            </div>
          </div>
        ) : null}
        {isTyping ? <TypingIndicator botAvatar={botAvatar} /> : null}
        {lastAssistantText ? (
          <p className="mb-2 mt-1 flex items-center justify-center gap-1 text-xs text-neutral-600">
            <Volume2 className="h-3.5 w-3.5" />
            Assistant replied in voice
          </p>
        ) : null}
        <div ref={chatBottomRef} className="h-1" />
      </div>

      <div className="absolute bottom-[72px] left-1/2 -translate-x-1/2">
        <button
          type="button"
          onClick={isListening ? stopListening : () => void startListening()}
          disabled={composerDisabled}
          className={`flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_4px_12px_rgba(11,20,26,0.22)] transition ${
            isListening ? "bg-rose-500 hover:bg-rose-600" : "bg-[#00a884] hover:bg-[#06d394]"
          } disabled:cursor-not-allowed disabled:opacity-40`}
          aria-label={isListening ? "Stop listening" : "Start listening"}
        >
          {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </button>
      </div>
    </div>
  );
}
