export type RoleBadgeTone =
  | "emerald"
  | "violet"
  | "pink"
  | "amber"
  | "teal"
  | "indigo"
  | "blue"
  | "orange";

export interface HomeRoleCardDefinition {
  id: string;
  title: string;
  description: string;
  route: string;
  gradient: string;
  image: string;
  badgeTone: RoleBadgeTone;
  ctaClass: string;
}

/** Same ordering/data as Home assistant cards — single source for layout + routes. */
export const HOME_ROLE_CARDS: HomeRoleCardDefinition[] = [
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
    id: "english",
    title: "Learn English",
    description: "Practice speaking and grammar",
    route: "/english",
    gradient: "from-orange-500 to-amber-600",
    image: "/images/english-card.png",
    badgeTone: "orange",
    ctaClass: "bg-gradient-to-r from-orange-500 to-amber-500",
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
    id: "parenting",
    title: "Parenting and Baby Care Assistant",
    description: "Expert parenting tips",
    route: "/parenting",
    gradient: "from-pink-500 to-rose-600",
    image: "/images/parenting-card.png",
    badgeTone: "amber",
    ctaClass: "bg-gradient-to-r from-orange-500 to-amber-500",
  }
];

export const HOME_ROLE_CARD_BY_ID: Record<string, HomeRoleCardDefinition> =
  Object.fromEntries(HOME_ROLE_CARDS.map((r) => [r.id, r]));
