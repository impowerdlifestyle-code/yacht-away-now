# Yacht Away Now — Schema.org Audit

**Domain:** https://www.yachtawaynow.com
**Audit date:** 2026-05-15
**Wikidata entity:** Q139701526 — verified, already referenced in homepage `sameAs`.

## Executive summary

### Detected schemas (all JSON-LD; no microdata or RDFa)
**Homepage** (6 blocks): `["BoatCharter","LocalBusiness"]` with full address/geo/hours/aggregateRating/3 reviews/3 Offers/sameAs (Wikidata Q139701526 already included); `WebPage`+Speakable; `WebSite`; `BreadcrumbList`; `Vehicle` for the 52ft Marquis (`#yacht-marquis-52`); `FAQPage` (5 Q&As).

**Inner pages sampled**: `/team` has `AboutPage`→`Person` for Captain Josh Wilson with USCG credentials and `worksFor.sameAs` cluster — strong E-E-A-T. `/our-yacht` has `Product`+`AggregateOffer`+6 specs. `/pricing` has `WebPage`+`ItemList` of 3 Offers + FAQPage. `/contact` has `ContactPage`→`LocalBusiness`. `/about` has `Service`+provider ref. Charter LPs (e.g. `/sunset-cruise-st-petersburg`) have `Service`+inline `LocalBusiness`+3 Offers+FAQPage. Coverage is far above local-charter baseline.

### Validation issues (no critical errors)
- **Info**: multiple pages re-declare `LocalBusiness` inline instead of pointing to `#business` via `@id` — `/contact`, `/pricing` Offer sellers, all 12 charter LPs. Fix: replace with `{ "@id": "https://www.yachtawaynow.com/#business" }`.
- **Info**: `/pricing` Offers missing `priceValidUntil` (homepage Offers have it).
- **Info**: `/our-yacht` Product missing `provider` link to `#business` and no `aggregateRating`.
- **Flagged**: homepage `FAQPage` and 2 others — Google FAQ rich results restricted to gov/healthcare since Aug 2023. LEAVE existing blocks (still valuable for AI citation); do NOT add new ones to commercial pages.
- **Info**: Reviews lack explicit `publisher: { name: "Google" }` attribution.
- **Info**: homepage single-item BreadcrumbList is trivial.

### Prioritized new schemas to add
1. **`Organization` block on homepage** with `#organization` `@id`, full sameAs including Wikidata Q139701526, `subOrganization` link to `#business`, founder pointer to Josh's Person `@id`, `contactPoint`, `knowsAbout`, `areaServed`. Distinct entity from operational LocalBusiness — Google KG + AI engines treat them differently.
2. **`TouristTrip` per charter LP** (12 pages) with `itinerary`, `provider` `@id` to `#business`, `offers`, `aggregateRating`. Use **`BoatTrip`** instead for `/bahamas-yacht-charter`.
3. **Expanded `Review` array (6 reviews)** with explicit `publisher: { name: "Google" }` and stable per-review `@id`s; tighten `aggregateRating` to include `worstRating` and `ratingCount`.
4. `provider` and `aggregateRating` added to `/our-yacht` Product.
5. `offers` + `aggregateRating` added to `/about` Service.
6. Deferred: `VideoObject` (when YouTube content ships).

**Quality-gate compliance:** no `HowTo`, no new `FAQPage` for commercial pages, no `SpecialAnnouncement`, no `Event` for recurring services.

---

## Ready-to-paste JSON-LD — top 3 missing items

