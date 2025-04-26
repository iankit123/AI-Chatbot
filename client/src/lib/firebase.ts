import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getDatabase, ref, set, get, onValue, push, child, update } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBQkLXkHnKdptcjEyWl6Bb9M1POUAIzyiI",
  authDomain: "ai-chatbot-b8586.firebaseapp.com",
  projectId: "ai-chatbot-b8586",
  storageBucket: "ai-chatbot-b8586.firebasestorage.app",
  messagingSenderId: "37299411471",
  appId: "1:37299411471:web:ce52c2c4cbe8e7052b217a",
  measurementId: "G-XD6XLN201T",
  databaseURL: "https://ai-chatbot-b8586-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
export const googleProvider = new GoogleAuthProvider();

// Authentication functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    throw error;
  }
};

export const createUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error creating user: ", error);
    throw error;
  }
};

export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in: ", error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
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

export const saveUserProfile = async (userId: string, profile: any) => {
  try {
    const userRef = ref(database, `users/${userId}/profile`);
    await set(userRef, {
      ...profile,
      updatedAt: new Date().toISOString()
    });
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

export default app;