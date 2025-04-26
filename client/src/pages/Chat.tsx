import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { AuthDialog } from '@/components/AuthDialog';
import { useChat } from '@/context/ChatContext';

export default function Chat() {
  const { 
    botName, 
    showProfileDialog, 
    setShowProfileDialog, 
    showAuthDialog, 
    setShowAuthDialog 
  } = useChat();

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
  };

  const handleAuthComplete = () => {
    setShowAuthDialog(false);
  };

  return (
    <div className="flex flex-col h-screen chat-page">
      <Header />
      <ChatArea />
      <ChatInput />
      
      {/* Profile Collection Dialog */}
      <UserProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        onProfileComplete={handleProfileComplete}
        companionName={botName}
      />
      
      {/* Auth Dialog */}
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        onAuthComplete={handleAuthComplete}
      />
    </div>
  );
}
