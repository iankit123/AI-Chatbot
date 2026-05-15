import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
  auth,
  getUserProfile,
  isSignedInLocally,
  isUserRegisteredLocally,
  signOutUser,
} from "@/lib/supabase";
import { useChat } from "@/context/ChatContext";
import { isHomeAssistantCardVisible } from "@/lib/experiments";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, LogOut, MessageCircle, User, Wallet, Zap } from "lucide-react";
import { ProfileDialog } from "@/components/ProfileDialog";
import { LegalFooter } from "@/components/LegalFooter";
import { HomeRoleCard } from "@/components/HomeRoleCard";
import { HOME_ROLE_CARDS } from "@/lib/homeRoleCards";
import { getRoleCardPresentation } from "@/lib/homeRoleCardPresentation";
import { firstNameOnly } from "@shared/userName";

/** Title-case a full name for display (each word: Ankit Goyal). */
function capitalizeDisplayName(full: string): string {
  const t = full.trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}


function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? d : "—";
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { currentLanguage, setLanguage, setShowRechargeDialog } = useChat();
  const [userName, setUserName] = useState<string>("");
  const [userPhoto, setUserPhoto] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string>("");
  const [walletDisplayBalance, setWalletDisplayBalance] = useState<number>(0);
  const [walletMenuCredits, setWalletMenuCredits] = useState<number>(0);
  const [userRegistered, setUserRegistered] = useState(isUserRegisteredLocally);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  const refreshWalletBalance = async () => {
    const { fetchBillingWallet } = await import("@/lib/billing");
    const wallet = await fetchBillingWallet();
    setWalletDisplayBalance(wallet?.display_balance ?? 0);
    setWalletMenuCredits(
      wallet?.has_any_recharge ? wallet.chat_balance : 0,
    );
  };

  useEffect(() => {
    const refreshSignedIn = () => setUserRegistered(isUserRegisteredLocally());
    window.addEventListener("local-storage-auth", refreshSignedIn);
    window.addEventListener("wallet-credits-updated", refreshWalletBalance);
    return () => {
      window.removeEventListener("local-storage-auth", refreshSignedIn);
      window.removeEventListener("wallet-credits-updated", refreshWalletBalance);
    };
  }, []);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        let name = "";
        let photo = "";
        let phone = "";

        const registered = isUserRegisteredLocally();
        setUserRegistered(registered);
        try {
          await refreshWalletBalance();
        } catch {
          setWalletDisplayBalance(0);
          setWalletMenuCredits(0);
        }

        // Name/phone in header only when signed in (not from chat-only guestProfile name).
        if (registered || isSignedInLocally()) {
          if (auth.currentUser) {
            try {
              const profile = await getUserProfile(auth.currentUser.uid);
              if (profile?.name) {
                name = profile.name;
              }
              if (auth.currentUser.photoURL) {
                photo = auth.currentUser.photoURL;
              }
            } catch {
              console.log("Could not load user profile from Supabase");
            }
          }

          const guestProfile = localStorage.getItem("guestProfile");
          if (guestProfile) {
            try {
              const parsed = JSON.parse(guestProfile) as {
                name?: string;
                phone?: string;
              };
              if (!name && parsed.name) name = parsed.name;
              if (parsed.phone) phone = String(parsed.phone);
            } catch (e) {
              console.error("Error parsing guest profile:", e);
            }
          }
        }

        setUserName(name);
        setUserPhoto(photo);
        setUserPhone(phone);
      } catch (error) {
        console.error("Error loading user info:", error);
      }
    };

    loadUserInfo();
    const onRefresh = () => loadUserInfo();
    window.addEventListener("local-storage-auth", onRefresh);
    return () => window.removeEventListener("local-storage-auth", onRefresh);
  }, []);

  const handleProfileLogout = async () => {
    await signOutUser().catch(() => {
      auth.currentUser = null;
      localStorage.removeItem("authUser");
    });
    localStorage.removeItem("guestProfile");
    window.dispatchEvent(new Event("local-storage-auth"));
    setUserRegistered(false);
    setUserName("");
    setUserPhoto("");
    setUserPhone("");
  };

  const supportHref =
    (typeof import.meta.env.VITE_SUPPORT_MAILTO === "string" &&
      import.meta.env.VITE_SUPPORT_MAILTO.trim()) ||
    "mailto:support@example.com?subject=Help";

  const handleRoleSelect = (route: string) => {
    setLocation(route);
  };

  const uiText =
    currentLanguage === "hindi"
      ? {
          welcomeBack: "वापस स्वागत है",
          welcomeGuest: "स्वागत है",
          guestLabel: "मेहमान",
          subtitle: "शुरू करने के लिए एक असिस्टेंट चुनिए",
          profileMenuRemainingCredits: "बचे हुए क्रेडिट",
          profileMenuBuyCredits: "क्रेडिट खरीदें",
          profileMenuMessageUs: "Message Us",
          profileMenuLogOut: "लॉग आउट",
        }
      : {
          welcomeBack: "Welcome back",
          welcomeGuest: "Welcome",
          guestLabel: "Guest",
          subtitle: "Choose an assistant to get started",
          profileMenuRemainingCredits: "Remaining credits",
          profileMenuBuyCredits: "Buy credits",
          profileMenuMessageUs: "Message Us",
          profileMenuLogOut: "Log out",
        };

  const headerGreeting = userRegistered
    ? { line1: uiText.welcomeBack, line2: firstNameOnly(userName) || "User" }
    : { line1: uiText.welcomeGuest, line2: uiText.guestLabel };
  const headerAvatarLetter = userRegistered
    ? (firstNameOnly(userName) || "").charAt(0).toUpperCase() || "U"
    : null;

  const visibleRoles = HOME_ROLE_CARDS.filter((role) =>
    isHomeAssistantCardVisible(role.id),
  );

  const headerAvatarEl = userPhoto ? (
    <img
      src={userPhoto}
      alt={headerGreeting.line2}
      className="h-9 w-9 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-indigo-100"
    />
  ) : headerAvatarLetter ? (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-sm ring-2 ring-indigo-100">
      <span className="text-xl font-semibold text-white">{headerAvatarLetter}</span>
    </div>
  ) : (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-slate-100 shadow-sm ring-2 ring-indigo-100">
      <User className="h-5 w-5 text-slate-500" aria-hidden />
    </div>
  );

  const headerTextEl = (
    <div className="min-w-0">
      <p className="text-xs font-medium leading-tight text-slate-500">
        {userRegistered ? `${headerGreeting.line1},` : headerGreeting.line1}
      </p>
      <h2 className="truncate text-lg font-bold leading-tight text-slate-900">{headerGreeting.line2}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-20">
      <div className="relative h-[250px] overflow-hidden bg-[#f7f7fb] px-4 pt-2.5">
        <img
          src="/images/home-hero-characters.png"
          alt="AI Assistants"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center select-none"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white via-white/75 to-transparent" />

        {/* Welcome Section */}
        <div className="relative z-20 mb-2 flex items-start justify-between gap-2">
          {userRegistered ? (
            <DropdownMenu
              onOpenChange={(menuOpen) => {
                if (menuOpen) void refreshWalletBalance();
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 max-w-[calc(100%-7rem)] items-center gap-2.5 rounded-xl py-0.5 pl-0.5 pr-2 text-left outline-none ring-offset-2 ring-offset-transparent transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {headerAvatarEl}
                  {headerTextEl}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="z-[100] w-[min(calc(100vw-2rem),18rem)] p-0 shadow-lg"
              >
                <div className="border-b border-border px-4 py-3">
                  <p className="font-semibold text-slate-900">{capitalizeDisplayName(userName) || "User"}</p>
                  <p className="text-sm text-slate-500 tabular-nums">{formatPhoneDisplay(userPhone)}</p>
                </div>
                <div className="px-1 py-1">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <CreditCard className="h-5 w-5 shrink-0 text-pink-600" aria-hidden />
                    <span className="flex-1 text-sm text-slate-900">{uiText.profileMenuRemainingCredits}</span>
                    <span className="text-sm font-bold tabular-nums text-pink-600">
                      {walletMenuCredits}
                    </span>
                  </div>
                  <DropdownMenuSeparator className="my-0" />
                  <DropdownMenuItem
                    className="gap-3 py-2.5 text-pink-600 focus:text-pink-600 cursor-pointer"
                    onSelect={() => setShowRechargeDialog(true)}
                  >
                    <Zap className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{uiText.profileMenuBuyCredits}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0" />
                  <DropdownMenuItem
                    className="gap-3 py-2.5 cursor-pointer"
                    onSelect={() => {
                      window.location.href = supportHref;
                    }}
                  >
                    <MessageCircle className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{uiText.profileMenuMessageUs}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-0" />
                  <DropdownMenuItem
                    className="gap-3 py-2.5 text-slate-600 focus:text-slate-600 cursor-pointer"
                    onSelect={() => void handleProfileLogout()}
                  >
                    <LogOut className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{uiText.profileMenuLogOut}</span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              type="button"
              onClick={() => setHeaderProfileOpen(true)}
              className="flex min-w-0 max-w-[calc(100%-7rem)] cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl py-0.5 pl-0.5 pr-2 text-left outline-none ring-offset-2 ring-offset-transparent transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-indigo-400 active:opacity-90"
              aria-label={currentLanguage === "hindi" ? "खाता खोलें" : "Open account"}
            >
              {headerAvatarEl}
              {headerTextEl}
            </button>
          )}
          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center rounded-xl border border-white/70 bg-white/90 p-0.5 shadow-sm backdrop-blur">
              <button
                type="button"
                onClick={() => setLanguage("hindi")}
                className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  currentLanguage === "hindi"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                हिंदी
              </button>
              <button
                type="button"
                onClick={() => setLanguage("english")}
                className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold transition ${
                  currentLanguage === "english"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500"
                }`}
              >
                English
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowRechargeDialog(true)}
              className="flex h-8 min-w-[3.25rem] items-center justify-center gap-1 rounded-xl bg-white/95 px-2 text-slate-700 shadow-sm backdrop-blur"
              aria-label={currentLanguage === "hindi" ? "वॉलेट बैलेंस" : "Wallet balance"}
            >
              <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="text-xs font-semibold tabular-nums">₹{walletDisplayBalance}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="relative -mt-8 rounded-t-[30px] bg-white px-4">
        {/* Header Section */}
        <div className="mb-7">
          <h3 className="text-[24px] font-bold leading-[1.12] tracking-tight text-slate-900">
            {currentLanguage === "hindi" ? (
              <>
                आज हम आपकी{" "}
                <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                  कैसे मदद
                </span>{" "}
                करें?
              </>
            ) : (
              <>
                How can we{" "}
                <span className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 bg-clip-text text-transparent">
                  help you
                </span>{" "}
                today?
              </>
            )}
          </h3>
          <p className="mt-2 text-sm text-slate-500">{uiText.subtitle}</p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visibleRoles.map((role) => {
            const p = getRoleCardPresentation(currentLanguage, role.id);
            return (
              <HomeRoleCard
                key={role.id}
                roleId={role.id}
                image={role.image}
                badge={p.badge}
                overlayTitle={p.overlayTitle}
                description={p.description}
                ctaClass={role.ctaClass}
                badgeTone={role.badgeTone}
                startChatLabel={p.startChat}
                onClick={() => handleRoleSelect(role.route)}
              />
            );
          })}
        </div>
      </div>

      <LegalFooter />

      <ProfileDialog open={headerProfileOpen} onOpenChange={setHeaderProfileOpen} />

      <BottomNav />
    </div>
  );
}

