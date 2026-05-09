import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { BottomNav } from '@/components/BottomNav';
import type { RoleType } from '@/lib/constants';

interface RoleChatProps {
  role: RoleType;
  roleName: string;
  roleIcon: string;
}

export default function RoleChat({ role, roleName, roleIcon }: RoleChatProps) {
  useEffect(() => {
    localStorage.setItem('selectedCompanion', JSON.stringify({
      id: role,
      name: roleName,
      avatar: roleIcon
    }));

    window.dispatchEvent(new Event('companion-selected'));
  }, [role, roleName, roleIcon]);

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-[#e5ddd5] chat-page">
      <Header />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <ChatArea />
        </div>
        <div className="shrink-0 fixed bottom-[60px] left-0 right-0 z-10">
          <ChatInput />
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
