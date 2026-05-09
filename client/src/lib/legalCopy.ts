/** Shared titles & footer labels for legal / info pages (EN + HI). */

export const legalPageTitles = {
  about: { en: "About Us", hi: "हमारे बारे में" },
  privacy: { en: "Privacy Policy", hi: "गोपनीयता नीति" },
  terms: { en: "Terms and Conditions", hi: "नियम और शर्तें" },
  refund: { en: "Refund Policy", hi: "रिफंड नीति" },
  contact: { en: "Contact Us", hi: "संपर्क करें" },
} as const;

export type LegalPageKey = keyof typeof legalPageTitles;

export const legalFooterSectionTitle = { en: "LEGAL", hi: "कानूनी" } as const;

export const legalFooterLinks: {
  key: LegalPageKey;
  href: string;
  en: string;
  hi: string;
}[] = [
  { key: "about", href: "/about", en: "About Us", hi: "हमारे बारे में" },
  { key: "privacy", href: "/privacy", en: "Privacy Policy", hi: "गोपनीयता नीति" },
  { key: "terms", href: "/terms", en: "Terms and Conditions", hi: "नियम और शर्तें" },
  { key: "refund", href: "/refund", en: "Refund Policy", hi: "रिफंड नीति" },
  { key: "contact", href: "/contact", en: "Contact Us", hi: "संपर्क करें" },
];
