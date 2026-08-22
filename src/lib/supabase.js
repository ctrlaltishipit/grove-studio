import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A missing env var here produces a blank screen with a cryptic error.
// Fail loudly instead — SignIn renders this message with setup steps.
export const configError =
  !url || !key
    ? 'GroveStudio is not configured: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing. Copy .env.example to .env.local, fill both in, and restart the dev server.'
    : null;

// The anon key is publishable by design: every table it can reach is
// governed by RLS. Secrets live only in server-side env.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // OAuth (Google) redirects back with tokens in the URL; supabase-js
    // must be allowed to pick them up.
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});
