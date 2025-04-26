import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { formatDate } from '@/lib/dates';
import { useChat } from '@/context/ChatContext';

export function ChatArea() {
  const { messages, isTyping, botAvatar } = useChat();
  const chatAreaRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  return (
    <div 
      ref={chatAreaRef}
      className="flex-grow overflow-y-auto px-4 py-3 space-y-4 chat-area h-full"
    >
      {/* Date display */}
      <div className="text-center text-neutral-700 text-sm my-4">
        <p>Aaj ka din - <span>{formatDate(new Date(), 'en-IN')}</span></p>
      </div>
      
      {/* Chat messages */}
      {messages.map((message) => (
        <ChatMessage 
          key={message.id} 
          message={message} 
          botAvatar={botAvatar}
        />
      ))}
      
      {/* Typing indicator */}
      {isTyping && <TypingIndicator botAvatar={botAvatar} />}
    </div>
  );
}
