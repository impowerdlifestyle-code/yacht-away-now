# SEO Audit — Yacht Away Now

**Domain:** https://www.yachtawaynow.com
**Audit date:** 2026-05-15
**Business:** Luxury yacht charter, St. Petersburg / Tampa Bay, FL · Solo founder, USCG Master 100-Ton captain · 52ft Marquis Flybridge flagship · 104 verified Google reviews · Wikidata Q139701526

---

## SEO Health Score: **88 / 100**

| Dimension | Weight | Score | Weighted |
|---|---:|---:|---:|
| Technical SEO | 22% | 92 | 20.2 |
| Content Quality / E-E-A-T | 23% | 86 | 19.8 |
| On-Page SEO | 20% | 88 | 17.6 |
| Schema / Structured Data | 10% | 88 | 8.8 |
| Performance (CWV — lab est.) | 10% | 85 | 8.5 |
| AI Search Readiness (GEO) | 10% | 88 | 8.8 |
| Images | 5% | 85 | 4.3 |
| **Composite** | **100%** | — | **88.0** |

**Verdict:** Yacht Away Now is genuinely top-quartile for a Tampa Bay charter operator. Schema depth is unusual (BoatCharter + LocalBusiness + Vehicle + Person/USCG-credentialed + FAQPage + Speakable), llms.txt + llms-pricing.txt are best-in-class, AI-crawler stance is comprehensive, security headers + redirects are tight. The findings below are gap-closing optimizations — there is **no critical blocker**.

---

## Top 5 Quick Wins (under 1 hour total)

| # | Fix | Priority | Effort | Impact |
|---|---|---|---|---|
| 1 | Change `$300` → `$400` on `index.html:546` (pricing contradiction) | HIGH | 30 sec | LLMs stop down-weighting the homepage; all platforms |
| 2 | Remove invalid 1-item `BreadcrumbList` from `index.html:201-209` | HIGH | 1 min | Stops Google suppressing breadcrumb rich results sitewide |
| 3 | Add 3 missing URLs to `sitemap.xml` (`/sms-terms`, `/private-boat-charter-tampa-bay`, `/blog/how-much-does-a-yacht-charter-cost`) | MEDIUM | 2 min | Recovers indexable pages |
| 4 | Add `<link rel="preload">` for the LCP image on `/sunset-cruise-st-petersburg` (and template across all 12 charter LPs) | HIGH | 15 min | 400-900ms mobile LCP improvement on LPs |
| 5 | Fix charter LP mobile hero overflow — let the italic location span wrap, scale H1 down at ≤480px | HIGH | 15 min | Restores legibility on 12 pages where "St. Petersburg" currently clips at 390px |

---

## Findings by Priority

### CRITICAL — none

The site has no indexing-blockers, no penalty risks, no fundamental misconfiguration.

### HIGH (fix within 1 week)

1. **Pricing contradiction.** `index.html:546` says *"starting at $300 per hour"* — every other surface (hero, schema, llms-pricing.txt, FAQ, pricing page) says **$400/hr**. LLMs detecting contradictions either pick the cheaper number or down-weight trust. *(GEO)*
2. **Charter LP mobile hero overflow.** "Private Sunset Cruise *St. Petersburg*" + intro paragraph clip the right edge at 390px width. Italic location span is non-wrapping; affects all 12 charter LPs. *(Visual)*
3. **Homepage BreadcrumbList is invalid (1 item).** Remove the block; Google requires 2+ items and a malformed list can suppress sitewide breadcrumb rich results. *(Technical / Schema)*
4. **Charter LPs missing LCP image preload.** Homepage has it; `/sunset-cruise-st-petersburg` and likely all 12 LPs don't. Likely 400-900ms mobile LCP regression. *(Performance)*
5. **No insurance / liability disclosure.** Material trust gap for corporate event + wedding buyers. Add a short paragraph on `/our-yacht` and `/contact`. *(Content / E-E-A-T)*

### MEDIUM (fix within 1 month)

6. **No YouTube channel, no VideoObject schema, no `sameAs` link.** Strongest correlate for ChatGPT citations. *(GEO)*
7. **No Wikipedia article.** Wikidata Q139701526 is linked (good), but Wikipedia is the canonical entity source LLMs read first. Draft a notability-compliant stub via Articles for Creation. *(GEO)*
8. **No primary CTA above the fold on charter LP mobile.** Homepage has BOOK TODAY + Call visible; LPs don't. Add a compact CTA row directly under the H1. *(Visual / Conversion)*
9. **Deposit/cancellation policy conflict.** `/contact` advertises a $1,000 refundable deposit; `/faq` schema says 50% deposit + 72-hour rule. Pick one canonical version. *(Content / Trust)*
10. **Add Organization schema block** to homepage (`#organization` `@id`, full sameAs incl. Wikidata, subOrganization → `#business`). Distinct from operational LocalBusiness — Google KG + AI engines treat them differently. *(Schema)*
11. **Add TouristTrip schema** to 12 charter LPs (use `BoatTrip` for `/bahamas-yacht-charter`). Major rich-result opportunity. *(Schema)*
12. **Hurricane-season policy + FL-specific expertise.** "Any charter within 72 hours of a named storm is refunded or rescheduled at no charge — Captain Josh tracks NHC advisories." Closes seasonal conversion friction. *(Content)*
13. **No Reddit footprint.** #2 input to ChatGPT for local-service queries. Surface 3-5 authentic mentions in r/StPetersburgFL, r/tampa, r/bachelorette, r/yachting. *(GEO)*
14. **Hero `<img>` dimension mismatch + canonical missing trailing slash.** `index.html:320` `width="1024" height="576"` → `1600x900`; `index.html:8,13` add trailing slash. *(Technical)*

