"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

type Habit = {
  id: string;
  name: string;
  done?: Record<string, true>; // yyyy-mm-dd -> true
};

const months = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const daysShort = ["S", "M", "T", "W", "T", "F", "S"];
const pad2 = (n: number) => String(n).padStart(2, "0");
const toYMD = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export default function HabitChain({ columns = 1 }: { columns?: 1 | 2 }) {
  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const raw = localStorage.getItem("ui:habits");
      return raw ? (JSON.parse(raw) as Habit[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ui:habits", JSON.stringify(habits));
    } catch {}
  }, [habits]);

  const addHabit = (name: string) => {
    const t = (name || "").trim();
    if (!t) return;
    setHabits((prev) => [{ id: Date.now().toString(), name: t, done: {} }, ...prev]);
  };

  const removeHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleDay = (id: string, ymd: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const next = { ...(h.done || {}) } as Record<string, true>;
        if (next[ymd]) delete next[ymd];
        else next[ymd] = true;
        return { ...h, done: next };
      })
    );
  };

  return (
    <div className="space-y-3">
      <NewHabitInput onAdd={addHabit} />

      {/* Empty-state text removed to avoid duplicate guidance with the input placeholder */}

      <div className={`${columns === 2 ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : "grid grid-cols-1 gap-3"}`}>
        {habits.map((h) => (
          <HabitCard
            key={h.id}
            habit={h}
            onToggleDay={toggleDay}
            onRemove={() => removeHabit(h.id)}
          />
        ))}
      </div>
    </div>
  );
}

function NewHabitInput({ onAdd }: { onAdd: (name: string) => void }) {
  const [val, setVal] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  const autoResize = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    const h = Math.min(el.scrollHeight, 72); // ~3 satir
    el.style.height = `${h}px`;
  };

  useEffect(() => {
    autoResize();
  }, [val]);

  const add = () => {
    const t = val.trim();
    if (!t) return;
    onAdd(t);
    setVal("");
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900 p-2">
      <div className="flex items-start gap-2">
        <textarea
          ref={taRef}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") add();
          }}
          placeholder="Add a new habit (e.g., Drink water)"
          className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder-gray-400"
          rows={1}
          maxLength={120}
        />
        <Button
          onClick={add}
          className="bg-green-600 hover:bg-green-700 h-8 px-3"
          aria-label="Add"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function HabitCard({
  habit,
  onToggleDay,
  onRemove,
}: {
  habit: Habit;
  onToggleDay: (id: string, ymd: string) => void;
  onRemove: () => void;
}) {
  const [cursor, setCursor] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = first.getDay(); // 0..6 (Sun..Sat)
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [cursor]);

  const [name, setName] = useState(habit.name);
  const [editing, setEditing] = useState(false);
  const nameRef = useRef<HTMLTextAreaElement | null>(null);

  const commitName = () => {
    const t = (name || "").trim();
    setName(t);
    setEditing(false);
    try {
      const raw = localStorage.getItem("ui:habits");
      if (!raw) return;
      const list = JSON.parse(raw) as Habit[];
      const idx = list.findIndex((x) => x.id === habit.id);
      if (idx !== -1) {
        list[idx].name = t || habit.name;
        localStorage.setItem("ui:habits", JSON.stringify(list));
      }
    } catch {}
  };

  useEffect(() => {
    if (!editing || !nameRef.current) return;
    const el = nameRef.current;
    el.style.height = "0px";
    const h = Math.min(el.scrollHeight, 72);
    el.style.height = `${h}px`;
  }, [name, editing]);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/70 overflow-hidden">
      <div className="px-3 pt-3 pb-2 flex items-start gap-2">
        <div className="flex-1">
          {editing ? (
            <textarea
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) commitName();
              }}
              className="w-full resize-none bg-transparent text-[13px] font-semibold text-white outline-none"
              rows={1}
              maxLength={120}
              autoFocus
            />
          ) : (
            <button onClick={() => setEditing(true)} className="block text-left w-full">
              <div className="text-[13px] font-semibold text-white line-clamp-2">
                {name || habit.name}
              </div>
            </button>
          )}
          <div className="text-[11px] text-gray-400">
            {months[cursor.getMonth()]} {cursor.getFullYear()}
          </div>
        </div>

        <div className="flex items-center gap-1 pt-1">
          <button
            onClick={() =>
              setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
            }
            className="p-1 rounded hover:bg-gray-800"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={() =>
              setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
            }
            className="p-1 rounded hover:bg-gray-800"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-gray-800"
            aria-label="Delete habit"
          >
            <Trash2 className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-3 pt-2">
        {daysShort.map((d, idx) => (
          <div
            key={`wd-${idx}`}
            className="text-[10px] text-gray-400 text-center pb-1"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 p-3 pt-1">
        {days.map((d, i) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const ymd = toYMD(d);
          const checked = !!habit.done?.[ymd];
          return (
            <button
              key={`${habit.id}-${ymd}-${i}`}
              onClick={() => onToggleDay(habit.id, ymd)}
              className={[
                "h-8 rounded text-[12px] tabular-nums border",
                checked
                  ? "bg-green-600 text-white border-green-600"
                  : inMonth
                  ? "bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
                  : "bg-gray-900 text-gray-500 border-gray-800",
              ].join(" ")}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

