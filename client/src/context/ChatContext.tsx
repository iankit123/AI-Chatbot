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
  
  // Get selected companion from localStorage or use default
  const [botInfo, setBotInfo] = useState(() => {
    const savedCompanion = localStorage.getItem('selectedCompanion');
    if (savedCompanion) {
      try {
        const parsed = JSON.parse(savedCompanion);
        return {
          name: parsed.name || 'Priya',
          avatar: parsed.avatar || 'https://readdy.ai/api/search-image?query=Beautiful%20Indian%20woman%20with%20long%20dark%20hair%2C%20warm%20smile%2C%20professional%20portrait%2C%20soft%20lighting%2C%20culturally%20appropriate%20modest%20outfit%2C%20friendly%20expression%2C%20high%20quality%2C%20clear%20face%20shot%2C%20isolated%20on%20soft%20gradient%20background%2C%20centered%20composition&width=375&height=300&seq=1&orientation=portrait'
        };
      } catch (e) {
        console.error('Error parsing companion data:', e);
      }
    }
    
    // Default bot information if nothing in localStorage
    return {
      name: 'Priya',
      avatar: 'https://readdy.ai/api/search-image?query=Beautiful%20Indian%20woman%20with%20long%20dark%20hair%2C%20warm%20smile%2C%20professional%20portrait%2C%20soft%20lighting%2C%20culturally%20appropriate%20modest%20outfit%2C%20friendly%20expression%2C%20high%20quality%2C%20clear%20face%20shot%2C%20isolated%20on%20soft%20gradient%20background%2C%20centered%20composition&width=375&height=300&seq=1&orientation=portrait'
    };
  });
  
  const botName = botInfo.name;
  const botAvatar = botInfo.avatar;

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
      toast({
        title: "Success",
        description: "Chat history cleared",
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
