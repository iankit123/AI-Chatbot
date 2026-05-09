import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import {
  auth,
  getUserProfile,
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
import { CreditCard, LogOut, MessageCircle, Wallet, Zap } from "lucide-react";
import { ProfileDialog } from "@/components/ProfileDialog";
import { LegalFooter } from "@/components/LegalFooter";

/** Title-case a full name for display (each word: Ankit Goyal). */
function capitalizeDisplayName(full: string): string {
  const t = full.trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

function firstNameOnly(full: string): string {
  const t = full.trim();
  if (!t) return "";
  const word = t.split(/\s+/)[0];
  return word ? capitalizeDisplayName(word) : "";
}

function formatPhoneDisplay(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(-10);
  return d.length === 10 ? d : "—";
}

interface RoleCard {
  id: string;
  title: string;
  description: string;
  route: string;
  gradient: string;
  image: string;
  badgeTone: "emerald" | "violet" | "pink" | "amber" | "teal" | "indigo" | "blue" | "orange";
  ctaClass: string;
}

const roles: RoleCard[] = [
  {
    id: "doctor",
    title: "Personal Doctor AI",
    description: "24/7 health guidance",
    route: "/doctor",
    gradient: "from-cyan-500 to-teal-600",
    image: "/images/doctor-card.png",
    badgeTone: "emerald",
    ctaClass: "bg-slate-950",
  },
  {
    id: "kundli",
    title: "Kundli Bhavishya Checker",
    description: "Astrology insights",
    route: "/kundli",
    gradient: "from-purple-500 to-pink-600",
    image: "/images/kundali-card.png",
    badgeTone: "violet",
    ctaClass: "bg-gradient-to-r from-violet-600 to-fuchsia-600",
  },
  {
    id: "parenting",
    title: "Parenting and Baby Care Assistant",
    description: "Expert parenting tips",
    route: "/parenting",
    gradient: "from-pink-500 to-rose-600",
    image: "/images/parenting-card.png",
    badgeTone: "amber",
    ctaClass: "bg-gradient-to-r from-orange-500 to-amber-500",
  },
  {
    id: "finance",
    title: "Personal Finance Help",
    description: "Money management guidance",
    route: "/finance",
    gradient: "from-green-500 to-emerald-600",
    image: "/images/finance-card.png",
    badgeTone: "teal",
    ctaClass: "bg-gradient-to-r from-teal-600 to-emerald-600",
  },
  {
    id: "career",
    title: "Career and Job Helper",
    description: "Career planning & growth",
    route: "/career",
    gradient: "from-orange-500 to-amber-600",
    image: "/images/career-card.png",
    badgeTone: "indigo",
    ctaClass: "bg-gradient-to-r from-indigo-600 to-blue-600",
  },
  {
    id: "relationship",
    title: "Relationship Coach",
    description: "Emotional support & connection",
    route: "/relationship-coach",
    gradient: "from-rose-500 to-red-600",
    image: "/images/relationship-card.png",
    badgeTone: "pink",
    ctaClass: "bg-gradient-to-r from-pink-500 to-rose-500",
  },
  {
    id: "krishna",
    title: "Krishna",
    description: "Spiritual guidance and life wisdom",
    route: "/krishna",
    gradient: "from-blue-500 to-indigo-600",
    image: "/images/krishna-card.png",
    badgeTone: "blue",
    ctaClass: "bg-gradient-to-r from-blue-600 to-indigo-600",
  },
  {
    id: "english",
    title: "Learn English",
    description: "Practice speaking and grammar",
    route: "/english",
    gradient: "from-orange-500 to-amber-600",
    image: "/images/english-card.png",
    badgeTone: "orange",
    ctaClass: "bg-gradient-to-r from-orange-500 to-amber-500",
  }
];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { currentLanguage, setLanguage, setShowRechargeDialog } = useChat();
  const [userName, setUserName] = useState<string>("");
  const [userPhoto, setUserPhoto] = useState<string>("");
  const [userPhone, setUserPhone] = useState<string>("");
  const [walletCredits, setWalletCredits] = useState<number>(0);
  const [userRegistered, setUserRegistered] = useState(isUserRegisteredLocally);
  const [headerProfileOpen, setHeaderProfileOpen] = useState(false);

  useEffect(() => {
    const refreshSignedIn = () => setUserRegistered(isUserRegisteredLocally());
    window.addEventListener("local-storage-auth", refreshSignedIn);
    return () => window.removeEventListener("local-storage-auth", refreshSignedIn);
  }, []);

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        let name = "";
        let photo = "";
        let phone = "";

        setUserRegistered(isUserRegisteredLocally());
        try {
          setWalletCredits(Number(localStorage.getItem("wallet_credits") || "0"));
        } catch {
          setWalletCredits(0);
        }

        // Check for authenticated user first
        if (auth.currentUser) {
          try {
            const profile = await getUserProfile(auth.currentUser.uid);
            if (profile?.name) {
              name = profile.name;
            }
            if (auth.currentUser.photoURL) {
              photo = auth.currentUser.photoURL;
            }
          } catch (error) {
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
          title: "फ्री चैट असिस्टेंट्स",
          subtitle: "शुरू करने के लिए एक असिस्टेंट चुनिए",
          doctorTitle: "पर्सनल डॉक्टर AI",
          doctorDescription: "24/7 हेल्थ गाइडेंस",
          kundliTitle: "कुंडली भविष्य चेकर",
          kundliDescription: "ज्योतिष से जुड़ी जानकारी",
          parentingTitle: "पेरेंटिंग और बेबी केयर असिस्टेंट",
          parentingDescription: "एक्सपर्ट पेरेंटिंग टिप्स",
          financeTitle: "पर्सनल फाइनेंस हेल्प",
          financeDescription: "पैसों को बेहतर संभालने की सलाह",
          careerTitle: "करियर और जॉब हेल्पर",
          careerDescription: "करियर प्लानिंग और ग्रोथ",
          relationshipTitle: "रिलेशनशिप कोच",
          relationshipDescription: "इमोशनल सपोर्ट और कनेक्शन",
          krishnaTitle: "कृष्ण से बात करें",
          krishnaDescription: "आध्यात्मिक मार्गदर्शन और जीवन की सीख",
          englishTitle: "अंग्रेजी सीखें",
          englishDescription: "स्पीकिंग और ग्रामर की प्रैक्टिस",
          doctorOverlayTitle: "डॉक्टर से बात करें",
          kundliOverlayTitle: "कुंडली से भविष्य देखें",
          parentingOverlayTitle: "बेबी केयर सलाह लें",
          financeOverlayTitle: "फाइनेंस मदद पाएं",
          careerOverlayTitle: "करियर गाइडेंस लें",
          relationshipOverlayTitle: "रिलेशनशिप कोच से बात करें",
          krishnaOverlayTitle: "कृष्ण से मार्गदर्शन लें",
          englishOverlayTitle: "अंग्रेजी सीखें",
          overlaySubtitle: "24/7 आपके लिए उपलब्ध",
          doctorBadge: "24/7 उपलब्ध",
          kundliBadge: "विश्वसनीय मार्गदर्शन",
          parentingBadge: "पेरेंटिंग टिप्स",
          financeBadge: "स्मार्ट मनी सलाह",
          careerBadge: "करियर ग्रोथ",
          relationshipBadge: "इमोशनल सपोर्ट",
          krishnaBadge: "आध्यात्मिक ज्ञान",
          englishBadge: "इंग्लिश प्रैक्टिस",
          startChat: "चैट शुरू करें",
          profileMenuRemainingCredits: "बचे हुए क्रेडिट",
          profileMenuBuyCredits: "क्रेडिट खरीदें",
          profileMenuMessageUs: "Message Us",
          profileMenuLogOut: "लॉग आउट",
        }
      : {
          welcomeBack: "Welcome back",
          title: "Free Chat Assistants",
          subtitle: "Choose an assistant to get started",
          doctorTitle: "Personal Doctor AI",
          doctorDescription: "24/7 health guidance",
          kundliTitle: "Kundli Bhavishya Checker",
          kundliDescription: "Astrology insights",
          parentingTitle: "Parenting and Baby Care Assistant",
          parentingDescription: "Expert parenting tips",
          financeTitle: "Personal Finance Help",
          financeDescription: "Money management guidance",
          careerTitle: "Career and Job Helper",
          careerDescription: "Career planning & growth",
          relationshipTitle: "Relationship Coach",
          relationshipDescription: "Emotional support & connection",
          krishnaTitle: "Krishna",
          krishnaDescription: "Spiritual guidance and life wisdom",
          englishTitle: "Learn English",
          englishDescription: "Practice speaking and grammar",
          doctorOverlayTitle: "Chat with Personal Doctor",
          kundliOverlayTitle: "Check Bhavishya from Kundali",
          parentingOverlayTitle: "Get Baby Care Guidance",
          financeOverlayTitle: "Plan Your Money Better",
          careerOverlayTitle: "Grow Your Career",
          relationshipOverlayTitle: "Talk to Relationship Coach",
          krishnaOverlayTitle: "Chat with Krishna",
          englishOverlayTitle: "Learn English",
          overlaySubtitle: "Available for you 24/7",
          doctorBadge: "24/7 AVAILABLE",
          kundliBadge: "RELIABLE GUIDANCE",
          parentingBadge: "PARENTING TIPS",
          financeBadge: "SMART MONEY HELP",
          careerBadge: "CAREER GROWTH",
          relationshipBadge: "EMOTIONAL SUPPORT",
          krishnaBadge: "SPIRITUAL WISDOM",
          englishBadge: "ENGLISH PRACTICE",
          startChat: "Start Chat",
          profileMenuRemainingCredits: "Remaining credits",
          profileMenuBuyCredits: "Buy credits",
          profileMenuMessageUs: "Message Us",
          profileMenuLogOut: "Log out",
        };

  const localizedRoleCopy: Record<string, { title: string; description: string }> = {
    doctor: { title: uiText.doctorTitle, description: uiText.doctorDescription },
    kundli: { title: uiText.kundliTitle, description: uiText.kundliDescription },
    parenting: { title: uiText.parentingTitle, description: uiText.parentingDescription },
    finance: { title: uiText.financeTitle, description: uiText.financeDescription },
    career: { title: uiText.careerTitle, description: uiText.careerDescription },
    relationship: { title: uiText.relationshipTitle, description: uiText.relationshipDescription },
    krishna: { title: uiText.krishnaTitle, description: uiText.krishnaDescription },
    english: { title: uiText.englishTitle, description: uiText.englishDescription },
  };

  const roleCardText: Record<string, { title: string; badge: string }> = {
    doctor: { title: uiText.doctorOverlayTitle, badge: uiText.doctorBadge },
    kundli: { title: uiText.kundliOverlayTitle, badge: uiText.kundliBadge },
    parenting: { title: uiText.parentingOverlayTitle, badge: uiText.parentingBadge },
    finance: { title: uiText.financeOverlayTitle, badge: uiText.financeBadge },
    career: { title: uiText.careerOverlayTitle, badge: uiText.careerBadge },
    relationship: { title: uiText.relationshipOverlayTitle, badge: uiText.relationshipBadge },
    krishna: { title: uiText.krishnaOverlayTitle, badge: uiText.krishnaBadge },
    english: { title: uiText.englishOverlayTitle, badge: uiText.englishBadge },
  };

  const badgeToneClass: Record<RoleCard["badgeTone"], string> = {
    emerald: "text-emerald-600",
    violet: "text-violet-600",
    pink: "text-pink-600",
    amber: "text-amber-600",
    teal: "text-teal-600",
    indigo: "text-indigo-600",
    blue: "text-blue-600",
    orange: "text-orange-600",
  };

  const visibleRoles = roles.filter((role) => isHomeAssistantCardVisible(role.id));

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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex min-w-0 max-w-[calc(100%-7rem)] items-center gap-2.5 rounded-xl py-0.5 pl-0.5 pr-2 text-left outline-none ring-offset-2 ring-offset-transparent transition hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-indigo-400"
                >
                  {userPhoto ? (
                    <img
                      src={userPhoto}
                      alt={firstNameOnly(userName) || "User"}
                      className="h-9 w-9 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-indigo-100"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-sm ring-2 ring-indigo-100">
                      <span className="text-xl font-semibold text-white">
                        {(userName ? firstNameOnly(userName) : "").charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-tight text-slate-500">{uiText.welcomeBack},</p>
                    <h2 className="truncate text-lg font-bold leading-tight text-slate-900">
                      {firstNameOnly(userName) || "User"}
                    </h2>
                  </div>
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
                    <span className="text-sm font-bold tabular-nums text-pink-600">{walletCredits}</span>
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
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={firstNameOnly(userName) || "User"}
                  className="h-9 w-9 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-2 ring-indigo-100"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-sm ring-2 ring-indigo-100">
                  <span className="text-xl font-semibold text-white">
                    {(userName ? firstNameOnly(userName) : "").charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight text-slate-500">{uiText.welcomeBack},</p>
                <h2 className="truncate text-lg font-bold leading-tight text-slate-900">
                  {firstNameOnly(userName) || "User"}
                </h2>
              </div>
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
              <span className="text-xs font-semibold tabular-nums">₹{walletCredits}</span>
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
            const roleDescription = localizedRoleCopy[role.id]?.description || role.description;
            const cardText = roleCardText[role.id];

            return (
              <button
                key={role.id}
                type="button"
                onClick={() => handleRoleSelect(role.route)}
                className="group relative block w-full overflow-hidden rounded-3xl text-left shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all duration-300 hover:scale-[1.01] hover:shadow-[0_12px_30px_rgba(15,23,42,0.12)]"
              >
                <img
                  src={role.image}
                  alt={cardText.title}
                  className="block h-[190px] w-full rounded-3xl object-cover object-center"
                />
                <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-white/95 via-white/82 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 left-0 flex w-[62%] flex-col justify-center px-5">
                  <div
                    className={`mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/75 px-3 py-1 text-[10px] font-bold uppercase tracking-wide shadow-sm ${badgeToneClass[role.badgeTone]}`}
                  >
                    {role.id === "doctor" ? (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    ) : (
                      <span className="text-[10px] leading-none">★</span>
                    )}
                    {cardText.badge}
                  </div>
                  <h3 className="mb-2 text-[20px] font-bold leading-[1.08] tracking-tight text-slate-950">
                    {cardText.title}
                  </h3>
                  <p className="mb-4 text-[13px] font-medium leading-snug text-slate-500">
                    {roleDescription}
                  </p>
                  <span
                    className={`inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md ${role.ctaClass}`}
                  >
                    {uiText.startChat}
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M5 12h14m-6-6 6 6-6 6" />
                    </svg>
                  </span>
                </div>
              </button>
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

