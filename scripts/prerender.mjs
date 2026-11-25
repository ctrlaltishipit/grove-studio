// Post-build: give every public route its own HTML file, so search engines,
// answer engines and link previews see the right title, description,
// structured data and the page's real words, without running JavaScript.
// React replaces the #root content on load (createRoot), so visitors see the
// app as usual. Run by `npm run build` after `vite build`.
import fs from 'node:fs';
import path from 'node:path';
import { HOME_FAQ, WHY_FAQ, FEATURES_FAQ } from '../src/lib/faq.js';
import { WORKFLOW, TOUR } from '../src/lib/tourSteps.js';
import { PRIVACY, TERMS, legalHtml } from '../src/lib/legal.js';

const SITE = 'https://www.grovestudio.io';
const DIST = path.resolve('dist');
const base = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;

const ORG = { '@type': 'Organization', '@id': `${SITE}/#org`, name: 'GroveStudio', url: SITE, logo: `${SITE}/icons/icon-512.png` };
const APP = {
  '@type': 'SoftwareApplication', '@id': `${SITE}/#app`, name: 'GroveStudio', url: SITE,
  applicationCategory: 'BusinessApplication', operatingSystem: 'Web browser',
  description: 'A collaborative workspace for teams: write meeting notes together, turn them into summaries, slides, mind maps, infographics and audio, assign tasks on a Kanban board, and follow up from a personal dashboard.',
  featureList: ['Live co-writing with named cursors', 'Version history', 'Comments and @mentions', 'Dictation', 'AI summaries, mind maps, slide decks, infographics and audio overviews', 'Answers with source notes', 'Kanban board', 'Task assignment with owners and due dates', 'Check-ins: On track, Blocked, Done', 'Personal dashboard with notifications', 'Roles: admin, editor, viewer', 'Private and shared spaces'],
  publisher: { '@id': `${SITE}/#org` },
};
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const crumbs = (name, p) => ({ '@type': 'BreadcrumbList', itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'GroveStudio', item: `${SITE}/` },
  { '@type': 'ListItem', position: 2, name, item: `${SITE}${p}` },
] });

const stepsHtml = (steps) => `<ol>${steps.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.body)}</p></li>`).join('')}</ol>`;
const faqHtml = (faq) => faq.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('');

const ROUTES = [
  {
    path: '/', title: 'GroveStudio: team meeting notes, tasks and follow-ups in one place',
    description: 'GroveStudio is a collaborative workspace for teams. Write meeting notes together, turn them into summaries, slides and audio, assign tasks on a Kanban board, and track everything from one dashboard.',
    ld: [ORG, APP, { '@type': 'WebSite', '@id': `${SITE}/#site`, name: 'GroveStudio', url: SITE, publisher: { '@id': `${SITE}/#org` } }, faqLd(HOME_FAQ)],
    body: `<h1>Meeting notes that turn into finished work.</h1>
<p>Write notes together in real time. When text is not enough, turn them into a summary, slides or audio. Assign the tasks, track them on a board, and follow up from one dashboard.</p>
<h2>From the meeting to done, in one place</h2>${stepsHtml(WORKFLOW)}
<h2>Built for teams that collaborate every day</h2><p>Roles for every person, private spaces, version history and answers that cite their source note.</p>
<h2>GroveStudio in short</h2>${faqHtml(HOME_FAQ)}`,
  },
  {
    path: '/tour', title: 'What’s inside GroveStudio: a step-by-step tour of the app',
    description: 'See how GroveStudio works, step by step: sign in, create a space, write notes together, turn them into summaries and slides, assign tasks, track them on a Kanban board and follow up from your dashboard.',
    ld: [ORG, crumbs('Product tour', '/tour'), {
      '@type': 'HowTo', name: 'How to run a team meeting in GroveStudio, from notes to finished tasks',
      description: 'Sign in, create a shared space, write notes together, use the Studio to understand them, assign tasks, track them on the board and follow up from your dashboard.',
      tool: [{ '@type': 'HowToTool', name: 'A web browser' }],
      step: TOUR.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, name: s.title, text: s.body, url: `${SITE}/tour#tour-${i + 1}`, image: s.media.src ? `${SITE}${s.media.src}` : `${SITE}${s.media.poster}` })),
    }],
    body: `<h1>A tour of the app, one step at a time</h1><p>Eight steps, from opening GroveStudio for the first time to closing out the work your meeting created.</p>${stepsHtml(TOUR)}`,
  },
  {
    path: '/features', title: 'GroveStudio features: live notes, AI Studio, Kanban board, dashboard and check-ins',
    description: 'Try GroveStudio before you sign in: a working preview of live notes, the AI Studio, the Kanban board and your dashboard. See what is inside, how teams work across countries, and join early access.',
    ld: [ORG, APP, crumbs('Features', '/features'), faqLd(FEATURES_FAQ)],
    body: `<h1>Notes, Studio and board. One place.</h1><p>Write it together. See it your way. Get it done. Try a working preview of the app before you sign in, or join the early access list.</p>
<h2>From sign-in to follow-up</h2>${stepsHtml(TOUR)}
<h2>Work from anywhere</h2><p>Your team can be in any country and still write in the same note at the same time. Tasks, mentions, comments and check-ins reach the right person wherever they work.</p>
<h2>Frequently asked</h2>${faqHtml(FEATURES_FAQ)}`,
  },
  {
    path: '/why', title: 'Why GroveStudio? Meeting notes that turn into tasks, slides and audio',
    description: 'GroveStudio is a note-taking app for teams. Write notes together, turn decisions into tasks with owners and dates, and turn notes into slides, mind maps, infographics and audio.',
    ld: [ORG, crumbs('Why GroveStudio', '/why'), faqLd(WHY_FAQ)],
    body: `<h1>Most meeting notes are never read again. Yours will be.</h1><p>Every team writes notes. Few teams use them. GroveStudio keeps notes, tasks and follow-up together.</p><h2>Questions people ask</h2>${faqHtml(WHY_FAQ)}`,
  },
  {
    path: '/privacy', title: 'Privacy note | GroveStudio',
    description: 'How GroveStudio handles your data: what we collect, how the Studio uses AI providers, who can see your notes, cookies, and your rights.',
    ld: [ORG, crumbs('Privacy note', '/privacy')],
    body: legalHtml(PRIVACY, esc),
  },
  {
    path: '/terms', title: 'Terms of use | GroveStudio',
    description: 'The terms for using GroveStudio: your content, acceptable use, AI outputs, early access and our responsibilities, in plain words.',
    ld: [ORG, crumbs('Terms of use', '/terms')],
    body: legalHtml(TERMS, esc),
  },
];

