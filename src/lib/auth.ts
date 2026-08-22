// Grove — identity. Anonymous sign-in for guests; magic link / Google for
// workspace members arrive in Phase 5 (amendment A8).
//
// Two rules, both enforced by scripts/independence-audit.mjs:
//   1. signInAnonymously() appears exactly once in src/ — here. Supabase caps
//      anonymous sign-in at ~30 requests/hour/IP, so a deep link, a share link
//      or a refresh must NEVER sign in: getCachedUser() is what those call.
//   2. ensureUser() may be imported only by routes/Create.tsx and routes/Join.tsx —
//      the two places a person deliberately becomes a participant.
import type { User } from '@supabase/supabase-js';
import { authClient, configured } from './supabase';

/** The cached session's user, or null. Never signs in. Safe on every route. */
export async function getCachedUser(): Promise<User | null> {
  if (!configured) return null;
  const { data } = await authClient().getSession();
  return data.session?.user ?? null;
}

/** Sign in anonymously — but NEVER when a cached session exists. */
export async function ensureUser(): Promise<User> {
  if (!configured) throw new Error('not configured');
  const existing = await getCachedUser();
  if (existing) return existing;
  const { data, error } = await authClient().signInAnonymously();
  if (error) throw error;
  if (!data.user) throw new Error('sign-in returned no user');
  return data.user;
}

/** The JWT for the serverless functions. null when there is no session. */
export async function accessToken(): Promise<string | null> {
  if (!configured) return null;
  const { data } = await authClient().getSession();
  return data.session?.access_token ?? null;
}

/** True once the user has an email or OAuth identity (Phase 5). Anonymous users also carry the
 *  `authenticated` role, so the JWT claim is the only honest discriminator. */
export function isPermanent(user: User | null | undefined): boolean {
  if (!user) return false;
  return (user as User & { is_anonymous?: boolean }).is_anonymous === false;
}

/* ---------------- Grove Studio: real accounts ----------------
 * Anonymous sign-in stays for guests joining a session by code. Google is for
 * people who want their spaces to follow them. Both land on the same
 * auth.uid(), so a guest who later signs in keeps what they wrote. */

export async function signInWithGoogle(redirectTo?: string): Promise<void> {
  if (!configured) throw new Error('not configured');
  const { error } = await authClient().signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo ?? `${window.location.origin}/home`,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (!configured) return;
  await authClient().signOut();
}

/** Name and avatar from the OAuth identity, with sane fallbacks. */
export function identityOf(user: { email?: string; user_metadata?: Record<string, unknown> } | null): {
  displayName: string; avatarUrl: string; email: string;
} {
  const m = (user?.user_metadata ?? {}) as Record<string, string>;
  const email = user?.email ?? '';
  const displayName = m.full_name || m.name || (email ? email.split('@')[0] : '') || 'there';
  return { displayName, avatarUrl: m.avatar_url || m.picture || '', email };
}

/** Fires whenever the session changes — used to save the profile after an OAuth round trip. */
export function onAuthChange(cb: () => void): () => void {
  if (!configured) return () => {};
  const { data } = authClient().onAuthStateChange(() => cb());
  return () => data.subscription.unsubscribe();
}
