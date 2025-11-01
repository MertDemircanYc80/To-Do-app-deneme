"use client";

import HabitChain from "./HabitChain";

export default function HabitsBoard() {
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold text-white mb-3">Alışkanlıklar</h2>
      <HabitChain columns={2} />
    </div>
  );
}
