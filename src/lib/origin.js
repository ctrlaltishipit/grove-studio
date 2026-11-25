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
  { when: 'Hours 0 to 48', title: 'A first version, live at a hackathon', body: 'We built the smallest loop that proves the idea, a shared note that turns a sentence into an owned task, and had it live within a hackathon weekend.' },
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
