import { createContext, useContext, useState, ReactNode } from 'react';

// Define the companion interface
interface Companion {
  id: string;
  name: string;
  avatar: string;
}

// Default companion
const defaultCompanion: Companion = {
  id: 'priya',
  name: 'Priya',
  avatar: '/images/priya.png'
};

// Define the context type
interface ChatSettingsContextType {
  companion: Companion;
  setCompanion: (companion: Companion) => void;
}

// Create the context
const ChatSettingsContext = createContext<ChatSettingsContextType | undefined>(undefined);

// Create a hook to use the context
export const useChatSettings = () => {
  const context = useContext(ChatSettingsContext);
  if (!context) {
    throw new Error('useChatSettings must be used within a ChatSettingsProvider');
  }
  return context;
};

// Define the provider props
interface ChatSettingsProviderProps {
  children: ReactNode;
}

// Create the provider component
export const ChatSettingsProvider = ({ children }: ChatSettingsProviderProps) => {
  // Initialize state from localStorage if available
  const [companion, setCompanionState] = useState<Companion>(() => {
    const savedCompanion = localStorage.getItem('selectedCompanion');
    if (savedCompanion) {
      try {
        return JSON.parse(savedCompanion) as Companion;
      } catch (e) {
        console.error('Error parsing saved companion:', e);
        return defaultCompanion;
      }
    }
    return defaultCompanion;
  });

  // Wrapper function to update state and localStorage
  const setCompanion = (newCompanion: Companion) => {
    setCompanionState(newCompanion);
    localStorage.setItem('selectedCompanion', JSON.stringify(newCompanion));
  };

  return (
    <ChatSettingsContext.Provider value={{ companion, setCompanion }}>
      {children}
    </ChatSettingsContext.Provider>
  );
};