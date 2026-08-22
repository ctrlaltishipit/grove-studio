// Client for the studio sidecar (server/index.mjs, proxied at /api/studio).
// Every call carries the user's own Supabase JWT — the server fetches notes
// under that token, so RLS decides what the studio can see.

import { getAccessToken } from './auth';
import { DEMO_SPACE_ID } from './demoData';
import { DEMO_ARTIFACTS } from './demoArtifacts';

// The sample space is served from baked artifacts — never the live pipeline.
function isDemoScope(scope) {
  return scope?.spaceIds?.includes(DEMO_SPACE_ID)
    || (Array.isArray(scope?.noteIds) && scope.noteIds.some((id) => String(id).startsWith('dn-')));
}
const clone = (x) => JSON.parse(JSON.stringify(x));

async function call(path, body = {}) {
  const token = await getAccessToken();
  if (!token) throw new Error('Sign in to use the studio.');
  const res = await fetch(`/api/studio/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  if (!res.ok) throw new Error(data.error ?? `Studio request failed (${res.status})`);
  return data;
}

export const studioHealth = async () => {
  try {
    const res = await fetch('/api/studio/health');
    return res.ok ? await res.json() : null;
  } catch { return null; }
};

export const genSummary = (scope) => (isDemoScope(scope) ? Promise.resolve(clone(DEMO_ARTIFACTS.summary)) : call('summary', { scope }));
export const genNoteBrief = (noteId) => call('notebrief', { scope: { noteIds: [noteId] } });
export const genMindmap = (scope) => (isDemoScope(scope) ? Promise.resolve(clone(DEMO_ARTIFACTS.mindmap)) : call('mindmap', { scope }));
export const genAudio = (scope) => (isDemoScope(scope) ? Promise.resolve(clone(DEMO_ARTIFACTS.audio)) : call('audio', { scope }));
export const genVideo = (scope) => (isDemoScope(scope) ? Promise.resolve(clone(DEMO_ARTIFACTS.deck)) : call('video', { scope }));
export const genInfographic = (scope) => (isDemoScope(scope) ? Promise.resolve(clone(DEMO_ARTIFACTS.infographic)) : call('infographic', { scope }));

export const genAsk = (scope, question, history) => {
  if (isDemoScope(scope)) {
    return Promise.resolve({
      answer: 'This is the sample space, so Ask is on rails here. In a space of your own, I answer only from your notes — with the exact source note attached — and never invent anything. Create a space, add a note, and ask me about it.',
      sources: ['Start here — what GroveStudio is'],
      grounding: DEMO_ARTIFACTS.summary.grounding,
    });
  }
  return call('ask', { scope, question, history });
};

// base64 WAV -> object URL for <audio src>. Callers revoke when done.
export function wavUrl(wavBase64) {
  const bytes = Uint8Array.from(atob(wavBase64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
}

// Download a base64 WAV as a .wav file.
export function downloadWav(wavBase64, filename) {
  const bytes = Uint8Array.from(atob(wavBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.wav') ? filename : `${filename}.wav`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const safeName = (s) => String(s ?? 'grovestudio').replace(/[^\w -]+/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'grovestudio';
export { safeName };

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">';

// A CSP that permits only inline styles + Google Fonts + data: images and
// blocks all scripting. Defense-in-depth behind the sandboxed iframe: even a
// sanitizer miss (a slipped-through inline handler) cannot execute under it.
const ARTBOARD_CSP =
  "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src https://fonts.gstatic.com; img-src data:; base-uri 'none'; form-action 'none'";

// Wrap a server-sanitized artboard in a complete document for a sandboxed
// iframe (the same wrapper-owned guard idea as MT_V2's deck renderer).
export function artboardDoc({ css, html, width, height, rootClass }) {
  const guard = `*{box-sizing:border-box}html,body{margin:0;padding:0;background:#F7F6F2}` +
    `.${rootClass}{width:${width}px !important;height:${height}px !important;overflow:hidden !important;position:relative;-webkit-font-smoothing:antialiased;font-family:'Inter',system-ui,sans-serif}`;
  return `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${ARTBOARD_CSP}">` +
    `${FONTS}<style>${guard}\n${css ?? ''}</style></head><body>${html}</body></html>`;
}

// A self-contained, printable slide deck: every artboard stacked, one per
// page. A strict script-none CSP means the model HTML can't execute even if a
// sanitizer rule ever slipped — safe to open or download. On screen it's a
// scroll-snap slideshow; File → Print → Save as PDF gives a real PDF.
export function deckDownloadDoc(data) {
  const { css, slides, width, height, title } = data;
  const csp = "default-src 'none'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data:";
  const style = `
    @page { size: ${width}px ${height}px; margin: 0; }
    *{box-sizing:border-box} html,body{margin:0;background:#2a2926}
    .deck{display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px}
    .slide{width:${width}px;height:${height}px;position:relative;overflow:hidden;background:#F7F6F2;
      box-shadow:0 6px 28px rgba(0,0,0,.45);font-family:'Inter',system-ui,sans-serif;
      scroll-snap-align:center;-webkit-font-smoothing:antialiased}
    html{scroll-snap-type:y proximity}
    @media print { html,body{background:#fff} .deck{gap:0;padding:0} .slide{box-shadow:none;break-after:page;page-break-after:always} }
    ${css ?? ''}`;
  const body = slides.map((s) => s.html).join('\n');
  return `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${csp}">` +
    `<title>${(title ?? 'Slide deck').replace(/[<>&]/g, '')}</title>` +
    `${FONTS}<style>${style}</style></head><body><div class="deck">${body}</div></body></html>`;
}

// Trigger a browser download of a text file (real app origin — downloads work).
export function downloadHtml(filename, html) {
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// A standalone "full size" page: the artboard lives inside a sandbox="" iframe
// so the model HTML runs at a null origin and can never touch the app origin.
// The outer page carries no script and a page-level CSP of its own.
export function artboardFullPage(data) {
  const inner = artboardDoc(data).replace(/"/g, '&quot;');
  const outerCsp = "default-src 'none'; style-src 'unsafe-inline'; frame-src *";
  return `<!doctype html><html><head><meta charset="utf-8">` +
    `<meta http-equiv="Content-Security-Policy" content="${outerCsp}">` +
    `<title>${(data.title ?? 'Artboard').replace(/[<>&]/g, '')}</title>` +
    `<style>html,body{margin:0;background:#0d0c0a;display:grid;place-items:center;min-height:100vh}` +
    `iframe{border:none;width:${data.width}px;height:${data.height}px;max-width:100vw;background:#F7F6F2}</style></head>` +
    `<body><iframe sandbox="" srcdoc="${inner}"></iframe></body></html>`;
}
