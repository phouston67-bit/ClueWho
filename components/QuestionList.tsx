"use client";

import type { AnswerLabel } from "@/lib/types";

export interface AnsweredQuestion {
  question: string;
  answer: AnswerLabel;
  clarification?: string | null;
}

const ANSWER_STYLES: Record<AnswerLabel, string> = {
  Yes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  No: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  Sometimes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Unclear: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

interface QuestionListProps {
  questions: AnsweredQuestion[];
}

/** Scrollable log of the player's asked questions and the AI's constrained answers. */
export default function QuestionList({ questions }: QuestionListProps) {
  // No empty-state card here - AskOrGuessInput's label already explains
  // how to ask a question, so an extra placeholder card before the first
  // question would just be redundant clutter.
  if (questions.length === 0) {
    return null;
  }

  return (
    <ul className="scrollbar-thin flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
      {questions.map((q, i) => (
        <li
          key={i}
          className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 animate-fade-in"
        >
          <p className="text-sm text-slate-200">
            <span className="text-slate-500">Q{i + 1}.</span> {q.question}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${ANSWER_STYLES[q.answer]}`}
            >
              {q.answer}
            </span>
            {q.clarification && (
              <span className="text-xs text-slate-400">
                {q.clarification}
              </span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
