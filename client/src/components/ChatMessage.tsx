import { Message } from "@shared/schema";
import { formatTime } from "@/lib/dates";
import { useMemo, useState, useEffect } from "react";
import { ChatMessageImage } from "@/components/ChatMessageImage";
import { RoleAvatar } from "@/components/RoleAvatar";
import { useChat } from "@/context/ChatContext";
import type { RoleType } from "@/lib/constants";
import {
  KUNDLI_CONTEXT_AUTOMATED,
  KUNDLI_CONTEXT_DETAILS,
} from "@/lib/kundliMessageKinds";

interface ChatMessageProps {
  message: Message;
  botAvatar: string;
}

const DEBUG = false;

const debug = (...args: unknown[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

function WaSendMeta({ timestamp }: { timestamp: Date }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5">
      <span className="text-[11px] leading-none text-neutral-500 tabular-nums">
        {formatTime(timestamp)}
      </span>
      <span className="material-icons shrink-0 text-[14px] leading-none text-[#53bdeb]" aria-hidden>
        done_all
      </span>
    </span>
  );
}

export function ChatMessage({ message, botAvatar }: ChatMessageProps) {
  const isBot = message.role === "assistant";
  const { botName } = useChat();
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedCompanion");
      if (saved) {
        const companion = JSON.parse(saved);
        const roleTypes: RoleType[] = [
          "doctor",
          "kundli",
          "parenting",
          "finance",
          "career",
          "krishna",
          "english",
        ];
        if (roleTypes.includes(companion.id as RoleType)) {
          setCurrentRole(companion.id as RoleType);
        } else {
          setCurrentRole(null);
        }
      }
    } catch {
      setCurrentRole(null);
    }
  }, []);

  debug("=== ChatMessage Render ===", {
    content: message.content.slice(0, 30) + "...",
    role: message.role,
    hasPhoto: !!message.photoUrl,
    isPremium: message.isPremium,
  });

  const hasImage = useMemo(() => {
    if (message.photoUrl) {
      debug("Photo URL found:", message.photoUrl);
      return true;
    }

    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i;
    const hasImageInContent = imageUrlRegex.test(message.content);
    if (hasImageInContent) {
      debug("Image URL found in content");
    }
    return hasImageInContent;
  }, [message.content, message.photoUrl]);

  const imageUrl = useMemo(() => {
    if (message.photoUrl) {
      debug("Using photoUrl field");
      return message.photoUrl;
    }

    if (!hasImage) return null;

    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i;
    const match = message.content.match(imageUrlRegex);
    const extractedUrl = match ? match[0] : null;
    if (extractedUrl) {
      debug("Extracted URL from content");
    }
    return extractedUrl;
  }, [message.content, hasImage, message.photoUrl]);

  const isPremiumPhoto = useMemo(() => {
    const isPremium = !!message.isPremium;
    if (isPremium) {
      debug("Premium photo detected");
    }
    return isPremium;
  }, [message.isPremium]);

  debug("Final render state:", {
    hasImage,
    imageUrl: imageUrl ? "present" : null,
    isPremiumPhoto,
  });

  const processedContent = useMemo(() => {
    return message.content;
  }, [message.content]);

  const userBodyClass =
    message.contextInfo === KUNDLI_CONTEXT_AUTOMATED
      ? "whitespace-pre-wrap text-[15px] leading-snug text-red-600"
      : message.contextInfo === KUNDLI_CONTEXT_DETAILS
        ? "whitespace-pre-wrap text-[15px] leading-snug text-neutral-900"
        : "whitespace-pre-wrap text-[15px] leading-snug text-neutral-900";

  if (isBot) {
    return (
      <div className="mb-2 flex items-end justify-start gap-2">
        {currentRole ? (
          <RoleAvatar role={currentRole} className="h-8 w-8 shrink-0" />
        ) : (
          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
            <img
              src={botAvatar}
              alt="Virtual companion avatar"
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML =
                    '<div class="w-full h-full bg-gray-400 rounded-full flex items-center justify-center"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>';
                }
              }}
            />
          </div>
        )}
        <div className="wa-bubble-received relative max-w-[min(85%,28rem)] px-2 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
          {hasImage && imageUrl && (
            <div className="mb-2">
              <ChatMessageImage
                imageUrl={imageUrl}
                companionName={botName}
                isBlurred={isPremiumPhoto}
              />
            </div>
          )}

          <div className="relative min-w-0 pr-[3.25rem]">
            <div className="first-person-message">
              <p
                className="text-[15px] leading-snug text-neutral-900 [&:last-child]:mb-0"
                dangerouslySetInnerHTML={{ __html: processedContent }}
              />
            </div>
            <span className="absolute bottom-0 right-0 inline-flex text-[11px] leading-none text-neutral-500 tabular-nums">
              {formatTime(message.timestamp)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-2 flex justify-end">
      <div className="wa-bubble-sent relative max-w-[min(85%,28rem)] px-2 py-1.5 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        {hasImage && imageUrl && (
          <div className="mb-2">
            <img src={imageUrl} alt="User shared image" className="h-auto w-full rounded-lg" />
          </div>
        )}

        <div className="relative min-w-0 pr-[4rem]">
          <p className={`${userBodyClass} [&:last-child]:mb-0`}>{message.content}</p>
          <span className="absolute bottom-0 right-0">
            <WaSendMeta timestamp={message.timestamp} />
          </span>
        </div>
      </div>
    </div>
  );
}
