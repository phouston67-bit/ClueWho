"use client";

interface StreakBadgeProps {
  streak: number;
  bestStreak: number;
  /** Cumulative points banked across the current win streak this session. */
  sessionScore: number;
}

/**
 * Prominent header badge showing the player's current streak, cumulative
 * session score, and best streak. Always visible (including mid-round) so
 * the stakes of the current streak stay front-of-mind while playing.
 */
export default function StreakBadge({
  streak,
  bestStreak,
  sessionScore,
}: StreakBadgeProps) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-lg shadow-black/20 sm:gap-5">
      <span className="flex flex-col items-center gap-0.5 text-amber-300">
        <span className="flex items-center gap-1 text-xl font-extrabold leading-none sm:text-2xl">
          <span aria-hidden>🔥</span>
          {streak}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Streak
        </span>
      </span>
      <span className="h-8 w-px bg-slate-700" aria-hidden />
      <span className="flex flex-col items-center gap-0.5 text-brand-300">
        <span className="text-xl font-extrabold leading-none sm:text-2xl">
          {sessionScore.toLocaleString()}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Score
        </span>
      </span>
      <span className="h-8 w-px bg-slate-700" aria-hidden />
      <span className="flex flex-col items-center gap-0.5 text-slate-300">
        <span className="flex items-center gap-1 text-xl font-extrabold leading-none sm:text-2xl">
          <span aria-hidden>🏆</span>
          {bestStreak}
        </span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
          Best
        </span>
      </span>
    </div>
  );
}
