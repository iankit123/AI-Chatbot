import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PaymentDialog({ open, onOpenChange }: PaymentDialogProps) {
  const [processing, setProcessing] = useState(false);
  const { botName, currentPhoto, setShowPremiumPhoto, setShowPaymentDialog } = useChat();
  
  const handlePayment = async () => {
    try {
      setProcessing(true);
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Payment successful
      onOpenChange(false);
      // Display success message or update UI
      console.log("Payment successful!");
      
      // You could update user's account to reflect the purchase
      // For now, we'll just close both dialogs
      setShowPremiumPhoto(false);
    } catch (error) {
      console.error("Payment error:", error);
    } finally {
      setProcessing(false);
    }
  };
  
  const handleDecline = () => {
    onOpenChange(false);
    setShowPremiumPhoto(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Premium Photo Access</DialogTitle>
          <DialogDescription>
            View the exclusive photo shared by {botName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 my-4">
          {currentPhoto && (
            <div className="relative overflow-hidden rounded-lg">
              <img 
                src={currentPhoto} 
                alt={`${botName}'s photo`}
                className="w-full h-auto object-cover blur-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/50 rounded-full p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          <p className="text-center text-sm text-gray-500">
            This premium content requires a small payment to unlock.
          </p>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handlePayment} 
            className="w-full" 
            disabled={processing}
          >
            {processing ? "Processing..." : "Pay Rs.20 to see picture"}
          </Button>
          <Button 
            onClick={handleDecline} 
            variant="outline" 
            className="w-full"
            disabled={processing}
          >
            Do not want to see {botName}'s picture
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 