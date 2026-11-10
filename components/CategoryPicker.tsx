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
          Clue<span className="text-brand-400">Who</span>
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Pick a category. We&apos;ll secretly choose a famous person - ask up
          to 5 yes/no questions, then guess who it is!
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
        🎲 Surprise me
      </button>
    </div>
  );
}
