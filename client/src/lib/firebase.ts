import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  browserSessionPersistence, 
  setPersistence,
  fetchSignInMethodsForEmail,
  User as FirebaseUser,
  UserCredential,
  User
} from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, child, update } from "firebase/database";

// Re-export the Firebase User type for use in other files
export type { FirebaseUser };

// Firebase configuration from your Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyBQkLXkHnKdptcjEyWl6Bb9M1POUAIzyiI",
  authDomain: "ai-chatbot-b8586.firebaseapp.com",
  projectId: "ai-chatbot-b8586",
  storageBucket: "ai-chatbot-b8586.appspot.com", // Fixed storage bucket URL
  messagingSenderId: "37299411471",
  appId: "1:37299411471:web:ce52c2c4cbe8e7052b217a",
  measurementId: "G-XD6XLN201T",
  databaseURL: "https://ai-chatbot-b8586-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Set persistence to session to keep user logged in during session
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Firebase persistence error:", error);
});
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    console.log("[Firebase] Starting Google sign-in...");
    console.log("[Firebase] Current domain:", window.location.hostname);
    console.log("[Firebase] Auth domain:", firebaseConfig.authDomain);
    console.log("[Firebase] API Key present:", !!firebaseConfig.apiKey);
    
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    console.log("[Firebase] Google sign-in successful, user ID:", user.uid);
    
    // Save or update user information in Firebase database
    const userId = user.uid;
    const userRef = ref(database, `users/${userId}`);
    
    // Get existing user data if any
    const snapshot = await get(userRef);
    let userData = {};
    
    if (snapshot.exists()) {
      userData = snapshot.val();
    }
    
    // Update with new login data
    await update(userRef, {
      ...userData,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      lastLogin: new Date().toISOString(),
      provider: 'google'
    });
    
    // Add this login to activation events
    const activationRef = ref(database, `users/${userId}/activationRequests`);
    const newRequestRef = push(activationRef);
    await set(newRequestRef, {
      timestamp: new Date().toISOString(),
      status: 'logged_in',
      source: 'google_login'
    });
    
    console.log("[Firebase] Google user login data saved to Firebase:", userId);
    return user;
  } catch (error: any) {
    console.error("[Firebase] Error signing in with Google");
    console.error("[Firebase] Error details:", {
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      domain: window.location.hostname,
      authDomain: firebaseConfig.authDomain
    });
    
    // Log specific error information
    if (error?.code === 'auth/unauthorized-domain') {
      console.error("[Firebase] UNAUTHORIZED DOMAIN ERROR");
      console.error("[Firebase] Current domain:", window.location.hostname);
      console.error("[Firebase] This domain must be added to:");
      console.error("  1. Firebase Console -> Authentication -> Settings -> Authorized domains");
      console.error("  2. Google Cloud Console -> APIs & Services -> Credentials -> OAuth 2.0 Client IDs");
    }
    
    throw error;
  }
};

export const createUser = async (email: string, password: string): Promise<FirebaseUser> => {
  try {
    // First check if the user already exists
    const methods = await fetchSignInMethodsForEmail(auth, email);
    if (methods && methods.length > 0) {
      // User already exists, sign them in instead
      console.log('User already exists, signing in instead');
      // Sign in existing user and return the user object
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }

    // Create new user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Save user registration data in Firebase database
    const userId = userCredential.user.uid;
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, {
      email: email,
      createdAt: new Date().toISOString(),
      accountType: 'email_password',
      lastLogin: new Date().toISOString(),
      name: email.split('@')[0] // Set a default name from email
    });
    
    // Also track this signup as an activation request
    const activationRef = ref(database, `users/${userId}/activationRequests`);
    const newRequestRef = push(activationRef);
    await set(newRequestRef, {
      timestamp: new Date().toISOString(),
      status: 'signed_up',
      source: 'email_registration'
    });
    
    console.log('User created and saved to Firebase database');
    return userCredential.user;
  } catch (error: any) {
    console.error("Error in createUser: ", error);
    
    // More specific error handling
    let errorMessage = 'An error occurred while creating your account.';
    
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered. Please sign in instead.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'The email address is not valid.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'The password is too weak. Please choose a stronger password.';
    }
    
    throw new Error(errorMessage);
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login time
    const userId = userCredential.user.uid;
    const userRef = ref(database, `users/${userId}`);
    
    // Check if user profile exists, create one if not
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      await set(userRef, {
        email: email,
        name: email.split('@')[0],
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });
    } else {
      await update(userRef, {
        lastLogin: new Date().toISOString()
      });
    }
    
    // Log this login
    const loginRef = ref(database, `users/${userId}/logins`);
    const newLoginRef = push(loginRef);
    await set(newLoginRef, {
      timestamp: new Date().toISOString(),
      method: 'email_password'
    });
    
    // Add this login to activation events
    const activationRef = ref(database, `users/${userId}/activationRequests`);
    const newRequestRef = push(activationRef);
    await set(newRequestRef, {
      timestamp: new Date().toISOString(),
      status: 'logged_in',
      source: 'email_login'
    });
    
    console.log('User login tracked in Firebase database');
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in: ", error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    // Get current user before signing out
    const user = auth.currentUser;
    
    if (user) {
      // Log the logout event to Firebase
      const userId = user.uid;
      const logoutRef = ref(database, `users/${userId}/activationRequests`);
      const newLogoutRef = push(logoutRef);
      
      // First log the logout event
      await set(newLogoutRef, {
        timestamp: new Date().toISOString(),
        status: 'logged_out',
        source: 'user_initiated'
      });
      
      console.log('Logout event logged to Firebase');
    }
    
    // Then sign out
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
    throw error;
  }
};

