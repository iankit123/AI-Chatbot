import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { database } from '@/lib/firebase';
import { ref, push, set } from 'firebase/database';
import { Lock } from 'lucide-react';

interface PremiumPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companionName: string;
  blurredImageUrl: string;
}

export function PremiumPhotoDialog({ 
  open, 
  onOpenChange, 
  companionName,
  blurredImageUrl
}: PremiumPhotoDialogProps) {
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  
  const handlePayment = async () => {
    setProcessing(true);
    
    // Payment request data
    const requestData = {
      type: 'premium_photo',
      companionId: companionName.toLowerCase(),
      timestamp: new Date().toISOString(),
      amount: 20,
      imageUrl: blurredImageUrl
    };
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      
      // Record the payment attempt
      try {
        // Store the request in localStorage
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
        console.error('Error saving payment request:', error);
      }
      
      // Show technical issue message
      toast({
        title: "Technical Issue",
        description: "Our payment system is currently down. Please check back after 30 minutes.",
        variant: "destructive",
        duration: 5000
      });
      
      // Close dialog
      onOpenChange(false);
    }, 2000);
  };
  
  const handleDecline = () => {
    // Just close the dialog
    onOpenChange(false);
    
    toast({
      title: "Maybe next time!",
      description: `You can upgrade to premium anytime to see ${companionName}'s photos.`,
      variant: "default",
      duration: 3000
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {companionName} ki premium photo
          </DialogTitle>
          <DialogDescription className="text-center">
            Image sirf Premium Saathi members k liye hai. Clear picture dekhne k liye saathi membership le sirf Rs.20 me.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          {/* Blurred photo preview */}
          <div className="relative w-full aspect-square overflow-hidden rounded-lg">
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
              <div className="bg-white/90 rounded-full p-3">
                <Lock className="h-8 w-8 text-rose-500" />
              </div>
            </div>
            <img 
              src={blurredImageUrl} 
              alt={`Blurred photo from ${companionName}`}
              className="w-full h-full object-cover filter blur-md"
            />
          </div>
          
          {/* Premium benefits */}
          <div className="bg-rose-50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-rose-700">Premium Saathi Benefits:</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600 mr-2 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="text-sm">Clear high-quality photos sabhi companions se</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600 mr-2 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="text-sm">Unlimited messaging with no restrictions</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rose-600 mr-2 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="text-sm">Voice chat feature unlock for Rs.99 (regular Rs.199)</span>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col space-y-3">
            <Button onClick={handlePayment} disabled={processing} className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 py-6 text-lg">
              {processing ? 'Processing...' : `Pay now and see ${companionName}'s picture`}
            </Button>
            <Button onClick={handleDecline} variant="outline" className="w-full">
              Do not want to see picture sent by {companionName}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}