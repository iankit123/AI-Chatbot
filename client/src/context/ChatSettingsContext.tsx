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
  avatar: 'https://readdy.ai/api/search-image?query=Beautiful%20Indian%20woman%20with%20long%20dark%20hair%2C%20warm%20smile%2C%20professional%20portrait%2C%20soft%20lighting%2C%20culturally%20appropriate%20modest%20outfit%2C%20friendly%20expression%2C%20high%20quality%2C%20clear%20face%20shot%2C%20isolated%20on%20soft%20gradient%20background%2C%20centered%20composition&width=375&height=300&seq=1&orientation=portrait'
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
  const [companion, setCompanion] = useState<Companion>(defaultCompanion);

  return (
    <ChatSettingsContext.Provider value={{ companion, setCompanion }}>
      {children}
    </ChatSettingsContext.Provider>
  );
};