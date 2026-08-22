import { supabase } from './supabase';
import { loadGuestName } from './local';

// ---------------------------------------------------------------- session --

export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function onAuth(cb) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => subscription.unsubscribe();
}

// ---------------------------------------------------------------- sign in --

// Real Google OAuth via Supabase. The provider is enabled on the project;
// the browser round-trips through accounts.google.com and lands back here.
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/app` },
  });
  if (error) throw error;
}

// Guest path: one anonymous identity per browser profile. Lets anyone try
// the app without an account; the display name is stored on their profile.
export async function signInAsGuest(displayName) {
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  await upsertProfile(data.user, displayName);
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------- profile --

// Google gives us name + avatar in user_metadata; guests type a name.
export function nameFromUser(user) {
  const m = user?.user_metadata ?? {};
  return (m.full_name || m.name || m.preferred_username || '').trim();
}

export function avatarFromUser(user) {
  const m = user?.user_metadata ?? {};
  return m.avatar_url || m.picture || '';
}

export async function upsertProfile(user, displayName) {
  // Fallback chain matters: the auth listener races the guest sign-in flow,
  // so the guest's chosen name (already in localStorage) must win over 'Guest'.
  const name = (displayName ?? '').trim() || nameFromUser(user) || loadGuestName().trim() || 'Guest';
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      display_name: name,
      avatar_url: avatarFromUser(user),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Ensure a profile row exists after any sign-in (Google's first visit
// included). Returns the profile.
export async function ensureProfile(user) {
  const existing = await getProfile(user.id).catch(() => null);
  if (existing?.display_name) {
    // Keep the avatar fresh from Google without clobbering a chosen name.
    const avatar = avatarFromUser(user);
    if (avatar && avatar !== existing.avatar_url) {
      return upsertProfile(user, existing.display_name).catch(() => existing);
    }
    return existing;
  }
  return upsertProfile(user);
}
