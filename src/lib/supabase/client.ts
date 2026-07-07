import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client, for the few things that must happen in the
// browser — currently avatar uploads to Storage. Reads the same public env as
// the server client; RLS + storage policies enforce access.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
