"use client";

import React from "react";
import styles from "./progress.module.css";

type Size = "sm" | "md" | "lg";

export interface ProgressCircleProps {
  completed: number;
  total: number;
  label?: string;
  size?: Size;
}

export default function ProgressCircle({
  completed,
  total,
  label,
  size = "sm", // ⬅︎ varsayılanı küçük
}: ProgressCircleProps) {
  const pct = total > 0 ? Math.min((completed / total) * 100, 100) : 0;

  // sm ≈ yarım boy
  const sizeCls =
    size === "sm" ? "w-16 h-16"
    : size === "lg" ? "w-40 h-40"
    : "w-28 h-28";

  return (
    <div
      className={`relative ${sizeCls} rounded-full overflow-hidden
                  bg-white/10 border border-white/15 shadow
                  shadow-[0_0_24px_rgba(59,130,246,0.25)]`}
      aria-label={label ? `${label}: %${Math.round(pct)}` : `%${Math.round(pct)}`}
    >
      {/* Su seviyesi */}
      <div className={styles.water} style={{ height: `${pct}%` }}>
        <div className={styles.ripple} />
        <div className={styles.ripple} style={{ animationDuration: "6s", opacity: 0.25 }} />
      </div>

      {/* Metinler */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
        <span className="text-sm font-semibold text-white">{Math.round(pct)}%</span>
        <span className="text-[10px] text-gray-200/80">{completed}/{total}</span>
        {label && <span className="text-[9px] text-gray-300/70 mt-0.5">{label}</span>}
      </div>
    </div>
  );
}
