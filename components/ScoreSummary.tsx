"use client";

import type { ScoreBreakdownDTO } from "@/lib/types";

interface ScoreSummaryProps {
  score: ScoreBreakdownDTO;
  revealFact?: string;
  onPlayAgain: () => void;
}

/** Post-round breakdown of how the final score was computed. */
export default function ScoreSummary({
  score,
  revealFact,
  onPlayAgain,
}: ScoreSummaryProps) {
  const bonusPercent = Math.round((score.streakMultiplier - 1) * 100);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 animate-pop">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {score.won ? "You got it!" : "Round over"}
        </p>
        <p
          className={`mt-1 text-4xl font-extrabold ${
            score.won ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {score.finalScore} pts
        </p>
      </div>

      {revealFact && (
        <p className="rounded-xl bg-slate-800/60 p-3 text-center text-sm text-slate-300">
          💡 {revealFact}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <dt className="text-slate-400">Base score</dt>
        <dd className="text-right text-slate-200">{score.baseScore}</dd>

        <dt className="text-slate-400">Question penalty</dt>
        <dd className="text-right text-rose-300">-{score.questionPenalty}</dd>

        <dt className="text-slate-400">Time penalty</dt>
        <dd className="text-right text-rose-300">-{score.timePenalty}</dd>

        {score.wrongGuessPenaltySeconds > 0 && (
          <>
            <dt className="text-slate-400">Wrong guess penalty</dt>
            <dd className="text-right text-rose-300">
              +{score.wrongGuessPenaltySeconds}s
            </dd>
          </>
        )}

        {score.won && bonusPercent > 0 && (
          <>
            <dt className="text-slate-400">Streak bonus</dt>
            <dd className="text-right text-emerald-300">+{bonusPercent}%</dd>
          </>
        )}
      </dl>

      <button
        type="button"
        onClick={onPlayAgain}
        className="mt-1 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition active:scale-95 hover:bg-brand-500"
      >
        Play again
      </button>
    </div>
  );
}
