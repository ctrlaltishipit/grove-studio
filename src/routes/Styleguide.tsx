// Grove — styleguide. Every token (§5, §6) and every component in src/ds in
// every documented state (§8), on one long page, reviewable in both themes.
// GROVE-MASTER.md §5, §6, §8, §9.
//
// A reviewer's page, not a product screen. It carries a local appearance
// control, reads token values live from getComputedStyle, and uses small
// inline layout styles (gap, grid, width) that product screens never would.
// Every colour on it is still a CSS variable; every string is still the copy
// deck's. Nothing here is fetched — the fixtures in ./dev/fixtures are the data.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Badge } from '../ds/Badge';
import { Chip } from '../ds/Chip';
import { CodeInput } from '../ds/CodeInput';
import { Composer } from '../ds/Composer';
import { ConvergenceGrid } from '../ds/ConvergenceGrid';
import { Disagreement } from '../ds/Disagreement';
import { Empty } from '../ds/Empty';
import { FindingCard } from '../ds/FindingCard';
import { Header } from '../ds/Header';
import { Icon, type IconName } from '../ds/Icon';
import { NoteCard } from '../ds/NoteCard';
import { Notice } from '../ds/Notice';
import { OfflineBanner } from '../ds/OfflineBanner';
import { Placeholder } from '../ds/Placeholder';
import { QuestionBand } from '../ds/QuestionBand';
import { Receipt } from '../ds/Receipt';
import { Recording } from '../ds/Recording';
import { RosterRail } from '../ds/RosterRail';
import { RosterStrip } from '../ds/RosterStrip';
import { StudioPanel } from '../ds/StudioPanel';
import { ThemeToggle } from '../ds/ThemeToggle';
import { MindMap } from '../ds/stretch/MindMap';
import { useToast } from '../ds/Toast';
import type { Finding, Note, NoteKind } from '../lib/models';
import { buildSupporters } from '../lib/supporters';
import { setTheme, storedTheme, type Theme } from '../lib/theme';
import { ME, findingObservers, findings, noteCount, ownNotes, roster, session, synthesisedAt } from './dev/fixtures';

/* ---------- tokens (§5.2, §5.3, §6.2, §6.3) ---------- */

interface TokenGroup {
  label: string;
  tokens: string[];
}

const COLOUR_GROUPS: TokenGroup[] = [
  { label: 'Foundation', tokens: ['--bg', '--surface', '--sunken', '--border', '--border-strong', '--ink', '--ink-muted', '--ink-faint'] },
  { label: 'Moss primary', tokens: ['--primary', '--primary-hover', '--primary-soft', '--primary-text'] },
  { label: 'Corroboration ladder — the only semantic scale', tokens: ['--corrob-1', '--corrob-2', '--corrob-3'] },
  { label: 'Disagreement — amber, never red', tokens: ['--disagree', '--disagree-soft'] },
  { label: 'Danger — destructive actions only', tokens: ['--danger'] },
  { label: 'Observer identity — join order', tokens: ['--observer-1', '--observer-2', '--observer-3', '--observer-4', '--observer-5'] },
  { label: 'Text on fill — never hardcode a label colour', tokens: ['--badge-ink-1', '--badge-ink-2', '--badge-ink-3', '--observer-initial-ink'] },
];

const SPACE_TOKENS = ['--space-1', '--space-2', '--space-3', '--space-4', '--space-6', '--space-8', '--space-12', '--space-16'];
const RADIUS_TOKENS = ['--radius-card', '--radius-input', '--radius-badge'];

const ALL_TOKENS = [...COLOUR_GROUPS.flatMap((g) => g.tokens), ...SPACE_TOKENS, ...RADIUS_TOKENS];

function readTokens(names: string[]): Record<string, string> {
  const cs = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const name of names) out[name] = cs.getPropertyValue(name).trim();
  return out;
}

/* ---------- type scale (§6.1) ---------- */

interface TypeRole {
  cls: string;
  role: string;
  spec: string;
  sample: string;
}

const TYPE_SCALE: TypeRole[] = [
  { cls: 't-display', role: 'Display',       spec: '32 / 1.15 · 650 · −0.02em',                        sample: 'Notes from three people who could not see each other.' },
  { cls: 't-h1',      role: 'Heading 1',     spec: '24 / 1.25 · 650 · −0.01em',                        sample: 'Findings' },
  { cls: 't-h2',      role: 'Heading 2',     spec: '20 / 1.30 · 650',                                  sample: 'What makes them hesitate before buying?' },
  { cls: 't-h3',      role: 'Heading 3',     spec: '17 / 1.35 · 500',                                  sample: 'Seen by one observer only' },
  { cls: 't-note',    role: 'Note text',     spec: '17 / 1.60 · 400 · every breakpoint',               sample: 'She compared our price to what she already pays, not to what it would replace.' },
  { cls: 't-body',    role: 'Body',          spec: '15 / 1.55 · 400',                                  sample: 'Ranked by how many observers independently noted them.' },
  { cls: 't-badge',   role: 'Badge',         spec: '15 / 1.00 · 650 · −0.01em · tabular',              sample: '3 of 3 observers' },
  { cls: 't-label',   role: 'Label',         spec: '13 / 1.40 · 500',                                  sample: 'Counts only. Note text stays in each observer’s lane.' },
  { cls: 't-receipt', role: 'Receipt',       spec: '13 / 1.50 · 400 · 0.005em · tabular',              sample: '3 observers · 20 notes · written in separate lanes' },
  { cls: 't-micro',   role: 'Micro',         spec: '12 / 1.40 · 500',                                  sample: 'observation · 15:47' },
  { cls: 't-tracked', role: 'Tracked label', spec: '11 / 1.20 · 650 · 0.08em · the only uppercase style', sample: 'Research question' },
  { cls: 't-code',    role: 'Join code',     spec: '20 / 1.20 · 650 · 0.12em · mono',                  sample: 'TQ8FVX' },
];

/* ---------- small helpers, local to this page ---------- */

const APPEARANCE: { label: string; value: Theme | null }[] = [
  { label: 'System', value: null },
  { label: 'Light',  value: 'light' },
  { label: 'Dark',   value: 'dark' },
];