### Item 1: `Organization` block — add to `index.html`

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.yachtawaynow.com/#organization",
  "name": "Yacht Away Now",
  "legalName": "Yacht Away Now",
  "url": "https://www.yachtawaynow.com",
  "logo": {
    "@type": "ImageObject",
    "url": "https://www.yachtawaynow.com/images/yacht-away-now-logo-large.png",
    "width": 512,
    "height": 512
  },
  "image": "https://www.yachtawaynow.com/images/yacht-turquoise-hero.jpg",
  "description": "Luxury private yacht charter company in St. Petersburg, Florida. Operates a 52ft Marquis Flybridge for sunset cruises, bachelorette parties, day charters, and multi-day Bahamas trips along Florida's Gulf Coast.",
  "foundingDate": "2024",
  "founder": {
    "@type": "Person",
    "@id": "https://www.yachtawaynow.com/team#captain-josh-wilson",
    "name": "Josh Wilson",
    "jobTitle": "Captain, Founder & Owner",
    "url": "https://www.yachtawaynow.com/team"
  },
  "contactPoint": [{
    "@type": "ContactPoint",
    "telephone": "+17276092248",
    "email": "josh@yachtawaynow.com",
    "contactType": "Reservations",
    "areaServed": ["US", "BS"],
    "availableLanguage": "English"
  }],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "38th Way S",
    "addressLocality": "St. Petersburg",
    "addressRegion": "FL",
    "postalCode": "33711",
    "addressCountry": "US"
  },
  "sameAs": [
    "https://www.wikidata.org/wiki/Q139701526",
    "https://www.facebook.com/yachtawaynow",
    "https://www.instagram.com/yachtawaynow",
    "https://share.google/7e44SLfCM74VXYfe2",
    "https://www.yelp.com/biz/yacht-away-now-st-petersburg",
    "https://www.tripadvisor.com/Attraction_Review-g34607-d34299444-Reviews-Yacht_Away_Now-St_Petersburg_Florida.html",
    "https://www.getmyboat.com/trips/6YzOvWLK/"
  ],
  "knowsAbout": [
    "Private yacht charters",
    "Sunset cruises in Tampa Bay",
    "Bachelorette yacht parties",
    "Bahamas yacht trips",
    "Florida Keys yacht charters",
    "Dolphin cruises in St. Petersburg",
    "Sandbar boat trips on the Gulf Coast"
  ],
  "areaServed": [
    { "@type": "City", "name": "St. Petersburg, FL" },
    { "@type": "City", "name": "Tampa, FL" },
    { "@type": "City", "name": "Clearwater, FL" },
    { "@type": "City", "name": "Sarasota, FL" },
    { "@type": "AdministrativeArea", "name": "Tampa Bay" },
    { "@type": "Country", "name": "Bahamas" }
  ],
  "subOrganization": {
    "@type": "LocalBusiness",
    "@id": "https://www.yachtawaynow.com/#business"
  }
}
```

### Item 2: `TouristTrip` template — apply per charter LP

```json
{
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "@id": "https://www.yachtawaynow.com/sunset-cruise-st-petersburg#trip",
  "name": "Sunset Yacht Cruise — St. Petersburg, FL",
  "description": "Private sunset cruise aboard a 52ft Marquis Flybridge yacht departing from St. Petersburg, FL. Cruise Tampa Bay, The Pier, and Boca Ciega Bay as the Gulf Coast sky lights up. Up to 13 guests, USCG-licensed captain, premium audio across 3 decks. 4-hour minimum.",
  "image": [
    "https://www.yachtawaynow.com/images/charter-img_1180.jpg",
    "https://www.yachtawaynow.com/images/yacht-turquoise-hero.jpg"
  ],
  "url": "https://www.yachtawaynow.com/sunset-cruise-st-petersburg",
  "touristType": ["Couples", "Anniversary celebrations", "Romantic getaways", "Birthday celebrations", "Small groups"],
  "itinerary": {
    "@type": "ItemList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "item": { "@type": "Place", "name": "St. Petersburg Marina (departure)" } },
      { "@type": "ListItem", "position": 2, "item": { "@type": "Place", "name": "The Pier, St. Petersburg" } },
      { "@type": "ListItem", "position": 3, "item": { "@type": "Place", "name": "Boca Ciega Bay" } },
      { "@type": "ListItem", "position": 4, "item": { "@type": "Place", "name": "Gulf of Mexico (sunset viewing)" } },
      { "@type": "ListItem", "position": 5, "item": { "@type": "Place", "name": "St. Petersburg Marina (return)" } }
    ]
  },
  "provider": { "@type": "LocalBusiness", "@id": "https://www.yachtawaynow.com/#business" },
  "offers": {
    "@type": "Offer",
    "name": "Sunset Cruise — Hourly Charter",
    "price": "400",
    "priceCurrency": "USD",
    "priceSpecification": {
      "@type": "UnitPriceSpecification",
      "price": "400",
      "priceCurrency": "USD",
      "unitText": "hour",
      "referenceQuantity": { "@type": "QuantitativeValue", "value": "4", "unitCode": "HUR" }
    },
    "availability": "https://schema.org/InStock",
    "priceValidUntil": "2026-12-31",
    "url": "https://www.yachtawaynow.com/contact",
    "seller": { "@id": "https://www.yachtawaynow.com/#business" }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "5",
    "bestRating": "5",
    "reviewCount": "104",
    "itemReviewed": { "@id": "https://www.yachtawaynow.com/#business" }
  }
}
```

Apply to: `/sunset-cruise-st-petersburg`, `/bachelorette-party-yacht-charter`, `/birthday-yacht-charter`, `/anniversary-cruise-tampa-bay`, `/corporate-yacht-charter`, `/wedding-yacht-charter`, `/family-yacht-charter`, `/dolphin-cruise-st-petersburg`, `/sandbar-boat-trip-tampa-bay`, `/fireworks-boat-charter-tampa-bay`, `/egmont-key-boat-charter`, `/shell-key-boat-trip`. For `/bahamas-yacht-charter` use `@type: "BoatTrip"`.

### Item 3: Expanded `Review` array + tightened `aggregateRating`

```json
"review": [
  { "@type": "Review", "@id": "https://www.yachtawaynow.com/#review-victoria-hendzel",
    "reviewRating": { "@type": "Rating", "ratingValue": "5", "bestRating": "5" },
    "author": { "@type": "Person", "name": "Victoria Hendzel" },
    "datePublished": "2025-12-30",
    "publisher": { "@type": "Organization", "name": "Google", "url": "https://www.google.com/maps" },
    "itemReviewed": { "@id": "https://www.yachtawaynow.com/#business" },
    "reviewBody": "I spent New Year's Eve and a birthday on this yacht, and I can say it's an absolutely unforgettable experience..." },
  { "@type": "Review", "@id": "https://www.yachtawaynow.com/#review-anna-nguyen", "...": "..." },
  { "@type": "Review", "@id": "https://www.yachtawaynow.com/#review-krystal-evans", "...": "..." },
  { "@type": "Review", "@id": "https://www.yachtawaynow.com/#review-peezill-sparks", "...": "..." },
  { "@type": "Review", "@id": "https://www.yachtawaynow.com/#review-whispy-brown", "...": "..." },
  { "@type": "Review", "@id": "https://www.yachtawaynow.com/#review-janet-welch", "...": "..." }
],
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "5.0",
  "bestRating": "5",
  "worstRating": "1",
  "reviewCount": "104",
  "ratingCount": "104"
}
```

(Truncated for brevity — full 6-review block available in the original audit; expand each with full reviewBody/datePublished/publisher.)

---

## Implementation order

1. **Homepage:** add Organization block (Item 1); expand reviews + tighten aggregateRating (Item 3).
2. **12 Charter LPs:** add TouristTrip (Item 2); use BoatTrip for Bahamas.
3. **Cross-cutting cleanup:** replace inline `LocalBusiness` with `@id` references on `/contact`, `/pricing` Offer sellers, charter LPs.
4. **`/our-yacht`:** add `provider` `@id`; consider `aggregateRating`.
5. **`/about`:** add `offers` + `aggregateRating`.
6. **Annual:** bump every `priceValidUntil` on Dec 1.
