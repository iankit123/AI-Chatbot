import { useEffect } from "react";
import { useLocation } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { LegalFooter } from "@/components/LegalFooter";
import { useChat } from "@/context/ChatContext";

interface CompanionProfile {
  id: string;
  name: string;
  /** Shown on the title line when Hindi UI is selected (service cards only). */
  nameHindi?: string;
  age?: number;
  description: string;
  descriptionHindi: string;
  imageUrl: string;
  status: "online" | "offline";
  /** If set, primary CTA navigates here instead of opening relationship chat. */
  serviceRoute?: string;
}

const companions: CompanionProfile[] = [
  {
    id: "naina",
    name: "Naina",
    age: 25,
    description:
      "Warm and genuine, loves heartfelt talks and grounding advice",
    descriptionHindi:
      "गर्मजोशी और ईमानदार, दिल की बात और संतुलित सलाह पसंद है",
    imageUrl: "/images/naina.png",
    status: "online",
  },
  {
    id: "priya",
    name: "Priya",
    age: 24,
    description: "Friendly and caring, loves deep conversations",
    descriptionHindi: "दोस्ताना और देखभाल करने वाली, गहरी बातचीत पसंद है",
    imageUrl: "/images/priya.png",
    status: "online",
  },
  {
    id: "ananya",
    name: "Ananya",
    age: 26,
    description: "Playful and flirty, always ready to listen",
    descriptionHindi: "मस्तीभरी और थोड़ी फ्लर्टी, हमेशा सुनने के लिए तैयार",
    imageUrl: "/images/ananya.png",
    status: "online",
  },
  {
    id: "meera",
    name: "Meera",
    age: 23,
    description: "Sweet and understanding, loves to talk about life",
    descriptionHindi: "मीठी और समझदार, जीवन के बारे में बात करना पसंद है",
    imageUrl: "/images/meera.png",
    status: "online",
  },
  {
    id: "riya",
    name: "Riya",
    age: 25,
    description: "Creative and thoughtful, enjoys deep conversations",
    descriptionHindi: "रचनात्मक और विचारशील, गहरी बातचीत में आनंद लेती है",
    imageUrl: "/images/riya.jpg",
    status: "offline",
  },
  {
    id: "neha",
    name: "Neha",
    age: 22,
    description: "Cheerful and supportive, great listener",
    descriptionHindi: "खुशमिजाज और सहायक, अच्छी श्रोता",
    imageUrl: "/images/neha.jpg",
    status: "offline",
  },
];

/** Same card UI as companions; links to role/advisor chats from Home. */
const additionalServiceListings: CompanionProfile[] = [
  {
    id: "kundli",
    name: "Kundli Bhavishya Checker",
    nameHindi: "कुंडली भविष्य चेकर",
    description: "Astrology insights and birth-chart guidance",
    descriptionHindi: "ज्योतिष और जन्म कुंडली पर आधारित मार्गदर्शन",
    imageUrl: "/images/kundali-card.png",
    status: "online",
    serviceRoute: "/kundli",
  },
  {
    id: "english",
    name: "Learn English",
    nameHindi: "अंग्रेज़ी सीखें",
    description: "Practice speaking, grammar, and everyday phrases",
    descriptionHindi: "बोलचाल, व्याकरण और दैनिक वाक्यों का अभ्यास",
    imageUrl: "/images/english-card.png",
    status: "online",
    serviceRoute: "/english",
  },
  {
    id: "doctor",
    name: "Personal Doctor AI",
    nameHindi: "पर्सनल डॉक्टर AI",
    description: "24/7 health guidance and symptom awareness",
    descriptionHindi: "२४/७ स्वास्थ्य संबंधी मार्गदर्शन",
    imageUrl: "/images/doctor-card.png",
    status: "online",
    serviceRoute: "/doctor",
  },
  {
    id: "parenting",
    name: "Parenting and Baby Care Assistant",
    nameHindi: "पेरेंटिंग और बेबी केयर असिस्टेंट",
    description: "Expert parenting tips and baby care support",
    descriptionHindi: "पालन-पोषण और शिशु देखभाल की सलाह",
    imageUrl: "/images/parenting-card.png",
    status: "online",
    serviceRoute: "/parenting",
  },
  {
    id: "finance",
    name: "Personal Finance Help",
    nameHindi: "पर्सनल फाइनेंस हेल्प",
    description: "Money management and budgeting guidance",
    descriptionHindi: "बजट और निवेश की समझदार सलाह",
    imageUrl: "/images/finance-card.png",
    status: "online",
    serviceRoute: "/finance",
  },
  {
    id: "career",
    name: "Career and Job Helper",
    nameHindi: "करियर और जॉब हेल्पर",
    description: "Career planning, interviews, and growth",
    descriptionHindi: "करियर योजना, इंटरव्यू और ग्रोथ",
    imageUrl: "/images/career-card.png",
    status: "online",
    serviceRoute: "/career",
  },
  {
    id: "krishna",
    name: "Krishna",
    nameHindi: "कृष्ण",
    description: "Spiritual guidance and life wisdom",
    descriptionHindi: "आध्यात्मिक मार्गदर्शन और जीवन दृष्टि",
    imageUrl: "/images/krishna-card.png",
    status: "online",
    serviceRoute: "/krishna",
  },
];

