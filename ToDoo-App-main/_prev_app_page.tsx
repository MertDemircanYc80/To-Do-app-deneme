// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth/AuthForm";
import { Sidebar } from "@/components/layout/Sidebar";
import { MainContent } from "@/components/layout/MainContent";
import RightPanel from "@/components/layout/RightPanel";
import { TaskItem } from "@/components/tasks/TaskItem";
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
  X,
  PanelRight,
} from "lucide-react";
import { createPortal } from "react-dom";

/* ---------------- utils (calendar UI i├ğin) ---------------- */
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
  const [pos, setPos] = useState({ left: 0, top: 0, width });

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

  // sa─ş panel open/close
  const [rightOpen, setRightOpen] = useState<boolean>(true);

  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // ┼Şifre de─şi┼ştir
  const [pwForm, setPwForm] = useState<{ current: string; next: string; confirm: string }>({
    current: "",
    next: "",
    confirm: "",
  });
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // --- VER─░ Y├£KLEME ---
  useEffect(() => {
    setHasMounted(true);
    const userFromStorage = authUtils.getCurrentUser();
    if (userFromStorage) {
      setAuthState({ isAuthenticated: true, user: userFromStorage });

      const userTasks = dataUtils.getUserData<Task[]>(userFromStorage.id, "tasks", []);
      const userProjects = dataUtils.getUserData<Project[]>(userFromStorage.id, "projects", []);
      const userTemplates = dataUtils.getUserData<Template[]>(userFromStorage.id, "templates", []);

      setTasks(userTasks);
      setProjects(userProjects);
      setTemplates(userTemplates);
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

  // ┼Şifre de─şi┼ştir
  const handleChangePassword = () => {
    if (!authState.user) return;

    const { current, next, confirm } = pwForm;
    if (!current || !next || !confirm) {
      setPwMsg({ type: "err", text: "T├╝m alanlar─▒ doldur." });
      return;
    }
    if (next.length < 6) {
      setPwMsg({ type: "err", text: "Yeni ┼şifre en az 6 karakter olmal─▒." });
      return;
    }
    if (next !== confirm) {
      setPwMsg({ type: "err", text: "Yeni ┼şifreler e┼şle┼şmiyor." });
      return;
    }
    if (next === current) {
      setPwMsg({ type: "err", text: "Yeni ┼şifre mevcut ┼şifre ile ayn─▒." });
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");
    const idx = users.findIndex((u: any) => u.id === authState.user!.id);
    if (idx === -1) {
      setPwMsg({ type: "err", text: "Kullan─▒c─▒ bulunamad─▒." });
      return;
    }
    if (users[idx].password !== current) {
      setPwMsg({ type: "err", text: "Mevcut ┼şifre hatal─▒." });
      return;
    }

    users[idx].password = next;
    localStorage.setItem("users", JSON.stringify(users));
    setPwMsg({ type: "ok", text: "┼Şifren g├╝ncellendi Ô£à" });
    setPwForm({ current: "", next: "", confirm: "" });
  };

  // --- HELPERS ---
  const addTask = (taskData: Omit<Task, "id" | "completed" | "pinned" | "completedOn">) => {
    const newTask: Task = { ...taskData, id: Date.now().toString(), completed: false, pinned: false };
    setTasks((prev) => [...prev, newTask]);
  };

  const createProject = (name: string) => {
    if (name.trim()) {
      const colors = ["#27AE60", "#2980B9", "#E74C3C", "#F39C12", "#9B59B6", "#1ABC9C"];
      const project: Project = {
        id: Date.now().toString(),
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
    const newSubTask: SubTask = { id: Date.now().toString(), text, completed: false };
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
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  // G├Âr├╝n├╝mler
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

  const getWeekTasks = () => {
    const dateForWeek = new Date(selectedDate);
    dateForWeek.setDate(dateForWeek.getDate() + weekOffset * 7);
    const weekStart = startOfWeek(dateForWeek);
    const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart) });
    return weekDays.map((day) => ({ date: day, tasks: getTasksForDate(day) }));
  };

  const getMonthTasks = () => {
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
  };

  const getProjectTasks = (projectId: string) => tasks.filter((t) => t.project === projectId);

  const changeView = (view: View) => {
    setCurrentView(view);
    setWeekOffset(0);
    setMonthOffset(0);
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

  // ─░statistikler
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
            onCreateProject: createProject,
            onSetView: setCurrentView,
            onSetCurrentProjectId: setCurrentProjectId,
            onUseTemplate: handleUseTemplate,
            onDeleteTemplate: handleDeleteTemplate,
            onDeleteProject: deleteProject,
          }}
        />

        {/* Ana i├ğerik: sa─ş panel a├ğ─▒ksa ekstra padding */}
        <div
          className={`flex-1 transition-all duration-300 ${
            projectsExpanded ? "ml-80" : "ml-12"
          } ${rightOpen ? "pr-80" : "pr-4"}`}
        >
          {/* Draggable donut (Today %) */}
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
                {currentView === "settings" && "Settings"}
                {currentView === "tasks" && "All Tasks"}
              </h1>

              <div className="flex items-center gap-2">
                {/* Sa─ş panel toggle */}
                <Button
                  type="button"
                  onClick={() => setRightOpen((s) => !s)}
                  className={`h-9 px-3 rounded-md border ${
                    rightOpen
                      ? "bg-green-600 text-white"
                      : "bg-gray-800 text-gray-200 border-gray-700"
                  }`}
                  aria-pressed={rightOpen}
                  title={rightOpen ? "Hide right panel" : "Show right panel"}
                >
                  <PanelRight className="w-4 h-4" />
                </Button>

                {/* Tarih butonu */}
                <div className="relative">
                  <button
                    ref={headerBtnRef}
                    type="button"
                    onClick={() => setOpenHeaderCal((s) => !s)}
                    className="h-9 px-3 rounded-md bg-gray-800 border border-gray-700 text-white flex items-center gap-2"
                    aria-haspopup="dialog"
                    aria-expanded={openHeaderCal}
                    title="Pick a date"
                  >
                    <span className="tabular-nums">{formatDate(selectedDate, "dd.MM.yyyy")}</span>
                    <CalendarIcon className="w-4 h-4 text-gray-300" />
                  </button>

                  <AnchoredPortal
                    anchorEl={headerBtnRef.current}
                    open={openHeaderCal}
                    onClose={() => setOpenHeaderCal(false)}
                    width={320}
                  >
                    <CalendarPanel
                      value={toYMD(selectedDate)}
                      onChange={(ymd) => {
                        setSelectedDate(new Date(ymd));
                        setOpenHeaderCal(false);
                      }}
                      onClose={() => setOpenHeaderCal(false)}
                    />
                  </AnchoredPortal>
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

        {/* Sa─ş sabit panel (slide-in/out) */}
        <RightPanel open={rightOpen} onToggle={() => setRightOpen((s) => !s)} />
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
