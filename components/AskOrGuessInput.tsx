"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";

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
 * A single shared text box for both asking a yes/no question and guessing
 * the secret person's name, instead of two separate inputs. Pressing Enter
 * auto-detects intent (a trailing "?" submits as a question, anything else
 * submits as a guess); the two explicit buttons let the player override
 * that guess at any time - useful on mobile, where tapping a button is
 * often easier than remembering to type a "?".
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
  const canAsk = !loading && questionsRemaining > 0;
  const canGuess = !loading;
  const trimmed = value.trim();

  async function submitAsk() {
    if (!trimmed || !canAsk) return;
    await onAsk(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  async function submitGuess() {
    if (!trimmed || !canGuess) return;
    await onGuess(trimmed);
    setValue("");
    inputRef.current?.focus();
  }

  function handleFormSubmit(e: FormEvent) {
    e.preventDefault();
    // Smart default for the Enter key: a question mark means "ask",
    // anything else means "guess".
    if (trimmed.endsWith("?")) {
      void submitAsk();
    } else {
      void submitGuess();
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    // Keyboard shortcuts so desktop players don't have to reach for the mouse.
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submitGuess();
    }
  }

  return (
    <form onSubmit={handleFormSubmit} className="flex flex-col gap-1.5">
      <label htmlFor="ask-or-guess" className="text-xs font-medium text-slate-400">
        Ask a yes/no question ({questionsRemaining} left) or type your guess -
        guessing is free and doesn&apos;t use a question
        {wrongGuesses > 0 ? ` · ${wrongGuesses} wrong so far` : ""}
      </label>
      <input
        ref={inputRef}
        id="ask-or-guess"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Ask "Are they still alive?" or guess their name...'
        maxLength={300}
        disabled={loading}
        className={`w-full rounded-xl border bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 disabled:opacity-50 ${
          lastGuessWasWrong
            ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500"
            : "border-slate-700 focus:border-brand-500 focus:ring-brand-500"
        }`}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submitAsk}
          disabled={!trimmed || !canAsk}
          className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 hover:bg-brand-500 disabled:pointer-events-none disabled:opacity-40"
        >
          {askLoading ? "..." : "❓ Ask"}
        </button>
        <button
          type="button"
          onClick={submitGuess}
          disabled={!trimmed || !canGuess}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 hover:bg-emerald-500 disabled:pointer-events-none disabled:opacity-40"
        >
          {guessLoading ? "..." : "🎯 Guess"}
        </button>
      </div>
      {lastGuessWasWrong && (
        <p className="text-xs text-rose-400">Not quite - try again!</p>
      )}
    </form>
  );
}
