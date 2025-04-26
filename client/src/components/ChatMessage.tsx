import { Message } from '@shared/schema';
import { formatTime } from '@/lib/dates';

interface ChatMessageProps {
  message: Message;
  botAvatar: string;
}

export function ChatMessage({ message, botAvatar }: ChatMessageProps) {
  const isBot = message.role === 'assistant';
  
  if (isBot) {
    return (
      <div className="flex items-start mb-4">
        <div className="w-8 h-8 rounded-full bg-white overflow-hidden flex-shrink-0 mr-2">
          <img 
            src={botAvatar} 
            alt="Virtual companion avatar"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-[80%] bg-partner rounded-2xl rounded-tl-none px-4 py-2 chat-bubble-left shadow-sm">
          <p className="text-neutral-900">{message.content}</p>
          <span className="text-[10px] text-neutral-700 block text-right mt-1">
            {formatTime(message.timestamp)}
          </span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex items-start mb-4 justify-end">
      <div className="relative max-w-[80%] bg-user rounded-2xl rounded-tr-none px-4 py-2 chat-bubble-right shadow-sm">
        <p className="text-neutral-900">{message.content}</p>
        <span className="text-[10px] text-neutral-700 block text-right mt-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}
