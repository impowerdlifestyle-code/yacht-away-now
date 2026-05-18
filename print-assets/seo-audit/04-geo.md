# GEO Audit — yachtawaynow.com

Scope: source files on disk for the production site (mirror of what crawlers fetch — site is static HTML, fully SSR, no JS-gated content).

## GEO Readiness Score: 88 / 100

| Dimension | Weight | Score | Notes |
|---|---|---|---|
| Citability | 25% | 22/25 | Strong question-based H2s, direct first-sentence answers, llms-pricing.txt is exemplary. Minor: a couple of long-form pages have rambling intros. |
| Structural Readability | 20% | 19/20 | Clean H1/H2/H3, tables, FAQ structure, semantic HTML, fast SSR. |
| Multi-Modal | 15% | 11/15 | Strong WebP imagery with descriptive alt; missing video schema, no YouTube embeds, no audio/podcast surface. |
| Authority & Brand Signals | 20% | 18/20 | Wikidata Q139701526 linked via sameAs, USCG captain credentials, 104 reviews with named authors, founded date, Yelp/TripAdvisor/GetMyBoat. Weak: no Wikipedia article (Wikidata-only), Reddit/YouTube presence not visible from site. |
| Technical Accessibility | 20% | 18/20 | Robots.txt explicitly allows all major AI search bots, sitemap declared, SSR HTML, llms.txt + llms-pricing.txt. Minor: sitemap URL in robots.txt uses www subdomain but no apex/non-www reciprocal check visible. |

---

## 1. AI Crawler Accessibility — STATUS: EXCELLENT

`/Users/ciaranwentz/yacht-away-now/robots.txt`

Explicit Allow for the following AI search bots (citation-driving):
- GPTBot, OAI-SearchBot, ChatGPT-User
- ClaudeBot, anthropic-ai
- PerplexityBot, Perplexity-User
- Google-Extended
- Applebot, Applebot-Extended
- Amazonbot, Meta-ExternalAgent, Meta-ExternalFetcher
- DuckAssistBot, Bytespider, Timesbot

Explicit Disallow (training-only, intentional):
- CCBot, cohere-ai, Diffbot

Sitemap declared: `https://www.yachtawaynow.com/sitemap.xml`

Findings:
- **[INFO]** Bingbot, Googlebot, YouBot, ImagesiftBot, Omgili, FacebookBot are not explicitly listed — they fall under `User-agent: *` Allow which is correct, but listing Bingbot explicitly would help Bing Copilot signal confidence.
- **[LOW]** Sitemap is declared as `www.` only. If apex `yachtawaynow.com` is reachable, confirm it 301s to www so the sitemap is canonical.

## 2. llms.txt — STATUS: EXCELLENT, BEST-IN-CLASS

`/Users/ciaranwentz/yacht-away-now/llms.txt` and `/llms-pricing.txt`

Both are well-formed per the spec (H1 title, blockquote summary, sectioned with H2s, direct links). Specifically:
- H1 "Yacht Away Now" present
- Blockquote one-liner present
- Sections: Docs (with annotated link list), About, Key Facts, Services, Pricing, Contact, Team, Identifiers (Wikidata!), Reviews, Service Areas, FAQ, Optional/License
- llms-pricing.txt has a "Quick Answer" passage of exactly the right length (~80 words) for direct citation — this is textbook GEO.

Findings:
- **[INFO]** Add `/llms-full.txt` (concatenated full-content version) for crawlers that look for it.
- **[LOW]** Add an `llms-faq.txt` and `llms-yacht-specs.txt` mirroring the same pattern — narrow topical files outperform a single big file in some LLM retrieval flows.

## 3. Passage-Level Citability — STATUS: STRONG

Homepage (`index.html`) and FAQ contain self-contained extractable passages:

What works:
- Hero H1 includes the location pivot ("St. Petersburg, FL") and the vessel name directly.
- Section H2s are phrased as questions: *"What Kind of Yacht Does Yacht Away Now Operate?"*, *"How Much Does a Yacht Charter Cost in St. Petersburg FL?"*, *"Where Can You Charter a Yacht Near Tampa Bay?"* — exactly how LLMs query their retrieval store.
- Each H2 is followed by a direct, complete first sentence (40-60 words) carrying brand + fact + location. The Vessel section answer is ~130 words — inside the 134-167 optimal band.
- FAQ has 22 entries, each Q+A self-contained at ~30-80 words, all duplicated in both visible HTML and FAQPage JSON-LD.
- Pricing card values render as text in HTML (not images), so they're directly quotable: "$400/hr", "$2,000", "$5,000+".