const KINDS: { value: NoteKind; label: string }[] = [
  { value: 'observation', label: 'Observation' },
  { value: 'quote',       label: 'Quote' },
  { value: 'question',    label: 'Question' },
];

const ICONS: IconName[] = ['copy', 'sun', 'moon', 'system', 'mic', 'play', 'pause', 'chev', 'check'];

/** The complete empty-state set, verbatim. GROVE-MASTER.md §8.17. */
const EMPTY_STRINGS: { id: string; where: string; copy: string }[] = [
  { id: 'E1',  where: 'Landing',         copy: 'Create a session, or join one with a six-character code.' },
  { id: 'E2',  where: 'Capture',         copy: 'Your notes appear here. Only you can see them.' },
  { id: 'E3',  where: 'Capture',         copy: 'You’re the only observer here. Share the code TQ8FVX.' },
  { id: 'E4',  where: 'Capture',         copy: 'Synthesise — available when two observers have notes' },
  { id: 'E5',  where: 'Findings',        copy: 'No findings yet. Synthesise when the session is done.' },
  { id: 'E6',  where: 'Findings',        copy: 'Synthesising 41 notes.' },
  { id: 'E7',  where: 'Findings',        copy: 'Synthesis didn’t complete. Your notes are saved. Try again.' },
  { id: 'E8',  where: 'Findings',        copy: 'No findings from these notes. Add more and synthesise again.' },
  { id: 'E9',  where: 'Join',            copy: 'No session with that code. Check the six characters and try again.' },
  { id: 'E10', where: 'Any route',       copy: 'Not connected. Your draft is saved on this device.' },
  { id: 'E11', where: 'Capture',         copy: 'That note didn’t save. It’s still in the box — try again.' },
  { id: 'E12', where: 'Shared findings', copy: 'No findings at this link yet.' },
  { id: 'E13', where: 'Findings',        copy: '(no copy — the convergence grid is simply absent)' },
  { id: 'E14', where: 'Capture',         copy: 'Synthesise — available at 3 notes' },
  { id: 'E15', where: 'Findings',        copy: 'Audio didn’t render. The findings are unchanged. Try again.' },
  { id: 'E16', where: 'Capture',         copy: 'Grove can’t reach the microphone. Type the note instead.' },
];

// Every <Spec id> on the page appears here, and nothing else does — the nav is
// derived from this one list so a new section cannot go unreachable.
const NAV: { id: string; label: string }[] = [
  { id: 'tokens',   label: 'Tokens' },
  { id: 'space',    label: 'Space' },
  { id: 'radii',    label: 'Radii' },
  { id: 'type',     label: 'Type' },
  { id: 'elevation', label: 'Elevation' },
  { id: 's8-1',     label: 'Buttons' },
  { id: 's8-2',     label: 'Inputs' },
  { id: 's8-3',     label: 'Textarea' },
  { id: 's8-4',     label: 'Composer' },
  { id: 's8-5',     label: 'Kind' },
  { id: 's8-20',    label: 'Dictate' },
  { id: 's8-21',    label: 'Recording' },
  { id: 's8-6',     label: 'Notes' },
  { id: 's8-7',     label: 'Chip' },
  { id: 's8-8',     label: 'Roster' },
  { id: 's8-9',     label: 'Badge' },
  { id: 's8-10',    label: 'Findings' },
  { id: 's8-11',    label: 'Disagreement' },
  { id: 's8-14',    label: 'Receipt' },
  { id: 's8-12',    label: 'Grid' },
  { id: 's8-23',    label: 'Mind map' },
  { id: 's8-15',    label: 'Code' },
  { id: 's8-16',    label: 'Feedback' },
  { id: 's8-17',    label: 'Empty' },
  { id: 'notice',   label: 'Notice' },
  { id: 'offline',  label: 'Offline' },
  { id: 'question', label: 'Question' },
  { id: 's8-18',    label: 'Placeholder' },
  { id: 's8-19',    label: 'Theme' },
  { id: 'chrome',   label: 'Chrome' },
  { id: 'icons',    label: 'Icons' },
  { id: 'studio',   label: 'Studio' },
  { id: 'wsp',      label: 'Workspace' },
];

const noop = () => {};

/** One section: a tracked label naming the component and its §8 number, an optional note, then the specimens. */
function Spec({ id, label, note, children }: { id: string; label: string; note?: string; children: ReactNode }) {
  return (
    <section id={id} style={{ marginTop: 'var(--space-12)' }}>
      <div className="t-tracked muted">{label}</div>
      {note && <p className="t-label muted" style={{ marginTop: 'var(--space-1)', maxWidth: '68ch' }}>{note}</p>}
      <div style={{ marginTop: 'var(--space-4)' }}>{children}</div>
    </section>
  );
}

/** One specimen with a micro label naming its state above it. */
function State({ label, children, block }: { label: string; children: ReactNode; block?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', minWidth: 0, flex: block ? '1 1 100%' : undefined }}>
      <span className="t-micro muted">{label}</span>
      <div>{children}</div>
    </div>
  );
}

/** A colour token: the swatch painted through the variable, its name, and its computed hex. */
function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div style={{ width: 136 }}>
      <div style={{ height: 48, borderRadius: 'var(--radius-input)', border: '1px solid var(--border)', background: `var(${name})` }} />
      <div className="t-micro" style={{ marginTop: 'var(--space-1)' }}>{name}</div>
      <div className="t-micro muted tabular">{value.toUpperCase()}</div>
    </div>
  );
}

/** Mounts its child, then presses the named button once — so a state a
 *  component reaches only through interaction (editing, confirming delete)
 *  is visible on the page without re-implementing the component's markup. */
function Staged({ press, children }: { press: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const buttons = box.current?.querySelectorAll('button');
    if (!buttons) return;
    for (const b of Array.from(buttons)) {
      if (b.textContent === press) { b.click(); break; }
    }
  }, [press]);
  return <div ref={box}>{children}</div>;
}

const row = { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'var(--space-6)' } as const;

