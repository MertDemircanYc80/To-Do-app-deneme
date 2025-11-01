// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth/AuthForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import RightPanel from "@/components/layout/RightPanel";
import { TaskItem } from "@/components/tasks/TaskItem";
import { dayTemplateStore, applyDayTemplate, createId, type DayTemplate } from "@/lib/day-templates";
import { toast } from "@/hooks/use-toast";
import {
  type Task,
  type Project,
  type AuthState,
  type View,
  type Template,
  type SubTask,
} from "@/types";
import {
  formatDate,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  eachDayOfInterval,
  darkPalette,
} from "@/lib/utils";
import { authUtils } from "@/lib/auth";
import { dataUtils } from "@/lib/data";
import StatsBar from "@/components/stats/StatsBar";
import DraggableProgress from "@/components/stats/DraggableProgress";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X
} from "lucide-react";
import { createPortal } from "react-dom";
import CalendarButton from "@/components/ui/CalendarButton";

/* ---------------- utils (calendar UI i+?in) ---------------- */
const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const startMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

/* -------- anchored portal -------- */
function AnchoredPortal({
  anchorEl,
  open,
  width = 320,
  onClose,
  children,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  width?: number;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // start off-screen to avoid a flash before the first measurement
  const [pos, setPos] = useState({ left: -99999, top: -99999, width });

  useEffect(() => {
    if (!open || !anchorEl) return;
    const update = () => {
      if (!anchorEl) return;
      const r = anchorEl.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, r.left + window.scrollX),
        window.scrollX + window.innerWidth - width - 8
      );
      const top = r.bottom + window.scrollY + 8;
      setPos({ left, top, width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open, anchorEl, width]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !anchorEl) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" onMouseDown={onClose} aria-hidden />
      <div
        className="fixed z-[61]"
        style={{ left: pos.left, top: pos.top, width: pos.width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}

/* ---------------- calendar panel ---------------- */
function CalendarPanel({
  value,
  onChange,
  onClose,
}: {
  value?: string;
  onChange: (ymd: string) => void;
  onClose: () => void;
}) {
  const selected = value ? new Date(value) : null;
  const [cursor, setCursor] = useState<Date>(startMonth(selected ?? new Date()));

  const days = useMemo(() => {
    const start = startMonth(cursor);
    const startOffset = start.getDay();
    const gridStart = new Date(start);
    gridStart.setDate(start.getDate() - startOffset);

    const result: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      result.push(d);
    }
    return result;
  }, [cursor]);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const today = new Date();

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <button
          onClick={() => setCursor(addMonths(cursor, -1))}
          className="p-1 rounded hover:bg-gray-800"
          aria-label="Previous month"
          type="button"
        >
          <ChevronLeft className="w-4 h-4 text-gray-300" />
        </button>
        <div className="text-[13px] text-white">
          {months[cursor.getMonth()]} {cursor.getFullYear()}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date())}
            className="px-2 py-1 text-[12px] text-gray-300 hover:text-white"
            type="button"
          >
            Today
          </button>
          <button
            onClick={() => setCursor(addMonths(cursor, 1))}
            className="p-1 rounded hover:bg-gray-800"
            aria-label="Next month"
            type="button"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={onClose}
            className="ml-1 p-1 rounded hover:bg-gray-800"
            aria-label="Close"
            type="button"
          >
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pt-2">
        {daysShort.map((d) => (
          <div key={d} className="text-[11px] text-gray-400 text-center pb-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3 pt-1">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const selectedDay = selected ? isSameDay(d, selected) : false;
          const todayDay = isSameDay(d, today);

          return (
            <button
              key={i}
              onClick={() => {
                onChange(toYMD(d));
                onClose();
              }}
              type="button"
              className={[
                "h-9 rounded-md text-sm tabular-nums border",
                selectedDay
                  ? "bg-green-600 text-white border-green-600"
                  : todayDay
                  ? "border-green-600/40 text-white"
                  : "border-gray-700 text-gray-200",
                inMonth ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-900 text-gray-500",
              ].join(" ")}
              title={toYMD(d)}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================= */
/*                        MAIN PAGE COMPONENT                    */
/* ============================================================= */

export default function TodoApp() {
  // --- STATE ---
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [dayTemplates, setDayTemplates] = useState<DayTemplate[]>([]);
  const [currentDayTemplateId, setCurrentDayTemplateId] = useState<string>("");
  const [hasMounted, setHasMounted] = useState(false);
  const [currentView, setCurrentView] = useState<View>("today");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [authError, setAuthError] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthOffset, setMonthOffset] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [projectsExpanded, setProjectsExpanded] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string>("");

  // sa?? panel open/close
  const [rightOpen, setRightOpen] = useState<boolean>(true);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // +?ifre de??i+?tir
  const [pwForm, setPwForm] = useState<{ current: string; next: string; confirm: string }>({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // --- VER?- Y+?KLEME ---
  useEffect(() => {
    setHasMounted(true);
    const userFromStorage = authUtils.getCurrentUser();
    if (userFromStorage) {
      setAuthState({ isAuthenticated: true, user: userFromStorage });

      const userTasks = dataUtils.getUserData<Task[]>(userFromStorage.id, "tasks", []);
      const userProjects = dataUtils.getUserData<Project[]>(userFromStorage.id, "projects", []);
      const userTemplates = dataUtils.getUserData<Template[]>(userFromStorage.id, "templates", []);
      const userDayTemplates = dayTemplateStore.getAll(userFromStorage.id);

      setTasks(userTasks);
      setProjects(userProjects);
      setTemplates(userTemplates);
      setDayTemplates(userDayTemplates);
    }
  }, []);

  // Persist
  useEffect(() => {
    if (!hasMounted || !authState.isAuthenticated || !authState.user) return;
    dataUtils.saveUserData(authState.user.id, "tasks", tasks);
  }, [tasks, hasMounted, authState]);
  useEffect(() => {
    if (!hasMounted || !authState.isAuthenticated || !authState.user) return;
    dataUtils.saveUserData(authState.user.id, "projects", projects);
  }, [projects, hasMounted, authState]);
  useEffect(() => {
    if (!hasMounted || !authState.isAuthenticated || !authState.user) return;
    dataUtils.saveUserData(authState.user.id, "templates", templates);
  }, [templates, hasMounted, authState]);
  useEffect(() => {
    if (!hasMounted || !authState.isAuthenticated || !authState.user) return;
    dayTemplateStore.saveAll(authState.user.id, dayTemplates);
  }, [dayTemplates, hasMounted, authState]);

  // --- AUTH ---
  const handleLogin = async () => {
    const result = await authUtils.login(authForm.email, authForm.password);
    if (result.success) {
      authUtils.saveUser(result.user);
      const userTasks = dataUtils.getUserData<Task[]>(result.user.id, "tasks", []);
      const userProjects = dataUtils.getUserData<Project[]>(result.user.id, "projects", []);
      const userTemplates = dataUtils.getUserData<Template[]>(result.user.id, "templates", []);
      setTasks(userTasks);
      setProjects(userProjects);
      setTemplates(userTemplates);
      setAuthState({ isAuthenticated: true, user: result.user });
      setAuthError("");
    } else {
      setAuthError(result.error);
    }
  };

  const handleRegister = async () => {
    if (authForm.password !== authForm.confirmPassword) {
      setAuthError("Passwords don't match");
      return;
    }
    const result = await authUtils.register(authForm.username, authForm.email, authForm.password);
    if (result.success) {
      authUtils.saveUser(result.user);
      setAuthState({ isAuthenticated: true, user: result.user });
      setAuthError("");
    } else {
      setAuthError(result.error);
    }
  };

  const handleLogout = () => {
    authUtils.logout();
    setAuthState({ isAuthenticated: false, user: null });
    setTasks([]);
    setProjects([]);
    setTemplates([]);
    setDayTemplates([]);
    setCurrentView("today");
  };

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "lowest":
        return "#95a5a6";
      case "low":
        return "#3498db";
      case "medium":
        return "#f39c12";
      case "high":
        return "#e67e22";
      case "highest":
        return "#e74c3c";
      default:
        return "#f39c12";
    }
  };

  // Hesap kaydet
  const handleAccountSave = () => {
    if (authState.user) {
      const users = JSON.parse(localStorage.getItem("users") || "[]");
      const userIndex = users.findIndex((u: any) => u.id === authState.user!.id);
      if (userIndex !== -1) {
        users[userIndex] = {
          ...users[userIndex],
          username: editUsername,
          email: editEmail,
          password: editPassword || users[userIndex].password,
        };
        localStorage.setItem("users", JSON.stringify(users));
        const updatedUser = { ...authState.user, username: editUsername, email: editEmail };
        setAuthState({ ...authState, user: updatedUser });
        authUtils.saveUser(updatedUser);
      }
    }
    setIsEditingAccount(false);
  };

  const handleAccountEdit = () => {
    if (authState.user) {
      setEditUsername(authState.user.username);
      setEditEmail(authState.user.email);
      setEditPassword("");
    }
    setIsEditingAccount(true);
  };

  // +?ifre de??i+?tir
  const handleChangePassword = () => {
    if (!authState.user) return;

    const { current, next, confirm } = pwForm;
    if (!current || !next || !confirm) {
      setPwMsg({ type: "err", text: "Please fill in all fields." });
      return;
    }
    if (next.length < 6) {
      setPwMsg({ type: "err", text: "New password must be at least 6 characters." });
      return;
    }
    if (next !== confirm) {
      setPwMsg({ type: "err", text: "New passwords do not match." });
      return;
    }
    if (next === current) {
      setPwMsg({ type: "err", text: "New password must differ from current." });
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const idx = users.findIndex((u: any) => u.id === authState.user!.id);
    if (idx === -1) {
      setPwMsg({ type: "err", text: "User not found." });
      return;
    }
    if (users[idx].password !== current) {
      setPwMsg({ type: "err", text: "Current password is incorrect." });
      return;
    }

    users[idx].password = next;
    localStorage.setItem("users", JSON.stringify(users));
    setPwMsg({ type: "ok", text: "Your password has been updated." });
    setPwForm({ current: "", next: "", confirm: "" });
  };

  // --- HELPERS ---
  const addTask = (taskData: Omit<Task, "id" | "completed" | "pinned" | "completedOn">) => {
    const newTask: Task = { ...taskData, id: createId(), completed: false, pinned: false };
    setTasks((prev) => [...prev, newTask]);
  };

  const createProject = (name: string) => {
    if (name.trim()) {
      const colors = ["#27AE60", "#2980B9", "#E74C3C", "#F39C12", "#9B59B6", "#1ABC9C"];
      const project: Project = {
        id: createId(),
        name: name.trim(),
        color: colors[Math.floor(Math.random() * colors.length)],
        createdAt: new Date().toISOString(),
      };
      setProjects((p) => [...p, project]);
    }
  };

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    setTasks((prev) => prev.map((t) => (t.project === projectId ? { ...t, project: undefined } : t)));
    if (currentProjectId === projectId) setCurrentProjectId("");
  };

  const getOriginalTaskId = (id: string) => {
    const m = id.match(/\d{4}-\d{2}-\d{2}$/);
    if (!m) return id;
    return id.slice(0, -m[0].length - 1);
  };

  const toggleTask = (id: string) => {
    if (/\d{4}-\d{2}-\d{2}$/.test(id)) {
      const dateStr = id.slice(-10);
      const originalId = getOriginalTaskId(id);
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id === originalId) {
            const updatedCompletedOn = { ...(task.completedOn || {}) };
            if (updatedCompletedOn[dateStr]) delete updatedCompletedOn[dateStr];
            else updatedCompletedOn[dateStr] = true;
            return { ...task, completedOn: updatedCompletedOn };
          }
          return task;
        })
      );
    } else {
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)));
    }
  };

  const togglePin = (id: string) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, pinned: !task.pinned } : task)));
  };

  const deleteTask = (id: string) => {
    if (/\d{4}-\d{2}-\d{2}$/.test(id)) return;
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  // Subtasks / Notes
  const upsertSub = (taskId: string, mutate: (t: Task) => Task) => {
    const baseId = getOriginalTaskId(taskId);
    setTasks((prev) => {
      let idx = prev.findIndex((t) => t.id === baseId);
      if (idx === -1) idx = prev.findIndex((t) => t.id === taskId);
      if (idx === -1) return prev;
      const copy = [...prev];
      copy[idx] = mutate(copy[idx]);
      return copy;
    });
  };
  const handleAddSubTask = (taskId: string, subTaskText: string) => {
    const text = (subTaskText ?? "").trim();
    if (!text) return;
    const newSubTask: SubTask = { id: createId(), text, completed: false };
    upsertSub(taskId, (t) => ({ ...t, subTasks: [...(t.subTasks ?? []), newSubTask] }));
  };
  const handleToggleSubTask = (taskId: string, subTaskId: string) => {
    upsertSub(taskId, (t) => ({
      ...t,
      subTasks: (t.subTasks ?? []).map((s) => (s.id === subTaskId ? { ...s, completed: !s.completed } : s)),
    }));
  };
  const handleDeleteSubTask = (taskId: string, subTaskId: string) => {
    upsertSub(taskId, (t) => ({ ...t, subTasks: (t.subTasks ?? []).filter((s) => s.id !== subTaskId) }));
  };
  const handleUpdateTaskNotes = (taskId: string, notes: string) => {
    const text = notes ?? "";
    upsertSub(taskId, (t) => ({ ...t, notes: text }));
  };

  // Templates
  const handleCreateTemplateFromTask = (taskId: string, templateName: string) => {
    const baseId = getOriginalTaskId(taskId);
    const taskToTemplate =
      tasks.find((t) => t.id === baseId) || tasks.find((t) => t.id === taskId);
    if (!taskToTemplate) return;
    const { id, date, completed, pinned, completedOn, ...taskData } = taskToTemplate;
    const newTemplate: Template = { id: Date.now().toString(), name: templateName, task: taskData };
    setTemplates((prev) => [...prev, newTemplate]);
  };
  const handleUseTemplate = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    const taskDataFromTemplate = { ...template.task, date: formatDate(selectedDate, "yyyy-MM-dd") };
    addTask(taskDataFromTemplate);
  };
  const handleUseDayTemplate = (templateId: string, ymd?: string) => {
    const tpl = dayTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const targetDate = ymd ? new Date(ymd) : selectedDate;
    const res = applyDayTemplate(targetDate, tpl, addTask, { dedupe: true, existing: tasks });
    if (res) {
      toast({ title: "Template applied", description: `${res.added} task(s) added • ${res.skipped} skipped` });
    }
  };

  // Day Template editing (blueprints)
  const addBlueprintToDayTemplate = (
    templateId: string,
    blueprint: {
      text: string;
      priority?: Task["priority"];
      time?: string;
      project?: string;
    }
  ) => {
    const text = (blueprint.text ?? "").trim();
    if (!text) return;
    setDayTemplates((prev) =>
      prev.map((tpl) =>
        tpl.id === templateId
          ? { ...tpl, tasks: [...tpl.tasks, { text, priority: blueprint.priority, time: blueprint.time, project: blueprint.project }] }
          : tpl
      )
    );
  };
  const deleteBlueprintFromDayTemplate = (templateId: string, index: number) => {
    setDayTemplates((prev) =>
      prev.map((tpl) => (tpl.id === templateId ? { ...tpl, tasks: tpl.tasks.filter((_, i) => i !== index) } : tpl))
    );
  };
  const updateBlueprintInDayTemplate = (
    templateId: string,
    index: number,
    patch: Partial<{ text: string; priority: Task["priority"]; time: string; project: string }>
  ) => {
    setDayTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.id !== templateId) return tpl;
        const items = [...tpl.tasks];
        items[index] = { ...items[index], ...patch } as any;
        return { ...tpl, tasks: items };
      })
    );
  };

  // Helpers to map TaskItem-style ids (tplId:index)
  const parseTplKey = (taskId: string): { tplId: string; index: number } | null => {
    const parts = taskId.split(":");
    if (parts.length !== 2) return null;
    const idx = Number(parts[1]);
    if (!Number.isFinite(idx)) return null;
    return { tplId: parts[0], index: idx };
  };

  const handleAddBlueprintSubTask = (taskKey: string, subTaskText: string) => {
    const parsed = parseTplKey(taskKey);
    if (!parsed) return;
    setDayTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.id !== parsed.tplId) return tpl;
        const list = [...tpl.tasks];
        const target = list[parsed.index];
        if (!target) return tpl;
        const sub = { id: createId(), text: subTaskText, completed: false };
        const subTasks = [...(target.subTasks ?? []), sub];
        list[parsed.index] = { ...target, subTasks } as any;
        return { ...tpl, tasks: list };
      })
    );
  };
  const handleToggleBlueprintSubTask = (taskKey: string, subTaskId: string) => {
    const parsed = parseTplKey(taskKey);
    if (!parsed) return;
    setDayTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.id !== parsed.tplId) return tpl;
        const list = [...tpl.tasks];
        const target = list[parsed.index];
        if (!target) return tpl;
        const subTasks = (target.subTasks ?? []).map((s) =>
          s.id === subTaskId ? { ...s, completed: !s.completed } : s
        );
        list[parsed.index] = { ...target, subTasks } as any;
        return { ...tpl, tasks: list };
      })
    );
  };
  const handleDeleteBlueprintSubTask = (taskKey: string, subTaskId: string) => {
    const parsed = parseTplKey(taskKey);
    if (!parsed) return;
    setDayTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.id !== parsed.tplId) return tpl;
        const list = [...tpl.tasks];
        const target = list[parsed.index];
        if (!target) return tpl;
        const subTasks = (target.subTasks ?? []).filter((s) => s.id !== subTaskId);
        list[parsed.index] = { ...target, subTasks } as any;
        return { ...tpl, tasks: list };
      })
    );
  };
  const handleUpdateBlueprintNotes = (taskKey: string, notes: string) => {
    const parsed = parseTplKey(taskKey);
    if (!parsed) return;
    setDayTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.id !== parsed.tplId) return tpl;
        const list = [...tpl.tasks];
        const target = list[parsed.index];
        if (!target) return tpl;
        list[parsed.index] = { ...target, notes: notes ?? "" } as any;
        return { ...tpl, tasks: list };
      })
    );
  };
  const handleUpdateBlueprintText = (taskKey: string, newText: string) => {
    const parsed = parseTplKey(taskKey);
    if (!parsed) return;
    setDayTemplates((prev) =>
      prev.map((tpl) => {
        if (tpl.id !== parsed.tplId) return tpl;
        const list = [...tpl.tasks];
        const target = list[parsed.index];
        if (!target) return tpl;
        list[parsed.index] = { ...target, text: newText } as any;
        return { ...tpl, tasks: list };
      })
    );
  };

  const handleCreateDayTemplate = (name: string) => {
    const trimmed = (name ?? "").trim();
    if (!trimmed) return;
    const newTpl: DayTemplate = {
      id: createId(),
      name: trimmed,
      when: { weekdays: [] },
      tasks: [],
    };
    setDayTemplates((prev) => [newTpl, ...prev]);
  };
  const handleDeleteDayTemplate = (templateId: string) => {
    setDayTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };
  const handleUpdateDayTemplate = (updated: DayTemplate) => {
    setDayTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  };
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  // G+?r+-n+-mler
  const daysBetweenLocal = (a: Date, b: Date) => {
    const d1 = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const d2 = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    const diffMs = d1.getTime() - d2.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };
  const monthsBetween = (a: Date, b: Date) =>
    (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

  const getTasksForDate = (date: Date) => {
    const dateStr = formatDate(date, "yyyy-MM-dd");
    return tasks.filter((task) => {
      if (task.date === dateStr && !task.recurring) return true;
      if (!task.recurring) return false;

      const startDateStr = task.recurring.startDate || task.date;
      if (!startDateStr) return false;

      const startDate = new Date(startDateStr);
      const diffDays = daysBetweenLocal(date, startDate);
      if (diffDays < 0) return false;

      switch (task.recurring.type) {
        case "daily": {
          const interval = Math.max(1, task.recurring.interval || 1);
          return diffDays % interval === 0;
        }
        case "weekly": {
          const interval = Math.max(1, task.recurring.interval || 1);
          if (date.getDay() !== startDate.getDay()) return false;
          const weeks = Math.floor(diffDays / 7);
          return weeks % interval === 0;
        }
        case "monthly": {
          const interval = Math.max(1, task.recurring.interval || 1);
          if (date.getDate() !== startDate.getDate()) return false;
          const mDiff = monthsBetween(date, startDate);
          return mDiff % interval === 0;
        }
        case "specific-days": {
          const days = task.recurring.specificDays || [];
          if (date < new Date(startDateStr)) return false;
          return days.includes(date.getDay());
        }
        default:
          return false;
      }
    });
  };

  const getTodayTasks = () => getTasksForDate(selectedDate);

  const getWeekTasks = useCallback(() => {
    const dateForWeek = new Date(selectedDate);
    dateForWeek.setDate(dateForWeek.getDate() + weekOffset * 7);
    const weekStart = startOfWeek(dateForWeek);
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) });
    return weekDays.map((day) => ({ date: day, tasks: getTasksForDate(day) }));
  }, [selectedDate, weekOffset, tasks]);

  const getMonthTasks = useCallback(() => {
    const displayMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + monthOffset, 1);
    const monthStart = startOfMonth(displayMonth);
    const firstDayOfMonthGrid = startOfWeek(monthStart);
    const totalGridDays = 42;
    const lastDayOfMonthGrid = new Date(firstDayOfMonthGrid);
    lastDayOfMonthGrid.setDate(lastDayOfMonthGrid.getDate() + (totalGridDays - 1));
    const days = eachDayOfInterval({ start: firstDayOfMonthGrid, end: lastDayOfMonthGrid });
    const weeks: { date: Date; tasks: Task[]; isCurrentMonth: boolean }[][] = [];
    let week: { date: Date; tasks: Task[]; isCurrentMonth: boolean }[] = [];
    days.forEach((day, index) => {
      week.push({ date: day, tasks: getTasksForDate(day), isCurrentMonth: day.getMonth() === displayMonth.getMonth() });
      if ((index + 1) % 7 === 0) {
        weeks.push(week);
        week = [];
      }
    });
    return weeks;
  }, [selectedDate, monthOffset, tasks]);

  // Normalize per-day order once tasks change (ensures smooth DnD in Week)
  useEffect(() => {
    try {
      const updated = [...tasks];
      let changed = false;

      const timeToMin = (t?: string) => {
        if (!t) return Number.MAX_SAFE_INTEGER;
        const [h, m] = t.split(":").map(Number);
        if (Number.isNaN(h) || Number.isNaN(m)) return Number.MAX_SAFE_INTEGER;
        return h * 60 + m;
      };

      const groups: Record<string, number[]> = {};
      updated.forEach((t, idx) => {
        if (t.date) {
          (groups[t.date] ||= []).push(idx);
        }
      });

      Object.keys(groups).forEach((ymd) => {
        const idxs = groups[ymd];
        const list = idxs.map((i) => updated[i]);
        // If any missing order, assign sequential based on existing order then time
        if (list.some((t) => t.order == null)) {
          list
            .slice()
            .sort((a, b) => {
              const ao = a.order ?? Number.MAX_SAFE_INTEGER;
              const bo = b.order ?? Number.MAX_SAFE_INTEGER;
              if (ao !== bo) return ao - bo;
              return timeToMin(a.time) - timeToMin(b.time);
            })
            .forEach((t, pos) => {
              const i = updated.findIndex((x) => x.id === t.id);
              if (i !== -1 && updated[i].order !== pos * 10) {
                updated[i] = { ...updated[i], order: pos * 10 } as Task;
                changed = true;
              }
            });
        }
      });

      if (changed) setTasks(updated);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const getProjectTasks = (projectId: string) => tasks.filter((t) => t.project === projectId);

  const changeView = (view: View) => {
    setCurrentView(view);
    setWeekOffset(0);
    setMonthOffset(0);
    // When switching to Today, reset to the actual current date
    if (view === "today") {
      setSelectedDate(new Date());
    }
  };

  const currentWeekDate = useMemo(() => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [selectedDate, weekOffset]);
  const currentWeekStart = startOfWeek(currentWeekDate);
  const currentWeekEnd = endOfWeek(currentWeekDate);

  // ---------- Header Date Picker ----------
  const [openHeaderCal, setOpenHeaderCal] = useState(false);
  const headerBtnRef = useRef<HTMLButtonElement>(null);

  if (!hasMounted) return null;

  if (!authState.isAuthenticated) {
    return (
      <AuthForm
        {...{
          authMode,
          setAuthMode,
          authForm,
          setAuthForm,
          handleLogin,
          handleRegister,
          authError,
          setAuthError,
          darkPalette,
        }}
      />
    );
  }

  const renderTasks = (tasksToRender: Task[], view: View) =>
    tasksToRender.map((task) => (
      <TaskItem
        key={task.id}
        {...{
          task,
          projects,
          getPriorityColor,
          toggleTask,
          togglePin,
          deleteTask,
          onAddSubTask: handleAddSubTask,
          onToggleSubTask: handleToggleSubTask,
          onUpdateNotes: handleUpdateTaskNotes,
          onCreateTemplate: handleCreateTemplateFromTask,
          onDeleteSubTask: handleDeleteSubTask,
          view,
        }}
      />
    ));

  // ?-statistikler
  const isDoneOn = (task: Task, date: Date): boolean => {
    const dateStr = formatDate(date, "yyyy-MM-dd");
    if (task.completedOn && task.completedOn[dateStr]) return true;
    if (!task.recurring && task.date === dateStr && task.completed) return true;
    return false;
  };
  const todayTasks = getTodayTasks();
  const todayCompleted = todayTasks.reduce((acc: number, t: Task) => acc + (isDoneOn(t, selectedDate) ? 1 : 0), 0);
  const weekData = getWeekTasks();
  const weekTotals = weekData.reduce(
    (acc: { total: number; completed: number }, item: { date: Date; tasks: Task[] }) => {
      const completedForDay = item.tasks.reduce((a: number, t: Task) => a + (isDoneOn(t, item.date) ? 1 : 0), 0);
      return { total: acc.total + item.tasks.length, completed: acc.completed + completedForDay };
    },
    { total: 0, completed: 0 }
  );
  const todayPct = todayTasks.length ? Math.round((todayCompleted / todayTasks.length) * 100) : 0;
  const showStatsBar = false;

  return (
    <div className="min-h-screen" style={{ backgroundColor: darkPalette.background }}>
      <div className="flex">
          <Sidebar
            {...{
            isExpanded: projectsExpanded,
            onToggle: () => setProjectsExpanded(!projectsExpanded),
            projects,
            templates,
            dayTemplates,
            onCreateProject: createProject,
              onSetView: setCurrentView,
              onSetCurrentProjectId: setCurrentProjectId,
              onSetCurrentDayTemplateId: setCurrentDayTemplateId,
              onUseTemplate: handleUseTemplate,
              onUseDayTemplate: handleUseDayTemplate,
              onCreateDayTemplate: handleCreateDayTemplate,
              onDeleteDayTemplate: handleDeleteDayTemplate,
              onUpdateDayTemplate: handleUpdateDayTemplate,
            onDeleteTemplate: handleDeleteTemplate,
            onDeleteProject: deleteProject,
          }}
        />

        {/* Ana i+?erik: sa?? panel a+?-ksa ekstra padding */}
        <div
          className={`flex-1 relative isolate transition-all duration-300 ${
            projectsExpanded ? "ml-80" : "ml-0"
          } ${rightOpen ? "pr-80" : "pr-4"}`}
        >
          {/* Solid background to prevent faint banding under semi-transparent sections */}
          <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundColor: darkPalette.background }} />
          {/* Draggable donut (Today %) */}
          {false && (
            <DraggableProgress
              value={todayPct}
              size={48}
              thickness={7}
              storageKey="ui:progressDial"
              initialPos={{ x: 1220, y: 150 }}
              startColor="#22c55e"
              endColor="#16a34a"
              trackColor="rgba(255,255,255,0.10)"
              innerFill="transparent"
              textColor="#ffffff"
              showGlow={false}
              showGloss={false}
            />
          )}

          {showStatsBar && (
            <StatsBar
              todayCompleted={todayCompleted}
              todayTotal={todayTasks.length}
              weekCompleted={weekTotals.completed}
              weekTotal={weekTotals.total}
            />
          )}

          <header className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-white">
                {currentView === "today" && "Today's Tasks"}
                {currentView === "week" && "This Week"}
                {currentView === "month" && "Month View"}
                {currentView === "project" &&
                  projects.find((p) => p.id === currentProjectId)?.name}
                {currentView === "day-template" &&
                  dayTemplates.find((t) => t.id === currentDayTemplateId)?.name}
                {currentView === "settings" && "Settings"}
                {currentView === "tasks" && "All Tasks"}
              </h1>

                {/* Tarih butonu */}
                <div className="flex items-center gap-2">
                <div className="relative">
                  <CalendarButton
                    value={toYMD(selectedDate)}
                    onChange={(ymd) => setSelectedDate(new Date(ymd))}
                    className="h-9 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"
                    placeholder={formatDate(selectedDate, "dd.MM.yyyy")}
                    buttonTitle="Pick a date"
                  />
                </div>
              </div>
            </div>
          </header>

          <MainContent
            {...{
              currentView,
              tasks,
              projects,
              getTodayTasks,
              getWeekTasks,
              getMonthTasks,
              getProjectTasks,
              currentProjectId,
              dayTemplates,
              currentDayTemplateId,
              selectedDate,
              setSelectedDate,
              onAddTask: addTask,
              weekOffset,
              setWeekOffset,
              currentWeekStart,
              currentWeekEnd,
              monthOffset,
              setMonthOffset,
              dayNames,
              authState,
              isEditingAccount,
              editUsername,
              setEditUsername,
              editEmail,
              setEditEmail,
              editPassword,
              setEditPassword,
              handleAccountEdit,
              handleAccountSave,
              setIsEditingAccount,
              handleLogout,
              setTasks,
              // password
              pwForm,
              setPwForm,
              pwMsg,
              setPwMsg,
              onChangePassword: handleChangePassword,
              // template
              onCreateTemplateFromTask: handleCreateTemplateFromTask,
              // day template edit/apply
              onApplyDayTemplate: handleUseDayTemplate,
              onAddBlueprint: addBlueprintToDayTemplate,
              onDeleteBlueprint: deleteBlueprintFromDayTemplate,
              onUpdateBlueprint: updateBlueprintInDayTemplate,
              onAddBlueprintSubTask: handleAddBlueprintSubTask,
              onToggleBlueprintSubTask: handleToggleBlueprintSubTask,
              onDeleteBlueprintSubTask: handleDeleteBlueprintSubTask,
              onUpdateBlueprintNotes: handleUpdateBlueprintNotes,
              onUpdateBlueprintText: handleUpdateBlueprintText,
              // subtask & notes
              onAddSubTask: handleAddSubTask,
              onToggleSubTask: handleToggleSubTask,
              onDeleteSubTask: handleDeleteSubTask,
              onUpdateNotes: handleUpdateTaskNotes,
              // render helper
              renderTasks,
            }}
          />
        </div>

        {/* Sağ sabit panel (slide-in/out) */}
        <RightPanel
          open={rightOpen}
          onClose={() => setRightOpen(false)}
          onToggle={() => setRightOpen((s) => !s)}
        />
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 z-30">
        <div className="flex justify-center">
          <div className="flex bg-gray-700 rounded-full p-1 m-2">
            <Button
              onClick={() => changeView("today")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                currentView === "today" ? "bg-green-600 text-white" : "text-gray-300 hover:text-white hover:bg-gray-600"
              }`}
            >
              Today
            </Button>
            <Button
              onClick={() => changeView("week")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                currentView === "week" ? "bg-green-600 text-white" : "text-gray-300 hover:text-white hover:bg-gray-600"
              }`}
            >
              Week
            </Button>
            <Button
              onClick={() => changeView("month")}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                currentView === "month" ? "bg-green-600 text-white" : "text-gray-300 hover:text-white hover:bg-gray-600"
              }`}
            >
              Month
            </Button>
          </div>
        </div>
      </nav>
    </div>
  );
}



