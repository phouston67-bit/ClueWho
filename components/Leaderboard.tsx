"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  fetchTopLeaderboardEntries,
  type LeaderboardEntry,
} from "@/lib/leaderboard";

/**
 * Global top-scores leaderboard. Renders a helpful setup note instead of an
 * empty table when Supabase hasn't been configured yet (see
 * .env.local.example + README.md).
 */
export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    fetchTopLeaderboardEntries(10).then((data) => {
      if (!cancelled) setEntries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (!configured) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">
        Global leaderboard requires Supabase. Set NEXT_PUBLIC_SUPABASE_URL
        and NEXT_PUBLIC_SUPABASE_ANON_KEY (see README.md) to enable it.
      </div>
    );
  }

  if (!entries) {
    return <p className="text-center text-xs text-slate-500">Loading leaderboard...</p>;
  }

  if (entries.length === 0) {
    return (
      <p className="text-center text-xs text-slate-500">
        No scores yet - be the first on the leaderboard!
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-1.5">
      {entries.map((entry, i) => (
        <li
          key={entry.id}
          className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2 text-slate-300">
            <span className="w-5 text-right text-slate-500">{i + 1}.</span>
            {entry.display_name}
            <span className="text-xs text-slate-600">{entry.category}</span>
          </span>
          <span className="font-semibold text-brand-300">{entry.score}</span>
        </li>
      ))}
    </ol>
  );
}
