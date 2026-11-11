"use client";

import { useEffect, useState } from "react";
import type { ScoreBreakdownDTO } from "@/lib/types";
import ShareStreak from "@/components/ShareStreak";
import AdSlot from "@/components/AdSlot";

const AUTO_NEXT_SECONDS = 5;

interface ScoreSummaryProps {
  score: ScoreBreakdownDTO;
  revealFact?: string;
  /** The streak going into this round - used for the "share your streak" CTA on a loss. */
  streakBeforeRound: number;
  onNext: () => void;
  onChangeCategory: () => void;
}

/** Post-round breakdown of how the final score was computed. */
export default function ScoreSummary({
  score,
  revealFact,
  streakBeforeRound,
  onNext,
  onChangeCategory,
}: ScoreSummaryProps) {
  const bonusPercent = Math.round((score.streakMultiplier - 1) * 100);
  const shareStreak = score.won ? score.newStreak : streakBeforeRound;
  // A round that ends with a score of 0 is a loss - treat it as "Game Over"
  // and send the player back to the category picker to start a fresh game,
  // rather than silently dealing them another mystery image.
  const isGameOver = !score.won;
  const primaryAction = isGameOver ? onChangeCategory : onNext;
  const [secondsLeft, setSecondsLeft] = useState(AUTO_NEXT_SECONDS);

  // Auto-advance after a few seconds, giving the ad slot below a few extra
  // seconds of eyeball time without requiring a tap.
  useEffect(() => {
    if (secondsLeft <= 0) {
      primaryAction();
      return;
    }
    const timeout = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-brand-500/40 bg-slate-900 p-4 shadow-xl shadow-brand-900/30 animate-pop">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {score.won ? "You got it!" : "💀 Game Over"}
        </p>
        <p
          className={`mt-1 text-5xl font-extrabold drop-shadow-[0_0_12px_rgba(74,93,255,0.35)] ${
            score.won ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {score.finalScore} pts
        </p>
        {isGameOver && (
          <p className="mt-1 text-sm text-rose-300">
            Out of questions with no guess - time to start again!
          </p>
        )}
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

        {score.hintPenalty > 0 && (
          <>
            <dt className="text-slate-400">Hint penalty</dt>
            <dd className="text-right text-rose-300">-{score.hintPenalty}</dd>
          </>
        )}

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

      <ShareStreak streak={shareStreak} won={score.won} />

      <div className="flex flex-col gap-2">
        <div className="relative">
          <AdSlot slot="interstitial" />
          <span
            aria-hidden
            className="pointer-events-none absolute right-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-300"
          >
            {isGameOver ? `Restart in ${secondsLeft}s` : `Next in ${secondsLeft}s`}
          </span>
        </div>
        {isGameOver ? (
          <>
            <button
              type="button"
              onClick={onChangeCategory}
              className="rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-brand-400 active:scale-[0.98]"
            >
              🔁 Start again
            </button>
            <button
              type="button"
              onClick={onNext}
              className="text-center text-xs text-slate-500 underline-offset-2 hover:underline"
            >
              Play this category again
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onNext}
              className="text-center text-xs text-slate-500 underline-offset-2 hover:underline"
            >
              Skip ▶
            </button>
            <button
              type="button"
              onClick={onChangeCategory}
              className="text-center text-xs text-slate-500 underline-offset-2 hover:underline"
            >
              Change category
            </button>
          </>
        )}
      </div>
    </div>
  );
}
