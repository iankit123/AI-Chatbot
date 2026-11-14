import type { Message } from "@shared/schema";
import { formatKundliDob, formatKundliTob } from "@/lib/kundliBirthFormat";
import { KUNDLI_CONTEXT_DETAILS } from "@/lib/kundliMessageKinds";
import type {
  KundliChartSummary,
  StoredKundliBirthDetails,
} from "@/lib/kundliBirthStorage";

type Language = "hindi" | "english";

const GENDER_LABELS: Record<Language, Record<string, string>> = {
  hindi: { female: "महिला", male: "पुरुष", other: "अन्य" },
  english: { female: "Female", male: "Male", other: "Other" },
};

function detailsText(data: StoredKundliBirthDetails, language: Language): string {
  const gender = GENDER_LABELS[language][data.gender] ?? data.gender;
  const dob = formatKundliDob(data.dateOfBirth, language);
  const tob = formatKundliTob(data.timeOfBirth, language);
  return language === "hindi"
    ? [`नाम: ${data.name}`, `${gender}`, `जन्म: ${dob}`, `समय: ${tob}`, `जगह: ${data.cityOfBirth}`].join("\n")
    : [`Name: ${data.name}`, `${gender}`, `Born: ${dob}`, `Time: ${tob}`, `Place: ${data.cityOfBirth}`].join("\n");
}

/** Welcome from the astrologer. Shows rashi/lagna when the chart could be calculated. */
function welcomeText(
  data: StoredKundliBirthDetails,
  summary: KundliChartSummary | null,
  language: Language,
): string {
  const hindi = language === "hindi";
  const lines: string[] = [];

  if (!summary) {
    lines.push(
      hindi
        ? `नमस्ते ${data.name} जी 🙏 आपकी जानकारी मिल गई है।`
        : `Namaste ${data.name} ji 🙏 I have your details.`,
    );
  } else {
    lines.push(
      hindi
        ? `नमस्ते ${data.name} जी 🙏 आपकी कुंडली बन गई है।`
        : `Namaste ${data.name} ji 🙏 Your kundli is ready.`,
    );
    lines.push("");
    lines.push(hindi ? `राशि: ${summary.rashi.hindi}` : `Rashi (Moon sign): ${summary.rashi.roman} (${summary.rashi.english})`);
    if (summary.lagna) {
      lines.push(hindi ? `लग्न: ${summary.lagna.hindi}` : `Lagna: ${summary.lagna.roman} (${summary.lagna.english})`);
    }
    lines.push(hindi ? `नक्षत्र: ${summary.nakshatra.hindi}` : `Nakshatra: ${summary.nakshatra.roman}`);
    if (summary.mahadasha) {
      lines.push(
        hindi
          ? `अभी ${summary.mahadasha.hindi} की दशा चल रही है।`
          : `You are in ${summary.mahadasha.roman} (${summary.mahadasha.english}) dasha now.`,
      );
    }
    // Birth time was given but the place was not found, so no lagna.
    if (!summary.lagna && data.timeOfBirth) {
      lines.push("");
      lines.push(
        hindi
          ? "जन्म की जगह नक्शे पर नहीं मिली, इसलिए लग्न नहीं निकल पाया। ऊपर “बदलें” दबाकर पास के बड़े शहर का नाम लिख सकते हैं।"
          : "The birth place was not found on the map, so the lagna could not be worked out. Tap “Change” above and enter the nearest big city.",
      );
    }
  }

  lines.push("");
  lines.push(
    hindi
      ? "अब अपना सवाल पूछिए — शादी, नौकरी, पैसा, सेहत, कुछ भी।"
      : "Now ask your question — marriage, job, money, health, anything.",
  );
  return lines.join("\n");
}

export function buildKundliIntroMessages(
  data: StoredKundliBirthDetails,
  summary: KundliChartSummary | null,
  language: Language,
): Message[] {
  const baseTime = Date.now();
  return [
    {
      id: baseTime,
      content: detailsText(data, language),
      role: "user",
      companionId: "kundli",
      timestamp: new Date(),
      photoUrl: null,
      isPremium: null,
      contextInfo: KUNDLI_CONTEXT_DETAILS,
    },
    {
      id: baseTime + 1,
      content: welcomeText(data, summary, language),
      role: "assistant",
      companionId: "kundli",
      timestamp: new Date(),
      photoUrl: null,
      isPremium: null,
      contextInfo: null,
    },
  ];
}
