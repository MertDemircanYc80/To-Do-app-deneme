"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { createPortal } from "react-dom";

type Props = {
  value?: string; // yyyy-MM-dd
  onChange: (ymd: string) => void;
  className?: string;
  placeholder?: string;
  buttonTitle?: string;
};

export default function CalendarButton({ value, onChange, className, placeholder = "Select date", buttonTitle = "Pick a date" }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const formatted = useMemo(() => value ? value : "", [value]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={className ?? "inline-flex items-center justify-center h-8 px-3 rounded-md bg-gray-800 border border-gray-700 text-white"}
        aria-haspopup="dialog"
        aria-expanded={open}
        title={buttonTitle}
      >
        <span className="capitalize">{formatted || placeholder}</span>
      </button>

      <AnchoredPortal anchorEl={btnRef.current} open={open} onClose={() => setOpen(false)} width={320}>
        <CalendarPanel
          value={value}
          onChange={(ymd) => {
            onChange(ymd);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      </AnchoredPortal>
    </div>
  );
}

function AnchoredPortal({ anchorEl, open, width = 320, onClose, children }: { anchorEl: HTMLElement | null; open: boolean; width?: number; onClose: () => void; children: React.ReactNode; }) {
  const [pos, setPos] = useState({ left: -99999, top: -99999, width });
  const ticking = useRef(false);

  useEffect(() => {
    if (!open || !anchorEl) return;
    const update = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        if (!anchorEl) { ticking.current = false; return; }
        const r = anchorEl.getBoundingClientRect();
        const left = Math.min(Math.max(8, r.left + window.scrollX), window.scrollX + window.innerWidth - width - 8);
        const top = r.bottom + window.scrollY + 8;
        setPos({ left, top, width });
        ticking.current = false;
      });
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
      <div className="fixed z-[61]" style={{ left: pos.left, top: pos.top, width: pos.width }} onMouseDown={(e) => e.stopPropagation()}>
        {children}
      </div>
    </>,
    document.body
  );
}

function CalendarPanel({ value, onChange, onClose }: { value?: string; onChange: (ymd: string) => void; onClose: () => void; }) {
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
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

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
            <button key={i} onClick={() => { onChange(toYMD(d)); onClose(); }} type="button" className={[
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

