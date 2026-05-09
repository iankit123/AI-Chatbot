const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** yyyy-mm-dd from `<input type="date">` → 07-April-1992 */
export function formatKundliDob(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return isoDate;
  const monthName = MONTH_NAMES[m - 1] ?? "";
  const dayStr = String(d).padStart(2, "0");
  return `${dayStr}-${monthName}-${y}`;
}

/** HH:mm from `<input type="time">` → 02:50 PM */
export function formatKundliTob(time24: string): string {
  const [hStr, minStr] = time24.split(":");
  const h = parseInt(hStr ?? "0", 10);
  const min = parseInt(minStr ?? "0", 10);
  if (Number.isNaN(h) || Number.isNaN(min)) return time24;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${String(hour12).padStart(2, "0")}:${String(min).padStart(2, "0")} ${period}`;
}
