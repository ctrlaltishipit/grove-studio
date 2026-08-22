import React from 'react';
import { useToast } from '../state/Store';

const STYLE = {
  ok:     { edge: 'var(--acc)',   icon: '✓', bg: 'var(--acc-soft)',   ink: 'var(--acc-deep)' },
  assign: { edge: 'var(--acc)',   icon: '→', bg: 'var(--acc-soft)',   ink: 'var(--acc-deep)' },
  warn:   { edge: 'var(--amber)', icon: '!', bg: 'var(--amber-soft)', ink: 'var(--amber)' },
  error:  { edge: 'var(--danger)', icon: '!', bg: 'var(--amber-soft)', ink: 'var(--danger)' },
};

export default function Toasts() {
  const { toasts } = useToast();
  return (
    <div className="toasts">
      {toasts.map((t) => {
        const s = STYLE[t.kind] ?? STYLE.ok;
        return (
          <div key={t.id} className="toast" style={{ borderLeft: `3px solid ${s.edge}` }}>
            <span className="icon" style={{ background: s.bg, color: s.ink }}>{s.icon}</span>
            <div>
              <b>{t.title}</b>
              {t.sub ? <span>{t.sub}</span> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
