import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth, useData, useStudio, useToast } from '../state/Store';
import {
  studioHealth, genSummary, genAsk, genMindmap, genAudio, genVideo, genInfographic,
  wavUrl, artboardDoc, artboardFullPage, deckDownloadDoc, downloadHtml, downloadWav, safeName,
} from '../lib/studioApi';
import { listMembers, createTask, notify } from '../lib/api';
import { isoDateInDays, fmtDue } from '../lib/fmt';
import { Avatar, SparkIcon, Spinner } from './ui';
import { speechSupported, loadVoices, pickVoices, segmentsFromTurns, createSpeaker } from '../lib/speech';

// NotebookLM-style tool cards, Ask first.
const SUMMARY_TOOL = ['summary', 'Summary', (
  <svg width="16" height="16" viewBox="0 0 16 16" key="i">
    <rect x="2.5" y="2" width="11" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
    <path d="M5 5.5 h6 M5 8 h6 M5 10.5 h3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)];

const TOOLS = [
  ['ask', 'Ask', (
    <svg width="16" height="16" viewBox="0 0 16 16" key="i">
      <path d="M8 2 C4.7 2 2 4.2 2 7 c0 1.6 .9 3 2.2 3.9 L3.6 13.5 L6.4 11.8 C6.9 11.9 7.4 12 8 12 c3.3 0 6 -2.2 6 -5 s-2.7 -5 -6 -5 Z"
        fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )],
  ['audio', 'Audio', (
    <svg width="16" height="16" viewBox="0 0 16 16" key="i">
      <path d="M2 8 a6 6 0 0 1 12 0 v3 a1.5 1.5 0 0 1 -1.5 1.5 H11 V8.5 h3 M2 8 v3 a1.5 1.5 0 0 0 1.5 1.5 H5 V8.5 H2"
        fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )],
  ['video', 'Slide deck', (
    <svg width="16" height="16" viewBox="0 0 16 16" key="i">
      <rect x="2" y="2.5" width="12" height="8.5" rx="1.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 13.5 h5 M8 11 v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )],
  ['map', 'Mind map', (
    <svg width="16" height="16" viewBox="0 0 16 16" key="i">
      <circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="3" cy="3.5" r="1.5" fill="currentColor" />
      <circle cx="13" cy="3.5" r="1.5" fill="currentColor" />
      <circle cx="8" cy="13.5" r="1.5" fill="currentColor" />
      <path d="M4 4.5 L6.5 6.5 M12 4.5 L9.5 6.5 M8 10.2 V12" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )],
  ['infographic', 'Infographic', (
    <svg width="16" height="16" viewBox="0 0 16 16" key="i">
      <path d="M3 13.5 V9 M7 13.5 V5 M11 13.5 V7.5 M14.5 13.5 H1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )],
];

// ---------------------------------------------------------------- utilities

// One generation slot per tool view: idle -> busy -> ready | error, with the
// result remembered per scope in the studio cache.
function useGeneration(tool, generate) {
  const { scopeKey, cache } = useStudio();
  const key = `${tool}|${scopeKey}`;
  const [state, setState] = useState(() => cache.current.get(key)
    ? { status: 'ready', data: cache.current.get(key) } : { status: 'idle' });
  const alive = useRef(true);
  const keyRef = useRef(key);
  keyRef.current = key;
  // Body re-arms the flag on every (re)mount — StrictMode's simulated
  // unmount would otherwise leave it false forever and eat the result.
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  // Scope changed: show that scope's cached result, or reset to idle.
  useEffect(() => {
    setState(cache.current.get(key) ? { status: 'ready', data: cache.current.get(key) } : { status: 'idle' });
  }, [key, cache]);

  const run = useCallback(async () => {
    const startedKey = key;
    setState({ status: 'busy' });
    try {
      const data = await generate();
      cache.current.set(startedKey, data);
      // A scope change mid-flight must not paint the old scope's result.
      if (alive.current && startedKey === keyRef.current) setState({ status: 'ready', data });
    } catch (e) {
      if (alive.current && startedKey === keyRef.current) setState({ status: 'error', error: e.message });
    }
  }, [generate, key, cache]);

  return { ...state, run };
}

function BusyCard({ label }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 24, display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <Spinner />
        <span style={{ fontSize: 12.5, color: 'var(--muted)', animation: 'pulse 1.6s ease-in-out infinite', textAlign: 'center' }}>{label}</span>
      </div>
    </div>
  );
}

function ErrorCard({ error, onRetry }) {
  return (
    <div className="setup-callout" style={{ fontSize: 12.5 }}>
      {error}
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-xs" onClick={onRetry}>Try again</button>
      </div>
    </div>
  );
}

function GroundingNote({ data }) {
  if (!data?.grounding) return null;
  return (
    <div className="studio-note">
      Generated from {data.grounding.noteCount} note{data.grounding.noteCount === 1 ? '' : 's'} · {data.grounding.label} · visible only to you.
    </div>
  );
}

// ------------------------------------------------------------------ summary

function SummaryTool() {
  const { scope, scopeLabel, context } = useStudio();
  const { user, displayName } = useAuth();
  const { refreshTasks } = useData();
  const { toast } = useToast();
  const gen = useGeneration('summary', () => genSummary(scope));
  const [assigning, setAssigning] = useState(null); // step index being assigned
  const [members, setMembers] = useState([]);
  const [assigned, setAssigned] = useState(new Set());

  // A new summary (regenerate, scope swap, space change) clears assign state.
  useEffect(() => { setAssigned(new Set()); setAssigning(null); }, [gen.data]);

  const canAssign = context?.spaceId && context.kind === 'shared' && !context.demo;

  const openAssign = async (i) => {
    setAssigning(assigning === i ? null : i);
    if (!members.length && canAssign) {
      try { setMembers(await listMembers(context.spaceId)); } catch { /* leave empty */ }
    }
  };

  const assignTo = async (step, i, m) => {
    try {
      const task = await createTask(context.spaceId, {
        title: step.text,
        label: step.label,
        assigneeUser: m.userId,
        assignedByUser: user.id,
        dueDate: isoDateInDays(step.dueInDays ?? 7),
      });
      setAssigning(null);
      setAssigned((s) => new Set([...s, i]));
      refreshTasks();
      toast(`Assigned to ${m.name}`, `Notified with the action item and deadline (${fmtDue(task.due_date) ?? 'none'})`, 'assign');
      if (m.userId !== user.id) {
        notify([m.userId], {
          kind: 'assign',
          text: `${displayName} assigned you “${step.text}”`,
          sub: `${context.spaceName} · from the studio summary · due ${fmtDue(task.due_date) ?? 'soon'}`,
          projectId: context.spaceId, taskId: task.id,
        });
      }
    } catch (e) {
      toast('Could not assign', e.message, 'error');
    }
  };

  if (gen.status === 'idle') {
    return (
      <>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          A tight summary of {scopeLabel} — what happened, what was decided, what's next.
        </p>
        <button className="btn btn-vio" style={{ height: 34, fontSize: 13 }} onClick={gen.run}>Generate summary</button>
      </>
    );
  }
  if (gen.status === 'busy') return <BusyCard label={`Reading ${scopeLabel}…`} />;
  if (gen.status === 'error') return <ErrorCard error={gen.error} onRetry={gen.run} />;
  const d = gen.data;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="studio-label">Summary</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6 }}>{d.summary}</p>
      </div>
      {d.decisions?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="studio-label">Decisions</div>
          {d.decisions.map((x, i) => (
            <div key={i} style={{ fontSize: 13, display: 'flex', gap: 7 }}>
              <span style={{ color: 'var(--acc-deep)', flex: 'none' }}>✓</span>{x}
            </div>
          ))}
        </div>
      )}
      {d.nextSteps?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="studio-label">Key next steps{canAssign ? ' → assign' : ''}</div>
          {d.nextSteps.map((st, i) => (
            <div className="step-card" key={i}>
              <p>{st.text}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span className="label-chip" style={{ background: 'var(--acc-soft)', color: 'var(--acc-deep)' }}>{st.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--amber)' }}>
                  {fmtDue(isoDateInDays(st.dueInDays ?? 7))}
                </span>
              </div>
              {canAssign && !assigned.has(i) && (
                <button className="btn btn-primary" style={{ height: 28, fontSize: 12 }} onClick={() => openAssign(i)}>
                  Assign &amp; notify
                </button>
              )}
              {assigning === i && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {members.map((m) => (
                    <button key={m.memberId} className="assign-row" style={{ padding: '6px 8px' }} onClick={() => assignTo(st, i, m)}>
                      <Avatar name={m.name} colourIndex={m.colourIndex} size={22} />
                      <div className="who"><b style={{ fontSize: 12.5 }}>{m.name}</b></div>
                    </button>
                  ))}
                  {!members.length && <span style={{ fontSize: 12, color: 'var(--faint)' }}>Loading members…</span>}
                </div>
              )}
              {assigned.has(i) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--acc-deep)' }}>
                  <svg width="11" height="11" viewBox="0 0 10 10"><path d="M1.5 5.5 L4 8 L8.5 2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  Assigned — owner notified with the deadline
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {d.openQuestions?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="studio-label">Still open</div>
          {d.openQuestions.map((x, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 7 }}>
              <span style={{ color: 'var(--amber)', flex: 'none' }}>?</span>{x}
            </div>
          ))}
        </div>
      )}
      <button className="btn btn-xs" style={{ alignSelf: 'flex-start' }} onClick={gen.run}>Regenerate</button>
      <GroundingNote data={d} />
    </>
  );
}

// ---------------------------------------------------------------------- ask

function AskTool() {
  const { scope, scopeLabel } = useStudio();
  const [chat, setChat] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [chat, busy]);

  const send = async () => {
    const q = draft.trim();
    if (!q || busy) return;
    setDraft('');
    setChat((c) => [...c, { who: 'you', text: q }]);
    setBusy(true);
    try {
      const r = await genAsk(scope, q, chat);
      setChat((c) => [...c, { who: 'ai', text: r.answer, sources: r.sources }]);
    } catch (e) {
      setChat((c) => [...c, { who: 'ai', text: `That didn't work: ${e.message}`, sources: [] }]);
    }
    setBusy(false);
  };

  return (
    <>
      <div className="studio-chat" ref={scrollRef} style={{ overflowY: 'auto', minHeight: 0 }}>
        {chat.length === 0 && (
          <div className="chat-msg" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
            Ask anything about {scopeLabel} — I answer only from what's written there, with the source attached.
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: m.who === 'you' ? 'flex-end' : 'flex-start' }}>
            <div className="chat-msg" style={m.who === 'you'
              ? { background: 'var(--acc)', color: 'var(--acc-ink)', borderColor: 'var(--acc)' }
              : { background: 'var(--bg)', color: 'var(--ink)' }}>
              {m.text}
            </div>
            {m.sources?.length > 0 && <span className="chat-cite">{m.sources.join(' · ')}</span>}
          </div>
        ))}
        {busy && <div className="chat-msg" style={{ background: 'var(--bg)', color: 'var(--faint)', animation: 'pulse 1.4s ease-in-out infinite' }}>reading the notes…</div>}
      </div>
      <div className="chat-input-row">
        <input className="chat-input" placeholder="Ask your notes anything…" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') send(); }} />
        <button className="chat-send" onClick={send} aria-label="Send" disabled={busy}>
          <svg width="13" height="13" viewBox="0 0 14 14"><path d="M2 7 H11 M8 3.5 L11.5 7 L8 10.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </>
  );
}

