import { useChat } from '@/context/ChatContext';
import { useLocation } from 'wouter';
import { RoleAvatar } from './RoleAvatar';
import { useState, useEffect } from 'react';
import type { RoleType } from '@/lib/constants';

export function Header() {
  const { botName, botAvatar, currentLanguage, toggleLanguage, clearChat } = useChat();
  const [, setLocation] = useLocation();
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);

  // Check if this is a role-based chat
  useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedCompanion");
      if (saved) {
        const companion = JSON.parse(saved);
        const roleTypes: RoleType[] = ['doctor', 'kundli', 'parenting', 'finance', 'career', 'krishna', 'english'];
        if (roleTypes.includes(companion.id as RoleType)) {
          setCurrentRole(companion.id as RoleType);
        } else {
          setCurrentRole(null);
        }
      }
    } catch {
      setCurrentRole(null);
    }
  }, [botName]);

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
        {currentRole ? (
          <RoleAvatar role={currentRole} />
        ) : (
          <div className="w-10 h-10 rounded-full bg-white overflow-hidden flex-shrink-0 border-2 border-white">
            <img 
              src={botAvatar} 
              alt="Profile picture" 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to a default avatar if image fails to load
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full bg-gray-400 flex items-center justify-center"><svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>';
                }
              }}
            />
          </div>
        )}
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
