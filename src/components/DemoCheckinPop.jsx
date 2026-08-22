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

  return (
    <div className="demo-checkin" role="status">
      <button className="x" aria-label="Dismiss until the next check-in" onClick={() => recordDemoCheckin(task.id)}>✕</button>
      <div className="head">
        <span className="clock">
          <svg width="14" height="14" viewBox="0 0 16 16">
            <path d="M8 4 v4 l2.6 1.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="8" cy="8" r="6.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <b>What’s your progress on “{task.title}”?</b>
      </div>
      <p>
        You’re at {task.progress ?? 0}%{left ? ` and there’s ${left}` : ''}. A friendly nudge so the deadline
        doesn’t go quiet — in the sample a day passes every minute.
      </p>
      <div className="acts">
        <button className="btn btn-primary btn-sm" onClick={() => {
          nudgeDemoProgress(task.id);
          recordDemoCheckin(task.id);
          toast('Logged — on track', 'Next check-in in about a minute (daily in the real app)', 'ok');
        }}>On track</button>
        <button className="btn btn-sm" onClick={() => {
          recordDemoCheckin(task.id);
          toast('Flagged as blocked', 'The assigner would be notified right away to unblock you', 'warn');
        }}>I’m blocked</button>
        <button className="btn btn-sm" onClick={() => {
          setDemoTaskStatus(task.id, 'done');
          recordDemoCheckin(task.id);
          toast('Marked complete 🎉', 'It moves to Done for everyone in the space', 'ok');
        }}>Done</button>
      </div>
    </div>
  );
}
