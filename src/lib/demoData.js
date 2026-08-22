// =============================================================================
// GroveStudio — the built-in sample space, shown to everyone on sign-in.
//
// It is a read-only, self-contained showcase of the whole product, themed on
// "how to use GroveStudio". The notes, board, comments and members are authored
// here; the Studio artifacts (summary, mind map, infographic, slide deck, audio)
// were generated once by the real pipeline and baked into demoArtifacts.js so
// they always look perfect and cost nothing at runtime.
// =============================================================================

export const DEMO_SPACE_ID = 'demo-grovestudio';
export const DEMO_JOIN_CODE = 'SAMPLE';

// Members shown on the board and as note authors (illustrative cast).
export const DEMO_MEMBERS = [
  { memberId: 'dm-you', userId: 'demo-you', name: 'You', colourIndex: 0, role: 'member' },
  { memberId: 'dm-priya', userId: 'demo-priya', name: 'Priya R.', colourIndex: 1, role: 'owner' },
  { memberId: 'dm-arjun', userId: 'demo-arjun', name: 'Arjun M.', colourIndex: 2, role: 'member' },
  { memberId: 'dm-nikhil', userId: 'demo-nikhil', name: 'Nikhil S.', colourIndex: 3, role: 'member' },
  { memberId: 'dm-sara', userId: 'demo-sara', name: 'Sara K.', colourIndex: 4, role: 'member' },
];

const iso = (daysAgo, h = 10) => {
  // Deterministic-ish recent timestamps without Date.now at render.
  const base = new Date('2026-08-22T10:00:00Z').getTime();
  return new Date(base - daysAgo * 86400000 + h * 3600000).toISOString();
};

export const DEMO_NOTES = [
  {
    id: 'dn-1',
    project_id: DEMO_SPACE_ID,
    author_id: 'dm-priya',
    title: 'Start here — what GroveStudio is',
    visibility: 'shared',
    created_at: iso(3), updated_at: iso(0, 8),
    brief: 'GroveStudio organises work into private or shared spaces; shared spaces co-write live, and access is shared by code or email, by consent.',
    body:
`GroveStudio is a shared workspace where notes don't stop at being notes. You work inside "spaces" — a space is one project.

Private space: only you can see it. Your own notes, plus the full Studio.
Shared space: your team writes together, live, like a doc — you watch each other's words land as they type.

Every note saves on every keystroke. You can type, or press the microphone and dictate — the words appear as you speak and are never auto-submitted.

To bring people in, share a space's six-character code, or invite them by email. Sharing is by consent: the person who created a note or a space is its admin, and can share a single note, several, or a whole project.`,
  },
  {
    id: 'dn-2',
    project_id: DEMO_SPACE_ID,
    author_id: 'dm-you',
    title: 'The Studio — turn notes into anything',
    visibility: 'shared',
    created_at: iso(2), updated_at: iso(0, 9),
    brief: 'The Studio turns the notes you can see into Ask, Summary, Mind map, Slide deck, Infographic and an Audio overview — always grounded, never invented.',
    body:
`Open the Studio from the right-hand panel. It reads only the notes you're allowed to see, and turns them into whatever format your team actually consumes:

Ask — ask a question and get an answer drawn only from your notes, with the source attached.
Summary — the decisions, the open questions, and the key people, in seconds. Inside a note you also get a one-line auto-summary that refreshes when you reopen it.
Mind map — the themes across your notes and how they connect, at a glance.
Slide deck — a designed deck, laid out automatically, that you can view full screen and download.
Infographic — a shareable one-image version of the meeting.
Audio overview — a two-host briefing you can play on your commute.

Everything is grounded in your notes — it never invents facts — and it only ever uses notes you have access to.`,
  },
  {
    id: 'dn-3',
    project_id: DEMO_SPACE_ID,
    author_id: 'dm-nikhil',
    title: 'The board & follow-up — notes become owned work',
    visibility: 'shared',
    created_at: iso(1), updated_at: iso(0, 10),
    brief: 'Notes become owned board tasks with deadlines and instant notifications, and GroveStudio follows up with check-ins so work never quietly slips.',
    body:
`Every shared space has a board: To do, In progress, In review, Done.

Turn a decision into a task and assign it to a teammate — from the board, or straight from inside a note. The owner is notified instantly with the note link, the reason, and the deadline. Reassign any time.

Your dashboard has an "Assigned to you" list: every task across every space, with live status.

Then the part no other notetaker has: GroveStudio follows up. When a task is due it checks in — On track, Blocked, or Done in one tap. "Blocked" tells the assigner right away, so work never quietly dies.

That's the whole loop: capture together, decide, assign, and get followed up until it's done.`,
  },
];

