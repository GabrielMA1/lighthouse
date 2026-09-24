#!/usr/bin/env python3
"""Spotix static-site audit.

Catches the regressions that matter for this site: broken local links and
assets, metadata/canonical drift, sitemap/robots mismatches, form wiring,
pricing drift, placeholder analytics, reintroduced runtime dependencies and
claims that were removed for being unverified.

Usage:  python3 tools/site_audit.py        (exit code 1 if any ERROR)
Standard library only. Run from anywhere.
"""
from __future__ import annotations

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://myspotix.com"

# ---- Source of truth for commercial facts (see docs/SPOTIX-STRATEGY.md) ----
PACKAGES = {"Solo": 247, "Duo": 397, "Full": 597}
SUBSCRIPTION_DISCOUNT = 15
FORMSPREE = "https://formspree.io/f/mzdorlpr"
CALENDLY = "https://calendly.com/hello-myspotix/10min"
EMAIL = "hello@myspotix.com"
PHONE_TEL = "tel:+16479063547"
FORM_FIELDS = {"name", "email", "business", "spot_size", "message"}

# Phrases removed because they could not be verified. Case-insensitive.
BANNED = {
    r"guaranteed delivery": "unverified claim; Terms say delivery dates are not guaranteed",
    r"95\s*%": "unverified delivery-rate statistic",
    r"most popular": "unverified popularity claim",
    r"only 8 (spots|advertisers)": "unverified scarcity claim",
    r"10,000\+": "unverified reach claim (use '10,000 homes per mailing')",
    r"anti-algorithm": "retired positioning",
    r"maria'?s trattoria|glow hair studio|sarah chen": "unverified case-study identity",
    r"real results": "unverified results claim",
    r"G-XXXXXXXXXX|CONVERSION_LABEL": "placeholder analytics ID",
}
FORBIDDEN_URLS = {
    "cdn.tailwindcss.com": "runtime Tailwind CDN",
    "unpkg.com": "version-floating unpkg dependency",
    "lucide": "Lucide icon script",
    "googletagmanager.com": "analytics tag (no real ID configured)",
    "fonts.googleapis.com": "Google Fonts (fonts are self-hosted)",
}
BANNED_SCHEMA_TYPES = {"Review", "AggregateRating"}

errors: list[str] = []
warnings: list[str] = []


def err(page: str, msg: str) -> None:
    errors.append(f"{page}: {msg}")


def warn(page: str, msg: str) -> None:
    warnings.append(f"{page}: {msg}")


