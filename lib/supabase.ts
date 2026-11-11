import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client wrappers.
 *
 * Supabase is optional for local development - the game works entirely
 * without it (rounds are tracked via signed tokens, score/streak live in
 * client state). When the env vars below are configured, rounds and
 * leaderboard entries are additionally persisted for cross-device streak
 * tracking and a global leaderboard. See db/schema.sql for the schema.
 */

let browserClient: SupabaseClient | null = null;
let adminClient: SupabaseClient | null = null;

// .env.local.example ships with literal placeholder values so the file is
// self-documenting; without this check, pasting it to .env.local (or simply
// never replacing the placeholders) makes isSupabaseConfigured() return true
// and the app silently tries to call https://your-project.supabase.co, fails,
// and swallows the error - showing a misleading empty "No scores yet"
// leaderboard instead of the "requires Supabase" setup hint.
function looksLikePlaceholder(value: string): boolean {
  return /your-project|your-anon|your-service-role|placeholder/i.test(value);
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      anonKey &&
      !looksLikePlaceholder(url) &&
      !looksLikePlaceholder(anonKey)
  );
}

/** Public, anon-key client safe to use from client components. */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!browserClient) {
    browserClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}

/**
 * Service-role client for trusted server-side writes (e.g. recording a
 * finished round or leaderboard entry). NEVER import this from client code -
 * it is gated behind "server-only" semantics by virtue of requiring
 * SUPABASE_SERVICE_ROLE_KEY, which is never exposed with a NEXT_PUBLIC_
 * prefix.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (
    !url ||
    !serviceKey ||
    looksLikePlaceholder(url) ||
    looksLikePlaceholder(serviceKey)
  )
    return null;
  if (!adminClient) {
    adminClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    });
  }
  return adminClient;
}
