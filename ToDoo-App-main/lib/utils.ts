import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Shadcn stil birleştirme */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Saat/dakika/saniye → 00:00:00 */
export const normalizeDate = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Basit tarih biçimlendirici (şimdilik ihtiyacımız olan formatlar) */
export const formatDate = (date: Date | string, format: string): string => {
  let dateObj: Date;
  if (typeof date === "string") {
    // YYYY-MM-DD bekliyoruz
    const [y, m, d] = date.split("-").map(Number);
    dateObj = new Date(y, (m || 1) - 1, d || 1);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    console.error("Invalid date type:", typeof date, date);
    return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD benzeri
  }

  dateObj = normalizeDate(dateObj);

  if (format === "yyyy-MM-dd") {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (format === "dd.MM.yyyy") {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${day}.${month}.${year}`;
  }

  // Basit fallback
  return dateObj.toLocaleDateString("sv-SE");
};

export const startOfWeek = (date: Date): Date => {
  const d = normalizeDate(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day + 6) % 7; // Haftayı Pazartesi başlat
  d.setDate(d.getDate() - diff);
  return d;
};

export const endOfWeek = (date: Date): Date => {
  const s = startOfWeek(date);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  return e;
};

export const startOfMonth = (date: Date): Date =>
  normalizeDate(new Date(date.getFullYear(), date.getMonth(), 1));

export const eachDayOfInterval = (args: { start: Date; end: Date }): Date[] => {
  const { start, end } = args;
  const days: Date[] = [];
  const current = new Date(start);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
};

export const darkPalette = {
  background: "#1a1a1a",
  textPrimary: "#ffffff",
  textSecondary: "#b0b0b0",
  accent: "#27AE60",
  secondaryAccent: "#2980B9",
  completed: "#666666",
};
