import { OFFROAD_LIMIT, trackAt } from './race-track.ts';

export const RACE_SECONDS = 90;
export const FIXED_STEP = 1 / 120;

export type Controls = { left: boolean; right: boolean; brake: boolean; boost: boolean; steerTarget?: number };
export type Rival = { id: number; distance: number; x: number; speed: number; color: string; cooldown: number };
export type Race = {
  time: number; distance: number; x: number; speed: number; fuel: number;
  rivals: Rival[]; combo: number; bestCombo: number; cleanPasses: number;
  hits: number; protection: number; cleanCooldown: number; boost: boolean;
  steering: number; event: string; eventTime: number; finished: boolean;
  boostTime: number; boostWasDown: boolean;
  slipstream: boolean; inCorner: boolean; cornerClean: boolean; cleanCorners: number;
  braking: boolean; gripRecovery: number; slides: number;
};

export const emptyControls = (): Controls => ({ left: false, right: false, brake: false, boost: false });
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

// World distance is in metres; every opponent has a persistent position.
export function createRace(): Race {
  const colors = ['#41cbd5', '#edb64b', '#98c957', '#b09aef', '#4a91eb', '#ededdf', '#ff8b53'];
  return {
    time: 0, distance: 0, x: 0, speed: 78, fuel: 100, combo: 0, bestCombo: 0,
    cleanPasses: 0, hits: 0, protection: 0, cleanCooldown: 0, boost: false,
    steering: 0, event: '', eventTime: 0, finished: false, boostTime: 0, boostWasDown: false,
    slipstream: false, inCorner: false, cornerClean: true, cleanCorners: 0,
    braking: false, gripRecovery: 0, slides: 0,
    rivals: colors.map((color, i) => ({ id: i, distance: 26 + i * 32,
      x: [-0.54, 0.45, 0, -0.43, 0.52, -0.12, 0.38][i], speed: 84 + i * 0.9, color, cooldown: 0 })),
  };
}

export function roadCurve(distance: number): number {
  return trackAt(distance).curve;
}

export function position(race: Race): number {
  return 1 + race.rivals.filter(rival => rival.distance > race.distance).length;
}

export function score(race: Race): number {
  return Math.max(0, Math.floor(race.distance / 8) + race.cleanPasses * 150 + race.bestCombo * 50
    + race.cleanCorners * 180 - race.hits * 180 - race.slides * 150
    + (race.finished ? [1200, 800, 500, 300, 200, 100, 50, 0][position(race) - 1] : 0));
}

// A tap always produces a noticeable burst; holding extends it while fuel lasts.
export function triggerBoost(race: Race): void {
  if (!race.finished && race.fuel >= 8) race.boostTime = Math.max(race.boostTime, 1.6);
}

