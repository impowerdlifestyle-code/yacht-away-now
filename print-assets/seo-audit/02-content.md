# Yacht Away Now — Content Quality & E-E-A-T Audit

## Overall Scorecard

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Content Quality (composite)** | **86 / 100** | Strong for a solo-operator site. Differentiated, well-structured, AI-ready. |
| Experience (E1) | 18 / 20 | First-person captain bio, real review snippets, vessel-specific details. Missing: on-vessel action photos of Josh, real itinerary case studies. |
| Expertise (E2) | 22 / 25 | USCG Master 100-Ton credential surfaced in JSON-LD + visible copy, deck-by-deck specs, transparent pricing math. Could deepen Bahamas/offshore planning expertise. |
| Authoritativeness (A) | 21 / 25 | Wikidata Q139701526, GBP, TripAdvisor, Yelp, GetMyBoat all linked. No press mentions, no industry associations cited. |
| Trustworthiness (T) | 25 / 30 | Clear NAP, real phone/email, 104 verified reviews, schema-rich. Gaps: no insurance/liability disclosure, conflicting deposit policy. |
| **AI Citation Readiness** | **91 / 100** | Excellent — FAQ schema, Speakable, structured offers, dual `BoatCharter+LocalBusiness`, `Person + hasCredential`. |

Scope audited: `/`, `/about`, `/contact`, `/our-yacht`, `/team`, `/pricing`, `/faq`, `/sunset-cruise-st-petersburg`, `/yacht-charter-st-petersburg`.

---

## E-E-A-T Findings (severity-tagged)

**Experience**
- [positive] `/team` page contains a 5-paragraph first-person bio from Captain Josh with specific operator detail ("swap to Egmont Key because the wind shifted")
- [positive] 104 verified Google reviews surfaced site-wide; 6 real review quotes embedded with names
- [positive] `/contact` "What Happens After You Book" 24hr→48hr→72hr→day-of timeline is operator-grade, not boilerplate
- [medium] No photos of Captain Josh on the vessel during a real charter (briefing guests, at the helm). Posed bow portrait is the only captain photo.
- [medium] No charter "case study" / trip-recap blog posts that prove real experience
- [low] Same 6 review cards reused on multiple pages — variety would help

**Expertise**
- [positive] USCG Master 100-Ton credential rendered in Person/hasCredential JSON-LD with `recognizedBy: United States Coast Guard`
- [positive] `/our-yacht` lists 12 distinct specs (beam, draft, fuel, water cap, engines)
- [positive] Pricing page contains the hourly-vs-weekend arithmetic in plain language — the kind of math only an operator would publish
- [medium] No FL-specific boating regs or guest-relevant rules (FWC, no-wake zones, Skyway anchor exclusion). One missed expertise moat.
- [medium] Bahamas content asserts 600-mi range but doesn't address CBP ROAM, TRIP/cruising permit, Gulf Stream weather windows
- [medium] License years/issuing sector not stated ("over a decade" — verifiable specifics would be stronger)

**Authoritativeness**
- [positive] `sameAs` graph: Wikidata, Google Maps share, Yelp, TripAdvisor, GetMyBoat, FB, IG — rare breadth for a solo operator
- [positive] Multiple stacked schema types: `BoatCharter + LocalBusiness`, `Vehicle`, `Product`, `Person`, `FAQPage`, `BreadcrumbList`, `WebPage + SpeakableSpecification`
- [medium] No press / "as featured in" coverage anywhere
- [medium] No industry trade-association memberships shown (PYBA, Chamber, etc.)
- [low] No outbound links to non-self authoritative sources (NOAA tide tables, USCG Sector St. Petersburg, FWC)

**Trustworthiness**
- [positive] NAP consistent on every audited page; map embeds on `/` and `/contact`
- [positive] Privacy/SMS/Terms in footer; SMS opt-in is 10DLC-compliant (STOP/HELP language, "consent not required to book")
- [positive] `/pricing` shows itemized rates including the 18-20% captain gratuity — competitors don't publish this
- [positive] `/contact` SLA card commits to "Live answer or 60-min callback" — published expectation = trust
- [high] **No insurance / liability disclosure anywhere on site.** Material gap for the corporate-event and wedding-charter buyer.
- [medium] Deposit/cancellation policy conflicts: `/contact` says $1,000 refundable deposit; `/faq` schema says 50% deposit + 72-hour rule
- [medium] No hurricane / tropical-storm policy stated, which matters for a June-November Florida operator
- [low] No HTTPS/PCI/payment-processor reassurance near the booking form

---

## Content Depth (page-by-page)

| Page | Approx. Body Words | Min Floor | Pass | Notes |
|------|------:|------:|:---:|------|
| `/` | ~1,250 | 500 | yes | Above minimum. Dense with proof, pricing, geo. |
| `/about` | ~1,050 | 500 | yes | Substantive founder story + values. |
| `/team` | ~750 | 500 | yes | Strongest single page on the site. |
| `/our-yacht` | ~900 | 400 | yes | Deep specs; would benefit from interior/floorplan visuals. |
| `/pricing` | ~1,400 | 800 | yes | Best-in-category for Tampa Bay charter market. |
| `/contact` | ~700 | 500 | yes | Post-booking timeline adds real depth. |
| `/faq` | ~1,200 | 800 | yes | 22 Q&A pairs with FAQPage schema. |
| `/sunset-cruise-st-petersburg` | ~900 | 800 | borderline-yes | Could strengthen with route map / specific timings by month. |
| `/yacht-charter-st-petersburg` | ~800 | 500-600 | yes | Strong local geo coverage. |