### LOW (backlog)

15. Robots.txt: add `Disallow:` for `/affiliate-signup`, `/contracts`, `/send-confirmation`, `/send-welcome`. *(Technical)*
16. Sitemap: image-sitemap coverage gaps on 10+ charter LPs. *(Sitemap)*
17. Generate AVIF variants of hero; cuts hero bytes 25-35%. *(Performance)*
18. rAF-throttle parallax scroll handler in `app.js`. Pre-emptive INP defense. *(Performance)*
19. Visible "Last updated: May 2026" line on `/pricing`, `/our-yacht`, `/faq` for Perplexity citation preference. *(GEO)*
20. Explicit `User-agent: Bingbot` Allow stanza in robots.txt; add LinkedIn to LocalBusiness `sameAs`. *(GEO)*
21. Expand homepage review array from 3 to 6 with explicit `publisher: { name: "Google" }`. *(Schema)*
22. Replace inline `LocalBusiness` blocks on `/contact`, `/pricing` Offer sellers, charter LPs with `@id` references to `#business`. *(Schema)*
23. Captain Josh on-vessel action photography. Posed `/team` portrait is the only captain photo. *(Content / E-E-A-T)*
24. Visible author byline + Person schema on every `/blog/*` post. *(Content)*
25. Bahamas content depth — CBP ROAM, TRIP/cruising permit, Gulf Stream weather windows. *(Content)*
26. Homepage overline + stat strip letter-spacing too wide at ≤480px (cosmetic clip). *(Visual)*
27. Charter LP body description risk: 18+ niche category pages — confirm body content is genuinely differentiated per city before adding more. *(Content / Programmatic)*

---

## Recommended Implementation Order

### Sprint 1 (this week, ~2 hours)
1. Fix `$300` → `$400` on homepage. *(30 sec)*
2. Remove invalid `BreadcrumbList` block from homepage. *(1 min)*
3. Add 3 missing URLs to `sitemap.xml` + `Disallow` lines to robots.txt. *(5 min)*
4. Bump hero `<img>` dimensions; add trailing slash to canonical + og:url. *(5 min)*
5. Add `<link rel="preload">` for LCP image to all 12 charter LP heads. *(20 min)*
6. CSS fix for charter LP hero mobile overflow + scaled H1 at ≤480px. *(20 min)*
7. Add primary CTA row above the fold on charter LP mobile. *(20 min)*
8. Add insurance/liability + hurricane-season disclosure on `/our-yacht` + `/contact`. *(20 min)*
9. Reconcile deposit/cancellation policy across `/contact` + `/faq` + schema. *(15 min)*
10. Deploy & verify with PSI. *(10 min)*

### Sprint 2 (within 30 days, ~6 hours)
11. Add Organization JSON-LD block to homepage. *(30 min)*
12. Add TouristTrip schema to 12 charter LPs (BoatTrip for Bahamas). *(2 hr templated)*
13. Expand homepage Reviews from 3 to 6 with publisher attribution. *(30 min)*
14. Visible "Last updated" timestamps on pricing/our-yacht/faq. *(15 min)*
15. Bingbot Allow stanza + LinkedIn `sameAs`. *(5 min)*
16. Replace inline `LocalBusiness` with `@id` references across affected pages. *(45 min)*
17. Generate AVIF hero variants + add `<source type="image/avif">`. *(45 min)*
18. rAF-throttle the parallax handler. *(15 min)*
19. Captain Josh on-vessel photo shoot during a real charter. *(half day, off-script)*

### Sprint 3 (within 90 days, ongoing)
20. **YouTube channel + 3-5 short videos** (vessel tour, sunset cruise b-roll, Captain Josh intro). Embed on `/our-yacht`, `/sunset-cruise-st-petersburg`, homepage. Add VideoObject schema. Add YouTube URL to `sameAs`. *(highest single GEO lever)*
21. **Wikipedia stub** via Articles for Creation. *(2-3 hrs)*
22. **Reddit organic mentions** in r/StPetersburgFL, r/tampa, r/bachelorette, r/yachting. *(ongoing)*
23. **First-party charter recap blog posts** ("How we ran a 12-person bachelorette to Shell Key and Egmont in May 2026"). Pair with visible byline + Person schema. *(content engine)*
24. **Bahamas topical authority deepening** — CBP ROAM, TRIP permit, Gulf Stream windows. *(1 long-form page)*
25. Audit the 18+ niche charter category pages for templating-vs-uniqueness; differentiate or consolidate. *(half day)*

---

## Per-Dimension Detail

| Sub-report | Score | Key takeaway |
|---|---|---|
| [01-technical.md](01-technical.md) | 92/100 | One real fix (invalid BreadcrumbList); everything else is polish. |
| [02-content.md](02-content.md) | 86/100 · AI: 91 | Strong operator-grade voice; needs insurance disclosure + policy reconciliation. |
| [03-schema.md](03-schema.md) | 88/100 | Add Organization block + TouristTrip per LP; everything else is `@id` cleanup. |
| [04-geo.md](04-geo.md) | 88/100 | Pricing contradiction is the lever; YouTube + Wikipedia are the multipliers. |
| [05-sitemap.md](05-sitemap.md) | — | 3 indexable URLs missing; no dead links. |
| [06-performance.md](06-performance.md) | 85/100 (lab est.) | Charter LPs missing the LCP preload that the homepage has. |
| [07-visual.md](07-visual.md) | — | Charter LP mobile hero overflows — affects 12 pages. |
