import { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { signInWithGoogle, createUser, signIn } from '@/lib/supabase';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthComplete: () => void;
}

export function AuthDialog({ open, onOpenChange, onAuthComplete }: AuthDialogProps) {
  // When dialog is closed without authentication, we need to preserve the message count
  // to ensure the dialog reappears on the next message attempt
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // When closing the dialog, log that it was dismissed
      console.log('Auth dialog dismissed by user, will reappear on next message');
      
      // Optionally, we could set a flag in localStorage to track that this happened
      localStorage.setItem('auth_dialog_dismissed', 'true');
    }
    onOpenChange(newOpen);
  };
  
  // Show both login and signup tabs by default
  // Start with signup tab for new users
  const [activeTab, setActiveTab] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { toast } = useToast();
  
  const formatAuthError = (error: any): string => {
    const message = error?.message || 'An unexpected error occurred. Please try again.';
    if (message.toLowerCase().includes('already registered')) {
      return 'This email is already registered. Please try logging in instead.';
    }
    if (message.toLowerCase().includes('invalid')) {
      return 'Invalid email or password. Please try again.';
    }
    if (message.toLowerCase().includes('password')) {
      return 'Password should be at least 6 characters long.';
    }
    return message;
  };
  
  // Simplified local auth handling as fallback if auth is unavailable.
  const simulateEmailLogin = async (email: string, password: string) => {
    return new Promise<void>((resolve) => {
      // Simple validation
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Generate a pseudo-unique ID for the guest
      const guestId = `guest-${new Date().getTime()}`;
      
      // Save the user info in localStorage.
      localStorage.setItem('authUser', JSON.stringify({
        uid: guestId,
        email: email,
        displayName: email.split('@')[0]
      }));
      
      // Create a basic profile
      const profile = {
        name: email.split('@')[0],
        age: 25 // Default age
      };
      localStorage.setItem('guestProfile', JSON.stringify(profile));
      
      // Simulate network delay
      setTimeout(resolve, 500);
    });
  };
  
  const simulateEmailSignup = async (email: string, password: string) => {
    return new Promise<void>((resolve) => {
      // Simple validation
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      
      // Generate a pseudo-unique ID for the guest
      const guestId = `guest-${new Date().getTime()}`;
      
      // Save the user info in localStorage.
      localStorage.setItem('authUser', JSON.stringify({
        uid: guestId,
        email: email,
        displayName: email.split('@')[0]
      }));
      
      // Create a basic profile
      const profile = {
        name: email.split('@')[0],
        age: 25 // Default age
      };
      localStorage.setItem('guestProfile', JSON.stringify(profile));
      
      // Simulate network delay
      setTimeout(resolve, 500);
    });
  };
  
  const simulateGoogleSignIn = async () => {
    return new Promise<void>((resolve) => {
      // Create a simulated Google user
      const randomId = Math.floor(Math.random() * 1000000);
      const email = `user${randomId}@gmail.com`;
      const guestId = `google-${randomId}`;
      
      // Save the user info in localStorage.
      localStorage.setItem('authUser', JSON.stringify({
        uid: guestId,
        email: email,
        displayName: `User ${randomId}`
      }));
      
      // Create a basic profile
      const profile = {
        name: `User ${randomId}`,
        age: 25 // Default age
      };
      localStorage.setItem('guestProfile', JSON.stringify(profile));
      
      // Simulate network delay
      setTimeout(resolve, 800);
    });
  };
  
  const handleGoogleSignIn = async () => {
    console.log("[AuthDialog] handleGoogleSignIn called");
    console.log("[AuthDialog] Current location:", window.location.href);
    console.log("[AuthDialog] Hostname:", window.location.hostname);
    
    try {
      setLoading(true);
      setError('');
      
      try {
        console.log("[AuthDialog] Attempting Google sign-in...");
        const user = await signInWithGoogle();
        
        console.log("[AuthDialog] Sign-in successful, user:", user.uid);
        
        // Save user to localStorage for easy access
        localStorage.setItem('authUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }));
        
        // Create a basic profile if none exists
        if (!localStorage.getItem('guestProfile')) {
          const profile = {
            name: user.displayName || user.email?.split('@')[0] || 'User',
            age: 25 // Default age
          };
          localStorage.setItem('guestProfile', JSON.stringify(profile));
        }
        
        console.log("[AuthDialog] Successfully authenticated with Google:", user.uid);
        
        toast({
          title: "Successfully signed in",
          description: "Welcome! You now have unlimited access."
        });
      } catch (authError: any) {
        // Format error message for display
        const errorMsg = formatAuthError(authError);
        console.error("[AuthDialog] Google sign-in failed:", authError);

        if (errorMsg.includes('redirect started')) {
          setLoading(false);
          return;
        }

        if (errorMsg.toLowerCase().includes('not configured')) {
          console.log("[AuthDialog] Using fallback offline mode for configuration error");
          
          toast({
            title: "Using offline mode",
            description: "Google sign-in unavailable. Using local storage for now.",
          });
          
          await simulateGoogleSignIn();
          
          toast({
            title: "Signed in (offline mode)",
            description: "Welcome! You've been signed in using offline mode."
          });
        } else {
          console.error("[AuthDialog] Not using fallback, error:", errorMsg);
          setError(errorMsg);
          throw new Error(errorMsg);
        }
      }
      
      console.log("[AuthDialog] Calling onAuthComplete");
      onAuthComplete();
    } catch (err) {
      console.error("[AuthDialog] Sign-in failed:", err);
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      
      toast({
        title: "Sign-in failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      let user;
      
      try {
        if (activeTab === 'login') {
          user = await signIn(email, password);
          toast({
            title: "Welcome back!",
            description: "You've been successfully logged in."
          });
        } else {
          user = await createUser(email, password);
          toast({
            title: "Account created",
            description: "Your account has been created successfully."
          });
        }
        
        // Save user to localStorage for easy access
        localStorage.setItem('authUser', JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        }));
        
        console.log("Successfully authenticated:", user.uid);
      } catch (authError) {
        // Format error message for display
        const errorMsg = formatAuthError(authError);
        console.warn("Auth failed:", errorMsg);
        
        if (errorMsg.toLowerCase().includes('not configured')) {
          toast({
            title: "Using offline mode",
            description: "Authentication service is being set up. Using local storage for now.",
          });
          
          if (activeTab === 'login') {
            await simulateEmailLogin(email, password);
            toast({
              title: "Welcome back!",
              description: "You've been successfully logged in (offline mode)."
            });
          } else {
            await simulateEmailSignup(email, password);
            toast({
              title: "Account created",
              description: "Your account has been created successfully (offline mode)."
            });
          }
        } else {
          // For other errors, display them to the user and don't use fallback
          setError(errorMsg);
          throw new Error(errorMsg);
        }
      }
      
      // Create a basic profile if none exists
      if (!localStorage.getItem('guestProfile')) {
        const profile = {
          name: email.split('@')[0],
          age: 25 // Default age
        };
        localStorage.setItem('guestProfile', JSON.stringify(profile));
      }
      
      onAuthComplete();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {activeTab === 'login' ? 'Login to continue chatting' : 'Sign Up or Login'}
          </DialogTitle>
          <DialogDescription>
            {activeTab === 'login'
              ? 'Sign in to access unlimited chats with your companion.'
              : 'Create a new account or switch to Login if you already have one.'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <form onSubmit={handleEmailAuth} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
              
              <div className="text-center mt-4 text-sm text-muted-foreground">
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setActiveTab('signup')} 
                  className="text-primary hover:underline font-medium"
                >
                  Sign up here
                </button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="signup">
            <form onSubmit={handleEmailAuth} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              {error && <p className="text-destructive text-sm">{error}</p>}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account...' : 'Sign Up'}
              </Button>
              
              <div className="text-center mt-4 text-sm text-muted-foreground">
                Already have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setActiveTab('login')} 
                  className="text-primary hover:underline font-medium"
                >
                  Login here
                </button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <svg 
            className="h-4 w-4 mr-2" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 48 48"
          >
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
          </svg>
          Sign in with Google
        </Button>
      </DialogContent>
    </Dialog>
  );
}