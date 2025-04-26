interface TypingIndicatorProps {
  botAvatar: string;
}

export function TypingIndicator({ botAvatar }: TypingIndicatorProps) {
  return (
    <div className="flex items-start mb-4">
      <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0 mr-2">
        <img 
          src={botAvatar} 
          alt="Virtual companion avatar"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="relative max-w-[80%] bg-partner rounded-2xl rounded-tl-none px-4 py-3 chat-bubble-left shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-neutral-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
