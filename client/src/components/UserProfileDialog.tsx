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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileComplete: () => void;
  companionName: string;
}

export function UserProfileDialog({ 
  open, 
  onOpenChange, 
  onProfileComplete, 
  companionName 
}: UserProfileDialogProps) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [error, setError] = useState('');
  // Use try-catch to handle the case where AuthProvider isn't available
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    // Provide mock implementations if AuthProvider is not available
    authContext = {
      updateProfile: (profile: any) => {
        localStorage.setItem('guestProfile', JSON.stringify(profile));
        return Promise.resolve();
      },
      currentUser: null
    };
  }
  
  const { updateProfile, currentUser } = authContext;
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      setError('Please enter a valid age (18-100)');
      return;
    }
    
    try {
      // If user is logged in, save to Firebase
      if (currentUser) {
        if (!currentUser.email) {
          setError('Your email is not available, cannot save profile.');
          return;
        }
        await updateProfile({ name, age: ageNum, email: currentUser.email });
      } else {
        // For guest users, just save to localStorage
        localStorage.setItem('guestProfile', JSON.stringify({ name, age: ageNum }));
      }
      
      setError('');
      onProfileComplete();
    } catch (err) {
      setError('Failed to save profile. Please try again.');
      console.error('Profile update error:', err);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Tell {companionName} about yourself</DialogTitle>
          <DialogDescription>
            Share your name and age to start a personalized conversation.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Your name"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="age" className="text-right">
              Age
            </Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="col-span-3"
              placeholder="Your age"
              min="18"
              max="100"
            />
          </div>
          
          {error && (
            <div className="text-destructive text-sm mt-2">{error}</div>
          )}
          
          <DialogFooter>
            <Button type="submit" className="w-full mt-2">
              Start Chatting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}