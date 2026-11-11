"use client";

import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

/**
 * Best-effort client-side leaderboard helpers.
 *
 * These use the public anon Supabase client directly from the browser (see
 * db/schema.sql for the permissive RLS insert/select policies). Everything
 * here fails silently when Supabase isn't configured so the game is fully
 * playable without it.
 */

export interface LeaderboardEntry {
  id: string;
  display_name: string;
  score: number;
  streak: number;
  category: string;
  created_at: string;
}

/** Record a finished round's score to the public leaderboard, if Supabase is configured. */
export async function recordLeaderboardEntry(entry: {
  displayName: string;
  score: number;
  streak: number;
  category: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return;

  try {
    await supabase.from("leaderboard_entries").insert({
      display_name: entry.displayName || "Anonymous",
      score: entry.score,
      streak: entry.streak,
      category: entry.category,
    });
  } catch {
    // Best-effort only - never block gameplay on leaderboard persistence.
  }
}

export type TimeRange = "today" | "week" | "month" | "all";

/** Computes the ISO cutoff timestamp for a given time-range filter, or null for "all". */
function cutoffForTimeRange(range: TimeRange | undefined): string | null {
  if (!range || range === "all") return null;
  const now = new Date();
  if (range === "today") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return start.toISOString();
  }
  if (range === "week") {
    // Monday-start week.
    const day = now.getDay(); // 0 (Sun) - 6 (Sat)
    const diffToMonday = (day + 6) % 7;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    return start.toISOString();
  }
  // "month"
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return start.toISOString();
}

/**
 * Fetch the top N leaderboard entries by score, if Supabase is configured.
 * Pass a `category` (one of lib/types's CATEGORIES) to scope the results to
 * just that category's best scores; omit it (or pass "All") for the
 * combined, all-categories leaderboard. Pass `timeRange` to scope by when
 * the entry was recorded ("today" / "week" / "month"); omit it (or pass
 * "all") for an all-time leaderboard.
 */
export async function fetchTopLeaderboardEntries(
  limit = 10,
  category?: string,
  timeRange?: TimeRange
): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  try {
    let query = supabase
      .from("leaderboard_entries")
      .select("id, display_name, score, streak, category, created_at")
      .order("score", { ascending: false })
      .limit(limit);
    if (category && category !== "All") {
      query = query.eq("category", category);
    }
    const cutoff = cutoffForTimeRange(timeRange);
    if (cutoff) {
      query = query.gte("created_at", cutoff);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data as LeaderboardEntry[]) ?? [];
  } catch {
    return [];
  }
}
