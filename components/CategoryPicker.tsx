"use client";

import { CATEGORIES } from "@/lib/types";

const CATEGORY_EMOJI: Record<string, string> = {
  "TV & Film": "🎬",
  Musicians: "🎤",
  Athletes: "🏅",
  Football: "⚽",
  "Historical Figures": "🏛️",
  Scientists: "🔬",
  Politicians: "🏛️",
  "Business Leaders": "💼",
  Landmarks: "🗼",
  Stadiums: "🏟️",
  Logos: "🏷️",
};

interface CategoryPickerProps {
  onSelect: (category?: string) => void;
  disabled?: boolean;
}

/** The home screen: pick a category, or let the server surprise you. */
export default function CategoryPicker({
  onSelect,
  disabled,
}: CategoryPickerProps) {
  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          10<span className="text-brand-400">Clues</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Pick a category. We&apos;ll secretly choose a famous subject - ask up
          to 10 yes/no questions, then guess who (or what) it is!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(category)}
            className="flex flex-col items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-5 text-center transition active:scale-95 hover:border-brand-500 hover:bg-slate-800 disabled:pointer-events-none disabled:opacity-50"
          >
            <span className="text-3xl" aria-hidden>
              {CATEGORY_EMOJI[category] ?? "⭐"}
            </span>
            <span className="text-sm font-medium text-slate-200">
              {category}
            </span>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(undefined)}
        className="mt-1 rounded-2xl bg-brand-600 px-4 py-4 text-center text-base font-semibold text-white shadow-lg shadow-brand-900/40 transition active:scale-95 hover:bg-brand-500 disabled:pointer-events-none disabled:opacity-50"
      >
        🎲 All Categories
      </button>

      <details className="rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
        <summary className="cursor-pointer select-none font-semibold text-slate-200">
          ❓ How to play
        </summary>
        <div className="mt-3 flex flex-col gap-2 text-slate-400">
          <p>1. Pick a category (or All Categories to be surprised) - we secretly choose a famous subject and show you only its photo.</p>
          <p>2. Type into the single box to either ask a yes/no question (up to 10 per round, answered Yes / No / Sometimes / Unclear) or guess the name directly - the box figures out which you mean.</p>
          <p>3. Stuck? Spend a 💡 hint for a free fact, at the cost of some points - you get a limited pool per streak, refillable by watching an ad.</p>
          <p>4. Guess right (or run out of questions) to reveal the answer. Scoring starts at 1000 pts and loses points for every question, hint, second elapsed, and wrong guess.</p>
          <p>5. Consecutive correct rounds build a streak worth up to +100% bonus points - but one loss resets it to zero, so share your best streak and dare a friend to beat it!</p>
        </div>
      </details>
    </div>
  );
}