// Database functions
export const saveMessage = async (userId: string, companionId: string, message: any) => {
  try {
    const chatRef = ref(database, `chats/${userId}/${companionId}/messages`);
    const newMessageRef = push(chatRef);
    await set(newMessageRef, {
      ...message,
      timestamp: new Date().toISOString()
    });
    return newMessageRef.key;
  } catch (error) {
    console.error("Error saving message: ", error);
    throw error;
  }
};

// Get or generate anonymous user ID for unauthenticated users
// This ID is stored in localStorage and persists across sessions
// but does NOT authenticate the user in Firebase Auth
export const getAnonymousUserId = (): string => {
  const ANONYMOUS_ID_KEY = 'anonymousUserId';
  
  // Try to get existing anonymous ID from localStorage
  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);
  
  // If no ID exists, generate a new one
  if (!anonymousId) {
    // Generate a unique anonymous ID using timestamp and random number
    anonymousId = `anonymous-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
    console.log('[Firebase] Generated new anonymous user ID:', anonymousId);
  } else {
    console.log('[Firebase] Using existing anonymous user ID:', anonymousId);
  }
  
  return anonymousId;
};

// New function to save both user and assistant messages with additional metadata
export const saveChatMessage = async (message: any) => {
  try {
    const currentUser = auth.currentUser;
    const companionId = message.companionId || 'unknown';
    
    let userId: string;
    let userEmail: string;
    let isAnonymous = false;
    
    if (currentUser) {
      // Authenticated user - use their Firebase UID
      userId = currentUser.uid;
      userEmail = currentUser.email || 'unknown@example.com';
      console.log(`[Firebase] Saving chat message for authenticated user: ${userId}`);
    } else {
      // Unauthenticated user - use anonymous ID
      userId = getAnonymousUserId();
      userEmail = 'anonymous@example.com';
      isAnonymous = true;
      console.log(`[Firebase] Saving chat message for anonymous user: ${userId}`);
    }
    
    // Create a more structured message object with additional metadata
    const messageData = {
      content: message.content,
      role: message.role,
      timestamp: message.timestamp ? message.timestamp.toISOString() : new Date().toISOString(),
      userEmail: userEmail,
      isPremium: message.isPremium || false,
      photoUrl: message.photoUrl || null,
      isAnonymous: isAnonymous, // Flag to identify anonymous chats
      // Add any other relevant fields
    };
    
    // Save to user-specific chat collection (works for both authenticated and anonymous users)
    const chatRef = ref(database, `chats/${userId}/${companionId}/messages`);
    const newMessageRef = push(chatRef);
    await set(newMessageRef, messageData);
    
    // Also save to global chats collection for analytics
    const globalChatRef = ref(database, `allChats`);
    const newGlobalMessageRef = push(globalChatRef);
    await set(newGlobalMessageRef, {
      ...messageData,
      userId: userId,
      companionId: companionId
    });
    
    // For anonymous users, also save to a dedicated anonymous chats collection for easier tracking
    if (isAnonymous) {
      const anonymousChatRef = ref(database, `anonymousChats/${userId}/${companionId}/messages`);
      const newAnonymousMessageRef = push(anonymousChatRef);
      await set(newAnonymousMessageRef, messageData);
      console.log(`[Firebase] Anonymous chat message saved to Firebase: ${message.role} message (ID: ${userId})`);
    } else {
      console.log(`[Firebase] Chat message saved to Firebase: ${message.role} message`);
    }
    return newMessageRef.key;
  } catch (error) {
    console.error("Error saving chat message to Firebase: ", error);
    return null; // Don't throw, just return null to prevent app disruption
  }
};

export const getMessages = async (userId: string, companionId: string) => {
  try {
    const chatRef = ref(database, `chats/${userId}/${companionId}/messages`);
    const snapshot = await get(chatRef);
    
    if (snapshot.exists()) {
      // Convert the object to an array
      const messagesObj = snapshot.val();
      return Object.keys(messagesObj).map(key => ({
        id: key,
        ...messagesObj[key]
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error getting messages: ", error);
    throw error;
  }
};

// Function to get messages for the current companion from Firebase
export const getFirebaseMessages = async (userId: string, companionId: string) => {
  try {
    const chatRef = ref(database, `chats/${userId}/${companionId}/messages`);
    const snapshot = await get(chatRef);
    
    if (snapshot.exists()) {
      // Convert the object to an array and sort by timestamp
      const messagesObj = snapshot.val();
      const messages = Object.keys(messagesObj).map(key => ({
        id: key,
        ...messagesObj[key]
      }));
      
      // Sort messages by timestamp
      return messages.sort((a, b) => {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      });
    }
    
    return [];
  } catch (error) {
    console.error("Error getting Firebase messages: ", error);
    throw error;
  }
};

export const saveUserProfile = async (userId: string, profile: any) => {
  try {
    // Save the main profile
    const userRef = ref(database, `users/${userId}/profile`);
    await set(userRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    });
    
    // Add to activation requests
    const activationRef = ref(database, `users/${userId}/activationRequests`);
    const newRequestRef = push(activationRef);
    await set(newRequestRef, {
      timestamp: new Date().toISOString(),
      status: 'requested',
      source: 'profile_update'
    });
    
    console.log('Saved user profile and activation request to Firebase');
  } catch (error) {
    console.error("Error saving user profile: ", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  try {
    const userRef = ref(database, `users/${userId}/profile`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user profile: ", error);
    throw error;
  }
};

export const updateMessageCount = async (userId: string, companionId: string) => {
  try {
    const countRef = ref(database, `users/${userId}/messageCount/${companionId}`);
    const snapshot = await get(countRef);
    
    let count = 1;
    if (snapshot.exists()) {
      count = snapshot.val() + 1;
    }
    
    await set(countRef, count);
    return count;
  } catch (error) {
    console.error("Error updating message count: ", error);
    throw error;
  }
};

export const getMessageCount = async (userId: string, companionId: string) => {
  try {
    const countRef = ref(database, `users/${userId}/messageCount/${companionId}`);
    const snapshot = await get(countRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    }
    
    return 0;
  } catch (error) {
    console.error("Error getting message count: ", error);
    throw error;
  }
};

// Log payment requests to Firebase for tracking purposes
export const logPaymentRequest = async (userId: string, userEmail: string, paymentType: 'premium_photo' | 'voice_chat', metadata: any = {}) => {
  try {
    if (!userId) {
      console.error('Cannot log payment request: userId is required');
      return null;
    }

    // Create a reference to the payment requests for this user
    const paymentRequestsRef = ref(database, `users/${userId}/paymentRequests`);
    const newRequestRef = push(paymentRequestsRef);
    
    await set(newRequestRef, {
      timestamp: new Date().toISOString(),
      userEmail: userEmail,
      paymentType: paymentType,
      amount: 20, // Amount in Rupees
      status: 'requested',
      ...metadata
    });
    
    // Also log globally for easier querying
    const globalRequestsRef = ref(database, `paymentRequests`);
    const newGlobalRequestRef = push(globalRequestsRef);
    
    await set(newGlobalRequestRef, {
      timestamp: new Date().toISOString(),
      userId: userId,
      userEmail: userEmail,
      paymentType: paymentType,
      amount: 20, // Amount in Rupees
      status: 'requested',
      ...metadata
    });
    
    console.log(`Payment request logged: ${paymentType} from ${userEmail}`);
    return newRequestRef.key;
  } catch (error) {
    console.error("Error logging payment request: ", error);
    throw error;
  }
};

export default app;