"use client";
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddTaskForm } from "@/components/tasks/AddTaskForm";
import { TaskItem } from "@/components/tasks/TaskItem";
import { type Task, type Project, type AuthState, type View } from "@/types";
import type { DayTemplate } from "@/lib/day-templates";
import { formatDate, normalizeDate, darkPalette } from "@/lib/utils";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import CalendarButton from "@/components/ui/CalendarButton";
import { createPortal } from "react-dom";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

// Lightweight set of motivational quotes (English + subtle emoji)
const MOTIVATIONAL_QUOTES: { author: string; text: string; emoji: string }[] = [
  { author: "Benjamin Franklin", text: "Failing to plan is planning to fail.", emoji: "🧭" },
  { author: "Leonardo da Vinci", text: "While I thought that I was learning how to live, I have been learning how to die.", emoji: "🎨" },
  { author: "Naval Ravikant", text: "The best way to become rich is to spend your time wisely.", emoji: "⏳" },
  { author: "Charles Darwin", text: "A man who dares to waste one hour of time has not discovered the value of life.", emoji: "🕰️" },
  { author: "Abraham Lincoln", text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", emoji: "🪓" },
];

interface MainContentProps {
  currentView: View;
  tasks: Task[];
  projects: Project[];
  getTodayTasks: () => Task[];
  getWeekTasks: () => { date: Date; tasks: Task[] }[];
  getMonthTasks: () => {
    date: Date;
    tasks: Task[];
    isCurrentMonth: boolean;
  }[][];
  getProjectTasks: (projectId: string) => Task[];
  currentProjectId: string;
  dayTemplates: DayTemplate[];
  currentDayTemplateId: string;
  selectedDate: Date;
  onAddTask: (
    taskData: Omit<
      Task,
      "id" | "completed" | "pinned" | "completedOn" | "subTasks" | "notes"
    >
  ) => void;
  weekOffset: number;
  setWeekOffset: (offset: number) => void;
  currentWeekStart: Date;
  currentWeekEnd: Date;
  monthOffset: number;
  setMonthOffset: (offset: number) => void;
  dayNames: string[];
  authState: AuthState;

  // account
  isEditingAccount: boolean;
  editUsername: string;
  setEditUsername: (v: string) => void;
  editEmail: string;
  setEditEmail: (v: string) => void;
  editPassword: string;
  setEditPassword: (v: string) => void;
  handleAccountEdit: () => void;
  handleAccountSave: () => void;
  setIsEditingAccount: (b: boolean) => void;
  handleLogout: () => void;

  setSelectedDate: (date: Date) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;

  // password
  pwForm: { current: string; next: string; confirm: string };
  setPwForm: React.Dispatch<
    React.SetStateAction<{ current: string; next: string; confirm: string }>
  >;
  pwMsg: { type: "ok" | "err"; text: string } | null;
  setPwMsg: React.Dispatch<
    React.SetStateAction<{ type: "ok" | "err"; text: string } | null>
  >;
  onChangePassword: () => void;

  // templates & render
  onCreateTemplateFromTask?: (taskId: string, templateName: string) => void;
  renderTasks?: (tasks: Task[], view: View) => React.ReactNode;

  // day template edit/apply
  onApplyDayTemplate?: (templateId: string, ymd?: string) => void;
  onAddBlueprint?: (
    templateId: string,
    blueprint: { text: string; priority?: Task["priority"]; time?: string; project?: string }
  ) => void;
  onDeleteBlueprint?: (templateId: string, index: number) => void;
  onUpdateBlueprint?: (
    templateId: string,
    index: number,
    patch: Partial<{ text: string; priority: Task["priority"]; time: string; project: string }>
  ) => void;
  onAddBlueprintSubTask?: (taskKey: string, subTaskText: string) => void;
  onToggleBlueprintSubTask?: (taskKey: string, subTaskId: string) => void;
  onDeleteBlueprintSubTask?: (taskKey: string, subTaskId: string) => void;
  onUpdateBlueprintNotes?: (taskKey: string, notes: string) => void;
  onUpdateBlueprintText?: (taskKey: string, newText: string) => void;

  // subtasks & notes
  onAddSubTask: (taskId: string, subTaskText: string) => void;
  onToggleSubTask: (taskId: string, subTaskId: string) => void;
  onDeleteSubTask: (taskId: string, subTaskId: string) => void;
  onUpdateNotes: (taskId: string, notes: string) => void;
  onUpdateTaskText?: (taskId: string, newText: string) => void;
}

export const MainContent = (props: MainContentProps) => {
  const {
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
    onAddTask,
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

    setSelectedDate,
    setTasks,

    // password
    pwForm,
    setPwForm,
    pwMsg,
    setPwMsg,
    onChangePassword,

    // templates
    onCreateTemplateFromTask,

    // day template edit/apply
    onApplyDayTemplate,
    onAddBlueprint,
    onDeleteBlueprint,
    onUpdateBlueprint,
    onAddBlueprintSubTask,
    onToggleBlueprintSubTask,
    onDeleteBlueprintSubTask,
    onUpdateBlueprintNotes,
    onUpdateBlueprintText,

    // subtasks & notes
    onAddSubTask,
    onToggleSubTask,
    onDeleteSubTask,
    onUpdateNotes,
  } = props;

  const [showAdd, setShowAdd] = useState(false);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);

  const todayStr = formatDate(normalizeDate(new Date()), "yyyy-MM-dd");
  const emptyQuote = useMemo(() => MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)], []);

  // ---- helpers ----
  const toMinutes = (t?: string) => {
    if (!t) return Number.POSITIVE_INFINITY;
    const [h, m] = t.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
    return h * 60 + m;
  };
  const sortByTimeAsc = (a: Task, b: Task) => toMinutes(a.time) - toMinutes(b.time);

  // id yardÄ±mcÄ±larÄ± (gÃ¼n-bazlÄ± toggle iÃ§in)
  const getOriginalTaskId = (id: string) => {
    const m = id.match(/\d{4}-\d{2}-\d{2}$/);
    if (!m) return id;
    return id.slice(0, -m[0].length - 1);
  };
  const getDateFromSuffixedId = (id: string): string | null => {
    const m = id.match(/(\d{4}-\d{2}-\d{2})$/);
    return m ? m[1] : null;
  };

  const isDoneOn = (task: Task, date: Date): boolean => {
    const dateStr = formatDate(date, "yyyy-MM-dd");
    if (task.completedOn && task.completedOn[dateStr]) return true;
    if (!task.recurring && task.date === dateStr && task.completed) return true;
    return false;
  };

  const handleUpdateTaskText = (taskId: string, newText: string) => {
    const baseId = getOriginalTaskId(taskId);
    setTasks((prev) =>
      prev.map((task) => (task.id === baseId ? { ...task, text: newText } : task))
    );
  };

  // DnD: sadece date deÄŸiÅŸir (sanal id -> base id)
  const handleDragEnd = (result: DropResult) => {
    const dest = result.destination;
    if (!dest) return;
    const src = result.source;
    const destId = dest.droppableId; // YYYY-MM-DD
    const srcId = src.droppableId;
    const destIndex = dest.index;
    const baseId = getOriginalTaskId(result.draggableId);

    setTasks((prev) => {
      const arr = [...prev];
      const i = arr.findIndex((t) => t.id === baseId);
      if (i === -1) return prev;
      // 1) Update date
      arr[i] = { ...arr[i], date: destId };

      // 2) Recompute order for source and dest days using destination index
      const getList = (ymd: string) => arr.filter((t) => t.date === ymd);
      const byOrderThenTime = (a: Task, b: Task) => {
        const ao = (a.order ?? Number.MAX_SAFE_INTEGER);
        const bo = (b.order ?? Number.MAX_SAFE_INTEGER);
        if (ao !== bo) return ao - bo;
        return sortByTimeAsc(a, b);
      };

      const srcList = getList(srcId).sort(byOrderThenTime).map((t) => t.id).filter((id) => id !== baseId);
      let destList = getList(destId).sort(byOrderThenTime).map((t) => t.id).filter((id) => id !== baseId);
      // insert dragged into destination at requested index
      const di = Math.max(0, Math.min(destIndex, destList.length));
      destList.splice(di, 0, baseId);

      // apply sequential order numbers (10 step for flexibility)
      const applyOrder = (ids: string[]) => ids.forEach((id, idx) => {
        const j = arr.findIndex((t) => t.id === id);
        if (j !== -1) arr[j] = { ...arr[j], order: idx * 10 } as Task;
      });
      applyOrder(srcList);
      applyOrder(destList);

      return arr;
    });
  };

  const toggleExpandDay = (date: Date) => {
    const dateStr = formatDate(normalizeDate(date), "yyyy-MM-dd");
    setExpandedDays((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]
    );
  };

  const getPriorityColor = useCallback((p: Task["priority"]) => {
    switch (p) {
      case "lowest":
        return "#6b7280";
      case "low":
        return "#3b82f6";
      case "medium":
        return "#eab308";
      case "high":
        return "#f97316";
      case "highest":
        return "#ef4444";
      default:
        return "#22c55e";
    }
  }, []);

  const togglePin = useCallback(
    (id: string) => {
      const baseId = getOriginalTaskId(id);
      setTasks((prev) => prev.map((t) => (t.id === baseId ? { ...t, pinned: !t.pinned } : t)));
    },
    [setTasks]
  );

  const deleteTask = useCallback(
    (id: string) => {
      const baseId = getOriginalTaskId(id);
      setTasks((prev) => prev.filter((t) => t.id !== baseId));
    },
    [setTasks]
  );

  const weekdayLabel = (d: Date) => dayNames[(d.getDay() + 6) % 7];

  // Month title in English (MMMM yyyy)
  const monthTitle = useMemo(
    () =>
      new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() + monthOffset,
        1
      ).toLocaleString("en-US", { month: "long", year: "numeric" }),
    [selectedDate, monthOffset]
  );

  // Week title (20â€“26 Oct â€¢ Week 42)
  const getIsoWeek = (d: Date) => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil(
      (((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7
    );
  };
    const weekTitle = (start: Date, end: Date) => {
    const sameMonth = start.getMonth() === end.getMonth();
    const sm = start.toLocaleString("en-US", { month: "short" });
    const em = end.toLocaleString("en-US", { month: "short" });
    const rangeStr = sameMonth
      ? `${start.getDate()} - ${end.getDate()} ${em}`
      : `${start.getDate()} ${sm} - ${end.getDate()} ${em}`;
    const isoWeek = getIsoWeek(start);
    return `${rangeStr} - Week ${isoWeek}`;
  };

  // GÃ¼n-bazlÄ± toggle
  const toggleTaskByDate = useCallback(
    (id: string, dateOverride?: Date) => {
      const baseId = getOriginalTaskId(id);
      const suffixYmd = getDateFromSuffixedId(id);
      const date = dateOverride ?? (suffixYmd ? new Date(suffixYmd) : undefined);

      if (!date) {
        setTasks((prev) =>
          prev.map((t) => (t.id === baseId ? { ...t, completed: !t.completed } : t))
        );
        return;
      }

      const dateStr = formatDate(normalizeDate(date), "yyyy-MM-dd");
      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== baseId) return t;

          if (t.recurring) {
            const next = { ...(t.completedOn || {}) };
            if (next[dateStr]) delete next[dateStr];
            else next[dateStr] = true;
            return { ...t, completedOn: next };
          }

          if (t.date === dateStr) {
            return { ...t, completed: !t.completed };
          }
          return t;
        })
      );
    },
    [setTasks]
  );

  return (
    <main className="relative isolate p-4 pb-20">
      {/* Solid backdrop to prevent faint diagonal banding */}
      <div aria-hidden className="absolute inset-0 -z-10" style={{ backgroundColor: darkPalette.background }} />
      <DragDropContext onDragEnd={handleDragEnd}>
      {currentView === "day-template" && (
        <DayTemplateView
          template={dayTemplates.find((t) => t.id === currentDayTemplateId) || null}
          projects={projects}
          onApply={onApplyDayTemplate}
          onAddBlueprint={onAddBlueprint}
          onDeleteBlueprint={onDeleteBlueprint}
          onUpdateBlueprint={onUpdateBlueprint}
          selectedDate={selectedDate}
          onAddSubTask={onAddBlueprintSubTask}
          onToggleSubTask={onToggleBlueprintSubTask}
          onDeleteSubTask={onDeleteBlueprintSubTask}
          onUpdateNotes={onUpdateBlueprintNotes}
          onUpdateTaskText={onUpdateBlueprintText}
          getPriorityColor={getPriorityColor}
        />
      )}
      {/* SETTINGS */}
      {currentView === "settings" && (
        <div className="space-y-6">
          {/* ...mevcut settings iÃ§eriÄŸiniz... */}
        </div>
      )}

      {/* PROJECT */}
      {currentView === "project" && (
        <div className="space-y-4">
          {getProjectTasks(currentProjectId)
            .slice()
            .sort(sortByTimeAsc)
            .map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projects={projects}
                view="project"
                getPriorityColor={getPriorityColor}
                toggleTask={(id) => toggleTaskByDate(id)}
                togglePin={togglePin}
                deleteTask={deleteTask}
                onAddSubTask={onAddSubTask}
                onToggleSubTask={onToggleSubTask}
                onDeleteSubTask={onDeleteSubTask}
                onUpdateNotes={onUpdateNotes}
                onUpdateTaskText={handleUpdateTaskText}
                onCreateTemplate={onCreateTemplateFromTask}
              />
            ))}
        </div>
      )}

      {(currentView === "today" || currentView === "week" || currentView === "month") && (
        <div className="space-y-6">
          {(currentView === "today" || currentView === "week") && (
          <div id="add-task-anchor" className="sticky top-0 z-10 border border-gray-700 rounded-lg overflow-hidden shadow-md">
              <button
                onClick={() => setShowAdd((s) => !s)}
                className="w-full flex items-center justify-between px-3 py-2 text-left
                           bg-gradient-to-r from-gray-900/80 to-gray-800/60
                           hover:from-gray-800 hover:to-gray-700 transition-colors"
              >
                <span className="text-sm text-gray-200">Add a new task</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdd ? "rotate-180" : ""}`} />
              </button>
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 ${
                  showAdd ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="p-3 bg-gray-900/70">
                    <AddTaskForm projects={projects} onAddTask={onAddTask} selectedDate={selectedDate} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TODAY */}
          {currentView === "today" && (
            <Droppable droppableId={formatDate(selectedDate, "yyyy-MM-dd")}>
              {(provided) => (
                <div
                    className="space-y-3"
                    style={{ backgroundColor: darkPalette.background }}
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    {getTodayTasks().length === 0 && (
                      <div className="rounded-xl p-[1px] bg-gradient-to-r from-green-600/30 via-blue-600/30 to-purple-600/30">
                        <div className="rounded-[11px] bg-gray-900/70 border border-gray-800 px-5 py-4 text-center shadow-inner">
                          <div className="mt-0.5 text-[15px] italic text-gray-100">{emptyQuote.text}</div>
                          <div className="mt-1 text-[12px] text-gray-400">— {emptyQuote.author} {emptyQuote.emoji}</div>
                          <div className="mt-3 flex justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                try { setShowAdd(true); } catch {}
                                try { document.getElementById('add-task-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch {}
                              }}
                              className="h-8 px-3 rounded-md bg-green-600 hover:bg-green-700 text-white text-[12px]"
                              aria-label="Add a task"
                            >
                              + Add a task
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    {getTodayTasks()
                      .slice()
                      .sort(sortByTimeAsc)
                      .map((task, index) => {
                        const ymd = formatDate(selectedDate, "yyyy-MM-dd");
                        const virtualId = `${task.id}-${ymd}`;
                        const completedForDay = isDoneOn(task, selectedDate);

                        return (
                          <Draggable key={virtualId} draggableId={virtualId} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                <TaskItem
                                  task={{ ...task, id: virtualId, completed: completedForDay }}
                                  projects={projects}
                                  view="today"
                                  getPriorityColor={getPriorityColor}
                                  toggleTask={(id) => toggleTaskByDate(id, selectedDate)}
                                  togglePin={togglePin}
                                  deleteTask={deleteTask}
                                  onAddSubTask={onAddSubTask}
                                  onToggleSubTask={onToggleSubTask}
                                  onDeleteSubTask={onDeleteSubTask}
                                  onUpdateNotes={onUpdateNotes}
                                  onUpdateTaskText={handleUpdateTaskText}
                                  onCreateTemplate={onCreateTemplateFromTask}
                                />
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
          )}

          {/* WEEK */}
          {currentView === "week" && (
            <div>
                <div className="flex items-center justify-between mb-4">
                  <Button onClick={() => setWeekOffset(weekOffset - 1)}>Previous</Button>
                  <h2 className="text-lg font-semibold text-white">
                    {weekTitle(currentWeekStart, currentWeekEnd)}
                  </h2>
                  <Button onClick={() => setWeekOffset(weekOffset + 1)}>Next</Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                  {getWeekTasks().map(({ date, tasks }, index) => {
                    const isToday =
                      formatDate(normalizeDate(date), "yyyy-MM-dd") === todayStr;
                    const sorted = tasks
                      .slice()
                      .sort((a, b) => {
                        const ao = a.order ?? Number.MAX_SAFE_INTEGER;
                        const bo = b.order ?? Number.MAX_SAFE_INTEGER;
                        if (ao !== bo) return ao - bo;
                        return sortByTimeAsc(a, b);
                      });
                    const ymd = formatDate(date, "yyyy-MM-dd");
                    const isWeekend = [0, 6].includes(date.getDay());
                    const count = sorted.length;

                    return (
                      <Droppable key={index} droppableId={ymd}>
                        {(provided) => (
                          <div
                            className={`space-y-2 p-2 rounded-lg shadow-sm border ${
                              isToday
                                ? "border-green-500 bg-gray-800/80"
                                : isWeekend
                                ? "border-gray-700 bg-gray-900/80"
                                : "border-gray-700 bg-gray-900/60"
                            } hover:border-green-600 transition-colors`}
                          >
                            {/* SADECE baÅŸlÄ±k tÄ±klanÄ±nca gÃ¼n seÃ§ilsin */}
                            <div className="flex items-center justify-between px-1">
                              <button
                                type="button"
                                className="text-sm font-semibold text-white cursor-pointer hover:text-green-400"
                                onClick={() => props.setSelectedDate(date)}
                              >
                                {weekdayLabel(date)} {date.getDate()} {date.toLocaleString("en-US", { month: "short" })}
                              </button>
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                                {count}
                              </span>
                            </div>

                            <div className="space-y-1" ref={provided.innerRef} {...provided.droppableProps}>
                              {sorted.map((task, i) => {
                                const virtualId = `${task.id}-${ymd}`;
                                const completedForDay = isDoneOn(task, date);
                                return (
                                  <Draggable key={task.id} draggableId={task.id} index={i}>
                                    {(dragProvided, dragSnapshot) => (
                                      <div
                                        ref={dragProvided.innerRef}
                                        {...dragProvided.draggableProps}
                                        {...dragProvided.dragHandleProps}
                                        style={{
                                          ...(dragProvided.draggableProps.style || {}),
                                          ...(dragSnapshot.isDropAnimating ? { transitionDuration: "0.001s" } : {}),
                                        }}
                                        className={dragSnapshot.isDragging ? "ring-1 ring-green-500/60 rounded-md shadow-lg scale-[1.01] transition-all" : "transition-all"}
                                      >
                                        <TaskItem
                                          task={{ ...task, id: virtualId, completed: completedForDay }}
                                          projects={projects}
                                          view="week"
                                          getPriorityColor={getPriorityColor}
                                          toggleTask={(id) => toggleTaskByDate(id, date)}
                                          togglePin={togglePin}
                                          deleteTask={deleteTask}
                                          onAddSubTask={onAddSubTask}
                                          onToggleSubTask={onToggleSubTask}
                                          onDeleteSubTask={onDeleteSubTask}
                                          onUpdateNotes={onUpdateNotes}
                                          onUpdateTaskText={handleUpdateTaskText}
                                          onCreateTemplate={onCreateTemplateFromTask}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>
              </div>
          )}

          {/* MONTH */}
          {currentView === "month" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-4">
                <Button onClick={() => setMonthOffset(monthOffset - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>

                <h2 className="text-lg font-semibold text-white">{monthTitle}</h2>

                <Button onClick={() => setMonthOffset(monthOffset + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayNames.map((day) => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-400 p-2">
                    {day}
                  </div>
                ))}
              </div>

              {getMonthTasks().map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
          {week.map((day, dayIndex) => {
            const isToday =
              formatDate(normalizeDate(day.date), "yyyy-MM-dd") === todayStr;
            const ymd = formatDate(day.date, "yyyy-MM-dd");
            const dateStr = ymd;
            const isExpanded = expandedDays.includes(dateStr);

            const sorted = day.tasks
              .slice()
              .sort((a, b) => {
                const ao = (a.order ?? Number.MAX_SAFE_INTEGER);
                const bo = (b.order ?? Number.MAX_SAFE_INTEGER);
                if (ao !== bo) return ao - bo;
                return sortByTimeAsc(a, b);
              });
                    const visibleTasks = isExpanded ? sorted : sorted.slice(0, 2);
                    const hiddenCount = sorted.length - visibleTasks.length;

                    return (
                      <div
                        key={dayIndex}
                        onClick={() => setSelectedDate(day.date)}
                        className={`p-2 min-h-[110px] border cursor-pointer ${
                          day.isCurrentMonth
                            ? "bg-gray-800 border-gray-700"
                            : "bg-gray-900 border-gray-700"
                        } hover:bg-gray-700`}
                      >
                        <div
                          className={`text-xs mb-1 ${
                            isToday
                              ? "bg-green-600 text-white rounded-full px-2 inline-block"
                              : "text-gray-400"
                          }`}
                        >
                          {day.date.getDate()}
                        </div>

                            <div className="space-y-1 min-h-[12px]">
                          {visibleTasks.map((task) => {
                            const virtualId = `${task.id}-${ymd}`;
                            const completedForDay = isDoneOn(task, day.date);
                            return (
                              <TaskItem
                                key={virtualId}
                                task={{ ...task, id: virtualId, completed: completedForDay }}
                                projects={projects}
                                view="month"
                                getPriorityColor={getPriorityColor}
                                toggleTask={(id) => toggleTaskByDate(id, day.date)}
                                togglePin={togglePin}
                                deleteTask={deleteTask}
                                onAddSubTask={onAddSubTask}
                                onToggleSubTask={onToggleSubTask}
                                onDeleteSubTask={onDeleteSubTask}
                                onUpdateNotes={onUpdateNotes}
                                onUpdateTaskText={handleUpdateTaskText}
                                onCreateTemplate={onCreateTemplateFromTask}
                              />
                            );
                          })}
                          {hiddenCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandDay(day.date);
                              }}
                              className="text-xs text-blue-400 hover:underline"
                            >
                              +{hiddenCount} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL TASKS */}
      {currentView === "tasks" && (
        <div className="p-6 bg-gray-900 rounded-lg">
          <h2 className="text-2xl font-bold text-white mb-6">All Tasks</h2>
          <div className="space-y-3">
            {tasks
              .slice()
              .sort(sortByTimeAsc)
              .map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  projects={projects}
                  view="tasks"
                  getPriorityColor={getPriorityColor}
                  toggleTask={(id) => toggleTaskByDate(id)}
                  togglePin={togglePin}
                  deleteTask={deleteTask}
                  onAddSubTask={onAddSubTask}
                  onToggleSubTask={onToggleSubTask}
                  onDeleteSubTask={onDeleteSubTask}
                  onUpdateNotes={onUpdateNotes}
                  onUpdateTaskText={handleUpdateTaskText}
                  onCreateTemplate={onCreateTemplateFromTask}
                />
              ))}
          </div>
        </div>
      )}
      </DragDropContext>
    </main>
  );
};

function DayTemplateView({
  template,
  projects,
  onApply,
  onAddBlueprint,
  onDeleteBlueprint,
  onUpdateBlueprint,
  selectedDate,
  onAddSubTask,
  onToggleSubTask,
  onDeleteSubTask,
  onUpdateNotes,
  onUpdateTaskText,
  getPriorityColor,
}: {
  template: DayTemplate | null;
  projects: Project[];
  onApply?: (templateId: string, ymd?: string) => void;
  onAddBlueprint?: (
    templateId: string,
    blueprint: { text: string; priority?: Task["priority"]; time?: string; project?: string }
  ) => void;
  onDeleteBlueprint?: (templateId: string, index: number) => void;
  onUpdateBlueprint?: (
    templateId: string,
    index: number,
    patch: Partial<{ text: string; priority: Task["priority"]; time: string; project: string }>
  ) => void;
  selectedDate: Date;
  onAddSubTask?: (taskKey: string, subTaskText: string) => void;
  onToggleSubTask?: (taskKey: string, subTaskId: string) => void;
  onDeleteSubTask?: (taskKey: string, subTaskId: string) => void;
  onUpdateNotes?: (taskKey: string, notes: string) => void;
  onUpdateTaskText?: (taskKey: string, newText: string) => void;
  getPriorityColor: (p: Task["priority"]) => string;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [applyDate, setApplyDate] = useState<string>("");
  const [openCal, setOpenCal] = useState(false);
  const applyBtnRef = useRef<HTMLButtonElement>(null);
  const prettyApplyDate = useMemo(() => {
    if (!applyDate) return "";
    try {
      const [y, m, d] = applyDate.split("-").map(Number);
      const dt = new Date(y, (m || 1) - 1, d || 1);
      return dt.toLocaleDateString("en-US", { day: "2-digit", month: "long", year: "numeric" });
    } catch {
      return applyDate;
    }
  }, [applyDate]);

  if (!template) {
    return <div className="p-4 text-gray-400">Select a day template.</div>;
  }

  const add = () => {
    if (!onAddBlueprint) return;
    onAddBlueprint(template.id, { text, priority, time: time || undefined, project: projectId || undefined });
    setText("");
    setTime("");
    setProjectId("");
    setPriority("medium");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">{template.name}</h2>
        <div className="ml-auto flex items-center gap-2 flex-nowrap">
          <Button
            onClick={() => onApply && onApply(template.id)}
            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            Apply Today
          </Button>
          <div className="relative shrink-0">
            <CalendarButton
              value={applyDate}
              onChange={setApplyDate}
              className="inline-flex items-center justify-center h-8 px-3 rounded-md bg-gray-800 border border-gray-700 text-white shrink-0"
              placeholder="Select date"
              buttonTitle="Pick a date"
            />
          </div>
          <Button
            onClick={() => onApply && onApply(template.id, applyDate || undefined)}
            className="h-8 px-3 bg-gray-700 hover:bg-gray-600 text-white shrink-0"
          >
            Apply Date
          </Button>
        </div>
      </div>

      {/* Add item (normal page style) */}
      <div className="sticky top-0 z-10 border border-gray-700 rounded-lg overflow-hidden shadow-md">
        <button
          onClick={() => setShowAdd((s) => !s)}
          className="w-full flex items-center justify-between px-3 py-2 text-left bg-gradient-to-r from-gray-900/80 to-gray-800/60 hover:from-gray-800 hover:to-gray-700 transition-colors"
        >
          <span className="text-sm text-gray-200">Add a new template task</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAdd ? "rotate-180" : ""}`} />
        </button>
        <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${showAdd ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden">
            <div className="p-3 bg-gray-900/70">
              <AddTaskForm
                projects={projects}
                selectedDate={selectedDate}
                onAddTask={(payload) => {
                  if (!onAddBlueprint || !template) return;
                  onAddBlueprint(template.id, {
                    text: payload.text,
                    priority: payload.priority,
                    time: payload.time,
                    project: payload.project,
                  });
                }}
              />
              <div className="mt-1 text-[11px] text-gray-500">Adds to this template; not a real task.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items (render as TaskItem for the same UX) */}
      <section className="space-y-3" style={{ backgroundColor: darkPalette.background }}>
        {template.tasks.length === 0 && (
          <div className="text-sm text-gray-500">No items yet.</div>
        )}
        {template.tasks
          .slice()
          .sort((a, b) => {
            const toMin = (t?: string) => {
              if (!t) return Number.POSITIVE_INFINITY;
              const [h, m] = t.split(":").map(Number);
              if (Number.isNaN(h) || Number.isNaN(m)) return Number.POSITIVE_INFINITY;
              return h * 60 + m;
            };
            return toMin(a.time) - toMin(b.time);
          })
          .map((bp, idx) => {
            const pseudoTask: Task = {
              id: `${template.id}:${idx}`,
              text: bp.text,
              completed: false,
              pinned: false,
              date: undefined,
              time: bp.time,
              project: bp.project,
              priority: (bp.priority ?? "medium") as Task["priority"],
              notes: bp.notes,
              subTasks: bp.subTasks as any,
            };
            return (
              <TaskItem
                key={pseudoTask.id}
                task={pseudoTask}
                projects={projects}
                view="today"
                getPriorityColor={getPriorityColor}
                toggleTask={() => { /* no-op for blueprint */ }}
                togglePin={() => { /* no-op for blueprint */ }}
                deleteTask={() => onDeleteBlueprint && onDeleteBlueprint(template.id, idx)}
                onAddSubTask={onAddSubTask}
                onToggleSubTask={onToggleSubTask}
                onDeleteSubTask={onDeleteSubTask}
                onUpdateNotes={onUpdateNotes}
                onUpdateTaskText={onUpdateTaskText}
              />
            );
          })}
      </section>
    </div>
  );
}

