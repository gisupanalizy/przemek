// Run with Vite on :5173 and PLAYWRIGHT_MODULE set if Playwright is not installed locally.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ATTACK_RECORD_KEY, formatTime, medalFor } from '../time-attack-engine.ts';
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:5173';
const dir = process.env.TEST_ARTIFACT_DIR || fileURLToPath(new URL('../artifacts/time-attack/', import.meta.url));
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
check('menu names Pętla Morena and Gdańsk Morena', await page.locator('.ta-race-details').innerText().then(text => text.includes('Pętla Morena') && text.includes('Gdańsk Morena')));
check('large cockpit portrait and real-game preview are in the menu', await page.locator('.ta-driver-hero img').isVisible() && await page.locator('.ta-preview canvas').isVisible());
check('three accessible tabs', await page.getByRole('tab').count() === 3);
check('game names and order match the new branding', JSON.stringify((await page.getByRole('tab').allTextContents()).map(t => t.trim())) === JSON.stringify(['Limity toru', 'Przemek Racing', 'Przemek Racing 3D']));
await page.evaluate(() => localStorage.setItem('f1-w-punkt:sprint-record:v2', JSON.stringify({ score: 4242, position: 3 })));
await page.screenshot({ path: `${dir}/mobile-intro.png`, fullPage: true });
for (const width of [320, 390, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  check(`intro has no horizontal overflow at ${width}`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  if (width === 320 || width === 768) await page.screenshot({ path: `${dir}/menu-${width}.png`, fullPage: true });
}
await page.setViewportSize({ width: 1440, height: 900 });
check('desktop portrait stays within the intended hero height', (await page.locator('.ta-hero-driver').boundingBox()).height <= 480);
await page.screenshot({ path: `${dir}/desktop-intro.png`, fullPage: true });
await page.getByRole('tab', { name: 'Limity toru', exact: true }).click();
await page.getByRole('tab', { name: 'Limity toru', exact: true }).press('ArrowRight');
check('arrow key moves to Przemek Racing first', page.url().endsWith('#na-zyletki'));
await page.getByRole('tab', { name: 'Przemek Racing', exact: true }).press('End');
check('End selects Przemek Racing 3D', page.url().endsWith('#gra'));
await page.goBack(); await page.waitForURL('**/#na-zyletki');
check('browser back selects the loop game', await page.getByRole('tab', { name: 'Przemek Racing', exact: true }).getAttribute('aria-selected') === 'true');
await page.goForward(); await page.waitForURL('**/#gra');
check('3D track uses Morena Sprint and Gdańsk Morena', await page.locator('.rg-course-label').innerText().then(text => text.includes('Morena Sprint') && text.includes('Gdańsk Morena')));
await page.screenshot({ path: `${dir}/sprint-desktop-intro.png`, fullPage: true });
await page.getByRole('tab', { name: 'Przemek Racing', exact: true }).click();
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: 'Jedź na czas' }).click();
await page.getByRole('button', { name: 'Rozumiem, jadę' }).click();
check('portrait countdown shows the large face', await page.locator('.ta-driver-countdown img').isVisible());
await page.screenshot({ path: `${dir}/mobile-countdown.png` });
await page.waitForFunction(() => !document.querySelector('.ta-stage').inert);
check('large face disappears on start and small corner portrait remains', await page.locator('.ta-driver-countdown').count() === 0 && await page.locator('.ta-road-top .ta-driver img').isVisible());
check('menu preview unmounts during play', await page.locator('.ta-preview').count() === 0);
await page.screenshot({ path: `${dir}/mobile-racing.png` });
await page.locator('.ta-ghost-toggle').click();
check('ghost toggle does not claim the road gesture', await page.locator('.ta-drive-status').evaluate(node => !node.classList.contains('is-held')));
await page.locator('.ta-ghost-toggle').click();
const sizes = await page.locator('.ta-controls button').evaluateAll(nodes => nodes.map(node => ({ w: node.clientWidth, h: node.clientHeight })));
check('thumb controls are at least 48px', sizes.every(size => size.w >= 48 && size.h >= 48));
const road = await page.locator('.ta-road').boundingBox(), brake = await page.locator('.ta-brake').boundingBox();
const a = { id: 1, x: Math.round(road.x + road.width / 2), y: Math.round(road.y + road.height / 2) };
const b = { id: 2, x: Math.round(brake.x + brake.width / 2), y: Math.round(brake.y + brake.height / 2) };
const cdp = await context.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...a, x: a.x + 40, y: a.y + 50 }] });
await page.waitForTimeout(150);
check('one-finger road gesture combines steering and braking', await page.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')) && await page.locator('.ta-drive-status').evaluate(node => Number(node.style.getPropertyValue('--steer')) > 0.1));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...a, x: a.x + 40, y: a.y + 20 }] });
await page.waitForTimeout(120);
check('lifting the drag releases brake but preserves steering', await page.locator('.ta-drive-status').evaluate(node => node.classList.contains('is-held')) && !await page.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...a, x: a.x + 40, y: a.y + 20 }, b] });
await page.waitForTimeout(120);
check('optional brake button works with the road gesture', await page.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [b] });
await page.waitForTimeout(120);
check('releasing optional brake preserves steering finger', await page.locator('.ta-drive-status').evaluate(node => node.classList.contains('is-held')) && !await page.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')));
await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
await page.waitForTimeout(180);
check('touch cancel releases steering', await page.locator('.ta-drive-status').evaluate(node => !node.classList.contains('is-held') && Math.abs(Number(node.style.getPropertyValue('--steer'))) < 0.1));
check('touch input does not scroll the game', await page.evaluate(() => scrollY === 0 || getComputedStyle(document.body).overflow === 'hidden'));
await page.setViewportSize({ width: 844, height: 390 });
await page.getByRole('button', { name: 'Wznów przejazd' }).waitFor();
check('orientation change requires explicit resume', await page.locator('.ta-dialog').isVisible());
check('pause isolates background controls', await page.locator('.ta-stage').evaluate(node => node.inert));
await page.getByRole('button', { name: 'Wznów przejazd' }).click();
check('landscape resume shows the large portrait', await page.locator('.ta-driver-countdown img').isVisible());
await page.screenshot({ path: `${dir}/landscape-countdown.png` });
const countdownGeometry = await page.locator('.ta-countdown').evaluate(node => {
  const image = node.querySelector('img').getBoundingClientRect(), number = node.querySelector('.ta-countdown-copy').getBoundingClientRect();
  return image.right <= number.left && image.top >= 0 && image.bottom <= innerHeight && number.right <= innerWidth;
});
check('landscape number is beside the face without overlap or clipping', countdownGeometry);
await page.waitForFunction(() => !document.querySelector('.ta-stage').inert);
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
  document.addEventListener('pointerdown', e => { if (e.target.closest('.ta-road')) window.__pointerId = e.pointerId; });
});
const finishPage = await finishContext.newPage(); finishPage.on('pageerror', error => report.errors.push(error.message));
await finishPage.goto(`${base}/#na-zyletki`); await finishPage.locator('.ta-primary').first().waitFor();
const previewBefore = await finishPage.locator('.ta-preview canvas').evaluate(node => node.toDataURL());
await finishPage.evaluate(() => { for (let i = 0; i < 240; i++) window.__frame(); });
check('menu demo animates without a running attempt or a stored record', previewBefore !== await finishPage.locator('.ta-preview canvas').evaluate(node => node.toDataURL()) && await finishPage.evaluate(key => localStorage.getItem(key) === null && document.querySelector('.ta-stage').hidden, ATTACK_RECORD_KEY));
await finishPage.evaluate(() => {
  window.__previewDraws = 0;
  const fill = CanvasRenderingContext2D.prototype.fillRect;
  CanvasRenderingContext2D.prototype.fillRect = function (...args) { if (this.canvas.closest('.ta-preview')) window.__previewDraws++; return fill.apply(this, args); };
  Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
  for (let i = 0; i < 60; i++) window.__frame();
});
check('hidden-page event stops the menu demo', await finishPage.evaluate(() => window.__previewDraws === 0));
await finishPage.evaluate(() => {
  Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange'));
  for (let i = 0; i < 60; i++) window.__frame();
});
check('visible-page event restarts the menu demo', await finishPage.evaluate(() => window.__previewDraws > 0));
await finishPage.evaluate(() => localStorage.setItem('f1-w-punkt:sprint-record:v2', JSON.stringify({ score: 4242, position: 3 })));
await finishPage.getByRole('button', { name: 'Jedź na czas' }).click(); await finishPage.getByRole('button', { name: 'Rozumiem, jadę' }).click();
check('fresh attempt starts at three', await finishPage.locator('.ta-countdown-copy strong').textContent() === '3');
await finishPage.evaluate(() => { for (let i = 0; i < 122; i++) window.__frame(); });
check('race clock stays frozen while the large face counts down', await finishPage.locator('.ta-clock strong').textContent() === '0:00.00' && await finishPage.locator('.ta-countdown-copy strong').textContent() === '2');
const portraitGeometry = await finishPage.locator('.ta-countdown').evaluate(node => {
  const image = node.querySelector('img').getBoundingClientRect(), number = node.querySelector('.ta-countdown-copy').getBoundingClientRect();
  return image.bottom <= number.top && image.top >= 0 && number.bottom <= innerHeight;
});
check('portrait number is below the face without overlap or clipping', portraitGeometry);
await finishPage.evaluate(() => { for (let i = 0; i < 240; i++) window.__frame(); });
await finishPage.waitForFunction(() => !document.querySelector('.ta-stage').inert);
const finishCDP = await finishContext.newCDPSession(finishPage);
const box = await finishPage.locator('.ta-road').boundingBox();
const origin = { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
await finishCDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...origin }] });
await finishPage.exposeFunction('captureTurn', async () => { await finishPage.screenshot({ path: `${dir}/mobile-corner.png` }); });
const driveUI = async ({ origin, slow = false, penalized = false }) => {
  const { referenceInput, clamp, yawLimit } = await import('/time-attack-engine.ts');
  const { curvatureAt } = await import('/time-attack-track.ts');
  const node = document.querySelector('.ta-road'), radius = Math.max(64, Math.min(96, node.clientWidth * 0.18));
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
  let braking = false, captured = slow || penalized, returning = false;
  for (let i = 0; i < 15000 && !realRace.finished; i++) {
    let input = referenceInput(realRace);
    if (slow && realRace.time < 4) input.brake = true;
    if (penalized && (realRace.offences < 4 || realRace.x > 0.5 || Math.abs(realRace.heading) > 0.2)) {
      if (realRace.outside) returning = true;
      if (returning && Math.abs(realRace.x) < 0.5 && Math.abs(realRace.heading) < 0.2 && realRace.offences < 4) returning = false;
      const target = returning || realRace.offences >= 4 ? 0 : 8.3;
      input = { brake: true, steer: clamp(curvatureAt(realRace.s + 3) * realRace.speed / yawLimit(realRace.speed)
        - realRace.heading * 3.5 - (realRace.x - target) * 0.6, -1, 1) };
    }
    node.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: window.__pointerId, clientX: origin.x + input.steer * radius, clientY: origin.y }));
    if (input.brake !== braking) { node.dispatchEvent(new KeyboardEvent(input.brake ? 'keydown' : 'keyup', { key: 's', bubbles: true })); braking = input.brake; }
    window.__frame();
    if (!captured && realRace.s > 560) {
      captured = true; await new Promise(resolve => setTimeout(resolve, 0)); await window.captureTurn();
    }
  }
  node.dispatchEvent(new KeyboardEvent('keyup', { key: 's', bubbles: true }));
  node.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: window.__pointerId, clientX: origin.x, clientY: origin.y }));
  return { time: realRace.time, finished: realRace.finished, hits: realRace.hits, offences: realRace.offences, penalty: realRace.penalty };
};
const completed = await finishPage.evaluate(driveUI, { origin });
await finishPage.waitForTimeout(100);
await finishPage.getByRole('button', { name: 'Jeszcze raz' }).waitFor();
check('complete controlled UI run reaches finish', completed.finished && completed.hits === 0);
await finishPage.screenshot({ path: `${dir}/mobile-finish.png` });
check('medal result uses the Morena name', (await finishPage.locator('.ta-dialog').innerText()).includes('Pętla Morena'));
check('new record stores driving time, result, penalties, replay and three sectors', await finishPage.evaluate(key => { const data = JSON.parse(localStorage.getItem(key)); return data.drivingTime > 45 && data.drivingTime < 60 && data.result === data.drivingTime + data.penalty && data.penalty === 0 && data.offences === 0 && data.sectors.length === 3 && data.trace.length > 500; }, ATTACK_RECORD_KEY));
check('new record never overwrites old record', await finishPage.evaluate(() => JSON.parse(localStorage.getItem('f1-w-punkt:sprint-record:v2')).score === 4242));
const savedBest = await finishPage.evaluate(key => localStorage.getItem(key), ATTACK_RECORD_KEY);
await finishPage.getByRole('button', { name: 'Jeszcze raz' }).click();
check('retry retains its one-second countdown and large face', await finishPage.locator('.ta-countdown-copy strong').textContent() === '1' && await finishPage.locator('.ta-driver-countdown img').isVisible());
await finishPage.evaluate(() => { for (let i = 0; i < 123; i++) window.__frame(); });
await finishPage.waitForFunction(() => !document.querySelector('.ta-stage').inert);
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
const reloadedRecord = await finishPage.evaluate(key => localStorage.getItem(key), ATTACK_RECORD_KEY);
await finishPage.evaluate(() => { for (let i = 0; i < 240; i++) window.__frame(); });
check('menu demo preserves the existing loop record', await finishPage.evaluate(key => localStorage.getItem(key), ATTACK_RECORD_KEY) === reloadedRecord);
await finishPage.getByRole('button', { name: 'Jedź na czas' }).click();
await finishPage.evaluate(() => { for (let i = 0; i < 362; i++) window.__frame(); });
await finishPage.waitForFunction(() => !document.querySelector('.ta-stage').inert);
check('existing loop record and ghost reload after renaming', await finishPage.locator('.ta-delta strong').textContent() !== '—' && await finishPage.locator('.ta-ghost-toggle').getAttribute('aria-pressed') === 'true');

