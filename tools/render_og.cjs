#!/usr/bin/env node
/* Renders tools/og-image.html to images/spotix-og.jpg (1200x630).
 * Needs Playwright (npm i -g playwright). The page uses the site's own font
 * and mark, so the share image matches the homepage card. */
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  try { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }
  catch (e2) { console.error('Playwright not found. Install with: npm i -g playwright'); process.exit(2); }
}
const ROOT = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto('file://' + path.join(ROOT, 'tools/og-image.html'));
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(ROOT, 'images/spotix-og.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 86 });
  await browser.close();
  console.log('wrote ' + out);
})();
