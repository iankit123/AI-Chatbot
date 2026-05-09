import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { BottomNav } from '@/components/BottomNav';
import { getAllUserChats, auth, getAnonymousUserId } from '@/lib/supabase';
import { formatTime } from '@/lib/dates';

interface ChatSummary {
  companionId: string;
  lastMessage: {
    content: string;
    role: string;
    timestamp: string;
  };
  lastMessageTime: string;
  messageCount: number;
}

const ROLE_NAMES: Record<string, string> = {
  doctor: 'Personal Doctor AI',
  kundli: 'Kundli Bhavishya Checker',
  parenting: 'Parenting and Baby Care Assistant',
  finance: 'Personal Finance Help',
  career: 'Career and Job Helper',
  priya: 'Priya',
  ananya: 'Ananya',
  meera: 'Meera',
  riya: 'Riya',
  neha: 'Neha'
};

export default function OldChats() {
  const [, setLocation] = useLocation();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user ID - either authenticated or anonymous
        let userId: string | null = null;
        
        if (auth.currentUser) {
          userId = auth.currentUser.uid;
        } else {
          userId = getAnonymousUserId();
        }
        
        if (!userId) {
          setError("Please sign in to view your chat history");
          setLoading(false);
          return;
        }
        
        const userChats = await getAllUserChats(userId);
        setChats(userChats);
      } catch (err) {
        console.error("Error loading chats:", err);
        setError("Failed to load chat history");
      } finally {
        setLoading(false);
      }
    };
    
    loadChats();
  }, []);

  const handleChatClick = (companionId: string) => {
    // Set the companion and navigate to appropriate chat
    const roleTypes = ['doctor', 'kundli', 'parenting', 'finance', 'career'];
    
    if (roleTypes.includes(companionId)) {
      // Role-based chat
      setLocation(`/${companionId}`);
    } else {
      // Relationship chat
      localStorage.setItem('selectedCompanion', JSON.stringify({
        id: companionId,
        name: ROLE_NAMES[companionId] || companionId,
        avatar: `/images/${companionId}.png`
      }));
      window.dispatchEvent(new Event('companion-selected'));
      setLocation('/chat');
    }
  };

  const getChatName = (companionId: string) => {
    return ROLE_NAMES[companionId] || companionId;
  };

  const getPreviewText = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Old chats</h1>
        
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading your chats...</div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}
        
        {!loading && !error && chats.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 text-lg">No chat history found</p>
            <p className="text-gray-400 text-sm mt-2">Start a new conversation to see it here</p>
          </div>
        )}
        
        {!loading && !error && chats.length > 0 && (
          <div className="space-y-3">
            {chats.map((chat) => (
              <div
                key={chat.companionId}
                onClick={() => handleChatClick(chat.companionId)}
                className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:bg-gray-50 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {getChatName(chat.companionId)}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {getPreviewText(chat.lastMessage.content)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{chat.messageCount} messages</span>
                      <span>•</span>
                      <span>{formatTime(new Date(chat.lastMessageTime))}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <BottomNav />
    </div>
  );
}


