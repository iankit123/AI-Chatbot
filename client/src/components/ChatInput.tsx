import { useState, KeyboardEvent } from 'react';
import { useChat } from '@/hooks/useChat';

export function ChatInput() {
  const [message, setMessage] = useState('');
  const { sendMessage, clearChat, currentLanguage } = useChat();

  const handleSend = async () => {
    if (message.trim()) {
      await sendMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] p-3 pb-16">
      <div className="flex items-center gap-2">
        <button 
          className="p-2 text-neutral-700 rounded-full hover:bg-neutral-100" 
          aria-label="Add emoji"
        >
          <span className="material-icons">sentiment_satisfied_alt</span>
        </button>
        
        <div className="relative flex-grow rounded-full bg-neutral-100 overflow-hidden">
          <input 
            type="text" 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyUp={handleKeyPress}
            className="w-full px-4 py-2.5 bg-transparent text-neutral-900 outline-none" 
            placeholder={currentLanguage === 'hindi' ? "Apna message yahan likho..." : "Type your message here..."}
          />
        </div>
        
        <button 
          onClick={handleSend}
          className="p-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
          aria-label="Send message"
        >
          <span className="material-icons">send</span>
        </button>
      </div>
      
      <div className="mt-2 px-3 mb-8">
        <div className="flex justify-between text-xs text-neutral-700">
          <span>• {currentLanguage === 'hindi' ? 'Hindi aur English dono supported hain' : 'Hindi and English both supported'}</span>
          <button 
            className="underline"
            onClick={clearChat}
          >
            {currentLanguage === 'hindi' ? 'Chat saaf karo' : 'Clear chat'}
          </button>
        </div>
      </div>
    </div>
  );
}
