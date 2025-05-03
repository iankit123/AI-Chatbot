import { useState } from 'react';
import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { AuthDialog } from '@/components/AuthDialog';
import { ProfileDialog } from '@/components/ProfileDialog';
import { VoiceChatFixed } from '@/components/VoiceChatFixed';
import { useChat } from '@/context/ChatContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevToolsResetButton } from '@/components/DevToolsResetButton';
import { PaymentDialog } from '@/components/PaymentDialog';
import { PremiumPhotoDialog } from '@/components/PremiumPhotoDialog';
import { useToast } from '@/hooks/use-toast';

export default function Chat() {
  const { 
    botName, 
    showProfileDialog, 
    setShowProfileDialog, 
    showAuthDialog, 
    setShowAuthDialog,
    showPremiumPhoto,
    setShowPremiumPhoto,
    showPaymentDialog,
    setShowPaymentDialog,
    currentPhoto
  } = useChat();
  
  const [showAppProfileDialog, setShowAppProfileDialog] = useState(false);
  const { toast } = useToast();

  const handleProfileComplete = () => {
    // Close the profile dialog
    setShowProfileDialog(false);
    
    // Reload to ensure the latest profile data is used
    window.location.reload();
  };

  const handleAuthComplete = () => {
    // Update authentication status and close dialog
    setShowAuthDialog(false);
    
    // Don't reload the page as it would reset the chat
    // Instead, update the UI to reflect the authenticated state
    toast({
      title: "Successfully signed in",
      description: "You now have full access to continue your conversation",
      duration: 3000,
    });
    
    console.log("[Chat] Auth completed, continuing conversation without reload");
  };

  return (
    <div className="flex flex-col h-screen max-h-screen overflow-hidden chat-page">
      <Header />
      {/* DevTools: Reset Button for testing first-message flow */}
      <DevToolsResetButton />
      
      <Tabs defaultValue="text" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-white border-b shrink-0">
          <TabsTrigger value="text">Text Chat</TabsTrigger>
          <TabsTrigger value="voice">Voice Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <ChatArea />
          </div>
          <div className="shrink-0 fixed bottom-[45px] left-0 right-0 z-10">
            <ChatInput />
          </div>
        </TabsContent>
        
        <TabsContent value="voice" className="flex-1 overflow-hidden h-full relative">
          {/* Empty container for tab content */}
          <div className="relative h-full flex flex-col">
            {/* This ensures we get tab display but our fixed banner is separately positioned */}
            <div className="flex-1"></div>
          </div>

          {/* Render fixed position voice chat premium banner */}
          <VoiceChatFixed />
        </TabsContent>
      </Tabs>
      
      {/* Bottom Navigation - Fixed to bottom with higher z-index */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 px-2 py-1 z-20">
        <div className="grid grid-cols-2 gap-1">
          <a
            href="/"
            className="flex flex-col items-center justify-center py-0.5 cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span className="text-xs text-gray-500">Home</span>
          </a>

          <a
            onClick={() => setShowAppProfileDialog(true)}
            className="flex flex-col items-center justify-center py-0.5 cursor-pointer"
          >
            <div className="w-5 h-5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="text-xs text-gray-500">Profile</span>
          </a>
        </div>
      </div>
      
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
      
      {/* App Profile Dialog */}
      <ProfileDialog
        open={showAppProfileDialog}
        onOpenChange={setShowAppProfileDialog}
      />
      
      {/* Payment Dialog for Premium Photos */}
      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
      />
      
      {/* Premium Photo Dialog */}
      <PremiumPhotoDialog
        open={showPremiumPhoto}
        onOpenChange={setShowPremiumPhoto}
        companionName={botName}
        blurredImageUrl={currentPhoto || '/images/companions/priya1.jpg'}
      />
    </div>
  );
}
