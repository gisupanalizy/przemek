import test from 'node:test';
import assert from 'node:assert/strict';
import { SwipeSteering } from '../race-gesture.ts';
import { createRace, emptyControls, FIXED_STEP, stepRace } from '../race-engine.ts';

test('touching the road does not jump the car or steer on a tap', () => {
  const swipe = new SwipeSteering();
  assert.equal(swipe.begin(1, 300, 0.4, 426), true);
  assert.equal(swipe.target, undefined);
  assert.equal(swipe.move(1, 304), false);
  assert.equal(swipe.target, undefined);
  swipe.move(1, 340);
  assert.ok(swipe.target! > 0.4 && swipe.target! < 1);
});

test('drag reverses direction immediately and releases without a latched turn', () => {
  const swipe = new SwipeSteering(); swipe.begin(1, 200, 0, 633);
  swipe.move(1, 145); assert.ok(swipe.target! < 0);
  swipe.move(1, 255); assert.ok(swipe.target! > 0);
  assert.equal(swipe.end(1), true); assert.equal(swipe.target, undefined);
  assert.equal(swipe.move(1, 100), false);
});

test('a second finger cannot steal or release the steering finger', () => {
  const swipe = new SwipeSteering(); swipe.begin(1, 200, 0, 426); swipe.move(1, 240);
  const target = swipe.target;
  assert.equal(swipe.begin(2, 350, 0, 426), false);
  assert.equal(swipe.move(2, 50), false); assert.equal(swipe.end(2), false);
  assert.equal(swipe.target, target);
  swipe.move(1, 170); assert.ok(swipe.target! < 0);
});

test('pause/cancel clears the target and ignores stale moves on resume', () => {
  const swipe = new SwipeSteering(); swipe.begin(1, 100, 0, 426); swipe.move(1, 150);
  swipe.reset(); assert.equal(swipe.target, undefined);
  assert.equal(swipe.move(1, 200), false);
  assert.equal(swipe.begin(2, 200, -0.4, 426), true);
  assert.equal(swipe.target, undefined); swipe.move(2, 180); assert.ok(swipe.target! < -0.4);
});

test('short swipes work at both phone widths and large swipes stay bounded', () => {
  for (const width of [426, 633]) {
    const swipe = new SwipeSteering(); swipe.begin(1, 200, 0, width);
    swipe.move(1, 250); assert.ok(swipe.target! > 0.3 && swipe.target! < 0.8);
    swipe.move(1, 1e6); assert.equal(swipe.target, 1.3);
    swipe.move(1, NaN); assert.equal(swipe.target, 1.3);
    swipe.move(1, -1e6); assert.equal(swipe.target, -1.3);
  }
});

test('swipe target follows normal physics while the second finger uses nitro', () => {
  const swipe = new SwipeSteering(); const race = createRace();
  race.rivals.forEach(rival => { rival.distance += 1000; });
  swipe.begin(1, 200, 0, 426); swipe.move(1, 145);
  for (let i = 0; i < 60; i++) stepRace(race, { ...emptyControls(), steerTarget: swipe.target, boost: true }, FIXED_STEP);
  assert.ok(race.x < -0.4 && race.x > -0.7); assert.equal(race.boost, true); assert.ok(race.fuel < 100);
  swipe.end(1); const x = race.x;
  for (let i = 0; i < 20; i++) stepRace(race, { ...emptyControls(), steerTarget: swipe.target }, FIXED_STEP);
  assert.equal(race.x, x);
});

test('buttons keep their full authority even when a drag target exists', () => {
  const race = createRace();
  stepRace(race, { ...emptyControls(), right: true, steerTarget: -1 }, FIXED_STEP);
  assert.ok(race.x > 0);
  const x = race.x;
  stepRace(race, { ...emptyControls(), left: true, right: true, steerTarget: -1 }, FIXED_STEP);
  assert.equal(race.x, x);
});

test('swipe steering cannot bypass corner grip loss by teleporting to its target', () => {
  const fast = createRace(), safe = createRace();
  for (const race of [fast, safe]) { race.distance = 950; race.rivals.forEach(r => { r.distance += 10000; }); }
  fast.speed = 110; safe.speed = 58;
  for (let i = 0; i < 60; i++) {
    stepRace(fast, { ...emptyControls(), steerTarget: 0 }, FIXED_STEP);
    stepRace(safe, { ...emptyControls(), steerTarget: 0, brake: true }, FIXED_STEP);
  }
  assert.ok(fast.x > safe.x + 0.2);
});
