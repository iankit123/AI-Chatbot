import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  auth, 
  signInWithGoogle, 
  createUser, 
  signIn, 
  signOutUser,
  saveUserProfile,
  getUserProfile
} from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  userProfile: UserProfile | null;
  loading: boolean;
  messageLimit: number;
  signInWithGooglePopup: () => Promise<User>;
  signUpWithEmail: (email: string, password: string) => Promise<User>;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
}

interface UserProfile {
  name: string;
  age: number;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const messageLimit = 3; // Free message limit before requiring login

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
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