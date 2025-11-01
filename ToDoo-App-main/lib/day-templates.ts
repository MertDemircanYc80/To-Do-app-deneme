// lib/day-templates.ts
// Non-invasive scaffolding for weekday/day-based task templates.
// This file is not imported anywhere yet; safe to keep until wired.

import { dataUtils } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import type { Priority, Task } from "@/types";

export type TaskBlueprint = {
  text: string;
  priority?: Priority; // defaults to 'medium' if omitted
  project?: string;
  time?: string; // HH:mm
  notes?: string;
  subTasks?: { id?: string; text: string; completed?: boolean }[];
  order?: number;
  duration?: number; // minutes
  // recurring?: never; // Intentionally excluded for day templates
};

export type DayTemplate = {
  id: string;
  name: string;
  // When to apply this template
  when: {
    /** 0=Sun ... 6=Sat. If provided, applies on these weekdays */
    weekdays?: number[];
    /** Exact dates (YYYY-MM-DD). Optional, for one-off days */
    dates?: string[];
  };
  tasks: TaskBlueprint[];
};

const STORAGE_KEY = "dayTemplates";

export const dayTemplateStore = {
  getAll(userId: string): DayTemplate[] {
    return dataUtils.getUserData<DayTemplate[]>(userId, STORAGE_KEY, []);
  },
  saveAll(userId: string, list: DayTemplate[]) {
    dataUtils.saveUserData(userId, STORAGE_KEY, list);
  },
};

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appliesOn(date: Date, tpl: DayTemplate): boolean {
  const ymd = formatDate(date, "yyyy-MM-dd");
  if (tpl.when.dates && tpl.when.dates.includes(ymd)) return true;
  if (tpl.when.weekdays && tpl.when.weekdays.length > 0) {
    const weekday = date.getDay();
    return tpl.when.weekdays.includes(weekday);
  }
  return false;
}

export function generateTasksFor(
  date: Date,
  tpl: DayTemplate
): Omit<Task, "id" | "completed" | "pinned" | "completedOn">[] {
  const dateStr = formatDate(date, "yyyy-MM-dd");
  return tpl.tasks.map((b, idx) => {
    const priority: Priority = b.priority ?? "medium";
    return {
      text: b.text,
      priority,
      project: b.project,
      time: b.time,
      notes: b.notes,
      subTasks: (b.subTasks ?? []).map((s, sIdx) => ({
        id: s.id || `${idx}-${sIdx}-${createId()}`,
        text: s.text,
        completed: !!s.completed,
      })),
      order: b.order,
      duration: b.duration,
      date: dateStr,
    };
  });
}

export function applyDayTemplate(
  date: Date,
  tpl: DayTemplate,
  addTask: (taskData: Omit<Task, "id" | "completed" | "pinned" | "completedOn">) => void,
  options?: { dedupe?: boolean; existing?: Task[] }
) {
  const { dedupe = true, existing = [] } = options || {};
  const incoming = generateTasksFor(date, tpl);
  let added = 0;
  let skipped = 0;

  incoming.forEach((t) => {
    if (dedupe) {
      const hasSame = existing.some((e) => {
        const sameDate = e.date === t.date;
        const sameText = (e.text || "").trim().toLowerCase() === (t.text || "").trim().toLowerCase();
        const sameProject = (e.project || "") === (t.project || "");
        const sameTime = (e.time || "") === (t.time || "");
        return sameDate && sameText && sameProject && sameTime;
      });
      if (hasSame) { skipped++; return; }
    }
    addTask(t);
    added++;
  });

  return { added, skipped };
}

export function findApplicableTemplates(date: Date, list: DayTemplate[]): DayTemplate[] {
  return list.filter((t) => appliesOn(date, t));
}
