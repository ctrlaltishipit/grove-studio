// The privacy note and the terms, written in plain words. Shared by the pages
// (src/routes/Legal.jsx) and by scripts/prerender.mjs, so what people read
// and what search engines index are the same text.
//
// Every statement here describes how the app actually works today. If the
// app changes (a new AI provider, analytics, payments), update this file.
//
// OWNER TO CONFIRM before relying on these pages: the legal name of the
// business, a contact email, and the governing law (see CONTACT below).

export const UPDATED = '26 November 2026';

// How people reach us. No dedicated address exists yet, so the pages point
// to replying to any GroveStudio email. Set CONTACT_EMAIL to a real inbox.
export const CONTACT_EMAIL = '';
const contact = CONTACT_EMAIL
  ? `email ${CONTACT_EMAIL}`
  : 'reply to any email you have received from GroveStudio (joining the early access list sends you one)';

export const PRIVACY = {
  title: 'Privacy note',
  lead: 'What GroveStudio collects, why, who helps us run it, and the choices you have. We keep it short and specific.',
  short: [
    'We collect what the app needs to work: your name, your sign-in, and the notes, tasks and comments you create.',
    'We do not sell your data, and we do not use it for advertising.',
    'When you use the Studio, the notes you pick are sent to an AI provider to make the output.',
    'You can ask us to see, correct or delete your data at any time.',
  ],
  sections: [
    {
      id: 'who', h: 'Who we are',
      p: ['GroveStudio is a workspace where teams write meeting notes together, turn them into summaries, slides, mind maps, infographics and audio, and follow up on tasks. In this note, "we" means the team that runs GroveStudio at grovestudio.io, and "you" means anyone who visits the website or uses the app.'],
    },
    {
      id: 'collect', h: 'What we collect',
      p: ['We only collect what we need to run the service.'],
      list: [
        ['Account details', 'If you continue with Google: your name, email address and profile picture from your Google account. If you continue as a guest: the name you type. Guest sessions have no email.'],
        ['What you create', 'Spaces, notes, earlier versions of notes, comments, mentions, tasks with owners and due dates, check-in replies, notifications, and Studio outputs such as summaries, mind maps, slide decks, infographics and audio overviews.'],
        ['People you invite or share with', 'When you invite someone by email or email them a note, we use their email address to send that one message.'],
        ['Early access list', 'Your email address, whether you asked for product news, which page you signed up on, and when.'],
        ['Website analytics', 'The public website uses Google Analytics to count visits and see which pages are read. It sets cookies and records details such as pages viewed, approximate location, device and browser.'],
        ['Technical data', 'Our hosting provider keeps standard server logs (such as IP address, time and the page requested) to keep the service running and secure. We briefly hold IP addresses in memory to stop sign-up forms from being abused.'],
      ],
    },
    {
      id: 'use', h: 'How we use it',
      list: [
        ['To run the app', 'Sign you in, save your work, show shared notes to the people in a space, and send notifications and check-ins.'],
        ['To make Studio outputs', 'Send the notes you choose to an AI provider and save the result in your space.'],
        ['To send emails you asked for', 'Invites, shared notes, and early access emails. Product news only if you ticked the box.'],
        ['To keep it safe and working', 'Find and fix errors, prevent abuse, and understand which parts of the website are useful.'],
      ],
      p2: ['We do not sell your personal data. We do not use your notes for advertising. We do not use your notes to train our own AI models.'],
    },
    {
      id: 'ai', h: 'The Studio and AI providers',
      p: [
        'Studio tools only run when you use them, and only on the notes in the scope you pick. Those notes are sent to the provider below, which returns the output. The output is saved in your space so others in the space can see it.',
      ],
      list: [
        ['Google Gemini', 'Summaries, note briefs, mind maps, audio overviews, and the voice narration for slide decks.'],
        ['Anthropic Claude', 'Answers to questions (Ask), infographics, and the writing of slide decks.'],
      ],
      p2: ['Each provider handles that data under its own API terms and privacy policy. Studio answers come only from your notes, but AI can still make mistakes, so check anything important.'],
    },
    {
      id: 'share', h: 'Who can see your work',
      list: [
        ['Private spaces', 'Only you.'],
        ['Shared spaces', 'Everyone who has joined the space, according to their role (admin, editor or viewer). Authors can lock a note so only they can edit it.'],
        ['People you email', 'Anyone you send a note to receives its full text by email, even without an account.'],
      ],
      p2: ['Access is enforced by the database itself, not just by the app screens.'],
    },
    {
      id: 'providers', h: 'Services that help us run GroveStudio',
      p: ['We use a small number of providers. They process data on our behalf and only for these purposes.'],
      list: [
        ['Supabase', 'Database and sign-in. Stores accounts and everything you create.'],
        ['Vercel', 'Hosting for the website, the app and its server functions.'],
        ['Google', 'Sign-in with Google, Google Analytics on the website, and Gemini for Studio tools.'],
        ['Anthropic', 'Claude for Studio tools.'],
        ['Our email provider', 'Sends invites, shared notes and early access emails.'],
      ],
      p2: ['These providers may store or process data in countries other than yours, including the United States. Where the law requires it, we rely on the safeguards they offer for international transfers. We may also share data if the law requires us to, or to protect people from harm.'],
    },
    {
      id: 'storage', h: 'Cookies and browser storage',
      list: [
        ['Sign-in', 'Your session is kept in your browser so you stay signed in.'],
        ['Preferences', 'Your theme, whether panels are open, a guest name, and a join code you are in the middle of using are kept in your browser’s local storage. They never leave your device.'],
        ['Analytics', 'Google Analytics sets cookies on the public website. You can block them in your browser settings or with a browser extension, and the app will still work.'],
      ],
    },
    {
      id: 'keep', h: 'How long we keep it',
      list: [
        ['Your work', 'Until you delete it, or until you ask us to delete your account.'],
        ['Guest sessions', 'A guest session lives in one browser. If you clear it, you lose access to that guest account. Sign in with Google to keep your spaces.'],
        ['Early access list', 'Until you ask to be removed.'],
        ['Logs and analytics', 'For the periods set by our hosting and analytics providers.'],
      ],
    },
    {
      id: 'rights', h: 'Your choices and rights',
      p: [`You can ask us to show you the personal data we hold about you, correct it, delete it, or give you a copy. You can also object to how we use it or ask us to limit it. To do any of this, ${contact}. We will answer within 30 days. Depending on where you live, you may also complain to your local data protection authority.`],
      list: [
        ['Product news', 'Reply to any of those emails to stop them.'],
        ['Notes and spaces', 'You can delete notes you wrote. Admins can manage their spaces.'],
      ],
    },
    {
      id: 'security', h: 'Security',
      p: ['Data travels over encrypted connections. Access to notes is checked by the database for every request, using your own sign-in, so a person can only read what they are allowed to. No system is perfectly secure, so please use a strong Google account and tell us straight away if you notice anything wrong.'],
    },
    {
      id: 'children', h: 'Children',
      p: ['GroveStudio is built for work and is not meant for children under 16. We do not knowingly collect data from them. If you think a child has used it, contact us and we will delete their data.'],
    },
    {
      id: 'changes', h: 'Changes to this note',
      p: ['If we change how we use your data, we will update this page and the date at the top. For important changes we will also tell signed-in users in the app or by email.'],
    },
    {
      id: 'contact', h: 'Contact',
      p: [`Questions about privacy? ${contact[0].toUpperCase() + contact.slice(1)}.`],
    },
  ],
};