// Conversation threads, keyed by note id.
export const DEMO_COMMENTS = {
  'dn-1': [
    { id: 'dc-1', note_id: 'dn-1', author_user: 'demo-arjun', body: 'The live co-writing is the part that sold me — you actually see teammates type.', created_at: iso(0, 8) },
    { id: 'dc-2', note_id: 'dn-1', author_user: 'demo-sara', body: 'And the mic in the comment box means I can dictate a quick note on mobile. 🎙️', created_at: iso(0, 9) },
  ],
  'dn-2': [
    { id: 'dc-3', note_id: 'dn-2', author_user: 'demo-priya', body: 'Ask answering only from our notes, with the source attached, is exactly what I wanted.', created_at: iso(0, 9) },
    { id: 'dc-4', note_id: 'dn-2', author_user: 'demo-you', body: 'Try the Slide deck — it lays itself out and you can download it as a PDF.', created_at: iso(0, 10) },
  ],
  'dn-3': [
    { id: 'dc-5', note_id: 'dn-3', author_user: 'demo-nikhil', body: 'The check-in on due tasks is what makes things actually get done. No more silent slips.', created_at: iso(0, 10) },
  ],
};

// Board tasks across the four columns, assigned to the sample cast + You.
export const DEMO_TASKS = [
  { id: 'dt-1', project_id: DEMO_SPACE_ID, note_id: 'dn-1', title: 'Create your first space', label: 'Spec', status: 'todo', progress: 0, assignee_user: 'demo-you', assigned_by_user: 'demo-priya', due_date: '2026-08-27' },
  { id: 'dt-2', project_id: DEMO_SPACE_ID, note_id: 'dn-1', title: 'Invite a teammate with the six-character code', label: 'Ops', status: 'todo', progress: 0, assignee_user: 'demo-you', assigned_by_user: 'demo-priya', due_date: '2026-08-28' },
  { id: 'dt-3', project_id: DEMO_SPACE_ID, note_id: 'dn-2', title: 'Generate a Studio summary of these notes', label: 'Research', status: 'doing', progress: 40, assignee_user: 'demo-arjun', assigned_by_user: 'demo-you', due_date: '2026-08-26' },
  { id: 'dt-4', project_id: DEMO_SPACE_ID, note_id: 'dn-2', title: 'Try the Slide deck and download it', label: 'Design', status: 'doing', progress: 60, assignee_user: 'demo-sara', assigned_by_user: 'demo-you', due_date: '2026-08-26' },
  { id: 'dt-5', project_id: DEMO_SPACE_ID, note_id: 'dn-3', title: 'Assign a task straight from a note', label: 'Eng', status: 'review', progress: 80, assignee_user: 'demo-nikhil', assigned_by_user: 'demo-priya', due_date: '2026-08-25' },
  { id: 'dt-6', project_id: DEMO_SPACE_ID, note_id: 'dn-3', title: 'Play the audio overview', label: 'Ops', status: 'done', progress: 100, assignee_user: 'demo-you', assigned_by_user: 'demo-sara', due_date: '2026-08-24' },
];

export const demoSpace = {
  id: DEMO_SPACE_ID,
  name: 'Getting started with GroveStudio',
  kind: 'shared',
  joinCode: DEMO_JOIN_CODE,
  description: 'A sample space that shows what GroveStudio can do — explore the notes, board, comments and Studio. Read-only.',
  memberCount: DEMO_MEMBERS.length,
  sharedNotes: DEMO_NOTES.length,
  myPrivateNotes: 0,
  lastActivity: iso(0, 10),
  createdBy: 'demo-priya',
  demo: true,
};

export const profileOf = (userId) => {
  const m = DEMO_MEMBERS.find((x) => x.userId === userId);
  return m ? { user_id: userId, display_name: m.name, avatar_url: '' } : null;
};
