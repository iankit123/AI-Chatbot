import { parseBirthDate, parseBirthTime } from "@shared/kundliBirth";

type Language = "hindi" | "english";

const MONTHS: Record<Language, string[]> = {
  english: [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ],
  hindi: [
    "जनवरी", "फ़रवरी", "मार्च", "अप्रैल", "मई", "जून",
    "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर",
  ],
};

/** yyyy-mm-dd → "6 December 1994" / "6 दिसंबर 1994" */
export function formatKundliDob(isoDate: string, language: Language = "english"): string {
  const date = parseBirthDate(isoDate);
  if (!date) return isoDate;
  return `${date.day} ${MONTHS[language][date.month - 1]} ${date.year}`;
}

/** HH:mm → "2:51 PM" / "दोपहर 2:51 बजे". Empty time → "not known". */
export function formatKundliTob(time24: string, language: Language = "english"): string {
  const time = parseBirthTime(time24);
  if (!time) return language === "hindi" ? "पता नहीं" : "Not known";
  const hour12 = time.hour % 12 || 12;
  const minutes = String(time.minute).padStart(2, "0");
  if (language === "english") return `${hour12}:${minutes} ${time.hour >= 12 ? "PM" : "AM"}`;

  const partOfDay =
    time.hour >= 4 && time.hour < 12
      ? "सुबह"
      : time.hour >= 12 && time.hour < 16
        ? "दोपहर"
        : time.hour >= 16 && time.hour < 19
          ? "शाम"
          : "रात";
  return `${partOfDay} ${hour12}:${minutes} बजे`;
}
