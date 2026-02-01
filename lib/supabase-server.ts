/**
 * Server-only Supabase client using the service role key.
 * Use only in API routes / server code; never expose this key to the client.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export type SupabaseServerClient = ReturnType<typeof createClient>;

function getSupabase(): SupabaseServerClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment (server-only)."
    );
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Lazy singleton for server-side use. */
let _client: SupabaseServerClient | null = null;

export function getSupabaseServer(): SupabaseServerClient {
  if (!_client) _client = getSupabase();
  return _client;
}

export type DecisionTraceRow = {
  id: string;
  created_at: string;
  filename: string;
  mime_type: string;
  size: number;
  report_json: Record<string, unknown>;
};