// ----------------------------------------------------------------- mind map

function MindmapSvg({ data }) {
  const W = 340; const H = 320; const cx = W / 2; const cy = H / 2;
  const n = data.branches.length || 1;
  const boxW = (label) => Math.min(118, 20 + label.length * 5.6);
  const pos = (angle, r) => [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.82];
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg)', padding: 8 }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        {data.branches.map((b, i) => {
          const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
          const [bx, by] = pos(angle, 108);
          return (
            <g key={i}>
              <line x1={cx} y1={cy} x2={bx} y2={by} stroke="var(--border-strong)" strokeWidth="1.5" />
              {b.children.map((c, j) => {
                const ca = angle + (j - (b.children.length - 1) / 2) * 0.42;
                const [ex, ey] = pos(ca, 158);
                return (
                  <g key={j}>
                    <line x1={bx} y1={by} x2={ex} y2={ey} stroke="var(--border)" strokeWidth="1.2" />
                    <text x={Math.max(34, Math.min(W - 34, ex))} y={Math.max(10, Math.min(H - 6, ey + 3))}
                      textAnchor="middle" fontSize="8.5" fill="var(--muted)" fontFamily="Inter">
                      {c.label}
                    </text>
                  </g>
                );
              })}
              <rect x={bx - boxW(b.label) / 2} y={by - 12} width={boxW(b.label)} height={24} rx={12}
                fill="var(--surface)" stroke="var(--border-strong)" />
              <text x={bx} y={by + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--ink)" fontFamily="Inter">{b.label}</text>
            </g>
          );
        })}
        <rect x={cx - (boxW(data.center) + 16) / 2} y={cy - 16} width={boxW(data.center) + 16} height={32} rx={16} fill="var(--acc)" />
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="var(--acc-ink)" fontFamily="Inter">{data.center}</text>
      </svg>
    </div>
  );
}

