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

  // 4. Diagrams are drawn to proportion (1/8 : 1/4 : 1/2 : full) and at one
  //    scale: every rate-card diagram has the same width at every viewport,
  //    each orange area is about twice the previous, the form's "Your spot"
  //    plan follows the same ratios, and the hero card's spots are in
  //    proportion where it is laid out as a card (>= 760px).
  const ratioOk = (r) => r > 1.9 && r < 2.2;
  for (const vp of [[360, 640], [390, 844], [768, 1024], [1024, 768], [1440, 900]]) {
    const { ctx, page } = await newPage(browser, base, vp);
    await page.goto(base + 'index.html');
    const plans = await page.$$eval('.ratecard .plan', (els) => els.map((el) => el.getBoundingClientRect().width));
    if (plans.length !== 4) fail(`@${vp[0]}: expected 4 rate card diagrams, found ${plans.length}`);
    if (Math.max(...plans) - Math.min(...plans) > 1) fail(`@${vp[0]}: rate card diagrams differ in width (${plans.map(Math.round).join(', ')})`);
    const areas = await page.$$eval('.ratecard .plan b', (els) => els.map((el) => { const r = el.getBoundingClientRect(); return r.width * r.height; }));
    for (let i = 1; i < areas.length; i++) {
      if (!ratioOk(areas[i] / areas[i - 1])) fail(`@${vp[0]}: rate card diagram ${i} is ${(areas[i] / areas[i - 1]).toFixed(2)}x the previous one, expected about 2x`);
    }
    const chosen = [];
    for (const v of ['solo', 'duo', 'full', 'custom']) {
      await page.selectOption('#f-spot', v);
      await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
      chosen.push(await page.$eval('#choice-plan b', (el) => { const r = el.getBoundingClientRect(); return r.width * r.height; }));
    }
    for (let i = 1; i < chosen.length; i++) {
      if (!ratioOk(chosen[i] / chosen[i - 1])) fail(`@${vp[0]}: form plan for size ${i} is ${(chosen[i] / chosen[i - 1]).toFixed(2)}x the previous one`);
    }
    if (vp[0] >= 760) {
      const a = await page.$$eval('.spot--yours, .spot--n1, .spot--n2, .spot--n3', (els) => els.map((el) => { const r = el.getBoundingClientRect(); return r.width * r.height; }));
      if (!ratioOk(a[0] / a[1]) || !ratioOk(a[1] / a[2]) || Math.abs(a[2] / a[3] - 1) > 0.02) fail(`@${vp[0]}: hero card spots out of proportion (${a.map(Math.round).join(', ')})`);
    }
    await ctx.close();
  }
  console.log('ok   proportions (rate card, form plan, hero card)');

  // 4b. Real dates from the visitor's clock, including month and year rollover
  for (const [now, deadline, mail, month, firstWeekday, tile] of [
    ['2026-10-08T12:00:00', 'Thursday, October 15', 'November 1', 'October 2026', 3, 'Thu Oct'],
    ['2026-10-15T12:00:00', 'today, Thursday, October 15', 'November 1', 'October 2026', 3, 'Thu Oct'],
    ['2026-10-20T12:00:00', 'Sunday, November 15', 'December 1', 'November 2026', 6, 'Sun Nov'],
    ['2026-12-31T12:00:00', 'Friday, January 15', 'February 1', 'January 2027', 4, 'Fri Jan'],
  ]) {
    const { ctx, page } = await newPage(browser, base, [1440, 900]);
    await page.clock.setFixedTime(new Date(now));
    await page.goto(base + 'index.html');
    const text = await page.locator('#next-deadline').innerText();
    if (!text.includes(deadline) || !text.includes(mail)) fail(`next deadline on ${now}: got "${text}"`);
    if ((await page.locator('#calendar-month').innerText()) !== month) fail(`calendar month on ${now}`);
    const lead = await page.$$eval('.calendar__days li', (els) => els.findIndex((li) => !li.classList.contains('is-blank')));
    if (lead !== firstWeekday) fail(`calendar on ${now}: day 1 in column ${lead}, expected ${firstWeekday}`);
    const marks = await page.$$eval('.calendar__days .is-you', (els) => els.map((e) => parseInt(e.textContent, 10)));
    if (marks.join() !== '15,20') fail(`calendar on ${now}: deadlines marked on ${marks.join()}`);
    if ((await page.locator('[data-step-day="15th"]').innerText()) !== tile) fail(`step tile on ${now}`);
    if (!(await page.locator('#choice-when').innerText()).includes(mail)) fail(`form summary date on ${now}`);
    await ctx.close();
  }
  console.log('ok   real dates and rollover');

  // 4c. Choosing a size: rate card, form, summary and mobile bar agree
  {
    const { ctx, page } = await newPage(browser, base, [390, 844]);
    await page.goto(base + 'index.html');
    await page.click('.size[data-size="full"] [data-package]');
    // the link targets the form: wait (up to 5s) for it to scroll into view
    await page.waitForFunction(() => { const t = document.getElementById('inquiry-form').getBoundingClientRect().top; return t >= 0 && t <= 200; }, null, { timeout: 5000 }).catch(() => {});
    if ((await page.locator('#f-spot').inputValue()) !== 'full') fail('choosing Full did not set the form');
    if (!(await page.locator('.size[data-size="full"]').evaluate((el) => el.classList.contains('is-selected')))) fail('Full column not marked selected');
    if ((await page.locator('.size[data-size="full"] [data-package]').getAttribute('aria-current')) !== 'true') fail('Full link missing aria-current');
    if (!(await page.locator('#choice-when').innerText()).startsWith('1/2 page')) fail('form summary does not describe Full');
    if (!(await page.locator('.sticky-cta p').innerText()).includes('$597')) fail('mobile bar does not show the chosen size');
    const top = await page.locator('#inquiry-form').evaluate((el) => el.getBoundingClientRect().top);
    if (top < 0 || top > 200) fail(`choosing a size did not bring the form into view (top ${Math.round(top)})`);
    await page.selectOption('#f-spot', 'solo');
    const selected = await page.$$eval('.size.is-selected', (els) => els.map((e) => e.dataset.size));
    if (selected.join() !== 'solo') fail(`changing the form did not update the rate card (${selected.join()})`);
    await page.selectOption('#f-spot', 'not-sure');
    if (await page.locator('.size.is-selected').count()) fail('"Not sure yet" still marks a size');
    await ctx.close();
    console.log('ok   size choice');
  }

  // 4d. Without JS: generic schedule, plain select, no summary plan
  {
    const { ctx, page } = await newPage(browser, base, [390, 844], { javaScriptEnabled: false });
    await page.goto(base + 'index.html');
    if (!(await page.locator('#next-deadline').innerText()).includes('15th')) fail('no-JS deadline sentence missing');
    if (await page.locator('.choice__plan').isVisible()) fail('no-JS shows an empty summary plan');
    if (!(await page.locator('#f-spot').isVisible())) fail('no-JS spot select not visible');
    if ((await page.$$('.ratecard .price')).length !== 4) fail('no-JS rate card prices missing');
    await ctx.close();
    console.log('ok   no-JS fallback');
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

  // 6. Reduced motion: nothing animates, including choosing a size
  {
    const { ctx, page } = await newPage(browser, base, [1440, 900], { reducedMotion: 'reduce' });
    await page.goto(base + 'index.html');
    if (await page.evaluate(() => document.getAnimations().length)) fail('animations running on load with reduced motion');
    await page.click('.size[data-size="duo"] [data-package]');
    await page.selectOption('#f-spot', 'full');
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
    if (running) fail(`${running} animations running after choosing a size with reduced motion`);
    await ctx.close();
    console.log('ok   reduced motion');
  }

  await browser.close();
  server.close();
  console.log(`\n${problems.length} problem(s). Screenshots: ${OUT}`);
  process.exit(problems.length ? 1 : 0);
});
