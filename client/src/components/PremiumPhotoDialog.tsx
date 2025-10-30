import { useState, useEffect } from 'react';
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
import { database, logPaymentRequest } from '@/lib/firebase';
import { ref, push, set } from 'firebase/database';
import { auth } from '@/lib/firebase';
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
  const [dialogKey, setDialogKey] = useState(0); // Add a key to force re-render
  const { toast } = useToast();
  
  // Reset dialog when it opens
  useEffect(() => {
    if (open) {
      // Create a new dialog instance by incrementing the key
      setDialogKey(prev => prev + 1);
      // Reset processing state when dialog opens
      setProcessing(false);
    }
  }, [open]);
  
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
    
    // First record the payment attempt immediately
    try {
      // Store the request in localStorage for redundancy
      const paymentRequests = JSON.parse(localStorage.getItem('paymentRequests') || '[]');
      paymentRequests.push(requestData);
      localStorage.setItem('paymentRequests', JSON.stringify(paymentRequests));

      // --- FIX: Use Firebase currentUser for auth check, not just localStorage ---
      let user = auth.currentUser;
      if (!user) {
        // fallback to localStorage authUser if available
        const authUser = localStorage.getItem('authUser');
        if (authUser) user = JSON.parse(authUser);
      }

      if (user && user.uid) {
        try {
          const userEmail = user.email || 'unknown@example.com';
          await logPaymentRequest(
            user.uid,
            userEmail,
            'premium_photo',
            {
              companionId: companionName.toLowerCase(),
              imageUrl: blurredImageUrl
            }
          );
          console.log('Premium photo payment request successfully logged to Firebase (auth.currentUser)', user.uid);
        } catch (firebaseError) {
          console.error('Error logging payment request to Firebase:', firebaseError);
          // Continue with local storage only
        }
      } else {
        // Not authenticated - show a warning toast to the user
        toast({
          title: 'Please log in to use premium features',
          description: 'Sign in and try again to unlock premium photos!',
          variant: 'destructive',
          duration: 4000
        });
        console.log('User not authenticated for Firebase payment request logging');
      }
    } catch (error) {
      console.error('Error saving payment request:', error);
    }
    
    // Then simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      
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
  
  const handleDecline = async () => {
    // Log the decline action in Firebase
    try {
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        const user = JSON.parse(authUser);
        const userEmail = user.email || 'unknown@example.com';
        
        // Log with our dedicated function
        await logPaymentRequest(
          user.uid, 
          userEmail, 
          'premium_photo', 
          {
            companionId: companionName.toLowerCase(),
            imageUrl: blurredImageUrl,
            status: 'declined' // Mark as declined
          }
        );
        console.log("Premium photo decline logged to Firebase");
      }
    } catch (error) {
      console.error('Error logging premium photo decline:', error);
    }
    
    // Just close the dialog
    onOpenChange(false);
    
    toast({
      title: "Maybe next time!",
      description: `You can upgrade to premium anytime to see ${companionName}'s photos.`,
      variant: "default",
      duration: 3000
    });
  };
  
  // If not open, don't render anything to ensure a fresh instance each time
  if (!open) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange} key={dialogKey}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto premium-photo-dialog-content">
        <DialogHeader>
          <DialogTitle className="text-xl text-center">
            {companionName} ki premium photo
          </DialogTitle>
          <DialogDescription className="text-center">
            Image sirf Premium Saathi members k liye hai. Clear picture dekhne k liye saathi membership le sirf Rs.20 me.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          {/* Blurred photo preview */}
          <div className="relative w-full aspect-square overflow-hidden rounded-lg">
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-10">
              <div className="bg-white/90 rounded-full p-3">
                <Lock className="h-8 w-8 text-rose-500" />
              </div>
            </div>
            <img 
              src={blurredImageUrl} 
              alt={`Photo from ${companionName}`}
              className="w-full h-full object-cover"
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