// A fresh test record is earned by four actual exits using controls, without changing race state.
await finishPage.evaluate(key => localStorage.removeItem(key), ATTACK_RECORD_KEY);
await finishPage.reload();
await finishPage.getByRole('button', { name: 'Jedź na czas' }).click();
await finishPage.evaluate(() => { for (let i = 0; i < 362; i++) window.__frame(); });
await finishPage.waitForFunction(() => !document.querySelector('.ta-stage').inert);
await finishCDP.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
await finishCDP.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, ...origin }] });
const penalized = await finishPage.evaluate(driveUI, { origin, penalized: true });
await finishPage.getByRole('button', { name: 'Jeszcze raz' }).waitFor();
check('four actual exits finish with a five-second penalty', penalized.finished && penalized.offences === 4 && penalized.penalty === 5);
check('finish separates driving time, penalty and result', await finishPage.locator('.ta-result-account strong').allTextContents().then(values =>
  JSON.stringify(values) === JSON.stringify([formatTime(penalized.time), '+5 s', formatTime(penalized.time + 5)])));
const medal = medalFor(penalized.time + 5);
check('finish medal matches the result including the penalty', medal
  ? await finishPage.locator(`.ta-dialog > p.ta-medal-${medal}`).count() === 1
  : await finishPage.locator('.ta-dialog > p').first().innerText().then(text => text.startsWith('Do brązu:')));
