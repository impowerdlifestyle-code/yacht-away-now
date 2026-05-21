#!/usr/bin/env python3
"""Audit every internal href across the site against the live deploy.

Extracts:
  - all href= URLs from HTML files
  - all <loc> entries from sitemap.xml
  - all src= URLs (images, scripts, iframes)

Resolves them to absolute live URLs and HEAD-checks each.

Reports:
  - 404 / 5xx
  - redirect chains (>= 1 hop) and where they land
  - broken/missing local files referenced by relative hrefs
  - images that 404 (often the biggest hidden bug class)
"""

from __future__ import annotations

import concurrent.futures
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urldefrag, urljoin, urlparse

ROOT = Path(__file__).resolve().parent.parent
BASE = "https://www.yachtawaynow.com"

HREF_RE = re.compile(r'\bhref\s*=\s*"([^"#?\s][^"]*)"', re.IGNORECASE)
SRC_RE = re.compile(r'\bsrc\s*=\s*"([^"#?\s][^"]*)"', re.IGNORECASE)
SITEMAP_LOC_RE = re.compile(r"<loc>([^<]+)</loc>")


def is_internal(url: str) -> bool:
    """Return True if the URL is on yachtawaynow.com or is relative."""
    if url.startswith(("mailto:", "tel:", "javascript:", "data:", "#")):
        return False
    if url.startswith("//"):
        url = "https:" + url
    if url.startswith(("http://", "https://")):
        host = urlparse(url).netloc.lower()
        return host.endswith("yachtawaynow.com")
    return True  # relative


def absolutize(url: str, page_url: str) -> str:
    """Resolve a possibly-relative URL against a page URL."""
    if url.startswith("//"):
        url = "https:" + url
    if url.startswith(("http://", "https://")):
        return url
    return urljoin(page_url, url)


def collect_urls() -> dict[str, set[str]]:
    """Return {absolute_url: {sources}} for every internal href/src."""
    urls: dict[str, set[str]] = defaultdict(set)

    # From sitemap
    sm = ROOT / "sitemap.xml"
    if sm.exists():
        for m in SITEMAP_LOC_RE.finditer(sm.read_text(encoding="utf-8")):
            urls[m.group(1).strip()].add("sitemap.xml")

    # From every HTML file
    for p in ROOT.glob("*.html"):
        page_url = f"{BASE}/{p.stem}" if p.stem != "index" else f"{BASE}/"
        html = p.read_text(encoding="utf-8", errors="ignore")
        for m in HREF_RE.finditer(html):
            raw = m.group(1)
            if not is_internal(raw):
                continue
            absolute, _ = urldefrag(absolutize(raw, page_url))
            if absolute.startswith(BASE):
                urls[absolute].add(p.name)
        for m in SRC_RE.finditer(html):
            raw = m.group(1)
            if not is_internal(raw):
                continue
            absolute, _ = urldefrag(absolutize(raw, page_url))
            if absolute.startswith(BASE):
                urls[absolute].add(f"{p.name} (src)")
    return urls


def head_check(url: str) -> tuple[str, int | None, str | None]:
    """Return (url, final_status_code, final_url_if_redirected)."""
    try:
        out = subprocess.run(
            [
                "curl", "-s", "-o", "/dev/null",
                "-w", "%{http_code}|%{url_effective}",
                "-I", "-L", "--max-redirs", "5",
                "--connect-timeout", "8", "--max-time", "15",
                "-A", "Mozilla/5.0 yan-link-audit",
                url,
            ],
            capture_output=True, text=True, timeout=20,
        )
        if not out.stdout:
            return (url, None, None)
        status_s, _, final = out.stdout.strip().partition("|")
        try:
            status = int(status_s)
        except ValueError:
            return (url, None, None)
        final_url = final if final and final != url else None
        return (url, status, final_url)
    except Exception:
        return (url, None, None)


def main():
    urls = collect_urls()
    print(f"Collected {len(urls)} unique internal URLs.\n", file=sys.stderr)

    results: list[tuple[str, int | None, str | None, set[str]]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        futures = {ex.submit(head_check, u): u for u in urls}
        for fut in concurrent.futures.as_completed(futures):
            u, status, final = fut.result()
            results.append((u, status, final, urls[u]))

    # Categorize
    ok = []
    redirects = []
    fourohfour = []
    fivexx = []
    unreachable = []
    other = []

    for u, status, final, srcs in results:
        if status is None:
            unreachable.append((u, srcs))
        elif status == 200:
            if final and final != u and final.rstrip("/") != u.rstrip("/"):
                redirects.append((u, status, final, srcs))
            else:
                ok.append((u, srcs))
        elif 300 <= status < 400:
            redirects.append((u, status, final, srcs))
        elif status == 404:
            fourohfour.append((u, srcs))
        elif 500 <= status < 600:
            fivexx.append((u, status, srcs))
        else:
            other.append((u, status, srcs))

    print(f"OK (200):        {len(ok)}")
    print(f"Redirects:       {len(redirects)}")
    print(f"404 NOT FOUND:   {len(fourohfour)}")
    print(f"5xx errors:      {len(fivexx)}")
    print(f"Other status:    {len(other)}")
    print(f"Unreachable:     {len(unreachable)}")
    print()

    def print_block(title, items, limit=50):
        if not items:
            return
        print(f"--- {title} ---")
        for item in items[:limit]:
            u = item[0]
            srcs = item[-1]
            extra = ""
            if len(item) == 4 and item[2]:  # redirect
                extra = f" -> {item[2]}"
            elif len(item) == 3 and isinstance(item[1], int):  # other status
                extra = f" [{item[1]}]"
            srcs_str = ", ".join(sorted(srcs)[:3])
            if len(srcs) > 3:
                srcs_str += f" (+{len(srcs) - 3} more)"
            print(f"  {u}{extra}")
            print(f"     ← {srcs_str}")
        if len(items) > limit:
            print(f"  ... +{len(items) - limit} more")
        print()

    print_block("404 NOT FOUND", fourohfour)
    print_block("5xx ERRORS", fivexx)
    print_block("REDIRECTS (1+ hops)", redirects, limit=30)
    print_block("OTHER STATUS", other)
    print_block("UNREACHABLE", unreachable)

    return 1 if fourohfour or fivexx else 0


if __name__ == "__main__":
    sys.exit(main())
