// All distances are metres. One geometry drives drawing, grip and checkpoints.
export const TRACK_VERSION = 'riviera-six-v1';
export const ROAD_HALF = 7;
export const CAR_HALF = 0.95;
export const BARRIER = ROAD_HALF + 2.6;
const SECTIONS = [
  [140, 0], [90, 0.014], [100, 0], [70, -0.023],
  [110, 0], [100, 0.012], [70, 0], [85, -0.019],
  [130, 0], [95, 0.016], [80, 0], [75, -0.022], [120, 0],
] as const;
export const TRACK_LENGTH = SECTIONS.reduce((sum, [length]) => sum + length, 0);
export const SECTOR_ENDS = [440, 865, TRACK_LENGTH];
export const CHECKPOINTS = [140, 230, 330, 400, 440, 510, 610, 680, 765, 865, 895, 990, 1070, 1145, TRACK_LENGTH];
export type TrackPoint = { x: number; y: number; angle: number; curve: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function curvatureAt(distance: number): number {
  if (distance < 0 || distance >= TRACK_LENGTH) return 0;
  let start = 0;
  for (const [length, curve] of SECTIONS) {
    if (distance < start + length) {
      const edge = clamp(Math.min(distance - start, start + length - distance) / 14, 0, 1);
      return curve * edge * edge * (3 - 2 * edge);
    }
    start += length;
  }
  return 0;
}

const points: TrackPoint[] = [{ x: 0, y: 0, angle: 0, curve: 0 }];
for (let s = 1; s <= TRACK_LENGTH; s++) {
  const previous = points[s - 1];
  const curve = curvatureAt(s - 0.5), angle = previous.angle + curve;
  points.push({ x: previous.x + Math.sin(previous.angle + curve / 2),
    y: previous.y - Math.cos(previous.angle + curve / 2), angle, curve: curvatureAt(s) });
}

export function trackPoint(distance: number, lateral = 0): TrackPoint {
  const s = clamp(distance, 0, TRACK_LENGTH), index = Math.floor(s);
  const a = points[index], b = points[Math.min(index + 1, TRACK_LENGTH)], f = s - index;
  const angle = a.angle + (b.angle - a.angle) * f;
  const extension = distance - s;
  return { x: a.x + (b.x - a.x) * f + Math.cos(angle) * lateral + Math.sin(angle) * extension,
    y: a.y + (b.y - a.y) * f + Math.sin(angle) * lateral - Math.cos(angle) * extension,
    angle, curve: curvatureAt(s) };
}

export function nextCorner(distance: number) {
  let start = 0, corner = 0;
  for (const [length, curve] of SECTIONS) {
    if (curve) {
      corner++;
      if (distance < start + length) return { number: corner, distance: Math.max(0, start - distance), curve };
    }
    start += length;
  }
  return null;
}
