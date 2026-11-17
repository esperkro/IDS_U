/* IDS Training — end-to-end checks with Playwright.
   Usage:  node tests/e2e.js                 (serves the repo on a local port)
           BASE=file:///path/to/repo/ node tests/e2e.js
           SHOTS=/some/dir node tests/e2e.js (also save screenshots)
   Codes are read from labs-access.js at runtime — no plaintext codes here. */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS || '';
let failures = 0, passes = 0;
function ok(cond, msg) { if (cond) { passes++; } else { failures++; console.log('  ✗ ' + msg); } }

function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
  return new Promise(res => {
    const s = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end(); }
      rsp.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, () => res(s));
  });
}

async function overflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
async function shot(page, name) { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name), fullPage: true }); }

async function exercise(page) {
  // Generic: click every interactive element inside the current chapter.
  const sel = '.chapter:not([hidden])';
  for (const s of ['.choice-btn', '.flag-item', '.myth-card', '.sort-actions .btn:first-child', '.toggle']) {
    const els = await page.$$(`${sel} ${s}`);
    for (const e of els) { if (await e.isVisible() && await e.isEnabled()) await e.click(); }
  }
  for (const cb of await page.$$(`${sel} .checklist input[type=checkbox]`)) await cb.check();
  for (const r of await page.$$(`${sel} input[type=range]`)) await r.evaluate(el => { el.value = el.min; el.dispatchEvent(new Event('input', { bubbles: true })); el.value = el.max; el.dispatchEvent(new Event('input', { bubbles: true })); });
  for (const s of await page.$$(`${sel} .sim select`)) {
    const vals = await s.evaluate(el => Array.from(el.options).map(o => o.value));
    await s.selectOption(vals[vals.length - 1]);
  }
  // Terminals: Hint + Run until complete
  const terms = await page.$$(`${sel} .term`);
  for (const t of terms) {
    const block = await t.evaluateHandle(el => el.closest('.block'));
    const n = await block.evaluate(b => b.querySelectorAll('.tasks li').length);
    for (let i = 0; i < n; i++) {
      await (await block.$('.term-form button[type=button]')).click();
      await (await block.$('.term-form input')).press('Enter');
    }
    const done = await block.evaluate(b => b.querySelectorAll('.tasks li.is-done').length);
    ok(done === n, `terminal completes all ${n} tasks via hints (got ${done})`);
  }
  // Remaining sim buttons (custom simulations)
  const btns = await page.$$(`${sel} .sim button`);
  for (const b of btns) { if (await b.isVisible() && await b.isEnabled()) { await b.click({ timeout: 2000 }).catch(() => {}); } }
}

async function answerQuiz(page, mode /* 'right' | 'wrong' */, useKeys) {
  await page.click('#quiz-start');
  for (let i = 0; i < 6; i++) {
    await page.waitForSelector('.quiz-opt:not([disabled])');
    const idx = await page.evaluate((mode) => {
      const qText = document.querySelector('.quiz-q').innerHTML;
      const lab = document.querySelector('.quiz').closest('[id]') && document.title.match(/Lab (\d\d)/)[1];
      const bank = window.QUESTIONS['lab' + lab];
      const q = bank.find(x => x.q === qText);
      const correct = q.options[q.answer];
      const opts = Array.from(document.querySelectorAll('.quiz-opt .opt-text')).map(e => e.innerHTML);
      const c = opts.indexOf(correct);
      return mode === 'right' ? c : (c + 1) % opts.length;
    }, mode);
    if (useKeys) { await page.locator('body').focus().catch(() => {}); await page.keyboard.press('ABCD'[idx]); }
    else await page.click(`.quiz-opt >> nth=${idx}`);
    await page.waitForSelector('#quiz-next');
    ok(await page.isVisible('#quiz-fb .verdict'), 'explanation shown after answer');
    if (useKeys) await page.keyboard.press('Enter'); else await page.click('#quiz-next');
  }
  await page.waitForSelector('#quiz-score');
  return page.textContent('#quiz-score');
}

