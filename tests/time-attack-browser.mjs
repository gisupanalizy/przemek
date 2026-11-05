// Run with Vite on :5173 and PLAYWRIGHT_MODULE set if Playwright is not installed locally.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ATTACK_RECORD_KEY } from '../time-attack-engine.ts';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:5173';
const dir = fileURLToPath(new URL('../artifacts/time-attack/', import.meta.url));
await mkdir(dir, { recursive: true });
const report = { checks: [], errors: [], webkit: '' };
const check = (name, condition) => { assert.ok(condition, name); report.checks.push(name); console.log(`✓ ${name}`); };
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
const requests = []; page.on('request', req => requests.push(req.url()));
await page.goto(`${base}/#na-zyletki`); await page.locator('.ta-primary').first().waitFor();
check('direct link opens new game and does not fetch the old game', !requests.some(url => url.includes('/RaceGame.tsx')));
check('three accessible tabs', await page.getByRole('tab').count() === 3);
check('game names and order match the new branding', JSON.stringify((await page.getByRole('tab').allTextContents()).map(t => t.trim())) === JSON.stringify(['Limity toru', 'Przemek Racing', 'Przemek Racing 3D']));
await page.evaluate(() => localStorage.setItem('f1-w-punkt:sprint-record:v2', JSON.stringify({ score: 4242, position: 3 })));
await page.screenshot({ path: `${dir}/mobile-intro.png`, fullPage: true });
for (const width of [320, 390, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  check(`intro has no horizontal overflow at ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}
await page.setViewportSize({ width: 1440, height: 900 });
await page.screenshot({ path: `${dir}/desktop-intro.png`, fullPage: true });
await page.getByRole('tab', { name: 'Limity toru', exact: true }).click();
await page.getByRole('tab', { name: 'Limity toru', exact: true }).press('ArrowRight');
check('arrow key moves to Przemek Racing first', page.url().endsWith('#na-zyletki'));
await page.getByRole('tab', { name: 'Przemek Racing', exact: true }).press('End');
check('End selects Przemek Racing 3D', page.url().endsWith('#gra'));
await page.goBack(); await page.waitForURL('**/#na-zyletki');
check('browser back selects the loop game', await page.getByRole('tab', { name: 'Przemek Racing', exact: true }).getAttribute('aria-selected') === 'true');
await page.goForward(); await page.waitForURL('**/#gra');
await page.getByRole('tab', { name: 'Przemek Racing', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: 'Jedź na czas' }).click();
await page.getByRole('button', { name: 'Rozumiem, jadę' }).click();
await page.waitForFunction(() => !document.querySelector('.ta-steer').disabled);
await page.screenshot({ path: `${dir}/mobile-racing.png` });
const sizes = await page.locator('.ta-controls button').evaluateAll(nodes => nodes.map(node => ({ w: node.clientWidth, h: node.clientHeight })));
check('thumb controls are at least 48px', sizes.every(size => size.w >= 48 && size.h >= 48));
const steer = await page.locator('.ta-steer').boundingBox(), brake = await page.locator('.ta-brake').boundingBox();
const a = { id: 1, x: Math.round(steer.x + steer.width / 2), y: Math.round(steer.y + steer.height / 2) };
const b = { id: 2, x: Math.round(brake.x + brake.width / 2), y: Math.round(brake.y + brake.height / 2) };
const cdp = await context.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...a, x: a.x + 30 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, x: a.x + 30 }, b] });
await page.waitForTimeout(150);
check('native emulated two-finger input combines steering and braking', await page.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')) && await page.locator('.ta-steer').evaluate(node => Number(node.style.getPropertyValue('--steer')) > 0.1));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [b] });
await page.waitForTimeout(120);
check('releasing brake preserves steering finger', await page.locator('.ta-steer').evaluate(node => node.classList.contains('is-held')) && !await page.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
await page.waitForTimeout(180);
check('touch cancel releases steering', await page.locator('.ta-steer').evaluate(node => !node.classList.contains('is-held') && Math.abs(Number(node.style.getPropertyValue('--steer'))) < 0.1));
check('touch input does not scroll the game', await page.evaluate(() => scrollY === 0 || getComputedStyle(document.body).overflow === 'hidden'));
await page.setViewportSize({ width: 844, height: 390 });
await page.getByRole('button', { name: 'Wznów przejazd' }).waitFor();
check('orientation change requires explicit resume', await page.locator('.ta-dialog').isVisible());
check('pause isolates background controls', await page.locator('.ta-stage').evaluate(node => node.inert));
await page.getByRole('button', { name: 'Wznów przejazd' }).click();
await page.waitForFunction(() => !document.querySelector('.ta-steer').disabled);
await page.screenshot({ path: `${dir}/landscape-racing.png` });
await page.evaluate(() => {
  window.__taDraws = 0;
  const original = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (...args) { if (this.canvas.closest('.ta')) window.__taDraws++; return original.apply(this, args); };
  location.hash = '#gra';
});
await page.waitForTimeout(180);
const draws = await page.evaluate(() => window.__taDraws);
await page.waitForTimeout(200);
check('inactive new game stops its animation loop', await page.evaluate(() => window.__taDraws) === draws);
await page.getByRole('button', { name: 'Graj w oknie' }).click();
await page.waitForFunction(() => !document.querySelector('.rg-countdown-overlay'));
await page.waitForTimeout(150);
await page.evaluate(() => location.hash = '#na-zyletki');
await page.getByRole('button', { name: 'Wznów przejazd' }).waitFor();
check('returning to new game retains its paused attempt', await page.locator('.ta-clock strong').textContent() !== '0:00.00');
await page.evaluate(() => location.hash = '#gra');
await page.getByRole('button', { name: /Wznów/ }).waitFor();
check('old game also pauses when left', await page.getByRole('button', { name: /Wznów/ }).isVisible());
await context.close();

// Deterministic animation clock exercises the complete UI/record path in seconds.
const finishContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await finishContext.addInitScript(() => {
  let id = 0, now = 1000; const callbacks = new Map();
  window.requestAnimationFrame = fn => { callbacks.set(++id, fn); return id; };
  window.cancelAnimationFrame = key => callbacks.delete(key);
  window.__frame = () => { now += 1000 / 120; const jobs = [...callbacks.values()]; callbacks.clear(); jobs.forEach(fn => fn(now)); };
  window.__pointerId = null;
  document.addEventListener('pointerdown', e => { if (e.target.closest('.ta-steer')) window.__pointerId = e.pointerId; });
});
const finishPage = await finishContext.newPage(); finishPage.on('pageerror', error => report.errors.push(error.message));
await finishPage.goto(`${base}/#na-zyletki`); await finishPage.locator('.ta-primary').first().waitFor();
await finishPage.evaluate(() => localStorage.setItem('f1-w-punkt:sprint-record:v2', JSON.stringify({ score: 4242, position: 3 })));
await finishPage.getByRole('button', { name: 'Jedź na czas' }).click(); await finishPage.getByRole('button', { name: 'Rozumiem, jadę' }).click();
await finishPage.evaluate(() => { for (let i = 0; i < 362; i++) window.__frame(); });
await finishPage.waitForFunction(() => !document.querySelector('.ta-steer').disabled);
const finishCDP = await finishContext.newCDPSession(finishPage);
const box = await finishPage.locator('.ta-steer').boundingBox();
const origin = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
await finishCDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...origin }] });
await finishPage.exposeFunction('captureTurn', async () => { await finishPage.screenshot({ path: `${dir}/mobile-corner.png` }); });
const driveUI = async ({ origin, slow = false }) => {
  const { referenceInput } = await import('/time-attack-engine.ts');
  const node = document.querySelector('.ta-steer'), radius = Math.max(36, Math.min(68, node.clientWidth * 0.32));
  // Test-only telemetry reader. The driver never mutates game state: it sends
  // pointer/keyboard input, while the real animation loop advances the engine.
  const section = document.querySelector('.ta');
  let fiber = section[Object.keys(section).find(key => key.startsWith('__reactFiber$'))];
  let realRace;
  for (; fiber && !realRace; fiber = fiber.return) {
    for (let hook = fiber.memoizedState; hook; hook = hook.next) {
      const value = hook.memoizedState?.current;
      if (value && Array.isArray(value.trace) && typeof value.checkpoint === 'number') { realRace = value; break; }
    }
  }
  if (!realRace) throw new Error('Could not read test telemetry');
  let braking = false, captured = slow;
  for (let i = 0; i < 15000 && !realRace.finished; i++) {
    const input = referenceInput(realRace);
    if (slow && realRace.time < 4) input.brake = true;
    node.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: window.__pointerId, clientX: origin.x + input.steer * radius, clientY: origin.y }));
    if (input.brake !== braking) { node.dispatchEvent(new KeyboardEvent(input.brake ? 'keydown' : 'keyup', { key: 's', bubbles: true })); braking = input.brake; }
    window.__frame();
    if (!captured && realRace.s > 560) {
      captured = true; await new Promise(resolve => setTimeout(resolve, 0)); await window.captureTurn();
    }
  }
  node.dispatchEvent(new KeyboardEvent('keyup', { key: 's', bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: window.__pointerId, clientX: origin.x, clientY: origin.y }));
  return { time: realRace.time, finished: realRace.finished, hits: realRace.hits };
};
const completed = await finishPage.evaluate(driveUI, { origin });
await finishPage.waitForTimeout(100);
await finishPage.getByRole('button', { name: 'Jeszcze raz' }).waitFor();
check('complete controlled UI run reaches finish', completed.finished && completed.hits === 0);
await finishPage.screenshot({ path: `${dir}/mobile-finish.png` });
check('new record stores replay and three sectors', await finishPage.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)); return data.time > 45 && data.time < 60 && data.sectors.length === 3 && data.trace.length > 500; }, ATTACK_RECORD_KEY));
check('new record never overwrites old record', await finishPage.evaluate(() => JSON.parse(localStorage.getItem('f1-w-punkt:sprint-record:v2')).score === 4242));
const savedBest = await finishPage.evaluate(key => localStorage.getItem(key), ATTACK_RECORD_KEY);
await finishPage.getByRole('button', { name: 'Jeszcze raz' }).click();
await finishPage.evaluate(() => { for (let i = 0; i < 123; i++) window.__frame(); });
await finishPage.waitForFunction(() => !document.querySelector('.ta-steer').disabled);
const retryClock = await finishPage.locator('.ta-clock strong').textContent();
check('restart resets time and keeps the ghost', retryClock.startsWith('0:00.') && Number(retryClock.slice(5)) < 10 && await finishPage.locator('.ta-delta strong').textContent() !== '—');
await finishCDP.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
await finishCDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...origin }] });
const slower = await finishPage.evaluate(driveUI, { origin, slow: true });
await finishPage.getByRole('button', { name: 'Jeszcze raz' }).waitFor();
check('a slower last lap leaves the best time and ghost unchanged', slower.finished && slower.time > completed.time && await finishPage.evaluate(key => localStorage.getItem(key), ATTACK_RECORD_KEY) === savedBest);
await finishPage.screenshot({ path: `${dir}/mobile-second-finish.png` });
await finishPage.getByRole('button', { name: 'Wróć do zakładek' }).click();
await finishPage.reload(); await finishPage.locator('.ta-best strong').waitFor();
check('record survives reload', !(await finishPage.locator('.ta-best strong').textContent()).includes('Pierwsze'));
await finishContext.close(); await browser.close();