// A reusable full-screen overlay (fixed, requests OS fullscreen, Esc to close).
function FullscreenOverlay({ onClose, title, children }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.requestFullscreen?.().catch(() => {});
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [onClose]);
  return (
    <div ref={ref} className="art-fs">
      <div className="art-fs-head">
        <span>{title}</span>
        <button className="art-fs-close" onClick={onClose}>✕ Close</button>
      </div>
      <div className="art-fs-body">{children}</div>
    </div>
  );
}

// Serialize a rendered <svg> (inside `host`) to a standalone .svg download,
// resolving CSS custom properties to concrete colours so it stands alone.
function downloadSvg(host, filename) {
  const svg = host?.querySelector('svg');
  if (!svg) return;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const cs = getComputedStyle(document.documentElement);
  let out = new XMLSerializer().serializeToString(clone);
  out = out.replace(/var\((--[\w-]+)\)/g, (m, name) => (cs.getPropertyValue(name).trim() || m));
  out = `<?xml version="1.0" encoding="UTF-8"?>\n<style>text{font-family:Inter,system-ui,sans-serif}</style>\n${out}`;
  downloadHtml(filename, out); // Blob download (mime is text/html but browsers save by extension)
}

function MindmapTool() {
  const { scope, scopeLabel } = useStudio();
  const gen = useGeneration('map', () => genMindmap(scope));
  const [fs, setFs] = useState(false);
  const boxRef = useRef(null);
  const fsRef = useRef(null);
  if (gen.status === 'idle') {
    return (
      <>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>The themes across {scopeLabel}, drawn as a map.</p>
        <button className="btn btn-vio" style={{ height: 34, fontSize: 13 }} onClick={gen.run}>Generate mind map</button>
      </>
    );
  }
  if (gen.status === 'busy') return <BusyCard label={`Mapping ${scopeLabel}…`} />;
  if (gen.status === 'error') return <ErrorCard error={gen.error} onRetry={gen.run} />;
  return (
    <>
      <div ref={boxRef}><MindmapSvg data={gen.data} /></div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-xs" onClick={() => setFs(true)}>⤢ Full screen</button>
        <button className="btn btn-xs" onClick={() => downloadSvg(boxRef.current, `${safeName(gen.data.center)}-mindmap.svg`)}>↓ Download</button>
        <button className="btn btn-xs" onClick={gen.run}>Regenerate</button>
      </div>
      <GroundingNote data={gen.data} />
      {fs && (
        <FullscreenOverlay title={gen.data.center} onClose={() => setFs(false)}>
          <div ref={fsRef} style={{ width: 'min(92vw, 1100px)' }}><MindmapSvg data={gen.data} /></div>
        </FullscreenOverlay>
      )}
    </>
  );
}

