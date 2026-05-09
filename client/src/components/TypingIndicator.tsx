import { useState, useEffect } from 'react';
import { RoleAvatar } from './RoleAvatar';
import type { RoleType } from '@/lib/constants';

interface TypingIndicatorProps {
  botAvatar: string;
}

export function TypingIndicator({ botAvatar }: TypingIndicatorProps) {
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);

  // Check if this is a role-based chat
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
  }, []);

  return (
    <div className="flex items-start mb-4">
      {currentRole ? (
        <div className="mr-2">
          <RoleAvatar role={currentRole} className="w-8 h-8" />
        </div>
      ) : (
        <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0 mr-2">
          <img 
            src={botAvatar} 
            alt="Virtual companion avatar"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full bg-gray-400 rounded-full flex items-center justify-center"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>';
              }
            }}
          />
        </div>
      )}
      <div className="relative max-w-[80%] bg-partner rounded-2xl rounded-tl-none px-4 py-3 chat-bubble-left shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
