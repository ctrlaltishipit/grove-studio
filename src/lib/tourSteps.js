// The product story, told once and used by the landing page, Features and the
// "What's inside" tour. Every picture is a real capture of the app (the sample
// space), kept in public/tour. Words are plain: no dashes, no jargon.

const T = '/tour/';

export const WORKFLOW = [
  {
    mark: 'write',
    title: 'Write the notes together',
    body: 'Everyone in the meeting types into the same note at the same time. Each person’s name sits at their cursor, every change is saved, and you can go back to any earlier version.',
    media: { src: T + 'note.webp', alt: 'A shared note in GroveStudio with its title, summary and text' },
  },
  {
    mark: 'studio',
    title: 'Make sense of them, your way',
    body: 'A page of text does not work for everyone. The Studio turns the same notes into a summary, a mind map, a slide deck, an infographic or an audio overview. Ask a question and the answer shows which note it came from.',
    media: { video: T + 'clip-studio.mp4', poster: T + 'clip-studio-poster.webp', alt: 'The Studio turning a space’s notes into a summary, mind map, slide deck and infographic' },
  },
  {
    mark: 'assign',
    title: 'Assign tasks while you take notes',
    body: 'When a decision is made, turn it into a task right away, from the note or straight on the board. Give it an owner and a due date. The task keeps a link back to the note where it was agreed.',
    media: { video: T + 'clip-assign.mp4', poster: T + 'clip-assign-poster.webp', alt: 'Adding a new task to the To do column of the board' },
  },
  {
    mark: 'board',
    title: 'Track and review on the board',
    body: 'Every shared space has a Kanban board: To do, In progress, In review and Done. Move cards, reassign owners and review finished work in one view.',
    media: { src: T + 'board.webp', alt: 'The Kanban board with To do, In progress, In review and Done columns' },
  },
  {
    mark: 'dashboard',
    title: 'See your work on one dashboard',
    body: 'Each person has a dashboard with everything assigned to them across every project: what is due, what is in progress and what is done. New assignments arrive as notifications.',
    media: { src: T + 'dashboard.webp', alt: 'The personal dashboard with an assignment notification and tasks assigned to you' },
  },
  {
    mark: 'respond',
    title: 'Reply, comment and follow up',
    body: 'Before a task is due, its owner gets a check-in and answers On track, Blocked or Done. Blocked tells the person who assigned it straight away. Anyone can comment on any note they can see, in any project.',
    media: { src: T + 'comments.webp', alt: 'Comments on a note, with a reply box that supports dictation' },
  },
];

// The full walkthrough, from first visit to follow-up.
export const TOUR = [
  {
    mark: 'signin',
    title: 'Sign in',
    body: 'Open GroveStudio in any browser. Continue with Google to keep your spaces on every device, or type your name to try it as a guest. There is nothing to install.',
    points: ['Google sign-in or guest access', 'Works on laptop and phone'],
    media: { video: T + 'clip-signin.mp4', poster: T + 'clip-signin-poster.webp', alt: 'The GroveStudio sign-in screen with a name being typed' },
  },
  {
    mark: 'space',
    title: 'Create a space for your project',
    body: 'A space holds one project. Make it private for your own notes, or shared so your team can write together, use the board and assign work. Invite people with a six-character code or by email.',
    points: ['Private or shared', 'Join with a code or an email invite'],
    media: { video: T + 'clip-newspace.mp4', poster: T + 'clip-newspace-poster.webp', alt: 'Creating a new shared space called Weekly sync' },
  },
  ...WORKFLOW.map((s, i) => (i === 0 ? {
    ...s,
    points: ['Live cursors with names', 'Dictate instead of typing', 'Version history with one-click restore'],
  } : i === 1 ? {
    ...s,
    points: ['Summary, mind map, slide deck, infographic, audio', 'Answers with the source note attached'],
  } : s)),
];

export const STUDIO_GALLERY = [
  { src: T + 'mindmap.webp', alt: 'A mind map made by the Studio from three notes', label: 'Mind map' },
  { src: T + 'deck.webp', alt: 'A slide deck made by the Studio, ready to play or download', label: 'Slide deck' },
  { src: T + 'infographic.webp', alt: 'An infographic made by the Studio from the notes', label: 'Infographic' },
];

