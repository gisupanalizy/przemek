import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, emptyControls, FIXED_STEP, position, RACE_SECONDS, score, stepRace, triggerBoost, type Race, type Controls } from '../race-engine.ts';
import { OFFROAD_LIMIT, projectRoadPoint, trackAt } from '../race-track.ts';

function advance(race: Race, seconds: number, input = emptyControls()) {
  for (let i = 0; i < Math.round(seconds / FIXED_STEP); i++) stepRace(race, input, FIXED_STEP);
}

test('all eight cars have real progress: passing and being repassed change rank', () => {
  const race = createRace();
  assert.equal(position(race), 8);
  race.distance = race.rivals[3].distance + 1; assert.equal(position(race), 4);
  race.rivals[0].distance = race.distance + 1; assert.equal(position(race), 5);
});

test('a complete race ends at exactly 90 seconds and cannot keep scoring', () => {
  const race = createRace(); advance(race, 95);
  assert.equal(race.time, RACE_SECONDS); assert.equal(race.finished, true);
  const saved = structuredClone(race); advance(race, 5, { ...emptyControls(), boost: true });
  assert.deepEqual(race, saved); assert.ok(score(race) > 0);
});

test('fixed-step simulation gives identical outcomes at 30, 60 and 120 render fps', () => {
  const outcomes = [30, 60, 120].map(fps => {
    const race = createRace(); let accumulator = 0;
    for (let frame = 0; frame < fps * 30; frame++) {
      accumulator += 1 / fps;
      while (accumulator + 1e-10 >= FIXED_STEP) { stepRace(race, emptyControls(), FIXED_STEP); accumulator -= FIXED_STEP; }
    }
    return race;
  });
  assert.deepEqual(outcomes[0], outcomes[1]); assert.deepEqual(outcomes[1], outcomes[2]);
});

test('multi-control input combines steering and ERS; fuel is bounded and brake wins', () => {
  const race = createRace(); race.speed = 79;
  advance(race, 0.25, { ...emptyControls(), right: true, boost: true });
  assert.ok(race.x > 0); assert.ok(race.speed > 79); assert.ok(race.fuel < 100);
  const fuel = race.fuel;
  advance(race, 0.25, { ...emptyControls(), brake: true, boost: true });
  assert.equal(race.boost, false); assert.equal(race.fuel, fuel); assert.ok(race.speed < 85);
  race.fuel = 0.01; advance(race, 0.1, { ...emptyControls(), boost: true });
  assert.ok(race.fuel >= 0); assert.equal(race.boost, false);
});

test('grass slows the car, cancels a combo and cannot give ERS', () => {
  const race = createRace(); race.x = 1.4; race.speed = 79; race.combo = 3;
  advance(race, 0.4, { ...emptyControls(), right: true, boost: true });
  assert.ok(race.speed < 79); assert.equal(race.combo, 0); assert.equal(race.boost, false);
  assert.ok(race.x <= 1.45);
});

test('one collision has a grace period instead of damaging the player every tick', () => {
  const race = createRace(); race.speed = 79; race.rivals[0].distance = 4; race.rivals[0].x = 0;
  stepRace(race, emptyControls(), FIXED_STEP);
  assert.equal(race.hits, 1); assert.ok(race.speed < 79); assert.ok(race.protection > 0);
  for (let i = 0; i < 60; i++) {
    race.rivals[0].distance = race.distance + 4; race.rivals[0].x = race.x;
    stepRace(race, emptyControls(), FIXED_STEP);
  }
  assert.equal(race.hits, 1);
});

test('a clean pass earns points, combo and fuel; contact passes do not', () => {
  const race = createRace(); race.speed = 100; race.fuel = 20; race.x = -0.5;
  race.rivals[0].distance = 0.1; race.rivals[0].x = 0.5;
  stepRace(race, emptyControls(), FIXED_STEP);
  assert.equal(race.cleanPasses, 1); assert.equal(race.combo, 1); assert.ok(race.fuel >= 38 && race.fuel < 39);
  assert.ok(score(race) >= 200);
  race.rivals[1].distance = race.distance + 0.1; race.rivals[1].x = 0.5; race.cleanCooldown = 1;
  stepRace(race, emptyControls(), FIXED_STEP); assert.equal(race.cleanPasses, 1);
});

