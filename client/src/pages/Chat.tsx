import { Header } from '@/components/Header';
import { ChatArea } from '@/components/ChatArea';
import { ChatInput } from '@/components/ChatInput';

export default function Chat() {
  return (
    <div className="flex flex-col h-screen chat-page">
      <Header />
      <ChatArea />
      <ChatInput />
    </div>
  );
}
