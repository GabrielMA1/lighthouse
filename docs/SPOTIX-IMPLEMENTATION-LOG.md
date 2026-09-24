# Spotix — implementation log

## 2026-09-24 — Redesign, truthfulness pass and technical cleanup

### Visual concept: printed matter

The site is built around the physical product: **one shared postcard, divided into spots**.

- **Palette:** warm paper (`--paper #f3eee4`), card stock (`--stock`), ink (`--ink #1d1b18`), and one spot colour, Spotix orange (`--orange #f2600c`, taken from the existing brand mark). Orange text uses the darker `--orange-text` to pass WCAG AA contrast on paper. Primary buttons are orange fill with **ink** text, like a spot-colour print job, because white on orange fails contrast.
- **Motifs, used sparingly:** crop marks around the postcard schematic, a faint paper grain, a month "ruler" for the mailing cycle, and address-label cards for coverage. There are no stamps, glows, gradients, particles or floating shapes.
- **Type:** Bricolage Grotesque (display; its ink-trap forms suit print) and Instrument Sans (text). Both are variable woff2 files, self-hosted, latin subset, SIL OFL 1.1 (licences in `/fonts`). Together they total 71 KB.
- **Brand:** the existing pin-with-speed-lines mark (from the owner's favicon/OG artwork, cropped and resized only) plus a typeset wordmark. The orange tittle on the "ı" echoes the existing OG wordmark. **No new logo was created.** A vector (SVG) master of the mark is still missing.

### Homepage narrative

Hero (offer + representative postcard + spec list) → who it's for → the postcard and spot sizes (interactive, CSS-only) → pricing ledger → monthly cycle → coverage → measuring results + neutral comparison → guides → FAQ → inquiry. See `SPOTIX-COPY-MAP.md`.

### Architecture

- Plain static HTML, one stylesheet (`css/styles.css`), one small script (`js/main.js`, ~6 KB). No framework, no build step, no runtime CDN.
- **Removed:** runtime Tailwind (`cdn.tailwindcss.com`), Lucide from `unpkg.com/lucide@latest`, Google Fonts, the Google Analytics placeholder (`G-XXXXXXXXXX`) and its fake conversion event, unused preconnects, the particle and floating animations, and the scroll-reveal that hid content until it was scrolled into view.
- Icons are a handful of inline SVGs.
- Progressive enhancement: navigation, FAQ (`<details>`), the spot-size picker (`:has()`) and the form (plain POST to Formspree) all work without JavaScript. JS adds the mobile menu, inline form validation with an in-page confirmation, package preselection (`data-package`, `?spot=duo`) and the mobile sticky bar.
- **Header and footer are duplicated** in each HTML file (no build step). When editing navigation, update all 7 pages; `tools/site_audit.py` catches broken links and anchors.
- All URLs are **relative**, so the site works both at a domain root and under a GitHub Pages project path (`/lighthouse/`). The audit fails on root-absolute URLs.

### Files

| Change | Files |
|---|---|
| Rewritten | `index.html`, `blog.html`, `blog/*.html` (3), `css/styles.css`, `js/main.js` |
| Re-typeset (legal text unchanged) | `privacy-policy.html`, `terms-of-service.html` |
| Moved | `blog/sitemap.xml` → `sitemap.xml` (where `robots.txt` already pointed) |
| Updated | `robots.txt` |
| Images | `favicon.png` 1.37 MB → 27 KB (same artwork, 256 px); `spotix-og.jpg` was PNG data with a .jpg name at 1.34 MB → real JPEG, 1200×630, 89 KB; new `favicon-48.png`, `apple-touch-icon.png`, `icon-512.png` (schema logo), `spotix-mark.png` (header) |
| Removed | `images/desktop.ini` (Windows metadata) |
| Added | `fonts/` (2 woff2 + OFL licences), `tools/` (QA), `docs/` (this documentation), `_config.yml`, `.gitignore`, `README.md` |

### SEO

- Canonicals and `og:url` kept on `https://myspotix.com/…`. Titles and descriptions no longer claim guaranteed delivery.
- Structured data: Organization (logo now points to an existing file; it previously pointed to a missing `spotix-logo.png` / `spotix-og.jpg` at the wrong path), Service with the three priced offers, BlogPosting with `dateModified`, BreadcrumbList. No Review, AggregateRating or invented business details.
- Fixed: article favicons pointed to `blog/images/…` (404); `robots.txt` referenced a sitemap that didn't exist at the root.
- Dropped the `meta keywords` tag (ignored by search engines).

### Deployment (unchanged; owner to confirm)

- GitHub reports Pages enabled for `GabrielMA1/lighthouse`, with homepage `https://gabrielma1.github.io/lighthouse/`.
- `CNAME` (`myspotix.com`) was added in `b326bff` and **deliberately deleted** in `6bd1db6` (2026-07-08, via the GitHub web UI). The repository doesn't record why. With a branch-based Pages deploy, deleting `CNAME` usually removes the custom domain, so the site would be served at `/lighthouse/`, unless the domain is now served some other way. The live domain couldn't be checked from this environment (network policy).
- This pass **does not recreate `CNAME`** and changes no DNS or hosting settings.
- If the site is now only served at `gabrielma1.github.io/lighthouse/`, the canonical URLs (myspotix.com) point to a host that may not serve this site. The owner should decide which host is canonical.
- `_config.yml` excludes `docs/`, `tools/` and `README.md` from the Jekyll-built Pages site. The HTML pages have no front matter, so Jekyll copies them unchanged. If the site moves to a host that doesn't use Jekyll, those folders would be publicly served; they contain nothing secret, but consider moving them.

### Accessibility

Skip link; landmarks (`header`, `nav`, `main`, `footer`); one `h1` per page; native `<details>` FAQ; native radio group for the size picker; labelled form fields with inline errors (`aria-invalid`, `aria-describedby`); focus moves to the first invalid field or to the success/error message; a 3 px ink focus ring; 44–56 px touch targets; mobile menu with `aria-expanded`, Escape to close and focus return; the sticky bar is `aria-hidden` and untabbable while off-screen and hides near the form; `scroll-padding` keeps focused items clear of the sticky header and bar; `prefers-reduced-motion` disables transitions and the hero card tilt; external links announce "opens in a new tab".
