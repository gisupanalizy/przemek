import test from 'node:test';
import assert from 'node:assert/strict';
import { createRace, emptyControls, FIXED_STEP, RACE_SECONDS, score, settleRace, stepRace, parseSprintRecord, type Race } from '../race-engine.ts';
import { attackResult, createAttack, medalFor, MEDALS, parseAttackRecord, recordFromRace, referenceInput, stepAttack, type AttackRace } from '../time-attack-engine.ts';
import { ROAD_HALF } from '../time-attack-track.ts';
import { ROAD_HALF_WIDTH_RATIO } from '../race-track.ts';
import { renderRace } from '../race-renderer.ts';
import {
  createTrackLimits, LOOP_TYRES, LOOP_WHITE_INSET, LOOP_WHITE_WIDTH, loopAllTyresOutside, observeTrackLimits,
  penaltyForOffences, SPRINT_SPRITE_TO_LANE, SPRINT_TYRES, SPRINT_WHITE_OUTER, SPRINT_YAW_PER_STEER,
  sprintAllTyresOutside, trackLimitNotice,
} from '../track-limits.ts';

const PLACE = [1200, 800, 500, 300, 200, 100, 50, 0];

test('penalties stay at zero for three offences, then add five seconds each time', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(penaltyForOffences), [0, 0, 0, 0, 5, 10, 15]);
  const state = createTrackLimits();
  for (let offence = 1; offence <= 6; offence++) {
    observeTrackLimits(state, true);
    observeTrackLimits(state, true);
    assert.equal(state.offences, offence);
    assert.equal(state.penalty, penaltyForOffences(offence));
    observeTrackLimits(state, false);
  }
  assert.equal(trackLimitNotice(1), 'PIERWSZY WYJAZD · BEZ KARY');
  assert.equal(trackLimitNotice(2), 'DRUGI WYJAZD · BEZ KARY');
  assert.equal(trackLimitNotice(3), 'OSTATNIE OSTRZEŻENIE');
  assert.equal(trackLimitNotice(4), '+5 SEKUND');
  assert.equal(trackLimitNotice(6), 'KOLEJNE +5 SEKUND');
});

test('one continuous exit counts once and the next counts only after a return', () => {
  const state = createTrackLimits();
  for (let i = 0; i < 40; i++) observeTrackLimits(state, true);
  assert.equal(state.offences, 1);
  observeTrackLimits(state, false);
  observeTrackLimits(state, false);
  assert.equal(state.offences, 1);
  observeTrackLimits(state, true);
  assert.equal(state.offences, 2);
});

function loopOffsets(heading: number): number[][] {
  const along = Math.cos(heading), across = Math.sin(heading);
  return LOOP_TYRES.map(tyre => {
    const values: number[] = [];
    for (const lx of [tyre.x, tyre.x + tyre.w]) for (const ly of [tyre.y, tyre.y + tyre.h]) values.push(lx * along - ly * across);
    return values;
  });
}

function placeLoop(heading: number, side: 1 | -1, edge: number): number {
  const inners = loopOffsets(heading).map(values => side > 0 ? Math.min(...values) : Math.max(...values));
  const inner = side > 0 ? Math.min(...inners) : Math.max(...inners);
  return edge - inner;
}

test('the last tyre on the white line is legal, a millimetre past the line is not, on both sides', () => {
  const line = ROAD_HALF - LOOP_WHITE_INSET + LOOP_WHITE_WIDTH / 2;
  for (const side of [1, -1] as const) {
    const onLine = placeLoop(0, side, side * line);
    assert.equal(loopAllTyresOutside(onLine, 0), false);
    const past = placeLoop(0, side, side * (line + 0.001));
    assert.equal(loopAllTyresOutside(past, 0), true);
    const rotated = placeLoop(side * 0.5, side, side * line);
    const outsideTyres = loopOffsets(side * 0.5).filter(values => {
      const laterals = values.map(offset => rotated + offset);
      const min = Math.min(...laterals), max = Math.max(...laterals);
      return min > ROAD_HALF + 0.00001 || max < -ROAD_HALF - 0.00001;
    }).length;
    assert.ok(outsideTyres >= 1);
    assert.equal(loopAllTyresOutside(rotated, side * 0.5), false);
  }
});

test('rotation can bring a loop tyre back onto the track', () => {
  const past = placeLoop(0, 1, ROAD_HALF + 0.001);
  assert.equal(loopAllTyresOutside(past, 0), true);
  assert.equal(loopAllTyresOutside(past, 0.6), false);
  const other = placeLoop(0, -1, -(ROAD_HALF + 0.001));
  assert.equal(loopAllTyresOutside(other, 0), true);
  assert.equal(loopAllTyresOutside(other, -0.6), false);
});