export function Styleguide() {
  /* ---------- theme: local control, and live token values ---------- */
  const [tick, setTick] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const bump = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => { setValues(readTokens(ALL_TOKENS)); }, [tick]);

  // Re-read the hexes whenever the theme changes — from the control here, from
  // the header toggle, or from the system while "System" is selected.
  useEffect(() => {
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', bump);
    return () => { observer.disconnect(); mq.removeEventListener('change', bump); };
  }, [bump]);

  // Some specimens focus themselves on mount (the composer, the editing note
  // card). Blur them and open the page where it starts, or at the hash.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = document.activeElement;
      if (el instanceof HTMLElement) el.blur();
      const hash = window.location.hash.slice(1);
      const target = hash ? document.getElementById(hash) : null;
      if (target) target.scrollIntoView();
      else window.scrollTo(0, 0);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const stored = storedTheme();
  const choose = (next: Theme | null) => { setTheme(next); bump(); };

  /* ---------- specimen state ---------- */
  const toast = useToast();
  const [composerValue, setComposerValue] = useState('');
  const [composerError, setComposerError] = useState(false);
  const [composerBusy, setComposerBusy] = useState(false);
  const [kind, setKind] = useState<NoteKind>('observation');
  const [stripCollapsed, setStripCollapsed] = useState(false);
  const [codeEmpty, setCodeEmpty] = useState('');
  const [codePartial, setCodePartial] = useState('TQ8');
  const [codeError, setCodeError] = useState('TQ8FVX');
  const [codeFilled, setCodeFilled] = useState('TQ8FVX');

  const supporters = buildSupporters(findingObservers);
  const contributorsFor = (f: Finding) => {
    const set = supporters.get(f.id) ?? new Set<string>();
    return roster.filter((r) => set.has(r.participant_id));
  };
  const threeOfThree = findings[0];
  const twoOfThreeDisagree = findings[1];
  const oneOfThree = findings[3];

  // A two-observer session, derived the way Grove derives it: observer_count
  // is the number of distinct observers among the two, counted from ids, and
  // the rows are re-ranked by it. Never a sliced roster beside unchanged counts.
  const twoRoster = roster.slice(0, 2);
  const twoIds = new Set(twoRoster.map((r) => r.participant_id));
  const twoFindings: Finding[] = findings
    .map((f) => ({ ...f, observer_count: Array.from(supporters.get(f.id) ?? []).filter((id) => twoIds.has(id)).length }))
    .filter((f) => f.observer_count > 0)
    .sort((a, b) => b.observer_count - a.observer_count)
    .map((f, i) => ({ ...f, rank: i + 1 }));

  const noteDefault = ownNotes[0];
  const notePending: Note = { ...ownNotes[1], pending: true };
  const noteFailed: Note = { ...ownNotes[2], failed: true };
  const noteEditing = ownNotes[3];
  const noteConfirming = ownNotes[4];

  return (
    <>
      <Header linkHome={false} right={<span className="t-label muted">styleguide</span>} />
      <OfflineBanner />

      <main className="page col-content" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-16)' }}>
        <h1 className="t-h1">Styleguide</h1>
        <p className="t-body muted" style={{ marginTop: 'var(--space-2)', maxWidth: '68ch' }}>
          Every token and every component in every documented state. Review it in both themes, at 375, 768, 1024 and 1440.
        </p>

        {/* ---------- appearance: a local control so a reviewer can flip themes here ---------- */}
        <div className="row" style={{ marginTop: 'var(--space-6)', flexWrap: 'wrap' }}>
          <span className="t-label">Appearance</span>
          <div className="segmented" role="radiogroup" aria-label="Appearance">
            {APPEARANCE.map((a) => (
              <button
                key={a.label}
                type="button"
                role="radio"
                aria-checked={stored === a.value}
                className="segmented__item"
                onClick={() => choose(a.value)}
              >
                {a.label}
              </button>
            ))}
          </div>
          <span className="t-label muted">Saved on this device.</span>
        </div>

        <nav aria-label="Sections" className="row" style={{ marginTop: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="btn btn--ghost btn--sm" style={{ textDecoration: 'none' }}>{n.label}</a>
          ))}
        </nav>

        {/* ================= TOKENS ================= */}
        <Spec id="tokens" label="§5 Colour tokens" note="Painted through the CSS variable; the hex beside each is read live from getComputedStyle, so it changes with the theme.">
          <div className="stack stack-6">
            {COLOUR_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="t-label muted">{g.label}</div>
                <div style={{ ...row, gap: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                  {g.tokens.map((t) => <Swatch key={t} name={t} value={values[t] ?? ''} />)}
                </div>
              </div>
            ))}
          </div>
        </Spec>

        <Spec id="space" label="§6.2 Spacing" note="8-based, with a 4 and a 12 for fine work. Use only these values.">
          <div className="stack stack-2">
            {SPACE_TOKENS.map((t) => (
              <div key={t} className="row">
                <span className="t-micro muted" style={{ width: 96 }}>{t}</span>
                <span style={{ display: 'block', height: 12, width: `var(${t})`, background: 'var(--primary)', borderRadius: 2 }} />
                <span className="t-micro tabular">{values[t] ?? ''}</span>
              </div>
            ))}
          </div>
        </Spec>

        <Spec id="radii" label="§6.3 Radii" note="Cards, inputs and pills. Nothing else — convergence grid cells are square.">
          <div style={row}>
            {RADIUS_TOKENS.map((t) => (
              <State key={t} label={`${t} · ${values[t] ?? ''}`}>
                <div style={{ width: 120, height: 64, background: 'var(--sunken)', border: '1px solid var(--border-strong)', borderRadius: `var(${t})` }} />
              </State>
            ))}
          </div>
        </Spec>

        <Spec id="type" label="§6.1 Type scale" note="One family. Weights 400, 500, 650. Every counting number is tabular.">
          <div className="stack stack-4">
            {TYPE_SCALE.map((t) => (
              <div key={t.cls} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 200px) 1fr', gap: 'var(--space-4)', alignItems: 'baseline' }}>
                <div>
                  <div className="t-label">{t.role}</div>
                  <div className="t-micro muted">{t.spec}</div>
                  <div className="t-micro muted">.{t.cls}</div>
                </div>
                <div className={t.cls}>{t.sample}</div>
              </div>
            ))}
          </div>
        </Spec>

        <Spec id="elevation" label="§6.4 Elevation" note="Two levels, and there is no third. A shadow exists only so content scrolling under a sticky element stays legible.">
          <div style={row}>
            <State label="Level 0 — surface + 1px border">
              <div className="card" style={{ width: 200 }}><span className="t-body">Note cards, finding cards, composer</span></div>
            </State>
            <State label="Level 1 — plus a 1px shadow">
              <div className="card elev-1" style={{ width: 200 }}><span className="t-body">Sticky composer, strip, toast, popover</span></div>
            </State>
          </div>
        </Spec>

        {/* ================= COMPONENTS ================= */}
        <Spec id="s8-1" label="8.1 Button" note="Hover, focus and active are live on the specimens. Disabled states its reason in its own label. Destructive is never disabled.">
          <div className="stack stack-6">
            <State label="Primary — default · small · icon-only · disabled">
              <div style={row}>
                <button type="button" className="btn btn--primary">Create a session</button>
                <button type="button" className="btn btn--primary btn--sm">Save</button>
                <button type="button" className="btn btn--primary btn--icon" aria-label="Copy session code"><Icon name="copy" size={16} /></button>
                <button type="button" className="btn btn--primary" disabled>Creating session.</button>
              </div>
            </State>
            <State label="Secondary — default · small · icon-only · disabled">
              <div style={row}>
                <button type="button" className="btn btn--secondary">Copy share link</button>
                <button type="button" className="btn btn--secondary btn--sm">Stop</button>
                <button type="button" className="btn btn--secondary btn--icon" aria-label="Copy session code"><Icon name="copy" size={16} /></button>
                <button type="button" className="btn btn--secondary" disabled>Join</button>
              </div>
            </State>
            <State label="Ghost — default · small · icon-only · disabled">
              <div style={row}>
                <button type="button" className="btn btn--ghost">Back</button>
                <button type="button" className="btn btn--ghost btn--sm">Keep</button>
                <button type="button" className="btn btn--ghost btn--icon" aria-label="Copy session code"><Icon name="copy" size={16} /></button>
                <button type="button" className="btn btn--ghost" disabled>Export as markdown</button>
              </div>
            </State>
            <State label="Destructive — default · small. Inside an inline confirmation only. Never disabled.">
              <div style={row}>
                <button type="button" className="btn btn--destructive">Delete</button>
                <button type="button" className="btn btn--destructive btn--sm">Delete</button>
              </div>
            </State>
            <State label="Block, and a disabled label that states its reason (E4, E14) — wraps rather than truncates">
              <div className="stack stack-3" style={{ maxWidth: 320 }}>
                <button type="button" className="btn btn--primary btn--block">Synthesise</button>
                <button type="button" className="btn btn--secondary btn--block" disabled style={{ height: 'auto', minHeight: 'var(--control-h)', paddingTop: 8, paddingBottom: 8, whiteSpace: 'normal' }}>
                  Synthesise — available when two observers have notes
                </button>
                <button type="button" className="btn btn--secondary btn--block" disabled style={{ height: 'auto', minHeight: 'var(--control-h)', paddingTop: 8, paddingBottom: 8, whiteSpace: 'normal' }}>
                  Synthesise — available at 3 notes
                </button>
              </div>
            </State>
          </div>
        </Spec>

        <Spec id="s8-2" label="8.2 Text input" note="Label permanently visible. Focus is live — tab into a specimen for the --primary border and ring. 16px minimum, always.">
          <div style={{ ...row, gap: 'var(--space-6)' }}>
            <State label="Default">
              <label className="field" style={{ width: 280 }}>
                <span className="field__label">Session title</span>
                <input className="input" type="text" placeholder="Pricing discovery — Acme" />
                <span className="field__help">Shown to everyone who joins.</span>
              </label>
            </State>
            <State label="Error — helper replaced by the error string, aria-invalid set">
              <label className="field" style={{ width: 280 }}>
                <span className="field__label">Session title</span>
                <input className="input" type="text" aria-invalid="true" defaultValue="" placeholder="Pricing discovery — Acme" />
                <span className="field__error">Add a session title.</span>
              </label>
            </State>
            <State label="Disabled">
              <label className="field" style={{ width: 280 }}>
                <span className="field__label">Your display name</span>
                <input className="input" type="text" disabled defaultValue="Priya" />
                <span className="field__help">Other observers see your name and how many notes you’ve written. They never see the notes.</span>
              </label>
            </State>
          </div>
        </Spec>

        <Spec id="s8-3" label="8.3 Textarea" note="Minimum 3 rows, resize vertical only. No character counter — Grove has no limit on note length.">
          <div style={row}>
            <State label="Default">
              <label className="field" style={{ width: 320 }}>
                <span className="field__label">Session title</span>
                <textarea className="textarea" rows={3} placeholder="Pricing discovery — Acme" />
              </label>
            </State>
            <State label="Heavy (.textarea--heavy) — the research question at 17px">
              <label className="field" style={{ width: 320 }}>
                <span className="field__label">Research question</span>
                <textarea className="textarea textarea--heavy" rows={3} placeholder="What makes them hesitate before buying?" />
                <span className="field__help">Pinned at the top of the session for every observer. It cannot be changed once the session starts.</span>
              </label>
            </State>
            <State label="Error">
              <label className="field" style={{ width: 320 }}>
                <span className="field__label">Research question</span>
                <textarea className="textarea textarea--heavy" rows={3} aria-invalid="true" />
                <span className="field__error">Add a research question.</span>
              </label>
            </State>
          </div>
        </Spec>

        <Spec id="s8-4" label="8.4 Composer" note="Default is empty (Add note disabled); focus-within is live. Toggle the error notice (E11) and the submitting state here. Dictation renders only where SpeechRecognition exists.">
          <div className="row" style={{ marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn--secondary btn--sm" aria-pressed={composerError} onClick={() => setComposerError((v) => !v)}>Error notice</button>
            <button type="button" className="btn btn--secondary btn--sm" aria-pressed={composerBusy} onClick={() => setComposerBusy((v) => !v)}>Submitting</button>
          </div>
          <div style={{ maxWidth: 'var(--column-max)' }}>
            <Composer
              value={composerValue}
              onChange={setComposerValue}
              onSubmit={() => setComposerValue('')}
              error={composerError}
              submitting={composerBusy}
            />
          </div>
        </Spec>

        <Spec id="s8-5" label="8.5 Kind selector (segmented)" note="One tab stop; arrow keys move within the group. No kind gets a colour.">
          <div style={row}>
            <State label="Default — Observation selected, remembered for the session">
              <div className="segmented" role="radiogroup" aria-label="Note kind">
                {KINDS.map((k) => (
                  <button
                    key={k.value}
                    type="button"
                    role="radio"
                    aria-checked={kind === k.value}
                    tabIndex={kind === k.value ? 0 : -1}
                    className="segmented__item"
                    onClick={() => setKind(k.value)}
                    onKeyDown={(e) => {
                      const i = KINDS.findIndex((x) => x.value === kind);
                      if (e.key === 'ArrowRight') setKind(KINDS[(i + 1) % KINDS.length].value);
                      if (e.key === 'ArrowLeft')  setKind(KINDS[(i + KINDS.length - 1) % KINDS.length].value);
                    }}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </State>
            <State label="Disabled — whole track at 60%">
              <div className="segmented" role="radiogroup" aria-label="Note kind" aria-disabled="true" style={{ opacity: 0.6 }}>
                {KINDS.map((k) => (
                  <button key={k.value} type="button" role="radio" aria-checked={k.value === 'observation'} className="segmented__item" disabled>
                    {k.label}
                  </button>
                ))}
              </div>
            </State>
          </div>
        </Spec>

        <Spec id="s8-21" label="8.21 Recording indicator" note="Replaces the composer’s keyboard-hint slot while dictating. Text and a button; nothing animates.">
          <div className="row" style={{ maxWidth: 480 }}>
            <span className="t-micro muted">Kind selector sits here</span>
            <Recording seconds={12} onStop={noop} />
          </div>
        </Spec>

        <Spec id="s8-6" label="8.6 Note card" note="Edit and Delete are always visible. Pending and failed hide the actions; editing and confirming are the card’s own states, staged here by pressing its buttons.">
          <div className="stack stack-4" style={{ maxWidth: 'var(--column-max)' }}>
            <State label="Default — hover raises the border to --border-strong">
              <NoteCard note={noteDefault} onSave={noop} onDelete={noop} />
            </State>
            <State label="Pending — 60% opacity, meta reads Saving., no animation">
              <NoteCard note={notePending} onSave={noop} onDelete={noop} />
            </State>
            <State label="Failed — 3px --danger left border, meta reads Not saved.">
              <NoteCard note={noteFailed} onSave={noop} onDelete={noop} />
            </State>
            <State label="Editing — inline 17px textarea, Save and Cancel, Escape cancels">
              <Staged press="Edit">
                <NoteCard note={noteEditing} onSave={noop} onDelete={noop} />
              </Staged>
            </State>
            <State label="Confirming delete — inline, never a modal">
              <Staged press="Delete">
                <NoteCard note={noteConfirming} onSave={noop} onDelete={noop} />
              </Staged>
            </State>
          </div>
        </Spec>

        <Spec id="s8-7" label="8.7 Observer chip" note="Default only — not interactive anywhere, no title attribute. Same colour for the same person everywhere. Observer 3 in light mode takes --ink initials: white fails at 3.30:1.">
          <div style={row}>
            <State label="Five identity colours, in join order">
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <Chip name="Priya R." colourIndex={0} />
                <Chip name="Arjun M." colourIndex={1} />
                <Chip name="Nikhil S." colourIndex={2} />
                <Chip name="Meera K." colourIndex={3} />
                <Chip name="Rohan D." colourIndex={4} />
              </div>
            </State>
            <State label="Observer 3 — the light-mode exception (--ink initials)">
              <Chip name="Nikhil S." colourIndex={2} />
            </State>
            <State label="Small — 20px, grid column headers below 640px">
              <div className="row" style={{ gap: 'var(--space-3)' }}>
                <Chip name="Priya R." colourIndex={0} small />
                <Chip name="Arjun M." colourIndex={1} small />
                <Chip name="Nikhil S." colourIndex={2} small />
                <Chip name="Meera K." colourIndex={3} small />
                <Chip name="Rohan D." colourIndex={4} small />
              </div>
            </State>
            <State label="Self — 1.5px --border-strong ring, strip only">
              <Chip name="Priya R." colourIndex={0} self />
            </State>
          </div>
        </Spec>

        <Spec id="s8-8" label="8.8 Roster rail and strip" note="Counts only. Items are not interactive at any breakpoint; the collapse chevron is the strip’s only handler. There is no away, offline or idle state.">
          <div style={row}>
            <State label="Rail — default, with (you)">
              <RosterRail roster={roster} meId={ME} />
            </State>
            <State label="Rail — loading">
              <RosterRail roster={[]} loading />
            </State>
            <State label="Rail — sole observer, with E3 beneath">
              <div>
                <RosterRail roster={roster.slice(0, 1)} meId={ME} />
                <p className="t-body muted" style={{ marginTop: 'var(--space-3)', paddingLeft: 'var(--space-4)' }}>
                  You’re the only observer here. Share the code <span className="codechip__value">{session.join_code}</span>.
                </p>
              </div>
            </State>
          </div>
          <div className="stack stack-4" style={{ marginTop: 'var(--space-6)', maxWidth: 480 }}>
            <State label="Strip — expanded (press the chevron) and collapsed (press the count)">
              <RosterStrip roster={roster} meId={ME} collapsed={stripCollapsed} onToggle={() => setStripCollapsed((v) => !v)} />
            </State>
            <State label="Strip — collapsed, 20px summary row">
              <RosterStrip roster={roster} meId={ME} collapsed onToggle={noop} />
            </State>
          </div>
        </Spec>

        <Spec id="s8-9" label="8.9 Corroboration badge — the hero component" note="Words and a number. No icon, no dot, no arc, no percentage. Step 3 inverts in dark: dark ink on the light accent.">
          <div style={row}>
            <State label="1 of 3 — step 1"><Badge count={1} total={3} /></State>
            <State label="2 of 3 — step 2"><Badge count={2} total={3} /></State>
            <State label="3 of 3 — step 3"><Badge count={3} total={3} /></State>
            <State label="Solo — singular, step 1, full opacity"><Badge count={1} total={1} /></State>
          </div>
        </Spec>

        <Spec id="s8-10" label="8.10 Finding card" note="Badge → theme → summary → disagreement → Noted by. No hover state, no expand. The sole-observer card is full opacity, full size. Press a grid row label below to see the targeted ring.">
          <div className="stack stack-4">
            <State label="3 of 3 — 6px ladder border" block>
              <FindingCard finding={threeOfThree} total={roster.length} contributors={contributorsFor(threeOfThree)} />
            </State>
            <State label="2 of 3 with a disagreement — ladder border unchanged" block>
              <FindingCard finding={twoOfThreeDisagree} total={roster.length} contributors={contributorsFor(twoOfThreeDisagree)} />
            </State>
            <State label="1 of 3 — grey, not dimmed" block>
              <FindingCard finding={oneOfThree} total={roster.length} contributors={contributorsFor(oneOfThree)} />
            </State>
          </div>
        </Spec>

        <Spec id="s8-11" label="8.11 Disagreement banner" note="Amber on --disagree-soft, 3px left border. Body text in --ink. No warning triangle, no resolve control.">
          <div style={{ maxWidth: 'var(--column-max)' }}>
            <Disagreement note={twoOfThreeDisagree.disagreement_note ?? ''} />
          </div>
        </Spec>

        <Spec id="s8-14" label="8.14 Independence receipt" note="Receipt type, --ink-muted, tabular. Every number computed in application code. The disclosure state is remembered on the device. A missing number omits its clause.">
          <div className="stack stack-8" style={{ maxWidth: 'var(--column-max)' }}>
            <State label="Group — 3 observers">
              <Receipt observers={roster.length} notes={noteCount} at={synthesisedAt} />
            </State>
            <State label="Two observers — never rounds, never inflates">
              <Receipt observers={2} notes={28} at={synthesisedAt} />
            </State>
            <State label="Solo — the lane clause is omitted, and there is no disclosure">
              <Receipt observers={1} notes={22} at={synthesisedAt} solo />
            </State>
            <State label="Timestamp unknown — the clause is omitted, not placeholdered">
              <Receipt observers={roster.length} notes={noteCount} at={null} />
            </State>
          </div>
        </Spec>

        <Spec id="s8-12" label="8.12 / 8.13 Convergence grid" note="A real table. Marks are observer identity colours; cells are not interactive and carry no tooltip. Row labels scroll to the card and move focus — the grid’s only interaction.">
          <div className="stack stack-6">
            <State label="Default — 3 observers, 5 findings" block>
              <ConvergenceGrid findings={findings} roster={roster} supporters={supporters} />
            </State>
            <State label="Two observers — renders normally, counts recomputed from ids" block>
              <ConvergenceGrid findings={twoFindings} roster={twoRoster} supporters={supporters} />
            </State>
            <State label="One observer, or fewer than two findings — renders nothing, silently (E13)" block>
              <ConvergenceGrid findings={findings.slice(0, 1)} roster={roster} supporters={supporters} />
              <ConvergenceGrid findings={findings} roster={roster.slice(0, 1)} supporters={supporters} />
              <p className="t-micro muted">(two grids are mounted here; neither renders)</p>
            </State>
          </div>
        </Spec>

        <Spec id="s8-15" label="8.15 Code input" note="Alphabet ABCDEFGHJKMNPQRSTUVWXYZ23456789 — out-of-alphabet keys are silently rejected. Paste anywhere fills all six. Error keeps the value.">
          <div style={row}>
            <State label="Empty">
              <CodeInput value={codeEmpty} onChange={setCodeEmpty} />
            </State>
            <State label="Partial">
              <CodeInput value={codePartial} onChange={setCodePartial} />
            </State>
            <State label="Error — value kept, not cleared (E9)">
              <div>
                <CodeInput value={codeError} onChange={setCodeError} error />
                <span className="field__error">No session with that code. Check the six characters and try again.</span>
              </div>
            </State>
            <State label="Prefilled from a link — the primary path">
              <CodeInput value={codeFilled} onChange={setCodeFilled} />
            </State>
            <State label="Disabled">
              <CodeInput value="TQ8FVX" onChange={noop} disabled />
            </State>
            <State label="Validating — helper reads">
              <span className="field__help">Checking the code.</span>
            </State>
          </div>
        </Spec>

        <Spec id="s8-16" label="8.16 Toast" note="Bottom-centre, 4 seconds, 180ms opacity, no movement, no icon, no close. One at a time. The complete permitted set:">
          <div style={{ ...row, gap: 'var(--space-3)' }}>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => toast.show('Code copied.')}>Code copied.</button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => toast.show('Share link copied. Anyone with the link can read these findings.')}>Share link copied. Anyone with the link can read these findings.</button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => toast.show('You’ve joined as Priya.')}>You’ve joined as Priya.</button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={() => toast.show('Note deleted.')}>Note deleted.</button>
          </div>
        </Spec>

        <Spec id="s8-17" label="8.17 Empty state" note="One line, centred, 48px vertical padding, optionally one button 16px below. No illustration, no heading, no second paragraph.">
          <div className="stack stack-4" style={{ maxWidth: 'var(--column-max)' }}>
            <State label="E2 — own lane has no notes yet" block>
              <div className="card"><Empty>Your notes appear here. Only you can see them.</Empty></div>
            </State>
            <State label="E5 — never synthesised, with an action" block>
              <div className="card">
                <Empty action={<button type="button" className="btn btn--secondary btn--sm">Back to your notes</button>}>
                  No findings yet. Synthesise when the session is done.
                </Empty>
              </div>
            </State>
          </div>
          <div style={{ marginTop: 'var(--space-6)' }}>
            <div className="t-label muted">The complete set, verbatim (E4 and E14 are button labels)</div>
            <div className="stack stack-2" style={{ marginTop: 'var(--space-2)' }}>
              {EMPTY_STRINGS.map((e) => (
                <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '40px 120px 1fr', gap: 'var(--space-3)', alignItems: 'baseline' }}>
                  <span className="t-micro tabular">{e.id}</span>
                  <span className="t-micro muted">{e.where}</span>
                  <span className="t-body">{e.copy}</span>
                </div>
              ))}
            </div>
          </div>
        </Spec>

        <Spec id="notice" label="Inline notice — §7 S4, S6" note="Errors are inline, adjacent to the thing that failed, and they persist. Never a toast, never a modal. 3px --danger left border.">
          <div className="stack stack-4" style={{ maxWidth: 'var(--column-max)' }}>
            <State label="E11 — a note failed to save" block>
              <Notice>That note didn’t save. It’s still in the box — try again.</Notice>
            </State>
            <State label="E7 — synthesis failed, with an action" block>
              <Notice action={<button type="button" className="btn btn--primary btn--sm">Try again</button>}>
                Synthesis didn’t complete. Your notes are saved. Try again.
              </Notice>
            </State>
          </div>
        </Spec>

        <Spec id="offline" label="Offline banner — E10" note="Hairline, full width, --sunken. Never a modal, never blocking; appears and disappears without animation. The live component renders only while navigator.onLine is false; the specimen below is its markup.">
          <OfflineBanner />
          <div className="banner">Not connected. Your draft is saved on this device.</div>
        </Spec>

        <Spec id="question" label="Research question band — §7 S4, S6" note="The identical component in Capture and Findings. Not truncated; no edit affordance. On first paint, a static --sunken block at the height the text will occupy.">
          <div className="stack stack-4">
            <State label="Loaded" block>
              <QuestionBand question={session.research_question} />
            </State>
            <State label="Loading — static placeholder, no animation, replaced without a fade" block>
              <QuestionBand loading />
            </State>
          </div>
        </Spec>

        <Spec id="s8-18" label="8.18 Loading placeholder" note="Grove does not use skeleton loaders. One static line of Body 15 --ink-muted in the position the content will occupy; the question band’s block is the single content-shaped exception.">
          <div style={row}>
            <State label="Static line — the rule">
              <div className="stack stack-2">
                <p className="t-body muted">Loading observers.</p>
                <p className="t-body muted">Loading the session.</p>
                <p className="t-body muted">Loading findings.</p>
              </div>
            </State>
            <State label="Block — the exception, default height">
              <div style={{ width: 240 }}><Placeholder /></div>
            </State>
            <State label="Block — at the height the text will occupy">
              <div style={{ width: 240 }}><Placeholder height={52} /></div>
            </State>
          </div>
        </Spec>

        <Spec id="s8-19" label="8.19 Theme toggle — S8 appearance popover" note="Press cycles System → Light → Dark → System with no colour transition. Enter, or a right-click, opens the appearance popover: 220px, non-blocking, no scrim.">
          <div style={row}>
            <State label="Default — the accessible name reflects state">
              <ThemeToggle />
            </State>
          </div>
        </Spec>

        <Spec id="chrome" label="Header — §7 S4" note="56px, sticky, --bg, 1px --border below. Wordmark left; the join-code chip and theme control right. In Capture the wordmark is a plain label — closing the tab is leaving.">
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', overflow: 'hidden' }}>
            <Header
              linkHome={false}
              left={<span className="wordmark">Grove</span>}
              right={(
                <span className="codechip">
                  <span className="t-tracked muted">Code</span>
                  <span className="codechip__value">{session.join_code}</span>
                  <button type="button" className="btn btn--ghost btn--icon" aria-label="Copy session code" onClick={() => toast.show('Code copied.')}>
                    <Icon name="copy" size={16} />
                  </button>
                </span>
              )}
            />
          </div>
        </Spec>

        <Spec
          id="s8-20"
          label="8.20 Dictate control — §8.20"
          note="A 36x36 ghost icon button in the composer's top row, hit area padded to 44x44. It renders in both states: the accessible name is the state. Active is a held --sunken fill — no colour change, no pulse, no ring, no red dot, because Capture Mode animates nothing. Where SpeechRecognition is absent the control does not render at all, silently."
        >
          <div style={row}>
            <State label='Rest — aria-pressed="false", "Dictate a note"'>
              <button type="button" className="btn btn--ghost btn--icon mic" aria-pressed="false" aria-label="Dictate a note">
                <Icon name="mic" />
              </button>
            </State>
            <State label='Active — aria-pressed="true", "Stop dictating"'>
              <button type="button" className="btn btn--ghost btn--icon mic" aria-pressed="true" aria-label="Stop dictating">
                <Icon name="mic" />
              </button>
            </State>
            <State label="Unsupported — nothing renders">
              <span className="t-label muted">(no control)</span>
            </State>
          </div>
        </Spec>

        <Spec
          id="s8-23"
          label="8.23 Mind map — §8.23 (stretch, not mounted in v1)"
          note="Hand-written inline SVG: no charting library, no force simulation, no animation, no tooltips. Node size is constant — scaling a node by count would be a heat scale. Top 8 findings; fewer than two renders nothing."
        >
          <div className="stack stack-6">
            <State label="Eight findings across three observers" block>
              <MindMap question={session.research_question} findings={findings} roster={roster} supporters={supporters} />
            </State>
            <State label="One finding — renders nothing, silently" block>
              <MindMap question={session.research_question} findings={findings.slice(0, 1)} roster={roster} supporters={supporters} />
            </State>
          </div>
        </Spec>

        <p className="t-label muted" style={{ marginTop: 'var(--space-12)' }}>
          8.22 Listen — v1.0 stretch, not built. Its CSS (.listen, .transport, .scrub) is present and unused.
        </p>

        <Spec id="icons" label="Icons — §6.6" note="One set, one weight, 16px and 20px, inline SVG. --ink-muted by default; an icon never carries a semantic colour. Chevron and check are fixed at 12px and 16px.">
          <div style={row}>
            {ICONS.map((name) => (
              <State key={name} label={name}>
                <div className="row muted" style={{ gap: 'var(--space-3)' }}>
                  <Icon name={name} size={20} />
                  <Icon name={name} size={16} />
                </div>
              </State>
            ))}
          </div>
        </Spec>

        <Spec
          id="studio"
          label="Studio shell — A13"
          note="The persistent surfaces added for Grove Studio: sidebar navigation, page head, note tiles, and the tab pair. Layout only — no new colour enters the system. Private and shared differ by a left border drawn from the corroboration ladder, the same device the finding cards use."
        >
          <State label="Navigation items">
            <div style={{ maxWidth: 260, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-card)', padding: 'var(--space-3)' }}>
              <span className="navitem" aria-current="page"><span className="navitem__text">Home</span></span>
              <span className="navitem"><span className="navitem__text">New session</span></span>
              <span className="navitem">
                <span className="navitem__dot" style={{ background: 'var(--observer-2)' }} />
                <span className="navitem__text">Clinic booking</span>
                <span className="navitem__count tabular">8</span>
              </span>
            </div>
          </State>

          <State label="Page head">
            <div className="pagehead" style={{ maxWidth: 620 }}>
              <div className="pagehead__title">
                <h1 className="t-h1">Clinic booking</h1>
                <p className="t-label muted" style={{ marginTop: 'var(--space-2)' }}>3 members</p>
              </div>
              <span className="codechip">
                <span className="t-tracked muted">Code</span>
                <span className="codechip__value">GRVDEM</span>
              </span>
            </div>
          </State>

          <State label="Tabs">
            <div className="tabs" role="tablist" aria-label="Notes">
              <button type="button" role="tab" aria-selected className="tabs__item">Shared · 8</button>
              <button type="button" role="tab" aria-selected={false} className="tabs__item">Private · 2</button>
            </div>
          </State>

          <State label="Note tiles — shared and private">
            <div className="grid-notes" style={{ maxWidth: 620 }}>
              <span className="tile tile--shared">
                <span className="tile__title">Insurance step</span>
                <span className="tile__body">She stopped at the insurance field and read it twice before backing out.</span>
                <span className="tile__foot">
                  <Chip name="Priya R." colourIndex={0} small />
                  <span className="t-micro muted">Priya R.</span>
                  <span className="spacer" />
                  <span className="t-micro muted tabular">2 min ago</span>
                </span>
              </span>
              <span className="tile tile--private">
                <span className="tile__title">Untitled note</span>
                <span className="tile__body">Empty</span>
                <span className="tile__foot">
                  <Chip name="You" colourIndex={1} small self />
                  <span className="t-micro muted">You</span>
                  <span className="spacer" />
                  <span className="t-micro muted tabular">just now</span>
                </span>
              </span>
            </div>
          </State>

          <State label="Space tile — home">
            <div className="grid-spaces" style={{ maxWidth: 620 }}>
              <span className="tile">
                <span className="tile__title">Clinic booking</span>
                <span className="tile__meta">8 shared notes · 3 members</span>
              </span>
            </div>
          </State>
        </Spec>

        <Spec
          id="wsp"
          label="Workspace — A16"
          note="Three panes: who wrote what, the note, and what can be made from the space. Below 1280px the Studio pane drops rather than shrinking, because a 180px reading column is worse than no column. Below 900px the rail stacks above the canvas."
        >
          <State label="Notes rail">
            <div className="pane pane--flush" style={{ maxWidth: 268 }}>
              <div className="tabs" role="tablist" aria-label="Notes" style={{ display: 'flex', width: '100%' }}>
                <button type="button" role="tab" aria-selected className="tabs__item" style={{ flex: 1 }}>Shared · 8</button>
                <button type="button" role="tab" aria-selected={false} className="tabs__item" style={{ flex: 1 }}>Private · 2</button>
              </div>
              <div style={{ marginTop: 'var(--space-3)' }}>
                <span className="noterow" aria-current="true">
                  <span className="noterow__title">Insurance step</span>
                  <span className="noterow__meta">
                    <span className="noterow__dot" style={{ background: 'var(--observer-1)' }} />
                    Priya R.<span className="spacer" /><span className="tabular">2 min ago</span>
                  </span>
                </span>
                <span className="noterow">
                  <span className="noterow__title">Wait times came up twice</span>
                  <span className="noterow__meta">
                    <span className="noterow__dot" style={{ background: 'var(--observer-3)' }} />
                    Nikhil S.<span className="spacer" /><span className="tabular">1h ago</span>
                  </span>
                </span>
              </div>
            </div>
          </State>

          <State label="Studio pane">
            <div style={{ maxWidth: 300 }}>
              <StudioPanel
                artefacts={[
                  { id: 'f', name: 'Findings', colour: 0, ready: true, note: 'Group 8 shared notes by what they agree on' },
                  { id: 'm', name: 'Mind map', colour: 1, ready: false, note: 'Not built yet' },
                  { id: 's', name: 'Slide deck', colour: 2, ready: false, note: 'Not built yet' },
                ]}
              />
            </div>
          </State>

          <State label="Task board — A15">
            <div style={{ maxWidth: 900 }}>
              <div className="board">
                {[['To do', 2], ['In progress', 1], ['Blocked', 0], ['Done', 3]].map(([label, n]) => (
                  <section key={label as string} className="board__col">
                    <div className="board__head">
                      <span className="board__label">{label}</span>
                      <span className="board__count tabular">{n}</span>
                    </div>
                    {n === 0
                      ? <p className="board__empty">Nothing here.</p>
                      : (
                        <article className="taskcard">
                          <div className="taskcard__title">Check the insurance copy with legal</div>
                          <div className="taskcard__meta">
                            <span className="taskcard__who">
                              <Chip name="Priya R." colourIndex={0} small /> Priya R.
                            </span>
                            <span className="taskcard__due" data-overdue={label === 'To do'}>
                              {label === 'To do' ? 'was due Tuesday' : 'due Friday'}
                            </span>
                          </div>
                        </article>
                      )}
                  </section>
                ))}
              </div>
            </div>
          </State>

          <State label="Assigned to you — the dashboard row">
            <div style={{ maxWidth: 640 }}>
              <div className="taskrow">
                <div className="taskrow__main">
                  <div className="taskrow__title">Check the insurance copy with legal</div>
                  <div className="taskrow__where">Insurance step · Clinic booking · assigned by Priya R.</div>
                </div>
                <span className="taskrow__due" data-overdue="true">was due Tuesday</span>
              </div>
              <div className="taskrow taskrow--done">
                <div className="taskrow__main">
                  <div className="taskrow__title">Write up the wait-time quotes</div>
                  <div className="taskrow__where">Wait times · Clinic booking · assigned by Arjun M.</div>
                </div>
              </div>
            </div>
          </State>
        </Spec>
      </main>
      {toast.node}
    </>
  );
}
