import { useChat } from '@/hooks/useChat';

export function Header() {
  const { botName, botAvatar, currentLanguage, toggleLanguage } = useChat();

  return (
    <header className="bg-primary text-white py-3 px-4 shadow-md z-10">
      <div className="flex items-center">
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
            <span className="h-2 w-2 rounded-full bg-success inline-block mr-1"></span>
            <span>{currentLanguage === 'hindi' ? 'ऑनलाइन' : 'Online'}</span>
          </div>
        </div>
        <div className="flex space-x-3 items-center">
          <button 
            onClick={toggleLanguage}
            className="p-2 rounded-full hover:bg-white/10" 
            aria-label="Switch Language"
          >
            <span className="material-icons text-2xl">translate</span>
          </button>
          <button className="p-2 rounded-full hover:bg-white/10" aria-label="Settings">
            <span className="material-icons text-2xl">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
}
