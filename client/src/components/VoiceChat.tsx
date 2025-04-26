import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/context/ChatContext";
import { Lock } from "lucide-react";

export function VoiceChat() {
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();
  const { botName } = useChat();
  
  const handleRequestActivation = () => {
    setRequesting(true);
    
    // Record the request in localStorage
    try {
      const paymentRequests = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      paymentRequests.push({
        type: 'voice_chat',
        timestamp: new Date().toISOString(),
        amount: 99
      });
      localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));
    } catch (error) {
      console.error('Error saving voice chat request:', error);
    }
    
    // Simulate processing
    setTimeout(() => {
      setRequesting(false);
      
      // Show technical issue message
      toast({
        title: "Technical Issue",
        description: "Our payment system is currently down. Please check back after 30 minutes.",
        variant: "destructive",
        duration: 5000
      });
    }, 2000);
  };
  
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center h-full">
      <div className="bg-gray-100 p-8 rounded-xl max-w-md w-full text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Voice Chat: Premium Feature</h3>
        <p className="text-gray-600 mb-6">
          Only for selected members at ₹99. Talk to {botName} and hear her sweet voice.
        </p>
        
        <div className="space-y-3">
          <Button 
            onClick={handleRequestActivation}
            disabled={requesting}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            {requesting ? 'Processing...' : 'Request Activation • ₹99'}
          </Button>
          
          <Button 
            variant="outline"
            className="w-full"
            onClick={() => window.location.href = '/'} // Simple redirect to home page
          >
            Go back to Chat
          </Button>
        </div>
      </div>
    </div>
  );
}