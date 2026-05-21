#!/usr/bin/env python3
"""Inject geo + hasMap + areaServed into every Yacht Away Now LocalBusiness
JSON-LD block across location/service pages.

Skips a block if:
  - It already has `geo`
  - Its `name` does not contain "Yacht Away Now" AND its address.streetAddress
    is not "38th Way S" (i.e., describes a different entity)
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CANONICAL_ID = "https://www.yachtawaynow.com/#business"
GEO = {"@type": "GeoCoordinates", "latitude": 27.7232126, "longitude": -82.6831018}
HAS_MAP = "https://share.google/7e44SLfCM74VXYfe2"
PLACE_ID_IDENTIFIER = {
    "@type": "PropertyValue",
    "propertyID": "Google Place ID",
    "value": "ChIJ7za8P4sdw4gR8zIl0CuGgyk",
}
TELEPHONE = "+17276092248"
EMAIL = "josh@yachtawaynow.com"
PRICE_RANGE = "$$$"
IMAGE = "https://www.yachtawaynow.com/images/yacht-turquoise-hero.jpg"
LOGO = "https://www.yachtawaynow.com/images/yacht-away-now-logo-large.png"
ADDRESS = {
    "@type": "PostalAddress",
    "streetAddress": "38th Way S",
    "addressLocality": "St. Petersburg",
    "addressRegion": "FL",
    "postalCode": "33711",
    "addressCountry": "US",
}
DESCRIPTION = (
    "Luxury private yacht charters on Florida's Gulf Coast. 52ft Marquis "
    "Flybridge for sunset cruises, bachelorette parties, birthday celebrations, "
    "day charters, and Bahamas adventures. Up to 13 guests."
)
AGGREGATE_RATING = {
    "@type": "AggregateRating",
    "ratingValue": "5.0",
    "bestRating": "5",
    "worstRating": "1",
    "reviewCount": "107",
    "ratingCount": "107",
}
OPENING_HOURS = {
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    "opens": "06:00",
    "closes": "20:00",
}
AREA_SERVED = [
    {"@type": "City", "name": "St. Petersburg",
     "containedInPlace": {"@type": "State", "name": "Florida"}},
    {"@type": "City", "name": "Tampa",
     "containedInPlace": {"@type": "State", "name": "Florida"}},
    {"@type": "City", "name": "Clearwater",
     "containedInPlace": {"@type": "State", "name": "Florida"}},
    {"@type": "City", "name": "Sarasota",
     "containedInPlace": {"@type": "State", "name": "Florida"}},
]

# Map Pack-critical fields injected when absent. Order preserved by Python 3.7+
# dict insertion order; we re-emit each LB block with fields grouped logically.
FIELDS_TO_INJECT = [
    ("@id", CANONICAL_ID),
    ("description", DESCRIPTION),
    ("identifier", PLACE_ID_IDENTIFIER),
    ("telephone", TELEPHONE),
    ("email", EMAIL),
    ("address", ADDRESS),
    ("priceRange", PRICE_RANGE),
    ("image", IMAGE),
    ("logo", LOGO),
    ("geo", GEO),
    ("hasMap", HAS_MAP),
    ("areaServed", AREA_SERVED),
    ("openingHoursSpecification", OPENING_HOURS),
    ("aggregateRating", AGGREGATE_RATING),
]

TARGETS = [
    "contact.html",
    "yacht-charter-tampa.html",
    "yacht-charter-clearwater.html",
    "yacht-charter-st-petersburg.html",
    "yacht-charter-treasure-island.html",
    "yacht-charter-sarasota.html",
    "yacht-charter-indian-rocks-beach.html",
    "egmont-key-boat-charter.html",
    "shell-key-boat-trip.html",
    "sandbar-boat-trip-tampa-bay.html",
    "party-boat-st-petersburg.html",
    "private-boat-charter-tampa-bay.html",
    "dolphin-cruise-st-petersburg.html",
    "sunset-cruise-st-petersburg.html",
    "fireworks-boat-charter-tampa-bay.html",
    "bahamas-yacht-charter.html",
]

LD_BLOCK_RE = re.compile(
    r'(<script type="application/ld\+json">\s*)(.*?)(\s*</script>)',
    re.DOTALL,
)


def is_yan_business(obj: dict) -> bool:
    """Decide whether this LocalBusiness object describes Yacht Away Now."""
    name = (obj.get("name") or "").lower()
    if "yacht away now" in name:
        return True
    addr = obj.get("address") or {}
    if isinstance(addr, dict) and "38th way" in (addr.get("streetAddress") or "").lower():
        return True
    return False


def patch_object(obj):
    """Recursively walk a JSON-LD value and patch matching LocalBusiness dicts.
    Returns (new_obj, changed_count).
    """
    changed = 0
    if isinstance(obj, dict):
        t = obj.get("@type")
        is_lb = (t == "LocalBusiness" or (isinstance(t, list) and "LocalBusiness" in t))
        # Patch when it's the YAN business AND it's not a pure @id-only reference
        # (an @id-only ref has just @type and @id; we don't want to balloon those).
        is_ref_only = is_lb and set(obj.keys()) <= {"@type", "@id"}
        if is_lb and not is_ref_only and is_yan_business(obj):
            # Inject any missing Map Pack–critical fields
            for field, value in FIELDS_TO_INJECT:
                if field not in obj:
                    obj = {**obj, field: value}
                    changed += 1
        # Recurse into children
        out = {}
        for k, v in obj.items():
            new_v, c = patch_object(v)
            out[k] = new_v
            changed += c
        return out, changed
    if isinstance(obj, list):
        new_list = []
        for item in obj:
            new_item, c = patch_object(item)
            new_list.append(new_item)
            changed += c
        return new_list, changed
    return obj, changed


def patch_html(path: Path) -> int:
    html = path.read_text(encoding="utf-8")
    total_changed = 0

    def replace_block(match):
        nonlocal total_changed
        prefix, body, suffix = match.group(1), match.group(2), match.group(3)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            return match.group(0)
        new_data, changed = patch_object(data)
        if changed == 0:
            return match.group(0)
        total_changed += changed
        # Pretty-print, preserve 2-space indent to roughly match source style
        new_body = json.dumps(new_data, indent=2, ensure_ascii=False)
        return f"{prefix}{new_body}{suffix}"

    new_html = LD_BLOCK_RE.sub(replace_block, html)
    if total_changed:
        path.write_text(new_html, encoding="utf-8")
    return total_changed


def main():
    summary = []
    for name in TARGETS:
        p = ROOT / name
        if not p.exists():
            summary.append((name, "MISSING"))
            continue
        n = patch_html(p)
        summary.append((name, f"{n} block(s) patched" if n else "no-op"))
    width = max(len(n) for n, _ in summary)
    for name, status in summary:
        print(f"  {name:<{width}}  {status}")
    print(f"\nTotal pages touched: {sum(1 for _, s in summary if 'patched' in s)}")


if __name__ == "__main__":
    main()