// "A week with GroveStudio": one team, one meeting, every screen real.
// Captured from a staged shared space with two guest users (public/tour/story).
const S = '/tour/story/';
export const CAST = [
  ['Priya R.', 'runs the weekly sync', 'var(--o5)'],
  ['Arjun M.', 'owns the sales deck', 'var(--o3)'],
  ['Sam', 'missed the meeting', 'var(--o1)'],
];
export const STORYLINE = [
  {
    mark: 'write', when: 'Monday, 10:00', who: 'Priya R.', whoColor: 'var(--o5)',
    title: 'The meeting starts in one shared note',
    body: 'Priya opens the Weekly sync note and Arjun joins from his laptop. They write in the same note together. Each sees the other’s cursor with a name on it, so nobody writes the same line twice and nothing waits for a clean copy later.',
    points: ['Live cursors with names', 'Saved on every keystroke'],
    media: { focus: [52, 42, 1.6], video: S + 'cowrite.mp4', poster: S + 'cowrite-poster.webp', alt: 'Two people typing in the same note, each with a named cursor' },
  },
  {
    mark: 'assign', when: 'Monday, 10:18', who: 'Priya R.', whoColor: 'var(--o5)',
    title: 'A decision becomes a task before the call ends',
    body: 'They agree Arjun will send the updated deck by the end of the week. Priya turns that line into a task, picks Arjun as the owner and sets the date. The task keeps a link to the note where it was agreed.',
    points: ['Owner and due date in one step', 'Linked back to the note'],
    media: { focus: [57, 48, 1.45], src: S + 'assign.webp', alt: 'Creating a task and choosing Arjun as its owner' },
  },
  {
    mark: 'bell', when: 'Monday, 10:19', who: 'Arjun M.', whoColor: 'var(--o3)',
    title: 'Arjun hears about it straight away',
    body: 'A notification lands in Arjun’s bell: Priya R. assigned you “Send the updated deck”. One click takes him to it. Mentions and comments arrive the same way, so nobody has to chase anyone on chat.',
    media: { focus: [68, 40, 1.85], src: S + 'notification.webp', alt: 'The notifications bell open, showing that Priya assigned Arjun a task' },
  },
  {
    mark: 'dashboard', when: 'Tuesday, 09:00', who: 'Arjun M.', whoColor: 'var(--o3)',
    title: 'Everything on his plate, in one place',
    body: 'Arjun starts his day on his dashboard. Every task assigned to him, across every project, sits in one list with its due date, so he knows what matters this week without opening five spaces.',
    media: { focus: [62, 40, 1.4], src: S + 'dashboard.webp', alt: 'Arjun’s dashboard listing the tasks assigned to him with due dates' },
  },
  {
    mark: 'board', when: 'Wednesday, 11:00', who: 'Priya R.', whoColor: 'var(--o5)',
    title: 'The team reviews progress on the board',
    body: 'In the mid-week check, Priya opens the board. Cards move from To do to In progress to In review. She can see who owns what, reassign a card in one click, and spot anything that has stalled.',
    points: ['To do, In progress, In review, Done', 'Reassign in one click'],
    media: { focus: [60, 36, 1.3], src: S + 'board.webp', alt: 'The Weekly sync Kanban board with cards owned by Priya and Arjun' },
  },
  {
    mark: 'studio', when: 'Thursday, 15:00', who: 'Sam', whoColor: 'var(--o1)',
    title: 'Sam missed the meeting. The Studio catches him up.',
    body: 'Sam does not want to read every note. He opens the Studio and gets a summary of what was decided. If a picture works better for him, the same notes become a mind map, slides, an infographic or a short audio overview.',
    points: ['Summary, mind map, slides, infographic, audio', 'Made only from your notes'],
    media: { focus: [100, 46, 1.6], src: S + 'studio.webp', alt: 'The Studio showing an output made from the space’s notes' },
  },
  {
    mark: 'studio', when: 'Thursday, 15:05', who: 'Sam', whoColor: 'var(--o1)',
    title: 'Or he sees the whole meeting as one picture',
    body: 'If text is not how Sam takes things in, the same notes become a mind map, a slide deck, an infographic or a short audio overview. He can also ask the Studio a question and see which note the answer came from.',
    media: { src: '/tour/mindmap.webp', alt: 'A mind map made by the Studio from the space’s notes' },
  },
  {
    mark: 'respond', when: 'Friday, 09:00', who: 'Arjun M.', whoColor: 'var(--o3)',
    title: 'The check-in closes the loop',
    body: 'Before the deadline, Arjun gets a check-in on his dashboard: still on track? He answers On track, I’m blocked or Mark done. If he is blocked, Priya is told straight away. The deck goes out on time, and the meeting actually turned into finished work.',
    points: ['On track, Blocked or Done', 'Blocked alerts the assigner'],
    media: { src: S + 'checkin.webp', alt: 'A task check-in with On track, Blocked and Done' },
  },
];
