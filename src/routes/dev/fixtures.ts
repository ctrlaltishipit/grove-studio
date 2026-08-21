// Grove — DEV ONLY fixtures. Typed, deterministic, and never read by a
// production route: the preview routes mount only when import.meta.env.DEV,
// and the styleguide renders components, not a session. No network.
//
// Every number here is consistent with itself the way real data would be:
// roster counts sum to noteCount, each finding's observer_count equals the
// number of its rows in findingObservers, and the only note BODIES present
// belong to the current participant — the other lanes exist as counts and
// note ids only, exactly as they do in the product. GROVE-MASTER.md §4.2.
import type { Finding, FindingObserver, Note, NoteKind, RosterRow, Session } from '../../lib/models';

/** The current participant. Priya R. — first to join, colour 0. */
export const ME = 'p1';

export const session: Session = {
  id: 'dev-session',
  title: 'Pricing discovery — Acme',
  research_question: 'What makes them hesitate before buying?',
  join_code: 'TQ8FVX',
  status: 'live',
  created_by: 'u1',
  created_at: '2026-08-22T09:02:00.000Z',
};

/** The synthesis time. 10:17 UTC is 15:47 IST — the time every spec example quotes. */
export const synthesisedAt = '2026-08-22T10:17:00.000Z';

export const synthesisedSession: Session = { ...session, status: 'synthesised' };

/** Three observers, in join order. Names, colours, COUNTS — never note text. */
export const roster: RosterRow[] = [
  { participant_id: 'p1', display_name: 'Priya R.',  colour_index: 0, note_count: 7 },
  { participant_id: 'p2', display_name: 'Arjun M.',  colour_index: 1, note_count: 4 },
  { participant_id: 'p3', display_name: 'Nikhil S.', colour_index: 2, note_count: 9 },
];

/** count(notes) across the session — 20. Computed, never typed. §8.14 */
export const noteCount = roster.reduce((sum, r) => sum + r.note_count, 0);

const own = (id: string, kind: NoteKind, body: string, at: string): Note => ({
  id,
  session_id: session.id,
  participant_id: ME,
  body,
  kind,
  created_at: at,
  updated_at: at,
});

/** The current participant's own lane, newest first. Seven notes — the roster says 7. */
export const ownNotes: Note[] = [
  own('n7', 'question',
    'Is the hesitation about price at all, or about having to explain the purchase to someone else?',
    '2026-08-22T10:09:00.000Z'),
  own('n6', 'observation',
    'Asked where the notes are stored, in the last two minutes, almost as an afterthought.',
    '2026-08-22T10:04:00.000Z'),
  own('n5', 'quote',
    '"When I send this on, it needs to look like I did the work."',
    '2026-08-22T09:51:00.000Z'),
  own('n4', 'observation',
    'Scrolled past the pricing page in under three seconds and came back to it twice later, both times from the invite screen. The second time she read the per-seat line aloud, did the arithmetic for five people, and said nothing. The pause after that was the longest in the call.',
    '2026-08-22T09:44:00.000Z'),
  own('n3', 'question',
    'Long pause on the invite screen — is that about who to invite, or about the workspace being half-built?',
    '2026-08-22T09:31:00.000Z'),
  own('n2', 'quote',
    '"I’d have to justify this to someone who has never seen the tool."',
    '2026-08-22T09:22:00.000Z'),
  own('n1', 'observation',
    'She compared our price to what she already pays, not to what it would replace.',
    '2026-08-22T09:14:00.000Z'),
];

/** Ranked by observer_count descending — identical to the grid's row order. §8.10 */
export const findings: Finding[] = [
  {
    id: 'f1', session_id: session.id,
    theme: 'Price is compared to the incumbent, not to value',
    summary: 'All three observers recorded the participant anchoring on what they already pay rather than on what the tool would replace. Two noted that the comparison happened before the pricing page was shown.',
    observer_count: 3, supporting_note_ids: ['n1', 'n8', 'n12'],
    has_disagreement: false, disagreement_note: null, rank: 1,
    created_at: synthesisedAt,
  },
  {
    id: 'f2', session_id: session.id,
    theme: 'Onboarding stalls at the team invite step',
    summary: 'Two observers recorded the participant hesitating at the invite screen and asking whether colleagues would need accounts.',
    observer_count: 2, supporting_note_ids: ['n3', 'n9'],
    has_disagreement: true,
    disagreement_note: 'One observer read the pause as confusion about who to invite. Another read it as reluctance to expose an unfinished workspace to colleagues.',
    rank: 2, created_at: synthesisedAt,
  },
  {
    id: 'f3', session_id: session.id,
    theme: 'Export is assumed rather than asked about',
    summary: 'Two observers noted the participant referring to "when I send this on" without ever asking whether export existed.',
    observer_count: 2, supporting_note_ids: ['n5', 'n13'],
    has_disagreement: false, disagreement_note: null, rank: 3,
    created_at: synthesisedAt,
  },
  {
    id: 'f4', session_id: session.id,
    theme: 'Mobile use was mentioned once, unprompted',
    summary: 'One observer recorded the participant saying they would read findings on a commute.',
    observer_count: 1, supporting_note_ids: ['n10'],
    has_disagreement: false, disagreement_note: null, rank: 4,
    created_at: synthesisedAt,
  },
  {
    id: 'f5', session_id: session.id,
    theme: 'Security question raised late in the call',
    summary: 'One observer recorded a question about where notes are stored, asked in the last two minutes.',
    observer_count: 1, supporting_note_ids: ['n6'],
    has_disagreement: false, disagreement_note: null, rank: 5,
    created_at: synthesisedAt,
  },
];

/** get_finding_observers() rows — (finding_id, participant_id) pairs, ids only.
 *  One row per supporting observer, so each finding's row count equals its
 *  observer_count. Feeds buildSupporters() for the grid and the card footers. */
export const findingObservers: FindingObserver[] = [
  { finding_id: 'f1', participant_id: 'p1' },
  { finding_id: 'f1', participant_id: 'p2' },
  { finding_id: 'f1', participant_id: 'p3' },
  { finding_id: 'f2', participant_id: 'p1' },
  { finding_id: 'f2', participant_id: 'p2' },
  { finding_id: 'f3', participant_id: 'p1' },
  { finding_id: 'f3', participant_id: 'p3' },
  { finding_id: 'f4', participant_id: 'p2' },
  { finding_id: 'f5', participant_id: 'p1' },
];