function render(r) {
  const url = `${SITE}${r.path === '/' ? '/' : r.path}`;
  let html = base;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(r.title)}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(r.description)}" />`);
  html = html.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(r.title)}" />`);
  html = html.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(r.description)}" />`);
  html = html.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta name="twitter:title" content="${esc(r.title)}" />`,
    `<meta name="twitter:description" content="${esc(r.description)}" />`,
    ld({ '@context': 'https://schema.org', '@graph': r.ld }),
  ].join('\n    ');
  html = html.replace('</head>', `    ${head}\n  </head>`);
  html = html.replace('<div id="root"></div>', `<div id="root"><main class="seo-shell">${r.body}</main></div>`);
  return html;
}

for (const r of ROUTES) {
  const out = r.path === '/' ? path.join(DIST, 'index.html') : path.join(DIST, r.path.slice(1), 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, render(r));
}

// Unknown routes (the app itself) get a clean shell with no page text.
fs.writeFileSync(path.join(DIST, 'app.html'), base);

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map((r) => `  <url><loc>${SITE}${r.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *
Allow: /
Disallow: /app
Disallow: /signin

Sitemap: ${SITE}/sitemap.xml
`);
fs.writeFileSync(path.join(DIST, 'llms.txt'), `# GroveStudio

> GroveStudio is a collaborative workspace for teams that meet and work together every day. Teams write meeting notes together in real time, turn them into summaries, mind maps, slide decks, infographics and audio overviews, assign tasks with owners and due dates, track them on a Kanban board, and follow up from a personal dashboard with notifications and check-ins.

## Pages
- [Home](${SITE}/): what GroveStudio is and who it is for
- [Product tour](${SITE}/tour): the app step by step, from sign-in to follow-up
- [Features](${SITE}/features): every feature, grouped
- [Why GroveStudio](${SITE}/why): the problem it solves and common questions
- [Privacy note](${SITE}/privacy): what data GroveStudio collects and how it is used
- [Terms of use](${SITE}/terms): the rules for using GroveStudio

## How it works
${TOUR.map((s, i) => `${i + 1}. ${s.title}: ${s.body}`).join('\n')}

## Questions
${[...HOME_FAQ, ...FEATURES_FAQ].map(([q, a]) => `- ${q} ${a}`).join('\n')}
`);
console.log('prerendered', ROUTES.map((r) => r.path).join(' '), '+ sitemap.xml robots.txt llms.txt');
