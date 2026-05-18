/**
 * P0 Local SEO patch: inject Google Map embed + aggregateRating-mirror schema
 * on all destination + contact + index pages.
 *
 * Idempotent: guards with sentinel comments. Safe to re-run.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const MAP_SENTINEL = "<!-- yan-local-seo:map-embed -->";
const SCHEMA_SENTINEL = "<!-- yan-local-seo:rating-mirror -->";

const mapSection = `${MAP_SENTINEL}
<section class="map-section" style="padding:64px 0;background:#0a1628;border-top:1px solid rgba(78,205,196,0.08)">
  <div class="container" style="max-width:1200px;margin:0 auto;padding:0 24px">
    <p class="section-label" style="font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:0.2em;color:#c9a84c;margin-bottom:12px">Find Us</p>
    <h2 style="font-family:'Cormorant Garamond',serif;font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;line-height:1.2;margin-bottom:24px;color:#f5f0e8">Departing from <em style="font-style:italic;color:#c9a84c">St. Petersburg, FL</em></h2>
    <div style="border-radius:16px;overflow:hidden;border:1px solid rgba(78,205,196,0.12);box-shadow:0 12px 40px rgba(0,0,0,0.25)">
      <iframe
        src="https://maps.google.com/maps?q=Yacht+Away+Now+St+Petersburg+FL&t=&z=14&ie=UTF8&iwloc=&output=embed"
        width="100%" height="380"
        style="border:0;display:block"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        title="Yacht Away Now — St. Petersburg, FL"></iframe>
    </div>
    <p style="margin-top:20px;color:#8899aa;font-size:0.95rem;line-height:1.7">
      <strong style="color:#f5f0e8">Yacht Away Now</strong> · 38th Way S, St. Petersburg, FL 33711<br>
      <a href="tel:7276092248" style="color:#4ecdc4;text-decoration:none">(727) 609-2248</a> · <a href="https://share.google/7e44SLfCM74VXYfe2" target="_blank" rel="noopener" style="color:#4ecdc4;text-decoration:none">View on Google Maps &rarr;</a>
    </p>
  </div>
</section>
`;

const ratingMirrorScript = `${SCHEMA_SENTINEL}
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": ["BoatCharter","LocalBusiness"],
    "@id": "https://www.yachtawaynow.com/#business",
    "url": "https://www.yachtawaynow.com",
    "name": "Yacht Away Now",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "5",
      "bestRating": "5",
      "reviewCount": "104"
    }
  }
  </script>
`;

// Files that get both map + rating mirror
const cityFiles = [
  "yacht-charter-tampa.html",
  "yacht-charter-st-petersburg.html",
  "yacht-charter-clearwater.html",
  "yacht-charter-sarasota.html",
  "yacht-charter-treasure-island.html",
  "yacht-charter-indian-rocks-beach.html",
  "egmont-key-boat-charter.html",
];

// Files that get map only (homepage + contact already have full schema)
const mapOnlyFiles = ["contact.html", "index.html"];

function patchFile(filename, { addMap = true, addSchema = true } = {}) {
  const path = resolve(root, filename);
  let html = readFileSync(path, "utf8");
  const changes = [];

  if (addMap) {
    if (html.includes(MAP_SENTINEL)) {
      changes.push("map: already present");
    } else if (!html.includes("</main>")) {
      changes.push("map: NO </main> found — skipped");
    } else {
      html = html.replace("</main>", `${mapSection}\n</main>`);
      changes.push("map: inserted");
    }
  }

  if (addSchema) {
    if (html.includes(SCHEMA_SENTINEL)) {
      changes.push("schema: already present");
    } else if (!html.includes("</head>")) {
      changes.push("schema: NO </head> found — skipped");
    } else {
      html = html.replace("</head>", `${ratingMirrorScript}</head>`);
      changes.push("schema: inserted");
    }
  }

  writeFileSync(path, html);
  console.log(`${filename.padEnd(38)} ${changes.join(" | ")}`);
}

console.log("=== City pages (map + rating mirror) ===");
for (const f of cityFiles) patchFile(f, { addMap: true, addSchema: true });
console.log("\n=== Contact + index (map only) ===");
for (const f of mapOnlyFiles) patchFile(f, { addMap: true, addSchema: false });
