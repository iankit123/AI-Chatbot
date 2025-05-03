import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, browserSessionPersistence, setPersistence } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, child, update } from "firebase/database";

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
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
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
    
    console.log("Google user login data saved to Firebase:", userId);
    return user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    throw error;
  }
};

export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Save user registration data in Firebase database
    const userId = userCredential.user.uid;
    const userRef = ref(database, `users/${userId}`);
    await set(userRef, {
      email: email,
      createdAt: new Date().toISOString(),
      accountType: 'email_password',
      lastLogin: new Date().toISOString()
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
  } catch (error) {
    console.error("Error creating user: ", error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login timestamp
    const userId = userCredential.user.uid;
    const userRef = ref(database, `users/${userId}`);
    
    // Get current user data
    const snapshot = await get(userRef);
    let userData = {};
    
    if (snapshot.exists()) {
      userData = snapshot.val();
    }
    
    // Update with lastLogin timestamp
    await update(userRef, {
      ...userData,
      lastLogin: new Date().toISOString(),
      email: email // Ensure email is always up to date
    });
    
    // Add login event to activation requests
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

// New function to save both user and assistant messages with additional metadata
export const saveChatMessage = async (message: any) => {
  try {
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log('User not authenticated, not saving chat message to Firebase');
      return null;
    }
    
    const userId = currentUser.uid;
    const userEmail = currentUser.email || 'unknown@example.com';
    const companionId = message.companionId || 'unknown';
    
    // Create a more structured message object with additional metadata
    const messageData = {
      content: message.content,
      role: message.role,
      timestamp: message.timestamp ? message.timestamp.toISOString() : new Date().toISOString(),
      userEmail: userEmail,
      isPremium: message.isPremium || false,
      photoUrl: message.photoUrl || null,
      // Add any other relevant fields
    };
    
    // Save to user-specific chat collection
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
    
    console.log(`Chat message saved to Firebase: ${message.role} message`);
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