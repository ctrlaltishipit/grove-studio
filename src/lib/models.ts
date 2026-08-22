// Grove — domain types. Hand-written to match sql/01_schema.sql; the generated
// Database type (src/lib/types.ts, scripts/gen-types.mjs) is the source of truth
// once a project exists, and tests/unit/types.test.ts keeps the two in step.

export type SessionStatus = 'live' | 'synthesised';
export type NoteKind = 'observation' | 'quote' | 'question';

export interface Session {
  id: string;
  title: string;
  research_question: string;
  join_code: string;
  status: SessionStatus;
  created_by: string;
  created_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  display_name: string;
  user_id: string;
  colour_index: number;
  last_seen_at: string;
  joined_at: string;
}

export interface Note {
  id: string;
  session_id: string;
  participant_id: string;
  body: string;
  kind: NoteKind;
  created_at: string;
  updated_at: string;
  /** Client-only optimistic flags. Never persisted. */
  pending?: boolean;
  failed?: boolean;
}

export interface Finding {
  id: string;
  session_id: string;
  theme: string;
  summary: string;
  observer_count: number;
  supporting_note_ids: string[];
  has_disagreement: boolean;
  disagreement_note: string | null;
  rank: number;
  created_at: string;
}

/** One row of get_roster() / get_public_roster(): names, colours, COUNTS. Never note text. */
export interface RosterRow {
  participant_id: string;
  display_name: string;
  colour_index: number;
  note_count: number;
  last_seen_at?: string;
  joined_at?: string;
}

/** One row of get_finding_observers(): which participant supported which finding. Ids only. */
export interface FindingObserver {
  finding_id: string;
  participant_id: string;
}

/* ---------------- Grove Studio: spaces and notes ----------------
 * A space (project) is collaborative. A note inside it is 'private' — its
 * author and nobody else, ever — or 'shared' with every member. Promotion is
 * one-way: a shared note cannot be made private again, because people have
 * already read it. */

export type NoteVisibility = 'private' | 'shared';

export interface Space {
  id: string;
  name: string;
  join_code: string;
  member_count: number;
  shared_notes: number;
  my_private_notes: number;
  last_activity: string;
}

export interface SpaceMember {
  member_id: string;
  user_id: string;
  display_name: string;
  colour_index: number;
  role: 'owner' | 'member';
  shared_notes: number;
  last_seen_at: string;
}

export interface SpaceNote {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  body: string;
  visibility: NoteVisibility;
  shared_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  user_id: string;
  display_name: string;
  avatar_url: string;
}

/* ---------- tasks (A15) ---------- */

export type TaskStatus = 'todo' | 'doing' | 'blocked' | 'done';

/** The four columns of the board, in the order they are always shown. */
export const TASK_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo',    label: 'To do' },
  { status: 'doing',   label: 'In progress' },
  { status: 'blocked', label: 'Blocked' },
  { status: 'done',    label: 'Done' },
];

/** One task as the board sees it — assignee already resolved to a name. */
export interface NoteTask {
  id: string;
  title: string;
  detail: string;
  status: TaskStatus;
  due_date: string | null;
  position: number;
  assignee_id: string | null;
  assignee_name: string | null;
  assignee_colour: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

/** One task as the dashboard sees it — carries where it came from, because
 *  "write the summary" means nothing without "on Clinic booking". */
export interface MyTask {
  id: string;
  title: string;
  detail: string;
  status: TaskStatus;
  due_date: string | null;
  project_id: string;
  project_name: string;
  note_id: string;
  note_title: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type NotificationKind = 'assigned' | 'reassigned' | 'unassigned' | 'due_soon' | 'completed';

/** Flat, not a jsonb blob: my_notifications() returns named scalars so a
 *  definer function can never hand back more than these five facts. */
export interface AppNotification {
  id: string;
  kind: NotificationKind;
  task_id: string | null;
  task_title: string | null;
  note_title: string | null;
  project_id: string | null;
  note_id: string | null;
  due_date: string | null;
  read_at: string | null;
  created_at: string;
}
