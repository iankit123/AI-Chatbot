import type { RoleBadgeTone } from "@/lib/homeRoleCards";

export interface RoleCardPresentation {
  overlayTitle: string;
  description: string;
  badge: string;
  startChat: string;
}

type Lang = "hindi" | "english";

const HINDI: Record<string, RoleCardPresentation> = {
  doctor: {
    overlayTitle: "डॉक्टर से बात करें",
    description: "24/7 हेल्थ गाइडेंस",
    badge: "24/7 उपलब्ध",
    startChat: "चैट शुरू करें",
  },
  kundli: {
    overlayTitle: "ज्योतिष से बात करें",
    description: "ज्योतिष से जुड़ी जानकारी",
    badge: "विश्वसनीय मार्गदर्शन",
    startChat: "चैट शुरू करें",
  },
  parenting: {
    overlayTitle: "बेबी केयर सलाह लें",
    description: "एक्सपर्ट पेरेंटिंग टिप्स",
    badge: "पेरेंटिंग टिप्स",
    startChat: "चैट शुरू करें",
  },
  finance: {
    overlayTitle: "फाइनेंस मदद पाएं",
    description: "पैसों को बेहतर संभालने की सलाह",
    badge: "स्मार्ट मनी सलाह",
    startChat: "चैट शुरू करें",
  },
  career: {
    overlayTitle: "करियर गाइडेंस लें",
    description: "करियर प्लानिंग और ग्रोथ",
    badge: "करियर ग्रोथ",
    startChat: "चैट शुरू करें",
  },
  relationship: {
    overlayTitle: "रिलेशनशिप की बात करें",
    description: "इमोशनल सपोर्ट और कनेक्शन",
    badge: "इमोशनल सपोर्ट",
    startChat: "चैट शुरू करें",
  },
  krishna: {
    overlayTitle: "श्रीकृष्ण को अपनी समस्या बताए",
    description: "आध्यात्मिक मार्गदर्शन और जीवन की सीख",
    badge: "आध्यात्मिक ज्ञान",
    startChat: "चैट शुरू करें",
  },
  english: {
    overlayTitle: "अंग्रेजी सीखें",
    description: "स्पीकिंग और ग्रामर की प्रैक्टिस",
    badge: "इंग्लिश प्रैक्टिस",
    startChat: "चैट शुरू करें",
  },
};

const ENGLISH: Record<string, RoleCardPresentation> = {
  doctor: {
    overlayTitle: "Chat with Personal Doctor",
    description: "24/7 health guidance",
    badge: "24/7 AVAILABLE",
    startChat: "Start Chat",
  },
  kundli: {
    overlayTitle: "Check Bhavishya from Kundali",
    description: "Astrology insights",
    badge: "RELIABLE GUIDANCE",
    startChat: "Start Chat",
  },
  parenting: {
    overlayTitle: "Get Baby Care Guidance",
    description: "Expert parenting tips",
    badge: "PARENTING TIPS",
    startChat: "Start Chat",
  },
  finance: {
    overlayTitle: "Plan Your Money Better",
    description: "Money management guidance",
    badge: "SMART MONEY HELP",
    startChat: "Start Chat",
  },
  career: {
    overlayTitle: "Grow Your Career",
    description: "Career planning & growth",
    badge: "CAREER GROWTH",
    startChat: "Start Chat",
  },
  relationship: {
    overlayTitle: "Talk to Relationship Coach",
    description: "Emotional support & connection",
    badge: "EMOTIONAL SUPPORT",
    startChat: "Start Chat",
  },
  krishna: {
    overlayTitle: "Chat with Krishna",
    description: "Spiritual guidance and life wisdom",
    badge: "SPIRITUAL WISDOM",
    startChat: "Start Chat",
  },
  english: {
    overlayTitle: "Learn English",
    description: "Practice speaking and grammar",
    badge: "ENGLISH PRACTICE",
    startChat: "Start Chat",
  },
};

export function getRoleCardPresentation(
  lang: Lang,
  roleId: string,
): RoleCardPresentation {
  const table = lang === "hindi" ? HINDI : ENGLISH;
  return (
    table[roleId] ?? {
      overlayTitle: roleId,
      description: "",
      badge: "",
      startChat: lang === "hindi" ? "चैट शुरू करें" : "Start Chat",
    }
  );
}

export const badgeToneClass: Record<RoleBadgeTone, string> = {
  emerald: "text-emerald-600",
  violet: "text-violet-600",
  pink: "text-pink-600",
  amber: "text-amber-600",
  teal: "text-teal-600",
  indigo: "text-indigo-600",
  blue: "text-blue-600",
  orange: "text-orange-600",
};
