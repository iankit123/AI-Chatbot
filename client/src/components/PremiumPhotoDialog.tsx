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
    
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      
      // Show success message
      toast({
        title: "Premium membership activated!",
        description: `You now have access to ${companionName}'s private photos.`,
        duration: 5000
      });
      
      // Store premium status in localStorage
      localStorage.setItem('premiumMember', 'true');
      
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
          <DialogTitle className="text-xl">
            {companionName} sent you a photo!
          </DialogTitle>
          <DialogDescription>
            Upgrade to Saathi Premium to view clear photos sent by {companionName}.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6 space-y-4">
          {/* Blurred photo preview */}
          <div className="relative w-full aspect-square overflow-hidden rounded-lg">
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 z-10">
              <div className="bg-white/80 rounded-full p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            </div>
            <img 
              src={blurredImageUrl} 
              alt={`Blurred photo from ${companionName}`}
              className="w-full h-full object-cover filter blur-md"
            />
          </div>
          
          {/* Premium benefits */}
          <div className="bg-purple-50 p-4 rounded-lg space-y-2">
            <h3 className="font-medium text-purple-700">Saathi Premium Benefits:</h3>
            <ul className="space-y-2">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="text-sm">Unlimited clear photos from companions</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="text-sm">Deeper conversations and flirting</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 mr-2 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span className="text-sm">All companions unlocked permanently</span>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button onClick={handlePayment} disabled={processing} className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              {processing ? 'Processing...' : 'Pay ₹20 and See Photo'}
            </Button>
            <Button onClick={handleDecline} variant="outline" className="w-full">
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}