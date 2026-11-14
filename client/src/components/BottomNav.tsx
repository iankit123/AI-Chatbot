import { useLocation } from 'wouter';
import { ProfileDialog } from './ProfileDialog';
import { useEffect, useState } from 'react';
import { isUserRegisteredLocally } from '@/lib/supabase';
import { useChat } from '@/context/ChatContext';

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [registered, setRegistered] = useState(isUserRegisteredLocally);
  const { currentLanguage } = useChat();

  useEffect(() => {
    const refresh = () => setRegistered(isUserRegisteredLocally());
    window.addEventListener('local-storage-auth', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('local-storage-auth', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/') {
      return location === '/';
    }
    return location.startsWith(path);
  };

  const profileLabel = registered
    ? currentLanguage === 'hindi'
      ? 'प्रोफ़ाइल'
      : 'Profile'
    : currentLanguage === 'hindi'
      ? 'साइन इन'
      : 'Sign in';

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 px-2 py-2 z-50">
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => setLocation('/')}
            className={`flex flex-col items-center justify-center py-1 cursor-pointer transition-colors ${
              isActive('/') && location !== '/old-chats' ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => setLocation('/old-chats')}
            className={`flex flex-col items-center justify-center py-1 cursor-pointer transition-colors ${
              isActive('/old-chats') ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span className="text-xs font-medium">Old chats</span>
          </button>

          <button
            onClick={() => setShowProfileDialog(true)}
            className={`flex flex-col items-center justify-center py-1 cursor-pointer transition-colors ${
              showProfileDialog ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <div className="w-5 h-5 flex items-center justify-center mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="text-xs font-medium">{profileLabel}</span>
          </button>
        </div>
      </div>

      <ProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
      />
    </>
  );
}
