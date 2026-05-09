import { useState, useEffect } from 'react';
import { RoleAvatar } from './RoleAvatar';
import type { RoleType } from '@/lib/constants';

interface TypingIndicatorProps {
  botAvatar: string;
}

export function TypingIndicator({ botAvatar }: TypingIndicatorProps) {
  const [currentRole, setCurrentRole] = useState<RoleType | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("selectedCompanion");
      if (saved) {
        const companion = JSON.parse(saved);
        const roleTypes: RoleType[] = [
          'doctor',
          'kundli',
          'parenting',
          'finance',
          'career',
          'krishna',
          'english',
        ];
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
    <div className="mb-2 flex items-end gap-2">
      {currentRole ? (
        <RoleAvatar role={currentRole} className="h-8 w-8 shrink-0" />
      ) : (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white">
          <img 
            src={botAvatar} 
            alt="Virtual companion avatar"
            className="h-full w-full object-cover"
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
      <div className="wa-bubble-received relative max-w-[min(85%,28rem)] px-4 py-3 shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
        <div className="flex space-x-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '0ms' }}></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '150ms' }}></div>
          <div className="h-2 w-2 animate-bounce rounded-full bg-neutral-500" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
