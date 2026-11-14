import type { KeyboardEvent } from 'react';
import { useChat } from '@/context/ChatContext';
import { CRISIS_HELPLINE } from '@shared/crisisSupport';

/** Replaces the message box after a self-harm message; the helpline stays one tap away. */
function ChatClosedNotice({ language }: { language: 'hindi' | 'english' }) {
  const text =
    language === 'hindi'
      ? `यह चैट बंद कर दी गई है। बात करने के लिए Tele-MANAS: ${CRISIS_HELPLINE.number} (मुफ़्त, 24×7)`
      : `This chat is closed. To talk to someone, call Tele-MANAS: ${CRISIS_HELPLINE.number} (free, 24×7)`;
  return (
    <div className="border-t border-black/[0.06] bg-[#f0f2f5] px-3 py-3">
      <div className="flex items-center gap-3">
        <p className="flex-1 text-[14px] leading-snug text-neutral-700">{text}</p>
        <a
          href={`tel:${CRISIS_HELPLINE.number}`}
          className="flex shrink-0 items-center gap-1 rounded-full bg-[#128c7e] px-4 py-2 text-sm font-medium text-white"
        >
          <span className="material-icons text-[18px]">call</span>
          {language === 'hindi' ? 'कॉल करें' : 'Call'}
        </a>
      </div>
    </div>
  );
}

export function ChatInput() {
  const { sendMessage, currentLanguage, showRechargeDialog, composerDraft, setComposerDraft, composerInputRef, supportBlocked, isTyping } = useChat();

  if (supportBlocked) return <ChatClosedNotice language={currentLanguage} />;

  const handleSend = async () => {
    // While a reply is on its way the text stays in the box, so nothing typed is lost.
    if (composerDraft.trim() && !showRechargeDialog && !isTyping) {
      const trimmedMessage = composerDraft.trim();
      setComposerDraft('');
      await sendMessage(trimmedMessage);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // isComposing: Enter that only confirms a Hindi keyboard suggestion must not send.
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  const placeholder =
    currentLanguage === 'hindi' ? 'एक संदेश टाइप करें…' : 'Type a message';

  const canSend = composerDraft.trim().length > 0 && !showRechargeDialog && !isTyping;

  return (
    <div className="border-t border-black/[0.06] bg-[#f0f2f5] px-2 py-2">
      <div className="flex items-center gap-2">
        <div className="relative flex min-h-[42px] flex-1 items-center rounded-[24px] border border-black/[0.06] bg-white px-3 shadow-[0_1px_1px_rgba(11,20,26,0.08)]">
          <input
            type="text"
            ref={composerInputRef}
            value={composerDraft}
            onChange={(e) => setComposerDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            enterKeyHint="send"
            autoComplete="off"
            className="min-h-[38px] w-full flex-1 bg-transparent py-2 pr-1 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
            placeholder={placeholder}
            disabled={showRechargeDialog}
            aria-label={placeholder}
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[0_1px_2px_rgba(11,20,26,0.12)] transition-colors ${
            canSend
              ? 'bg-[#00a884] text-white hover:bg-[#06d394]'
              : 'bg-[#e9edef] text-neutral-500'
          }`}
          aria-label="Send message"
          disabled={showRechargeDialog || !canSend}
        >
          <span className="material-icons text-[22px] leading-none">send</span>
        </button>
      </div>
    </div>
  );
}