Findings:
- **[MED — affects ChatGPT, Perplexity]** Pricing block on homepage subtitle says *"starting at $300 per hour"* (line 546) but the canonical price is $400/hr everywhere else (hero, schema, llms.txt, llms-pricing.txt). This contradiction will cause LLMs to either pick the lower number, hallucinate a range, or downgrade trust in the page. **Fix: change "$300" to "$400" in `index.html` line 546.**
- **[LOW — affects all]** Vessel description paragraph spans 3 stacked `<p>` tags. Some retrieval chunkers split on `</p>` and lose the run. Consider one consolidated 140-word paragraph that combines length-decks-capacity-engine-range in one shot.
- **[LOW — affects Perplexity]** Reviews are quoted with author names but no dates on the visible page (dates are only in JSON-LD). Perplexity prefers visible timestamps when citing testimonials.

## 4. Brand Mention & Entity Signals — STATUS: STRONG with one gap

What works:
- Wikidata Q139701526 is correctly linked in `sameAs` array of LocalBusiness schema (line 170 of index.html) — this is rare and a strong disambiguation signal for Google AIO and Bing Copilot.
- "Yacht Away Now" is used consistently in full as the brand name across visible HTML, schema, llms.txt, and meta tags. The decorative gold-on-white-on-gold spans (`<span>Away</span>`) preserve the readable text "Yacht Away Now" intact.
- Captain is named (Josh Wilson), titled (USCG Master 100-ton, 10+ years, CPR/AED), and surfaced in both the schema `founder` field and the llms.txt — strong E-E-A-T signal for AIO.
- Author byline on long-form pages (best-yacht-charters-tampa-bay-2026, yacht-charter-cost-tampa-bay) credits Captain Josh Wilson with Person schema. This is good.

Findings:
- **[HIGH — affects ChatGPT, Perplexity, Gemini]** No Wikipedia article. Wikidata-only entities get partial entity recognition but Wikipedia is the canonical fact source for LLMs. **Action: draft a notability-compliant stub (founded 2024, USCG-licensed operator, GetMyBoat-listed, 104 verified Google reviews, Wikidata Q139701526) and submit to Wikipedia Articles for Creation.** Borderline notable, but worth one attempt.
- **[HIGH — affects ChatGPT, Perplexity]** Reddit presence not detectable from on-site signals. Reddit is the #2 correlated source for ChatGPT citations. **Action: get 2-3 authentic mentions/reviews on r/StPetersburgFL, r/yachting, r/tampa, r/bachelorette.**
- **[HIGH — strongest correlation for AI citations]** YouTube. No video embeds, no VideoObject schema, no YouTube channel linked in sameAs. **Action: post 3-5 short walkthroughs (vessel tour, sunset cruise b-roll, captain intro) to a Yacht Away Now YouTube channel; embed them on `/our-yacht`, `/sunset-cruise-st-petersburg`, and homepage; add VideoObject schema.**
- **[LOW]** sameAs is missing LinkedIn (Captain Josh personal or company page) — good supplementary entity link for Bing Copilot which weights LinkedIn heavily.
- **[LOW]** TikTok listings aren't in sameAs; the bachelorette/birthday audience indexes there.

## 5. Platform-Specific Optimization

### Google AI Overviews — STRONG (8.5/10)
- LocalBusiness + BoatCharter dual-type, AggregateRating with reviewCount=104, Offer with priceValidUntil, geo coordinates, openingHoursSpecification — all present. AIO will pull this clean.
- Speakable specification declared (`.hero h1`, `.hero p`, `.price-card-amount`) — useful for Google Assistant.
- **[MED]** Some `priceValidUntil` values are "2026-12-31" — verify these get bumped annually or AIO will drop the offer when it expires.

### ChatGPT Search / OAI — STRONG (8/10)
- GPTBot + OAI-SearchBot + ChatGPT-User all Allowed.
- llms.txt is high-quality.
- **[HIGH]** Missing Reddit/YouTube reinforces ChatGPT preference for socially-validated brands.

### Perplexity — STRONG (8/10)
- PerplexityBot + Perplexity-User Allowed.
- Inline tables in pricing pages are Perplexity-friendly (it loves citable structured data).
- **[MED]** Perplexity prefers explicit "Last updated" timestamps in visible HTML; only the long-form pages have `datePublished`/`dateModified` in JSON-LD, not in visible HTML. Add a visible "Last updated: May 2026" line under H1 on `/pricing`, `/our-yacht`, `/faq`, and the top-funnel cost guides.

