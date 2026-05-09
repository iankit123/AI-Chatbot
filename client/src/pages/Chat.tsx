import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { BottomNav } from '@/components/BottomNav';
import { VoiceChatFixed } from '@/components/VoiceChatFixed';
import { useChat } from '@/context/ChatContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DevToolsResetButton } from '@/components/DevToolsResetButton';
import { PaymentDialog } from '@/components/PaymentDialog';
import { PremiumPhotoDialog } from '@/components/PremiumPhotoDialog';

export default function Chat() {
  const { 
    botName, 
    showProfileDialog, 
    setShowProfileDialog, 
    showPremiumPhoto,
    setShowPremiumPhoto,
    showPaymentDialog,
    setShowPaymentDialog,
    currentPhoto,
  } = useChat();

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    window.location.reload();
  };

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-[#e5ddd5] chat-page">
      <Header />
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
          <div className="relative h-full flex flex-col">
            <div className="flex-1"></div>
          </div>
          <VoiceChatFixed />
        </TabsContent>
      </Tabs>
      
      <BottomNav />
      
      <UserProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        onProfileComplete={handleProfileComplete}
        companionName={botName}
      />
      
      <PaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
      />
      
      <PremiumPhotoDialog
        open={showPremiumPhoto}
        onOpenChange={setShowPremiumPhoto}
        companionName={botName}
        blurredImageUrl={currentPhoto || '/images/companions/priya1.jpg'}
      />
    </div>
  );
}
