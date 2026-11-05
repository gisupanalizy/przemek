import { ROAD_HALF_WIDTH_RATIO } from './race-track.ts';
import { ROAD_HALF } from './time-attack-track.ts';

// Closed contact, matching the infographic's edge tolerance.
export const TRACK_LIMIT_EPSILON = 0.00001;

export type TrackLimitState = { offences: number; penalty: number; outside: boolean };

export function createTrackLimits(): TrackLimitState {
  return { offences: 0, penalty: 0, outside: false };
}

// The first two exits are recorded, the third is a warning, then each adds five seconds.
export function penaltyForOffences(offences: number): number {
  return Math.max(0, offences - 3) * 5;
}

export function observeTrackLimits(state: TrackLimitState, allOutside: boolean): void {
  if (allOutside && !state.outside) {
    state.offences += 1;
    state.penalty = penaltyForOffences(state.offences);
  }
  state.outside = allOutside;
}

export function trackLimitNotice(offences: number): string {
  if (offences <= 0) return '';
  if (offences === 1) return 'PIERWSZY WYJAZD · BEZ KARY';
  if (offences === 2) return 'DRUGI WYJAZD · BEZ KARY';
  if (offences === 3) return 'OSTATNIE OSTRZEŻENIE';
  if (offences === 4) return '+5 SEKUND';
  return 'KOLEJNE +5 SEKUND';
}

type Rect = { x: number; y: number; w: number; h: number };

// Local tyre rectangles drawn by the time-attack car, in metres. +x is to the right.
export const LOOP_TYRES: readonly Rect[] = [
  { x: -0.95, y: -1.4, w: 0.4, h: 0.95 },
  { x: 0.55, y: -1.4, w: 0.4, h: 0.95 },
  { x: -0.95, y: 1.0, w: 0.4, h: 1.05 },
  { x: 0.55, y: 1.0, w: 0.4, h: 1.05 },
];
export const LOOP_WHITE_INSET = 0.13;
export const LOOP_WHITE_WIDTH = 0.12;
export const LOOP_TRACK_EDGE = ROAD_HALF - LOOP_WHITE_INSET + LOOP_WHITE_WIDTH / 2;

// Sprite tyres drawn for the sprint car, in the unscaled car space. +y is up the nose.
export const SPRINT_TYRES: readonly Rect[] = [
  { x: -46, y: -82, w: 22, h: 28 },
  { x: 24, y: -82, w: 22, h: 28 },
  { x: -50, y: -36, w: 26, h: 33 },
  { x: 24, y: -36, w: 26, h: 33 },
];
export const SPRINT_WHITE_INNER = 0.965;
export const SPRINT_WHITE_OUTER = 0.98;
export const SPRINT_CAR_WIDTH_RATIO = 0.205;
export const SPRINT_YAW_PER_STEER = 0.025;
// Car dimensions are in road space; resizing only changes their projection.
export const SPRINT_SPRITE_TO_LANE = SPRINT_CAR_WIDTH_RATIO / (100 * ROAD_HALF_WIDTH_RATIO);
const SPRINT_SPRITE_TO_METRES = 0.16;

export function sprintSpritePoint(x: number, y: number, steering: number) {
  const yaw = steering * SPRINT_YAW_PER_STEER;
  return {
    lateral: (x * Math.cos(yaw) - y * Math.sin(yaw)) * SPRINT_SPRITE_TO_LANE,
    z: 1 - (x * Math.sin(yaw) + y * Math.cos(yaw)) * SPRINT_SPRITE_TO_METRES,
  };
}

function overlaps(min: number, max: number, start: number, end: number): boolean {
  return max >= start - TRACK_LIMIT_EPSILON && min <= end + TRACK_LIMIT_EPSILON;
}

function loopOnTrack(min: number, max: number): boolean {
  return overlaps(min, max, -LOOP_TRACK_EDGE, LOOP_TRACK_EDGE);
}

function sprintOnTrack(min: number, max: number): boolean {
  return overlaps(min, max, -SPRINT_WHITE_OUTER, SPRINT_WHITE_OUTER);
}

function corners(rect: Rect): Array<[number, number]> {
  return [[rect.x, rect.y], [rect.x + rect.w, rect.y], [rect.x, rect.y + rect.h], [rect.x + rect.w, rect.y + rect.h]];
}

// Same rotation as the renderer: local +x is positive lateral, and positive heading swings the nose that way.
export function loopAllTyresOutside(x: number, heading: number): boolean {
  const along = Math.cos(heading), across = Math.sin(heading);
  return LOOP_TYRES.every(tyre => {
    const laterals = corners(tyre).map(([lx, ly]) => x + lx * along - ly * across);
    return !loopOnTrack(Math.min(...laterals), Math.max(...laterals));
  });
}

// The renderer projects these same points through the road camera.
export function sprintAllTyresOutside(x: number, steering: number): boolean {
  return SPRINT_TYRES.every(tyre => {
    const laterals = corners(tyre).map(([lx, ly]) => x + sprintSpritePoint(lx, ly, steering).lateral);
    return !sprintOnTrack(Math.min(...laterals), Math.max(...laterals));
  });
}