The 18+ niche charter pages (`/dolphin-cruise-st-petersburg`, `/yacht-charter-treasure-island`, `/family-yacht-charter`, etc.) were **not** audited individually — defer to the `seo-programmatic` skill, as templated repetition risk is real.

---

## Readability & Conversion

- Sentence length avg 16-22 words. Clean H1→H2→H3 hierarchy. Unique H1s. Scannable spec/price grids.
- Phone visible 4+ times per page; mobile-specific call button in hero; sticky nav CTA. Friction-free call path.
- Booking form is sensibly minimized (8 fields). SMS consent is opt-in.
- [medium] Form posts to `https://api.web3forms.com/submit` — per project memory, a Web3Forms→Resend migration is in flight (yan-dashboard Phase 1). Complete it for first-party delivery.
- [medium] No price floor visible on `/contact` above the form — adding "from $400/hr · weekends $2,000-$2,500" qualifies browsers earlier.

---

## AI Citation Readiness — 91/100

What's working:
- FAQPage schema answers exactly the queries LLMs route on ("How much does a yacht charter cost in St. Petersburg?", "Who is the captain on every charter?")
- `SpeakableSpecification` on `/`, `/about`, `/contact`, `/pricing`
- Dual `BoatCharter + LocalBusiness` + separate `Vehicle` entity for the yacht itself
- `Person + hasCredential` with `recognizedBy: United States Coast Guard`
- `llms.txt`, `llms-full.txt`, `llms-pricing.txt` present in repo

Tightenings (all low severity):
- Speakable `cssSelector` includes `.price-card-detail` but the markup has `<br>` mid-string — clean single-sentence versions would extract more reliably for voice
- Add an LLM-friendly answer block for "Can I do a yacht charter in St. Pete during hurricane season?" — currently unanswered

---

## Local Relevance — Strong

Specific local proper nouns surfaced across audited pages: St. Petersburg, Tampa, Tampa Bay, Clearwater, Sarasota, Treasure Island, Indian Rocks Beach, Pinellas, St. Pete Pier, Vinoy, Pass-a-Grille, Shell Key, Egmont Key, Fort De Soto, Caladesi Island, Sand Key, Skyway Bridge / Sunshine Skyway, Anclote Keys, Terra Ceia Bay, Apollo Beach, Manatee Viewing Center, Bayshore, Florida Keys, Bahamas, Bimini, Exumas, Nassau, Key West, Gasparilla, Pulaski WI (Marquis factory). More local detail than 90% of Tampa Bay competitors.

Single gap: explicit hurricane-season acknowledgement is missing.

---

## Captain Attribution — Strong

Captain Josh Wilson named in homepage JSON-LD (`founder`), `/team` Person schema, `/contact` timeline, and FAQ. Consistent. `/team` page is the strongest E-E-A-T asset on the site.

[medium] Blog posts (`/blog` directory exists with posts like "best-sunset-cruise-spots-tampa-bay") were not audited — strongly recommend every post show a visible byline "By Captain Josh Wilson · USCG Master 100-Ton · [date]" with author Person schema.

---

## AI-Generated Content Check (Sept 2025 QRG)

Does **not** trip low-quality AI flags. Voice is operator-grounded; pricing math is specific; review quotes are real; proper nouns are dense. The only risk surface is the 18+ niche charter category pages, where the spec grid and price card are reused verbatim — each needs at least one differentiating block. Defer to `seo-programmatic`.

---

## Top 5 Findings (Priority Ranked)

1. **[HIGH] Add insurance/liability + hurricane-season trust copy.** Single largest credibility gap. Two short paragraphs on `/our-yacht` and `/contact` ("Yacht Away Now is a fully insured commercial passenger vessel with $X million in liability coverage. Any charter within 72 hours of a named storm is refunded or rescheduled at no charge — Captain Josh tracks NHC advisories.") closes both the corporate/wedding-buyer trust gap and the seasonal-anxiety conversion friction in one move.

2. **[MEDIUM] Reconcile the deposit/cancellation policy.** `/contact` advertises a $1,000 refundable deposit; `/faq` JSON-LD asserts a 50% deposit + 72-hour rule. Surface conflict reads as inconsistent policy. Pick one canonical version, update both, and add the policy as a visible bullet above the booking form.

3. **[MEDIUM] Add Captain Josh on-vessel action photography + author bylines on blog posts.** Current `/team` portrait is posed. Real charter shots (briefing guests, at the helm, plotting an offshore route) are the single biggest Experience upgrade available. Pair with a visible "By Captain Josh Wilson · USCG Master 100-Ton · [date]" byline and Person schema on every blog post — multiplies E-E-A-T across the entire content engine, not just the money pages.

4. **[MEDIUM] Deepen Bahamas / multi-day topical authority.** `/bahamas-yacht-charter` (not audited but flagged) and `/our-yacht` mention the 600-mile range but skip what LLMs and serious buyers actually ask: CBP ROAM clearance, TRIP/cruising permit cost, Gulf Stream weather windows, dockage at Bimini/Nassau. One detailed section locks in topical authority for the highest-value charter type.

5. **[MEDIUM] Add 1-2 first-party charter recaps + surface price floor on `/contact`.** Real with-permission trip recaps ("How we ran a 12-person bachelorette to Shell Key and Egmont in May 2026") are the kind of Experience asset competitors cannot fake. Pair with a small "from $400/hr · weekends $2,000-$2,500" qualifier under the `/contact` H1 so price-sensitive browsers self-qualify before submitting the form.

**Composite score: 86/100. AI citation readiness: 91/100.** This is already top-quartile content for a Tampa Bay charter operator — the recommendations are gap-closing optimizations, not foundational fixes.
