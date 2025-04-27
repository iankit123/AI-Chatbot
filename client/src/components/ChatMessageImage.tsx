import { useState } from 'react';
import { useChat } from '@/context/ChatContext';
import { Download } from 'lucide-react';

interface ChatMessageImageProps {
  imageUrl: string;
  companionName: string;
  isBlurred?: boolean;
}

export function ChatMessageImage({ imageUrl, companionName, isBlurred = true }: ChatMessageImageProps) {
  const [clicked, setClicked] = useState(false);
  const { setShowPhotoDialog, setCurrentPhoto } = useChat();
  
  // Handle image click to open premium dialog
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
      {/* The image itself - blurred if premium */}
      <img
        src={imageUrl}
        alt={`Photo from ${companionName}`}
        className={`w-full h-auto object-cover rounded-lg ${isBlurred ? 'blur-sm' : ''}`}
      />
      
      {/* Premium image overlay with download button */}
      {isBlurred && !clicked && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30"
          onClick={handleImageClick}
        >
          {/* The download button in the middle of the image */}
          <div className="bg-white/90 rounded-full p-3 shadow-lg transform transition-transform hover:scale-110 flex items-center justify-center">
            <Download className="h-6 w-6 text-rose-500" />
          </div>
        </div>
      )}
    </div>
  );
}