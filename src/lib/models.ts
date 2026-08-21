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
