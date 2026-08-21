import { supabase } from './supabase';

// One anonymous identity per browser profile, persisted by supabase-js in
// localStorage. Two tabs of the SAME profile share one user_id — which is
// why you must never test multi-user that way; the test passes and proves
// nothing.
export async function ensureAnonSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}
