import { BARRIER, CAR_HALF, CHECKPOINTS, curvatureAt, ROAD_HALF, SECTOR_ENDS, TRACK_LENGTH, TRACK_VERSION } from './time-attack-track.ts';

export const ATTACK_STEP = 1 / 120;
export const PHYSICS_VERSION = 1;
export const REFERENCE_TIME = 47.23400467501053;
export const MEDALS = { gold: REFERENCE_TIME * 1.05, silver: REFERENCE_TIME * 1.15, bronze: REFERENCE_TIME * 1.30 };
export function medalFor(time: number): 'gold' | 'silver' | 'bronze' | null {
  return time <= MEDALS.gold ? 'gold' : time <= MEDALS.silver ? 'silver' : time <= MEDALS.bronze ? 'bronze' : null;
}
export const ATTACK_RECORD_KEY = 'f1-w-punkt:time-attack:record:v1';
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export type AttackInput = { steer: number; brake: boolean };
export type GhostFrame = { t: number; s: number; x: number; heading: number };
export type AttackRace = {
  time: number; s: number; x: number; heading: number; speed: number; steering: number;
  braking: boolean; offroad: boolean; understeer: boolean; finished: boolean;
  checkpoint: number; sectors: number[]; hits: number; hitCooldown: number;
  event: string; eventUntil: number; trace: GhostFrame[]; samplePeriod: number;
};
export type AttackRecord = { version: number; track: string; time: number; sectors: number[]; trace: GhostFrame[] };

export function createAttack(): AttackRace {
  return { time: 0, s: 0, x: 0, heading: 0, speed: 18, steering: 0, braking: false,
    offroad: false, understeer: false, finished: false, checkpoint: 0, sectors: [], hits: 0,
    hitCooldown: 0, event: '', eventUntil: 0, trace: [{ t: 0, s: 0, x: 0, heading: 0 }], samplePeriod: 0.05 };
}

export function yawLimit(speed: number): number {
  return Math.min(Math.max(speed, 1) * 0.075, 9.5 / Math.max(speed, 4));
}

export function stepAttack(race: AttackRace, input: AttackInput, dt = ATTACK_STEP): void {
  if (race.finished || !Number.isFinite(dt) || dt <= 0) return;
  dt = Math.min(dt, 1 / 30);
  const previousS = race.s, previousTime = race.time;
  race.time += dt;
  race.hitCooldown = Math.max(0, race.hitCooldown - dt);
  const steer = Number.isFinite(input.steer) ? clamp(input.steer, -1, 1) : 0;
  race.steering += (steer - race.steering) * Math.min(1, dt * 16);
  race.braking = input.brake;
  race.offroad = Math.abs(race.x) + CAR_HALF > ROAD_HALF;
  const targetSpeed = input.brake ? 5 : race.offroad ? 13 : 34;
  race.speed += clamp(targetSpeed - race.speed, -dt * (input.brake ? 28 : 14), dt * 8);
  const curve = curvatureAt(race.s);
  const forward = Math.max(0.2, Math.cos(race.heading)) * race.speed / Math.max(0.7, 1 - curve * race.x);
  const yaw = race.steering * yawLimit(race.speed) * (race.offroad ? 0.75 : 1);
  race.understeer = Math.abs(race.steering) > 0.5 && race.speed > 25 && Math.abs(curve) > 0.01;
  race.heading = clamp(race.heading + (yaw - curve * forward) * dt, -1.3, 1.3);
  race.x += Math.sin(race.heading) * race.speed * dt;
  race.s += forward * dt;
  if (Math.abs(race.x) + CAR_HALF >= BARRIER) {
    race.x = clamp(race.x, -BARRIER + CAR_HALF, BARRIER - CAR_HALF);
    race.heading *= 0.75;
    if (!race.hitCooldown) {
      race.speed *= 0.52; race.hits++; race.hitCooldown = 0.9;
      race.event = 'KONTAKT · TRACISZ PRĘDKOŚĆ'; race.eventUntil = race.time + 1.5;
    }
  }
  // A missed gate holds forward progress, never teleports or grants the gate.
  while (race.checkpoint < CHECKPOINTS.length && race.s >= CHECKPOINTS[race.checkpoint]) {
    const gate = CHECKPOINTS[race.checkpoint];
    if (previousS > gate || Math.abs(race.x) + CAR_HALF > ROAD_HALF) {
      race.s = gate - 0.001;
      race.event = 'BRAMKA · WRÓĆ NA ASFALT'; race.eventUntil = race.time + 0.6;
      break;
    }
    const crossing = previousTime + dt * clamp((gate - previousS) / Math.max(0.00001, race.s - previousS), 0, 1);
    if (SECTOR_ENDS.includes(gate)) {
      race.sectors.push(crossing);
      race.event = `SEKTOR ${race.sectors.length} UKOŃCZONY`; race.eventUntil = race.time + 2;
    }
    race.checkpoint++;
    if (gate === TRACK_LENGTH) { race.s = TRACK_LENGTH; race.time = crossing; race.finished = true; }
  }
  const last = race.trace[race.trace.length - 1];
  if (race.finished || race.time - last.t >= race.samplePeriod - 1e-8) {
    race.trace.push({ t: race.time, s: race.s, x: race.x, heading: race.heading });
    // Very long attempts remain playable without an unbounded replay buffer.
    if (race.trace.length > 12000) {
      race.trace = race.trace.filter((_, i, all) => i % 2 === 0 || i === all.length - 1);
      race.samplePeriod *= 2;
    }
  }
}

