import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-free client for public, unauthenticated content.
 *
 * The SSR client reads cookies, which opts a page into per-request rendering.
 * Articles, guides and events are the same for everyone, so they read through
 * this client instead and stay prerendered with ISR.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
