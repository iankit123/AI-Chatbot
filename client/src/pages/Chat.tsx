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
    // Close the profile dialog
    setShowProfileDialog(false);
    
    // Reload to ensure the latest profile data is used
    window.location.reload();
  };

  const handleAuthComplete = () => {
    // Update authentication status and close dialog
    setShowAuthDialog(false);
    
    // Force a message reload to ensure we have the latest data
    window.location.reload();
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
