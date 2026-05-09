import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { AuthDialog } from '@/components/AuthDialog';
import { BottomNav } from '@/components/BottomNav';
import { useChat } from '@/context/ChatContext';
import { useToast } from '@/hooks/use-toast';
import type { RoleType } from '@/lib/constants';

interface RoleChatProps {
  role: RoleType;
  roleName: string;
  roleIcon: string;
}

export default function RoleChat({ role, roleName, roleIcon }: RoleChatProps) {
  const { 
    showAuthDialog, 
    setShowAuthDialog,
    startFreshChat
  } = useChat();
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleAuthComplete = () => {
    setShowAuthDialog(false);
    toast({
      title: "Successfully signed in",
      description: "You now have full access to continue your conversation",
      duration: 3000,
    });
  };

  // Set the role in localStorage so ChatContext can use it and start fresh chat
  useEffect(() => {
    // Store role as companionId for API calls
    localStorage.setItem('selectedCompanion', JSON.stringify({
      id: role,
      name: roleName,
      avatar: roleIcon
    }));
    
    // Clear existing chat and start fresh
    startFreshChat();
    
    // Trigger companion-selected event to update ChatContext
    window.dispatchEvent(new Event('companion-selected'));
  }, [role, roleName, roleIcon, startFreshChat]);

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden chat-page">
      <Header />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <ChatArea />
        </div>
        <div className="shrink-0 fixed bottom-[60px] left-0 right-0 z-10">
          <ChatInput />
        </div>
      </div>
      
      {/* Bottom Navigation */}
      <BottomNav />
      
      {/* Auth Dialog */}
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthComplete={handleAuthComplete}
      />
    </div>
  );
}

