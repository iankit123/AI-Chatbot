import { useState, KeyboardEvent } from 'react';
import { useChat } from '@/context/ChatContext';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, clearChat, currentLanguage, showAuthDialog } = useChat();

  const handleSend = async () => {
    if (message.trim() && !showAuthDialog) {
      const trimmedMessage = message.trim();
      setMessage(''); // Clear input immediately
      await sendMessage(trimmedMessage);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !showAuthDialog) {
      handleSend();
    }
  };

  return (
    <div className="bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] p-2 border-t">
      <div className="flex items-center gap-2">
        <button 
          className="p-1.5 text-neutral-700 rounded-full hover:bg-neutral-100" 
          aria-label="Add emoji"
          disabled={showAuthDialog}
        >
          <span className="material-icons text-sm">sentiment_satisfied_alt</span>
        </button>
        
        <div className="relative flex-grow rounded-full bg-neutral-100 overflow-hidden">
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={handleKeyPress}
            className="w-full px-4 py-2 bg-transparent text-neutral-900 outline-none" 
            placeholder={currentLanguage === 'hindi' ? "Apna message yahan likho..." : "Type your message here..."}
            disabled={showAuthDialog}
          />
        </div>
        
        <button 
          onClick={handleSend}
          className="p-2 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
          aria-label="Send message"
          disabled={showAuthDialog}
        >
          <span className="material-icons text-sm">send</span>
        </button>
      </div>
      
      <div className="mt-2 px-3 pb-1">
        <div className="flex justify-between text-xs text-neutral-700">
          <span className="truncate mr-1">• {currentLanguage === 'hindi' ? 'Hindi aur English dono supported hain' : 'Hindi and English both supported'}</span>
          <button 
            className="underline whitespace-nowrap"
            onClick={clearChat}
            disabled={showAuthDialog}
          >
            {currentLanguage === 'hindi' ? 'Chat saaf karo' : 'Clear chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
