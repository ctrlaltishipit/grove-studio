// =============================================================================
// Collaboration helpers, pure and dependency-free: line diffs and per-line
// attribution for version history, caret math for live cursors and for
// keeping your caret put while a teammate's edit lands, @mention parsing.
// =============================================================================

const MAX_DIFF_LINES = 800;

// Line-level diff of two texts via LCS: [{ type: 'same'|'add'|'del', line }].
// Past MAX_DIFF_LINES it degrades to "everything replaced".
export function lineDiff(a, b) {
  const A = a.split('\n');
  const B = b.split('\n');
  if (A.length > MAX_DIFF_LINES || B.length > MAX_DIFF_LINES) {
    return [...A.map((line) => ({ type: 'del', line })), ...B.map((line) => ({ type: 'add', line }))];
  }
  const n = A.length; const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out = [];
  let i = 0; let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ type: 'same', line: A[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ type: 'del', line: A[i] }); i++; }
    else { out.push({ type: 'add', line: B[j] }); j++; }
  }
  while (i < n) out.push({ type: 'del', line: A[i++] });
  while (j < m) out.push({ type: 'add', line: B[j++] });
  return out;
}

// Summary of what changed between two texts: +added −removed and the line
// ranges (1-based, in the NEW text) that were touched.
export function changeSummary(prev, next) {
  const ops = lineDiff(prev ?? '', next ?? '');
  let added = 0; let removed = 0; let lineNo = 0;
  const ranges = [];
  let open = null;
  for (const op of ops) {
    if (op.type === 'same') { lineNo++; if (open) { ranges.push(open); open = null; } continue; }
    if (op.type === 'add') { lineNo++; added++; if (!open) open = { from: lineNo, to: lineNo }; else open.to = lineNo; }
    if (op.type === 'del') { removed++; if (!open) open = { from: Math.max(1, lineNo + 1), to: Math.max(1, lineNo) }; }
  }
  if (open) ranges.push(open);
  return { added, removed, ranges };
}

export function rangesLabel(ranges) {
  if (!ranges.length) return '';
  const parts = ranges.slice(0, 3).map((r) => (r.to > r.from ? `${r.from}–${r.to}` : `${Math.max(r.from, r.to)}`));
  return `line${ranges.length === 1 && ranges[0].to === ranges[0].from ? '' : 's'} ${parts.join(', ')}${ranges.length > 3 ? '…' : ''}`;
}

// Per-line attribution of `current`, walking versions oldest → newest:
// each line keeps the author of the version that introduced it.
// Returns [{ author_user, at }] aligned with current.split('\n').
export function blame(versions, current) {
  const sorted = [...versions].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  if (!sorted.length) return current.split('\n').map(() => null);
  let text = sorted[0].body ?? '';
  let attr = text.split('\n').map(() => ({ author_user: sorted[0].author_user, at: sorted[0].created_at }));
  const step = (nextText, who, at) => {
    const ops = lineDiff(text, nextText);
    const next = [];
    let i = 0;
    for (const op of ops) {
      if (op.type === 'same') { next.push(attr[i++]); }
      else if (op.type === 'del') { i++; }
      else next.push({ author_user: who, at });
    }
    text = nextText; attr = next;
  };
  for (const v of sorted.slice(1)) step(v.body ?? '', v.author_user, v.created_at);
  if (text !== current) step(current, null, null); // unsaved or unsnapshotted edits
  return attr;
}

// Where your caret should be after a peer's edit replaced the text, so it
// stays on the same characters rather than jumping to the end.
export function caretAfterRemote(oldText, newText, caret) {
  let p = 0;
  const max = Math.min(oldText.length, newText.length);
  while (p < max && oldText[p] === newText[p]) p++;
  let s = 0;
  while (s < max - p && oldText[oldText.length - 1 - s] === newText[newText.length - 1 - s]) s++;
  if (caret <= p) return caret;
  if (caret >= oldText.length - s) return caret + (newText.length - oldText.length);
  return Math.min(p, newText.length);
}

export const lineOfOffset = (text, offset) => (text.slice(0, Math.max(0, offset)).match(/\n/g)?.length ?? 0) + 1;
export const lineText = (text, line) => (text.split('\n')[line - 1] ?? '');
export function offsetOfLine(text, line) {
  const lines = text.split('\n');
  let off = 0;
  for (let i = 0; i < line - 1 && i < lines.length; i++) off += lines[i].length + 1;
  return off;
}

// Pixel position of a character offset inside a textarea, via a hidden
// mirror with the same metrics. Returns { top, left, height } relative to
// the textarea's box.
const mirrors = new WeakMap();
export function measureCaret(textarea, offset) {
  if (!textarea) return null;
  let mirror = mirrors.get(textarea);
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none;top:0;left:-99999px;white-space:pre-wrap;overflow-wrap:break-word;';
    document.body.appendChild(mirror);
    mirrors.set(textarea, mirror);
  }
  const cs = getComputedStyle(textarea);
  for (const prop of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderTopWidth', 'boxSizing']) {
    mirror.style[prop] = cs[prop];
  }
  mirror.style.width = textarea.clientWidth + 'px';
  const text = textarea.value;
  const at = Math.max(0, Math.min(offset, text.length));
  mirror.textContent = text.slice(0, at);
  const mark = document.createElement('span');
  mark.textContent = text[at] === '\n' || at === text.length ? '​' : text[at];
  mirror.appendChild(mark);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.5;
  return { top: mark.offsetTop - textarea.scrollTop, left: mark.offsetLeft, height: lh };
}

// ---- @mentions ---------------------------------------------------------------

// The "@par" being typed right before the caret, or null.
export function mentionQuery(text, caret) {
  const before = text.slice(0, caret);
  const m = before.match(/(?:^|\s)@([^\s@]{0,30})$/);
  return m ? { query: m[1], start: before.length - m[1].length - 1 } : null;
}

export function insertMention(text, caret, start, name) {
  const before = text.slice(0, start);
  const after = text.slice(caret);
  const inserted = `@${name} `;
  return { text: before + inserted + after, caret: before.length + inserted.length };
}

// Members mentioned in text, by exact @Name (case-insensitive), longest first.
export function findMentions(text, members) {
  const t = text.toLowerCase();
  const hits = [];
  const byLength = [...members].filter((m) => m.name).sort((a, b) => b.name.length - a.name.length);
  for (const m of byLength) {
    if (t.includes('@' + m.name.toLowerCase())) hits.push(m);
  }
  return hits;
}

export const ROLE_LABEL = { owner: 'Admin', editor: 'Can edit', member: 'Can edit', viewer: 'View only' };
export const roleCanEdit = (role) => role === 'owner' || role === 'editor' || role === 'member';
