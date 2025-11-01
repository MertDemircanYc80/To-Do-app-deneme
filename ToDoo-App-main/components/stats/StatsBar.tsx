"use client";

import React from "react";
import styles from "./progress.module.css";
import ProgressCircle from "./ProgressCircle";

type Props = {
  todayCompleted: number;
  todayTotal: number;
  weekCompleted: number;
  weekTotal: number;
};

export default function StatsBar({
  todayCompleted,
  todayTotal,
  weekCompleted,
  weekTotal,
}: Props) {
  return (
    // Top area: subtle, pointer-events disabled
    <div className="relative w-full h-20 pointer-events-none px-4">
      {/* Today bubble */}
      <div className={`${styles.floatWrap} ${styles.floatX}`} style={{ top: 4 }}>
        <ProgressCircle completed={todayCompleted} total={todayTotal} label="Today" size="sm" />
      </div>

      {/* Week bubble (different speed/delay) */}
      <div className={`${styles.floatWrap} ${styles.floatX2}`} style={{ top: 40 }}>
        <ProgressCircle completed={weekCompleted} total={weekTotal} label="Week" size="sm" />
      </div>
    </div>
  );
}
