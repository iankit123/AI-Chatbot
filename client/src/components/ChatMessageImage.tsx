import { useState, useEffect } from 'react';
import { useChat } from '@/context/ChatContext';
import { Download, Lock } from 'lucide-react';

interface ChatMessageImageProps {
  imageUrl: string;
  companionName: string;
  isBlurred?: boolean;
}

export function ChatMessageImage({ imageUrl, companionName, isBlurred = true }: ChatMessageImageProps) {
  const [imageError, setImageError] = useState(false);
  const { setShowPhotoDialog, setCurrentPhoto } = useChat();
  
  // Verify the image URL before showing
  useEffect(() => {
    if (!imageUrl || imageUrl === 'undefined') {
      setImageError(true);
      return;
    }
    
    // Try to load the image
    const img = new Image();
    img.onload = () => setImageError(false);
    img.onerror = () => {
      console.error("Error loading image:", imageUrl);
      setImageError(true);
    };
    img.src = imageUrl;
    
    // During development, show images regardless of loading status
    if (process.env.NODE_ENV === 'development') {
      setImageError(false);
    }
  }, [imageUrl]);
  
  // Handle image click to open premium dialog
  const handleImageClick = () => {
    if (isBlurred) {
      // Don't set clicked state to keep showing the lock icon
      console.log("Opening premium dialog for image:", imageUrl);
      setCurrentPhoto(imageUrl);
      
      // Show payment dialog
      setTimeout(() => {
        setShowPhotoDialog(true);
      }, 300);
    }
  };
  
  // Don't render if image URL is invalid
  if (imageError && process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  return (
    <div className="relative rounded-lg overflow-hidden max-w-[240px]">
      {/* The image itself - blurred if premium */}
      <img
        src={imageUrl}
        alt={`Photo from ${companionName}`}
        onError={(e) => {
          // Fallback to show a placeholder image
          if (e.currentTarget.src !== '/images/photo-placeholder.png') {
            e.currentTarget.src = '/images/photo-placeholder.png';
          }
        }}
        className={`w-full h-auto object-cover rounded-lg`}
      />
      
      {/* Premium image overlay with download button - always show for premium photos */}
      {isBlurred && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30"
          onClick={handleImageClick}
        >
          {/* The download button in the middle of the image */}
          <div className="bg-white/90 rounded-full p-3 shadow-lg transform transition-transform hover:scale-110 flex items-center justify-center">
            <Lock className="h-6 w-6 text-rose-500" />
          </div>
          
          {/* Premium label in the corner */}
          <div className="absolute bottom-2 right-2 bg-rose-500 text-white px-2 py-0.5 rounded text-xs font-medium">
            Premium
          </div>
        </div>
      )}
    </div>
  );
}