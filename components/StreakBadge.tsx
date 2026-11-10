"use client";

interface StreakBadgeProps {
  streak: number;
  bestStreak: number;
}

/** Compact header badge showing the player's current + best session streak. */
export default function StreakBadge({ streak, bestStreak }: StreakBadgeProps) {
  return (
    <div className="flex items-center justify-center gap-4 rounded-full border border-slate-800 bg-slate-900/80 px-4 py-2 text-sm">
      <span className="flex items-center gap-1 text-amber-300">
        <span aria-hidden>🔥</span>
        <span className="font-semibold">{streak}</span>
        <span className="text-slate-500">streak</span>
      </span>
      <span className="h-4 w-px bg-slate-700" aria-hidden />
      <span className="flex items-center gap-1 text-brand-300">
        <span aria-hidden>🏆</span>
        <span className="font-semibold">{bestStreak}</span>
        <span className="text-slate-500">best</span>
      </span>
    </div>
  );
}