export function ghostAt(trace: GhostFrame[], time: number): GhostFrame | null {
  if (!trace.length || time > trace[trace.length - 1].t) return null;
  if (time <= trace[0].t) return trace[0];
  let lo = 0, hi = trace.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >>> 1; if (trace[mid].t <= time) lo = mid; else hi = mid; }
  const a = trace[lo], b = trace[hi], f = clamp((time - a.t) / (b.t - a.t), 0, 1);
  return { t: time, s: a.s + (b.s - a.s) * f, x: a.x + (b.x - a.x) * f,
    heading: a.heading + (b.heading - a.heading) * f };
}

export function ghostTimeAt(trace: GhostFrame[], distance: number): number | null {
  if (!trace.length || distance > trace[trace.length - 1].s) return null;
  let lo = 0, hi = trace.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >>> 1; if (trace[mid].s < distance) lo = mid; else hi = mid; }
  const a = trace[lo], b = trace[hi];
  return a.t + (b.t - a.t) * clamp((distance - a.s) / Math.max(0.00001, b.s - a.s), 0, 1);
}

export function recordFromRace(race: AttackRace): AttackRecord {
  return { version: PHYSICS_VERSION, track: TRACK_VERSION, time: race.time, sectors: [...race.sectors], trace: race.trace.map(f => ({ ...f })) };
}

export function parseAttackRecord(raw: string | null): AttackRecord | null {
  try {
    if (!raw || raw.length > 4_000_000) return null;
    const data = JSON.parse(raw) as AttackRecord;
    if (!data || data.version !== PHYSICS_VERSION || data.track !== TRACK_VERSION || !Number.isFinite(data.time) || data.time <= 0
      || !Array.isArray(data.sectors) || data.sectors.length !== 3 || !Array.isArray(data.trace) || data.trace.length < 2 || data.trace.length > 12001) return null;
    let t = -1, s = -1;
    for (const frame of data.trace) {
      if (!frame || ![frame.t, frame.s, frame.x, frame.heading].every(Number.isFinite) || frame.t <= t || frame.s < s
        || frame.t < 0 || frame.t > data.time || frame.s < 0 || frame.s > TRACK_LENGTH || Math.abs(frame.x) > BARRIER || Math.abs(frame.heading) > 1.31) return null;
      t = frame.t; s = frame.s;
    }
    if (data.trace[0].t !== 0 || data.trace[0].s !== 0 || t !== data.time || s !== TRACK_LENGTH
      || data.sectors.some((value, i) => !Number.isFinite(value) || value <= (data.sectors[i - 1] ?? 0) || value > data.time)
      || data.sectors[2] !== data.time) return null;
    return data;
  } catch { return null; }
}

// Reproducible clean reference driver: also used to calibrate the medal times.
export function referenceInput(race: AttackRace, braking = true): AttackInput {
  let safe = 34;
  for (let d = 0; d < 100; d += 3) {
    const curve = Math.abs(curvatureAt(race.s + d));
    if (curve > 0.001) safe = Math.min(safe, Math.sqrt(7.5 / curve + 2 * 23 * Math.max(0, d - 8)));
  }
  const feedforward = curvatureAt(race.s + 3) * race.speed / yawLimit(race.speed);
  return { steer: clamp(feedforward - race.heading * 3.5 - race.x * 0.13, -1, 1), brake: braking && race.speed > safe + 0.3 };
}

export function formatTime(seconds: number): string {
  const centis = Math.max(0, Math.floor(seconds * 100 + 1e-7));
  return `${Math.floor(centis / 6000)}:${String(Math.floor(centis / 100) % 60).padStart(2, '0')}.${String(centis % 100).padStart(2, '0')}`;
}
