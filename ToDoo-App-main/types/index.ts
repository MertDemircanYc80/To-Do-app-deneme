// types/index.ts

/* ---------- SubTask ---------- */
export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

/* ---------- Priority ---------- */
// 'urgent' kaldırıldı; UI tarafındaki Record<Priority,...> kısıtlarıyla çakışıyordu.
export type Priority = "lowest" | "low" | "medium" | "high" | "highest";

/* ---------- Recurring ---------- */
export type RecurringType = "daily" | "weekly" | "monthly" | "specific-days";

export interface RecurringRule {
  /** Tekrarlama türü */
  type: RecurringType;
  /** Başlangıç tarihi (YYYY-MM-DD). Yoksa task.date baz alınır */
  startDate?: string;
  /** Örn: her 2 günde/haftada/ayda bir */
  interval?: number;
  /** specific-days için: 0=Sun ... 6=Sat */
  specificDays?: number[];
  /** Kaç kez tekrar edileceği (örn: Daily + 5 -> 5 occurrence) */
  occurrences?: number;
}

/* ---------- Task ---------- */
export interface Task {
  id: string;
  text: string;

  // Durumlar
  completed: boolean;
  pinned: boolean;

  // Tarih / saat
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm

  // Organizasyon
  project?: string;
  priority: Priority; // zorunlu: UI doğrudan kullanıyor

  // İçerik
  notes?: string;
  subTasks?: SubTask[];

  // Görünüm / sıralama
  order?: number;

  // Süre hedefi (dk)
  duration?: number;

  // Tekrarlama
  recurring?: RecurringRule;

  // Gün bazında tamamlanma (tekrarlayan görevler için)
  /** key: 'YYYY-MM-DD', value: true */
  completedOn?: Record<string, boolean>;

  createdAt?: string;
  updatedAt?: string;
}

/* ---------- Template ---------- */
export interface Template {
  id: string;
  name: string;
  // Task'tan, kimlik ve anlık durum alanlarını çıkarıyoruz
  task: Omit<Task, "id" | "completed" | "pinned" | "completedOn" | "createdAt" | "updatedAt">;
}

/* ---------- Project ---------- */
export interface Project {
  id: string;
  name: string;
  color?: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

/* ---------- Auth ---------- */
export type SessionUser = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
};

export interface AuthState {
  isAuthenticated: boolean;
  user: SessionUser | null;
}

/* ---------- Views ---------- */
export type View =
  | "today"
  | "week"
  | "month"
  | "project"
  | "day-template"
  | "settings"
  | "tasks";
