import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Message } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { getRandomPhoto, getRandomPhotoPrompt } from '@/lib/companionPhotos';
import { saveMessage, updateMessageCount, getFirebaseMessages, saveUserProfile } from '@/lib/firebase';

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  currentLanguage: 'hindi' | 'english';
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
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'hindi' | 'english'>('hindi');
  const [messageCount, setMessageCount] = useState(0);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const { toast } = useToast();
  
  // Initialize from localStorage directly instead of using ChatSettingsContext
  const [botName, setBotName] = useState(() => {
    try {
      const savedCompanion = localStorage.getItem('selectedCompanion');
      if (savedCompanion) {
        const companion = JSON.parse(savedCompanion);
        return companion.name;
      }
      return 'Priya';
    } catch (error) {
      console.error('Error loading companion name:', error);
      return 'Priya';
    }
  });
  
  const [botAvatar, setBotAvatar] = useState(() => {
    try {
      const savedCompanion = localStorage.getItem('selectedCompanion');
      if (savedCompanion) {
        const companion = JSON.parse(savedCompanion);
        return companion.avatar;
      }
      return '/images/priya.png';
    } catch (error) {
      console.error('Error loading companion avatar:', error);
      return '/images/priya.png';
    }
  });
  
  // We now use stableGetCompanionId instead of this function
  
  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedCompanion = localStorage.getItem('selectedCompanion');
        if (savedCompanion) {
          const companion = JSON.parse(savedCompanion);
          setBotName(companion.name);
          setBotAvatar(companion.avatar);
          // Reset messages when companion changes
          setMessages([]);
        }
      } catch (error) {
        console.error('Error handling storage change:', error);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Use a stable function reference for getCompanionId
  const stableGetCompanionId = useCallback(() => {
    try {
      const savedCompanion = localStorage.getItem('selectedCompanion');
      if (savedCompanion) {
        const companion = JSON.parse(savedCompanion);
        return companion.id;
      }
      return 'priya';
    } catch (error) {
      console.error('Error getting companion ID:', error);
      return 'priya';
    }
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      // Get messages specific to the current companion
      const companionId = stableGetCompanionId();
      const res = await fetch(`/api/messages?companionId=${companionId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
      
      // Try to get any messages from localStorage as a fallback
      try {
        const localStorageKey = `messages_${companionId}`;
        const savedMessages = localStorage.getItem(localStorageKey);
        if (savedMessages && data.length === 0) {
          const parsedMessages = JSON.parse(savedMessages);
          if (Array.isArray(parsedMessages) && parsedMessages.length > 0) {
            setMessages(parsedMessages);
          }
        }
      } catch (localStorageError) {
        console.error('Error retrieving messages from localStorage:', localStorageError);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
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
    const authUser = localStorage.getItem('authUser');
    
    // If user is not logged in and count is 3 or more, reset to 2
    // This ensures the chat input stays visible but auth dialog appears on next attempt
    if (!authUser && savedCount && parseInt(savedCount, 10) >= 3) {
      setMessageCount(2);
      localStorage.setItem(`messageCount_${companionId}`, '2');
    } else if (savedCount) {
      setMessageCount(parseInt(savedCount, 10) || 0);
    }
    
    fetchMessages();
  }, [fetchMessages, stableGetCompanionId]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Calculate potential new count (don't update state yet)
    const potentialNewCount = messageCount + 1;
    
    // Check if user needs to provide profile (first message)
    if (potentialNewCount === 1 && !localStorage.getItem('guestProfile')) {
      setShowProfileDialog(true);
      return;
    }
    
    // Check if free message limit reached (on 3rd message if not logged in)
    // Importantly, we check for messageCount === 2 (which means this is the 3rd message attempt)
    if (messageCount === 2 && !localStorage.getItem('authUser')) {
      setShowAuthDialog(true);
      return;
    }
    
    // Only increment the message count if we're actually sending the message
    setMessageCount(potentialNewCount);

    // Create user message
    const userMessage: Omit<Message, 'id' | 'timestamp'> = {
      content,
      role: 'user',
      companionId: stableGetCompanionId(),
    };

    try {
      // Add user message to UI immediately (optimistic update)
      const tempMessage: Message = {
        ...userMessage,
        id: -1, // Will be replaced with actual id from server
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Show typing indicator while waiting for response
      setIsTyping(true);

      // Send message to server
      const res = await apiRequest('POST', '/api/messages', {
        content,
        language: currentLanguage,
        companionId: stableGetCompanionId() // Pass companion ID to server
      });

      // Get response data
      const data = await res.json();
      
      // Check if we should offer a photo based on the message count and user response
      const companionId = stableGetCompanionId();
      
      // If we have a photo prompt at this message count
      const photoPrompt = getRandomPhotoPrompt(companionId, potentialNewCount);
      
      // If we have a photo prompt, inject it into the bot response
      if (photoPrompt && !data.error) {
        // Modify the response that will be sent to include the photo prompt
        try {
          // Send an additional message with the photo prompt
          await apiRequest('POST', '/api/messages', {
            content: photoPrompt,
            language: currentLanguage,
            companionId: companionId
          });
          
          // Refresh messages to include the photo prompt
          await fetchMessages();
        } catch (promptError) {
          console.error('Error sending photo prompt:', promptError);
        }
      }
      
      // If the bot suggested a photo previously and the user confirmed (yes/sure/ok/etc)
      const userSaidYesToPhoto = 
        content.toLowerCase().includes('yes') || 
        content.toLowerCase().includes('sure') || 
        content.toLowerCase().includes('ok') ||
        content.toLowerCase().includes('okay') ||
        content.toLowerCase().includes('show') ||
        content.toLowerCase().includes('send') ||
        content.toLowerCase().includes('share') ||
        content.toLowerCase().includes('photo') ||
        content.toLowerCase().includes('picture');
      
      // Track if we need to show a photo
      let shouldShowPhoto = false;
      let photoUrl = null;
      
      // Find if the last bot message contained a photo prompt
      const lastMessages = messages.slice(-3);
      const botSuggestedPhoto = lastMessages.some(msg => 
        msg.role === 'assistant' && 
        (msg.content.includes('picture') || 
         msg.content.includes('photo') || 
         msg.content.toLowerCase().includes('dekho'))
      );
      
      if (botSuggestedPhoto && userSaidYesToPhoto) {
        // User said yes to a photo offer, show a photo
        const randomPhoto = getRandomPhoto(companionId);
        if (randomPhoto) {
          shouldShowPhoto = true;
          photoUrl = randomPhoto.url;
          setCurrentPhoto(randomPhoto.url);
          
          // Send the photo description as a follow-up message
          setTimeout(async () => {
            try {
              await apiRequest('POST', '/api/messages', {
                content: randomPhoto.response,
                language: currentLanguage,
                companionId: companionId
              });
              
              // Fetch the updated messages
              await fetchMessages();
              
              // Show the premium photo dialog
              setShowPhotoDialog(true);
            } catch (error) {
              console.error('Error sending photo response:', error);
            }
          }, 1500);
        }
      }
      
      // Save to both localStorage and Firebase
      try {
        // Save the full messages array to localStorage
        const updatedMessages = await fetchMessages(); // Get the latest messages
        const localStorageKey = `messages_${companionId}`;
        
        // Store in localStorage
        localStorage.setItem(localStorageKey, JSON.stringify(messages));
        
        // Store message count as well
        localStorage.setItem(`messageCount_${companionId}`, potentialNewCount.toString());
        
        // Save to Firebase if user is authenticated
        const authUser = localStorage.getItem('authUser');
        if (authUser) {
          const userId = JSON.parse(authUser).uid;
          
          // Save user message to Firebase
          await saveMessage(userId, companionId, {
            content,
            role: 'user',
            timestamp: new Date().toISOString()
          });
          
          // Save assistant message to Firebase
          if (data.botMessage) {
            await saveMessage(userId, companionId, {
              content: data.botMessage.content,
              role: 'assistant',
              timestamp: new Date().toISOString()
            });
          }
          
          // Update message count in Firebase
          await updateMessageCount(userId, companionId);
        }
      } catch (storageError) {
        console.error('Error saving to storage:', storageError);
      }
      
      // Hide typing indicator
      setIsTyping(false);

      // Replace optimistic messages with actual data
      await fetchMessages();
      
      // Invalidate cache to refresh messages
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      // Display the actual error message from the API
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Unknown error occurred";
        
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
      await apiRequest('DELETE', '/api/messages');
      setMessages([]);
      
      // Also clear from localStorage
      try {
        const companionId = stableGetCompanionId();
        localStorage.removeItem(`messages_${companionId}`);
        localStorage.setItem(`messageCount_${companionId}`, '0');
        setMessageCount(0);
      } catch (localError) {
        console.error('Error clearing localStorage:', localError);
      }
      
      // Only show toast when manually clearing (not during navigation)
      toast({
        title: "Success",
        description: "Chat history cleared",
        duration: 2000 // Reduce the display time to 2 seconds
      });
    } catch (error) {
      console.error('Error clearing chat:', error);
      toast({
        title: "Error",
        description: "Failed to clear chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleLanguage = () => {
    setCurrentLanguage(prev => prev === 'hindi' ? 'english' : 'hindi');
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
        toggleLanguage
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
