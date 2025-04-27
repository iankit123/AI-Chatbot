import { Message } from "@shared/schema";
import { formatTime } from "@/lib/dates";
import { useMemo, useState } from "react";
import { ChatMessageImage } from "@/components/ChatMessageImage";
import { useChat } from "@/context/ChatContext";

interface ChatMessageProps {
  message: Message;
  botAvatar: string;
}

export function ChatMessage({ message, botAvatar }: ChatMessageProps) {
  const isBot = message.role === "assistant";
  const { botName } = useChat();

  // Check if message contains a photo URL either in content or as a photoUrl field
  const hasImage = useMemo(() => {
    // Check for photoUrl field first (for premium photos)
    if (message.photoUrl) return true;
    
    // Otherwise, detect if message contains an image URL pattern
    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i;
    return imageUrlRegex.test(message.content);
  }, [message.content, message.photoUrl]);

  // Extract image URL from message (from photoUrl field or content)
  const imageUrl = useMemo(() => {
    // Prefer the photoUrl field if available (for premium photos)
    if (message.photoUrl) return message.photoUrl;
    
    // Otherwise extract from content
    if (!hasImage) return null;
    const imageUrlRegex = /(https?:\/\/.*\.(?:png|jpg|jpeg|gif))/i;
    const match = message.content.match(imageUrlRegex);
    return match ? match[0] : null;
  }, [message.content, hasImage, message.photoUrl]);

  // Check if this is a premium photo
  const isPremiumPhoto = useMemo(() => {
    return !!message.isPremium;
  }, [message.isPremium]);

  // Process the message content to highlight first-person words/phrases
  const processedContent = useMemo(() => {
    if (!isBot) return message.content;

    // Hindi first-person pronouns to highlight (in Roman script)
    const firstPersonWords: string[] = [
      'main', 'mujhe', 'mera', 'meri', 'mere', 'hum', 'humein',
      'hamara', 'hamari', 'hamare', 'maine', 'humne'
    ];

    // Simple word-by-word highlighting
    let content = message.content;

    // Replace first-person words with highlighted versions
    firstPersonWords.forEach((word) => {
      // Match whole words only, case-insensitive
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      content = content.replace(regex, `<span class="text-red-500 font-medium">${word}</span>`);
    });

    return content;
  }, [message.content, isBot]);

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
