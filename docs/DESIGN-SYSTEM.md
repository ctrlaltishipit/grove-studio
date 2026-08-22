# Grove Studio — design system


## A13 — the brand mark (amendment, 22 Aug 2026)

The system previously specified **no logo mark**: a text wordmark only, and no
gradients anywhere. That rule existed to stop decorative chrome accumulating in
a product whose credibility rests on looking factual. It is amended here, once,
for a specific reason: the product needs to be recognisable in a browser tab, an
app switcher and a pitch deck, and a wordmark alone is not.

**The mark** (`src/ds/Mark.tsx`, and `public/favicon.svg` byte-for-byte matching
it) is a sphere with a specular highlight and two eyes. Its gradient runs
`#5C7FB8 → #8E5DA0 → #C77D3E`, which are the **observer identity colours** —
the same hues the roster chips and the convergence-grid dots use to tell people
apart. The mark is therefore three independent observers blending into one
grove, not an arbitrary gradient.

**Rules that keep it from spreading:**

- The gradient is hard-coded, not tokenised. A brand mark is the one element
  that must render identically in both themes.
- It appears in exactly four places: the header lockup (22px), the login screen
  (72px), the avatar fallback on the home screen when a person has no Google
  photo (44px), and the favicon.
- It is decorative (`aria-hidden`) everywhere except the login screen, where it
  carries the accessible name "Grove Studio".
- **No other gradient enters the product.** §4.1's rule that the corroboration
  ladder is the only semantic colour scale is untouched: the mark carries no
  state, no count and no meaning beyond identity.
- The eyes never animate, blink or track the cursor. Capture Mode's stillness
  rule (§6.5) applies to the whole product, and a mascot that reacts to you is
  the opposite of a tool that does not influence what you think.

---

## A14 — The Studio shell

**What changed.** Every Studio screen used to re-render its own header and stack
its content in one narrow column. Moving between spaces meant losing your place,
and the app read as a sequence of documents rather than one workspace. A14 adds a
persistent frame around the Studio routes.

**The pieces.**

| Class | What it is |
|---|---|
| `.shell` / `.shell__side` / `.shell__main` / `.shell__inner` | The frame. A 248px sidebar and a scrolling content well. |
| `.navitem` (+ `__dot`, `__text`, `__count`) | One row of sidebar navigation. The dot is an observer identity colour; the count is that space's shared-note total. |
| `.pagehead` (+ `__title`) | Title, member chips and the join code on one line. Replaces the per-route header. |
| `.grid-spaces` / `.grid-notes` | Auto-filling card grids: spaces at 260px minimum, notes at 240px. |
| `.tile` (+ `__title`, `__meta`, `__body`, `__foot`, `--private`, `--shared`) | One space or one note. |
| `.tabs` / `.tabs__item` | The Shared / Private pair. |
| `.editor` (+ `__title`, `__body`, `__bar`) | The note surface: one quiet bar, then the writing. |
| `.gate` / `.gate__card` | Login. One centred card on a full-height ground. |

**Rules that keep it from spreading.**

- **No new colour.** The tile hairlines are `--corrob-1` (private) and
  `--corrob-3` (shared) — the existing ladder, used the way the finding cards
  already use it. The sidebar dots are the five observer identity colours. Not
  one hex is added.
- **No drawer.** Below 900px the sidebar becomes a horizontal strip above the
  content, never an overlay. §7's "no modals" rule covers navigation too: a
  drawer is a modal that has learned to slide.
- **The tabs are not a filter.** Shared and Private are two different sets of
  rows, separated by RLS before they reach the client. The UI cannot be
  persuaded to show you another member's private note, because the query never
  returns one. This is the independence invariant applied to Studio: the
  database *cannot*, `supabase.ts` *does not*, and the tab *will not*.
- **The editor bar holds five controls at most** — back, state, dictate, share,
  delete — and no control on it is destructive without a second confirmation
  rendered inline, never in a dialog.
- **Elevation stays at 0 and 1.** The tiles and the gate card are borders and
  background, not shadows.
- **The count in the sidebar is the only number that may draw the eye**, and it
  counts shared notes — never unread, never overdue, never a nag.

Capture Mode's stillness is untouched, solo honesty is untouched, the
independence invariant is untouched, and there is still no modal.