let safari;
try {
  safari = await webkit.launch({ headless: true });
  const p = await safari.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  p.on('pageerror', error => report.errors.push(`WebKit: ${error.message}`));
  await p.goto(`${base}/#na-zyletki`); await p.getByRole('button', { name: 'Jedź na czas' }).waitFor();
  await p.getByRole('button', { name: 'Jedź na czas' }).click(); await p.getByRole('button', { name: 'Rozumiem, jadę' }).click();
  await p.waitForFunction(() => !document.querySelector('.ta-steer').disabled);
  await p.keyboard.down('ArrowRight'); await p.keyboard.down('s'); await p.waitForTimeout(150);
  check('WebKit combines steering and brake', await p.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')) && await p.locator('.ta-steer').evaluate(node => Number(node.style.getPropertyValue('--steer')) > 0.1));
  await p.keyboard.up('ArrowRight'); await p.keyboard.up('s');
  await p.screenshot({ path: `${dir}/webkit-racing.png` }); report.webkit = 'Desktop WebKit with mobile viewport passed; not a physical iPhone.';
} catch (error) { report.webkit = `WebKit unavailable or failed: ${error.message}`; throw error; }
finally { if (safari) await safari.close(); await writeFile(`${dir}/browser-report.json`, JSON.stringify(report, null, 2)); }
check('no browser JavaScript errors', report.errors.length === 0);
await writeFile(`${dir}/browser-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
