import { Message } from '@shared/schema';
import { formatTime } from '@/lib/dates';
import { useMemo } from 'react';

interface ChatMessageProps {
  message: Message;
  botAvatar: string;
}

export function ChatMessage({ message, botAvatar }: ChatMessageProps) {
  const isBot = message.role === 'assistant';
  
  // Process the message content to highlight first-person words/phrases
  const processedContent = useMemo(() => {
    if (!isBot) return message.content;
    
    // Hindi first-person pronouns to highlight (in Roman script)
    const firstPersonWords = [
      'main', 'mujhe', 'mera', 'meri', 'mere', 'hum', 'humein', 
      'hamara', 'hamari', 'hamare', 'maine', 'humne'
    ];
    
    // Simple word-by-word highlighting
    let content = message.content;
    
    // Replace first-person words with highlighted versions
    firstPersonWords.forEach(word => {
      // Match whole words only, case-insensitive
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      content = content.replace(regex, `<strong>${word}</strong>`);
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
        <p className="text-neutral-900">{message.content}</p>
        <span className="text-[10px] text-neutral-700 block text-right mt-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
