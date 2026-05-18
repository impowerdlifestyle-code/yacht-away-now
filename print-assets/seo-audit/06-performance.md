# Yacht Away Now — Core Web Vitals Audit

**MEASUREMENT NOTE:** Static analysis only — PSI API and outbound curl were blocked in the sandbox. Run `curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://www.yachtawaynow.com/&strategy=mobile&category=performance"` from a host with network access for actual CrUX numbers, or check Search Console > Core Web Vitals for 75th-percentile field data.

## Predicted Vitals (lab estimate from source analysis)

| Page | Device | LCP (est) | INP (est) | CLS (est) |
|---|---|---|---|---|
| `/` homepage | Mobile | **1.6–2.2s GOOD** | <150ms GOOD | <0.05 GOOD |
| `/` homepage | Desktop | **1.0–1.4s GOOD** | <100ms GOOD | <0.05 GOOD |
| `/sunset-cruise-st-petersburg` | Mobile | **2.4–3.2s NEEDS IMPROVEMENT** | <150ms GOOD | <0.05 GOOD |
| `/sunset-cruise-st-petersburg` | Desktop | **1.5–2.0s GOOD** | <100ms GOOD | <0.05 GOOD |

## Findings

### [HIGH] Sunset LP missing LCP image preload
`/sunset-cruise-st-petersburg.html:189` marks `charter-img_1180.jpg` (337KB JPG / 65KB WebP) as `fetchpriority="high"` but there is **no `<link rel="preload">`** for it in the head. Discovery happens only after CSS parses. Homepage does preload its hero correctly (`index.html:27`). This is the most likely real regression vs. the homepage.

**Fix:** add to head of sunset LP (and audit all 30+ charter LPs):
```html
<link rel="preload" as="image" type="image/webp" href="/images/charter-img_1180.webp" fetchpriority="high">
```
Also wrap the LCP `<img>` in `<picture>` like the homepage hero so WebP actually wins. Currently line 188-189 only has a `<source>` sibling — that pattern works but the preload above must match the resolved source.

### [MEDIUM] Hero IMG fallback is 226KB JPG
`yacht-turquoise-hero.jpg` is 226KB at 1600w. WebP variants (45KB/85KB/124KB) are great. If a browser supports WebP (>96% of traffic), no issue. But CrUX may pick up Safari iOS edge cases. Consider AVIF for an additional ~25-35% reduction on the hero only — biggest LCP lever.

### [MEDIUM] Parallax scroll handler may regress INP
`app.js` `initParallax()` writes `style.transform` on every scroll event. Although `passive:true`, the layout/paint cost on low-end mobile can stretch INP. Wrap in `requestAnimationFrame` with a throttle flag — easy 30-50ms saving on mid-tier Android.

### [LOW] Oversized source JPGs sitting on disk
20+ images >200KB exist in `/images/` (largest: `yacht-rear-angle-full.jpg` 601KB, `yacht-sandbar-full.jpg` 591KB, `yacht-stern.jpg` 582KB). HTML correctly references the **WebP** versions everywhere; the `-full.jpg` files appear to be unreferenced source files. Verify they aren't shipped, and delete from the deploy if so — they bloat the Vercel build only, not the page.

### [LOW] All 13 non-LCP homepage images correctly `loading="lazy"`
Confirmed. Gallery and experience-card images all lazy-load. CLS protected by explicit `width`/`height` attributes on every img. Sunset LP has 4 lazy images, also explicit dimensions.

### [LOW] Third-party scripts
- **GA4** (`G-QTEXZD81XN`) — delayed 1500ms post-`load`. Excellent. No impact on LCP/INP.
- **No GTM, Stripe, IG embed, Hotjar, or Meta pixel** on either page.
- **Chat widget** injected at DOMContentLoaded + 5000ms (`app.js`). Large innerHTML insert — fine for LCP but worth measuring INP if user interacts with chat icon. `/api/chat` is a Vercel function call — own-server, no third-party RTT.
- **Google Calendar webhook** (`script.google.com/macros/...`) — only fires on form submit, no idle impact.

### [INFO] CLS protection looks complete
- Hero `<img>` has `width="1024" height="576"`.
- All gallery/exp-card images have explicit dimensions.
- Fonts use `font-display:swap` with all 4 preloaded — minimal FOUT shift.
- No ads, no late-injected hero content.

## Top 3 Performance Levers (priority order)

1. **Add LCP image preload to all charter landing pages** (highest-impact, ~30-min job). Currently only `index.html` has it. Likely cuts mobile LCP on LPs by 400-900ms.
2. **Generate AVIF variants of the hero** + add a third `<source type="image/avif">` to the picture element. Cuts hero bytes 25-35%, helps mobile-cellular LCP at the margin.
3. **rAF-throttle the parallax handler** in `app.js initParallax()`. Pre-emptive INP defense for mid-tier Android.

## Files Referenced
- `/Users/ciaranwentz/yacht-away-now/index.html` (lines 24-28, 318-320, 885-887)
- `/Users/ciaranwentz/yacht-away-now/sunset-cruise-st-petersburg.html` (lines 24-29, 187-189, 595-597)
- `/Users/ciaranwentz/yacht-away-now/app.js` (parallax handler, GA loader)
