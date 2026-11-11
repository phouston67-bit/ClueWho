"use client";

import { useRef, useState, type FormEvent } from "react";
import { extractGuessOverride, isLikelyQuestion } from "@/lib/textIntent";

interface AskOrGuessInputProps {
  onAsk: (question: string) => Promise<void> | void;
  onGuess: (guess: string) => Promise<void> | void;
  askLoading?: boolean;
  guessLoading?: boolean;
  questionsRemaining: number;
  wrongGuesses: number;
  lastGuessWasWrong?: boolean;
}

/**
 * A single smart text box for both asking a yes/no question and guessing
 * the secret person's name. There is no mode toggle - the box itself
 * decides what you meant (question vs. guess) from the wording and submits
 * to the right endpoint, with a live hint so the behavior stays visible.
 */
export default function AskOrGuessInput({
  onAsk,
  onGuess,
  askLoading,
  guessLoading,
  questionsRemaining,
  wrongGuesses,
  lastGuessWasWrong,
}: AskOrGuessInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const loading = Boolean(askLoading || guessLoading);
  const trimmed = value.trim();
  // "Is it Joan of Arc", "My guess is Beyonce", etc. always win out over the
  // general question heuristic - they're unambiguous guess phrasing even
  // though they start with a word ("Is") that would otherwise read as a
  // question.
  const guessOverride = extractGuessOverride(trimmed);
  const asksQuestion = !guessOverride && isLikelyQuestion(trimmed);
  const outOfQuestions = questionsRemaining <= 0;
  // Out of questions, any input falls back to a guess instead of blocking.
  const willAsk = asksQuestion && !outOfQuestions;
  const isDisabled = loading || !trimmed;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!trimmed || loading) return;
    if (willAsk) {
      await onAsk(trimmed);
    } else {
      await onGuess(guessOverride ?? trimmed);
    }
    setValue("");
    inputRef.current?.focus();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <label htmlFor="ask-or-guess" className="text-xs font-medium text-slate-400">
        {questionsRemaining} question{questionsRemaining === 1 ? "" : "s"} left
        &middot; ask or guess their name
        {wrongGuesses > 0 ? ` · ${wrongGuesses} wrong so far` : ""}
      </label>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id="ask-or-guess"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='Ask "Are they still alive?" or type a guess...'
          maxLength={300}
          disabled={loading}
          className={`flex-1 rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 disabled:opacity-50 ${
            lastGuessWasWrong
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
              : "border-slate-700 focus:border-brand-500 focus:ring-brand-500"
          }`}
        />
        <button
          type="submit"
          disabled={isDisabled}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:pointer-events-none disabled:opacity-40 ${
            willAsk
              ? "bg-brand-600 hover:bg-brand-500"
              : "bg-emerald-600 hover:bg-emerald-500"
          }`}
        >
          {loading ? "..." : willAsk ? "Ask" : "Guess"}
        </button>
      </div>
      {trimmed && (
        <p className="text-xs text-slate-500">
          {willAsk
            ? "Reading this as a question →"
            : guessOverride
              ? `Reading "${guessOverride}" as your guess →`
              : outOfQuestions && isLikelyQuestion(trimmed)
                ? "Out of questions - reading this as a guess →"
                : "Reading this as a guess →"}
        </p>
      )}
      {lastGuessWasWrong && (
        <p className="text-xs text-rose-400">Not quite - try again!</p>
      )}
    </form>
  );
}