export const TERMS = {
  title: 'Terms of use',
  lead: 'The rules for using GroveStudio. By using the website or the app, you agree to them.',
  short: [
    'You own what you write. We only use it to run the service for you.',
    'Use GroveStudio lawfully and respect the people you work with.',
    'GroveStudio is in early access: features can change, and it is free while it is.',
    'AI outputs can be wrong. Check anything important.',
  ],
  sections: [
    {
      id: 'agree', h: 'Agreeing to these terms',
      p: ['These terms are between you and the team that runs GroveStudio. If you use GroveStudio for a company or team, you confirm you are allowed to accept these terms for it. If you do not agree, please do not use GroveStudio. Our Privacy note explains how we handle personal data and is part of these terms.'],
    },
    {
      id: 'service', h: 'What GroveStudio is',
      p: ['GroveStudio lets teams write notes together in shared or private spaces, turn notes into summaries, mind maps, slide decks, infographics and audio overviews, ask questions about their notes, assign tasks on a board, and follow up with check-ins, notifications and a personal dashboard.'],
    },
    {
      id: 'early', h: 'Early access',
      list: [
        ['Free for now', 'GroveStudio is free while it is in early access. If we ever introduce paid plans, we will tell you before anything changes, and you will not be charged without agreeing first.'],
        ['Things will change', 'We are still building. We may add, change or remove features, and the service may sometimes be unavailable.'],
        ['The early access list', 'Joining the list means we email you when new features open. It does not guarantee any particular feature or date.'],
      ],
    },
    {
      id: 'accounts', h: 'Your account',
      list: [
        ['Signing in', 'You can sign in with Google or as a guest. Guest accounts live in one browser and can be lost if that browser’s data is cleared.'],
        ['Be accurate', 'Use your real name or a name your team will recognise. Do not pretend to be someone else.'],
        ['Keep it safe', 'You are responsible for activity on your account. Tell us straight away if you think someone else is using it.'],
        ['Age', 'You must be at least 16 to use GroveStudio.'],
      ],
    },
    {
      id: 'content', h: 'Your content',
      p: ['You keep all rights to the notes, comments, tasks and other content you create. You give us permission to store, copy, process and display that content only as needed to run GroveStudio for you and the people you share it with, including sending selected notes to our AI providers when you use the Studio. This permission ends when the content is deleted, except for copies we must keep by law or that remain for a short time in backups.'],
      p2: ['You are responsible for what you add. Only add content you have the right to use, and only share other people’s personal information when you are allowed to.'],
    },
    {
      id: 'sharing', h: 'Spaces, roles and sharing',
      list: [
        ['Shared spaces', 'Anyone who joins a shared space can see its shared notes, according to the role the admin gives them.'],
        ['Join codes', 'Treat a space’s six-character code like a key. Anyone who has it can ask to join.'],
        ['Email', 'When you email a note, the person receives its full text. Make sure you are allowed to share it.'],
        ['Admins', 'Space admins decide who is in the space and what they can do. We are not responsible for how admins or members use content shared with them.'],
      ],
    },
    {
      id: 'rules', h: 'Acceptable use',
      p: ['Please do not use GroveStudio to:'],
      bullets: [
        'break the law or help anyone else break it;',
        'harass, threaten, discriminate against or harm anyone;',
        'upload content you do not have the right to share, or that infringes someone’s intellectual property or privacy;',
        'send spam or unwanted invites;',
        'upload malware, or try to break, overload, probe or get around the security of the service;',
        'access spaces, notes or accounts you were not invited to;',
        'scrape the service or use it to build a competing product;',
        'use the Studio to create content that is illegal, deceptive, or meant to harm people.',
      ],
      p2: ['We may remove content or suspend accounts that break these rules, and we will tell you when we can.'],
    },
    {
      id: 'ai', h: 'AI outputs',
      p: ['Studio outputs are made by AI from your notes. They can be incomplete or wrong, even when they cite a source note. Review them before you rely on them, share them, or make decisions with them. You are responsible for how you use outputs. Our AI providers’ own usage rules also apply to what is sent to them.'],
    },
    {
      id: 'ours', h: 'Our service and brand',
      p: ['GroveStudio, its design, code, logo and name belong to us. These terms do not give you any right to use them except to use the service as intended. If you send us feedback or ideas, we may use them without owing you anything.'],
    },
    {
      id: 'ending', h: 'Ending your use',
      p: [`You can stop using GroveStudio at any time. To delete your account and its content, ${contact}. We may suspend or end access if you break these terms, if the law requires it, or if we stop offering the service. Where we can, we will give you notice and time to copy your notes first.`],
    },
    {
      id: 'warranty', h: 'No guarantees',
      p: ['GroveStudio is provided "as is" and "as available", especially while it is in early access. To the extent the law allows, we make no promises that it will be uninterrupted, error free or fit for a particular purpose, and we are not responsible for the accuracy of AI outputs. Keep your own copies of anything important.'],
    },
    {
      id: 'liability', h: 'Limits on our liability',
      p: ['To the extent the law allows, we are not liable for indirect or consequential losses, such as lost profits, lost data or lost business, and our total liability for any claim about GroveStudio is limited to the amount you paid us in the 12 months before the claim (which is zero while the service is free). Nothing in these terms limits liability that cannot be limited by law, or your rights as a consumer.'],
    },
    {
      id: 'changes', h: 'Changes to these terms',
      p: ['We may update these terms as GroveStudio grows. We will change the date at the top, and for important changes we will tell signed-in users in the app or by email. If you keep using GroveStudio after a change, you accept the new terms.'],
    },
    {
      id: 'contact', h: 'Contact',
      p: [`Questions about these terms? ${contact[0].toUpperCase() + contact.slice(1)}.`],
    },
  ],
};

// Flatten a document to plain text blocks for prerendering and llms.txt.
export function legalHtml(doc, esc) {
  const li = (it) => (Array.isArray(it) ? `<li><b>${esc(it[0])}.</b> ${esc(it[1])}</li>` : `<li>${esc(it)}</li>`);
  return `<h1>${esc(doc.title)}</h1><p>Last updated ${esc(UPDATED)}. ${esc(doc.lead)}</p><h2>In short</h2><ul>${doc.short.map(li).join('')}</ul>`
    + doc.sections.map((s) => `<h2>${esc(s.h)}</h2>${(s.p || []).map((t) => `<p>${esc(t)}</p>`).join('')}`
      + `${s.list ? `<ul>${s.list.map(li).join('')}</ul>` : ''}${s.bullets ? `<ul>${s.bullets.map(li).join('')}</ul>` : ''}`
      + `${(s.p2 || []).map((t) => `<p>${esc(t)}</p>`).join('')}`).join('');
}
