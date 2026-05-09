import { KeyboardEvent } from 'react';
import { useChat } from '@/context/ChatContext';

export function ChatInput() {
  const { sendMessage, currentLanguage, showRechargeDialog, composerDraft, setComposerDraft, composerInputRef } = useChat();

  const handleSend = async () => {
    if (composerDraft.trim() && !showRechargeDialog) {
      const trimmedMessage = composerDraft.trim();
      setComposerDraft('');
      await sendMessage(trimmedMessage);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !showRechargeDialog) {
      handleSend();
    }
  };

  const placeholder =
    currentLanguage === 'hindi' ? 'एक संदेश टाइप करें…' : 'Type a message';

  const canSend = composerDraft.trim().length > 0 && !showRechargeDialog;

  return (
    <div className="border-t border-black/[0.06] bg-[#f0f2f5] px-2 py-2">
      <div className="flex items-end gap-2">
        <div className="relative flex min-h-[42px] flex-1 items-center rounded-[24px] border border-black/[0.06] bg-white px-3 shadow-[0_1px_1px_rgba(11,20,26,0.08)]">
          <input
            type="text"
            ref={composerInputRef}
            value={composerDraft}
            onChange={(e) => setComposerDraft(e.target.value)}
            onKeyUp={handleKeyPress}
            className="min-h-[38px] w-full flex-1 bg-transparent py-2 pr-1 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400"
            placeholder={placeholder}
            disabled={showRechargeDialog}
            aria-label={placeholder}
          />
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
            aria-label="Emoji"
            disabled={showRechargeDialog}
          >
            <span className="material-icons text-[22px] leading-none">mood</span>
          </button>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-40"
            aria-label="Attach"
            disabled={showRechargeDialog}
          >
            <span className="material-icons text-[22px] leading-none">attach_file</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleSend}
          className={`mb-[3px] flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-[0_1px_2px_rgba(11,20,26,0.12)] transition-colors ${
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
