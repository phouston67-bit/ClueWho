"use client";

import { useState, type FormEvent } from "react";

interface GuessInputProps {
  onSubmit: (guess: string) => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  wrongGuesses: number;
  lastGuessWasWrong?: boolean;
}

/** Free-text input for guessing the secret person's name at any time. */
export default function GuessInput({
  onSubmit,
  disabled,
  loading,
  wrongGuesses,
  lastGuessWasWrong,
}: GuessInputProps) {
  const [value, setValue] = useState("");

  const isDisabled = disabled || loading;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    await onSubmit(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <label htmlFor="guess" className="text-xs font-medium text-slate-400">
        Think you know who it is? Guess any time (doesn&apos;t use a
        question){wrongGuesses > 0 ? ` · ${wrongGuesses} wrong so far` : ""}
      </label>
      <div className="flex gap-2">
        <input
          id="guess"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type their name..."
          maxLength={200}
          disabled={isDisabled}
          className={`flex-1 rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 disabled:opacity-50 ${
            lastGuessWasWrong
              ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
              : "border-slate-700 focus:border-brand-500 focus:ring-brand-500"
          }`}
        />
        <button
          type="submit"
          disabled={isDisabled || !value.trim()}
          className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "..." : "Guess"}
        </button>
      </div>
      {lastGuessWasWrong && (
        <p className="text-xs text-rose-400">Not quite - try again!</p>
      )}
    </form>
  );
}
