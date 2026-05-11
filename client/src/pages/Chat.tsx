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
import { CompanionPhotosTab } from "@/components/CompanionPhotosTab";
import { isRelationshipCompanion } from "@/lib/relationshipPhotoGallery";

export default function Chat() {
  const { 
    botName, 
    companionId,
    showProfileDialog, 
    setShowProfileDialog, 
    showPremiumPhoto,
    setShowPremiumPhoto,
    showPaymentDialog,
    setShowPaymentDialog,
    currentPhoto,
  } = useChat();

  const showPhotosTab = isRelationshipCompanion(companionId);

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    window.location.reload();
  };

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-[#e5ddd5] chat-page">
      <Header />
      <DevToolsResetButton />
      
      <Tabs defaultValue="text" className="flex min-h-0 flex-1 basis-0 flex-col">
        <TabsList
          className={`grid h-12 w-full shrink-0 border-b bg-white p-0 ${showPhotosTab ? "grid-cols-3" : "grid-cols-2"}`}
        >
          <TabsTrigger
            value="text"
            className="h-full rounded-none border-b-2 border-transparent text-base text-muted-foreground data-[state=active]:border-[#128C7E] data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-[#128C7E] data-[state=active]:shadow-none"
          >
            Text Chat
          </TabsTrigger>
          <TabsTrigger
            value="voice"
            className="h-full rounded-none border-b-2 border-transparent text-base text-muted-foreground data-[state=active]:border-[#128C7E] data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-[#128C7E] data-[state=active]:shadow-none"
          >
            Voice Chat
          </TabsTrigger>
          {showPhotosTab ? (
            <TabsTrigger
              value="photos"
              className="h-full rounded-none border-b-2 border-transparent text-base text-muted-foreground data-[state=active]:border-[#128C7E] data-[state=active]:bg-white data-[state=active]:font-semibold data-[state=active]:text-[#128C7E] data-[state=active]:shadow-none"
            >
              <span className="inline-flex items-center gap-1.5">
                Photos
                <span className="rounded-full bg-[#128C7E] px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-white">
                  New
                </span>
              </span>
            </TabsTrigger>
          ) : null}
        </TabsList>
        
        <TabsContent value="text" className="mt-0 flex min-h-0 flex-1 basis-0 flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden relative">
            <ChatArea />
          </div>
          <div className="shrink-0 fixed bottom-[60px] left-0 right-0 z-10">
            <ChatInput />
          </div>
        </TabsContent>
        
        <TabsContent value="voice" className="relative mt-0 flex min-h-0 flex-1 basis-0 overflow-hidden">
          <div className="relative h-full flex flex-col">
            <div className="flex-1"></div>
          </div>
          <VoiceChatFixed />
        </TabsContent>

        {showPhotosTab ? (
          <TabsContent
            value="photos"
            className="relative mt-0 flex min-h-0 flex-1 basis-0 flex-col overflow-hidden"
          >
            <CompanionPhotosTab companionId={companionId} companionDisplayName={botName} />
          </TabsContent>
        ) : null}
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
