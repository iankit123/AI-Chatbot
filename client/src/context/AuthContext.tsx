import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  createUser, 
  signIn, 
  signOutUser,
  saveUserProfile,
  getUserProfile,
  type FirebaseUser
} from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  loading: boolean;
  messageLimit: number;
  signInWithGooglePopup: () => Promise<FirebaseUser>;
  signUpWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  loginWithEmail: (email: string, password: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
}

interface UserProfile {
  name: string;
  email: string;
  age?: number; // Make age optional
  createdAt?: string;
  [key: string]: any; // For any additional profile data
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const messageLimit = 3; // Free message limit before requiring login

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          console.log("User authenticated:", user.uid);
          try {
            const profile = await getUserProfile(user.uid);
            console.log("User profile loaded:", profile);
            setUserProfile(profile);
          } catch (profileError) {
            console.warn("No user profile found, creating default profile");
            // Create a default profile if it doesn't exist
            const defaultProfile: UserProfile = {
              name: user.displayName || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              createdAt: new Date().toISOString()
            };
            await saveUserProfile(user.uid, defaultProfile);
            setUserProfile(defaultProfile);
          }
        } catch (error) {
          console.error("Error handling user profile:", error);
          // Don't set loading to false here, let it be handled by the outer try-catch
        }
      } else {
        console.log("No user authenticated");
        setUserProfile(null);
      }
      
      setLoading(false);
    }, (error) => {
      console.error("Auth state change error:", error);
      setLoading(false);
    });

    return () => {
      try {
        unsubscribe();
      } catch (error) {
        console.error("Error unsubscribing from auth state changes:", error);
      }
    };
  }, []);

  const signInWithGooglePopup = async () => {
    try {
      const user = await signInWithGoogle();
      toast({
        title: 'Welcome back!',
        description: `Signed in as ${user.displayName || user.email}`,
      });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Sign-in failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    try {
      const user = await createUser(email, password);
      toast({
        title: 'Account created!',
        description: 'Welcome to Saathi. You are now signed in.',
      });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Sign-up failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const user = await signIn(email, password);
      toast({
        title: 'Welcome back!',
        description: 'You are now signed in.',
      });
      return user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
      toast({
        title: 'Signed out',
        description: 'You have been signed out successfully.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Sign-out failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateProfile = async (profile: UserProfile) => {
    if (!currentUser) {
      throw new Error('No user is signed in');
    }
    
    try {
      await saveUserProfile(currentUser.uid, profile);
      setUserProfile(profile);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast({
        title: 'Profile update failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    userProfile,
    loading,
    messageLimit,
    signInWithGooglePopup,
    signUpWithEmail,
    loginWithEmail,
    logout,
    updateProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};