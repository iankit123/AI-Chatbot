import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import { apiRequest } from "@/lib/queryClient";
import { Message } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRandomPhotoPrompt } from "@/lib/companionPhotos";
import { saveChatMessage, getFirebaseMessages, auth } from "@/lib/firebase";

const AFFIRMATIVE_WORDS = [
  "yes", "haan", "ha", "haa", "dikhao", "dikhaao", "show", "ok", "okay"
];

const PREMIUM_PHOTOS: Record<string, string[]> = {
  priya: [
    "/images/premium/priya.jpg",
    "/images/premium/priya4.jpg",
    "/images/premium/priya5.png"
  ],
  ananya: ["/images/premium/ananya.jpg"],
  meera: ["/images/premium/meera.jpg"],
  // Add offline companions
  riya: ["/images/premium/riya.jpg"],
  neha: ["/images/premium/neha.jpg"]
};

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  currentLanguage: "hindi" | "english";
  botName: string;
  botAvatar: string;
  messageCount: number;
  showProfileDialog: boolean;
  showAuthDialog: boolean;
  showPremiumTease: boolean;
  showPremiumPhoto: boolean;
  showPaymentDialog: boolean;
  currentPhoto: string | null;
  setShowProfileDialog: (show: boolean) => void;
  setShowAuthDialog: (show: boolean) => void;
  setShowPremiumTease: (show: boolean) => void;
  setShowPremiumPhoto: (show: boolean) => void;
  setShowPaymentDialog: (show: boolean) => void;
  setCurrentPhoto: (url: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  toggleLanguage: () => void;
  userProfile: { name: string; age: string } | null;
  setUserProfile: (profile: { name: string; age: string }) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<"hindi" | "english">("hindi");
  const [messageCount, setMessageCount] = useState(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPremiumTease, setShowPremiumTease] = useState(false);
  const [showPremiumPhoto, setShowPremiumPhoto] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<{ name: string; age: string } | null>(null);
  const { toast } = useToast();
  const premiumOfferMadeRef = useRef(false);
  
  // Add rate limiting variables
  const lastApiCallTimeRef = useRef<number>(0);
  const MIN_API_CALL_INTERVAL = 3000; // 3 seconds between API calls
  const MAX_MESSAGES_PER_MINUTE = 10; // Maximum number of messages in a 60-second window
  const [isRateLimited, setIsRateLimited] = useState(false);
  const messageTimestampsRef = useRef<number[]>([]);
  
  // Add message processing lock and last message tracking to prevent duplicates
  const isProcessingRef = useRef(false);
  const lastProcessedMessageRef = useRef<string>("");
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Store bot message to add after typing indicator disappears
  const botMessageToAddRef = useRef<Message | null>(null);
  
  // Track if welcome message has been added for each companion in this session
  const welcomeMessageAddedRef = useRef<Set<string>>(new Set());
  
  // Bot info from localStorage
  const [botName, setBotName] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedCompanion");
      if (saved) return JSON.parse(saved).name;
      return "Priya";
    } catch { return "Priya"; }
  });
  const [botAvatar, setBotAvatar] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedCompanion");
      if (saved) return JSON.parse(saved).avatar;
      return "/images/priya.png";
    } catch { return "/images/priya.png"; }
  });
  const [companionId, setCompanionId] = useState(() => {
    try {
      const saved = localStorage.getItem("selectedCompanion");
      if (saved) return JSON.parse(saved).id;
      return "priya";
    } catch { return "priya"; }
  });

  // Listen for changes to selectedCompanion in localStorage
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent | null) => {
      // If called directly without event, or if event is for selectedCompanion
      if (!e || e.key === 'selectedCompanion') {
      try {
        const savedCompanion = localStorage.getItem("selectedCompanion");
        if (savedCompanion) {
          const companion = JSON.parse(savedCompanion);
            
            console.log("[ChatContext] Updating companion data:", {
              previous: { id: companionId, name: botName, avatar: botAvatar },
              new: companion
            });
            
            // Check if companion actually changed
            const companionChanged = companion.id !== companionId;
            
            // Important: Actually update all state values with the new data
            // This ensures the UI reflects the selected companion
          setBotName(companion.name);
          setBotAvatar(companion.avatar);
            setCompanionId(companion.id);
            
          // Only reset messages when companion actually changes (not when navigating back to same companion)
          if (companionChanged) {
            console.log("[ChatContext] Companion changed, clearing messages");
            setMessages([]);
            // Clear welcome message tracking for the old companion (it will be reset when new companion loads)
            // Note: We don't clear the entire set, just let it accumulate. The welcome message will only be added once per companion.
          } else {
            console.log("[ChatContext] Same companion selected, keeping messages");
          }
            
            console.log("[ChatContext] Companion updated successfully to:", companion.name);
          }
        } catch (error) {
          console.error("[ChatContext] Error updating companion from localStorage:", error);
        }
      }
    };
    
    // Create a more specific handler for the custom event  
    const handleCompanionSelected = () => {
      console.log("[ChatContext] Companion selection event received, updating companion");
      handleStorageChange(null);
    };
    
    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom event (from same window)
    window.addEventListener('companion-selected', handleCompanionSelected);
    
    // Also run once to ensure we have the latest data
    handleStorageChange(null);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('companion-selected', handleCompanionSelected);
    };
  }, [companionId, botName, botAvatar]);

  // On mount, load user profile if exists
  useEffect(() => {
    const profile = localStorage.getItem("guestProfile");
    if (profile) {
      setUserProfile(JSON.parse(profile));
      console.log("[ChatContext] Loaded userProfile from localStorage:", JSON.parse(profile));
    } else {
      console.log("[ChatContext] No userProfile found in localStorage on mount");
    }
  }, []);

  // On mount, load message count
  useEffect(() => {
    const savedCount = localStorage.getItem(`messageCount_${companionId}`);
    setMessageCount(savedCount ? parseInt(savedCount, 10) : 0);
  }, [companionId]);

  // Load previous chat history for authenticated and anonymous users
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        let userId: string | null = null;
        
        // Get user ID - either authenticated or anonymous
        if (isAuthenticated()) {
          const authUser = localStorage.getItem("authUser");
          if (authUser) {
            const { uid } = JSON.parse(authUser);
            userId = uid;
            console.log("[ChatContext] Loading chat history for authenticated user:", userId, "with companion:", companionId);
          }
        } else {
          // For anonymous users, get their anonymous ID
          const anonymousId = localStorage.getItem("anonymousUserId");
          if (anonymousId) {
            userId = anonymousId;
            console.log("[ChatContext] Loading chat history for anonymous user:", userId, "with companion:", companionId);
          }
        }
        
        if (!userId) {
          console.log("[ChatContext] No user ID found, not loading chat history");
          return;
        }
        
        // Load messages from Firebase (works for both authenticated and anonymous users)
        const firebaseMessages = await getFirebaseMessages(userId, companionId);
        if (firebaseMessages && firebaseMessages.length > 0) {
          console.log("[ChatContext] Found previous chat history with", firebaseMessages.length, "messages");
          
          // Convert Firebase messages format to app Message format
          const convertedMessages: Message[] = firebaseMessages.map((msg: any) => ({
            id: msg.id || -Math.floor(Math.random() * 1000000000),
            content: msg.content,
            role: msg.role,
            companionId: companionId,
            timestamp: new Date(msg.timestamp),
            photoUrl: msg.photoUrl || null,
            isPremium: msg.isPremium || null,
            contextInfo: msg.contextInfo || null,
          }));
          
          // Filter out duplicate "Hi" messages from assistant (keep only the first one)
          const filteredMessages: Message[] = [];
          let lastAssistantContent: string | null = null;
          for (const msg of convertedMessages) {
            let shouldSkip = false;
            
            if (msg.role === 'assistant') {
              const content = msg.content.trim().toLowerCase();
              // Skip duplicate "Hi" or "Hello" messages from assistant
              if ((content === 'hi' || content === 'hello') && lastAssistantContent === content) {
                console.log("[ChatContext] Filtering out duplicate welcome message:", msg.content);
                shouldSkip = true; // Skip this message, don't add it
              } else {
                lastAssistantContent = content;
              }
            } else {
              // Reset last assistant content when user message appears
              lastAssistantContent = null;
            }
            
            // Only add message if we didn't skip it
            if (!shouldSkip) {
              filteredMessages.push(msg);
            }
          }
          
          // Set the messages in state
          setMessages(filteredMessages);
          
          // Mark that welcome message has been added for this companion (since it's in history)
          welcomeMessageAddedRef.current.add(companionId);
          
          // Update message count based on history
          const count = convertedMessages.filter(msg => msg.role === "user").length;
          setMessageCount(count);
          localStorage.setItem(`messageCount_${companionId}`, count.toString());
          console.log("[ChatContext] Updated message count to", count, "based on chat history");
        } else {
          console.log("[ChatContext] No previous chat history found, starting fresh");
          // History loading complete, but no history - welcome message will be added by the other useEffect
        }
      } catch (error) {
        console.error("[ChatContext] Error loading chat history:", error);
        // If error loading history, just continue with empty chat - welcome message will be added
      }
    };
    
    // Load chat history when component mounts or companion changes
    loadChatHistory();
  }, [companionId]);

  // Add first welcome message when chat starts (only for new chats, not when loading history)
  // Only add once per companion per session
  useEffect(() => {
    // Only add welcome message if:
    // 1. Messages array is empty (new chat or no history)
    // 2. Companion is selected
    // 3. Welcome message hasn't been added for this companion yet in this session
    // 4. Give enough time for history to load (500ms delay)
    if (messages.length === 0 && companionId && botName && !welcomeMessageAddedRef.current.has(companionId)) {
      const timer = setTimeout(() => {
        // Double-check messages are still empty after delay (history loading might have finished)
        // and welcome message hasn't been added by another effect
        setMessages((prevMessages) => {
          if (prevMessages.length === 0 && !welcomeMessageAddedRef.current.has(companionId)) {
            // Mark that welcome message has been added for this companion
            welcomeMessageAddedRef.current.add(companionId);
            
            const welcomeMessage: Message = {
              id: Date.now(),
              content: `Hi`,
              role: "assistant",
              companionId: companionId,
              timestamp: new Date(),
              photoUrl: null,
              isPremium: null,
              contextInfo: null,
            };
            
            console.log("[ChatContext] Adding first welcome message for companion:", companionId);
            
            // Save welcome message to Firebase if user is authenticated or anonymous
            saveChatMessage(welcomeMessage).catch((error) => {
              console.error("[ChatContext] Error saving welcome message to Firebase:", error);
            });
            
            return [welcomeMessage];
          }
          return prevMessages;
        });
      }, 500); // Increased delay to allow history loading to complete
      
      return () => clearTimeout(timer);
    }
  }, [messages.length, companionId, botName]);

  // Track authentication state changes
  useEffect(() => {
    // Setup a listener for changes to localStorage authUser
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'authUser') {
        // User just logged in or out
        if (e.newValue && !e.oldValue) {
          console.log("[ChatContext] User logged in, resetting message count");
          // Reset message count after login
          setMessageCount(0);
          localStorage.setItem(`messageCount_${companionId}`, "0");
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also run once on mount to check if user just logged in
    const authState = isAuthenticated();
    console.log("[ChatContext] Initial auth state:", authState);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [companionId]);

  // Reset message processing refs when auth dialog opens/closes or authentication changes
  useEffect(() => {
    // When auth dialog state changes, clear any stuck message refs
    if (showAuthDialog) {
      console.log("[ChatContext] Auth dialog opened, resetting message refs");
      lastProcessedMessageRef.current = "";
      isProcessingRef.current = false;
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  }, [showAuthDialog]);

  // Helper: check if user is authenticated
  // IMPORTANT: Only check Firebase auth.currentUser, NOT localStorage
  // Anonymous user IDs should NEVER be considered authenticated
  const isAuthenticated = () => {
    try {
      // Use Firebase auth state, not localStorage
      // localStorage can have stale data or anonymous IDs
      const currentUser = auth.currentUser;
      
      // Only return true if there's a real Firebase authenticated user
      // and it's NOT an anonymous ID
      if (!currentUser) return false;
      
      // Ensure the user ID is not an anonymous ID
      // Anonymous IDs follow the pattern: "anonymous-{timestamp}-{random}"
      if (currentUser.uid.startsWith('anonymous-')) {
        console.warn("[ChatContext] Detected anonymous ID as currentUser, clearing auth state");
        // Clear any stale authUser from localStorage
        localStorage.removeItem('authUser');
        return false;
      }
      
      // Verify user has an email (real Firebase users have emails)
      // Anonymous IDs wouldn't have real emails
      const hasRealEmail = currentUser.email && !currentUser.email.includes('anonymous');
      
      // Double-check localStorage doesn't contain anonymous data
      const storedAuth = localStorage.getItem("authUser");
      if (storedAuth) {
        try {
          const parsed = JSON.parse(storedAuth);
          if (parsed.uid && parsed.uid.startsWith('anonymous-')) {
            console.warn("[ChatContext] Found anonymous ID in authUser localStorage, clearing it");
            localStorage.removeItem('authUser');
            return false;
          }
        } catch {
          // Invalid JSON, ignore
        }
      }
      
      return hasRealEmail || !!currentUser.displayName;
    } catch (error) {
      console.error("[ChatContext] Error checking authentication:", error);
      return false;
    }
  };

  // Helper: similarity check for comparing strings
  const stringSimilarity = (a: string, b: string): number => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const matchCount = aLower.split(' ').filter(word => bLower.includes(word)).length;
    return matchCount / aLower.split(' ').length;
  };

  // Helper: check if a user's message is asking for a photo
  const isAskingForPhoto = (content: string): boolean => {
    const lowerContent = content.toLowerCase();
    const photoKeywords = ['photo', 'picture', 'pic', 'image', 'photo', 'tasveer', 'foto', 'selfie', 'dekhna', 'share'];
    return photoKeywords.some(word => lowerContent.includes(word));
  };

  // Main sendMessage logic
  const sendMessage = async (content: string) => {
    // Trim the content first
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    
    // Prevent duplicate messages
    if (trimmedContent === lastProcessedMessageRef.current) {
      console.log("[ChatContext] Duplicate message detected, ignoring:", trimmedContent);
      return;
    }
    
    // Prevent concurrent processing
    if (isProcessingRef.current) {
      console.log("[ChatContext] Already processing a message, ignoring:", trimmedContent);
      return;
    }

    // Set processing lock and store this message
    isProcessingRef.current = true;
    lastProcessedMessageRef.current = trimmedContent;
    
    // Clear any existing timeout
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    
    // Set a timeout to release the lock after 5 seconds even if something goes wrong
    processingTimeoutRef.current = setTimeout(() => {
      console.log("[ChatContext] Releasing message processing lock after timeout");
      isProcessingRef.current = false;
    }, 5000);
    
    console.log("[ChatContext] sendMessage called", {
      content: trimmedContent,
      messageCount,
      isAuthenticated: isAuthenticated(),
      userProfile,
      premiumOfferMade: premiumOfferMadeRef.current,
      isProcessing: isProcessingRef.current
    });
    
    try {
      // Check for rate limiting first
      if (isRateLimited) {
        toast({
          title: "Please wait",
          description: "You're sending messages too quickly. Please wait a moment.",
          variant: "destructive",
        });
        return;
      }
      
      if (!trimmedContent) return;
  
      // 1. Name/Age input on first message for non-signed-in users
      if (!isAuthenticated() && messageCount === 0 && !userProfile) {
        console.log("[ChatContext] Triggering setShowProfileDialog(true) for name/age input");
        setShowProfileDialog(true);
        return;
      }
  
      // 2. Save profile if just filled
      if (!isAuthenticated() && messageCount === 0 && userProfile) {
        localStorage.setItem("guestProfile", JSON.stringify(userProfile));
        setShowProfileDialog(false);
        console.log("[ChatContext] Saved userProfile to localStorage and closed profile dialog:", userProfile);
      }
  
      // 3. Normal chat up to 3rd message
      if (!isAuthenticated() && messageCount < 3) {
        console.log("[ChatContext] Normal chat branch (unsigned, <3 messages)");
        await handleSend(trimmedContent);
        setMessageCount((c) => {
          const newCount = c + 1;
          localStorage.setItem(`messageCount_${companionId}`, newCount.toString());
          return newCount;
        });
        return;
      }
  
      // 4. On 4th message (messageCount is 3, as it's 0-indexed), show login/signup popup for non-authenticated users
      // For cases where messageCount is already high, use modulus to catch every 4th message
      // Also check if user previously dismissed the dialog and should be prompted again
      const wasDialogDismissed = localStorage.getItem('auth_dialog_dismissed') === 'true';
      const isAuth4thMessage = !isAuthenticated() && (
        (messageCount === 3) || 
        (messageCount > 3 && messageCount % 4 === 3) ||
        wasDialogDismissed
      );

      console.log("[ChatContext] Auth dialog check:", {
        isAuthenticated: isAuthenticated(),
        messageCount,
        wasDialogDismissed,
        isFirstAuth4thMessage: messageCount === 3,
        is4thMessageOrMultiple: messageCount > 3 && messageCount % 4 === 3,
        shouldShowAuthDialog: isAuth4thMessage
      });

      if (isAuth4thMessage) {
        console.log("[ChatContext] Triggering setShowAuthDialog(true) for login/signup");
        // Clear the dismissed flag when showing the dialog again
        localStorage.removeItem('auth_dialog_dismissed');
        setShowAuthDialog(true);
        return;
      }
      
      // Check if this message is affirmative regardless of where in the flow we are
      const isAffirmativeResponse = isAffirmative(trimmedContent);
      console.log("[ChatContext] Affirmative response check:", {
        content: trimmedContent,
        isAffirmative: isAffirmativeResponse,
        premiumOfferMade: premiumOfferMadeRef.current,
        wordChecks: {
          exactMatch: ["yes", "haa", "ha", "han", "haan", "dikhao", "dikha", "ok", "okay"].includes(trimmedContent.toLowerCase().trim()),
          includesHaa: trimmedContent.toLowerCase().includes("haa"),
          includesYes: trimmedContent.toLowerCase().includes("yes")
        }
      });

      // 5. Premium offers on every 10th message (10, 20, 30, etc.) for authenticated users
      const shouldOfferPremium = isAuthenticated() && (messageCount % 10 === 0) && messageCount >= 10;
      console.log("[ChatContext] Premium offer check:", { 
        isAuthenticated: isAuthenticated(),
        messageCount,
        remainder: messageCount % 10,
        shouldOfferPremium,
        premiumOfferMade: premiumOfferMadeRef.current 
      });
      
      // Check if this is a user-initiated photo request
      const isUserAskingForPhoto = isAskingForPhoto(trimmedContent);
      console.log("[ChatContext] Is user asking for photo:", { content: trimmedContent, isUserAskingForPhoto });
  
      // 6. Handle photo requests - if user asks for photo and is authenticated, show premium photo immediately
      if (isAuthenticated() && isUserAskingForPhoto) {
        console.log("[ChatContext] User asking for photo - showing premium photo");
        const photos = PREMIUM_PHOTOS[companionId] || PREMIUM_PHOTOS.priya;
        const premiumPhotoUrl = photos[Math.floor(Math.random() * photos.length)];
        
        // Just set the current photo but don't show dialog automatically
        // User will need to click on the photo to see the premium dialog
        setCurrentPhoto(premiumPhotoUrl);
        console.log("[ChatContext] Setting premium photo to:", premiumPhotoUrl);
        
        // Add the premium photo as a chat message with more descriptive content
        const premiumMsg: Message = {
          id: -Math.floor(Math.random() * 1000000000),
          content: "Ye meri kal ki photo hai. Kaisi lagi? 😊",
          role: "assistant",
          companionId: companionId || "priya",
          timestamp: new Date(),
          photoUrl: premiumPhotoUrl,
          isPremium: true,
          contextInfo: "premium_photo_share"
        };
        setMessages((prev) => [...prev, premiumMsg]);
        
        // Save assistant message to Firebase
        saveChatMessage(premiumMsg);
        
        // Also send user's message
        const tempId = -Math.floor(Math.random() * 1000000000);
        const userMessage: Message = {
          id: tempId,
          content: trimmedContent,
          role: "user",
          companionId,
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };
        setMessages((prev) => [...prev, userMessage]);
        saveChatMessage(userMessage);
        
        // Update message count
        setMessageCount((c) => {
          const newCount = c + 1;
          localStorage.setItem(`messageCount_${companionId}`, newCount.toString());
          return newCount;
        });
        
        // Release processing lock
        isProcessingRef.current = false;
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
          processingTimeoutRef.current = null;
        }
        
        return;
      }
      
      // Detect affirmative response for premium photo if a previous offer was made
      if (isAuthenticated() && premiumOfferMadeRef.current && isAffirmativeResponse) {
        console.log("[ChatContext] User replied affirmatively to premium offer or asked for photo");
        const photos = PREMIUM_PHOTOS[companionId] || PREMIUM_PHOTOS.priya;
        const premiumPhotoUrl = photos[Math.floor(Math.random() * photos.length)];
        
        // Just set the current photo but don't show dialog automatically
        // User will need to click on the photo to see the premium dialog
        setCurrentPhoto(premiumPhotoUrl);
        console.log("[ChatContext] Setting premium photo to:", premiumPhotoUrl);
        
        // Reset the offer flag so it doesn't trigger again without a new offer
        premiumOfferMadeRef.current = false;
        console.log("[ChatContext] Reset premiumOfferMade to false");
        
        // Add the premium photo as a chat message with more descriptive content
        const premiumMsg: Message = {
          id: -Math.floor(Math.random() * 1000000000),
          content: "Ye meri kal ki photo hai. Kaisi lagi? 😊",
          role: "assistant",
          companionId: companionId || "priya",
          timestamp: new Date(),
          photoUrl: premiumPhotoUrl,
          isPremium: true,
          contextInfo: "premium_photo_share"
        };
        setMessages((prev) => [...prev, premiumMsg]);
        return;
      }
  
      // Only make premium offer if:
      // 1. Should offer based on message count
      // 2. No offer is already active
      // 3. User isn't already asking for a photo (to avoid duplication)
      if (shouldOfferPremium && !premiumOfferMadeRef.current && !isUserAskingForPhoto) {
        console.log("[ChatContext] Triggering setShowPremiumTease(true) after login");
        setShowPremiumTease(true);
        premiumOfferMadeRef.current = true;
        console.log("[ChatContext] Setting premiumOfferMade to true");
        
        // If the current message is already affirmative, we'll handle it specially
        const messageIsAlreadyAffirmative = isAffirmativeResponse;

        // Wait for server to send the premium message instead of sending our own
        // This prevents duplicate premium offers (one from server, one from client)
        setMessageCount((c) => {
          const newCount = c + 1;
          localStorage.setItem(`messageCount_${companionId}`, newCount.toString());
          return newCount;
        });
        
        // Only send the message if it's not already an affirmative response
        // This prevents sending an extra message when the user agrees to see a photo
        if (!messageIsAlreadyAffirmative) {
          // Send regular message to server - it will respond with premium offer
          await handleSend(trimmedContent);
        } else {
          // Add the user's message to the chat without calling the API
          const tempId = -Math.floor(Math.random() * 1000000000);
          const userMessage: Message = {
            id: tempId,
            content: trimmedContent,
            role: "user",
            companionId,
            timestamp: new Date(),
            photoUrl: null,
            isPremium: null,
            contextInfo: null
          };
          setMessages((prev) => [...prev, userMessage]);
          
          // Save user message to Firebase
          saveChatMessage(userMessage);
        }
        
        // Check if the message we just sent to trigger the premium offer was already affirmative
        // If it was, directly show the premium photo without waiting for another message
        if (isAffirmativeResponse) {
          console.log("[ChatContext] Trigger message was already affirmative, showing premium photo immediately");
          // Short timeout to let the premium offer message appear first
          setTimeout(() => {
            const photos = PREMIUM_PHOTOS[companionId] || PREMIUM_PHOTOS.priya;
            const premiumPhotoUrl = photos[Math.floor(Math.random() * photos.length)];
            
            // Just set the current photo but don't show dialog automatically
            setCurrentPhoto(premiumPhotoUrl);
            console.log("[ChatContext] Setting premium photo to:", premiumPhotoUrl);
            
            // Reset the offer flag
            premiumOfferMadeRef.current = false;
            console.log("[ChatContext] Reset premiumOfferMade to false");
            
            // Add the premium photo as a chat message with more descriptive content
            const premiumMsg: Message = {
              id: -Math.floor(Math.random() * 1000000000),
              content: "Ye meri kal ki photo hai. Kaisi lagi?",
              role: "assistant",
              companionId: companionId || "priya",
              timestamp: new Date(),
              photoUrl: premiumPhotoUrl,
              isPremium: true,
              contextInfo: "premium_photo_share"
            };
            setMessages((prev) => [...prev, premiumMsg]);
          }, 1000);
        }
        
        return;
      }
  
      // 7. Normal chat after login
      console.log("[ChatContext] Normal chat branch (signed in or after premium flow)");
      await handleSend(trimmedContent);
      setMessageCount((c) => {
        const newCount = c + 1;
        localStorage.setItem(`messageCount_${companionId}`, newCount.toString());
        return newCount;
      });
    } catch (error) {
      console.error("[ChatContext] Error in sendMessage:", error);
    } finally {
      // Release the processing lock
      isProcessingRef.current = false;
      // Clear the timeout
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
    }
  };

  // Helper: send message to server and update UI
  const handleSend = async (content: string) => {
    console.log("[ChatContext] handleSend called", { content });
    console.log("[ChatContext] Setting typing indicator to TRUE");
    setIsTyping(true);
    
    // Track when typing started for minimum display duration
    const typingStartTime = Date.now();
    const MIN_TYPING_DURATION = 6000; // Minimum 2 seconds to show typing
    console.log("[ChatContext] Typing started at:", new Date(typingStartTime).toISOString());
    
    // Track message timestamps for rate limiting
    const now = Date.now();
    messageTimestampsRef.current.push(now);
    
    // Only keep timestamps from the last minute
    messageTimestampsRef.current = messageTimestampsRef.current.filter(
      timestamp => now - timestamp < 60000
    );
    
    // Check if we've sent too many messages in the last minute
    if (messageTimestampsRef.current.length > MAX_MESSAGES_PER_MINUTE) {
      console.log(`[ChatContext] Too many messages in the last minute: ${messageTimestampsRef.current.length}`);
      setIsRateLimited(true);
      
      // Add a system message about rate limiting
      const errorMsg: Message = {
        id: -Math.floor(Math.random() * 1000000000),
        content: "Please slow down. You're sending too many messages too quickly.",
        role: "assistant",
        companionId,
        timestamp: new Date(),
        photoUrl: null,
        isPremium: null,
        contextInfo: null
      };
      setMessages((prev) => [...prev, errorMsg]);
      
      // Auto-reset rate limit after 30 seconds
      setTimeout(() => setIsRateLimited(false), 30000);
      setIsTyping(false);
      botMessageToAddRef.current = null; // Clear any pending message
      console.log("[ChatContext] Rate limited - cleared pending message and stopped typing");
      return;
    }

    // Rate limiting check
    const timeSinceLastCall = now - lastApiCallTimeRef.current;
    
    if (timeSinceLastCall < MIN_API_CALL_INTERVAL) {
      console.log(`[ChatContext] Rate limiting - waiting ${MIN_API_CALL_INTERVAL - timeSinceLastCall}ms before next call`);
      // If we're sending too fast, add a delay
      // Add a small jitter to prevent requests arriving exactly together
      const jitter = Math.floor(Math.random() * 500); // 0-500ms random jitter
      await new Promise(resolve => setTimeout(resolve, MIN_API_CALL_INTERVAL - timeSinceLastCall + jitter));
    }
    
    // Update the last API call time
    lastApiCallTimeRef.current = Date.now();
    
    const tempId = -Math.floor(Math.random() * 1000000000);
    const userMessage: Message = {
      id: tempId,
      content,
      role: "user",
      companionId,
      timestamp: new Date(),
      photoUrl: null,
      isPremium: null,
      contextInfo: null
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // Save user message to Firebase
    saveChatMessage(userMessage);
    
    try {
      // Get the last message to check if there was a photo in the conversation context
      const lastMessages = [...messages].slice(-3); // Get up to 3 recent messages for context
      const lastPhotoMessage = lastMessages.find(msg => msg.photoUrl && msg.isPremium);
      
      // Include this context in the API request
      const res = await apiRequest("POST", "/api/messages", {
        content,
        language: currentLanguage,
        companionId,
        messageCount: messageCount + 1,
        isAuthenticated: isAuthenticated(),
        recentPhotoContext: lastPhotoMessage ? {
          photoSent: true,
          photoUrl: lastPhotoMessage.photoUrl,
          photoMessage: lastPhotoMessage.content,
          timeElapsed: Math.floor((Date.now() - lastPhotoMessage.timestamp.getTime()) / 1000) // seconds since photo was sent
        } : null,
      });
      
      // Check for rate limiting or error responses
      if (!res.ok) {
        // If we get a 429 Too Many Requests
        if (res.status === 429) {
          setIsRateLimited(true);
          
          // Add a system message about rate limiting
          const errorMsg: Message = {
            id: tempId - 1,
            content: "I'm getting too many requests right now. Please wait a moment before sending more messages.",
            role: "assistant",
            companionId,
            timestamp: new Date(),
            photoUrl: null,
            isPremium: null,
            contextInfo: null
          };
          setMessages((prev) => [...prev, errorMsg]);
          
          // Auto-reset rate limit after 15 seconds
          setTimeout(() => setIsRateLimited(false), 15000);
          
          console.log("[ChatContext] Rate limit hit, cooling down for 15 seconds");
          setIsTyping(false);
          botMessageToAddRef.current = null; // Clear any pending message
          return;
        }
        
        throw new Error(`API request failed with status ${res.status}`);
      }
      
      // Reset rate limit flag if successful
      setIsRateLimited(false);
      
      const data = await res.json();
      console.log("[ChatContext] Received bot response from API");
      
      // Handle both response formats: {botMessage: {...}} and {content: "..."}
      let botMessage;
      if (data.botMessage) {
        // Local API format
        botMessage = {
          ...data.botMessage,
          id: tempId - 1,
          companionId,
          timestamp: new Date(),
        };
      } else if (data.content) {
        // Deployed API format
        botMessage = {
          id: tempId - 1,
          content: data.content,
          role: "assistant",
          companionId,
          timestamp: new Date(),
          photoUrl: null,
          isPremium: null,
          contextInfo: null
        };
      }
      
      if (botMessage) {
        // Check for duplicate messages from assistant
        const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const botContent = botMessage.content.trim().toLowerCase();
        
        // Block duplicate "Hi" or "Hello" messages from assistant
        if (lastMessage && lastMessage.role === 'assistant') {
          const lastContent = lastMessage.content.trim().toLowerCase();
          if ((botContent === 'hi' || botContent === 'hello') && 
              (lastContent === 'hi' || lastContent === 'hello') &&
              botContent === lastContent) {
            console.log("[ChatContext] Blocking duplicate welcome message from assistant:", botMessage.content);
            return; // Don't add duplicate message
          }
          
          // Block exact duplicate messages from assistant
          if (botContent === lastContent && botMessage.role === 'assistant') {
            console.log("[ChatContext] Blocking duplicate message from assistant:", botMessage.content);
            return; // Don't add duplicate message
          }
        }
        
        // Store bot message to add after typing indicator disappears
        botMessageToAddRef.current = botMessage;
        console.log("[ChatContext] Bot message stored in ref, will add after typing completes");
        
        // Save assistant message to Firebase
        saveChatMessage(botMessage);
      } else {
        console.log("[ChatContext] No bot message found in response:", data);
      }
    } catch (error) {
      console.error("[ChatContext] Error sending message:", error);
      // Store error message to add after typing indicator disappears
      const errorMsg: Message = {
        id: tempId - 1,
        content: "Sorry, I couldn't process your message. Please try again later.",
        role: "assistant",
        companionId,
        timestamp: new Date(),
        photoUrl: null,
        isPremium: null,
        contextInfo: null
      };
      botMessageToAddRef.current = errorMsg;
      console.log("[ChatContext] Error message stored in ref, will add after typing completes");
    } finally {
      // Ensure typing indicator is visible for minimum duration
      const elapsedTime = Date.now() - typingStartTime;
      const remainingTime = Math.max(0, MIN_TYPING_DURATION - elapsedTime);
      
      console.log("[ChatContext] Finally block - elapsed:", elapsedTime, "ms, remaining:", remainingTime, "ms");
      console.log("[ChatContext] Has pending message:", !!botMessageToAddRef.current);
      
      if (remainingTime > 0) {
        console.log("[ChatContext] Waiting", remainingTime, "ms before hiding typing and showing message");
        setTimeout(() => {
          console.log("[ChatContext] Timeout complete - hiding typing indicator");
          setIsTyping(false);
          
          // Add the bot message AFTER typing indicator disappears
          if (botMessageToAddRef.current) {
            const messageToAdd = botMessageToAddRef.current;
            botMessageToAddRef.current = null; // Clear ref first
            
            // Check for duplicate before adding
            setMessages((prev) => {
              const lastMessage = prev.length > 0 ? prev[prev.length - 1] : null;
              const messageContent = messageToAdd.content.trim().toLowerCase();
              
              if (lastMessage && lastMessage.role === 'assistant') {
                const lastContent = lastMessage.content.trim().toLowerCase();
                // Block duplicate "Hi" or "Hello" messages
                if ((messageContent === 'hi' || messageContent === 'hello') && 
                    (lastContent === 'hi' || lastContent === 'hello') &&
                    messageContent === lastContent) {
                  console.log("[ChatContext] Blocking duplicate welcome message:", messageToAdd.content);
                  return prev; // Don't add duplicate
                }
                
                // Block exact duplicate messages
                if (messageContent === lastContent && messageToAdd.role === 'assistant') {
                  console.log("[ChatContext] Blocking duplicate message:", messageToAdd.content);
                  return prev; // Don't add duplicate
                }
              }
              
              console.log("[ChatContext] Adding bot message NOW:", messageToAdd.content.substring(0, 50));
              return [...prev, messageToAdd]; // Then add the captured message
            });
          } else {
            console.log("[ChatContext] No message to add");
          }
        }, remainingTime);
      } else {
        console.log("[ChatContext] No wait needed - hiding typing and showing message immediately");
        setIsTyping(false);
        
        // Add the bot message immediately if typing time has already passed
        if (botMessageToAddRef.current) {
          const messageToAdd = botMessageToAddRef.current;
          botMessageToAddRef.current = null; // Clear ref first
          
          // Check for duplicate before adding
          setMessages((prev) => {
            const lastMessage = prev.length > 0 ? prev[prev.length - 1] : null;
            const messageContent = messageToAdd.content.trim().toLowerCase();
            
            if (lastMessage && lastMessage.role === 'assistant') {
              const lastContent = lastMessage.content.trim().toLowerCase();
              // Block duplicate "Hi" or "Hello" messages
              if ((messageContent === 'hi' || messageContent === 'hello') && 
                  (lastContent === 'hi' || lastContent === 'hello') &&
                  messageContent === lastContent) {
                console.log("[ChatContext] Blocking duplicate welcome message:", messageToAdd.content);
                return prev; // Don't add duplicate
              }
              
              // Block exact duplicate messages
              if (messageContent === lastContent && messageToAdd.role === 'assistant') {
                console.log("[ChatContext] Blocking duplicate message:", messageToAdd.content);
                return prev; // Don't add duplicate
              }
            }
            
            console.log("[ChatContext] Adding bot message NOW (immediate):", messageToAdd.content.substring(0, 50));
            return [...prev, messageToAdd]; // Then add the captured message
          });
        } else {
          console.log("[ChatContext] No message to add");
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    }
  };

  // Improve the isAffirmative function to be more precise and handle more variations
  const isAffirmative = (content: string): boolean => {
    if (!content) return false;
    
    const lowerContent = content.toLowerCase().trim();
    console.log(`[ChatContext] Checking if "${lowerContent}" is affirmative`);
    
    // Exact match for common affirmative words
    const exactMatches = ["yes", "haa", "ha", "han", "haan", "dikhao", "dikha", "ok", "okay", "sure", "ji"];
    if (exactMatches.includes(lowerContent)) {
      console.log(`[ChatContext] Exact match found for "${lowerContent}"`);
      return true;
    }
    
    // Check for includes of common variations
    if (lowerContent.includes("yes") || 
        lowerContent.includes("haa") || 
        lowerContent.includes("dikhao") || 
        lowerContent.includes("show") || 
        lowerContent.includes("dekh")) {
      console.log(`[ChatContext] Contains affirmative keyword: "${lowerContent}"`);
      return true;
    }
    
    // More complex matches that require word boundaries
    const complexMatches = [
      /\byes\b/, /\bhaa+\b/, /\bha\b/, /\bhan\b/, /\bhaan\b/, 
      /\bdikhao\b/, /\bdikha\b/, /\bok\b/, /\bokay\b/, /\bsure\b/
    ];
    
    return complexMatches.some(pattern => pattern.test(lowerContent));
  };

  // Clear chat
  const clearChat = async () => {
    // Clear messages from API
      await apiRequest("DELETE", "/api/messages");
    
    // Clear messages from local state
      setMessages([]);

    // If not authenticated, reset message count to 0
    // For authenticated users, we'll keep the count in localStorage
    // so they can continue where they left off
    if (!isAuthenticated()) {
      setMessageCount(0);
        localStorage.setItem(`messageCount_${companionId}`, "0");
      console.log("[ChatContext] Cleared chat and reset message count for non-authenticated user");
    } else {
      console.log("[ChatContext] Cleared chat for authenticated user - message count preserved");
      toast({
        title: "Chat cleared",
        description: "Your conversation has been cleared from this device, but will be restored next time.",
        duration: 3000,
      });
    }
  };

  // Language toggle
  const toggleLanguage = () => setCurrentLanguage(l => l === "hindi" ? "english" : "hindi");

  // Payment dialog logic (UI should call setShowPaymentDialog(true) on photo click)

  return (
    <ChatContext.Provider
      value={{
        messages,
        isTyping,
        currentLanguage,
        botName,
        botAvatar,
        messageCount,
        showProfileDialog,
        showAuthDialog,
        showPremiumTease,
        showPremiumPhoto,
        showPaymentDialog,
        currentPhoto,
        setShowProfileDialog,
        setShowAuthDialog,
        setShowPremiumTease,
        setShowPremiumPhoto,
        setShowPaymentDialog,
        setCurrentPhoto,
        sendMessage,
        clearChat,
        toggleLanguage,
        userProfile,
        setUserProfile,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};