"use client";

import { useState, type FormEvent } from "react";

interface QuestionInputProps {
  onSubmit: (question: string) => Promise<void> | void;
  disabled?: boolean;
  loading?: boolean;
  questionsRemaining: number;
}

/** Free-text input for asking the AI a yes/no question about the secret person. */
export default function QuestionInput({
  onSubmit,
  disabled,
  loading,
  questionsRemaining,
}: QuestionInputProps) {
  const [value, setValue] = useState("");

  const isDisabled = disabled || loading || questionsRemaining <= 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    await onSubmit(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <label htmlFor="question" className="text-xs font-medium text-slate-400">
        Ask a yes/no question ({questionsRemaining} left)
      </label>
      <div className="flex gap-2">
        <input
          id="question"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder='e.g. "Are they still alive?"'
          maxLength={300}
          disabled={isDisabled}
          className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isDisabled || !value.trim()}
          className="shrink-0 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition active:scale-95 hover:bg-brand-500 disabled:pointer-events-none disabled:opacity-40"
        >
          {loading ? "..." : "Ask"}
        </button>
      </div>
    </form>
  );
}