test('a short ERS tap keeps accelerating after pointer release', () => {
  const race = createRace(); race.rivals.forEach(r => r.distance += 500); race.speed = 88;
  triggerBoost(race); advance(race, 0.5);
  assert.equal(race.boost, true); assert.ok(race.speed >= 117);
  assert.ok(race.fuel < 90); advance(race, 1.3); assert.equal(race.boost, false);
});

test('the rolling start allows a first clean overtake within five seconds', () => {
  const race = createRace(); assert.ok(race.speed > 70);
  while (race.time < 5 && race.cleanPasses === 0) stepRace(race, emptyControls(), FIXED_STEP);
  assert.ok(race.cleanPasses >= 1); assert.ok(position(race) < 8);
});

test('fuel recharges off boost but holding an empty boost does not flicker it on', () => {
  const race = createRace(); race.fuel = 30; advance(race, 1);
  assert.ok(race.fuel > 33); race.fuel = 0;
  advance(race, 1, { ...emptyControls(), boost: true });
  assert.equal(race.boost, false); assert.equal(race.fuel, 0);
});

function driveRace(skilled: boolean) {
  const race = createRace();
  while (!race.finished) {
    const track = trackAt(race.distance);
    const near = race.rivals.find(r => r.distance - race.distance > -16 && r.distance - race.distance < 65);
    const target = near ? (near.x < 0 ? 0.58 : -0.58) : 0;
    const brake = skilled && (track.inCorner || track.nextDistance < 85)
      && race.speed > (track.inCorner ? track.safeSpeed : track.nextSpeed) + 3;
    const input: Controls = { left: race.x > target + 0.035, right: race.x < target - 0.035,
      brake, boost: skilled ? !track.inCorner && track.nextDistance > 110 : true };
    stepRace(race, input, FIXED_STEP);
  }
  return race;
}

test('braking before corners and attacking on straights can win the race', () => {
  const race = driveRace(true);
  assert.ok(position(race) <= 3, `finished P${position(race)}`);
  assert.ok(race.cleanPasses >= 5); assert.ok(race.cleanCorners >= 5); assert.equal(race.slides, 0);
});

test('F1 corner timing beats constant boost with the same avoidance reactions', () => {
  const skilled = driveRace(true), reckless = driveRace(false);
  assert.ok(position(skilled) < position(reckless));
  assert.ok(skilled.distance > reckless.distance + 300);
  assert.ok(score(skilled) > score(reckless) + 1000);
  assert.ok(reckless.slides >= 1);
});

test('physics edge and the visible road use identical coordinates at every viewport/depth', () => {
  for (const [width, height] of [[426, 320], [633, 390], [1080, 900]]) {
    for (const z of [0, 6, 24, 160]) for (const lane of [-OFFROAD_LIMIT, 0, OFFROAD_LIMIT]) {
      const point = projectRoadPoint(width, height, z, lane);
      const visibleLane = (width / 2 - point.x) / point.half;
      assert.ok(Math.abs(visibleLane - lane) < 1e-9);
    }
  }
});

test('a single ERS tap passes two real opponents within three seconds', () => {
  const race = createRace(); triggerBoost(race); advance(race, 3);
  assert.ok(position(race) <= 6); assert.ok(race.cleanPasses >= 2);
  assert.ok(race.rivals[0].distance < race.distance);
});

test('aero tow gives speed only directly behind a nearby rival on a straight', () => {
  const race = createRace(); race.speed = 90; race.rivals[0].x = 0; race.rivals[0].distance = 40;
  race.rivals.slice(1).forEach(rival => { rival.distance += 1000; });
  advance(race, 0.25); assert.equal(race.slipstream, true); assert.ok(race.speed > 90);
  race.x = 0.6; advance(race, 0.1); assert.equal(race.slipstream, false);
});
