import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { configError } from '../lib/supabase';
import { getUser, onAuth, ensureProfile } from '../lib/auth';
import { listSpaces, listMyTasks, listNotifications, features, joinSampleSpaces } from '../lib/api';
import { startGlobalLive } from '../lib/live';
import { loadStudioMin, saveStudioMin } from '../lib/local';

// ------------------------------------------------------------------- toasts

const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const toast = useCallback((title, sub = null, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, title, sub, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const value = useMemo(() => ({ toast, toasts }), [toast, toasts]);
  return <ToastCtx.Provider value={value}>{children}</ToastCtx.Provider>;
}

// --------------------------------------------------------------------- auth

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (configError) { setLoading(false); return; }
    let alive = true;

    (async () => {
      const u = await getUser().catch(() => null);
      if (!alive) return;
      setUser(u);
      if (u) {
        const p = await ensureProfile(u).catch(() => null);
        if (alive) setProfile(p);
      }
      setLoading(false);
    })();

    const off = onAuth(async (u) => {
      if (!alive) return;
      setUser(u);
      if (u) {
        const p = await ensureProfile(u).catch(() => null);
        if (alive) setProfile(p);
      } else {
        setProfile(null);
      }
    });
    return () => { alive = false; off(); };
  }, []);

  const value = useMemo(() => ({
    user,
    profile,
    setProfile,
    loading,
    displayName: profile?.display_name ?? 'You',
    avatarUrl: profile?.avatar_url ?? '',
  }), [user, profile, loading]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

// --------------------------------------------------------------------- data

const DataCtx = createContext(null);
export const useData = () => useContext(DataCtx);

export function DataProvider({ children }) {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState(null);      // null = loading
  const [myTasks, setMyTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [tasksReady, setTasksReady] = useState(true); // false once we learn the table is missing
  const [modal, setModal] = useState(null);        // { name, props }
  const bump = useRef(0);

  const refreshSpaces = useCallback(async () => {
    if (!user) return;
    try { setSpaces(await listSpaces()); } catch (e) { console.warn('spaces', e); setSpaces((s) => s ?? []); }
  }, [user]);

  const refreshTasks = useCallback(async () => {
    if (!user) return;
    try {
      const [t, n] = await Promise.all([listMyTasks(user.id), listNotifications(user.id)]);
      setMyTasks(t);
      setNotifications(n);
      setTasksReady(features.tasks !== false);
    } catch (e) { console.warn('tasks', e); }
  }, [user]);

  const refreshAll = useCallback(() => { refreshSpaces(); refreshTasks(); }, [refreshSpaces, refreshTasks]);

  useEffect(() => {
    if (!user) { setSpaces(null); setMyTasks([]); setNotifications([]); return; }
    // Sample spaces first, so a first-time visitor's list already has them.
    joinSampleSpaces().finally(refreshAll);
    return startGlobalLive({ onTick: refreshAll });
  }, [user, refreshAll]);

  const openModal = useCallback((name, props = {}) => setModal({ name, props, key: ++bump.current }), []);
  const closeModal = useCallback(() => setModal(null), []);

  const unread = notifications.filter((n) => !n.read).length;

  const value = useMemo(() => ({
    spaces, myTasks, notifications, unread, tasksReady,
    refreshSpaces, refreshTasks, refreshAll,
    modal, openModal, closeModal,
  }), [spaces, myTasks, notifications, unread, tasksReady, refreshSpaces, refreshTasks, refreshAll, modal, openModal, closeModal]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

// ------------------------------------------------------------------- studio

// The Studio rail is constant across the app. This context owns its state:
// expanded/minimized, the active tool, and the SCOPE — which spaces (picked
// on Home) or notes (picked inside a space) ground the next generation.
const StudioCtx = createContext(null);
export const useStudio = () => useContext(StudioCtx);

export function StudioProvider({ children }) {
  const [expanded, setExpandedState] = useState(() => {
    if (loadStudioMin()) return false;
    // No point auto-covering a phone screen: start minimized on mobile.
    return !window.matchMedia?.('(max-width: 860px)').matches;
  });
  const [tool, setTool] = useState('ask'); // Ask leads; Summary is space-only
  const [selSpaces, setSelSpaces] = useState(() => new Set());
  const [selNotes, setSelNotes] = useState(() => new Set());
  // Registered by the Space route: which space the user is looking at.
  const [context, setContext] = useState(null); // { spaceId, spaceName, kind } | null
  const cache = useRef(new Map()); // `${tool}|${scopeKey}` -> result

  const setExpanded = useCallback((v) => {
    setExpandedState(v);
    saveStudioMin(!v);
  }, []);

  const toggleSpace = useCallback((id) => setSelSpaces((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  const toggleNote = useCallback((id) => setSelNotes((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  }), []);

  const clearSelection = useCallback(() => { setSelSpaces(new Set()); setSelNotes(new Set()); }, []);

  const selectOnlyNote = useCallback((id) => { setSelSpaces(new Set()); setSelNotes(new Set([id])); }, []);

  // Selection precedence: picked notes > picked spaces > the open space > everything.
  const scope = useMemo(() => {
    if (selNotes.size) return { noteIds: [...selNotes] };
    if (selSpaces.size) return { spaceIds: [...selSpaces] };
    if (context?.spaceId) return { spaceIds: [context.spaceId] };
    return {};
  }, [selNotes, selSpaces, context]);

  const scopeKey = useMemo(() => JSON.stringify(scope), [scope]);

  const scopeLabel = useMemo(() => {
    if (selNotes.size) return `${selNotes.size} selected note${selNotes.size === 1 ? '' : 's'}`;
    if (selSpaces.size) return `${selSpaces.size} selected space${selSpaces.size === 1 ? '' : 's'}`;
    if (context?.spaceName) return `this space — ${context.spaceName}`;
    return 'all your spaces';
  }, [selNotes, selSpaces, context]);

  const hasSelection = selNotes.size > 0 || selSpaces.size > 0;

  const value = useMemo(() => ({
    expanded, setExpanded, tool, setTool,
    selSpaces, selNotes, toggleSpace, toggleNote, clearSelection, selectOnlyNote,
    context, setContext, scope, scopeKey, scopeLabel, hasSelection, cache,
  }), [expanded, setExpanded, tool, selSpaces, selNotes, toggleSpace, toggleNote,
    clearSelection, selectOnlyNote, context, scope, scopeKey, scopeLabel, hasSelection]);

  return <StudioCtx.Provider value={value}>{children}</StudioCtx.Provider>;
}
