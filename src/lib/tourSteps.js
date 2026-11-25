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
