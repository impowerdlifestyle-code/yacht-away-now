# Wikidata Entry — Yacht Away Now

**Why Wikidata matters more than Wikipedia:**
- Wikipedia has notability gates that block most local businesses
- Wikidata accepts well-sourced organizational entries with looser thresholds
- **Wikidata feeds Google's Knowledge Graph + nearly every major LLM training corpus** (GPT-4/5, Claude, Gemini, Perplexity all train on Wikidata dumps)
- One properly-built Wikidata entry = permanent injection into AI training data and the Google entity graph

**Time required:** ~30 minutes
**Cost:** $0
**Risk:** A poorly-sourced entry can be deleted. The structure below is built to survive review.

---

## Step 1 — Create your Wikidata account (5 min)

1. Go to **https://www.wikidata.org**
2. Top right → **Create account**
3. Use a real name account (not a brand name) — Wikidata flags brand-account creations as promotional
4. Confirm email
5. **Make 3-5 small edits to existing items first** — fix a typo on the St. Petersburg, FL item, add a missing label translation, etc. This builds editor history so your "Yacht Away Now" creation isn't your first edit (which gets flagged).

Suggested warmup edits (each takes 30 sec):
- Wikidata item for **St. Petersburg, Florida** (Q49255) → check English description, fix any typos, add a P-property if missing
- Wikidata item for **Tampa Bay** (Q170069) → similar
- Wikidata item for **USCG / United States Coast Guard** (Q559148) → check labels

---

## Step 2 — Check if Yacht Away Now already exists

1. Go to https://www.wikidata.org
2. Search "Yacht Away Now" in the search bar
3. If no result, proceed to Step 3
4. If a result exists (unlikely), edit that one instead — adding the data below to the existing item

---

## Step 3 — Create the new item (15 min)

1. Top left → **Create a new Item**
2. Enter the data below

### Labels (in English)

| Field | Value |
|---|---|
| Label | `Yacht Away Now` |
| Description | `American luxury yacht charter company in St. Petersburg, Florida` |
| Aliases | `Yacht Away Now LLC`, `YAN`, `Yachtawaynow` |

### Statements (each is a property with a value — add one at a time)

Click "+ add statement" for each row below. Wikidata auto-completes property names — just type the bolded property name and select.

