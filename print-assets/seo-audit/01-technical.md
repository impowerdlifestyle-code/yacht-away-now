# Technical SEO Audit — yachtawaynow.com

**Technical score: 92/100.** Built like a well-optimized static marketing site should be — strict security headers, comprehensive AI-crawler stance, inlined critical CSS, preloaded hero image, deferred GA, full responsive coverage, six JSON-LD schema blocks. No critical SEO issue and nothing blocking indexing or rankings. All findings are polish.

## Score breakdown by category

| # | Category | Status | Score |
|---|---|---|---|
| 1 | Crawlability | Pass | 10/10 |
| 2 | Indexability | Pass (1 minor) | 9/10 |
| 3 | Security & HTTPS | Pass | 10/10 |
| 4 | URL structure & redirects | Pass | 9/10 |
| 5 | Mobile optimization | Pass | 10/10 |
| 6 | Core Web Vitals signals | Pass (1 medium) | 9/10 |
| 7 | Structured data presence | Pass (1 invalid) | 8/10 |
| 8 | JavaScript rendering | Pass | 10/10 |
| 9 | AI crawler & sitemap hygiene | Pass (1 gap) | 9/10 |

## Top 5 findings (priority ranked)

1. **[High] Homepage BreadcrumbList is invalid — single item.** `index.html:201-209` declares a `BreadcrumbList` with one `ListItem` (Home). Google requires 2+ items; a malformed list can cause breadcrumb rich-result suppression. Fix: delete the block entirely from `index.html` — the homepage has no breadcrumb trail. Keep `BreadcrumbList` on inner pages only. 30-second edit.

2. **[Medium] Sitemap missing `/sms-terms` + robots.txt should disallow more tool paths.** `sms-terms.html` exists and is footer-linked but absent from `sitemap.xml`. Add it. Separately, `/contracts`, `/affiliate-signup`, `/send-confirmation`, `/send-welcome` should be added to `Disallow` in `robots.txt` to mirror the existing `/contract` and `/affiliate-*` blocks. 5-minute edit.

3. **[Medium] Hero image width/height mismatch with srcset.** `index.html:320` sets `width="1024" height="576"` on the LCP `<img>`, but the preload + srcset go up to 1600w. Aspect ratio is fine (16:9, no CLS), but the dimension hint is below the real source. Change to `width="1600" height="900"`. Lighthouse-cleanliness fix only.

4. **[Medium] Homepage canonical + og:url omit the trailing slash.** `index.html:8` and `:13` declare `https://www.yachtawaynow.com` (no `/`). Browsers normalize, so this isn't breaking anything, but emit it explicitly: `https://www.yachtawaynow.com/`. Cosmetic.

5. **[Low] Verify production redirects are single-hop.** `vercel.json` rules look correct (apex→www and trailing→non-trailing both 308 in one hop), but a curl-based confirmation against `yachtawaynow.com`, `yachtawaynow.com/`, and `yachtawaynow.com/yacht-charter-tampa/` would close the loop.

**Estimated total fix time: ~15 minutes.** Deploy on Vercel takes another 30 seconds.

---

## Full audit

### 1. Crawlability — Pass
- `User-agent: *` → `Allow: /` with surgical disallows for `/contract`, `/competitive-analysis`, `/affiliate-dashboard`, `/affiliate-portal`. Correct.
- `Sitemap:` directive present: `https://www.yachtawaynow.com/sitemap.xml`.
- No `noindex` meta on `index.html`. No `X-Robots-Tag` header in `vercel.json` — implicit "index, follow."
- robots.txt asset deploys at root.

### 2. Indexability — Pass (1 medium)
- Canonical on homepage: `<link rel="canonical" href="https://www.yachtawaynow.com">` (`index.html:8`). `cleanUrls:true` + `trailingSlash:false` enforces non-trailing.
- Inner page canonicals self-reference clean URLs.
- No hreflang — correct for single-language US-only local biz; do not add.
- **Medium:** canonical and `og:url` should explicitly include trailing slash for the homepage.

