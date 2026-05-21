#!/usr/bin/env python3
"""Schema audit for Yacht Away Now — Map Pack readiness check.

Validates that every LocalBusiness block on key pages carries the fields
Google's structured-data guidelines treat as required/recommended for the
Local Business rich result + the signals that move Map Pack rankings.

Also checks NAP consistency across pages and resolves @id references.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

PAGES = [
    "index.html",
    "contact.html",
    "about.html",
    "our-yacht.html",
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

# Google's documented required + recommended LocalBusiness fields for the
# Rich Result + Map Pack signals.
REQUIRED = {"name", "address"}
STRONGLY_RECOMMENDED = {"telephone", "url", "geo", "openingHoursSpecification", "priceRange", "image"}
MAP_PACK_BOOSTERS = {"identifier", "hasMap", "areaServed", "aggregateRating"}

# Canonical NAP — what we expect across all pages.
EXPECTED_NAP = {
    "name": "Yacht Away Now",
    "telephone": "+17276092248",
    "street": "38th Way S",
    "city": "St. Petersburg",
    "region": "FL",
    "zip": "33711",
}
EXPECTED_PLACE_ID = "ChIJ7za8P4sdw4gR8zIl0CuGgyk"
EXPECTED_LAT = 27.7232126
EXPECTED_LNG = -82.6831018
CANONICAL_ID = "https://www.yachtawaynow.com/#business"

LD_RE = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.DOTALL)


def walk_local_businesses(obj, path=""):
    """Yield (path, dict) for every LocalBusiness encountered."""
    if isinstance(obj, dict):
        t = obj.get("@type")
        if t == "LocalBusiness" or (isinstance(t, list) and "LocalBusiness" in t):
            yield path, obj
        for k, v in obj.items():
            yield from walk_local_businesses(v, f"{path}.{k}" if path else k)
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            yield from walk_local_businesses(item, f"{path}[{i}]")


def check_lb(lb: dict) -> tuple[list[str], list[str], list[str]]:
    """Return (errors, warnings, info) for a single LocalBusiness block."""
    errors, warns, info = [], [], []

    # @id-only references are intentionally slim; skip detailed validation
    if set(lb.keys()) <= {"@type", "@id"}:
        info.append(f"@id-only reference -> {lb.get('@id', '?')}")
        return errors, warns, info

    present = set(lb.keys())

    missing_required = REQUIRED - present
    if missing_required:
        errors.append(f"missing required: {sorted(missing_required)}")

    missing_recommended = STRONGLY_RECOMMENDED - present
    if missing_recommended:
        warns.append(f"missing recommended: {sorted(missing_recommended)}")

    missing_boosters = MAP_PACK_BOOSTERS - present
    if missing_boosters:
        warns.append(f"missing Map Pack boosters: {sorted(missing_boosters)}")

    # Telephone format check
    tel = lb.get("telephone", "")
    if tel and not tel.startswith("+1"):
        warns.append(f"telephone not E.164: {tel!r}")

    # NAP consistency
    if lb.get("name") and lb.get("name") != EXPECTED_NAP["name"]:
        if "yacht away now" not in lb.get("name", "").lower():
            warns.append(f"name '{lb.get('name')}' is not 'Yacht Away Now'")
    if tel and tel != EXPECTED_NAP["telephone"]:
        errors.append(f"telephone mismatch: {tel!r} != {EXPECTED_NAP['telephone']!r}")

    addr = lb.get("address") or {}
    if isinstance(addr, dict):
        if addr.get("streetAddress", "").lower() != EXPECTED_NAP["street"].lower():
            errors.append(f"address.streetAddress mismatch: {addr.get('streetAddress')!r}")
        if addr.get("addressLocality") != EXPECTED_NAP["city"]:
            errors.append(f"address.addressLocality mismatch: {addr.get('addressLocality')!r}")
        if addr.get("addressRegion") != EXPECTED_NAP["region"]:
            errors.append(f"address.addressRegion mismatch: {addr.get('addressRegion')!r}")
        if addr.get("postalCode") != EXPECTED_NAP["zip"]:
            warns.append(f"address.postalCode {addr.get('postalCode')!r} != {EXPECTED_NAP['zip']!r}")

    # Geo coords
    geo = lb.get("geo")
    if isinstance(geo, dict):
        lat = float(geo.get("latitude", 0) or 0)
        lng = float(geo.get("longitude", 0) or 0)
        if abs(lat - EXPECTED_LAT) > 0.0001 or abs(lng - EXPECTED_LNG) > 0.0001:
            warns.append(f"geo coords ({lat}, {lng}) drift from canonical ({EXPECTED_LAT}, {EXPECTED_LNG})")

    # Place ID
    ident = lb.get("identifier")
    if isinstance(ident, dict):
        if ident.get("value") != EXPECTED_PLACE_ID:
            errors.append(f"identifier.value mismatch: {ident.get('value')!r}")

    # @id consistency
    aid = lb.get("@id")
    if aid and aid != CANONICAL_ID:
        warns.append(f"@id {aid!r} is not canonical #business")

    # Image presence
    if "image" in present and not lb.get("image"):
        warns.append("image present but empty")

    return errors, warns, info


def main():
    total_errors = 0
    total_warns = 0
    per_page = []

    for name in PAGES:
        path = ROOT / name
        if not path.exists():
            per_page.append((name, "MISSING_FILE", 0, 0, 0, []))
            continue

        html = path.read_text(encoding="utf-8")
        blocks = LD_RE.findall(html)
        bad_json = 0
        page_errors, page_warns, lbs_seen = [], [], 0

        for i, body in enumerate(blocks):
            try:
                data = json.loads(body)
            except json.JSONDecodeError as e:
                bad_json += 1
                page_errors.append(f"  block #{i}: invalid JSON ({e.msg} @ line {e.lineno})")
                continue
            for lb_path, lb in walk_local_businesses(data):
                lbs_seen += 1
                errs, wrns, info = check_lb(lb)
                for e in errs:
                    page_errors.append(f"  block #{i} @ {lb_path or '<root>'}: {e}")
                for w in wrns:
                    page_warns.append(f"  block #{i} @ {lb_path or '<root>'}: {w}")

        total_errors += len(page_errors)
        total_warns += len(page_warns)
        per_page.append((name, "OK" if not page_errors else "ERROR",
                         lbs_seen, len(page_errors), len(page_warns),
                         page_errors + page_warns))

    # Report
    print("=" * 72)
    print("SCHEMA AUDIT — Yacht Away Now Map Pack readiness")
    print("=" * 72)
    print()

    width = max(len(p[0]) for p in per_page)
    print(f"  {'page':<{width}}  status   LBs  errs  warns")
    print(f"  {'-'*width}  -------  ---  ----  -----")
    for name, status, lbs, errs, warns, _ in per_page:
        flag = "OK" if errs == 0 and warns <= 1 else ("WARN" if errs == 0 else "FAIL")
        print(f"  {name:<{width}}  {flag:<7}  {lbs:>3}  {errs:>4}  {warns:>5}")
    print()

    # Detail section: only pages with issues
    any_detail = False
    for name, status, lbs, errs, warns, details in per_page:
        if errs > 0 or warns > 0:
            if not any_detail:
                print("=" * 72)
                print("DETAILS")
                print("=" * 72)
                any_detail = True
            print(f"\n[{name}]  errors={errs}  warns={warns}")
            for line in details:
                print(line)

    print()
    print("=" * 72)
    print(f"TOTAL: {total_errors} error(s), {total_warns} warning(s) across {len(per_page)} pages")
    print("=" * 72)
    return 1 if total_errors else 0


if __name__ == "__main__":
    sys.exit(main())
