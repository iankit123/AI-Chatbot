import { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { AuthDialog } from '@/components/AuthDialog';
import { BottomNav } from '@/components/BottomNav';
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
    currentPhoto,
    startFreshChat
  } = useChat();
  
  const { toast } = useToast();

  // Clear chat when landing on chat screen
  useEffect(() => {
    startFreshChat();
  }, [startFreshChat]);

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
          <div className="shrink-0 fixed bottom-[60px] left-0 right-0 z-10">
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
      
      {/* Bottom Navigation */}
      <BottomNav />
      
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