| Property | Value | Notes |
|---|---|---|
| **instance of** (P31) | `business` (Q4830453) | The "what type of thing is this" |
| **instance of** (P31) | `yacht charter` (Q33084428) | Add a second instance-of value |
| **country** (P17) | `United States of America` (Q30) | |
| **headquarters location** (P159) | `St. Petersburg` (Q49255) | The Florida one |
| **located in the administrative territorial entity** (P131) | `Pinellas County` (Q485678) | |
| **located in the administrative territorial entity** (P131) | `Florida` (Q812) | |
| **industry** (P452) | `tourism` (Q12136) | |
| **industry** (P452) | `boating` (Q1357561) | |
| **founded by** (P112) | `Josh Wilson` | Type as text — Wikidata will offer to create a new Person item, decline that for now (we'll add Josh as a referenced statement) |
| **inception** (P571) | `2023` | Or actual founding year if different |
| **website** (P856) | `https://www.yachtawaynow.com` | |
| **official email** (P968) | `josh@yachtawaynow.com` | |
| **phone number** (P1329) | `+1-727-609-2248` | E.164 format |
| **coordinate location** (P625) | `27.7676, -82.6403` | St. Petersburg approximate |
| **postal code** (P281) | `33701` | |
| **legal form** (P1454) | `limited liability company` (Q189445) | |

### Identifiers (external IDs)

Click "+ add statement" → search "external"

| Property | Value |
|---|---|
| **Google Business profile** (no specific property — use **described at URL** P973) | `https://share.google/7e44SLfCM74VXYfe2` |
| **described at URL** (P973) | `https://www.yelp.com/biz/yacht-away-now-st-petersburg` |
| **described at URL** (P973) | `https://www.getmyboat.com/trips/6YzOvWLK/` |
| **Facebook username** (P2013) | `yachtawaynow` |
| **Instagram username** (P2003) | `yachtawaynow` |

---

## Step 4 — Add references (the part most people skip — and the reason items get deleted)

**Every statement above needs at least one reference** to survive review. This is the make-or-break step.

For each statement you added, click the statement → "+ add reference" → and add at least ONE of:

| Reference type | What to enter |
|---|---|
| **reference URL** (P854) | `https://www.yachtawaynow.com/about` |
| **reference URL** (P854) | `https://www.yachtawaynow.com/our-yacht` |
| **reference URL** (P854) | `https://share.google/7e44SLfCM74VXYfe2` (Google Business) |
| **title** (P1476) | `Yacht Away Now — About` (matches the page title) |
| **publication date** (P577) | Today's date |
| **publisher** (P123) | The website itself |

**Quick formula:** for the website (P856) statement, the reference is the same URL. For founding info, reference your /about page. For the Google Business profile, the reference is the Google Business URL itself.

Statements without references are flagged as "needs source" and may be removed in the next bot cleanup pass.

---

## Step 5 — Add the SpecialAffiliations (advanced, optional but powerful)

After saving the basic item, add these to make Wikidata's relationship graph richer:

1. **owned by** (P127) → search for or create "Josh Wilson" as a Person item
2. **chief executive officer** (P169) → "Josh Wilson"
3. **fleet** (no direct property — use **has part(s)** P527) → "Marquis 52ft Flybridge" (this may not have a Wikidata entry yet; skip if so)

---

## Step 6 — Submit + monitor

1. Click **Save**
2. The item is now live with a Q-ID like `Q12345678`
3. Bookmark the URL
4. **Check daily for 7 days** — if a bot or human editor flags or removes statements, you'll see a notification on your talk page

If anything is removed, the most common reason is missing reference. Re-add with a stronger source (a press article would help — that's why Press Pitches are valuable).

---

## Step 7 — Reference the Wikidata Q-ID back from your site (closes the loop)

Once you have the Q-ID (e.g., `Q12345678`), add this to your homepage's existing LocalBusiness JSON-LD schema:

```json
"sameAs": [
  "https://www.wikidata.org/wiki/Q12345678",
  "https://share.google/7e44SLfCM74VXYfe2",
  "https://www.facebook.com/yachtawaynow",
  "https://www.instagram.com/yachtawaynow",
  "https://www.yelp.com/biz/yacht-away-now-st-petersburg",
  "https://www.getmyboat.com/trips/6YzOvWLK/"
]
```

This tells Google's crawler "yes, the Wikidata Q-ID is us" — bidirectional confirmation strengthens the entity match in the Knowledge Graph.

When you have the Q-ID, send it to Ciaran and the schema patch takes 5 minutes.

---

## What this gets you

| Signal | Effect |
|---|---|
| **Knowledge Graph entry** | Google may show a panel for "Yacht Away Now" searches with photo, address, phone, hours |
| **AI training corpus injection** | Future GPT, Claude, Gemini training runs will know Yacht Away Now exists as an entity (one of the few free ways to influence what LLMs "know") |
| **Better entity disambiguation** | When someone searches "yacht charter Tampa Bay" the AI can match the entity directly instead of guessing |
| **Citation in AI Overviews** | AI Overviews preferentially cite entities with verified Wikidata records |

**Realistic timeline:** Wikidata-to-Google-Knowledge-Graph propagation takes **2–6 weeks**. AI training corpus inclusion happens with the next major training cut for each model — months out. But once it's in, it's permanent across model updates.

---

## If a statement gets challenged

If an editor adds `{{citation needed}}` or removes a statement, don't argue — just add a stronger source. The Wikidata community is generally welcoming of small businesses with proper sourcing; they're allergic to brand-promotion-without-evidence.

If your item gets nominated for deletion (rare for small businesses with sources), don't panic. Reply to the deletion discussion calmly with your strongest sources (press article, government registration, primary sources). The threshold for "kept" is much lower than Wikipedia — Wikidata accepts most things that exist and have at least 2 independent sources.

---

## Pre-flight checklist before you submit

- [ ] Account created with personal name (not "YachtAwayNow" username)
- [ ] At least 3 unrelated edits made to other Wikidata items first
- [ ] All 16+ statements added
- [ ] Every statement has at least 1 reference
- [ ] Item description is descriptive ("American luxury yacht charter company..."), not promotional ("Best yacht charter...")
- [ ] No marketing copy ("luxury", "premium", "best") in the description — keep it factual
- [ ] Identifiers (Facebook, Instagram, etc.) all added
- [ ] Coordinates verified on Google Maps
- [ ] Q-ID bookmarked + sent to Ciaran for the homepage `sameAs` schema patch