export default function LandingPage() {
  const [location, setLocation] = useLocation();
  const { currentLanguage } = useChat();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location]);

  useEffect(() => {
    try {
      const savedCompanion = localStorage.getItem("selectedCompanion");
      if (!savedCompanion) {
        localStorage.setItem(
          "selectedCompanion",
          JSON.stringify({
            id: companions[0].id,
            name: companions[0].name,
            avatar: companions[0].imageUrl,
          }),
        );
      }
    } catch (error) {
      console.error("Error seeding companion in localStorage:", error);
    }
  }, []);

  const handleSelectCompanion = (companion: CompanionProfile) => {
    const companionData = {
      id: companion.id,
      name: companion.name,
      avatar: companion.imageUrl,
    };
    localStorage.setItem("selectedCompanion", JSON.stringify(companionData));
    window.dispatchEvent(new Event("companion-selected"));
    setTimeout(() => setLocation("/chat"), 100);
  };

  const handleListingPrimaryAction = (item: CompanionProfile) => {
    if (item.serviceRoute) {
      setLocation(item.serviceRoute);
      return;
    }
    handleSelectCompanion(item);
  };

  const title =
    currentLanguage === "hindi" ? "अपना साथी चुनें" : "Choose your companion";
  const subtitle =
    currentLanguage === "hindi"
      ? "बातचीत शुरू करने के लिए किसी एक को चुनें"
      : "Pick someone to start chatting";

  return (
    <div className="flex min-h-screen flex-col bg-white pb-20">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() => setLocation("/")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100"
            aria-label="Back to Home"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold leading-tight text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-4">
        <div className="grid grid-cols-1 gap-5">
          {[...companions, ...additionalServiceListings].map((companion) => (
            <div
              key={companion.id}
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="relative h-72 overflow-hidden sm:h-80">
                <img
                  src={companion.imageUrl}
                  alt={companion.name}
                  className={`h-full w-full object-cover object-center ${
                    companion.status === "offline" ? "opacity-75 grayscale" : ""
                  }`}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                  <div className="flex items-center">
                    <div
                      className={`mr-2 h-2.5 w-2.5 rounded-full ${
                        companion.status === "online" ? "bg-emerald-400" : "bg-slate-400"
                      }`}
                    />
                    <span className="text-xs font-medium text-white">
                      {companion.status === "online"
                        ? currentLanguage === "hindi"
                          ? "अभी ऑनलाइन"
                          : "Online now"
                        : currentLanguage === "hindi"
                          ? "ऑफलाइन"
                          : "Offline"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  {companion.age !== undefined
                    ? `${companion.name}, ${companion.age}`
                    : currentLanguage === "hindi" && companion.nameHindi
                      ? companion.nameHindi
                      : companion.name}
                </h2>
                <p className="mt-1 text-sm text-slate-600">{companion.description}</p>
                <p className="mt-1 text-xs text-slate-500">{companion.descriptionHindi}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
                    Hindi
                  </span>
                  <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                    English
                  </span>
                </div>
                {companion.status === "online" ? (
                  <button
                    type="button"
                    onClick={() => handleListingPrimaryAction(companion)}
                    className="mt-4 w-full rounded-full border-2 border-indigo-600 bg-white py-2.5 text-sm font-semibold text-indigo-700 shadow-sm transition-colors hover:bg-indigo-600 hover:text-white"
                  >
                    {currentLanguage === "hindi" ? "चैट शुरू करें" : "Chat now"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="mt-4 w-full cursor-not-allowed rounded-full border border-slate-200 bg-slate-50 py-2.5 text-sm font-medium text-slate-400"
                  >
                    {currentLanguage === "hindi" ? "अभी उपलब्ध नहीं" : "Currently unavailable"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      <LegalFooter />

      <BottomNav />
    </div>
  );
}