export function stepRace(race: Race, input: Controls, delta: number): void {
  if (race.finished || delta <= 0) return;
  // The caller accumulates real time and invokes us with FIXED_STEP.
  const dt = Math.min(delta, RACE_SECONDS - race.time);
  race.time += dt;
  race.protection = Math.max(0, race.protection - dt);
  race.cleanCooldown = Math.max(0, race.cleanCooldown - dt);
  race.eventTime = Math.max(0, race.eventTime - dt);
  race.gripRecovery = Math.max(0, race.gripRecovery - dt);
  const track = trackAt(race.distance);
  race.braking = input.brake;
  const overspeed = track.inCorner ? Math.max(0, race.speed - track.safeSpeed) : 0;
  const steer = input.left || input.right ? Number(input.right) - Number(input.left)
    : input.steerTarget !== undefined && Number.isFinite(input.steerTarget)
      ? clamp((input.steerTarget - race.x) * 6, -1, 1) : 0;
  race.steering += (steer - race.steering) * Math.min(1, dt * 12);
  // Overdriving a corner consumes grip: steering alone cannot erase excess speed.
  const steeringGrip = track.inCorner ? clamp(1 - overspeed * 0.025, 0.12, 1) : 1;
  race.x = clamp(race.x + steer * dt * (1.1 + race.speed / 100) * steeringGrip
    - track.curve * dt * (race.speed / 90) * (0.12 + overspeed * 0.065), -1.45, 1.45);
  const offroad = Math.abs(race.x) > OFFROAD_LIMIT;
  if (offroad && overspeed > 10 && race.gripRecovery === 0 && race.speed > track.safeSpeed + 10) {
    race.gripRecovery = 2.2; race.speed *= 0.6; race.slides += 1;
    race.event = 'UTRATA PRZYCZEPNOŚCI · HAMUJ PRZED ZAKRĘTEM'; race.eventTime = 2.2;
  }
  race.slipstream = !offroad && !track.inCorner && race.rivals.some(r => {
    const gap = r.distance - race.distance;
    return gap > 9 && gap < 65 && Math.abs(r.x - race.x) < 0.23;
  });
  if (track.inCorner && !race.inCorner) race.cornerClean = true;
  if (offroad || overspeed > 10) race.cornerClean = false;
  if (!track.inCorner && race.inCorner && race.cornerClean) {
    race.cleanCorners += 1; race.fuel = Math.min(100, race.fuel + 15);
    race.event = 'DOBRE WYJŚCIE · +180 PKT · +15 ERS'; race.eventTime = 2;
  }
  race.inCorner = track.inCorner;
  if (input.boost && !race.boostWasDown) triggerBoost(race);
  race.boostWasDown = input.boost;
  if (input.brake || offroad || race.gripRecovery > 0) race.boostTime = 0;
  race.boost = ((input.boost && race.boost) || race.boostTime > 0) && !input.brake && !offroad && race.gripRecovery === 0 && race.fuel > 0;
  race.boostTime = Math.max(0, race.boostTime - dt);
  const target = race.gripRecovery > 0 ? 30 : input.brake ? 42 : offroad ? 53 : race.boost ? 120 : race.slipstream ? 99 : 90;
  const acceleration = target < race.speed ? 65 : race.boost ? 65 : 24;
  race.speed += clamp(target - race.speed, -acceleration * dt, acceleration * dt);
  if (overspeed > 16 && !input.brake) race.speed = Math.max(42, race.speed - dt * 9);
  if (race.boost) race.fuel = Math.max(0, race.fuel - dt * 25);
  else if (!input.boost && !offroad && race.cleanCooldown === 0) race.fuel = Math.min(100, race.fuel + dt * 4);
  if (race.fuel <= 0) race.boostTime = 0;
  if (offroad) race.combo = 0;
  const previousDistance = race.distance;
  race.distance += race.speed * dt;
  for (const rival of race.rivals) {
    const previousGap = rival.distance - previousDistance;
    rival.cooldown = Math.max(0, rival.cooldown - dt);
    const behind = rival.distance < race.distance;
    // Passed opponents attack again; losing the lead is a real possibility.
    const rivalTrack = trackAt(rival.distance);
    // Drivers brake for corners; a player who times entry and exit can beat them.
    const approachingCorner = !rivalTrack.inCorner && rivalTrack.nextDistance < 105;
    const cornerPace = rivalTrack.inCorner || approachingCorner
      ? (rivalTrack.inCorner ? rivalTrack.safeSpeed : rivalTrack.nextSpeed) - 2 + rival.id * 0.5
      : 84 + rival.id * 0.9;
    const recovery = clamp((rival.distance - race.distance - 350) * 0.035, 0, 8);
    const desiredSpeed = cornerPace + (behind ? 4 : 0) - recovery + Math.sin(race.time / 7 + rival.id) * 1.2;
    rival.speed += clamp(desiredSpeed - rival.speed, -dt * 32, dt * 14);
    rival.distance += rival.speed * dt;
    const lane = [-0.58, 0, 0.58][Math.floor(race.time / (5.5 + rival.id * 0.3) + rival.id * 1.7) % 3];
    rival.x += clamp(lane - rival.x, -dt * 0.13, dt * 0.13);
    const gap = rival.distance - race.distance;
    if (Math.abs(gap) < 16 && Math.abs(rival.x - race.x) < 0.22 && race.protection === 0 && rival.cooldown === 0) {
      race.speed = Math.max(25, race.speed * 0.57);
      race.hits += 1;
      race.combo = 0;
      race.cornerClean = false;
      race.protection = 1.4;
      race.cleanCooldown = 2.5;
      rival.cooldown = 2;
      race.event = 'KONTAKT · TRACISZ PRĘDKOŚĆ';
      race.eventTime = 1.6;
    }
    if (previousGap >= 0 && gap < 0 && race.cleanCooldown === 0 && !offroad) {
      race.cleanPasses += 1;
      race.combo += 1;
      race.bestCombo = Math.max(race.bestCombo, race.combo);
      race.fuel = Math.min(100, race.fuel + 18);
      race.event = race.combo > 1 ? `CZYSTA SERIA ×${race.combo} · +18 ERS` : 'CZYSTE WYPRZEDZENIE · +18 ERS';
      race.eventTime = 2;
    }
  }
  if (race.time >= RACE_SECONDS - 1e-8) {
    race.time = RACE_SECONDS;
    race.finished = true;
    race.boost = false;
  }
}