class Page(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[tuple[str, str, dict]] = []  # (tag, url, attrs)
        self.meta: dict[str, str] = {}
        self.canonical: str | None = None
        self.lang: str | None = None
        self.title = ""
        self._in_title = False
        self.h1 = 0
        self.jsonld: list[str] = []
        self._in_jsonld = False
        self._buf = ""
        self.labels_for: set[str] = set()
        self.controls: list[dict] = []
        self.forms: list[dict] = []
        self.imgs: list[dict] = []
        self.text_parts: list[str] = []
        self._skip_text = 0

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if "id" in a:
            self.ids.append(a["id"])
        if tag == "html":
            self.lang = a.get("lang")
        if tag == "title":
            self._in_title = True
        if tag == "h1":
            self.h1 += 1
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key:
                self.meta[key] = a.get("content", "")
        if tag == "link" and a.get("rel") == "canonical":
            self.canonical = a.get("href")
        for attr in ("href", "src", "action"):
            if attr in a:
                self.links.append((tag, a[attr], a))
        if tag == "script" and a.get("type") == "application/ld+json":
            self._in_jsonld, self._buf = True, ""
        if tag in ("script", "style"):
            self._skip_text += 1
        if tag == "label" and a.get("for"):
            self.labels_for.add(a["for"])
        if tag in ("input", "select", "textarea"):
            self.controls.append({"tag": tag, **a})
        if tag == "form":
            self.forms.append(a)
        if tag == "img":
            self.imgs.append(a)

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        if tag == "script" and self._in_jsonld:
            self.jsonld.append(self._buf)
            self._in_jsonld = False
        if tag in ("script", "style"):
            self._skip_text -= 1

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_jsonld:
            self._buf += data
        elif self._skip_text <= 0:
            self.text_parts.append(data)

    @property
    def text(self) -> str:
        return " ".join(" ".join(self.text_parts).split())


def html_files() -> list[Path]:
    skip = {"docs", "tools", "node_modules", ".git"}
    return sorted(p for p in ROOT.rglob("*.html") if not skip & set(p.relative_to(ROOT).parts))


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def expected_canonical(p: Path) -> str:
    r = rel(p)
    return f"{SITE}/" if r == "index.html" else f"{SITE}/{r}"


def local_target(page: Path, url: str) -> Path | None:
    """Resolve a site URL to a local file, or None if external."""
    u = urlparse(url)
    if u.scheme in ("mailto", "tel", "data", "javascript"):
        return None
    if u.scheme in ("http", "https"):
        if u.netloc not in ("myspotix.com", "www.myspotix.com"):
            return None
        path = u.path.lstrip("/") or "index.html"
        target = ROOT / path
    else:
        if not u.path:
            return page  # same-page fragment
        target = (page.parent / u.path).resolve()
    if target.is_dir():
        target = target / "index.html"
    return target


def audit_page(p: Path, parsed: dict[Path, Page]) -> None:
    name = rel(p)
    raw = p.read_text(encoding="utf-8")
    doc = parsed[p]

    # Basics and metadata
    if not doc.lang:
        err(name, "missing <html lang>")
    if not doc.title.strip():
        err(name, "missing <title>")
    if "viewport" not in doc.meta:
        err(name, "missing viewport meta")
    for key in ("description", "og:title", "og:description", "og:url", "og:image", "twitter:card"):
        if not doc.meta.get(key):
            err(name, f"missing meta {key}")
    if doc.canonical != expected_canonical(p):
        err(name, f"canonical is {doc.canonical!r}, expected {expected_canonical(p)!r}")
    if doc.meta.get("og:url") and doc.meta["og:url"] != expected_canonical(p):
        err(name, f"og:url {doc.meta['og:url']!r} does not match canonical")
    if doc.h1 != 1:
        err(name, f"expected exactly one <h1>, found {doc.h1}")

    # Duplicate IDs
    seen = set()
    for i in doc.ids:
        if i in seen:
            err(name, f"duplicate id #{i}")
        seen.add(i)

    # Links and assets
    for tag, url, attrs in doc.links:
        if url.startswith("/") and not url.startswith("//"):
            err(name, f"root-absolute URL {url!r} breaks project-subpath hosting; use a relative path")
        for host, why in FORBIDDEN_URLS.items():
            if host in url:
                err(name, f"forbidden dependency {url!r} ({why})")
        if attrs.get("target") == "_blank" and "noopener" not in attrs.get("rel", ""):
            err(name, f"target=_blank without rel=noopener: {url}")
        target = local_target(p, url)
        if target is None:
            continue
        if not target.exists():
            err(name, f"broken local reference {url!r}")
            continue
        frag = urlparse(url).fragment
        if frag and target.suffix == ".html":
            tdoc = parsed.get(target)
            if tdoc and frag not in tdoc.ids:
                err(name, f"link {url!r} points to missing #{frag}")

    # Images
    for img in doc.imgs:
        if "alt" not in img:
            err(name, f"<img src={img.get('src')!r}> has no alt attribute")
        if not (img.get("width") and img.get("height")):
            warn(name, f"<img src={img.get('src')!r}> has no width/height (layout shift)")

    # Form controls must be labelled
    for c in doc.controls:
        if c.get("type") in ("hidden", "submit", "button"):
            continue
        cid = c.get("id")
        if not (cid and cid in doc.labels_for) and not c.get("aria-label") and not c.get("aria-labelledby"):
            err(name, f"form control name={c.get('name')!r} has no label")

    # Structured data
    for block in doc.jsonld:
        try:
            data = json.loads(block)
        except json.JSONDecodeError as e:
            err(name, f"invalid JSON-LD: {e}")
            continue
        blob = json.dumps(data)
        for t in BANNED_SCHEMA_TYPES:
            if f'"@type": "{t}"' in blob:
                err(name, f"JSON-LD uses unsupported {t}")
        for url in re.findall(r'"(https://myspotix\.com/[^"]*)"', blob):
            t = local_target(p, url)
            if t is not None and not t.exists():
                err(name, f"JSON-LD references missing file {url}")
        for offer in re.findall(r'"name": "(Solo|Duo|Full) Spot".*?"price": "(\d+)"', blob):
            if int(offer[1]) != PACKAGES[offer[0]]:
                err(name, f"JSON-LD price for {offer[0]} Spot is {offer[1]}, expected {PACKAGES[offer[0]]}")

    # og:image must exist locally
    og = doc.meta.get("og:image", "")
    t = local_target(p, og) if og else None
    if og and t is not None and not t.exists():
        err(name, f"og:image {og} does not exist")

    # Legal links on every page
    for legal in ("privacy-policy.html", "terms-of-service.html"):
        if legal not in raw:
            err(name, f"missing link to {legal}")

    # Claims and placeholders
    text = doc.text
    for pattern, why in BANNED.items():
        if re.search(pattern, raw, re.I):
            err(name, f"contains {pattern!r}: {why}")

    # Pricing: package names must carry the approved price
    for pkg, price in PACKAGES.items():
        for m in re.finditer(rf"\b{pkg} Spot\b(?:(?!Spot)[^$]){{0,60}}\$(\d[\d,]*)", text):
            found = int(m.group(1).replace(",", ""))
            if found != price:
                err(name, f"'{pkg} Spot' shown with ${found}, expected ${price}")
    for m in re.finditer(r"(\d+)\s*%\s*discount", text, re.I):
        if int(m.group(1)) != SUBSCRIPTION_DISCOUNT:
            err(name, f"discount of {m.group(1)}% does not match approved {SUBSCRIPTION_DISCOUNT}%")


def audit_home(parsed: dict[Path, Page]) -> None:
    p = ROOT / "index.html"
    doc = parsed[p]
    raw = p.read_text(encoding="utf-8")
    name = "index.html"
    # Every whole-dollar amount on the homepage must be an approved price
    for m in re.finditer(r"\$(\d[\d,]*)(?!\.\d)", doc.text):
        v = int(m.group(1).replace(",", ""))
        if v not in PACKAGES.values():
            err(name, f"unexpected price ${v} on homepage (approved: {sorted(PACKAGES.values())})")
    for pkg, price in PACKAGES.items():
        if f"${price}" not in doc.text:
            err(name, f"{pkg} Spot price ${price} not shown")
    if f"{SUBSCRIPTION_DISCOUNT}% discount" not in doc.text:
        err(name, "subscription discount not shown")
    forms = [f for f in doc.forms if f.get("id") == "inquiry-form"]
    if not forms:
        err(name, "inquiry form #inquiry-form missing")
    else:
        f = forms[0]
        if f.get("action") != FORMSPREE:
            err(name, f"form action is {f.get('action')!r}, expected {FORMSPREE}")
        if f.get("method", "").upper() != "POST":
            err(name, "form method must be POST")
    names = {c.get("name") for c in doc.controls}
    missing = FORM_FIELDS - names
    if missing:
        err(name, f"form fields missing: {sorted(missing)}")
    for c in doc.controls:
        if c.get("name") in ("name", "email") and "required" not in c:
            err(name, f"form field {c.get('name')} should be required")
    for needle, what in ((CALENDLY, "Calendly link"), (f"mailto:{EMAIL}", "email link"), (PHONE_TEL, "phone link")):
        if needle not in raw:
            err(name, f"{what} missing")


def audit_robots_sitemap(pages: list[Path]) -> None:
    robots = ROOT / "robots.txt"
    if not robots.exists():
        err("robots.txt", "missing")
        return
    m = re.search(r"^Sitemap:\s*(\S+)", robots.read_text(), re.M | re.I)
    if not m:
        err("robots.txt", "no Sitemap line")
        return
    target = local_target(ROOT / "index.html", m.group(1))
    if target is None or not target.exists():
        err("robots.txt", f"Sitemap {m.group(1)} has no matching local file")
        return
    locs = re.findall(r"<loc>([^<]+)</loc>", target.read_text())
    listed = set()
    for loc in locs:
        if not loc.startswith(SITE):
            err(rel(target), f"loc {loc} is not on {SITE}")
        t = local_target(ROOT / "index.html", loc)
        if t is None or not t.exists():
            err(rel(target), f"loc {loc} has no local file")
        else:
            listed.add(t.resolve())
    for p in pages:
        if p.resolve() not in listed and 'content="noindex' not in p.read_text():
            err(rel(target), f"{rel(p)} is indexable but not in the sitemap")


def main() -> int:
    pages = html_files()
    parsed = {}
    for p in pages:
        doc = Page()
        doc.feed(p.read_text(encoding="utf-8"))
        parsed[p.resolve()] = doc
        parsed[p] = doc
    for p in pages:
        audit_page(p, parsed)
    audit_home(parsed)
    audit_robots_sitemap(pages)

    if (ROOT / "CNAME").exists():
        warn("CNAME", "present. It was deliberately deleted in 6bd1db6; confirm this is intended")

    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    print(f"\nChecked {len(pages)} pages: {len(errors)} error(s), {len(warnings)} warning(s).")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
