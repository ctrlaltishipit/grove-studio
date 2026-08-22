// Sanitizer for model-authored slide/infographic HTML — ported from
// projects/MT_V2 server/carousel/sanitize.ts. The designer writes real
// markup; this enforces the safety floor: no script execution, no event
// handlers, no external requests beyond Google Fonts and data: images.
// Output renders only inside sandbox="" iframes, but defense-in-depth is cheap.

const ALLOWED_URL = (u) => {
  const url = String(u ?? '').trim().toLowerCase();
  return (
    url.startsWith('data:image/') ||
    url.startsWith('#') ||
    url.startsWith('https://fonts.googleapis.com') ||
    url.startsWith('https://fonts.gstatic.com')
  );
};

/** Balance obviously-unclosed divs so one bad slide can't eat the wrapper. */
function healFragment(html) {
  const opens = (html.match(/<div\b/gi) ?? []).length;
  const closes = (html.match(/<\/div>/gi) ?? []).length;
  if (opens > closes) html += '</div>'.repeat(opens - closes);
  return html;
}

/** Strip fences, dangerous elements, handlers and off-origin references. */
export function sanitizeHtml(raw, rootClass = 'slide') {
  let html = String(raw ?? '')
    .trim()
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  html = html.replace(
    /<\s*(script|iframe|object|embed|link|meta|base|form|input|button|video|audio|source)\b[\s\S]*?(?:<\/\s*\1\s*>|\/?>)/gi,
    '',
  );
  // Inline event handlers. The boundary before the handler is any non
  // attribute-name char — a slash separates HTML attributes too, so `/onload`
  // must be caught, not just ` onload`. Loop to a fixed point so adjacent or
  // overlapping handlers can't shelter behind each other.
  const HANDLER = /[\s/]on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
  let prev;
  do { prev = html; html = html.replace(HANDLER, ' '); } while (html !== prev);
  html = html.replace(/javascript\s*:/gi, 'blocked:');
  // URL-bearing attributes: capture quoted AND unquoted values, run every one
  // through ALLOWED_URL. An unquoted off-origin src would otherwise leak.
  html = html.replace(
    /\b(src|href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
    (m, attr, dq, sq, uq) => (ALLOWED_URL(dq ?? sq ?? uq ?? '') ? m : `${attr}=""`),
  );
  html = html.replace(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi, (m, _q, u) => (ALLOWED_URL(u) ? m : 'none'));
  html = html.replace(/@import[^;]+;/gi, '');

  html = healFragment(html);

  if (!new RegExp(`^<div[^>]*class\\s*=\\s*["'][^"']*\\b${rootClass}\\b`, 'i').test(html)) {
    html = `<div class="${rootClass}">${html}</div>`;
  }
  return html;
}

/** CSS floor: no imports, no external urls, no expression(). */
export function sanitizeCss(raw) {
  let css = String(raw ?? '')
    .trim()
    .replace(/^```(?:css)?\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();
  css = css.replace(/@import[^;]+;/gi, '');
  css = css.replace(/expression\s*\(/gi, 'blocked(');
  css = css.replace(/url\(\s*(['"]?)([^)'"]*)\1\s*\)/gi, (m, _q, u) => (ALLOWED_URL(u) ? m : 'none'));
  return css;
}
