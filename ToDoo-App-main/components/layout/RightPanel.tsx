// components/layout/RightPanel.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import HabitChainWidget from "@/components/habits/HabitChain";
import { ChevronRight, ChevronLeft, Pause, Play, Bell, BellOff } from "lucide-react";

type RightPanelProps = {
  open: boolean;
  onClose: () => void;
  onToggle?: () => void;
};

export default function RightPanel({ open, onClose, onToggle }: RightPanelProps) {
  return (
    <>
      {/* collapsed rail trigger */}
      {!open && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed top-1/2 -translate-y-1/2 right-0 mr-0.5 h-10 w-6 z-50 flex items-center justify-center rounded-l-md border border-gray-700 bg-gray-800 text-white shadow"
          aria-label="Expand right panel"
          title="Expand"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      <aside
        aria-label="Right utilities"
        className={[
          "fixed top-0 right-0 h-screen w-80 z-40",
          "border-l border-gray-700 bg-gray-900 shadow-2xl",
          "transition-transform duration-400 ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform",
          open ? "translate-x-0" : "translate-x-full",
          "flex flex-col",
        ].join(" ")}
      >
        <div className="p-2">
          <button
            onClick={onClose}
            className="w-full h-8 flex items-center justify-center rounded-md bg-gray-700 hover:bg-gray-600 text-white border-0"
            aria-label="Collapse right panel"
            title="Collapse"
            type="button"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-modern">
          <Section title="Pomodoro">
            <Pomodoro />
          </Section>

          <Section title="Habit Chain">
            <HabitChainWidget columns={1} />
          </Section>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-700 bg-gray-800/60">
      <div className="px-4 py-2 border-b border-gray-700">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function Pomodoro() {
  // Single source of truth: total seconds remaining
  const [totalSeconds, setTotalSeconds] = useState<number>(25 * 60);
  const [running, setRunning] = useState(false);
  const [initialTotal, setInitialTotal] = useState<number>(25 * 60);
  const [muted, setMuted] = useState<boolean>(false);

  const bellRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  useEffect(() => {
    bellRef.current = new Audio(
      "data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQ4AAAAAAP8AAP8AAAD/AAAA/wAAAP8AAP8AAAD/AAAA/wAAAP8AAP8AAAD/AAAAAP8AAP8AAAAA"
    );
    if (bellRef.current) {
      bellRef.current.preload = "auto";
      bellRef.current.volume = 0.7;
    }
    try {
      const saved = localStorage.getItem("ui:pomodoro:muted");
      if (saved != null) setMuted(saved === "1" || saved === "true");
    } catch {}
  }, []);

  // Attempt to unlock audio on first user gesture
  const unlockAudio = () => {
    // WebAudio: create/resume context to satisfy autoplay policies
    try {
      if (!audioCtxRef.current) {
        const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctor) audioCtxRef.current = new Ctor();
      }
      audioCtxRef.current?.resume().catch(() => {});
    } catch {}

    const a = bellRef.current;
    if (!a) return;
    try {
      a.muted = true;
      const p = a.play();
      if (p && typeof (p as any).then === "function") {
        (p as Promise<void>)
          .then(() => {
            a.pause();
            a.currentTime = 0;
            a.muted = false;
          })
          .catch(() => {
            // ignore
          });
      }
    } catch {}
  };

  // Simple beep via WebAudio (works after unlockAudio())
  const beep = (times = 1, duration = 0.15, freq = 880) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const startAt = now + i * (duration + 0.07);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startAt);
      gain.gain.linearRampToValueAtTime(0.2, startAt + 0.01);
      gain.gain.linearRampToValueAtTime(0.0, startAt + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(startAt);
      osc.stop(startAt + duration + 0.02);
    }
  };

  // Simple, soft "ding" chime (single tone + light harmonic, percussive envelope)
  // Slightly lower and longer for a gentler feel
  const playDing = (times = 1, baseFreq = 784 /* G5 */) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    const repeatGap = 0.22;
    for (let i = 0; i < times; i++) {
      const t0 = now + i * (0.42 + repeatGap);

      const master = ctx.createGain();
      master.gain.setValueAtTime(0, t0);
      master.gain.linearRampToValueAtTime(0.32, t0 + 0.012);
      master.gain.exponentialRampToValueAtTime(0.0007, t0 + 0.55);

      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(2400, t0);
      lp.Q.value = 0.7;
      master.connect(lp).connect(ctx.destination);

      // Fundamental
      const f1 = ctx.createOscillator();
      const g1 = ctx.createGain();
      f1.type = "sine";
      f1.frequency.setValueAtTime(baseFreq, t0);
      g1.gain.setValueAtTime(1.0, t0);
      g1.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      f1.connect(g1).connect(master);
      f1.start(t0);
      f1.stop(t0 + 0.58);

      // Light harmonic (2nd) for a bell-like shimmer
      const f2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      f2.type = "sine";
      f2.frequency.setValueAtTime(baseFreq * 2, t0);
      g2.gain.setValueAtTime(0.2, t0);
      g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
      f2.connect(g2).connect(master);
      f2.start(t0);
      f2.stop(t0 + 0.42);
    }
  };

  // Ticking
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTotalSeconds((t) => {
        if (t <= 0) {
          // stop and ring
          setRunning(false);
          if (!muted) {
            // Gentle single ding; fallbacks if needed
            try { playDing(1); } catch {}
            bellRef.current?.play().catch(() => {
              try { (navigator as any)?.vibrate?.(120); } catch {}
            });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const presets = [20, 40, 50, 60];
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pct = initialTotal === 0 ? 0 : Math.round(((initialTotal - totalSeconds) / initialTotal) * 100);

  const resetTo = (m: number) => {
    setRunning(false);
    const ts = m * 60;
    setTotalSeconds(ts);
    setInitialTotal(ts);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="text-4xl font-bold tabular-nums text-white">
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              // when starting, capture current total as initial for progress and unlock audio
              if (!running) {
                setInitialTotal(Math.max(60, totalSeconds || 25 * 60));
                unlockAudio();
                // Immediate ding so user can confirm audio is unlocked
                if (!muted) { try { playDing(1); } catch {} }
              }
              setRunning((s) => !s);
            }}
            className={running ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
          >
            {running ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="secondary" onClick={() => resetTo(25)} className="bg-gray-700 hover:bg-gray-600">
            Reset
          </Button>
        </div>
      </div>

      <div className="h-2 w-full rounded bg-gray-700 overflow-hidden mb-3">
        <div className="h-full bg-green-600" style={{ width: `${pct}%`, transition: "width .3s ease" }} />
      </div>

      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          min={1}
          max={180}
          value={minutes}
          onChange={(e) => {
            const v = parseInt(e.target.value || "0", 10);
            const clamped = Number.isFinite(v) ? Math.max(1, v) : 25;
            const ts = clamped * 60;
            setTotalSeconds(ts);
            setInitialTotal(ts);
          }}
          className="w-20 h-9 px-2 rounded bg-gray-900 border border-gray-700 text-white text-sm"
        />
        <span className="text-xs text-gray-400">min</span>
        <button
          type="button"
          onClick={() => {
            setMuted((m) => {
              const nm = !m;
              try { localStorage.setItem("ui:pomodoro:muted", nm ? "1" : "0"); } catch {}
              return nm;
            });
          }}
          className="p-1 rounded hover:bg-gray-800 border border-gray-700 text-gray-300"
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute sound" : "Mute sound"}
        >
          {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {presets.map((m) => (
          <button
            key={m}
            onClick={() => resetTo(m)}
            className={`px-2 py-1 rounded border text-xs ${
              minutes === m && seconds === 0
                ? "bg-green-600/20 border-green-600 text-green-300"
                : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>
    </>
  );
}
