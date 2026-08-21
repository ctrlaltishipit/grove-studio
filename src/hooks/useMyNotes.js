import { useCallback, useState } from 'react';
import { createNote, updateNote, deleteNote } from '../lib/data';

// Own-lane CRUD with optimistic append. If an insert fails the text goes back
// into the draft — never lose an observer's typing.
export function useMyNotes({ sessionId, participantId, notes, setNotes }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const add = useCallback(async (body, kind = 'observation') => {
    const text = body.trim();
    if (!text || !participantId) return { ok: false, text };
    setBusy(true);
    setError(null);

    const tempId = `temp-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      id: tempId, body: text, kind,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      _pending: true,
    };
    setNotes((prev) => [optimistic, ...prev]);

    try {
      const saved = await createNote({ sessionId, participantId, body: text, kind });
      setNotes((prev) => [saved, ...prev.filter((n) => n.id !== tempId)]);
      return { ok: true };
    } catch (e) {
      setNotes((prev) => prev.filter((n) => n.id !== tempId));
      setError(e);
      return { ok: false, text };   // caller puts it back in the composer
    } finally {
      setBusy(false);
    }
  }, [sessionId, participantId, setNotes]);

  const edit = useCallback(async (noteId, body) => {
    const text = body.trim();
    if (!text) return false;
    setError(null);
    const before = notes;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, body: text } : n)));
    try {
      const saved = await updateNote({ noteId, participantId, body: text });
      setNotes((prev) => prev.map((n) => (n.id === noteId ? saved : n)));
      return true;
    } catch (e) {
      setNotes(before);
      setError(e);
      return false;
    }
  }, [notes, participantId, setNotes]);

  const remove = useCallback(async (noteId) => {
    setError(null);
    const before = notes;
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    try {
      await deleteNote({ noteId, participantId });
      return true;
    } catch (e) {
      setNotes(before);
      setError(e);
      return false;
    }
  }, [notes, participantId, setNotes]);

  return { add, edit, remove, busy, error };
}
