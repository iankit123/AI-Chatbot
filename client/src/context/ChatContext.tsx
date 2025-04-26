import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Message } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { 
  saveMessage, 
  getMessages as getFirebaseMessages, 
  updateMessageCount,
  getMessageCount
} from '@/lib/firebase';

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  currentLanguage: 'hindi' | 'english';
  botName: string;
  botAvatar: string;
  messageCount: number;
  showProfileDialog: boolean;
  showAuthDialog: boolean;
  setShowProfileDialog: (show: boolean) => void;
  setShowAuthDialog: (show: boolean) => void;
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
  
  // Get current selected companion ID
  const getCompanionId = () => {
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
  };
  
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

  const fetchMessages = useCallback(async () => {
    try {
      // Get messages specific to the current companion
      const companionId = getCompanionId();
      const res = await fetch(`/api/messages?companionId=${companionId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
      
      // Also check if there are any stored messages in Firebase
      const userId = localStorage.getItem('authUser');
      if (userId) {
        try {
          const firebaseMessages = await getFirebaseMessages(userId, companionId);
          if (firebaseMessages && firebaseMessages.length > 0 && data.length === 0) {
            // Only use Firebase messages if no local messages exist
            const formattedMessages = firebaseMessages.map((msg: any, index: number) => ({
              id: index + 1,
              content: msg.content,
              role: msg.role,
              timestamp: new Date(msg.timestamp),
              companionId
            }));
            setMessages(formattedMessages);
          }
        } catch (firebaseError) {
          console.error('Firebase error fetching messages:', firebaseError);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast, getCompanionId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Track message count for limits
    const newCount = messageCount + 1;
    setMessageCount(newCount);
    
    // Check if user needs to provide profile (first message)
    if (newCount === 1 && !localStorage.getItem('guestProfile')) {
      setShowProfileDialog(true);
      return;
    }
    
    // Check if free message limit reached (after 3 messages)
    if (newCount > 3 && !localStorage.getItem('authUser')) {
      setShowAuthDialog(true);
      return;
    }

    // Create user message
    const userMessage: Omit<Message, 'id' | 'timestamp'> = {
      content,
      role: 'user',
      companionId: getCompanionId(),
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
        companionId: getCompanionId() // Pass companion ID to server
      });

      // Get response data
      const data = await res.json();
      
      // Save to Firebase if user is logged in
      const userId = localStorage.getItem('authUser');
      if (userId) {
        try {
          // Save user message
          await saveMessage(userId, getCompanionId(), {
            content,
            role: 'user',
            timestamp: new Date().toISOString()
          });
          
          // Save bot response
          if (data.botMessage) {
            await saveMessage(userId, getCompanionId(), {
              content: data.botMessage.content,
              role: 'assistant',
              timestamp: new Date().toISOString()
            });
          }
          
          // Update message count
          await updateMessageCount(userId, getCompanionId());
        } catch (firebaseError) {
          console.error('Firebase error:', firebaseError);
        }
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
      await apiRequest('DELETE', '/api/messages');
      setMessages([]);
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
        setShowProfileDialog,
        setShowAuthDialog,
        sendMessage, 
        clearChat, 
        toggleLanguage
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