function sprintOffsets(steering: number): number[][] {
  const yaw = steering * SPRINT_YAW_PER_STEER;
  const along = Math.cos(yaw), across = Math.sin(yaw);
  return SPRINT_TYRES.map(tyre => {
    const values: number[] = [];
    for (const lx of [tyre.x, tyre.x + tyre.w]) for (const ly of [tyre.y, tyre.y + tyre.h]) {
      values.push((lx * along - ly * across) * SPRINT_SPRITE_TO_LANE);
    }
    return values;
  });
}

function placeSprint(steering: number, side: 1 | -1, edge: number): number {
  const inners = sprintOffsets(steering).map(values => side > 0 ? Math.min(...values) : Math.max(...values));
  const inner = side > 0 ? Math.min(...inners) : Math.max(...inners);
  return edge - inner;
}

test('sprint contact follows the shared tyres, the white line and steering rotation', () => {
  for (const side of [1, -1] as const) {
    assert.equal(sprintAllTyresOutside(placeSprint(0, side, side * SPRINT_WHITE_OUTER), 0), false);
    const past = placeSprint(0, side, side * (SPRINT_WHITE_OUTER + 0.001));
    assert.equal(sprintAllTyresOutside(past, 0), true);
    assert.equal(sprintAllTyresOutside(past, -side), false);
  }
});

test('the asphalt strip beyond the outer white edge cannot keep either game legal', () => {
  for (const side of [-1, 1]) {
    assert.equal(loopAllTyresOutside(side * 7.91, 0), true);
    assert.equal(sprintAllTyresOutside(side * 1.115, 0), true);
  }
});

test('the actual rendered sprint tyres agree with penalties at every tested aspect ratio', () => {
  for (const [width, height] of [[633, 390], [1080, 900], [1200, 300], [426, 320]]) {
    for (const steering of [-1, 0, 1]) for (const side of [-1, 1] as const) {
      const tangent = placeSprint(steering, side, side * SPRINT_WHITE_OUTER);
      for (const x of [side * 1.15, tangent - side * 0.001, tangent, tangent + side * 0.001]) {
        const tyres: Array<Array<[number, number]>> = [];
        let path: Array<[number, number]> = [];
        const ctx = new Proxy({ fillStyle: '', globalAlpha: 1 }, {
          get(target, key) {
            if (key === 'beginPath') return () => { path = []; };
            if (key === 'moveTo' || key === 'lineTo') return (px: number, py: number) => path.push([px, py]);
            if (key === 'fill') return () => { if (target.fillStyle === '#080c12') tyres.push([...path]); };
            return Reflect.get(target, key) ?? (() => {});
          },
        }) as unknown as CanvasRenderingContext2D;
        const race = createRace(); race.rivals = []; race.x = x; race.steering = steering;
        renderRace(ctx, width, height, race, true);
        assert.equal(tyres.length, 4);
        // Recover each visible corner's lane from the straight road drawn at its own screen y.
        const allOutside = tyres.every(tyre => {
          const lanes = tyre.map(([px, py]) => {
            const half = width * ROAD_HALF_WIDTH_RATIO * (py / height - 0.31) / 0.69;
            return x + (px - width / 2) / half;
          });
          return Math.min(...lanes) > SPRINT_WHITE_OUTER + 0.00001
            || Math.max(...lanes) < -SPRINT_WHITE_OUTER - 0.00001;
        });
        assert.equal(allOutside, sprintAllTyresOutside(x, steering), `${width}×${height}, x=${x}, steer=${steering}`);
        if (x === tangent) assert.equal(allOutside, false);
      }
    }
  }
});

function holdAttack(race: AttackRace, x: number, steps: number) {
  for (let i = 0; i < steps; i++) {
    race.x = x; race.heading = 0;
    stepAttack(race, { steer: 0, brake: true });
  }
}

test('the time-attack car keeps one offence through a long exit and counts the next after returning', () => {
  const race = createAttack();
  race.speed = 1;
  holdAttack(race, 9, 25);
  assert.equal(race.offences, 1);
  assert.equal(race.outside, true);
  holdAttack(race, 0, 1);
  assert.equal(race.outside, false);
  assert.equal(race.offences, 1);
  holdAttack(race, 9, 1);
  assert.equal(race.offences, 2);
  const paused = race.offences;
  assert.equal(race.offences, paused);
  assert.equal(createAttack().offences, 0);
});

