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
