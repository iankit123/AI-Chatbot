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

interface ProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [profile, setProfile] = useState<{name?: string; age?: number} | null>(null);
  
  // Check if user is authenticated from localStorage directly
  // This avoids the dependency on AuthContext completely
  useEffect(() => {
    try {
      // Check Firebase auth in localStorage (using a more generic approach)
      let userId = localStorage.getItem('authUser');
      
      // If not found, scan localStorage for Firebase auth keys
      if (!userId) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('firebase:authUser:')) {
            userId = localStorage.getItem(key);
            break;
          }
        }
      }
      
      const isAuth = !!userId;
      setIsAuthenticated(isAuth);
      
      // Get profile data if available
      if (isAuth) {
        const guestProfile = localStorage.getItem('guestProfile');
        if (guestProfile) {
          try {
            setProfile(JSON.parse(guestProfile));
          } catch (e) {
            console.error('Error parsing profile data:', e);
            setProfile(null);
          }
        } else {
          // Create a basic profile if nothing found
          setProfile({
            name: "User",
            age: 0
          });
        }
      } else {
        setProfile(null);
      }
    } catch (e) {
      console.error('Error checking authentication status:', e);
      setIsAuthenticated(false);
      setProfile(null);
    }
  }, [open]); // Re-check when dialog opens
  
  const handleSignup = () => {
    // Close this dialog
    onOpenChange(false);
    
    // Create a simple email/password form instead of using AuthContext
    const showSimpleAuthForm = () => {
      // Create and mount a simple auth form
      const authForm = document.createElement('div');
      authForm.id = 'simple-auth-form';
      authForm.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
      authForm.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-[90%] max-w-md">
          <h2 class="text-xl font-semibold mb-4">Sign up for free</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" id="auth-email" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="your@email.com" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" id="auth-password" class="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="Create a password" />
            </div>
            <div class="pt-2">
              <button id="auth-submit" class="w-full bg-gradient-to-r from-primary to-secondary text-white font-medium py-2 rounded-md">Create Account</button>
            </div>
            <div class="pt-2">
              <button id="auth-cancel" class="w-full border border-gray-300 text-gray-700 font-medium py-2 rounded-md">Cancel</button>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(authForm);
      
      // Add event listeners
      document.getElementById('auth-cancel')?.addEventListener('click', () => {
        document.body.removeChild(authForm);
      });
      
      document.getElementById('auth-submit')?.addEventListener('click', () => {
        const email = (document.getElementById('auth-email') as HTMLInputElement)?.value;
        const password = (document.getElementById('auth-password') as HTMLInputElement)?.value;
        
        if (email && password) {
          // Store basic auth info in localStorage for demo purposes
          localStorage.setItem('authUser', email);
          localStorage.setItem('guestProfile', JSON.stringify({
            name: email.split('@')[0],
            age: 25
          }));
          
          // Redirect to chat
          window.location.href = '/chat';
        }
      });
    };
    
    // Call the function to show the form
    showSimpleAuthForm();
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isAuthenticated ? 'Your Profile' : 'Get Unlimited Access'}
          </DialogTitle>
          <DialogDescription>
            {isAuthenticated 
              ? 'Your account information and preferences'
              : 'Sign up for free to get unlimited messaging with our companions'}
          </DialogDescription>
        </DialogHeader>
        
        {isAuthenticated ? (
          <div className="py-6">
            {profile ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{profile.name || 'Not provided'}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Age</p>
                  <p className="font-medium">{profile.age || 'Not provided'}</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700 font-medium">Unlimited Access</p>
                  <p className="text-sm text-green-600">You have unlimited messaging with all companions</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Loading profile information...
              </div>
            )}
          </div>
        ) : (
          <div className="py-6">
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-blue-700">Free Forever</h3>
              <p className="text-sm text-blue-600 mt-1">Sign up now and get unlimited access at no cost</p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Unlimited messaging</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">All companions included</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium">Personalized conversations</p>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button onClick={handleSignup} className="w-full">
                Sign Up - It's Free
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}