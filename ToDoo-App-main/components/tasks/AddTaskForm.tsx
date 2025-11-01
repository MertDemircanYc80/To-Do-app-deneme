// components/tasks/AddTaskForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Task, type Project } from "@/types";
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCw,
  X,
} from "lucide-react";

/* ---------------- utils ---------------- */
const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const daysShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
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
  // start off-screen to prevent a brief flash at (0,0) before measuring
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
  const [cursor, setCursor] = useState<Date>(startOfMonth(selected ?? new Date()));

  const days = useMemo(() => {
    const start = startOfMonth(cursor);
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
          type="button"
          aria-label="Previous month"
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
            type="button"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={onClose}
            className="ml-1 p-1 rounded hover:bg-gray-800"
            type="button"
            aria-label="Close"
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

/* ---------------- clock panel ---------------- */
type ClockPanelProps = {
  initial?: string;
  onApply: (time: string | null) => void;
  onClose: () => void;
};

const cx = 110, cy = 110, R = 90;
const rad = (deg: number) => (deg - 90) * (Math.PI / 180);

function ClockPanel({ initial, onApply, onClose }: ClockPanelProps) {
  const initH = useMemo(() => {
    if (!initial) return 0;
    const [h] = initial.split(":").map(Number);
    return Number.isFinite(h) ? h : 0;
  }, [initial]);

  const initM = useMemo(() => {
    if (!initial) return 0;
    const [, m] = initial.split(":").map(Number);
    return Number.isFinite(m) ? m : 0;
  }, [initial]);

  const [mode, setMode] = useState<"hour" | "minute">("hour");
  const [h, setH] = useState<number>(initH);
  const [m, setM] = useState<number>(initM - (initM % 5));

  const hourMarks = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minuteMarks = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []);
  const angle = mode === "hour" ? (h / 24) * 360 : (m / 60) * 360;

  const apply = () => {
    onApply(`${pad2(h)}:${pad2(m)}`);
    onClose();
  };

  const clear = () => {
    onApply(null);
    onClose();
  };

  return (
    <div className="rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl w-[320px] sm:w-[340px]">
      <div className="px-3 py-2 flex items-center justify-between border-b border-gray-800">
        <div className="text-[13px] text-gray-300">
          Time: <span className="tabular-nums text-white">{pad2(h)}:{pad2(m)}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="text-[12px] text-gray-300 hover:text-white" onClick={clear} type="button">
            Clear
          </button>
          <button className="p-1 rounded hover:bg-gray-800" onClick={onClose} aria-label="Close" type="button">
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="p-3">
        <div className="mx-auto w-[220px] h-[220px] relative select-none">
          <svg width={220} height={220} viewBox="0 0 220 220" className="block">
            <circle cx={cx} cy={cy} r={R} className="fill-gray-800 stroke-gray-700" strokeWidth="1" />
            <g transform={`rotate(${angle} ${cx} ${cy})`}>
              <line x1={cx} y1={cy} x2={cx} y2={cy - R + 16} className="stroke-green-400" strokeWidth="2.5" />
              <circle cx={cx} cy={cy - R + 16} r="4" className="fill-green-400" />
            </g>
            <circle cx={cx} cy={cy} r="3.5" className="fill-green-400" />
          </svg>

          {mode === "hour" && (
            <div className="absolute inset-0">
              {hourMarks.map((val) => {
                const a = (val / 24) * 360;
                const x = cx + (R - 20) * Math.cos(rad(a));
                const y = cy + (R - 20) * Math.sin(rad(a));
                const active = val === h;
                return (
                  <button
                    key={val}
                    type="button"
                    style={{ left: x, top: y }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 text-[11px] tabular-nums w-7 h-7 rounded-full
                      ${active ? "bg-green-600/30 text-white" : "text-gray-300 hover:bg-gray-700/60"}`}
                    onClick={() => {
                      setH(val);
                      setMode("minute");
                    }}
                    title={pad2(val)}
                  >
                    {pad2(val)}
                  </button>
                );
              })}
            </div>
          )}

          {mode === "minute" && (
            <div className="absolute inset-0">
              {minuteMarks.map((val) => {
                const a = (val / 60) * 360;
                const x = cx + (R - 20) * Math.cos(rad(a));
                const y = cy + (R - 20) * Math.sin(rad(a));
                const active = val === m;
                return (
                  <button
                    key={val}
                    type="button"
                    style={{ left: x, top: y }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 text-[11px] tabular-nums w-7 h-7 rounded-full
                      ${active ? "bg-green-600/30 text-white" : "text-gray-300 hover:bg-gray-700/60"}`}
                    onClick={() => setM(val)}
                    title={pad2(val)}
                  >
                    {pad2(val)}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-1">
          <div className="flex gap-1 text-[12px] text-gray-400">
            <button
              type="button"
              onClick={() => setMode("hour")}
              className={`px-2 py-1 rounded-md border ${
                mode === "hour" ? "border-green-500 text-green-400" : "border-gray-700"
              }`}
            >
              Hour
            </button>
            <button
              type="button"
              onClick={() => setMode("minute")}
              className={`px-2 py-1 rounded-md border ${
                mode === "minute" ? "border-green-500 text-green-400" : "border-gray-700"
              }`}
            >
              Minute
            </button>
          </div>
          <Button onClick={apply} className="h-8 px-3 bg-green-600 hover:bg-green-700">
            Set
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- AddTaskForm (main) ---------------- */
interface AddTaskFormProps {
  projects: Project[];
  onAddTask: (
    taskData: Omit<Task, "id" | "completed" | "pinned" | "completedOn" | "subTasks" | "notes">
  ) => void;
  selectedDate: Date;
}

export const AddTaskForm = ({ projects, onAddTask, selectedDate }: AddTaskFormProps) => {
  const [text, setText] = useState("");
  const [taskDate, setTaskDate] = useState<string>(() => toYMD(new Date(selectedDate)));
  const [timeStr, setTimeStr] = useState<string>("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [projectId, setProjectId] = useState<string>("");
  const [duration, setDuration] = useState<number>(15);

  // Repeat
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] =
    useState<"daily" | "weekly" | "monthly" | "specific-days">("daily");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [specificDays, setSpecificDays] = useState<number[]>([]);

  // popovers
  const [openDate, setOpenDate] = useState(false);
  const [openClock, setOpenClock] = useState(false);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const timeBtnRef = useRef<HTMLButtonElement>(null);

  /** ğŸ”’ Sonsuz dÃ¶ngÃ¼yÃ¼ Ã¶nle:
   *  - selectedDate'i string key'e Ã§evir
   *  - aynÄ± deÄŸeri tekrar set etme
   */
  const selectedDateKey = useMemo(
    () => new Date(selectedDate).toDateString(),
    [selectedDate]
  );

  useEffect(() => {
    const next = toYMD(new Date(selectedDate));
    setTaskDate((prev) => (prev === next ? prev : next));
  }, [selectedDateKey]);

  const applyQuickDur = (m: number) => setDuration(m);

  const handleSubmit = () => {
    const title = text.trim();
    if (!title) return;

    const safeDuration = Number.isFinite(duration) ? duration : 15;
    const safeInterval = Math.max(1, Number.isFinite(recurringInterval) ? recurringInterval : 1);

    const payload: Omit<
      Task,
      "id" | "completed" | "pinned" | "completedOn" | "subTasks" | "notes"
    > = {
      text: title,
      date: taskDate || undefined,
      time: timeStr || undefined,
      priority,
      project: projectId || undefined,
      duration: safeDuration || undefined,
      recurring: isRecurring
        ? {
            type: recurringType,
            interval: safeInterval,
            startDate: taskDate || undefined,
            specificDays: recurringType === "specific-days" ? specificDays : undefined,
          }
        : undefined,
    };

    onAddTask(payload);

    // reset
    setText("");
    setTimeStr("");
    setPriority("medium");
    setProjectId("");
    setDuration(15);
    setIsRecurring(false);
    setRecurringType("daily");
    setRecurringInterval(1);
    setSpecificDays([]);
    setOpenDate(false);
    setOpenClock(false);
  };

  return (
    <Card className="p-1 bg-gray-900/70 border border-gray-700">
      {/* Title */}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a new task..."
        className="bg-gray-800 border-gray-700 text-white placeholder-gray-400 rounded-md px-3 h-9 mb-1 text-[13px]"
        aria-label="Task title"
      />

      {/* Single row */}
      <div className="grid grid-cols-12 items-end gap-1 text-[13px]">
        {/* Date */}
        <div className="col-span-2">
          <label className="text-[11px] text-gray-400 mb-0.5 block">Date</label>
          <button
            ref={dateBtnRef}
            type="button"
            onClick={() => { setOpenDate((s) => !s); setOpenClock(false); }}
            className="w-full h-9 rounded-md bg-gray-800 border border-gray-700 text-white px-2 text-left flex items-center justify-between"
            aria-haspopup="dialog"
            aria-expanded={openDate}
          >
            <span className="flex items-center gap-1">
              <CalendarIcon className="w-4 h-4 text-gray-300" />
              <span className="tabular-nums">{taskDate || "--/--/----"}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          <AnchoredPortal anchorEl={dateBtnRef.current} open={openDate} onClose={() => setOpenDate(false)} width={320}>
            <CalendarPanel value={taskDate} onChange={(d) => setTaskDate(d)} onClose={() => setOpenDate(false)} />
          </AnchoredPortal>
        </div>

        {/* Time */}
        <div className="col-span-2">
          <label className="text-[11px] text-gray-400 mb-0.5 block">Time</label>
          <button
            ref={timeBtnRef}
            type="button"
            onClick={() => { setOpenClock((s) => !s); setOpenDate(false); }}
            className="w-full h-9 rounded-md bg-gray-800 border border-gray-700 text-white px-2 text-left flex items-center justify-between"
            aria-haspopup="dialog"
            aria-expanded={openClock}
          >
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-300" />
              <span className="tabular-nums">{timeStr || "--:--"}</span>
            </span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          <AnchoredPortal anchorEl={timeBtnRef.current} open={openClock} onClose={() => setOpenClock(false)} width={340}>
            <ClockPanel initial={timeStr} onApply={(val) => setTimeStr(val ?? "")} onClose={() => setOpenClock(false)} />
          </AnchoredPortal>
        </div>

        {/* Priority */}
        <div className="col-span-2">
          <label className="text-[11px] text-gray-400 mb-0.5 block">Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task["priority"])}
            className="w-full h-9 rounded-md bg-gray-800 border border-gray-700 text-white px-2"
          >
            <option value="lowest">Lowest</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="highest">Highest</option>
          </select>
        </div>

        {/* Project */}
        <div className="col-span-2">
          <label className="text-[11px] text-gray-400 mb-0.5 block">Project</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full h-9 rounded-md bg-gray-800 border border-gray-700 text-white px-2"
          >
            <option value="">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Duration + Repeat */}
        <div className="col-span-4">
          <div className="grid grid-cols-12 gap-1 items-end">
            <div className="col-span-9">
              <label className="text-[11px] text-gray-400 mb-0.5 block">Duration</label>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={5}
                  step={5}
                  value={duration}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setDuration(Number.isFinite(v) ? v : 15);
                  }}
                  className="h-9 w-[70px] bg-gray-800 border-gray-700 text-white text-sm tabular-nums"
                />
                <span className="text-[12px] text-gray-400">min</span>
                {[15, 30, 45, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    className={`h-8 px-2 rounded-md text-[12px] border transition-colors ${
                      duration === m
                        ? "bg-green-600/20 border-green-500 text-green-300"
                        : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-3">
              <label className="text-[11px] text-gray-400 mb-0.5 block text-right sm:text-left">Repeat</label>
              <div className="flex justify-end sm:justify-start">
                <button
                  type="button"
                  onClick={() => setIsRecurring((s) => !s)}
                  className={`h-9 px-3 rounded-md border text-[13px] flex items-center gap-1 ${
                    isRecurring
                      ? "bg-green-600/20 border-green-600 text-green-300"
                      : "bg-gray-800 border-gray-700 text-gray-300"
                  }`}
                  aria-pressed={isRecurring}
                  title="Toggle repeat"
                >
                  <RotateCw className="w-4 h-4" />
                  {isRecurring ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isRecurring && (
        <div className="mt-1 grid grid-cols-12 items-center gap-1 text-[13px]">
          <div className="col-span-3 flex items-center gap-1">
            <label className="text-[11px] text-gray-400 w-14">Type</label>
            <select
              value={recurringType}
              onChange={(e) => setRecurringType(e.target.value as any)}
              className="h-8 flex-1 rounded-md bg-gray-800 border border-gray-700 text-white px-2 text-[12px]"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="specific-days">Specific Days</option>
            </select>
          </div>

          {recurringType !== "specific-days" ? (
            <div className="col-span-3 flex items-center gap-1">
              <label className="text-[11px] text-gray-400 w-14">Every</label>
              <Input
                type="number"
                min={1}
                value={recurringInterval}
                onChange={(e) => {
                  const v = parseInt(e.target.value || "1", 10);
                  setRecurringInterval(Math.max(1, Number.isFinite(v) ? v : 1));
                }}
                className="h-8 w-16 bg-gray-800 border-gray-700 text-white text-[12px]"
              />
              <span className="text-[11px] text-gray-400">
                {recurringType === "daily"
                  ? "day(s)"
                  : recurringType === "weekly"
                  ? "week(s)"
                  : "month(s)"}
              </span>
            </div>
          ) : (
            <div className="col-span-6 flex items-center gap-1">
              <label className="text-[11px] text-gray-400 w-14">Days</label>
              <div className="flex flex-wrap gap-1">
                {daysShort.map((d, i) => {
                  const active = specificDays.includes(i);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setSpecificDays((prev) =>
                          active ? prev.filter((x) => x !== i) : [...prev, i]
                        )
                      }
                      className={`px-2 py-1 rounded-md text-[11px] border ${
                        active
                          ? "bg-green-600/20 border-green-600 text-green-300"
                          : "bg-gray-800 border-gray-700 text-gray-300"
                      }`}
                      aria-pressed={active}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div className="col-span-3" />
        </div>
      )}

      <Button
        onClick={handleSubmit}
        className="w-full mt-1 bg-green-600 hover:bg-green-700 text-white h-10 rounded-md text-[14px]"
      >
        + Add Task
      </Button>
    </Card>
  );
};

