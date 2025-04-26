import { useChat } from '@/hooks/useChat';
import { useLocation } from 'wouter';

export function Header() {
  const { botName, botAvatar, currentLanguage, toggleLanguage, clearChat } = useChat();
  const [, setLocation] = useLocation();

  const handleBackToHome = () => {
    // Just navigate back without clearing chat
    setLocation('/');
  };

  return (
    <header className="bg-gradient-to-r from-primary to-secondary text-white py-3 px-4 shadow-md z-10">
      <div className="flex items-center">
        <button 
          onClick={handleBackToHome}
          className="p-2 rounded-full hover:bg-white/10 mr-2" 
          aria-label="Back to Home"
        >
          <span className="material-icons text-xl">arrow_back</span>
        </button>
        <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex-shrink-0 border-2 border-white">
          <img 
            src={botAvatar} 
            alt="Profile picture" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="ml-3 flex-grow">
          <h1 className="font-semibold text-lg">{botName}</h1>
          <div className="flex items-center text-xs opacity-80">
            <span className="h-2 w-2 rounded-full bg-green-400 inline-block mr-1"></span>
            <span>Online Now</span>
          </div>
        </div>
        <div className="flex space-x-3 items-center">
          <button 
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-white/10" 
            aria-label="Switch Language"
            title={currentLanguage === 'hindi' ? 'Switch to English' : 'Switch to Hindi'}
          >
            <span className="material-icons text-xl">translate</span>
          </button>
          <button 
            onClick={clearChat}
            className="p-2 rounded-full hover:bg-white/10" 
            aria-label="Clear Chat"
            title="Clear chat history"
          >
            <span className="material-icons text-xl">delete_sweep</span>
          </button>
        </div>
      </div>
    </header>
  );
}