check('penalized record stores the official result and a ghost on driving time', await finishPage.evaluate(key => {
  const record = JSON.parse(localStorage.getItem(key));
  return record.offences === 4 && record.penalty === 5 && record.result === record.drivingTime + 5
    && record.trace.at(-1).t === record.drivingTime && record.sectors.at(-1) === record.drivingTime;
}, ATTACK_RECORD_KEY));
await finishPage.screenshot({ path: `${dir}/mobile-penalty-finish.png` });
await finishContext.close();

// Reduced motion and a failed optional image must not prevent a lap.
const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(`${base}/#na-zyletki`); await reducedPage.locator('.ta-preview canvas').waitFor();
const still = await reducedPage.locator('.ta-preview canvas').evaluate(node => node.toDataURL());
await reducedPage.waitForTimeout(200);
check('reduced-motion preview stays static', still === await reducedPage.locator('.ta-preview canvas').evaluate(node => node.toDataURL()));
await reducedPage.getByRole('button', { name: 'Jedź na czas' }).click(); await reducedPage.getByRole('button', { name: 'Rozumiem, jadę' }).click();
await reducedPage.screenshot({ path: `${dir}/desktop-countdown.png` });
await reducedContext.close();
const failedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
await failedContext.route('**/game/driver.png', route => route.abort());
const failedPage = await failedContext.newPage();
await failedPage.goto(`${base}/#na-zyletki`); await failedPage.getByRole('button', { name: 'Wczytaj portret' }).waitFor();
await failedPage.getByRole('button', { name: 'Jedź na czas' }).click(); await failedPage.getByRole('button', { name: 'Rozumiem, jadę' }).click();
await failedPage.waitForFunction(() => !document.querySelector('.ta-stage').inert);
check('failed driver image does not block countdown or racing', await failedPage.locator('.ta-clock').isVisible());
await failedContext.close(); await browser.close();

