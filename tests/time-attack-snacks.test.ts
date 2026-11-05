import test from 'node:test';
import assert from 'node:assert/strict';
import { createSnacks, advanceSnacks, collectSnacks, snackPace, SNACK_BALANCE, SNACK_ITEMS, SNACK_RULES_VERSION, SNACK_TOTALS } from '../time-attack-snacks.ts';
import { ATTACK_STEP, ATTACK_RECORD_KEY, SNACK_RECORD_KEY, attackRecordKey, createAttack, stepAttack, referenceInput, recordFromRace, parseAttackRecord } from '../time-attack-engine.ts';
import { CAR_HALF, ROAD_HALF, curvatureAt } from '../time-attack-track.ts';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} ≠ ${b}`);
function advance(race: ReturnType<typeof createAttack>, seconds: number, brake = false) {
  for (let i = 0; i < Math.round(seconds / ATTACK_STEP); i++) stepAttack(race, { steer: 0, brake });
}
function drive(mode: 'classic' | 'snacks', collect = true, fps = 120) {
  const race = createAttack(mode); let accumulator = 0;
  for (let frame = 0; frame < fps * 120 && !race.finished; frame++) {
    accumulator += 1 / fps;
    while (accumulator + 1e-10 >= ATTACK_STEP && !race.finished) {
      const next = SNACK_ITEMS.find((item, i) => !race.snacks?.collected[i] && item.s >= race.s);
      const target = collect && next && next.s - race.s < 50 ? next.x : 0;
      const input = referenceInput(race); input.steer = Math.max(-1, Math.min(1, input.steer + target * 0.13));
      stepAttack(race, input); accumulator -= ATTACK_STEP;
    }
  }
  return race;
}
test('arcade items are four cans and four kebabs distributed across safe straights', () => {
  assert.deepEqual(SNACK_ITEMS, [
    { kind: 'kebab', s: 40, x: -2.8 },
    { kind: 'specjal', s: 220, x: 2.8 },
    { kind: 'specjal', s: 440, x: -2.8 },
    { kind: 'kebab', s: 600, x: 2.8 },
    { kind: 'kebab', s: 760, x: -2.8 },
    { kind: 'specjal', s: 890, x: 2.8 },
    { kind: 'kebab', s: 1020, x: -2.8 },
    { kind: 'specjal', s: 1180, x: 2.8 },
  ]);
  assert.deepEqual(SNACK_TOTALS, { specjal: 4, kebab: 4 });
  for (const item of SNACK_ITEMS) {
    assert.equal(curvatureAt(item.s), 0);
    assert.ok(Math.abs(item.x) > SNACK_BALANCE.pickupHalfWidth);
    assert.ok(Math.abs(item.x) + SNACK_BALANCE.pickupHalfWidth + CAR_HALF < ROAD_HALF);
  }
  assert.equal(createAttack().snacks, null); assert.equal(createAttack().mode, 'classic');
});
test('hunger warns at 70%, slows progressively from 80%, and caps without ending the run', () => {
  const state = createSnacks(); advanceSnacks(state, 31.5); near(state.hunger, 70); assert.match(state.message, /CZAS NA KEBABA/);
  advanceSnacks(state, 4.5); near(state.hunger, 80); near(snackPace(state, false), 1);
  advanceSnacks(state, 4.5); near(state.hunger, 90); near(snackPace(state, false), 0.8);
  advanceSnacks(state, 20); near(state.hunger, 100); near(snackPace(state, false), 0.6);
  const race = createAttack('snacks'); advance(race, 50, true); assert.equal(race.finished, false); assert.equal(race.snacks!.hunger, 100);
});
test('swept pickup interpolates lateral position, collects once, and cannot collect a missed item later', () => {
  const state = createSnacks(); collectSnacks(state, 218, 4, 222, 1.6);
  assert.equal(state.specials, 1); collectSnacks(state, 218, 4, 222, 1.6); assert.equal(state.specials, 1);
  collectSnacks(state, 39, 2.8, 41, 2.8); assert.equal(state.kebabs, 0);
  collectSnacks(state, 42, -2.8, 44, -2.8); assert.equal(state.kebabs, 0);
  const crossing = createSnacks(); collectSnacks(crossing, 219, -2, 221, 6); assert.equal(crossing.specials, 1);
});
test('Specjal gives five seconds of pace and three of blur; another refreshes instead of stacking', () => {
  const state = createSnacks(); collectSnacks(state, 219, 2.8, 221, 2.8);
  near(snackPace(state, false), 1.2); near(snackPace(state, true), 1);
  advanceSnacks(state, 3); assert.equal(state.blurLeft, 0); assert.equal(state.specjalLeft, 2);
  collectSnacks(state, 439, -2.8, 441, -2.8); assert.equal(state.specjalLeft, 5); assert.equal(state.specials, 2);
  near(snackPace(state, false), 1.2); advanceSnacks(state, 5); assert.equal(state.specjalLeft, 0);
});
test('kebab clears critical hunger, causes four seconds of digestion, and combines with Specjal', () => {
  const state = createSnacks(); advanceSnacks(state, 45); collectSnacks(state, 39, -2.8, 41, -2.8);
  assert.equal(state.hunger, 0); assert.equal(state.kebabs, 1); near(snackPace(state, false), 0.85);
  collectSnacks(state, 219, 2.8, 221, 2.8); near(snackPace(state, false), 1.2 * 0.85);
  advanceSnacks(state, 4); assert.equal(state.digestionLeft, 0); near(snackPace(state, false), 1.2);
});
test('brake, grass, and barrier contact retain authority during a boost', () => {
  const race = createAttack('snacks'); race.speed = 34; race.snacks!.specjalLeft = 5;
  advance(race, 0.5, true); assert.ok(race.speed < 21);
  race.speed = 34; race.x = 7; advance(race, 0.5); assert.ok(race.speed < 28);
  race.x = 10; race.speed = 34; stepAttack(race, { steer: 0, brake: false }); assert.equal(race.hits, 1); assert.ok(race.speed < 20);
});
test('not stepping the simulation freezes effects; retry starts fresh', () => {
  const race = createAttack('snacks'); advance(race, 2); collectSnacks(race.snacks!, 219, 2.8, 221, 2.8);
  const frozen = structuredClone(race); stepAttack(race, { steer: 0, brake: false }, 0); assert.deepEqual(race, frozen);
  const retry = createAttack('snacks'); assert.deepEqual(retry.snacks, createSnacks());
});
test('full arcade lap collects all eight items on asphalt and has a distinct versioned record and ghost', () => {
  const race = drive('snacks');
  assert.equal(race.finished, true); assert.equal(race.snacks!.specials, SNACK_TOTALS.specjal); assert.equal(race.snacks!.kebabs, SNACK_TOTALS.kebab);
  assert.equal(race.offences, 0); assert.equal(race.hits, 0);
  const record = recordFromRace(race), raw = JSON.stringify(record);
  assert.equal(record.rules, SNACK_RULES_VERSION); assert.deepEqual(parseAttackRecord(raw, 'snacks'), record);
  assert.equal(parseAttackRecord(raw), null);
  assert.equal(parseAttackRecord(JSON.stringify({ ...record, rules: 'old' }), 'snacks'), null);
  const classic = JSON.stringify(recordFromRace(drive('classic', false)));
  assert.ok(parseAttackRecord(classic)); assert.equal(parseAttackRecord(classic, 'snacks'), null);
  assert.equal(attackRecordKey('classic'), ATTACK_RECORD_KEY); assert.equal(attackRecordKey('snacks'), SNACK_RECORD_KEY); assert.notEqual(SNACK_RECORD_KEY, ATTACK_RECORD_KEY);
  const frozen = structuredClone(race); advance(race, 2); assert.deepEqual(race, frozen);
});
test('all eight items can be consciously missed on asphalt and the arcade lap remains deterministic at 30/60/120 FPS', () => {
  const missed = drive('snacks', false);
  assert.equal(missed.finished, true); assert.equal(missed.snacks!.specials, 0); assert.equal(missed.snacks!.kebabs, 0);
  assert.equal(missed.offences, 0); assert.equal(missed.hits, 0); assert.ok(missed.time > 45);
  const outcomes = [30, 60, 120].map(fps => drive('snacks', true, fps));
  assert.deepEqual(outcomes[0], outcomes[1]); assert.deepEqual(outcomes[1], outcomes[2]);
});
