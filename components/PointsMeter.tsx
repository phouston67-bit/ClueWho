"use client";

import { useEffect, useRef, useState } from "react";
import { calculateRoundScore } from "@/lib/scoring";

interface PointsMeterProps {
  startedAt: number;
  questionsUsed: number;
  wrongGuesses: number;
  hintsUsed: number;
  streakBeforeRound: number;
  active: boolean;
}

/**
 * Live, on-screen "potential score if you guessed right now" indicator.
 * Ticks down every second as time elapses, and drops immediately whenever
 * a hint is used or a guess is wrong - using the exact same pure formula
 * (lib/scoring.ts) the server uses to compute the real score at reveal
 * time, so this is always an honest preview, never a separate guess.
 */
export default function PointsMeter({
  startedAt,
  questionsUsed,
  wrongGuesses,
  hintsUsed,
  streakBeforeRound,
  active,
}: PointsMeterProps) {
  const prevScoreRef = useRef<number | null>(null);
  const [justDropped, setJustDropped] = useState(false);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);

  const elapsedSeconds = active && now !== null ? Math.max(0, (now - startedAt) / 1000) : 0;

  const score = calculateRoundScore({
    questionsUsed,
    elapsedSeconds,
    wrongGuesses,
    hintsUsed,
    won: true,
    streakBeforeRound,
  });

  useEffect(() => {
    if (prevScoreRef.current !== null && score.finalScore < prevScoreRef.current) {
      setJustDropped(true);
      const timeout = setTimeout(() => setJustDropped(false), 650);
      prevScoreRef.current = score.finalScore;
      return () => clearTimeout(timeout);
    }
    prevScoreRef.current = score.finalScore;
  }, [score.finalScore]);

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Potential score
      </span>
      <span
        className={`font-mono text-xl font-bold tabular-nums transition-colors duration-300 ${
          justDropped ? "text-rose-400" : "text-brand-300"
        }`}
      >
        {score.finalScore}
      </span>
    </div>
  );
}