test('a time penalty changes the medal and the record, while the ghost stays on driving time', () => {
  const race = createAttack();
  while (!race.finished && race.time < 180) stepAttack(race, referenceInput(race));
  assert.equal(race.finished, true);
  assert.equal(race.offences, 0);
  race.offences = 4;
  race.penalty = penaltyForOffences(4);
  const record = recordFromRace(race);
  assert.equal(record.drivingTime, race.time);
  assert.equal(record.result, attackResult(race));
  assert.equal(record.trace.at(-1)!.t, record.drivingTime);
  assert.notEqual(record.result, record.drivingTime);
  assert.equal(medalFor(record.drivingTime), 'gold');
  assert.notEqual(medalFor(record.result), 'gold');
  assert.deepEqual(parseAttackRecord(JSON.stringify(record)), record);
  const v1 = { version: record.version, track: record.track, time: record.drivingTime, sectors: record.sectors, trace: record.trace };
  assert.equal(parseAttackRecord(JSON.stringify(v1)), null);
  assert.equal(parseAttackRecord(JSON.stringify({ ...record, result: record.result + 1 })), null);
});

test('driving time inside gold loses the medal once five seconds are added', () => {
  const driving = MEDALS.gold - 0.2;
  assert.equal(medalFor(driving), 'gold');
  assert.notEqual(medalFor(driving + penaltyForOffences(4)), 'gold');
});

function holdSprint(race: Race, x: number, steps: number) {
  for (let i = 0; i < steps; i++) {
    race.x = x;
    stepRace(race, emptyControls(), FIXED_STEP);
  }
}

test('the sprint car treats a long exit as one offence and a return as a new chance', () => {
  const race = createRace();
  holdSprint(race, 1.3, 20);
  assert.equal(race.offences, 1);
  holdSprint(race, 0, 1);
  assert.equal(race.outside, false);
  holdSprint(race, 1.3, 1);
  assert.equal(race.offences, 2);
  assert.equal(createRace().offences, 0);
});

test('settlement moves a close rival, leaves a distant one, and runs only once', () => {
  const race = createRace();
  race.distance = 1900;
  race.rivals.forEach((rival, index) => { rival.distance = 1200 - index * 20; rival.speed = 40; });
  race.rivals[0].distance = 1890;
  race.rivals[0].speed = 100;
  race.offences = 4;
  race.penalty = 5;
  race.finished = false;
  const base = score(race);
  const hits = race.hits, passes = race.cleanPasses, distance = race.distance;
  race.finished = true;
  settleRace(race);
  assert.equal(race.flagPosition, 1);
  assert.equal(race.resultPosition, 2);
  assert.equal(score(race), base + PLACE[1]);
  assert.ok(score(race) < base + PLACE[0]);
  assert.equal(race.hits, hits);
  assert.equal(race.cleanPasses, passes);
  assert.equal(race.distance, distance);
  assert.equal(race.offences, 4);
  const rivals = race.rivals.map(rival => rival.distance);
  settleRace(race);
  assert.equal(race.resultPosition, 2);
  assert.deepEqual(race.rivals.map(rival => rival.distance), rivals);

  const safe = createRace();
  safe.distance = 5000;
  safe.rivals.forEach(rival => { rival.distance = 100; rival.speed = 30; });
  safe.offences = 4;
  safe.penalty = 5;
  safe.finished = true;
  const before = safe.rivals.map(rival => rival.distance);
  settleRace(safe);
  assert.equal(safe.flagPosition, safe.resultPosition);
  assert.deepEqual(safe.rivals.map(rival => rival.distance), before);
});

test('a zero penalty does not simulate rivals and the flag step freezes afterwards', () => {
  const quiet = createRace();
  quiet.penalty = 0;
  quiet.finished = true;
  const before = quiet.rivals.map(rival => ({ ...rival }));
  settleRace(quiet);
  assert.equal(quiet.resultPosition, quiet.flagPosition);
  assert.deepEqual(quiet.rivals, before);

  const race = createRace();
  race.time = RACE_SECONDS - FIXED_STEP;
  race.distance = 1900;
  race.rivals.forEach((rival, index) => { rival.distance = 1000 - index * 10; rival.speed = 40; });
  race.rivals[0].distance = 1885;
  race.rivals[0].speed = 110;
  race.offences = 4;
  race.penalty = 5;
  stepRace(race, emptyControls(), FIXED_STEP);
  assert.equal(race.finished, true);
  assert.equal(race.time, RACE_SECONDS);
  assert.equal(race.settled, true);
  assert.ok(race.resultPosition > race.flagPosition);
  const saved = structuredClone(race);
  stepRace(race, emptyControls(), FIXED_STEP);
  assert.deepEqual(race, saved);
});

test('sprint records require offence data and reject the previous shape', () => {
  const valid = { score: 2400, position: 2, offences: 4, penalty: 5 };
  assert.deepEqual(parseSprintRecord(JSON.stringify(valid)), valid);
  assert.equal(parseSprintRecord(JSON.stringify({ score: 2400, position: 2 })), null);
  assert.equal(parseSprintRecord(JSON.stringify({ ...valid, penalty: 0 })), null);
  assert.equal(parseSprintRecord('null'), null);
});
