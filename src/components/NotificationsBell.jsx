import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useData } from '../state/Store';
import { markNotificationsRead } from '../lib/api';
import { shortTime } from '../lib/fmt';

const KIND_STYLE = {
  assign:  { icon: '→', bg: 'var(--acc-soft)',   ink: 'var(--acc-deep)' },
  checkin: { icon: '✓', bg: 'var(--amber-soft)', ink: 'var(--amber)' },
  blocked: { icon: '!', bg: 'var(--amber-soft)', ink: 'var(--amber)' },
  share:   { icon: '+', bg: 'var(--sunken)',     ink: 'var(--muted)' },
  done:    { icon: '✓', bg: 'var(--acc-soft)',   ink: 'var(--acc-deep)' },
  studio:  { icon: '♪', bg: 'var(--vio-soft)',   ink: 'var(--vio-deep)' },
  mention: { icon: '@', bg: 'var(--acc-soft)',   ink: 'var(--acc-deep)' },
  comment: { icon: '…', bg: 'var(--sunken)',     ink: 'var(--muted)' },
};

export default function NotificationsBell() {
  const { user } = useAuth();
  const { notifications, unread, refreshTasks, tasksReady } = useData();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const nav = useNavigate();

  // A notification about a note or task opens it.
  const goTo = (n) => {
    if (!n.project_id) return;
    setOpen(false);
    if (n.note_id) nav(`/app/s/${n.project_id}?note=${n.note_id}`);
    else if (n.task_id) nav(`/app/s/${n.project_id}?tab=board`);
    else nav(`/app/s/${n.project_id}`);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await markNotificationsRead(user.id);
      refreshTasks();
    }
  };

  return (
    <div style={{ position: 'relative' }} ref={wrapRef}>
      <button className="icon-btn" aria-label="Notifications" onClick={toggle}>
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 2 a4 4 0 0 1 4 4 v2.6 l1.2 2.2 a0.7 0.7 0 0 1 -0.6 1 H3.4 a0.7 0.7 0 0 1 -0.6 -1 L4 8.6 V6 a4 4 0 0 1 4 -4 Z"
            fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6.6 13.5 a1.5 1.5 0 0 0 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {unread > 0 && <span className="unread" />}
      </button>
      {open && (
        <div className="notif-pop">
          <header>
            <b>Notifications</b>
            <span>assignments · mentions · check-ins</span>
          </header>
          {notifications.length === 0 && (
            <div className="empty-note">
              {tasksReady
                ? 'Quiet for now — assignments and check-ins land here.'
                : 'Notifications switch on once sql/06_grovestudio.sql is applied.'}
            </div>
          )}
          {notifications.map((n) => {
            const s = KIND_STYLE[n.kind] ?? KIND_STYLE.share;
            return (
              <div className={'notif-row' + (n.project_id ? ' link' : '')} key={n.id} role={n.project_id ? 'button' : undefined} tabIndex={n.project_id ? 0 : undefined}
                onClick={() => goTo(n)} onKeyDown={(e) => { if (e.key === 'Enter') goTo(n); }}>
                <span className="icon" style={{ background: s.bg, color: s.ink }}>{s.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="text">{n.text}</div>
                  {n.sub && <div className="sub">{n.sub}</div>}
                </div>
                <span className="time">{shortTime(n.created_at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