### Bing Copilot — MODERATE (7/10)
- Bingbot allowed via `*` wildcard but not named.
- **[MED]** Bing weighs LinkedIn presence and explicit Bingbot directive. Add explicit `User-agent: Bingbot` Allow stanza and a LinkedIn link in sameAs.
- Wikidata link helps Bing's Knowledge Graph.

### Gemini / Google-Extended — STRONG (8.5/10)
- Google-Extended explicitly Allowed. SSR HTML + clean schema.

## 6. Structured Q&A Coverage — EXCELLENT

The customer's top 10 questions are all answered in self-contained passages across `index.html`, `faq.html`, and `llms.txt`:

| Question | Covered? |
|---|---|
| How much? | Yes — 4 places, but inconsistent ($300 vs $400 issue) |
| Capacity? | Yes — 13 guests, multiple surfaces |
| What's included? | Yes — pricing cards + llms-pricing.txt |
| Captain credentials? | Yes — USCG Master 100-ton, Josh Wilson, 10+ yrs |
| Where do you depart? | Yes — 38th Way S, St. Petersburg, FL |
| BYOB / food? | Yes — FAQ + llms.txt |
| Bahamas? | Yes — 600mi range repeated |
| Weather/cancellation? | Yes — FAQ |
| Booking lead time? | Yes — 2-6 weeks |
| Largest vessel? | Yes — 52ft Marquis with "multiple yachts upon request" |

The "Marquis Flybridge charter" query is well-covered: vessel-specific Vehicle schema with `@id`, brand "Marquis Yachts", model "Marquis 52", seating 13, 1320hp, 600mi range — this is the single best Vehicle schema this auditor has seen on a charter site.

---

## TOP 5 PRIORITY FINDINGS

**1. [HIGH — Citability / All Platforms] Pricing contradiction on homepage.**
`/Users/ciaranwentz/yacht-away-now/index.html` line 546 says *"starting at $300 per hour"* but every other surface (hero, schema, llms-pricing.txt, FAQ, pricing page) says **$400/hr**. LLMs detecting contradictions either pick the cheaper number, hallucinate a range, or down-weight trust in the source. **Fix: change "$300" → "$400" (one-line edit, 30 seconds).** Affects: ChatGPT, Perplexity, Gemini, Google AIO.

**2. [HIGH — Authority / ChatGPT, Perplexity] No YouTube presence.**
YouTube has the single strongest correlation (~0.74) with ChatGPT citations of any brand signal. Yacht Away Now has zero VideoObject schema, no YouTube channel in sameAs, no embeds. **Action (1 week, ~$0):** create channel, upload 3-5 short videos (vessel walkthrough, sunset cruise b-roll, Captain Josh intro, bachelorette recap with consent), embed on `/our-yacht` and homepage, add VideoObject schema, add YouTube URL to LocalBusiness sameAs. Affects: ChatGPT (largest), Perplexity, Google AIO.

**3. [HIGH — Authority / All Platforms] No Wikipedia article.**
Wikidata Q139701526 is linked (good), but Wikipedia is the canonical entity source LLMs read first. Notability is borderline but defensible (founded 2024, 104 Google reviews, USCG-licensed Master 100-ton operator, GetMyBoat-listed, TripAdvisor-listed). **Action (2-3 hrs):** draft a neutral stub via Articles for Creation citing Tampa Bay Times / GetMyBoat / TripAdvisor / Yelp as third-party sources. Even rejection produces a draft page that LLMs sometimes ingest.

**4. [MED — ChatGPT / Perplexity / Bing] No Reddit footprint.**
Reddit is the #2 input to ChatGPT for local-service queries. **Action (2 weeks, organic):** reach out to recent satisfied guests to post reviews/recommendations in r/StPetersburgFL, r/tampa, r/bachelorette, r/yachting when relevant questions appear. Do not astroturf — surface organic mentions. Goal: 3-5 authentic mentions of "Yacht Away Now" in Reddit threads.

**5. [MED — Perplexity / Bing] Add visible "Last updated" timestamps and explicit Bingbot directive.**
Perplexity strongly prefers visible (not just schema) date stamps. **Action:** add a one-line "Last updated: May 2026" under H1 on `/pricing`, `/our-yacht`, `/faq`, and `/yacht-charter-cost-tampa-bay`. Add `User-agent: Bingbot\nAllow: /` stanza to `/Users/ciaranwentz/yacht-away-now/robots.txt`. Add LinkedIn URL to the LocalBusiness sameAs array. 15 minutes total. Affects: Perplexity, Bing Copilot, Google AIO confidence.
