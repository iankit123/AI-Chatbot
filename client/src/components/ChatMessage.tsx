import { Message } from "@shared/schema";
import { formatTime } from "@/lib/dates";
import { useMemo, useState, useEffect } from "react";
import { ChatMessageImage } from "@/components/ChatMessageImage";
import { RoleAvatar } from "@/components/RoleAvatar";
import { useChat } from "@/context/ChatContext";
import type { RoleType } from "@/lib/constants";

interface ChatMessageProps {
  message: Message;
  botAvatar: string;
}

const DEBUG = false;

const debug = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

export function ChatMessage({ message, botAvatar }: ChatMessageProps) {
  const isBot = message.role === "assistant";
  const { botName } = useChat();
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);

  // Check if this is a role-based chat
  useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedCompanion");
      if (saved) {
        const companion = JSON.parse(saved);
        const roleTypes: RoleType[] = ['doctor', 'kundli', 'parenting', 'finance', 'career'];
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
    isPremium: message.isPremium
  });

  // Check if message contains a photo URL either in content or as a photoUrl field
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

  // Extract image URL from message (from photoUrl field or content)
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

  // Check if this is a premium photo
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
    isPremiumPhoto
  });

  // Process the message content without highlighting
  const processedContent = useMemo(() => {
    return message.content;
  }, [message.content]);

  if (isBot) {
    return (
      <div className="flex items-start mb-4">
        {currentRole ? (
          <div className="mr-2">
            <RoleAvatar role={currentRole} className="w-8 h-8" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0 mr-2">
            <img
              src={botAvatar}
              alt="Virtual companion avatar"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full bg-gray-400 rounded-full flex items-center justify-center"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>';
                }
              }}
            />
          </div>
        )}
        <div className="relative max-w-[80%] bg-partner rounded-2xl rounded-tl-none px-4 py-2 chat-bubble-left shadow-sm">
          {/* If message contains an image, show it with the ChatMessageImage component */}
          {hasImage && imageUrl && (
            <div className="mb-2">
              <ChatMessageImage 
                imageUrl={imageUrl} 
                companionName={botName} 
                isBlurred={isPremiumPhoto} // Only blur premium photos
              />
            </div>
          )}
          
          <div className="first-person-message">
            <p
              className="text-neutral-900"
              dangerouslySetInnerHTML={{ __html: processedContent }}
            />
          </div>
          <span className="text-[10px] text-neutral-700 block text-right mt-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start mb-4 justify-end">
      <div className="relative max-w-[80%] bg-user rounded-2xl rounded-tr-none px-4 py-2 chat-bubble-right shadow-sm">
        {/* User can also share images potentially */}
        {hasImage && imageUrl && (
          <div className="mb-2">
            <img 
              src={imageUrl} 
              alt="User shared image" 
              className="w-full h-auto rounded-lg" 
            />
          </div>
        )}
        
        <p className="text-neutral-900">{message.content}</p>
        <span className="text-[10px] text-neutral-700 block text-right mt-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
