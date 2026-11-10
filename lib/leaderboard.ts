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

/** Fetch the top N leaderboard entries by score, if Supabase is configured. */
export async function fetchTopLeaderboardEntries(
  limit = 10
): Promise<LeaderboardEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("leaderboard_entries")
      .select("id, display_name, score, streak, category, created_at")
      .order("score", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data as LeaderboardEntry[]) ?? [];
  } catch {
    return [];
  }
}
