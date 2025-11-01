"use client";

import React, { useEffect, useId, useRef, useState } from "react";

type Pos = { x: number; y: number };

interface Props {
  value: number;                // 0–100
  size?: number;
  thickness?: number;
  storageKey?: string;
  initialPos?: Pos;

  startColor?: string;
  endColor?: string;
  trackColor?: string;
  innerFill?: string;
  textColor?: string;

  showGlow?: boolean;
  showGloss?: boolean;
}

export default function DraggableProgress({
  value,
  size = 48,
  thickness = 7,
  storageKey = "ui:donut-progress",
  initialPos = { x: 220, y: 120 },

  startColor = "#22c55e",
  endColor   = "#16a34a",
  trackColor = "rgba(255,255,255,0.10)",
  innerFill  = "transparent",
  textColor  = "#ffffff",

  showGlow = false,
  showGloss = false,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  // ---- position state (lazy init from localStorage once) ----
  const [pos, setPos] = useState<Pos>(() => {
    if (typeof window === "undefined") return initialPos;
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : initialPos;
    } catch {
      return initialPos;
    }
  });
  const latestPosRef = useRef(pos);
  useEffect(() => {
    latestPosRef.current = pos;
  }, [pos]);

  // persist only when pos or storageKey changes
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(pos));
    } catch {}
  }, [pos, storageKey]);

  const [dragging, setDragging] = useState(false);
  const offset = useRef<Pos>({ x: 0, y: 0 });

  const onDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const el = e.currentTarget as HTMLDivElement;
    const rect = el.getBoundingClientRect();
    offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setDragging(true);
    el.setPointerCapture?.(e.pointerId);
    document.body.style.userSelect = "none";

    const onMove = (ev: PointerEvent) => {
      const nx = ev.clientX - offset.current.x;
      const ny = ev.clientY - offset.current.y;
      const maxX = (window.innerWidth ?? 0) - size;
      const maxY = (window.innerHeight ?? 0) - size;
      setPos({
        x: Math.max(0, Math.min(nx, maxX)),
        y: Math.max(0, Math.min(ny, maxY)),
      });
    };

    const onUp = (ev: PointerEvent) => {
      setDragging(false);
      document.body.style.userSelect = "";
      el.releasePointerCapture?.((e as any).pointerId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      // kaydetmeyi effect yapıyor, burada ekstra setItem yok
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  };

  // ---- geometry ----
  const id = useId();
  const cx = size / 2, cy = size / 2;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;

  const gapAngle = 22;
  const gapLen = (gapAngle / 360) * C;
  const progressLen = (pct / 100) * (C - gapLen);
  const dasharray = `${gapLen} ${progressLen} ${C}`;

  const startA = (-90 + gapAngle) * (Math.PI / 180);
  const endA = startA + (pct / 100) * (2 * Math.PI - (gapAngle * Math.PI) / 180);
  const sx = cx + r * Math.cos(startA);
  const sy = cy + r * Math.sin(startA);
  const ex = cx + r * Math.cos(endA);
  const ey = cy + r * Math.sin(endA);

  const fontSize = Math.max(9, Math.floor(size * 0.32));

  return (
    <div
      role="button"
      title={`Today • ${pct}% (drag)`}
      onPointerDown={onDown}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: size,
        height: size,
        zIndex: 1000,
        cursor: dragging ? "grabbing" : "grab",
        touchAction: "none",
        pointerEvents: "auto",
      }}
      className="select-none"
    >
      {showGlow && (
        <div
          className="absolute rounded-full blur-2xl"
          style={{
            inset: "-12%",
            background:
              "radial-gradient(60% 60% at 30% 25%, rgba(56,189,248,.18), rgba(2,6,23,0) 70%)",
            pointerEvents: "none",
          }}
        />
      )}

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0">
        <defs>
          <linearGradient id={`${id}-grad`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={startColor} />
            <stop offset="100%" stopColor={endColor} />
          </linearGradient>
          <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,.85)" />
            <stop offset="1" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        <circle cx={cx} cy={cy} r={r} stroke={trackColor} strokeWidth={thickness} fill="none" />

        <g transform={`rotate(-90 ${cx} ${cy})`}>
          <circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={`url(#${id}-grad)`}
            strokeWidth={thickness}
            strokeLinecap="round"
            strokeDasharray={dasharray}
            fill="none"
            style={{ transition: "stroke-dasharray .45s ease" }}
          />
        </g>

        {pct > 0 && (
          <>
            <circle cx={sx} cy={sy} r={thickness / 2} fill={startColor} />
            <circle cx={ex} cy={ey} r={thickness / 2} fill={endColor} />
          </>
        )}

        {showGloss && (
          <path
            d={describeArc(cx, cy, r + thickness * 0.35, -150, -60)}
            stroke={`url(#${id}-gloss)`}
            strokeWidth={thickness * 0.55}
            strokeLinecap="round"
            fill="none"
            opacity="0.6"
          />
        )}
      </svg>

      <div
        className="absolute rounded-full flex items-center justify-center font-extrabold"
        style={{
          left: thickness + 5,
          top: thickness + 5,
          width: size - (thickness + 5) * 2,
          height: size - (thickness + 5) * 2,
          background: innerFill,
        }}
      >
        <span style={{ fontSize, color: textColor }}>{pct}%</span>
      </div>
    </div>
  );
}

/** Arc helpers */
function describeArc(cx: number, cy: number, r: number, startAngleDeg: number, endAngleDeg: number) {
  const start = polarToCartesian(cx, cy, r, endAngleDeg);
  const end = polarToCartesian(cx, cy, r, startAngleDeg);
  const largeArcFlag = endAngleDeg - startAngleDeg <= 180 ? "0" : "1";
  return ["M", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y].join(" ");
}
function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180.0;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