// Lightweight anchored portal (mirrors header date picker behavior)
function LocalAnchoredPortal({
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
  // start off-screen to avoid any flash before first measurement
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

// Minimal calendar panel matching header style
function LocalCalendarPanel({
  value,
  onChange,
  onClose,
}: {
  value?: string;
  onChange: (ymd: string) => void;
  onClose: () => void;
}) {
  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];
  const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const toYMD = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const startMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
  const addMonths = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth() + n, d.getDate());

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
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const today = new Date();

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
        <button onClick={() => setCursor(addMonths(cursor, -1))} className="p-1 rounded hover:bg-gray-800" aria-label="Previous month" type="button">
          <ChevronLeft className="w-4 h-4 text-gray-300" />
        </button>
        <div className="text-[13px] text-white">{months[cursor.getMonth()]} {cursor.getFullYear()}</div>
        <div className="flex items-center gap-1">
          <button onClick={() => setCursor(new Date())} className="px-2 py-1 text-[12px] text-gray-300 hover:text-white" type="button">Today</button>
          <button onClick={() => setCursor(addMonths(cursor, 1))} className="p-1 rounded hover:bg-gray-800" aria-label="Next month" type="button">
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button onClick={onClose} className="ml-1 p-1 rounded hover:bg-gray-800" aria-label="Close" type="button">
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pt-2">
        {daysShort.map((d) => (
          <div key={d} className="text-[11px] text-gray-400 text-center pb-1">{d}</div>
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
              onClick={() => { onChange(toYMD(d)); onClose(); }}
              type="button"
              className={[
                "h-9 rounded-md text-sm tabular-nums border",
                selectedDay ? "bg-green-600 text-white border-green-600" : todayDay ? "border-green-600/40 text-white" : "border-gray-700 text-gray-200",
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






