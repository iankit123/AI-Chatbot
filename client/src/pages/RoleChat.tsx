import { useEffect } from 'react';
import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { BottomNav } from '@/components/BottomNav';
import { useChat } from '@/context/ChatContext';
import type { RoleType } from '@/lib/constants';
import { ChatShell } from '@/components/ChatShell';

interface RoleChatProps {
  role: RoleType;
  roleName: string;
  roleIcon: string;
}

export default function RoleChat({ role, roleName, roleIcon }: RoleChatProps) {
  const { showProfileDialog, setShowProfileDialog, setUserProfile } = useChat();

  /** Guest profile was saved to localStorage — mirror into ChatContext so the next send proceeds. */
  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    try {
      const raw = localStorage.getItem('guestProfile');
      if (!raw) return;
      const p = JSON.parse(raw) as { name?: string; age?: number | string };
      setUserProfile({
        name: typeof p.name === 'string' ? p.name : '',
        age: p.age != null ? String(p.age) : '',
      });
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    localStorage.setItem('selectedCompanion', JSON.stringify({
      id: role,
      name: roleName,
      avatar: roleIcon
    }));

    window.dispatchEvent(new Event('companion-selected'));
  }, [role, roleName, roleIcon]);

  return (
    <ChatShell>
      <Header />

      <div className="relative min-h-0 flex-1">
        <ChatArea />
      </div>
      <div className="shrink-0">
        <ChatInput />
      </div>

      <BottomNav inline />

      <UserProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        onProfileComplete={handleProfileComplete}
        companionName={roleName}
      />
    </ChatShell>
  );
}
