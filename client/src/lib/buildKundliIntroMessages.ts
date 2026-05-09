import type { Message } from "@shared/schema";
import { formatKundliDob, formatKundliTob } from "@/lib/kundliBirthFormat";
import {
  KUNDLI_CONTEXT_AUTOMATED,
  KUNDLI_CONTEXT_DETAILS,
} from "@/lib/kundliMessageKinds";
import type { StoredKundliBirthDetails } from "@/lib/kundliBirthStorage";

export function buildKundliIntroMessages(
  data: StoredKundliBirthDetails,
  language: "hindi" | "english",
): Message[] {
  const dobLabel = formatKundliDob(data.dateOfBirth);
  const tobLabel = formatKundliTob(data.timeOfBirth);

  const detailLines = [
    `Name: ${data.name}`,
    `Gender: ${data.gender}`,
    `DOB: ${dobLabel}`,
    `TOB: ${tobLabel}`,
    `POB: ${data.cityOfBirth}`,
  ].join("\n");

  const autoText =
    language === "hindi"
      ? "यह एक स्वचालित संदेश है जो पुष्टि करता है कि चैट शुरू हो गई है।"
      : "This is an automated message to confirm that chat has started.";

  const welcomeText =
    language === "hindi"
      ? `स्वागत है। सलाहकार आपके विवरण का विश्लेषण करने में एक मिनट लेंगे। इस बीच आप अपना प्रश्न पूछ सकते हैं।`
      : `Welcome to Astrotalk. Consultant will take a minute to analyse your details. You may ask your question in the meanwhile.`;

  const baseTime = Date.now();

  return [
    {
      id: baseTime,
      content: detailLines,
      role: "user",
      companionId: "kundli",
      timestamp: new Date(),
      photoUrl: null,
      isPremium: null,
      contextInfo: KUNDLI_CONTEXT_DETAILS,
    },
    {
      id: baseTime + 1,
      content: autoText,
      role: "user",
      companionId: "kundli",
      timestamp: new Date(),
      photoUrl: null,
      isPremium: null,
      contextInfo: KUNDLI_CONTEXT_AUTOMATED,
    },
    {
      id: baseTime + 2,
      content: welcomeText,
      role: "assistant",
      companionId: "kundli",
      timestamp: new Date(),
      photoUrl: null,
      isPremium: null,
      contextInfo: null,
    },
  ];
}
