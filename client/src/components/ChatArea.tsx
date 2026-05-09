import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { formatDate } from '@/lib/dates';
import { useChat } from '@/context/ChatContext';
import { ROLE_SUGGESTIONS, type RoleType } from '@/lib/constants';

export function ChatArea() {
  const { messages, isTyping, botAvatar, sendMessage } = useChat();
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [previousMessagesLength, setPreviousMessagesLength] = useState(0);
  
  // Get current role from companionId
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);
  
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
  }, [messages]);
  
  const handleSuggestionClick = async (suggestion: string) => {
    await sendMessage(suggestion);
  };
  
  // Force scroll on both message changes and typing indicator changes
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (bottomRef.current) {
      // Use the bottom anchor element for scrolling
      bottomRef.current.scrollIntoView({ behavior, block: 'end' });
      
      // Fallback direct scrolling for older browsers
      if (chatAreaRef.current) {
        chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
      }
    }
  };

  // Auto-scroll whenever messages change
  useEffect(() => {
    // Slight delay to ensure DOM updates are complete
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 50);
    
    return () => clearTimeout(timer);
  }, [messages]);
  
  // Auto-scroll when typing indicator appears/disappears
  useEffect(() => {
    scrollToBottom();
  }, [isTyping]);
  
  // Initial scroll on component mount
  useEffect(() => {
    // Use instant scroll for initial load (no animation)
    scrollToBottom('auto');
    setPreviousMessagesLength(messages.length);
  }, []);

  return (
    <div 
      ref={chatAreaRef}
      className="absolute inset-0 w-full px-4 py-3 space-y-4 chat-area pb-20 overflow-y-auto"
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* Date display */}
      <div className="text-center text-neutral-700 text-sm my-4">
        <p>Aaj ka din - <span>{formatDate(new Date(), 'en-IN')}</span></p>
      </div>
      
      {/* Show suggestions for role-based chats - always visible at top */}
      {currentRole && ROLE_SUGGESTIONS[currentRole] && (
        <div className="mb-6">
          <p className="text-neutral-600 text-sm mb-3 text-center">Try asking:</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {ROLE_SUGGESTIONS[currentRole].map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-4 py-2 bg-white border border-neutral-200 rounded-full text-sm text-neutral-700 hover:bg-neutral-50 hover:border-primary transition-colors shadow-sm"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
      
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
      
      {/* Invisible element at the bottom for scrolling reference */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
