// With the worktree preview running: TEST_URL=http://127.0.0.1:5186 PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/time-attack-snacks-browser.mjs
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createAttack, stepAttack, referenceInput, recordFromRace, ATTACK_RECORD_KEY, SNACK_RECORD_KEY } from '../time-attack-engine.ts';
import { SPRINT_RECORD_KEY } from '../race-engine.ts';
import { SNACK_RULES_VERSION, SNACK_TOTALS } from '../time-attack-snacks.ts';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:5186';
const dir = fileURLToPath(new URL('../artifacts/snacks/', import.meta.url));
await mkdir(dir, { recursive: true });
const report = { checks: [], errors: [], runs: [] };
const check = (name, pass) => { assert.ok(pass, name); report.checks.push(name); console.log(`✓ ${name}`); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, hasTouch: true, deviceScaleFactor: 1 });
const fakeClock = () => {
  let id = 0, now = 1000; const jobs = new Map();
  window.requestAnimationFrame = fn => { jobs.set(++id, fn); return id; };
  window.cancelAnimationFrame = key => jobs.delete(key);
  window.__frame = () => { now += 1000 / 120; const batch = [...jobs.values()]; jobs.clear(); batch.forEach(fn => fn(now)); };
  document.addEventListener('pointerdown', e => { if (e.target.closest('.ta-road')) window.__pointerId = e.pointerId; });
};
await context.addInitScript(fakeClock);
const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.message));
const frames = async (count) => { await page.evaluate(n => { for (let i = 0; i < n; i++) window.__frame(); }, count); await page.waitForTimeout(20); };
const telemetry = () => {
  const section = document.querySelector('.ta');
  let fiber = section[Object.keys(section).find(key => key.startsWith('__reactFiber$'))];
  for (; fiber; fiber = fiber.return) for (let hook = fiber.memoizedState; hook; hook = hook.next) {
    const value = hook.memoizedState?.current;
    if (value && Array.isArray(value.trace) && typeof value.checkpoint === 'number') return value;
  }
  throw new Error('Race telemetry missing');
};
const state = async () => page.evaluate(`(${telemetry.toString()})()`);
const driveTo = async ({ stopS = 1265, collect = true, slow = false, origin }) => {
  const { referenceInput } = await import('/time-attack-engine.ts');
  const { SNACK_ITEMS } = await import('/time-attack-snacks.ts');
  const node = document.querySelector('.ta-road'), radius = Math.max(64, Math.min(96, node.clientWidth * 0.18));
  const section = document.querySelector('.ta');
  let fiber = section[Object.keys(section).find(key => key.startsWith('__reactFiber$'))], race;
  for (; fiber && !race; fiber = fiber.return) for (let hook = fiber.memoizedState; hook; hook = hook.next) {
    const value = hook.memoizedState?.current;
    if (value && Array.isArray(value.trace) && typeof value.checkpoint === 'number') { race = value; break; }
  }
  let braking = false;
  for (let i = 0; i < 20000 && !race.finished && race.s < stopS; i++) {
    const next = SNACK_ITEMS.find((item, index) => !race.snacks?.collected[index] && item.s >= race.s);
    const target = collect && next && next.s - race.s < 50 ? next.x : 0;
    const input = referenceInput(race); if (slow && race.time < 8) input.brake = true; input.steer = Math.max(-1, Math.min(1, input.steer + target * 0.13));
    node.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: window.__pointerId, clientX: origin.x + input.steer * radius, clientY: origin.y }));
    if (input.brake !== braking) { document.dispatchEvent(new KeyboardEvent(input.brake ? 'keydown' : 'keyup', { key: 's', bubbles: true })); braking = input.brake; }
    window.__frame();
    if (i % 240 === 0) await new Promise(resolve => setTimeout(resolve, 0));
  }
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 's', bubbles: true }));
  await new Promise(resolve => setTimeout(resolve, 0));
  return { time: race.time, finished: race.finished, hits: race.hits, offences: race.offences, penalty: race.penalty, snacks: { ...race.snacks } };
};
const cdp = await context.newCDPSession(page);
const grab = async () => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {});
  const box = await page.locator('.ta-road').boundingBox(); const origin = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...origin }] }); return origin;
};
try {
  await page.goto(`${base}/#na-zyletki`); await page.locator('.ta-mode-toggle input').waitFor();
  check('mode is off by default and classic medals are visible', !await page.locator('.ta-mode-toggle input').isChecked() && await page.locator('.ta-medal-targets').isVisible());
  const classic = createAttack(); while (!classic.finished) stepAttack(classic, referenceInput(classic));
  const classicRaw = JSON.stringify(recordFromRace(classic));
  await page.evaluate(({ key, raw, sprintKey }) => { localStorage.setItem(key, raw); localStorage.setItem('f1-w-punkt:time-attack:tutorial:v1', 'seen'); localStorage.setItem(sprintKey, JSON.stringify({ score: 4242, position: 3, offences: 0, penalty: 0 })); }, { key: ATTACK_RECORD_KEY, raw: classicRaw, sprintKey: SPRINT_RECORD_KEY });
  await page.reload(); await page.locator('.ta-mode-toggle input').waitFor();
  await page.locator('.ta-mode-toggle input').check();
  check('arcade selects a separate empty record and hides classic medals', (await page.locator('.ta-best').innerText()).includes('Pierwsze') && await page.locator('.ta-medal-targets').count() === 0);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    check(`menu does not overflow at ${width}px`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: `${dir}/menu-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Jedź na czas' }).click(); await frames(200);
  check('hunger freezes during countdown', (await state()).snacks.hunger === 0);
  await frames(170); let origin = await grab();
  await page.evaluate(driveTo, { stopS: 215, origin }); await page.waitForTimeout(30);
  await page.screenshot({ path: `${dir}/mobile-pickup.png` });
  await page.evaluate(driveTo, { stopS: 260, origin }); await page.waitForTimeout(30);
  check('first kebab and first can are collectible and only the canvas is blurred', (await state()).snacks.specials === 1 && (await state()).snacks.kebabs === 1 && await page.locator('.ta-road canvas').evaluate(node => getComputedStyle(node).filter === 'blur(3px)') && await page.locator('.ta-hud').evaluate(node => getComputedStyle(node).filter === 'none'));
  check('thumb controls remain at least 48px', await page.locator('.ta-controls button').evaluateAll(nodes => nodes.every(node => node.clientWidth >= 48 && node.clientHeight >= 48)));
  await page.screenshot({ path: `${dir}/mobile-specjal.png` });
  await page.getByRole('button', { name: 'Wstrzymaj grę' }).click(); const paused = (await state()).snacks; await frames(240);
  check('pause freezes hunger, boost, blur and digestion', JSON.stringify((await state()).snacks) === JSON.stringify(paused));
  await page.getByRole('button', { name: 'Wznów przejazd' }).click(); await frames(300);
  check('resume countdown also freezes snack effects', JSON.stringify((await state()).snacks) === JSON.stringify(paused));
  await frames(70); origin = await grab();
  await page.evaluate(driveTo, { stopS: 620, origin }); await page.waitForTimeout(30);
  check('mid-lap items remain collectible and kebab activates digestion', (await state()).snacks.specials === 2 && (await state()).snacks.kebabs === 2 && (await state()).snacks.hunger < 2 && (await state()).snacks.digestionLeft > 3);
  await page.screenshot({ path: `${dir}/mobile-kebab.png` });
  await page.evaluate(driveTo, { stopS: 980, origin }); await page.waitForTimeout(30);
  check('third can and third kebab are collectible', (await state()).snacks.specials === 3 && (await state()).snacks.kebabs === 3);
  const result = await page.evaluate(driveTo, { origin }); report.runs.push(result);
  await page.getByRole('button', { name: 'Jeszcze raz' }).waitFor();
  check('full UI run finishes with four cans and four kebabs on asphalt', result.finished && result.snacks.specials === SNACK_TOTALS.specjal && result.snacks.kebabs === SNACK_TOTALS.kebab && result.offences === 0 && result.hits === 0);
  check('arcade result reports configured collection and no classic medal', (await page.locator('.ta-dialog').innerText()).includes(`Specjale: ${SNACK_TOTALS.specjal}/${SNACK_TOTALS.specjal} · Kebaby: ${SNACK_TOTALS.kebab}/${SNACK_TOTALS.kebab}`) && !(await page.locator('.ta-dialog').innerText()).includes('Do brązu'));
  check('classic and 3D records are unchanged', await page.evaluate(({ key, raw, sprintKey }) => localStorage.getItem(key) === raw && JSON.parse(localStorage.getItem(sprintKey)).score === 4242, { key: ATTACK_RECORD_KEY, raw: classicRaw, sprintKey: SPRINT_RECORD_KEY }));
  const arcadeRaw = await page.evaluate(key => localStorage.getItem(key), SNACK_RECORD_KEY);
  check('arcade record has mode, current rules, penalties and its own ghost', JSON.parse(arcadeRaw).mode === 'snacks' && JSON.parse(arcadeRaw).rules === SNACK_RULES_VERSION && JSON.parse(arcadeRaw).result === JSON.parse(arcadeRaw).drivingTime + JSON.parse(arcadeRaw).penalty && JSON.parse(arcadeRaw).trace.length > 500);
  await page.screenshot({ path: `${dir}/mobile-finish.png` });
  await page.getByRole('button', { name: 'Jeszcze raz' }).click(); await frames(125);
  check('retry clears hunger, timers and collected items while showing arcade ghost', (await state()).snacks.specials === 0 && (await state()).snacks.kebabs === 0 && (await state()).snacks.hunger < 1 && await page.locator('.ta-delta strong').textContent() !== '—');
  origin = await grab(); await page.evaluate(driveTo, { stopS: 1050, collect: false, slow: true, origin }); await page.waitForTimeout(30);
  check('missing all items produces critical hunger without ending the attempt', (await state()).snacks.hunger > 80 && !(await state()).finished && (await state()).snacks.specials === 0 && (await state()).snacks.kebabs === 0);
  await page.setViewportSize({ width: 844, height: 390 }); await page.getByRole('button', { name: 'Wznów przejazd' }).waitFor();
  await page.getByRole('button', { name: 'Wznów przejazd' }).click(); await frames(365); await page.waitForTimeout(30);
  check('landscape HUD fits between timer and controls', await page.locator('.ta-snack-hud').evaluate(node => { const r = node.getBoundingClientRect(); const road = document.querySelector('.ta-road').getBoundingClientRect(); return r.top >= 0 && r.bottom <= road.top + 1 && road.height > 100; }));
  await page.screenshot({ path: `${dir}/landscape-hunger.png` });
  origin = await grab(); const missed = await page.evaluate(driveTo, { collect: false, origin }); report.runs.push(missed);
  await page.getByRole('button', { name: 'Jeszcze raz' }).waitFor();
  check('all items can be missed on asphalt and slower lap preserves the best ghost', missed.finished && missed.snacks.specials === 0 && missed.snacks.kebabs === 0 && missed.offences === 0 && missed.hits === 0 && missed.time > result.time && await page.evaluate(key => localStorage.getItem(key), SNACK_RECORD_KEY) === arcadeRaw);
  await page.getByRole('button', { name: 'Wróć do zakładek' }).click(); await page.locator('.ta-mode-toggle input').uncheck();
  check('switching modes restores classic best time', (await page.locator('.ta-best').innerText()).includes('0:47.86'));
  await page.reload(); await page.locator('.ta-mode-toggle input').check();
  check('arcade record survives reload', !(await page.locator('.ta-best').innerText()).includes('Pierwsze'));

  const broken = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await broken.addInitScript(fakeClock);
  await broken.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new Error('Storage blocked'); };
    Storage.prototype.getItem = () => { throw new Error('Storage blocked'); };
    window.__fallbackTokens = 0; const fill = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (text, ...args) { if (text === 'S' || text === 'K') window.__fallbackTokens++; return fill.call(this, text, ...args); };
  });
  await broken.route('**/game/*-sprite.png', route => route.abort());
  const bp = await broken.newPage(); bp.on('pageerror', e => report.errors.push(e.message));
  await bp.goto(`${base}/#na-zyletki`); await bp.locator('.ta-mode-toggle input').check(); await bp.getByRole('button', { name: 'Jedź na czas' }).click(); await bp.getByRole('button', { name: 'Rozumiem, jadę' }).click();
  await bp.evaluate(() => { for (let i = 0; i < 370; i++) window.__frame(); }); await bp.waitForTimeout(30);
  const brokenCdp = await broken.newCDPSession(bp), bb = await bp.locator('.ta-road').boundingBox();
  const bo = { x: Math.round(bb.x + bb.width / 2), y: Math.round(bb.y + bb.height / 2) };
  await brokenCdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...bo }] });
  const br = await bp.evaluate(driveTo, { stopS: 215, origin: bo }); await bp.waitForTimeout(30);
  check('failed sprites render fallback tokens', await bp.evaluate(() => window.__fallbackTokens > 0));
  await bp.screenshot({ path: `${dir}/fallback-sprite.png` });
  const blockedResult = await bp.evaluate(driveTo, { origin: bo });
  await bp.getByRole('button', { name: 'Jeszcze raz' }).waitFor();
  check('blocked storage still allows finishing and keeps a session record', blockedResult.finished && await bp.locator('.ta-storage-note').isVisible() && (await bp.locator('.ta-dialog h2').innerText()).includes('rekord'));
  await bp.getByRole('button', { name: 'Jeszcze raz' }).click();
  check('session ghost remains available after a blocked save', await bp.locator('.ta-delta strong').textContent() !== '—');
  await broken.close();
  check('no JavaScript errors', report.errors.length === 0);
} finally {
  await writeFile(`${dir}/browser-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
