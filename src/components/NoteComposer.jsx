import { useEffect, useRef, useState } from 'react';
import { loadDraft, saveDraft, clearDraft } from '../lib/local';

const KINDS = [
  { value: 'observation', label: 'Observation' },
  { value: 'quote',       label: 'Quote' },
  { value: 'question',    label: 'Question' },
];

// Nothing animates in capture mode. The composer stays out of the way.
export default function NoteComposer({ sessionId, onAdd, busy }) {
  const [text, setText] = useState(() => loadDraft(sessionId));
  const [kind, setKind] = useState('observation');
  const ref = useRef(null);

  useEffect(() => { saveDraft(sessionId, text); }, [sessionId, text]);

  async function submit() {
    const body = text.trim();
    if (!body || busy) return;
    setText('');
    clearDraft(sessionId);
    const res = await onAdd(body, kind);
    if (!res?.ok) {
      // Put the observer's typing back. Never lose it.
      setText(res?.text ?? body);
      saveDraft(sessionId, res?.text ?? body);
    }
    ref.current?.focus();
  }

  function onKeyDown(e) {
    // Enter sends. Shift+Enter is a newline. Cmd/Ctrl+Enter also sends, because
    // half the room has the other muscle memory.
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  return (
    <div className="composer">
      <label className="sr-only" htmlFor="note-input">Write a note in your own lane</label>
      <textarea
        id="note-input"
        ref={ref}
        className="textarea"
        rows={3}
        value={text}
        placeholder="What did you just notice?"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        maxLength={4000}
      />
      <div className="composer__row">
        <select
          className="input"
          style={{ width: 'auto', minHeight: 36, padding: '0 var(--space-2)' }}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          aria-label="Note kind"
        >
          {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
        </select>
        <span className="composer__hint">Enter to add · Shift+Enter for a new line</span>
        <button type="button" className="btn btn--primary" onClick={submit} disabled={busy || !text.trim()}>
          Add note
        </button>
      </div>
    </div>
  );
}
