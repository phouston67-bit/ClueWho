"use client";

import RewardedAd from "@/components/RewardedAd";
import { SCORING_RULES } from "@/lib/scoring";

interface HintPanelProps {
  hints: string[];
  hintsRemainingInStreak: number;
  maxHintsPerStreak: number;
  onRequestHint: () => void;
  onWatchAdForHint: () => void;
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Lets the player spend one of their streak's limited hints (costs points,
 * see lib/scoring.ts PER_HINT_PENALTY) to reveal the next grounding fact
 * about the secret subject. Once the per-streak allowance is used up, a
 * simulated "watch an ad" freemium flow (see components/RewardedAd.tsx)
 * grants one more.
 */
export default function HintPanel({
  hints,
  hintsRemainingInStreak,
  maxHintsPerStreak,
  onRequestHint,
  onWatchAdForHint,
  loading,
  disabled,
}: HintPanelProps) {
  const outOfHints = hintsRemainingInStreak <= 0;

  return (
    <div className="flex flex-col gap-2">
      {hints.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {hints.map((hint, i) => (
            <li
              key={i}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200 animate-fade-in"
            >
              💡 {hint}
            </li>
          ))}
        </ul>
      )}

      {!outOfHints ? (
        <button
          type="button"
          onClick={onRequestHint}
          disabled={disabled || loading}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-300 transition active:scale-95 hover:bg-amber-500/20 disabled:pointer-events-none disabled:opacity-40"
        >
          💡 {loading ? "Getting hint..." : "Get Hint"}
          <span className="text-xs font-normal text-amber-400/80">
            ({hintsRemainingInStreak}/{maxHintsPerStreak} left · -
            {SCORING_RULES.PER_HINT_PENALTY}pts)
          </span>
        </button>
      ) : (
        <div className="flex flex-col gap-1.5">
          <p className="text-center text-xs text-slate-500">
            Out of free hints for this streak.
          </p>
          <RewardedAd
            ctaLabel="📺 Watch Ad for +1 Hint"
            onComplete={onWatchAdForHint}
            disabled={disabled}
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-center text-sm font-semibold text-amber-300 transition active:scale-95 hover:bg-amber-500/20 disabled:pointer-events-none disabled:opacity-40"
          />
        </div>
      )}
    </div>
  );
}