(async () => {
  let server = null, BASE = process.env.BASE;
  if (!BASE) { server = await serve(); BASE = `http://127.0.0.1:${server.address().port}/`; }
  console.log('Testing', BASE);
  const browser = await chromium.launch();
  const LAB_IDS = Array.from({ length: 20 }, (_, i) => 'lab' + String(i + 1).padStart(2, '0'));

  for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'phone', width: 390, height: 844 }]) {
    console.log(`\n== ${vp.name} ${vp.width}px ==`);
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => d.accept());

    // Unauthenticated -> sign-in
    await page.goto(BASE + 'index.html');
    ok(page.url().includes('signin.html'), 'dashboard without profile redirects to sign-in');
    await page.fill('#name', 'Test Student'); await page.fill('#cohort', 'QA');
    await page.click('button[type=submit]');
    await page.waitForURL(/index\.html/);
    ok((await page.$$('.lab-card')).length === 20, '20 lab cards on dashboard');
    ok((await page.$$('.lab-card.is-locked')).length === 19, '19 locked labs for a new profile');
    ok(await page.isVisible('.lab-card[data-lab=lab01] .upnext-flag'), 'UP NEXT marker on lab 01');
    ok(await overflow(page) <= 0, 'dashboard: no horizontal overflow');
    await shot(page, `dashboard-${vp.name}.png`);

    // Lock guard
    await page.goto(BASE + 'lab05.html');
    await page.waitForSelector('#unlock-dialog[open]');
    ok(/index\.html/.test(page.url()), 'locked lab redirects to dashboard');
    ok((await page.textContent('#unlock-title')).includes('Lab 05'), 'unlock dialog opened for lab 05');
    await page.fill('#unlock-input', 'WRONG-CODE-00'); await page.click('#unlock-submit');
    ok((await page.textContent('#unlock-msg')).includes('not recognised'), 'wrong code rejected');
    await shot(page, `locked-dialog-${vp.name}.png`);
    await page.click('#unlock-cancel');

    // Code entry for lab02 (lower case, spaces instead of dashes)
    const code02 = await page.evaluate(() => LabsAccess.codeFor('lab02'));
    ok(code02 && !/[a-z]/.test(code02), 'lab02 code decodes');
    await page.fill('#code-input', code02.toLowerCase().replace(/-/g, ' '));
    await page.click('#code-form button[type=submit]');
    ok(!(await page.$('.lab-card[data-lab=lab02].is-locked')), 'lab02 unlocked by code (case/space-insensitive)');
    ok((await page.$$('#vault li code')).length === 1, 'code saved in Intel Vault');

    // Quiz: fail -> cooldown + review
    await page.goto(BASE + 'lab01.html#playbook');
    await page.waitForSelector('#quiz-start');
    const failScore = await answerQuiz(page, 'wrong', false);
    ok(failScore.trim() === '0 / 6', 'all-wrong attempt scores 0/6');
    ok(await page.isDisabled('#quiz-retry'), 'retry disabled during cooldown');
    ok(/retry in \d+ s/.test(await page.textContent('#quiz-cooldown')), 'cooldown countdown shown');
    ok((await page.$$('#quiz-review li')).length === 6, 'missed questions reviewed with explanations');
    await shot(page, `quiz-fail-${vp.name}.png`);
    await page.reload();
    await page.waitForSelector('#quiz-start');
    ok(await page.isDisabled('#quiz-start'), 'cooldown persists across reload');
    await page.evaluate(() => { const d = JSON.parse(localStorage.getItem('idsTraining.v1')); d.profiles[d.current].cooldowns.lab01 = 0; localStorage.setItem('idsTraining.v1', JSON.stringify(d)); });
    await page.reload(); await page.waitForSelector('#quiz-start:not([disabled])');

    // Quiz: pass with keyboard (A–D + Enter)
    const passScore = await answerQuiz(page, 'right', true);
    ok(passScore.trim() === '6 / 6', 'all-right attempt via keyboard scores 6/6');
    const intel = (await page.textContent('[data-intel-code=lab02]')).trim();
    ok(intel === code02, 'pass reveals next lab code (Intel recovered)');
    ok(await page.isVisible('.badge-award svg.is-earned'), 'hexagon badge awarded');
    await shot(page, `quiz-pass-${vp.name}.png`);
    await page.click('text=Unlock & open next lab');
    await page.waitForURL(/lab02\.html/);
    ok(true, 'unlock & open goes to lab02');

    // Randomisation
    const rnd = await page.evaluate(() => {
      const seen = new Set(), orders = new Set();
      for (let i = 0; i < 12; i++) { const d = Assessment.draw(QUESTIONS.lab01); seen.add(d.map(q => q.q).join('|')); orders.add(d[0].options.join('|') + d[0].answer); }
      const d = Assessment.draw(QUESTIONS.lab01);
      return { sets: seen.size, orders: orders.size, len: d.length, core: d.filter(q => q.level === 'core').length };
    });
    ok(rnd.len === 6 && rnd.core === 3, 'draw = 6 questions (3 core + 3 scenario)');
    ok(rnd.sets > 1 && rnd.orders > 1, `quiz draws are randomised (${rnd.sets} distinct sets, ${rnd.orders} option orders)`);

    // Master code
    await page.goto(BASE + 'index.html');
    const master = await page.evaluate(() => atob(LabsAccess.MASTER_OBF).split('').reverse().join(''));
    await page.fill('#code-input', master); await page.click('#code-form button[type=submit]');
    ok((await page.$$('.lab-card.is-locked')).length === 0, 'master code unlocks every lab');
    ok((await page.$$('.badge-case figure')).length === 20, 'badge case shows all 20 badges');

    // Every lab: chapters, interactions, overflow, keyboard
    for (const id of LAB_IDS) {
      await page.goto(BASE + id + '.html');
      await page.waitForSelector('#tab-briefing');
      ok(page.url().includes(id), `${id} opens (no redirect)`);
      for (const ch of ['briefing', 'scenario', 'practice', 'playbook']) {
        await page.click('#tab-' + ch);
        ok(!(await page.isHidden('#ch-' + ch)), `${id} ${ch} visible`);
        await exercise(page);
        const ov = await overflow(page);
        ok(ov <= 0, `${id} ${ch}: no horizontal overflow (${ov}px)`);
        if (id === 'lab14' && ch === 'practice') await shot(page, `lab14-practice-${vp.name}.png`);
        if (id === 'lab05' && ch === 'practice') await shot(page, `lab05-practice-${vp.name}.png`);
        if (id === 'lab03' && ch === 'briefing') await shot(page, `lab03-briefing-${vp.name}.png`);
      }
      // Arrow keys
      await page.click('#tab-scenario');
      await page.locator('h1').click();
      await page.keyboard.press('ArrowRight');
      ok((await page.getAttribute('#tab-practice', 'aria-selected')) === 'true', `${id} ArrowRight → next chapter`);
      await page.keyboard.press('ArrowLeft');
      ok((await page.getAttribute('#tab-scenario', 'aria-selected')) === 'true', `${id} ArrowLeft → previous chapter`);
      ok((await page.$$eval('.quiz', q => q.length)) === 1, `${id} has a quiz`);
      const bank = await page.evaluate(i => (QUESTIONS[i] || []).length, id);
      ok(bank === 8, `${id} has 8 questions`);
    }

    // Resume at last chapter
    await page.goto(BASE + 'lab07.html'); await page.click('#tab-practice');
    await page.goto(BASE + 'lab07.html'); await page.waitForSelector('#tab-practice');
    ok((await page.getAttribute('#tab-practice', 'aria-selected')) === 'true', 'lab resumes at last chapter');

    // Fresh profile: master-free guard still blocks
    await page.goto(BASE + 'index.html');
    await page.click('#signout');
    await page.waitForURL(/signin\.html/);
    await page.fill('#name', 'Second Student'); await page.click('button[type=submit]');
    await page.goto(BASE + 'lab20.html');
    await page.waitForSelector('#unlock-dialog[open]');
    ok(true, 'new profile is guarded on lab20');

    ok(errors.length === 0, 'no console errors: ' + errors.slice(0, 5).join(' | '));
    await ctx.close();
  }
  await browser.close();
  if (server) server.close();
  console.log(`\n${passes} checks passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
})();
