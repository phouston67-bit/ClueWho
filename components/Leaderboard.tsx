"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchTopLeaderboardEntries,
  type LeaderboardEntry,
  type TimeRange,
} from "@/lib/leaderboard";
import { CATEGORIES } from "@/lib/types";

const FILTERS = ["All", ...CATEGORIES] as const;
type Filter = (typeof FILTERS)[number];

const TIME_FILTERS: { label: string; value: TimeRange }[] = [
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "All Time", value: "all" },
];

/**
 * Global top-scores leaderboard, split by category via a row of filter
 * tabs ("All" first, then every category) and by a second row of
 * time-range tabs (Today / This Week / This Month / All Time), so players
 * can track their best score per-category and per-period as well as the
 * overall combined, all-time leaderboard. Renders a helpful setup note
 * instead of an empty table when Supabase hasn't been configured yet (see
 * .env.local.example + README.md).
 */
export default function Leaderboard() {
  const [filter, setFilter] = useState<Filter>("All");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    // Resetting to the loading state is a synchronous mirror of the
    // in-flight fetch kicked off right below, not derived application
    // state - the same documented exception as GameBoard's streak hydration
    // effect (see react.dev/learn/you-might-not-need-an-effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntries(null);
    fetchTopLeaderboardEntries(10, filter, timeRange).then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [configured, filter, timeRange]);

  if (!configured) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
        Global leaderboard requires Supabase. Set NEXT_PUBLIC_SUPABASE_URL
        and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README.md) to enable it.
      </div>
    );
  }

  const timeLabel = TIME_FILTERS.find((t) => t.value === timeRange)?.label ?? "All Time";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === option
                ? "bg-brand-600 text-white"
                : "bg-slate-900 text-slate-400 hover:bg-slate-800"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TIME_FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTimeRange(option.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              timeRange === option.value
                ? "bg-slate-200 text-slate-900"
                : "bg-slate-900 text-slate-500 hover:bg-slate-800"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {entries === null ? (
        <p className="text-center text-xs text-slate-500">Loading leaderboard...</p>
      ) : entries.length === 0 ? (
        <p className="text-center text-xs text-slate-500">
          No scores yet for {filter} ({timeLabel}) - be the first on the leaderboard!
        </p>
      ) : (
        <ol className="flex flex-col gap-1.5">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-5 text-right text-slate-500">{i + 1}.</span>
                {entry.display_name}
                {filter === "All" && (
                  <span className="text-xs text-slate-600">{entry.category}</span>
                )}
              </span>
              <span className="font-semibold text-brand-300">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

