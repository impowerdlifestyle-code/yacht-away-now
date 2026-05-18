# Sitemap Audit — yachtawaynow.com

## Validation Summary

**XML structure**: PASS. Valid XML 1.0, correct `urlset` + image namespace declared. 48 `<url>` entries. Well under the 50k limit.

**Deprecated tags**: PASS. No `<priority>` or `<changefreq>` present (good — Google ignores both).

**lastmod**: PASS. ISO-8601 format. Mostly `2026-05-08` with a few `2026-05-11` updates. Reasonable.

**Image sitemap**: Declared namespace is used on 11 URLs. Inconsistent coverage (see below).

---

## Findings (severity-tagged)

### HIGH — Missing from sitemap (file exists, indexable, not listed)
- `/sms-terms` — **confirmed missing**, file at `/Users/ciaranwentz/yacht-away-now/sms-terms.html`. Required for Telnyx A2P compliance trail; should be crawlable.
- `/private-boat-charter-tampa-bay` — file exists at root, not in sitemap.
- `/blog/how-much-does-a-yacht-charter-cost` — file exists in `/blog/`, not in sitemap.

### MEDIUM — Sitemap entry has no matching file (potential 404)
- None detected. Every `<loc>` in the sitemap maps to an existing `.html` file in the repo. PASS.

### MEDIUM — Image sitemap coverage gaps
Pages with rich imagery on-page but no `<image:image>` entry:
- `/bachelorette-party-yacht-charter` has image, but siblings `/birthday-yacht-charter`, `/corporate-yacht-charter`, `/wedding-yacht-charter`, `/family-yacht-charter`, `/new-years-eve-yacht-charter`, `/fourth-of-july-yacht-charter`, `/gasparilla-yacht-charter`, `/bahamas-yacht-charter`, `/dolphin-cruise-st-petersburg`, `/anniversary-cruise-tampa-bay`, `/party-boat-st-petersburg`, `/shell-key-boat-trip`, `/egmont-key-boat-charter` — none surface images.
- Three city pages reuse the same `yacht-turquoise-hero.jpg` — fine, but consider unique images per location for stronger image SEO.

### LOW — Coverage anomalies / quality-gate flags
- 18 niche "category"/use-case pages + 5 city pages = 23 location/category-style pages. Under the WARNING threshold (30), no hard stop. Defer thin-content judgement to content agent — but flag visually templated cluster: `/yacht-charter-{treasure-island,indian-rocks-beach,clearwater,sarasota,tampa,st-petersburg}` — confirm body content is genuinely differentiated per city before adding more.
- Robots.txt correctly disallows `/contract`, `/competitive-analysis`, `/affiliate-*` — none appear in sitemap. PASS.

### INFO — No removals needed
- No legacy/obsolete URLs detected in sitemap. No 301 candidates from this audit.

---

## Recommended Diff

**ADD these `<url>` entries** (insert before closing `</urlset>`):

```xml
<url>
  <loc>https://www.yachtawaynow.com/sms-terms</loc>
  <lastmod>2026-05-15</lastmod>
</url>
<url>
  <loc>https://www.yachtawaynow.com/private-boat-charter-tampa-bay</loc>
  <lastmod>2026-05-15</lastmod>
  <image:image>
    <image:loc>https://www.yachtawaynow.com/images/yacht-turquoise-hero.jpg</image:loc>
    <image:caption>Private boat charter Tampa Bay</image:caption>
  </image:image>
</url>
<url>
  <loc>https://www.yachtawaynow.com/blog/how-much-does-a-yacht-charter-cost</loc>
  <lastmod>2026-05-15</lastmod>
</url>
```

**UPDATE** (optional, image enrichment): add `<image:image>` blocks to the high-intent category pages listed above using their existing hero images in `/images/`.

**REMOVE**: none.

**File touched**: `/Users/ciaranwentz/yacht-away-now/sitemap.xml`
