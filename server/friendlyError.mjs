// Turn an internal failure into a sentence a person can act on. The raw
// message (provider JSON, status codes, key errors) goes to the server log
// only; it never reaches the chat or a toast.
export function friendlyError(e, kind = 'studio') {
  const m = String(e?.message ?? e ?? '');
  if (/quota|RESOURCE_EXHAUSTED|\b429\b|rate.?limit|overloaded|\b529\b/i.test(m)) {
    return 'The Studio is busy right now. Wait a minute and try again.';
  }
  if (/supabase\s+(rpc\s+\S+\s+)?401|jwt|expired/i.test(m)) {
    return 'Your sign-in expired. Sign in again and try once more.';
  }
  if (kind === 'email' || /smtp|mail/i.test(m)) {
    return 'The email could not be sent right now. Try again in a few minutes.';
  }
  if (/api.?key|authentication|unauthori[sz]ed|permission|\b401\b|\b403\b/i.test(m)) {
    return 'The Studio cannot reach its AI service right now. Try again later.';
  }
  if (/valid JSON|too short|empty|no audio|no renderable|nothing to narrate/i.test(m)) {
    return 'That did not come out right. Try again.';
  }
  if (kind === 'invite') return 'The invite could not be sent right now. Try again in a minute.';
  return 'Something went wrong on our side. Try again in a minute.';
}
