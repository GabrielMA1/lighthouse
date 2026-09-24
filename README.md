# Spotix website

Static site for [myspotix.com](https://myspotix.com): shared postcard advertising for Toronto local businesses.

- Plain HTML, one stylesheet (`css/styles.css`), one small script (`js/main.js`). No build step and no runtime CDNs.
- Fonts are self-hosted in `fonts/` (SIL OFL 1.1).
- Keep every URL **relative**; the site may be served from a project subpath.

## Before you change content

Read `docs/SPOTIX-STRATEGY.md`. It is the source of truth for prices, package scope, process dates, contact details, and the list of claims that were removed as unverified. `docs/SPOTIX-COPY-MAP.md` shows where each claim appears.

## Checks

```bash
python3 tools/site_audit.py
python3 tools/smoke_check.py
python3 tools/smoke_check.py --subpath lighthouse
node --check js/main.js
node tools/visual_check.cjs     # optional, needs Playwright
```

See `docs/SPOTIX-QA-REPORT.md` for what each check covers and the latest results.

## Deployment

Deployed from this repository via GitHub Pages. `CNAME` was intentionally removed in `6bd1db6`; don't re-add it without confirming the domain setup. See `docs/SPOTIX-IMPLEMENTATION-LOG.md`.
