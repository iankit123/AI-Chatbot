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
    <header className="z-10 shrink-0 bg-[#075E54] px-3 py-2 text-white shadow-md">
      <div className="flex min-h-[52px] items-center gap-1">
        <button 
          onClick={handleBackToHome}
          className="mr-1 shrink-0 rounded-full p-1.5 hover:bg-white/10" 
          aria-label="Back to Home"
        >
          <span className="material-icons text-[22px]">arrow_back</span>
        </button>
        {currentRole ? (
          <RoleAvatar role={currentRole} className="h-9 w-9 [&_svg]:h-[22px] [&_svg]:w-[22px]" />
        ) : (
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 border-white bg-white">
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
        <div className="min-w-0 flex-1 pl-1">
          <h1 className="line-clamp-1 text-[17px] font-semibold leading-tight tracking-tight">
            {botName}
          </h1>
          <div className="mt-0.5 flex items-center text-[11px] text-white/80">
            <span className="mr-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#25D366]" />
            <span>{currentLanguage === "hindi" ? "ऑनलाइन" : "online"}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button 
            onClick={toggleLanguage}
            className="rounded-full p-1.5 hover:bg-white/10" 
            aria-label="Switch Language"
            title={currentLanguage === 'hindi' ? 'Switch to English' : 'Switch to Hindi'}
          >
            <span className="material-icons text-[22px]">translate</span>
          </button>
          <button 
            onClick={clearChat}
            className="rounded-full p-1.5 hover:bg-white/10" 
            aria-label="Clear Chat"
            title="Clear chat history"
          >
            <span className="material-icons text-[22px]">delete_sweep</span>
          </button>
        </div>
      </div>
    </header>
  );
}
