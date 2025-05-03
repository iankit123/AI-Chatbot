import { Message } from "@shared/schema";
import { formatTime } from "@/lib/dates";
import { useMemo, useState } from "react";
import { ChatMessageImage } from "@/components/ChatMessageImage";
import { useChat } from "@/context/ChatContext";

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
        <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0 mr-2">
          <img
            src={botAvatar}
            alt="Virtual companion avatar"
            className="w-full h-full object-cover"
          />
        </div>
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
