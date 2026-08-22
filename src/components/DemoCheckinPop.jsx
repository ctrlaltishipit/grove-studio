import React, { useState, useEffect } from 'react';
import { useToast } from '../state/Store';
import {
  useDemoLoop, pickDemoCheckin, recordDemoCheckin, setDemoTaskStatus,
  nudgeDemoProgress, demoTimeLeftLabel,
} from '../lib/demoLoop';

// The sample space's friendly check-in: a small floating card, bottom-left,
// that appears once per sample "day" while one of your sample tasks is in
// progress. Never blocks anything — ✕ snoozes it until the next one.
export default function DemoCheckinPop() {
  const loop = useDemoLoop();
  const { toast } = useToast();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(t);
  }, []);

  const task = pickDemoCheckin(loop, now);
  if (!task) return null;
  const left = demoTimeLeftLabel(loop, task.id, now);

  const pct = task.progress ?? 0;
  const urgent = (loop.dueAt[task.id] ?? Infinity) - now < 2 * 3600_000;
  return (
    <div className="demo-checkin" role="status">
      <div className="top">
        <span className="clock">
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path d="M8 4 v4 l2.6 1.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <span className="label">Quick check-in</span>
        <button className="x" aria-label="Dismiss until the next check-in" title="Dismiss for now" onClick={() => recordDemoCheckin(task.id)}>
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3 L9 9 M9 3 L3 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="task">{task.title}</div>
      <div className="line">
        {task.status === 'todo' ? 'Not started yet.' : 'How’s it going?'}{left ? ` ${left[0].toUpperCase()}${left.slice(1)}.` : ''}
      </div>
      <div className="meter">
        <div className="bar"><div style={{ width: `${pct}%`, background: urgent ? 'var(--danger)' : 'var(--amber)' }} /></div>
        <span className="mono">{pct}% done</span>
      </div>
      <div className="acts">
        <button className="btn btn-primary btn-sm" onClick={() => {
          if (task.status === 'todo') setDemoTaskStatus(task.id, 'doing');
          nudgeDemoProgress(task.id);
          recordDemoCheckin(task.id);
          toast('Logged, on track', 'Next check-in in about a minute (daily in the real app)', 'ok');
        }}>{task.status === 'todo' ? 'Started' : 'On track'}</button>
        <button className="btn btn-sm" onClick={() => {
          recordDemoCheckin(task.id);
          toast('Flagged as blocked', 'The assigner would be notified right away to unblock you', 'warn');
        }}>Blocked</button>
        <button className="btn btn-sm" onClick={() => {
          setDemoTaskStatus(task.id, 'done');
          recordDemoCheckin(task.id);
          toast('Marked complete 🎉', 'It moves to Done for everyone in the space', 'ok');
        }}>Done</button>
      </div>
    </div>
  );
}
