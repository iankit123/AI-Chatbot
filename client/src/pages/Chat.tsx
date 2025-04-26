import { useState } from 'react';
import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';
import { UserProfileDialog } from '@/components/UserProfileDialog';
import { AuthDialog } from '@/components/AuthDialog';
import { ProfileDialog } from '@/components/ProfileDialog';
import { PremiumPhotoDialog } from '@/components/PremiumPhotoDialog';
import { VoiceChat } from '@/components/VoiceChat';
import { useChat } from '@/context/ChatContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Chat() {
  const { 
    botName, 
    showProfileDialog, 
    setShowProfileDialog, 
    showAuthDialog, 
    setShowAuthDialog,
    showPhotoDialog,
    setShowPhotoDialog,
    currentPhoto
  } = useChat();
  
  const [showAppProfileDialog, setShowAppProfileDialog] = useState(false);

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
    <div className="flex flex-col h-screen max-h-screen overflow-hidden chat-page">
      <Header />
      
      <Tabs defaultValue="text" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-white border-b shrink-0">
          <TabsTrigger value="text">Text Chat</TabsTrigger>
          <TabsTrigger value="voice">Voice Chat</TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto mb-[60px]">
            <ChatArea />
          </div>
          <div className="shrink-0">
            <ChatInput />
          </div>
        </TabsContent>
        
        <TabsContent value="voice" className="flex-1 overflow-hidden relative">
          <div className="w-full pt-4">
            <div className="max-w-md mx-auto bg-gray-100 p-6 rounded-xl shadow-md">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                
                <h3 className="text-xl font-semibold mb-2">Voice Chat: Premium Feature</h3>
                <p className="text-gray-600 mb-6">
                  Only for selected members at ₹99. Talk to {botName} and hear her sweet voice.
                </p>
                
                <div className="w-full space-y-3">
                  <button 
                    onClick={() => {
                      // Record payment request in localStorage
                      try {
                        const requestData = {
                          type: 'voice_chat',
                          timestamp: new Date().toISOString(),
                          amount: 99,
                          companionId: botName.toLowerCase()
                        };
                        
                        // Store in localStorage
                        const paymentRequests = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
                        paymentRequests.push(requestData);
                        localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));
                        
                        // Display toast message
                        alert("Technical Issue: Our payment system is currently down. Please check back after 30 minutes.");
                      } catch (error) {
                        console.error('Error processing request:', error);
                      }
                    }}
                    className="w-full py-2 px-4 rounded-md text-white font-medium bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    Request Activation • ₹99
                  </button>
                  
                  <button 
                    onClick={() => window.location.href = '/'}
                    className="w-full py-2 px-4 rounded-md border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
                  >
                    Go back to Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Bottom Navigation - Fixed to bottom with higher z-index */}
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-200 px-2 py-2 z-20">
        <div className="grid grid-cols-2 gap-1">
          <a
            href="/"
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-500">Home</span>
          </a>

          <a
            onClick={() => setShowAppProfileDialog(true)}
            className="flex flex-col items-center justify-center py-1 cursor-pointer"
          >
            <div className="w-6 h-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="text-xs mt-1 text-gray-500">Profile</span>
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
      
      {/* Premium Photo Dialog */}
      <PremiumPhotoDialog
        open={showPhotoDialog}
        onOpenChange={setShowPhotoDialog}
        companionName={botName}
        blurredImageUrl={currentPhoto || '/images/companions/priya1.jpg'}
      />
    </div>
  );
}
