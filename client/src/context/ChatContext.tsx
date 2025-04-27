import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { apiRequest } from "@/lib/queryClient";
import { Message } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRandomPhoto, getRandomPhotoPrompt } from "@/lib/companionPhotos";
// Firebase functions are dynamically imported when needed to avoid circular dependencies

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  currentLanguage: "hindi" | "english";
  botName: string;
  botAvatar: string;
  messageCount: number;
  showProfileDialog: boolean;
  showAuthDialog: boolean;
  showPhotoDialog: boolean;
  currentPhoto: string | null;
  setShowProfileDialog: (show: boolean) => void;
  setShowAuthDialog: (show: boolean) => void;
  setShowPhotoDialog: (show: boolean) => void;
  setCurrentPhoto: (url: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  toggleLanguage: () => void;
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
  const [currentLanguage, setCurrentLanguage] = useState<"hindi" | "english">(
    "hindi",
  );
  const [messageCount, setMessageCount] = useState(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);

  // Initial setup - runs once when component mounts
  useEffect(() => {
    // Get current companion ID
    const companionId = localStorage.getItem("selectedCompanion")
      ? JSON.parse(localStorage.getItem("selectedCompanion")!).id
      : "priya";

    // Check if this is the first time loading the page in this session
    const sessionInitialized = sessionStorage.getItem("chatSessionInitialized");

    // Force reset message count to 0 on initial page load
    localStorage.setItem(`messageCount_${companionId}`, "0");
    setMessageCount(0);

    // For non-logged in users, clear chat history ONLY on first page load
    const authUser = localStorage.getItem("authUser");
    if (!authUser && !sessionInitialized) {
      // Clear messages from localStorage
      localStorage.removeItem(`messages_${companionId}`);

      // Clear messages from state
      setMessages([]);

      // Clear messages from API
      apiRequest("DELETE", "/api/messages").catch((err) => {
        console.error("Error clearing messages on page load:", err);
      });

      console.log(
        "Initial page load - cleared chat history for non-logged in user",
      );

      // Mark this session as initialized so we don't clear again on soft refreshes
      sessionStorage.setItem("chatSessionInitialized", "true");
    } else {
      console.log("Session already initialized, not clearing chat");
    }

    console.log("Page initialized - reset message count to 0");

    // This will only run once on component mount
  }, []);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize from localStorage directly instead of using ChatSettingsContext
  const [botName, setBotName] = useState(() => {
    try {
      const savedCompanion = localStorage.getItem("selectedCompanion");
      if (savedCompanion) {
        const companion = JSON.parse(savedCompanion);
        return companion.name;
      }
      return "Priya";
    } catch (error) {
      console.error("Error loading companion name:", error);
      return "Priya";
    }
  });

  const [botAvatar, setBotAvatar] = useState(() => {
    try {
      const savedCompanion = localStorage.getItem("selectedCompanion");
      if (savedCompanion) {
        const companion = JSON.parse(savedCompanion);
        return companion.avatar;
      }
      return "/images/priya.png";
    } catch (error) {
      console.error("Error loading companion avatar:", error);
      return "/images/priya.png";
    }
  });

  // We now use stableGetCompanionId instead of this function

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedCompanion = localStorage.getItem("selectedCompanion");
        if (savedCompanion) {
          const companion = JSON.parse(savedCompanion);
          setBotName(companion.name);
          setBotAvatar(companion.avatar);
          // Reset messages when companion changes
          setMessages([]);
        }
      } catch (error) {
        console.error("Error handling storage change:", error);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Use a stable function reference for getCompanionId
  const stableGetCompanionId = useCallback(() => {
    try {
      const savedCompanion = localStorage.getItem("selectedCompanion");
      if (savedCompanion) {
        const companion = JSON.parse(savedCompanion);
        return companion.id;
      }
      return "priya";
    } catch (error) {
      console.error("Error getting companion ID:", error);
      return "priya";
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      // Check if user is authenticated
      const authUser = localStorage.getItem("authUser");
      const companionId = stableGetCompanionId();

      // Get messages specific to the current companion from API
      const res = await fetch(`/api/messages?companionId=${companionId}`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      const data = await res.json();

      if (authUser) {
        // For authenticated users, try to restore from Firebase first, then localStorage
        try {
          // Parse the user data to get the user ID
          const userData = JSON.parse(authUser);
          const userId = userData.uid;

          try {
            // Try to get messages from Firebase for this user and companion
            console.log(
              "Fetching Firebase messages for user:",
              userId,
              "companion:",
              companionId,
            );

            // Import here to avoid circular dependency
            const { getFirebaseMessages } = await import("@/lib/firebase");
            const firebaseMessages = await getFirebaseMessages(
              userId,
              companionId,
            );

            if (firebaseMessages && firebaseMessages.length > 0) {
              // Format Firebase messages to match our API structure
              const formattedMessages = firebaseMessages.map((msg, index) => ({
                id: index + 1, // Generate sequential IDs
                content: msg.content,
                role: msg.role,
                companionId: companionId,
                timestamp: new Date(msg.timestamp),
                photoUrl: msg.photoUrl || null,
                isPremium: msg.isPremium || null,
              }));

              console.log(
                "Restored",
                formattedMessages.length,
                "messages from Firebase",
              );
              setMessages(formattedMessages);
              return; // Exit if we successfully loaded from Firebase
            } else {
              console.log("No Firebase messages found, checking localStorage");
            }
          } catch (firebaseError) {
            console.error("Error fetching Firebase messages:", firebaseError);
          }

          // Try localStorage as fallback
          const localStorageKey = `messages_${companionId}`;
          const savedMessages = localStorage.getItem(localStorageKey);

          if (savedMessages && data.length === 0) {
            try {
              const parsedMessages = JSON.parse(savedMessages);
              if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
                setMessages(parsedMessages);
                console.log(
                  "Restored messages from localStorage for authenticated user",
                );
                return; // Exit if we successfully loaded from localStorage
              }
            } catch (parseError) {
              console.error(
                "Error parsing saved messages from localStorage:",
                parseError,
              );
              // Clear the corrupted localStorage data
              localStorage.removeItem(localStorageKey);
            }
          }

          // If we reach here, use API data as last resort
          setMessages(data);
        } catch (error) {
          console.error("Error retrieving user messages:", error);
          setMessages(data); // Fallback to API data
        }
      } else {
        // For non-authenticated users, keep chat history within the session
        // but don't load from previous sessions
        const sessionInitialized = sessionStorage.getItem(
          "chatSessionInitialized",
        );

        if (!sessionInitialized) {
          console.log(
            "First session: initializing chat for non-logged in user",
          );

          // Clear any existing messages to start fresh
          if (data.length > 0) {
            console.log("Clearing existing messages for new session");
            await apiRequest("DELETE", "/api/messages");
            setMessages([]);
          }

          // Mark this session as initialized to preserve messages during the session
          sessionStorage.setItem("chatSessionInitialized", "true");
          console.log(
            "Session marked as initialized, chat history will persist during this session",
          );
        } else {
          // In an active session, use the API data
          console.log(
            "Active session: loading",
            data.length,
            "messages from API",
          );
          setMessages(data);
        }
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, stableGetCompanionId]);

  // Initialize message count from localStorage
  useEffect(() => {
    const companionId = stableGetCompanionId();
    const savedCount = localStorage.getItem(`messageCount_${companionId}`);
    const authUser = localStorage.getItem("authUser");

    console.log("Initializing message count, savedCount:", savedCount);

    // If user is not logged in and count is 3 or more, reset to 2
    // This ensures the chat input stays visible but auth dialog appears on next attempt
    if (!authUser && savedCount && parseInt(savedCount, 10) >= 3) {
      setMessageCount(2);
      localStorage.setItem(`messageCount_${companionId}`, "2");
      console.log("User not logged in with high count, resetting to 2");
    } else if (savedCount) {
      const count = parseInt(savedCount, 10) || 0;
      setMessageCount(count);
      console.log("Setting message count from localStorage:", count);
    } else {
      // If no saved count, explicitly set to 0
      setMessageCount(0);
      localStorage.setItem(`messageCount_${companionId}`, "0");
      console.log("No saved count, initializing to 0");
    }

    fetchMessages();
  }, [fetchMessages, stableGetCompanionId]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Calculate potential new count (don't update state yet)
    const potentialNewCount = messageCount + 1;

    // Check if user needs to provide profile (first message)
    if (potentialNewCount === 1 && !localStorage.getItem("guestProfile")) {
      setShowProfileDialog(true);
      return;
    }

    // Check if free message limit reached (on 3rd message if not logged in)
    // Importantly, we check for messageCount === 2 (which means this is the 3rd message attempt)
    const authUser = localStorage.getItem("authUser");
    console.log(
      "Current message count:",
      messageCount,
      "Auth user exists:",
      !!authUser,
    );

    if (messageCount === 2 && !authUser) {
      console.log("Showing auth dialog for 3rd message");
      setShowAuthDialog(true);
      return;
    }

    // Only increment the message count if we're actually sending the message
    setMessageCount(potentialNewCount);

    // Create user message
    const userMessage: Omit<Message, "id" | "timestamp"> = {
      content,
      role: "user",
      companionId: stableGetCompanionId(),
      photoUrl: null,
      isPremium: null,
    };

    try {
      // Add user message to UI immediately (optimistic update)
      const tempMessage: Message = {
        ...userMessage,
        id: -1, // Will be replaced with actual id from server
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, tempMessage]);

      // Show typing indicator while waiting for response
      setIsTyping(true);

      // Send message to server
      const res = await apiRequest("POST", "/api/messages", {
        content,
        language: currentLanguage,
        companionId: stableGetCompanionId(), // Pass companion ID to server
      });

      // Get response data
      const data = await res.json();

      // Check if we should offer a photo based on the message count and user response
      const companionId = stableGetCompanionId();

      // Special case: For signed-in users at message count 4, add the special photo offer message
      // This is *after* the 4th message from the companion (so on the 8th message in the chat)
      const authUser = localStorage.getItem("authUser");
      if (authUser && potentialNewCount >= 4 && potentialNewCount % 4 === 0) {
        try {
          // Get user's name from profile if available
          let userName = "";
          const guestProfile = localStorage.getItem("guestProfile");
          if (guestProfile) {
            const profile = JSON.parse(guestProfile);
            userName = profile.name || "";
          }

          // Special photo offer message
          const photoOfferMessage = `${userName ? userName + ", " : ""}Kya aap meri picture dekhna chahte ho jo maine kal click kari thi?`;

          // Send special photo offer message
          await apiRequest("POST", "/api/messages", {
            content: photoOfferMessage,
            language: currentLanguage,
            companionId: companionId,
          });

          console.log("Sent premium photo offer message");

          // After this message, we'll show a photo in the next user response
          // Flag this in sessionStorage
          sessionStorage.setItem("showPremiumPhotoNext", "true");

          // Refresh messages to include the photo offer
          await fetchMessages();
        } catch (offerError) {
          console.error("Error sending premium photo offer:", offerError);
        }

        return; // Don't process regular photo prompts in this case
      }

      // Regular photo prompt handling
      // If we have a photo prompt at this message count
      const photoPrompt = getRandomPhotoPrompt(companionId, potentialNewCount);

      // If we have a photo prompt, inject it into the bot response
      if (photoPrompt && !data.error) {
        // Modify the response that will be sent to include the photo prompt
        try {
          // Send an additional message with the photo prompt
          await apiRequest("POST", "/api/messages", {
            content: photoPrompt,
            language: currentLanguage,
            companionId: companionId,
          });

          // Refresh messages to include the photo prompt
          await fetchMessages();
        } catch (promptError) {
          console.error("Error sending photo prompt:", promptError);
        }
      }

      // Check if we should show a premium photo (if user was prompted in previous message)
      const showPremiumPhotoNext = sessionStorage.getItem(
        "showPremiumPhotoNext",
      );

      // Check if user responded positively to premium photo offer
      const userSaidYesToPhoto =
        content.toLowerCase().includes("yes") ||
        content.toLowerCase().includes("sure") ||
        content.toLowerCase().includes("ok") ||
        content.toLowerCase().includes("okay") ||
        content.toLowerCase().includes("show") ||
        content.toLowerCase().includes("send") ||
        content.toLowerCase().includes("share") ||
        content.toLowerCase().includes("photo") ||
        content.toLowerCase().includes("picture") ||
        content.toLowerCase().includes("haan") ||
        content.toLowerCase().includes("ha") ||
        content.toLowerCase().includes("dikhao");

      // If previous message had premium photo offer and user said yes
      if (showPremiumPhotoNext === "true" && userSaidYesToPhoto) {
        try {
          console.log(
            "User accepted premium photo offer, showing premium photo",
          );

          // Clear the flag
          sessionStorage.removeItem("showPremiumPhotoNext");

          // Determine the companion folder path - make sure this exists in the public folder
          const companionId = stableGetCompanionId();
          // Use premium folder for premium photos with png extension
          const premiumPhotoUrl = `/images/${companionId}.png`;

          console.log("Using premium photo URL:", premiumPhotoUrl);

          // Set current photo to display in premium dialog
          setCurrentPhoto(premiumPhotoUrl);

          // Add bot response with premium photo attached
          // Create a follow-up message with the photo, but skip creating a user message
          const response = await apiRequest("POST", "/api/messages", {
            content: "Ye meri kal ki photo hai. Kaisi lagi? 😊",
            language: currentLanguage,
            companionId: companionId,
            photoUrl: premiumPhotoUrl, // Pass photo URL to include in message
            isPremium: true, // Mark this as a premium photo message
            skipUserMessage: true // Important: don't create duplicate user message
          });

          console.log("Sent premium photo message response:", response);

          // Fetch the updated messages to refresh the chat
          await fetchMessages();
          
          // We'll set the photo, but not auto-show the dialog
          // User needs to click on the photo to see it in the premium dialog
        } catch (error) {
          console.error("Error handling premium photo:", error);

          // Fallback to send a regular message if photo processing fails
          try {
            await apiRequest("POST", "/api/messages", {
              content:
                "Sorry, meri photo load nahi ho rahi hai. Technical issue hai. Baad me try karenge.",
              language: currentLanguage,
              companionId: companionId,
            });

            // Fetch the updated messages
            await fetchMessages();
          } catch (fallbackError) {
            console.error("Error sending fallback message:", fallbackError);
          }
        }

        return; // Skip regular photo handling
      }

      // Regular photo handling (non-premium)
      // If the bot suggested a regular photo previously and the user confirmed
      const userSaidYesToRegularPhoto =
        content.toLowerCase().includes("yes") ||
        content.toLowerCase().includes("sure") ||
        content.toLowerCase().includes("ok") ||
        content.toLowerCase().includes("okay") ||
        content.toLowerCase().includes("show") ||
        content.toLowerCase().includes("send") ||
        content.toLowerCase().includes("share") ||
        content.toLowerCase().includes("photo") ||
        content.toLowerCase().includes("haa") ||
        content.toLowerCase().includes("picture");

      // Track if we need to show a photo
      let shouldShowPhoto = false;
      let photoUrl = null;

      // Find if the last bot message contained a photo prompt
      const lastMessages = messages.slice(-3);
      const botSuggestedPhoto = lastMessages.some(
        (msg) =>
          msg.role === "assistant" &&
          (msg.content.includes("picture") ||
            msg.content.includes("photo") ||
            msg.content.toLowerCase().includes("dekho")),
      );

      // Handle regular (non-premium) photo requests
      if (
        botSuggestedPhoto &&
        userSaidYesToRegularPhoto &&
        !showPremiumPhotoNext
      ) {
        // User said yes to a regular photo offer, show a photo
        const randomPhoto = getRandomPhoto(companionId);
        if (randomPhoto) {
          shouldShowPhoto = true;
          photoUrl = randomPhoto.url;
          setCurrentPhoto(randomPhoto.url);

          // Send the photo description as a follow-up message
          setTimeout(async () => {
            try {
              await apiRequest("POST", "/api/messages", {
                content: randomPhoto.response,
                language: currentLanguage,
                companionId: companionId,
              });

              // Fetch the updated messages
              await fetchMessages();

              // Show the premium photo dialog
              setShowPhotoDialog(true);
            } catch (error) {
              console.error("Error sending photo response:", error);
            }
          }, 1500);
        }
      }

      // Save to both localStorage and Firebase
      try {
        // Save the full messages array to localStorage
        await fetchMessages(); // Get the latest messages first
        const localStorageKey = `messages_${companionId}`;

        // Store in localStorage with proper error handling
        try {
          if (Array.isArray(messages)) {
            localStorage.setItem(localStorageKey, JSON.stringify(messages));
            console.log("Saved messages to localStorage:", messages.length);
          } else {
            console.error(
              "Cannot save messages to localStorage: messages is not an array",
              messages,
            );
          }
        } catch (storageError) {
          console.error("Error saving messages to localStorage:", storageError);
          // Clear potentially corrupt data
          localStorage.removeItem(localStorageKey);
        }

        // Store message count as well
        localStorage.setItem(
          `messageCount_${companionId}`,
          potentialNewCount.toString(),
        );
        console.log(
          "Updated message count in localStorage:",
          potentialNewCount,
        );

        // Save to Firebase if user is authenticated
        const authUser = localStorage.getItem("authUser");
        if (authUser) {
          try {
            // Import Firebase functions dynamically to avoid circular dependencies
            const { saveMessage, updateMessageCount } = await import(
              "@/lib/firebase"
            );

            // Handle both formats of authUser storage (string email or JSON object)
            let userId;
            try {
              // Try parsing as JSON first (for Firebase auth)
              const parsed = JSON.parse(authUser);
              userId = parsed.uid;
              console.log("Using Firebase auth user ID:", userId);
            } catch (e) {
              // If not JSON, use the email directly (for simulated login)
              userId = `guest-${new Date().getTime()}`;
              console.log("Using guest user ID:", userId);
            }

            // Save user message to Firebase
            await saveMessage(userId, companionId, {
              content,
              role: "user",
              timestamp: new Date().toISOString(),
            });
            console.log("Saved user message to Firebase");

            // Save assistant message to Firebase
            if (data.botMessage) {
              await saveMessage(userId, companionId, {
                content: data.botMessage.content,
                role: "assistant",
                timestamp: new Date().toISOString(),
              });
              console.log("Saved assistant message to Firebase");
            }

            // Update message count in Firebase
            await updateMessageCount(userId, companionId);
            console.log("Updated message count in Firebase");
          } catch (firebaseError) {
            console.error("Error saving to Firebase:", firebaseError);
          }
        } else {
          console.log("User not authenticated, skipping Firebase save");
        }
      } catch (storageError) {
        console.error("Error saving to storage:", storageError);
      }

      // Hide typing indicator
      setIsTyping(false);

      // Replace optimistic messages with actual data
      await fetchMessages();

      // Invalidate cache to refresh messages
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    } catch (error) {
      console.error("Error sending message:", error);
      setIsTyping(false);

      // Display the actual error message from the API
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";

      toast({
        title: "API Connection Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const clearChat = async () => {
    try {
      // Clear from server
      await apiRequest("DELETE", "/api/messages");
      setMessages([]);

      // Also clear from localStorage
      try {
        const companionId = stableGetCompanionId();
        localStorage.removeItem(`messages_${companionId}`);
        localStorage.setItem(`messageCount_${companionId}`, "0");
        setMessageCount(0);
        console.log("Cleared chat and reset message count to 0");
      } catch (localError) {
        console.error("Error clearing localStorage:", localError);
      }

      // Only show toast when manually clearing (not during navigation)
      toast({
        title: "Success",
        description: "Chat history cleared",
        duration: 2000, // Reduce the display time to 2 seconds
      });
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast({
        title: "Error",
        description: "Failed to clear chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleLanguage = () => {
    setCurrentLanguage((prev) => (prev === "hindi" ? "english" : "hindi"));
  };

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
        showPhotoDialog,
        currentPhoto,
        setShowProfileDialog,
        setShowAuthDialog,
        setShowPhotoDialog,
        setCurrentPhoto,
        sendMessage,
        clearChat,
        toggleLanguage,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
