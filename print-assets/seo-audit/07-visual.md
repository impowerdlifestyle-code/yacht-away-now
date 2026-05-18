# Yacht Away Now — Visual / Mobile Rendering Audit

**Method:** headless Chrome screenshots at mobile (390×844, iPhone 14) and desktop (1280×720) viewports for the homepage and `/sunset-cruise-st-petersburg`. Captures saved to `/tmp/yan-seo-visual/`.

## Findings

### [HIGH] Mobile horizontal overflow on charter LP hero
On `/sunset-cruise-st-petersburg` at 390px width:
- The H1 "Private Sunset Cruise **St. Petersburg**" gets clipped — the gold italic *St. Petersburg* portion is wider than the viewport and runs off the right edge ("St. Petersb..." visible).
- The 3-line intro paragraph ("Watch the Gulf Coast sky turn gold, amber, and... from the flybridge of a 52ft Marquis — the... unforgettable private sunset cruise in Tamp...") is similarly clipped, all three lines hitting the right edge.

Most likely cause: the stylized italic location span is an inline-block or `white-space: nowrap` and doesn't break across lines on narrow viewports. Likely affects **all 12 charter LPs** that use the same headline pattern (`/bachelorette-party-yacht-charter`, `/birthday-yacht-charter`, `/anniversary-cruise-tampa-bay`, `/wedding-yacht-charter`, `/corporate-yacht-charter`, `/family-yacht-charter`, `/dolphin-cruise-st-petersburg`, `/sandbar-boat-trip-tampa-bay`, `/fireworks-boat-charter-tampa-bay`, `/egmont-key-boat-charter`, `/shell-key-boat-trip`, `/bahamas-yacht-charter`).

**Fix:** in the LP hero CSS, allow the italic-location span to wrap (`white-space: normal`) and reduce H1 font-size at the `≤480px` breakpoint. Verify the body copy container has `overflow-wrap: break-word` and the parent isn't constraining width above viewport.

### [MEDIUM] No primary CTA above the fold on charter LPs (mobile)
On the same `/sunset-cruise-st-petersburg` mobile capture, the visible above-the-fold sequence is: logo → breadcrumb → overline → truncated H1 → truncated paragraph → yacht image. **No phone, no "Book Today" pill is visible above the fold.** The homepage puts those CTAs directly under the hero — the LPs don't. Mobile-first browsers scroll past 600+ pixels of content before hitting a conversion path.

**Fix:** Add a compact CTA row (Call + Book Today) immediately after the H1 on each charter LP, hidden ≥768px if it duplicates the desktop CTA below.

### [LOW] Hero overline truncation on homepage mobile
The hero overline "PRIVATE YACHT CHARTERS · GULF COAST FLORIDA" is rendered with wide letter-spacing and truncates to "...GULF COAST FL..." at 390px. Not a functional problem but a polish issue. Either shorten ("PRIVATE YACHT CHARTERS · GULF COAST") or reduce letter-spacing on the `≤480px` breakpoint.

### [LOW] Mobile stat strip last value clipped on homepage
The "52ft · 3 · 104 · 60..." stat row clips the final stat (likely "600 mi range"). Same fix as above — tighten letter-spacing or stack the row vertically at 390px.

---

## Positives (no action needed)

- **[POSITIVE] Homepage mobile above-the-fold conversion path is strong.** Two prominent CTAs visible: gold "BOOK TODAY" pill and "Call (727) 609-2248". USCG trust badge + "5.0★ from 104 Google" reviews surfaced immediately.
- **[POSITIVE] Logo + wordmark legible at all viewports.** Gold-on-navy contrast strong on both mobile and desktop.
- **[POSITIVE] Breadcrumbs render cleanly on charter LP mobile** ("Home / Sunset Cruise St. Petersburg").
- **[POSITIVE] Desktop layouts (1280×720) are polished.** Top nav, hero, CTAs, gold accent rules all sized correctly. No layout breakage.
- **[POSITIVE] Tap targets visually adequate** on mobile nav, hero CTAs, and the persistent "Call" pill. Hamburger appears 48px-square as stated in CSS.
- **[POSITIVE] Persistent chat widget bottom-right** does not occlude critical content on either viewport.

---

## Top 3 visual fixes (priority order)

1. **Fix charter LP hero overflow on mobile** — let the italic location span wrap, downscale H1 at ≤480px, ensure body copy doesn't clip. Single CSS edit, applies to 12 pages.
2. **Add an above-the-fold CTA row to every charter LP on mobile** — call button + book today pill, immediately after H1.
3. **Tighten letter-spacing on homepage overline + stat strip at ≤480px** — kills the two minor clip-at-right issues.

## Files referenced
- `/tmp/yan-seo-visual/home-mobile.png`, `home-desktop.png`, `sunset-mobile.png`, `sunset-desktop.png`
- Site source likely needs CSS edits in: `/Users/ciaranwentz/yacht-away-now/style.css` (charter LP hero rules + homepage hero `@media (max-width: 480px)` block)
