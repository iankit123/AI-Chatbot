import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Message } from '@shared/schema';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ChatContextType {
  messages: Message[];
  isTyping: boolean;
  currentLanguage: 'hindi' | 'english';
  botName: string;
  botAvatar: string;
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
  
  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const savedCompanion = localStorage.getItem('selectedCompanion');
        if (savedCompanion) {
          const companion = JSON.parse(savedCompanion);
          setBotName(companion.name);
          setBotAvatar(companion.avatar);
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
      const res = await fetch('/api/messages');
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Create user message
    const userMessage: Omit<Message, 'id' | 'timestamp'> = {
      content,
      role: 'user',
    };

    try {
      // Add user message to UI immediately (optimistic update)
      // Create a temporary message with the right types
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
        language: currentLanguage
      });

      // Get response data
      const data = await res.json();
      
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
        sendMessage, 
        clearChat, 
        toggleLanguage
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
