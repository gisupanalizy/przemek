import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTACK_STEP, createAttack, stepAttack, referenceInput, REFERENCE_TIME, ghostAt, ghostTimeAt, recordFromRace, parseAttackRecord, medalFor, MEDALS, formatTime } from '../time-attack-engine.ts';
import { BARRIER, CAR_HALF, CHECKPOINTS, ROAD_HALF, SECTOR_ENDS, TRACK_LENGTH, curvatureAt, trackPoint } from '../time-attack-track.ts';

function drive(braking = true) {
  const race = createAttack();
  while (!race.finished && race.time < 180) stepAttack(race, referenceInput(race, braking));
  return race;
}
test('six-corner clean reference finishes in 45–60 seconds and calibrates medals', () => {
  const race = drive();
  assert.equal(race.finished, true); assert.equal(race.hits, 0);
  assert.ok(race.time >= 45 && race.time <= 60); assert.ok(Math.abs(race.time - REFERENCE_TIME) < 1e-8);
  assert.equal(race.checkpoint, CHECKPOINTS.length); assert.equal(race.sectors.length, 3);
  assert.equal(race.sectors[2], race.time);
  assert.equal(medalFor(MEDALS.gold), 'gold'); assert.equal(medalFor(MEDALS.gold + 0.001), 'silver');
  assert.equal(medalFor(MEDALS.silver + 0.001), 'bronze'); assert.equal(medalFor(MEDALS.bronze + 0.001), null);
});
test('braking beats full throttle with the same reference steering controller', () => {
  const clean = drive(), fullGas = drive(false);
  assert.ok(fullGas.time > clean.time + 1); assert.ok(fullGas.hits > clean.hits);
});
test('fixed simulation is identical at 30, 60 and 120 render fps', () => {
  const outcomes = [30, 60, 120].map(fps => {
    const race = createAttack(); let accumulator = 0;
    for (let frame = 0; frame < fps * 60 && !race.finished; frame++) {
      accumulator += 1 / fps;
      while (accumulator + 1e-10 >= ATTACK_STEP && !race.finished) {
        stepAttack(race, referenceInput(race)); accumulator -= ATTACK_STEP;
      }
    }
    return race;
  });
  assert.deepEqual(outcomes[0], outcomes[1]); assert.deepEqual(outcomes[1], outcomes[2]);
});
test('steering and braking combine, releasing steering centers the wheel, never teleports', () => {
  const race = createAttack(); race.speed = 30;
  stepAttack(race, { steer: 0.7, brake: true });
  assert.ok(race.steering > 0); assert.ok(race.speed < 30); assert.ok(race.x > 0 && race.x < 0.1);
  for (let i = 0; i < 120; i++) stepAttack(race, { steer: 0, brake: false });
  assert.ok(Math.abs(race.steering) < 0.00001);
});
test('grass slows down, barriers match the geometry and collisions have a cooldown', () => {
  const race = createAttack(); race.x = ROAD_HALF + 0.2; race.speed = 34;
  for (let i = 0; i < 60; i++) stepAttack(race, { steer: 0, brake: false });
  assert.equal(race.offroad, true); assert.ok(race.speed < 30);
  race.x = BARRIER; stepAttack(race, { steer: 1, brake: false });
  assert.equal(race.hits, 1); assert.ok(race.speed < 18); assert.ok(race.x + CAR_HALF <= BARRIER);
  for (let i = 0; i < 50; i++) { race.x = BARRIER; stepAttack(race, { steer: 1, brake: false }); }
  assert.equal(race.hits, 1);
});
test('a missed checkpoint blocks progress and the finish until the player returns to asphalt', () => {
  const race = createAttack(); race.s = CHECKPOINTS[0] - 0.01; race.x = ROAD_HALF + 0.2;
  stepAttack(race, { steer: 0, brake: false });
  assert.ok(race.s < CHECKPOINTS[0]); assert.equal(race.checkpoint, 0); assert.match(race.event, /BRAMKA/);
  race.x = 0; stepAttack(race, { steer: 0, brake: false }); assert.equal(race.checkpoint, 1);
  race.s = TRACK_LENGTH - 0.01;
  stepAttack(race, { steer: 0, brake: false });
  // Large external jumps cannot grant skipped gates or finish: see monotonic gate guard.
  assert.equal(race.finished, false);
});
test('each sector records a crossing once and finishing freezes time and trace', () => {
  const race = drive(), frozen = structuredClone(race);
  for (let i = 0; i < 60; i++) stepAttack(race, { steer: 1, brake: false });
  assert.deepEqual(race, frozen);
  assert.ok(race.sectors.every((t, i) => t > (race.sectors[i - 1] ?? 0)));
});
test('ghost interpolation matches saved samples, endpoints and distance-based delta', () => {
  const race = drive(), trace = race.trace;
  assert.deepEqual(ghostAt(trace, 0), trace[0]);
  for (const frame of [trace[20], trace[250], trace.at(-1)!]) {
    const ghost = ghostAt(trace, frame.t)!;
    assert.ok(Math.abs(ghost.s - frame.s) < 1e-7); assert.ok(Math.abs(ghost.x - frame.x) < 1e-7);
    assert.ok(Math.abs(ghostTimeAt(trace, frame.s)! - frame.t) < 1e-7);
  }
  assert.equal(ghostAt(trace, race.time + 1), null);
  assert.equal(ghostAt([], 1), null); assert.equal(ghostTimeAt([], 20), null);
});
test('records round-trip separately and reject malformed, stale, oversized or non-monotonic ghosts', () => {
  const record = recordFromRace(drive());
  assert.deepEqual(parseAttackRecord(JSON.stringify(record)), record);
  for (const raw of [null, '{', '{}', 'null', 'x'.repeat(4_000_001)]) assert.equal(parseAttackRecord(raw), null);
  for (const patch of [{ version: 99 }, { track: 'old-track' }, { time: -1 }, { sectors: [1, 1, record.time] }, { trace: [...record.trace].reverse() }]) {
    assert.equal(parseAttackRecord(JSON.stringify({ ...record, ...patch })), null);
  }
  const broken = structuredClone(record); broken.trace[10].x = 100;
  assert.equal(parseAttackRecord(JSON.stringify(broken)), null);
});
test('track tangent and lateral offsets share the exact road normal', () => {
  for (let s = 0; s < TRACK_LENGTH; s += 11) {
    const a = trackPoint(s), b = trackPoint(s, ROAD_HALF);
    assert.ok(Math.abs(Math.hypot(b.x - a.x, b.y - a.y) - ROAD_HALF) < 1e-8);
    assert.ok(Math.abs(a.curve - curvatureAt(s)) < 1e-8);
  }
  assert.ok(SECTOR_ENDS.every(s => CHECKPOINTS.includes(s)));
});
test('a slow driver can continue beyond 60 seconds, and invalid input cannot poison physics', () => {
  const race = createAttack();
  for (let i = 0; i < 120 * 65; i++) stepAttack(race, { steer: Number.NaN, brake: true });
  assert.ok(race.time > 60); assert.equal(race.finished, false);
  assert.ok([race.time, race.s, race.x, race.speed].every(Number.isFinite));
  const saved = structuredClone(race); stepAttack(race, { steer: 0, brake: false }, Number.NaN); assert.deepEqual(race, saved);
});
test('clock formatting never rounds a displayed centisecond into an invalid second', () => {
  assert.equal(formatTime(59.999), '0:59.99'); assert.equal(formatTime(60), '1:00.00'); assert.equal(formatTime(-1), '0:00.00');
});
