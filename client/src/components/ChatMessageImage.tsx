import { useState } from 'react';
import { useChat } from '@/context/ChatContext';

interface ChatMessageImageProps {
  imageUrl: string;
  companionName: string;
  isBlurred?: boolean;
}

export function ChatMessageImage({ imageUrl, companionName, isBlurred = true }: ChatMessageImageProps) {
  const [clicked, setClicked] = useState(false);
  const { setShowPhotoDialog, setCurrentPhoto } = useChat();
  
  const handleImageClick = () => {
    if (isBlurred) {
      setClicked(true);
      setCurrentPhoto(imageUrl);
      
      // Show payment dialog
      setTimeout(() => {
        setShowPhotoDialog(true);
      }, 300);
    }
  };
  
  return (
    <div className="relative rounded-lg overflow-hidden max-w-[240px]">
      <img
        src={imageUrl}
        alt={`Photo from ${companionName}`}
        className={`w-full h-auto object-cover rounded-lg ${isBlurred ? 'blur-sm' : ''}`}
      />
      
      {isBlurred && !clicked && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/20"
          onClick={handleImageClick}
        >
          <div className="bg-white/80 rounded-full p-3 shadow-lg transform transition-transform hover:scale-110">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-6 w-6 text-primary" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}