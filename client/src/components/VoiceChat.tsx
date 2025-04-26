import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useChat } from "@/context/ChatContext";
import { Lock } from "lucide-react";
import { database } from "@/lib/firebase"; 
import { ref, push, set } from "firebase/database";

export function VoiceChat() {
  const [requesting, setRequesting] = useState(false);
  const { toast } = useToast();
  const { botName } = useChat();
  
  const handleRequestActivation = () => {
    setRequesting(true);
    
    // Payment request data
    const requestData = {
      type: 'voice_chat',
      timestamp: new Date().toISOString(),
      amount: 99,
      companionId: botName.toLowerCase()
    };
    
    // Record the request in localStorage
    try {
      const paymentRequests = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      paymentRequests.push(requestData);
      localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));
      
      // Also save to Firebase if user is authenticated
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        try {
          const user = JSON.parse(authUser);
          const paymentsRef = ref(database, `payments/${user.uid}`);
          const newPaymentRef = push(paymentsRef);
          set(newPaymentRef, requestData);
        } catch (firebaseError) {
          console.error('Error saving to Firebase:', firebaseError);
          // Continue with local storage only
        }
      }
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
  
  // Fixed content that displays at the top of the screen
  return (
    <div className="absolute inset-0 flex flex-col items-center">
      <div className="bg-gray-100 p-6 rounded-xl max-w-md mx-auto w-full mt-4 shadow-md">
        <div className="mb-4">
          <div className="mx-auto w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            <Lock className="w-8 h-8 text-gray-500" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold mb-2">Voice Chat: Premium Feature</h3>
        <p className="text-gray-600 mb-4">
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