### 3. Security & HTTPS — Pass
All site-wide via `vercel.json:41-77`:
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()`
- Tight CSP — `default-src 'self'`, allowlisted scripts (GA, GTM, Stripe), `frame-ancestors 'none'`, `base-uri 'self'`.
- No mixed content. CSP `'unsafe-inline'` for `script-src` is acceptable for the static site (required by inline GA bootstrap at `index.html:886-888`).

### 4. URL structure & redirects — Pass (1 low)
- `cleanUrls:true`, `trailingSlash:false`.
- Apex→www and trailing→non-trailing both 308 in a single hop (per `vercel.json:14-31`).
- Legacy 301s in place: `/yacht-rental-tampa` → `/yacht-charter-tampa`, etc.
- 302s for `/ta`, `/tripadvisor`, `/yelp` (UTM-tagged review-link rewrites) — correct as temporary.
- URLs kebab-cased, keyword-aligned.

### 5. Mobile — Pass
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">` — accessibility-respecting (no `user-scalable=no`).
- Breakpoints at 1024/768/480/380px.
- Mobile hamburger 48×48 (WCAG-compliant).
- Form inputs `font-size:16px` on mobile (prevents iOS zoom).
- `prefers-reduced-motion` honored.
- `tel:` and `mailto:` links throughout.

### 6. Core Web Vitals signals — Pass (1 medium)
LCP: hero preloaded with `imagesrcset` + responsive `imagesizes`, `fetchpriority="high"`, WebP-first. `<picture>` 800/1200/1600w + JPG fallback. Critical above-fold CSS inlined; `style.css` async-loaded. Fonts preloaded `crossorigin`, `font-display:swap`. Static HTML — zero SSR/hydration cost.

CLS: hero `<img>` has explicit `width`/`height` (reserves 16:9 space). All gallery images have dimensions.

INP: `app.js` is `defer`. GA tag loads 1500ms after `window.load`.

**Medium:** hero `<img>` `width="1024" height="576"` doesn't match the 1600w preload source. Same aspect ratio, no CLS, but bump to `1600×900` for correctness.

### 7. Structured data — Pass (1 invalid)
Six JSON-LD blocks present on `index.html`:

| Schema | Line | Status |
|---|---|---|
| `BoatCharter` + `LocalBusiness` | 48 | Rich: address, geo, hours, areaServed, aggregateRating 5.0/104, 3 inline reviews, 3 offers, 7 sameAs, founder |
| `WebPage` + `SpeakableSpecification` | 180 | Present (voice-search optimized) |
| `WebSite` | 192 | Present |
| `BreadcrumbList` | 203 | **Invalid — 1 item only** |
| `Vehicle` (52ft Marquis Flybridge) | 213 | Present, rich, links via `@id` |
| `FAQPage` (5 Q&A) | 241 | Present |

Deep schema validation handled by `seo-schema` sub-skill (see 03-schema.md).

**High:** BreadcrumbList on homepage has 1 item. Google requires 2+. Remove the block entirely or build a real 2+ item list. Recommend removal.

### 8. JavaScript rendering — Pass
- All critical content (H1, body copy, prices, reviews, FAQ, NAP, JSON-LD) lives in static HTML.
- `app.js` is `defer`, only progressive enhancement.
- Zero CSR/hydration/Suspense risk.

### 9. AI crawlers + sitemap — Pass (1 medium)
- **Allow:** GPTBot, OAI-SearchBot, ChatGPT-User, Google-Extended, PerplexityBot, Perplexity-User, ClaudeBot, anthropic-ai, Applebot, Applebot-Extended, Amazonbot, Meta-ExternalAgent, Meta-ExternalFetcher, DuckAssistBot, Bytespider, Timesbot.
- **Block:** CCBot, cohere-ai, Diffbot.
- `llms.txt` present at root.
- Sitemap (47 URLs, 247 lines) XML-valid, namespace declared, image extension included.

**Medium:** missing `/sms-terms` from sitemap. Also: `/contracts`, `/affiliate-signup`, `/send-confirmation`, `/send-welcome` exist but aren't disallowed in `robots.txt`.

### Recommended implementation order
1. `index.html`: remove BreadcrumbList block (lines 201–209). Bump LocalBusiness `dateModified`.
2. `index.html`: add trailing slash to canonical (line 8) + og:url (line 13). Change hero `<img>` (line 320) to `width="1600" height="900"`.
3. `robots.txt`: add `Disallow:` lines for `/affiliate-signup`, `/contracts`, `/send-confirmation`, `/send-welcome`.
4. `sitemap.xml`: add `/sms-terms` entry.
5. Deploy. Verify with `curl -IL https://yachtawaynow.com/`.
