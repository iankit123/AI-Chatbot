import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import type { KundliBirthFormPayload } from "@/components/KundliBirthDetailsDialog";
import { Header } from "@/components/Header";
import { ChatArea } from "@/components/ChatArea";
import { ChatInput } from "@/components/ChatInput";
import { BottomNav } from "@/components/BottomNav";
import { KundliBirthDetailsDialog } from "@/components/KundliBirthDetailsDialog";
import { useChat } from "@/context/ChatContext";
import { buildKundliIntroMessages } from "@/lib/buildKundliIntroMessages";
import {
  loadStoredKundliBirth,
  saveStoredKundliBirth,
} from "@/lib/kundliBirthStorage";

const ROLE_NAME = "Kundli Bhavishya Checker";
const ROLE_ICON = "🔮";

export default function KundliChat() {
  const {
    startFreshChat,
    seedConversation,
    setUserProfile,
    currentLanguage,
  } = useChat();

  const [, setLocation] = useLocation();

  const [showBirthForm, setShowBirthForm] = useState(
    () => loadStoredKundliBirth() === null,
  );

  useEffect(() => {
    localStorage.setItem(
      "selectedCompanion",
      JSON.stringify({
        id: "kundli",
        name: ROLE_NAME,
        avatar: ROLE_ICON,
      }),
    );

    const saved = loadStoredKundliBirth();
    if (!saved) {
      startFreshChat();
    }

    window.dispatchEvent(new Event("companion-selected"));
  }, [startFreshChat]);

  useEffect(() => {
    const saved = loadStoredKundliBirth();
    if (!saved) return;
    const profile = { name: saved.name, age: "" };
    setUserProfile(profile);
    localStorage.setItem("guestProfile", JSON.stringify(profile));
  }, [setUserProfile]);

  const handleBirthSubmit = (data: KundliBirthFormPayload) => {
    saveStoredKundliBirth(data);

    const profile = { name: data.name, age: "" };
    setUserProfile(profile);
    localStorage.setItem("guestProfile", JSON.stringify(profile));

    seedConversation(buildKundliIntroMessages(data, currentLanguage));
    setShowBirthForm(false);
  };

  return (
    <div className="flex min-h-0 h-screen max-h-screen flex-col overflow-hidden chat-page bg-[#e5ddd5]">
      <Header />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#e5ddd5]">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          <ChatArea />
        </div>
        <div className="fixed bottom-[60px] left-0 right-0 z-10 shrink-0">
          <ChatInput />
        </div>
      </div>

      <BottomNav />

      <KundliBirthDetailsDialog
        open={showBirthForm}
        onSubmit={handleBirthSubmit}
        onCancel={() => setLocation("/")}
      />
    </div>
  );
}
