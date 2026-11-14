/**
 * Birth details from the Kundli form. Shared by the app (form, local storage) and the
 * server (chart calculation, AI prompt).
 */
export type KundliBirthDetails = {
  name: string;
  gender: string;
  /** yyyy-mm-dd */
  dateOfBirth: string;
  /** HH:mm in 24-hour time, or "" when the person does not know the birth time. */
  timeOfBirth: string;
  cityOfBirth: string;
  /** Filled in once the server has found the birth place on the map. */
  lat?: number;
  lon?: number;
};

export function parseKundliBirthDetails(raw: unknown): KundliBirthDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.name !== "string" ||
    typeof o.gender !== "string" ||
    typeof o.dateOfBirth !== "string" ||
    typeof o.timeOfBirth !== "string" ||
    typeof o.cityOfBirth !== "string"
  ) {
    return null;
  }
  const details: KundliBirthDetails = {
    name: o.name.trim(),
    gender: o.gender,
    dateOfBirth: o.dateOfBirth,
    timeOfBirth: o.timeOfBirth,
    cityOfBirth: o.cityOfBirth.trim(),
  };
  if (typeof o.lat === "number" && typeof o.lon === "number") {
    details.lat = o.lat;
    details.lon = o.lon;
  }
  return details;
}

/** Day, month, year from yyyy-mm-dd, or null when it is not a real calendar date. */
export function parseBirthDate(isoDate: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(isoDate.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return { year, month, day };
}

/** Hour and minute from HH:mm, or null when the time is empty or invalid. */
export function parseBirthTime(time24: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time24.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}
