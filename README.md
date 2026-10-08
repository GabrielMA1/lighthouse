# Spotix website

Static site for [myspotix.com](https://myspotix.com): shared postcard advertising for Toronto local businesses.

- Plain HTML, one stylesheet (`css/styles.css`), one small script (`js/main.js`). No build step and no runtime CDNs.
- One self-hosted variable font, Archivo, in `fonts/` (SIL OFL 1.1).
- Design rules (read before changing visuals): orange marks only what belongs to the advertiser; card diagrams stay to scale. See the 2026-10-08 entry in `docs/SPOTIX-IMPLEMENTATION-LOG.md`.
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
node tools/render_og.cjs        # regenerate images/spotix-og.jpg from tools/og-image.html
```

See `docs/SPOTIX-QA-REPORT.md` for what each check covers and the latest results.

## Deployment

Deployed from this repository via GitHub Pages, with the custom domain in `CNAME` (`myspotix.com`, re-added by the owner in `c5b4e16`). URLs stay relative so the site also works under a project subpath. See `docs/SPOTIX-IMPLEMENTATION-LOG.md`.
