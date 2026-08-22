import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// A missing env var here produces a blank screen with a cryptic error, and
// you will burn twenty minutes on it at 2am. Fail loudly instead.
export const configError =
  !url || !key
    ? 'Grove Studio is not configured. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing.'
    : null;

// The anon key is publishable by design: it is the browser's identity and
// every table it can reach is governed by RLS. The service-role key and the
// LLM key exist only inside api/synthesise.py.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'anon', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
