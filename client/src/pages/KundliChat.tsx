import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { ChatArea } from "@/components/ChatArea";
import { ChatInput } from "@/components/ChatInput";
import { ChatShell } from "@/components/ChatShell";
import { BottomNav } from "@/components/BottomNav";
import {
  KundliBirthDetailsDialog,
  type KundliBirthFormPayload,
} from "@/components/KundliBirthDetailsDialog";
import { useChat } from "@/context/ChatContext";
import { buildKundliIntroMessages } from "@/lib/buildKundliIntroMessages";
import { formatKundliDob, formatKundliTob } from "@/lib/kundliBirthFormat";
import {
  fetchKundliChartSummary,
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
    historyLoadedFor,
  } = useChat();

  const [, setLocation] = useLocation();
  const [details, setDetails] = useState<StoredKundliBirthDetails | null>(null);
  const [showBirthForm, setShowBirthForm] = useState(false);
  /** Set when the form was just submitted: the details and welcome are shown even mid-chat. */
  const announceDetailsRef = useRef(false);
  const introBusyRef = useRef(false);
  const hydratedRef = useRef(false);

  const applyBirthDetails = useCallback(
    (data: StoredKundliBirthDetails) => {
      saveStoredKundliBirth(data);
      void saveServerKundliBirth(data);

      const profile = { name: data.name, age: "" };
      setUserProfile(profile);
      localStorage.setItem("guestProfile", JSON.stringify(profile));

      setDetails(data);
      setShowBirthForm(false);
    },
    [setUserProfile],
  );

  // Show the birth details and the astrologer's welcome: right after the form is
  // submitted, or when the chat is empty. Waits for saved history to load first, so an
  // existing conversation is never mistaken for an empty one.
  useEffect(() => {
    if (!details || historyLoadedFor !== KUNDLI_ID || introBusyRef.current) return;
    const hasKundliMessages = messages.some(
      (m) => !m.companionId || m.companionId === KUNDLI_ID,
    );
    if (!announceDetailsRef.current && hasKundliMessages) return;

    announceDetailsRef.current = false;
    introBusyRef.current = true;
    void (async () => {
      const summary = await fetchKundliChartSummary(details);
      let saved = details;
      // Keep the found location, so the server need not look the place up on every message.
      if (summary?.place && (details.lat !== summary.place.lat || details.lon !== summary.place.lon)) {
        saved = { ...details, lat: summary.place.lat, lon: summary.place.lon };
        saveStoredKundliBirth(saved);
        void saveServerKundliBirth(saved);
        setDetails(saved);
      }
      seedConversation(buildKundliIntroMessages(saved, summary, currentLanguage));
      introBusyRef.current = false;
    })();
  }, [details, historyLoadedFor, messages, seedConversation, currentLanguage]);

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
      applyBirthDetails(saved);
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
    announceDetailsRef.current = true;
    applyBirthDetails(data);
  };

  const handleFormCancel = () => {
    // Changing existing details: just close. First visit: nothing to chat with, go home.
    if (details) setShowBirthForm(false);
    else setLocation("/");
  };

  const hindi = currentLanguage === "hindi";

  return (
    <ChatShell>
      <Header />

      {details && (
        <button
          type="button"
          onClick={() => setShowBirthForm(true)}
          className="flex w-full shrink-0 items-center gap-2 border-b border-black/10 bg-white px-3 py-2 text-left"
          aria-label={hindi ? "जन्म की जानकारी बदलें" : "Change birth details"}
        >
          <span className="min-w-0 flex-1 truncate text-[13px] text-neutral-700">
            <span className="font-semibold text-neutral-900">{details.name}</span>
            {" · "}
            {formatKundliDob(details.dateOfBirth, currentLanguage)}
            {details.timeOfBirth ? ` · ${formatKundliTob(details.timeOfBirth, currentLanguage)}` : ""}
            {" · "}
            {details.cityOfBirth}
          </span>
          <span className="shrink-0 rounded-full border border-violet-600 px-3 py-1 text-[13px] font-medium text-violet-700">
            {hindi ? "बदलें" : "Change"}
          </span>
        </button>
      )}

      <div className="relative min-h-0 flex-1">
        <ChatArea />
      </div>
      <div className="shrink-0">
        <ChatInput />
      </div>

      <BottomNav inline />

      <KundliBirthDetailsDialog
        open={showBirthForm}
        onSubmit={handleBirthSubmit}
        onCancel={handleFormCancel}
        initialValues={details}
      />
    </ChatShell>
  );
}
