#!/usr/bin/env node
/* Spotix browser check (optional; needs Playwright).
 *
 *   node tools/visual_check.cjs [outDir]
 *
 * - Serves the repo locally and loads every page at seven viewports.
 * - Fails on horizontal overflow, console errors or failed local requests.
 * - Blocks all third-party requests (nothing leaves the machine).
 * - Exercises the inquiry form against a MOCKED Formspree endpoint
 *   (success and failure). The real form is never submitted.
 * - Checks the mobile menu, FAQ keyboard toggling and reduced motion.
 * - Writes full-page screenshots to outDir (default: ./qa-screenshots, git-ignored).
 *
 * Playwright: `npm i -g playwright` or set NODE_PATH to a global install.
 */
const path = require('path');
const fs = require('fs');
const http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) {
  try { ({ chromium } = require(path.join(process.execPath, '../../lib/node_modules/playwright'))); }
  catch (e2) { console.error('Playwright not found. Install with: npm i -g playwright'); process.exit(2); }
}

const ROOT = path.resolve(__dirname, '..');
const OUT = path.resolve(process.argv[2] || path.join(ROOT, 'qa-screenshots'));
const PAGES = ['index.html', 'blog.html', 'blog/restaurant-postcard-case-study.html',
  'blog/salon-instagram-to-direct-mail.html', 'blog/home-services-cost-comparison.html',
  'privacy-policy.html', 'terms-of-service.html'];
const VIEWPORTS = [[320, 568], [390, 844], [430, 932], [768, 1024], [1024, 768], [1440, 900], [1920, 1080]];
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});

const problems = [];
const fail = (msg) => { problems.push(msg); console.log('FAIL ' + msg); };

async function newPage(browser, base, vp, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] }, ...opts });
  const page = await ctx.newPage();
  const issues = [];
  page.on('console', (m) => { if (m.type() === 'error') issues.push(m.text()); });
  page.on('pageerror', (e) => issues.push(String(e)));
  page.on('requestfailed', (r) => { if (r.url().startsWith(base)) issues.push('request failed ' + r.url()); });
  await page.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(base)) return route.continue();
    return route.abort('blockedbyclient');
  });
  return { ctx, page, issues };
}

server.listen(0, async () => {
  const base = `http://127.0.0.1:${server.address().port}/`;
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // 1. Every page at every viewport
  for (const vp of VIEWPORTS) {
    for (const pg of PAGES) {
      const { ctx, page, issues } = await newPage(browser, base, vp);
      await page.goto(base + pg, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) fail(`${pg} @${vp[0]}: horizontal overflow ${overflow}px`);
      if (issues.length) fail(`${pg} @${vp[0]}: ${issues.join(' | ')}`);
      await page.screenshot({ path: path.join(OUT, `${vp[0]}x${vp[1]}-${pg.replace(/\//g, '_')}.png`), fullPage: true });
      await ctx.close();
    }
    console.log(`ok   ${vp[0]}x${vp[1]} (${PAGES.length} pages)`);
  }

  // 2. Mobile menu: opens, is keyboard reachable, closes on Escape
  {
    const { ctx, page } = await newPage(browser, base, [390, 844]);
    await page.goto(base + 'index.html');
    const toggle = page.locator('.nav-toggle');
    await toggle.click();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') fail('mobile menu did not open');
    if (!(await page.locator('#site-nav a[href="#pricing"]').isVisible())) fail('mobile menu links not visible');
    await page.keyboard.press('Escape');
    if ((await toggle.getAttribute('aria-expanded')) !== 'false') fail('mobile menu did not close on Escape');
    const focused = await page.evaluate(() => document.activeElement.className);
    if (!focused.includes('nav-toggle')) fail('focus not returned to menu button after Escape');
    await ctx.close();
    console.log('ok   mobile menu');
  }

  // 3. FAQ opens with the keyboard (native <details>)
  {
    const { ctx, page } = await newPage(browser, base, [1440, 900]);
    await page.goto(base + 'index.html');
    const summary = page.locator('#faq summary').first();
    await summary.focus();
    await page.keyboard.press('Enter');
    if (!(await page.locator('#faq details').first().evaluate((d) => d.open))) fail('FAQ did not open with Enter');
    await ctx.close();
    console.log('ok   FAQ keyboard');
  }

  // 4. Spot-size picker changes the highlighted area
  {
    const { ctx, page } = await newPage(browser, base, [1440, 900]);
    await page.goto(base + 'index.html');
    const spot = page.locator('.sizer .mp-spot');
    const w1 = (await spot.boundingBox()).width;
    await page.locator('label[for="size-full"]').click();
    const box = await spot.boundingBox();
    if (!(box.height > 0 && box.width === w1 && (await page.locator('.size-detail--full').isVisible()))) fail('size picker did not switch to Full');
    await page.locator('label[for="size-page"]').click();
    if (!((await spot.boundingBox()).width > w1 * 1.8)) fail('size picker did not switch to full page');
    await ctx.close();
    console.log('ok   size picker');
  }

  // 5. Inquiry form: validation, mocked success, mocked failure
  for (const outcome of ['success', 'failure']) {
    const { ctx, page } = await newPage(browser, base, [390, 844]);
    let posted = null;
    await page.route('https://formspree.io/**', (route) => {
      posted = route.request().postData();
      return route.fulfill(outcome === 'success'
        ? { status: 200, contentType: 'application/json', body: '{"ok":true}' }
        : { status: 500, contentType: 'application/json', body: '{"error":"mock"}' });
    });
    await page.goto(base + 'index.html?spot=duo#inquire');
    if ((await page.locator('#f-spot').inputValue()) !== 'duo') fail('?spot=duo did not preselect the package');
    await page.locator('#inquiry-form button[type=submit]').click();
    if ((await page.locator('#f-name').getAttribute('aria-invalid')) !== 'true') fail('empty name not flagged');
    if (!(await page.locator('#f-name-error').isVisible())) fail('name error message not shown');
    const active = await page.evaluate(() => document.activeElement.id);
    if (active !== 'f-name') fail('focus not moved to first invalid field');
    await page.fill('#f-name', 'QA Test');
    await page.fill('#f-email', 'qa@example.com');
    await page.locator('#inquiry-form button[type=submit]').click();
    await page.waitForTimeout(300);
    if (!posted || !posted.includes('QA Test')) fail('form did not post to the (mocked) Formspree endpoint');
    if (outcome === 'success') {
      if (!(await page.locator('#form-success').isVisible())) fail('success message not shown');
    } else {
      if (!(await page.locator('#form-status').isVisible())) fail('error message not shown on failure');
      if (await page.locator('#inquiry-form button[type=submit]').isDisabled()) fail('submit button stays disabled after failure');
    }
    await ctx.close();
    console.log(`ok   form (${outcome}, mocked)`);
  }

  // 6. Reduced motion: no running animations, no transform on hero card
  {
    const { ctx, page } = await newPage(browser, base, [1440, 900], { reducedMotion: 'reduce' });
    await page.goto(base + 'index.html');
    const t = await page.locator('.hero .mailpiece').evaluate((el) => getComputedStyle(el).transform);
    if (t !== 'none') fail('hero card still rotated with reduced motion');
    const running = await page.evaluate(() => document.getAnimations().length);
    if (running) fail(`${running} animations running with reduced motion`);
    await ctx.close();
    console.log('ok   reduced motion');
  }

  await browser.close();
  server.close();
  console.log(`\n${problems.length} problem(s). Screenshots: ${OUT}`);
  process.exit(problems.length ? 1 : 0);
});
