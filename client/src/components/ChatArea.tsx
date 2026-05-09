import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { formatDate } from '@/lib/dates';
import { useChat } from '@/context/ChatContext';
import { ROLE_SUGGESTIONS, type RoleType } from '@/lib/constants';
import { getPersistentChatDisclaimer } from '@/lib/chatDisclaimers';

const ROLE_CHAT_IDS: RoleType[] = [
  'doctor',
  'kundli',
  'parenting',
  'finance',
  'career',
  'krishna',
  'english',
];

function readCompanionSelection(): { companionId: string; currentRole: RoleType | null } {
  try {
    const saved = localStorage.getItem('selectedCompanion');
    if (!saved) return { companionId: '', currentRole: null };
    const companion = JSON.parse(saved);
    const companionId = typeof companion.id === 'string' ? companion.id : '';
    const currentRole = ROLE_CHAT_IDS.includes(companion.id as RoleType)
      ? (companion.id as RoleType)
      : null;
    return { companionId, currentRole };
  } catch {
    return { companionId: '', currentRole: null };
  }
}

export function ChatArea() {
  const { messages, isTyping, botAvatar, setComposerDraft, composerInputRef } = useChat();
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [previousMessagesLength, setPreviousMessagesLength] = useState(0);
  
  const [{ companionId, currentRole }, setCompanionSelection] = useState(readCompanionSelection);

  useEffect(() => {
    setCompanionSelection(readCompanionSelection());
  }, [messages]);

  const persistentDisclaimer =
    companionId ? getPersistentChatDisclaimer(companionId) : null;
  
  const handleSuggestionTap = (suggestion: string) => {
    setComposerDraft(suggestion);
    const focusComposer = () => {
      const el = composerInputRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      try {
        const len = suggestion.length;
        el.setSelectionRange(len, len);
      } catch {
        /* setSelectionRange can throw on some mobile browsers if not focused yet */
      }
    };
    requestAnimationFrame(focusComposer);
    window.setTimeout(focusComposer, 80);
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
      className="chat-area wa-chat-pattern absolute inset-0 w-full overflow-y-auto px-3 pb-24 pt-2 space-y-2"
      style={{ maxHeight: 'calc(100vh - 160px)' }}
    >
      {/* Date display */}
      <div className="my-3 flex justify-center">
        <span className="rounded-lg bg-white/80 px-3 py-1 text-xs font-medium text-neutral-600 shadow-sm">
          {formatDate(new Date(), 'en-IN')}
        </span>
      </div>

      {persistentDisclaimer && (
        <div className="mb-3 px-1">
          <div
            className="rounded-lg border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-[11px] leading-snug text-amber-950 shadow-sm"
            role="note"
          >
            <span className="mr-1 inline-block font-semibold text-amber-900">
              Note:
            </span>
            {persistentDisclaimer}
          </div>
        </div>
      )}
      
      {/* Show suggestions for role-based chats - always visible at top */}
      {currentRole && (ROLE_SUGGESTIONS[currentRole]?.length ?? 0) > 0 && (
        <div className="mb-6">
          <p className="mb-2 text-center text-xs font-medium text-neutral-600">Try asking</p>
          <div className="flex flex-wrap gap-2 justify-center">
            {ROLE_SUGGESTIONS[currentRole].map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onTouchStart={(e) => e.stopPropagation()}
                onClick={() => handleSuggestionTap(suggestion)}
                className="touch-manipulation select-none rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition-colors hover:bg-white active:bg-neutral-50"
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
