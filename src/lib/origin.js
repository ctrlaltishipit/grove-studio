// Why GroveStudio exists: the problem, the vision, the mission, and how the
// first version came together so fast. Used by the "Why we built it" section
// and the founder's margin notes across the site.
//
// OWNER TO CONFIRM: the vision and mission wording are drafted from the site's
// own lines; the 48-hour hackathon first version is from the founder's own
// portfolio film ("Zero to live in 48 hours").

export const PROBLEM = {
  quote: 'Every team writes notes. Very few teams use them.',
  body: 'The ideas sit in a doc, the decisions fade, and by Friday nobody remembers who owned what. The people who missed the meeting get a wall of text, or nothing. GroveStudio was built to end that quiet loss.',
};

export const VISION = 'Every meeting ends with a plan that people actually follow.';
export const MISSION = 'Keep the work that comes out of a meeting from getting lost: one live note for the whole team, a clear owner and date for every decision, a format that makes sense to each person, and a gentle check-in until the work is done.';

export const HOW = [
  { when: 'Day 0', title: 'One sentence, written down', body: 'We started from a single problem statement: meeting decisions get lost between the call and the work. Every feature had to serve that sentence or wait.' },
  { when: 'Hours 0 to 48', title: 'A hackathon challenge, live in 48 hours', body: 'We were handed the problem, not free to choose it. In 48 hours we shipped it end to end: frontend, backend, live AI keys, analytics and our own domain.' },
  { when: 'The weeks after', title: 'Rebuilt properly, with what we learned', body: 'We wrote the plan and the decisions down first, then rebuilt it as GroveStudio: live co-writing, the Studio, the board, check-ins and private spaces, with access checked by the database itself.' },
  { when: 'Every day since', title: 'Small, real improvements', body: 'We keep the words plain and ship in small steps. AI coding assistants pair with us on the build, so a good idea can be live the same day.' },
];

// Short margin notes from the founder, placed in the quiet space beside sections.
export const NOTES = {
  preview: ['Why a preview?', 'I wanted you to feel the app in ten seconds, before any sign-in. If it does not click here, it will not click later.'],
  problem: ['The itch', 'Teams have great meetings. Then by Friday nobody remembers who said they would do what. That gap is the whole reason this exists.'],
  story: ['Every screen is real', 'These are captures of the app working, signed in, with two people in one space. Nothing here is a mock-up.'],
  bento: ['Fewer tools', 'Docs hold words. Boards hold tasks. I wanted one place that holds both, and links them.'],
  teams: ['Built for the long run', 'The first version took 48 hours. Everything after that went into making it something a team can rely on every day.'],
  features: ['Plain words, on purpose', 'If a feature needs a manual, we have not finished designing it yet.'],
  studio: ['Reading is slow. Seeing is fast.', 'Not everyone takes in a page of text. The Studio lets each person pick the shape that makes it click.'],
};
export const FOUNDER = 'Deekshitha, founder';

// The hackathon story, in the founder's words, for the Why page.
export const HACKATHON = {
  eyebrow: 'How it started',
  title: 'A challenge we did not choose, and 48 hours to answer it',
  paras: [
    'GroveStudio began at a hackathon. We did not get to pick our problem. We were handed a hard one: help teams who meet often actually act on what they decide.',
    'It hit close to home. Every one of us had sat in meetings where good decisions were made, written down, and then quietly lost. The challenge was difficult because the fix is not one feature. It is notes, understanding, tasks and follow-up, all working together.',
    'The clock was tight. Instead of a mock-up, we set ourselves one rule: by the end, anyone should be able to open a real link, sign in and use it.',
  ],
  quote: 'In 48 hours we shipped a live, usable product on its own domain. That is GroveStudio.',
  shipped: [
    'Frontend: the full app and this website',
    'Backend and database, with access checked per person',
    'The Studio connected to live AI services through API keys',
    'Sign-in with Google or as a guest',
    'Google Analytics connected',
    'A purchased domain, live end to end',
  ],
};

// Where each page's "keep reading" link points, so the site reads as one story.
export const NEXT = {
  '/': { to: '/why', eyebrow: 'Next: the story', title: 'Why we built GroveStudio', line: 'A hackathon challenge, 48 hours, and a live product at the end.' },
  '/why': { to: '/features', eyebrow: 'Next: what it does', title: 'See every feature', line: 'Write together, the Studio, the board and sharing, one by one.' },
  '/features': { to: '/inside', eyebrow: 'Next: try it', title: 'Look inside the app', line: 'Watch the film, click through the real screens and try the preview.' },
  '/inside': { to: '/tour', eyebrow: 'Next: step by step', title: 'Take the product tour', line: 'Eight steps from sign-in to follow-up, with real captures.' },
  '/tour': { to: '/signin', eyebrow: 'Next: your turn', title: 'Start your first space', line: 'Sign in with Google or as a guest. The sample space is waiting.' },
  '/privacy': { to: '/terms', eyebrow: 'Next', title: 'Terms of use', line: 'The rules for using GroveStudio, in plain words.' },
  '/terms': { to: '/', eyebrow: 'Back to', title: 'The GroveStudio home page', line: 'Meeting notes that turn into finished work.' },
};
