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
  const { setShowPaymentDialog, setCurrentPhoto } = useChat();
  
  console.log("=== ChatMessageImage Debug ===");
  console.log("Props:", {
    imageUrl,
    companionName,
    isBlurred
  });
  
  // Verify the image URL before showing
  useEffect(() => {
    console.log("Starting image verification for:", imageUrl);
    
    if (!imageUrl || imageUrl === 'undefined') {
      console.log("Invalid image URL detected");
      setImageError(true);
      return;
    }

    // Ensure URL starts with / for relative paths
    const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    
    // Try to load the image
    const img = new Image();
    img.onload = () => {
      console.log("Image loaded successfully:", normalizedUrl);
      setImageError(false);
    };
    img.onerror = () => {
      console.error("Error loading image:", normalizedUrl);
      // Try fallback image path if it's a premium photo
      if (isBlurred && normalizedUrl.includes('/premium/')) {
        const fallbackUrl = '/images/companions/default-premium.jpg';
        console.log("Trying fallback image:", fallbackUrl);
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          console.log("Fallback image loaded successfully");
          setImageError(false);
        };
        fallbackImg.onerror = () => {
          console.error("Fallback image also failed to load");
          setImageError(true);
        };
        fallbackImg.src = fallbackUrl;
      } else {
        setImageError(true);
      }
    };
    img.src = normalizedUrl;
    console.log("Image load attempt initiated");
    
    // During development, show images regardless of loading status
    if (process.env.NODE_ENV === 'development') {
      console.log("Development mode: forcing image to show");
      setImageError(false);
    }
  }, [imageUrl, isBlurred]);
  
  // Handle image click to open premium dialog
  const handleImageClick = () => {
    if (isBlurred) {
      console.log("Premium image clicked, preparing to show dialog");
      console.log("Setting current photo:", imageUrl);
      setCurrentPhoto(imageUrl);
      
      // Show payment dialog immediately
      setShowPaymentDialog(true);
      console.log("Opening premium photo payment dialog");
    }
  };
  
  // Don't render if image URL is invalid
  if (imageError && process.env.NODE_ENV !== 'development') {
    console.log("Image error detected, not rendering");
    return null;
  }
  
  console.log("Rendering image component with state:", {
    imageError,
    isBlurred,
    isDevelopment: process.env.NODE_ENV === 'development'
  });
  console.log("=== End ChatMessageImage Debug ===");
  
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