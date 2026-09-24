#!/usr/bin/env python3
"""HTTP smoke check for the Spotix site.

Serves the repository locally (or checks an existing server), fetches every
page listed in sitemap.xml plus every local asset those pages reference, and
fails on any non-200 response or wrong content type.

Usage:
  python3 tools/smoke_check.py                     # serve at / on a free port
  python3 tools/smoke_check.py --subpath lighthouse  # simulate GitHub Pages project URL /lighthouse/
  python3 tools/smoke_check.py --base http://127.0.0.1:8000/   # check a server you started

Never submits the inquiry form or contacts third-party services.
Standard library only.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import os
import re
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://myspotix.com/"
TYPES = {".html": "text/html", ".css": "text/css", ".js": "javascript", ".png": "image/png",
         ".jpg": "image/jpeg", ".woff2": "font/woff2", ".xml": "xml", ".txt": "text/plain"}


class Refs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ("link", "script", "img") or tag == "a":
            u = a.get("href") or a.get("src")
            if u:
                self.urls.append(u)


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def serve(subpath: str | None) -> tuple[str, http.server.ThreadingHTTPServer]:
    directory = ROOT
    if subpath:
        tmp = Path(tempfile.mkdtemp(prefix="spotix-smoke-"))
        os.symlink(ROOT, tmp / subpath)
        directory = tmp
    handler = functools.partial(Quiet, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_address[1]}/" + (f"{subpath}/" if subpath else "")
    return base, httpd


def fetch(url: str) -> tuple[int, str, bytes]:
    try:
        with urllib.request.urlopen(url, timeout=10) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read()
    except urllib.error.HTTPError as e:
        return e.code, "", b""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", help="existing server base URL, e.g. http://127.0.0.1:8000/")
    ap.add_argument("--subpath", help="serve the site under /<subpath>/ to mimic a project Pages URL")
    args = ap.parse_args()

    httpd = None
    base = args.base
    if not base:
        base, httpd = serve(args.subpath)
    if not base.endswith("/"):
        base += "/"
    print(f"Checking {base}")

    failures = []
    checked = set()

    def check(url: str, expect: str | None = None) -> bytes:
        if url in checked:
            return b""
        checked.add(url)
        status, ctype, body = fetch(url)
        ok = status == 200 and (expect is None or expect in ctype)
        print(f"{'ok  ' if ok else 'FAIL'} {status} {url}")
        if not ok:
            failures.append(f"{url} -> {status} {ctype}")
        return body

    check(urljoin(base, "robots.txt"), "text/plain")
    sitemap = check(urljoin(base, "sitemap.xml"), "xml").decode("utf-8", "replace")
    pages = [urljoin(base, loc[len(SITE):]) for loc in re.findall(r"<loc>([^<]+)</loc>", sitemap)]
    if not pages:
        failures.append("sitemap.xml lists no pages")

    for page in pages:
        html = check(page, "text/html").decode("utf-8", "replace")
        refs = Refs()
        refs.feed(html)
        for u in refs.urls:
            parsed = urlparse(u)
            if parsed.scheme or u.startswith(("#", "mailto:", "tel:", "data:")):
                continue
            target = urljoin(page, parsed.path)
            ext = Path(parsed.path).suffix
            check(target, TYPES.get(ext))

    if httpd:
        httpd.shutdown()
    print(f"\n{len(checked)} URLs checked, {len(failures)} failure(s).")
    for f in failures:
        print(f"FAIL {f}")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