let safari;
try {
  safari = await webkit.launch({ headless: true });
  const p = await safari.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  p.on('pageerror', error => report.errors.push(`WebKit: ${error.message}`));
  await p.goto(`${base}/#na-zyletki`); await p.getByRole('button', { name: 'Jedź na czas' }).waitFor();
  await p.getByRole('button', { name: 'Jedź na czas' }).click(); await p.getByRole('button', { name: 'Rozumiem, jadę' }).click();
  await p.waitForFunction(() => !document.querySelector('.ta-stage').inert);
  await p.keyboard.down('ArrowRight'); await p.keyboard.down('s'); await p.waitForTimeout(150);
  check('WebKit combines steering and brake', await p.locator('.ta-brake').evaluate(node => node.classList.contains('is-active')) && await p.locator('.ta-drive-status').evaluate(node => Number(node.style.getPropertyValue('--steer')) > 0.1));
  await p.keyboard.up('ArrowRight'); await p.keyboard.up('s');
  await p.screenshot({ path: `${dir}/webkit-racing.png` }); report.webkit = 'Desktop WebKit with mobile viewport passed; not a physical iPhone.';
} catch (error) { report.webkit = `WebKit unavailable or failed: ${error.message}`; throw error; }
finally { if (safari) await safari.close(); await writeFile(`${dir}/browser-report.json`, JSON.stringify(report, null, 2)); }
check('no browser JavaScript errors', report.errors.length === 0);
await writeFile(`${dir}/browser-report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
