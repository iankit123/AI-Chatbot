import { useCallback, useEffect, useRef, useState } from "react";
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
  fetchServerKundliBirth,
  loadStoredKundliBirth,
  migrateKundliBirthAcrossAuthKeys,
  saveServerKundliBirth,
  saveStoredKundliBirth,
  type StoredKundliBirthDetails,
} from "@/lib/kundliBirthStorage";

const ROLE_NAME = "Kundli Bhavishya Checker";
const ROLE_ICON = "/images/kundali-card.png";
const KUNDLI_ID = "kundli";

export default function KundliChat() {
  const {
    messages,
    startFreshChat,
    seedConversation,
    setUserProfile,
    currentLanguage,
  } = useChat();

  const [, setLocation] = useLocation();
  const [showBirthForm, setShowBirthForm] = useState(true);
  const introSeededRef = useRef(false);
  const hydratedRef = useRef(false);

  const applyBirthDetails = useCallback(
    (data: StoredKundliBirthDetails, options?: { seedIntroIfEmpty?: boolean }) => {
      saveStoredKundliBirth(data);
      void saveServerKundliBirth(data);

      const profile = { name: data.name, age: "" };
      setUserProfile(profile);
      localStorage.setItem("guestProfile", JSON.stringify(profile));

      setShowBirthForm(false);

      if (options?.seedIntroIfEmpty === false) return;

      const kundliMsgs = messages.filter(
        (m) => !m.companionId || m.companionId === KUNDLI_ID,
      );
      if (kundliMsgs.length === 0 && !introSeededRef.current) {
        seedConversation(buildKundliIntroMessages(data, currentLanguage));
        introSeededRef.current = true;
      }
    },
    [currentLanguage, messages, seedConversation, setUserProfile],
  );

  const hydrateBirthDetails = useCallback(async () => {
    migrateKundliBirthAcrossAuthKeys();

    let saved = loadStoredKundliBirth();
    if (!saved) {
      const remote = await fetchServerKundliBirth();
      if (remote) {
        saveStoredKundliBirth(remote);
        saved = remote;
      }
    }

    if (saved) {
      applyBirthDetails(saved, { seedIntroIfEmpty: true });
    } else {
      setShowBirthForm(true);
      if (!hydratedRef.current) {
        startFreshChat();
      }
    }
    hydratedRef.current = true;
  }, [applyBirthDetails, startFreshChat]);

  useEffect(() => {
    localStorage.setItem(
      "selectedCompanion",
      JSON.stringify({
        id: KUNDLI_ID,
        name: ROLE_NAME,
        avatar: ROLE_ICON,
      }),
    );
    window.dispatchEvent(new Event("companion-selected"));

    void hydrateBirthDetails();
  }, [hydrateBirthDetails]);

  useEffect(() => {
    const onAuth = () => {
      void hydrateBirthDetails();
    };
    window.addEventListener("local-storage-auth", onAuth);
    return () => window.removeEventListener("local-storage-auth", onAuth);
  }, [hydrateBirthDetails]);

  const handleBirthSubmit = (data: KundliBirthFormPayload) => {
    introSeededRef.current = true;
    applyBirthDetails(data, { seedIntroIfEmpty: true });
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
        initialValues={loadStoredKundliBirth()}
      />
    </div>
  );
}