// -------------------------------------------------------------------- audio

function AudioPlayer({ data }) {
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(data.durationSec || 0);
  const audioRef = useRef(null);
  const urlRef = useRef(null);

  useEffect(() => {
    // A baked static file (audioUrl) plays directly; base64 becomes a blob URL.
    const isBlob = !data.audioUrl;
    urlRef.current = data.audioUrl ?? wavUrl(data.wavBase64);
    const a = new Audio(urlRef.current);
    audioRef.current = a;
    a.addEventListener('timeupdate', () => setT(a.currentTime));
    a.addEventListener('loadedmetadata', () => { if (Number.isFinite(a.duration)) setDur(a.duration); });
    a.addEventListener('ended', () => setPlaying(false));
    return () => { a.pause(); if (isBlob) URL.revokeObjectURL(urlRef.current); };
  }, [data]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  // Draggable scrubber: click or drag anywhere on the bar to seek.
  const barRef = useRef(null);
  const draggingRef = useRef(false);
  const seekToClientX = (clientX) => {
    const el = barRef.current; const a = audioRef.current;
    if (!el || !a || !dur) return;
    const r = el.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    a.currentTime = frac * dur;
    setT(a.currentTime);
  };
  const onBarDown = (e) => {
    draggingRef.current = true;
    el_capture(e);
    seekToClientX(e.clientX);
  };
  const el_capture = (e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* noop */ } };
  const onBarMove = (e) => { if (draggingRef.current) seekToClientX(e.clientX); };
  const onBarUp = () => { draggingRef.current = false; };

  const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div className="audio-card">
      <div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{data.title}</div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Two hosts · grounded in {data.grounding.noteCount} notes</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}
          style={{ width: 44, height: 44, borderRadius: 99, border: 'none', background: 'var(--vio)', color: 'var(--acc-ink)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}>
          {playing
            ? <svg width="13" height="13" viewBox="0 0 12 12"><rect x="2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /><rect x="7.2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /></svg>
            : <svg width="15" height="15" viewBox="0 0 14 14"><path d="M4 2.5 L11.5 7 L4 11.5 Z" fill="currentColor" /></svg>}
        </button>
        <div className="eq-bars">
          {Array.from({ length: 14 }, (_, i) => (
            <span key={i} style={{
              height: 8 + ((i * 7) % 20),
              opacity: playing ? 1 : 0.4,
              animation: playing ? `eq ${(0.7 + (i % 5) * 0.14).toFixed(2)}s ease-in-out ${-(i * 0.09).toFixed(2)}s infinite` : 'none',
            }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          ref={barRef}
          onPointerDown={onBarDown} onPointerMove={onBarMove} onPointerUp={onBarUp}
          style={{ flex: 1, height: 14, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}
          role="slider" aria-label="Seek" aria-valuenow={Math.round(t)} aria-valuemax={Math.round(dur)}>
          <div style={{ position: 'relative', width: '100%', height: 4, borderRadius: 99, background: 'var(--border)' }}>
            <div style={{ height: '100%', background: 'var(--vio)', borderRadius: 99, width: `${Math.min(100, (t / Math.max(1, dur)) * 100)}%` }} />
            <div style={{ position: 'absolute', top: '50%', left: `${Math.min(100, (t / Math.max(1, dur)) * 100)}%`, transform: 'translate(-50%,-50%)', width: 11, height: 11, borderRadius: 99, background: 'var(--vio)', boxShadow: '0 0 0 2px var(--surface)' }} />
          </div>
        </div>
        <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{mmss(t)} / {mmss(dur)}</span>
      </div>
    </div>
  );
}

// Free browser-voiced two-host player over the transcript — used when Gemini
// TTS is unavailable. Two distinct system voices, active turn highlighted.
function SpeechAudioPlayer({ data }) {
  const [playing, setPlaying] = useState(false);
  const [turn, setTurn] = useState(-1);
  const [ready, setReady] = useState(false);
  const speakerRef = useRef(null);
  const segsRef = useRef([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const voices = pickVoices(await loadVoices(), 2);
      if (!alive) return;
      const turns = data.transcript.map((t) => ({ text: t.text, voiceSlot: t.role === 'B' ? 1 : 0 }));
      segsRef.current = segmentsFromTurns(turns, voices);
      speakerRef.current = createSpeaker();
      setReady(true);
    })();
    return () => { alive = false; speakerRef.current?.stop(); };
  }, [data]);

  const start = () => {
    const sp = speakerRef.current;
    if (!sp) return;
    sp.play(segsRef.current, {
      onSegment: (i) => setTurn(sp.turnOf(i)),
      onEnd: () => { setPlaying(false); setTurn(-1); },
    });
    setPlaying(true);
  };
  const toggle = () => {
    const sp = speakerRef.current;
    if (!sp) return;
    if (playing) { sp.pause(); setPlaying(false); }
    else if (turn >= 0) { sp.resume(); setPlaying(true); }
    else start();
  };

  return (
    <>
      <div className="audio-card">
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{data.title}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>Two hosts · voiced by your browser · grounded in {data.grounding.noteCount} notes</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={toggle} disabled={!ready} aria-label={playing ? 'Pause' : 'Play'}
            style={{ width: 44, height: 44, borderRadius: 99, border: 'none', background: 'var(--vio)', color: 'var(--acc-ink)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}>
            {playing
              ? <svg width="13" height="13" viewBox="0 0 12 12"><rect x="2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /><rect x="7.2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /></svg>
              : <svg width="15" height="15" viewBox="0 0 14 14"><path d="M4 2.5 L11.5 7 L4 11.5 Z" fill="currentColor" /></svg>}
          </button>
          <div className="eq-bars">
            {Array.from({ length: 14 }, (_, i) => (
              <span key={i} style={{
                height: 8 + ((i * 7) % 20),
                opacity: playing ? 1 : 0.4,
                animation: playing ? `eq ${(0.7 + (i % 5) * 0.14).toFixed(2)}s ease-in-out ${-(i * 0.09).toFixed(2)}s infinite` : 'none',
              }} />
            ))}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto', fontSize: 12.5, lineHeight: 1.5 }}>
        {data.transcript.map((tr, i) => (
          <div key={i} style={{
            padding: '6px 9px', borderRadius: 8,
            background: turn === i ? 'var(--acc-soft)' : 'transparent',
            transition: 'background .15s ease-out',
          }}>
            <b style={{ color: 'var(--acc-deep)' }}>{tr.speaker}:</b> {tr.text}
          </div>
        ))}
      </div>
    </>
  );
}

function AudioTool() {
  const { scope, scopeLabel } = useStudio();
  const gen = useGeneration('audio', () => genAudio(scope));
  const [showScript, setShowScript] = useState(false);
  if (gen.status === 'idle') {
    return (
      <>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          A two-host audio deep-dive over {scopeLabel}.
        </p>
        <button className="btn btn-vio" style={{ height: 34, fontSize: 13 }} onClick={gen.run}>Generate episode</button>
      </>
    );
  }
  if (gen.status === 'busy') return <BusyCard label={`Writing the episode from ${scopeLabel}…`} />;
  if (gen.status === 'error') return <ErrorCard error={gen.error} onRetry={gen.run} />;
  const d = gen.data;
  // A real audio file (baked static, or Gemini WAV) → the file player.
  // Otherwise the browser voices the transcript for free.
  const hasFile = !!d.audioUrl || !!d.wavBase64;
  const useSpeech = !hasFile;
  const downloadAudio = () => {
    if (d.audioUrl) {
      const a = document.createElement('a');
      a.href = d.audioUrl; a.download = `${safeName(d.title)}${d.audioUrl.endsWith('.mp3') ? '.mp3' : '.wav'}`;
      document.body.appendChild(a); a.click(); a.remove();
    } else if (d.wavBase64) {
      downloadWav(d.wavBase64, `${safeName(d.title)}.wav`);
    }
  };
  return (
    <>
      {useSpeech
        ? (speechSupported()
          ? <SpeechAudioPlayer key={d.title} data={d} />
          : <div className="setup-callout" style={{ fontSize: 12 }}>Gemini TTS quota is used up and this browser can't voice text — the transcript is below.</div>)
        : <AudioPlayer key={d.audioUrl ?? d.wavBase64.slice(0, 32)} data={d} />}
      {useSpeech && d.ttsFailed && (
        <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>
          Voiced free by your browser (Gemini's TTS quota is used up). It'll use the higher-quality Gemini voice again once quota resets.
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {hasFile && <button className="btn btn-xs" onClick={downloadAudio}>↓ Download</button>}
        {hasFile && <button className="btn btn-xs" onClick={() => setShowScript((v) => !v)}>{showScript ? 'Hide transcript' : 'Transcript'}</button>}
        <button className="btn btn-xs" onClick={gen.run}>New episode</button>
      </div>
      {useSpeech && (
        <div style={{ fontSize: 11, color: 'var(--faint)' }}>
          Browser-voiced audio plays live and can't be saved as a file — it downloads as a file once Gemini voices it (quota permitting).
        </div>
      )}
      {!useSpeech && showScript && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', fontSize: 12.5, lineHeight: 1.5 }}>
          {d.transcript.map((tr, i) => (
            <div key={i}><b style={{ color: 'var(--acc-deep)' }}>{tr.speaker}:</b> {tr.text}</div>
          ))}
        </div>
      )}
      <GroundingNote data={d} />
    </>
  );
}

// ---------------------------------------------------------------- slide deck

// Narrated playback shared by the compact deck player and the full-screen view.
function useDeckPlayback(data) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const urlsRef = useRef([]);
  const timerRef = useRef(null);
  const speakerRef = useRef(null);
  const voiceRef = useRef(null);

  useEffect(() => {
    // Baked static files (audioUrl) play directly; base64 becomes a blob URL.
    urlsRef.current = data.slides.map((s) => (s.audioUrl ? s.audioUrl : (s.wavBase64 ? wavUrl(s.wavBase64) : null)));
    if (speechSupported()) {
      speakerRef.current = createSpeaker();
      loadVoices().then((vs) => { voiceRef.current = pickVoices(vs, 1)[0] ?? null; });
    }
    return () => {
      audioRef.current?.pause();
      clearTimeout(timerRef.current);
      speakerRef.current?.stop();
      data.slides.forEach((s, i) => { if (!s.audioUrl && urlsRef.current[i]) URL.revokeObjectURL(urlsRef.current[i]); });
    };
  }, [data]);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    speakerRef.current?.stop();
    clearTimeout(timerRef.current);
    setPlaying(false);
  }, []);

  const playFrom = useCallback((i) => {
    audioRef.current?.pause();
    speakerRef.current?.stop();
    clearTimeout(timerRef.current);
    if (i >= data.slides.length) { setPlaying(false); setIdx(0); return; }
    setIdx(i);
    setPlaying(true);
    const url = urlsRef.current[i];
    const narration = data.slides[i].narration ?? '';
    if (url) {
      const a = new Audio(url);
      audioRef.current = a;
      a.onended = () => playFrom(i + 1);
      a.play().catch(() => { timerRef.current = setTimeout(() => playFrom(i + 1), 4000); });
    } else if (speechSupported() && speakerRef.current && narration) {
      const segs = segmentsFromTurns([{ text: narration, voiceSlot: 0 }], [voiceRef.current]);
      speakerRef.current.play(segs, { onEnd: () => playFrom(i + 1) });
    } else {
      const secs = Math.max(4, Math.min(10, narration.length / 18));
      timerRef.current = setTimeout(() => playFrom(i + 1), secs * 1000);
    }
  }, [data.slides]);

  const goTo = useCallback((i) => { stop(); setIdx(Math.max(0, Math.min(i, data.slides.length - 1))); }, [stop, data.slides.length]);

  return { idx, playing, playFrom, stop, goTo };
}

function SlideFrame({ data, idx, width }) {
  const scale = width / data.width;
  return (
    <div style={{ width, aspectRatio: `${data.width}/${data.height}`, position: 'relative', overflow: 'hidden', background: '#F7F6F2' }}>
      <iframe
        title={`slide ${idx + 1}`}
        sandbox=""
        srcDoc={artboardDoc({ css: data.css, html: data.slides[idx].html, width: data.width, height: data.height, rootClass: 'slide' })}
        style={{ width: data.width, height: data.height, border: 'none', transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />
    </div>
  );
}

// Full-screen deck view: a fixed overlay (also requests OS fullscreen), the
// slide sandboxed, arrow-key nav, and narrated play.
function FullscreenDeck({ data, onClose }) {
  const p = useDeckPlayback(data);
  const wrapRef = useRef(null);
  const [w, setW] = useState(Math.min(window.innerWidth - 80, (window.innerHeight - 140) * (data.width / data.height)));

  useEffect(() => {
    wrapRef.current?.requestFullscreen?.().catch(() => {});
    const onResize = () => setW(Math.min(window.innerWidth - 80, (window.innerHeight - 140) * (data.width / data.height)));
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') p.goTo(p.idx + 1);
      if (e.key === 'ArrowLeft') p.goTo(p.idx - 1);
      if (e.key === ' ') { e.preventDefault(); p.playing ? p.stop() : p.playFrom(p.idx); }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('keydown', onKey);
      p.stop();
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.idx, p.playing]);

  return (
    <div ref={wrapRef} className="deck-fs">
      <button className="deck-fs-close" onClick={onClose} aria-label="Close">✕ Close</button>
      <button className="deck-fs-nav left" onClick={() => p.goTo(p.idx - 1)} disabled={p.idx === 0} aria-label="Previous">‹</button>
      <SlideFrame data={data} idx={p.idx} width={w} />
      <button className="deck-fs-nav right" onClick={() => p.goTo(p.idx + 1)} disabled={p.idx === data.slides.length - 1} aria-label="Next">›</button>
      <div className="deck-fs-bar">
        <button onClick={() => (p.playing ? p.stop() : p.playFrom(p.idx))} className="deck-fs-play" aria-label={p.playing ? 'Pause' : 'Play'}>
          {p.playing
            ? <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /><rect x="7.2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /></svg>
            : <svg width="13" height="13" viewBox="0 0 14 14" style={{ marginLeft: 2 }}><path d="M4 2.5 L11.5 7 L4 11.5 Z" fill="currentColor" /></svg>}
        </button>
        <span className="mono" style={{ fontSize: 12, color: '#fff' }}>{p.idx + 1} / {data.slides.length}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.6)', marginLeft: 12 }}>← → to move · Space to play · Esc to exit</span>
      </div>
    </div>
  );
}

function DeckPlayer({ data }) {
  const p = useDeckPlayback(data);
  return (
    <>
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', background: '#F7F6F2' }}>
        <div style={{ width: '100%' }}><SlideFrame data={data} idx={p.idx} width={320} /></div>
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => (p.playing ? p.stop() : p.playFrom(p.idx))}
            aria-label={p.playing ? 'Pause' : 'Play'}
            style={{ width: 34, height: 34, borderRadius: 99, border: 'none', background: 'var(--vio)', color: 'var(--acc-ink)', cursor: 'pointer', display: 'grid', placeItems: 'center', flex: 'none' }}>
            {p.playing
              ? <svg width="11" height="11" viewBox="0 0 12 12"><rect x="2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /><rect x="7.2" y="1.5" width="2.8" height="9" rx="1" fill="currentColor" /></svg>
              : <svg width="13" height="13" viewBox="0 0 14 14" style={{ marginLeft: 2 }}><path d="M4 2.5 L11.5 7 L4 11.5 Z" fill="currentColor" /></svg>}
          </button>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
            {data.slides.map((_, i) => (
              <button key={i} onClick={() => p.goTo(i)} aria-label={`Slide ${i + 1}`}
                style={{ width: i === p.idx ? 18 : 7, height: 7, borderRadius: 99, border: 'none', cursor: 'pointer', background: i === p.idx ? 'var(--vio)' : 'var(--border-strong)', transition: 'width .15s ease-out' }} />
            ))}
          </div>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--muted)' }}>
            {p.idx + 1} / {data.slides.length}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{data.slides[p.idx].narration}</div>
    </>
  );
}

function VideoTool() {
  const { scope, scopeLabel } = useStudio();
  const gen = useGeneration('video', () => genVideo(scope));
  const [fs, setFs] = useState(false);
  if (gen.status === 'idle') {
    return (
      <>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          A designed slide deck over {scopeLabel} — laid out by Claude, narrated for playback. View full screen or download it.
        </p>
        <button className="btn btn-vio" style={{ height: 34, fontSize: 13 }} onClick={gen.run}>Generate slide deck</button>
      </>
    );
  }
  if (gen.status === 'busy') return <BusyCard label={`Designing the slide deck over ${scopeLabel}… (a minute or two)`} />;
  if (gen.status === 'error') return <ErrorCard error={gen.error} onRetry={gen.run} />;
  const d = gen.data;
  return (
    <>
      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{d.title}</div>
      <DeckPlayer key={d.title + d.slides.length} data={d} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-xs" onClick={() => setFs(true)}>⤢ Full screen</button>
        <button className="btn btn-xs" onClick={() => downloadHtml(`${safeName(d.title)}.html`, deckDownloadDoc(d))}>↓ Download</button>
        <button className="btn btn-xs" onClick={gen.run}>Regenerate</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--faint)' }}>
        Download opens as a full slideshow — File → Print → Save as PDF for a PDF.
      </div>
      {d.quotaHit && (
        <div style={{ fontSize: 11.5, color: 'var(--faint)' }}>
          {d.voiced === 0
            ? 'Narrated free by your browser (Gemini TTS quota is used up).'
            : `Gemini voiced ${d.voiced} of ${d.slides.length} slides; your browser narrates the rest for free.`}
        </div>
      )}
      {fs && <FullscreenDeck data={d} onClose={() => setFs(false)} />}
      <GroundingNote data={d} />
    </>
  );
}

// -------------------------------------------------------------- infographic

function InfographicFullscreen({ data, onClose }) {
  const [w, setW] = useState(Math.min(window.innerWidth - 40, (window.innerHeight - 120) * (data.width / data.height)));
  useEffect(() => {
    const onResize = () => setW(Math.min(window.innerWidth - 40, (window.innerHeight - 120) * (data.width / data.height)));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data]);
  const scale = w / data.width;
  return (
    <FullscreenOverlay title={data.title} onClose={onClose}>
      <div style={{ width: w, aspectRatio: `${data.width}/${data.height}`, position: 'relative', overflow: 'hidden', background: '#F7F6F2', boxShadow: '0 8px 40px rgba(0,0,0,.5)' }}>
        <iframe title="infographic full" sandbox=""
          srcDoc={artboardDoc({ ...data, rootClass: 'board' })}
          style={{ width: data.width, height: data.height, border: 'none', transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }} />
      </div>
    </FullscreenOverlay>
  );
}

function InfographicTool() {
  const { scope, scopeLabel } = useStudio();
  const gen = useGeneration('infographic', () => genInfographic(scope));
  const [fs, setFs] = useState(false);

  const download = () => {
    // Self-contained, printable HTML (script-none CSP) — open + Print to PDF.
    downloadHtml(`${safeName(gen.data.title)}.html`, artboardFullPage({ ...gen.data, rootClass: 'board' }));
  };

  if (gen.status === 'idle') {
    return (
      <>
        <div style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 14, aspectRatio: '4/5', background: 'repeating-linear-gradient(45deg, var(--sunken) 0 10px, transparent 10px 20px)', display: 'grid', placeItems: 'center' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--faint)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 9px' }}>infographic preview</span>
        </div>
        <button className="btn btn-vio" style={{ height: 34, fontSize: 13 }} onClick={gen.run}>Generate infographic</button>
      </>
    );
  }
  if (gen.status === 'busy') return <BusyCard label={`Designing from ${scopeLabel}… (about a minute)`} />;
  if (gen.status === 'error') return <ErrorCard error={gen.error} onRetry={gen.run} />;
  const scale = 320 / gen.data.width;
  return (
    <>
      <div style={{ border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ width: '100%', aspectRatio: `${gen.data.width}/${gen.data.height}`, position: 'relative', overflow: 'hidden' }}>
          <iframe
            title="infographic"
            sandbox=""
            srcDoc={artboardDoc({ ...gen.data, rootClass: 'board' })}
            style={{ width: gen.data.width, height: gen.data.height, border: 'none', transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
          />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button className="btn btn-xs" onClick={() => setFs(true)}>⤢ Full screen</button>
        <button className="btn btn-xs" onClick={download}>↓ Download</button>
        <button className="btn btn-xs" onClick={gen.run}>Regenerate</button>
      </div>
      <div style={{ fontSize: 11, color: 'var(--faint)' }}>Download opens as a page — File → Print → Save as PDF for a PDF or image.</div>
      <GroundingNote data={gen.data} />
      {fs && <InfographicFullscreen data={gen.data} onClose={() => setFs(false)} />}
    </>
  );
}

// --------------------------------------------------------------------- rail

export default function StudioRail() {
  const studio = useStudio();
  const { expanded, setExpanded, tool, setTool, scopeLabel, hasSelection, clearSelection, context } = studio;
  const [health, setHealth] = useState(undefined); // undefined=checking, null=down

  useEffect(() => {
    let alive = true;
    studioHealth().then((h) => { if (alive) setHealth(h); });
    return () => { alive = false; };
  }, [expanded]);

  // Summary belongs to a space (per-note summaries live inline in the note).
  // On the dashboard Ask leads and Summary is hidden; fall off it if we leave.
  const inSpace = !!context?.spaceId;
  const tools = inSpace ? [TOOLS[0], SUMMARY_TOOL, ...TOOLS.slice(1)] : TOOLS;
  useEffect(() => {
    if (!inSpace && tool === 'summary') setTool('ask');
  }, [inSpace, tool, setTool]);

  if (!expanded) {
    return (
      <aside className="studio-min">
        <button className="studio-min-btn" aria-label="Open the studio" title="Open the studio" onClick={() => setExpanded(true)}>
          <SparkIcon size={14} />
        </button>
        <span className="studio-min-label">Studio</span>
      </aside>
    );
  }

  const scopeHint = context?.spaceId
    ? 'Click the circles on note cards to narrow the scope.'
    : 'Click the circles on space cards to narrow the scope.';

  return (
    <aside className="studio">
      <div className="studio-head">
        <span className="spark"><SparkIcon size={13} /></span>
        <div style={{ minWidth: 0 }}>
          <b>Studio</b>
          <span className="scope">Scope: {scopeLabel}</span>
        </div>
        <button className="close" aria-label="Minimize studio" title="Minimize" onClick={() => setExpanded(false)}>—</button>
      </div>

      <div className="studio-scopebar">
        {hasSelection
          ? <button className="btn-ghost" style={{ height: 24, fontSize: 12 }} onClick={clearSelection}>✕ Clear selection</button>
          : <span style={{ fontSize: 11.5, color: 'var(--faint)' }}>{scopeHint}</span>}
      </div>

      <div className="studio-tools">
        {tools.map(([k, label, icon]) => (
          <button key={k} className={'studio-tool' + (tool === k ? ' on' : '')} onClick={() => setTool(k)}>
            <span className="tool-icon">{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="studio-body">
        {health === null && (
          <div className="setup-callout" style={{ fontSize: 12.5 }}>
            The studio server isn't reachable. Run <code>npm run dev</code> (it starts the app AND the studio sidecar) and reload.
          </div>
        )}
        {health && tool === 'ask' && <AskTool />}
        {health && tool === 'summary' && <SummaryTool />}
        {health && tool === 'map' && <MindmapTool />}
        {health && tool === 'audio' && <AudioTool />}
        {health && tool === 'video' && <VideoTool />}
        {health && tool === 'infographic' && <InfographicTool />}
      </div>
    </aside>
  );
}
