# Spotix — QA report

## 2026-10-08 — second redesign

| Check | Result |
|---|---|
| `site_audit.py` | 0 errors, 0 warnings (7 pages) |
| `smoke_check.py` (root and `--subpath lighthouse`) | 17 URLs each, 0 failures |
| `node --check js/main.js` | pass |
| `visual_check.cjs`: 7 pages × 7 viewports (320 → 1920) | 0 horizontal overflow, 0 console errors |
| Mobile menu, FAQ keyboard, form (mocked success and failure, `?spot=duo`), reduced motion | pass |
| Rate-card diagrams to scale (new) | each about 2× the previous; same diagram width at 390, 700, 768, 1024, 1280, 1440, 1920 |
| Next booking deadline (new; fixed clock) | Oct 8 → Thu Oct 15 / Nov 1; Oct 20 → Sun Nov 15 / Dec 1; Dec 31 → Fri Jan 15 / Feb 1 |
| axe-core 4.10 (WCAG 2.0–2.2 A/AA + best practice), 7 pages × 1440 and 390 px, FAQ expanded | 0 violations |
| No-JS render at 390 px | nav wraps under the brand, no overflow |
| Focus ring visible on paper, ink and orange grounds | checked visually |

Contrast notes: text on orange is always ink (5.7:1); orange is never used as text colour on light grounds (it fails 3:1 there).

The section below is the previous pass, kept for history.

Run on 2026-09-24 against branch `claude/sharp-dijkstra-l71kfi`.

## How to run the checks

```bash
python3 tools/site_audit.py                      # static audit (stdlib only)
python3 tools/smoke_check.py                     # serves the repo, fetches every page + asset
python3 tools/smoke_check.py --subpath lighthouse  # same, under /lighthouse/ (GitHub Pages project URL)
node --check js/main.js
git diff --check
node tools/visual_check.cjs                      # optional: needs Playwright (npm i -g playwright)
```

`visual_check.cjs` blocks every third-party request and answers Formspree with a **mock**. The real form is never submitted and Calendly is never contacted.

## What `site_audit.py` checks

Broken local links, assets and `#anchors`; root-absolute URLs (which break subpath hosting); canonical and `og:url` per page; required meta; one `h1`; duplicate IDs; images without `alt`; unlabelled form controls; JSON-LD validity, schema asset paths and prices, and no Review/AggregateRating; `target=_blank` without `noopener`; robots → sitemap → files consistency; Formspree action, method, field names and required fields; Calendly/email/phone links; package prices (Solo $247, Duo $397, Full $597) wherever a package is named; no unapproved dollar amounts on the homepage; the 15% discount; legal links on every page; forbidden runtime dependencies (Tailwind CDN, unpkg, Lucide, GTM, Google Fonts); and retired unverified claims ("guaranteed delivery", "95%", "most popular", "only 8…", "10,000+", invented case-study names, placeholder GA IDs).

## Results

| Check | Before (commit `6bd1db6`) | After |
|---|---|---|
| `site_audit.py` | 100 errors | **0 errors, 0 warnings** |
| `smoke_check.py` (root) | n/a | 18 URLs, 0 failures |
| `smoke_check.py --subpath lighthouse` | n/a | 18 URLs, 0 failures |
| `node --check js/main.js` | — | pass |
| `git diff --check` | — | pass |
| html-validate (recommended preset¹) | — | 0 problems |
| axe-core 4 (WCAG 2.0/2.1/2.2 A+AA + best practice), 7 pages × 1440 and 390 px, FAQ expanded | 64 violations² | **0 violations** |
| `visual_check.cjs`: 7 pages × 7 viewports (320×568 → 1920×1080) | — | 0 horizontal overflow, 0 console errors |
| Mobile menu (open, Escape, focus return) | — | pass |
| FAQ opens with keyboard | — | pass |
| Spot-size picker (Duo → Full → full page) | — | pass |
| Form: validation, focus to first error, mocked success, mocked failure | — | pass |
| `?spot=duo` preselects the package | — | pass |
| Reduced motion: no animations, no hero tilt | — | pass |
| Sticky mobile bar: hidden in hero, shown mid-page, hidden at form and footer | — | pass |
| No-JS render at 390 px: navigation visible, no overflow | — | pass |

¹ With `tel-non-breaking` off (phone links use `white-space: nowrap` instead) and `prefer-native-element` allowing `role="region"` on scrollable tables.
² Baseline measured with Tailwind unavailable in the sandbox, so its colour-contrast counts are unreliable. Structural baseline failures included a critical unlabelled `<select>`, no `<main>` landmark on any page, and target-size failures.

A mutation test (changing the Duo price to $399 and one stylesheet URL to `/css/styles.css`) was caught by `site_audit.py` (3 errors).

## Baseline defects found (before)

- Off-screen cards were set to `opacity: 0` until scrolled into view, so the pricing, process and FAQ buttons were invisible in full-page renders and to anything that doesn't scroll.
- The mobile hero never showed the product (the visual was hidden below 1024 px).
- Articles referenced `images/favicon.png` from `/blog/` (404) and also embedded a second inline SVG favicon.
- `robots.txt` pointed at `/sitemap.xml`, but the sitemap lived at `/blog/sitemap.xml`.
- Schema `logo` pointed to missing files.
- `spotix-og.jpg` was a 1.3 MB PNG with a `.jpg` name; the favicon was 1.37 MB.
- A GA placeholder ID loaded Google Tag Manager on every page load and fired a fake conversion event.
- The form's failure path used `alert()`; errors were shown by border colour only.

## Page weight (homepage, first load, uncompressed)

| | Before | After |
|---|---|---|
| Third-party requests on load | Tailwind CDN runtime, Lucide (`@latest`, 356 KB min), Google Fonts CSS + Inter, GTM with placeholder ID | **none** |
| HTML | 96 KB | 48 KB (10 KB gzip) |
| CSS / JS (first-party) | 7 KB / 9 KB | 41 KB (9 KB gzip) / 6 KB |
| Fonts | Inter from Google (7 weights requested) | 71 KB (2 variable woff2, preloaded) |
| Favicon | 1.37 MB | 2 KB (48 px) / 27 KB (256 px) |
| OG image | 1.34 MB | 89 KB |

## Not tested

- The live domain and GitHub Pages output (blocked by this environment's network policy).
- The real Formspree endpoint and Calendly (deliberately not contacted).
- Safari/Firefox engines (Chromium only). `:has()` is supported in current Safari and Firefox; a fallback shows all size descriptions if it isn't.
