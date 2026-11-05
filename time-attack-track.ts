// One closed, arc-length-sampled geometry drives drawing, grip and gates.
export const TRACK_VERSION = 'riviera-loop-v1';
export const ROAD_HALF = 7;
export const CAR_HALF = 0.95;
export const BARRIER = ROAD_HALF + 2.6;
export const TRACK_LENGTH = 1265;
export type TrackPoint = { x: number; y: number; angle: number; curve: number };
type Vec = { x: number; y: number };
type Sample = TrackPoint & { distance: number };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
const unit = (a: Vec): Vec => mul(a, 1 / Math.hypot(a.x, a.y));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// A kidney-shaped six-corner circuit, including a left-hand change of direction.
const vertices: Vec[] = [
  { x: -160, y: 150 }, { x: -160, y: -170 }, { x: 70, y: -220 },
  { x: 190, y: -80 }, { x: 55, y: 35 }, { x: 130, y: 190 },
];
const start = mul(add(vertices[0], vertices[1]), 0.5);
const raw: Sample[] = [{ ...start, angle: 0, curve: 0, distance: 0 }];
const corners: { start: number; end: number; curve: number; number: number }[] = [];
function append(p: Vec, tangent: Vec, curve = 0) {
  const previous = raw[raw.length - 1];
  let angle = Math.atan2(tangent.x, -tangent.y);
  while (angle - previous.angle > Math.PI) angle -= Math.PI * 2;
  while (angle - previous.angle < -Math.PI) angle += Math.PI * 2;
  raw.push({ ...p, angle, curve, distance: previous.distance + Math.hypot(p.x - previous.x, p.y - previous.y) });
}
function lineTo(end: Vec) {
  const previous = raw[raw.length - 1], vector = sub(end, previous);
  const steps = Math.max(1, Math.ceil(Math.hypot(vector.x, vector.y) * 2));
  for (let i = 1; i <= steps; i++) append(add(previous, mul(vector, i / steps)), vector);
}
function bezier(points: Vec[], t: number): Vec {
  let work = points.map(p => ({ ...p }));
  while (work.length > 1) work = work.slice(1).map((p, i) => ({ x: lerp(work[i].x, p.x, t), y: lerp(work[i].y, p.y, t) }));
  return work[0];
}
for (let turn = 0; turn < vertices.length; turn++) {
  const index = (turn + 1) % vertices.length, vertex = vertices[index];
  const before = sub(vertex, vertices[(index + 5) % 6]), after = sub(vertices[(index + 1) % 6], vertex);
  const incoming = unit(before), outgoing = unit(after);
  const cut = Math.min(65, Math.hypot(before.x, before.y) * 0.32, Math.hypot(after.x, after.y) * 0.32);
  const entry = sub(vertex, mul(incoming, cut)), exit = add(vertex, mul(outgoing, cut));
  lineTo(entry);
  const begin = raw[raw.length - 1].distance;
  // Quintic corners have zero curvature at both straight/curve joins.
  const controls = [entry, add(entry, mul(incoming, cut * 0.25)), add(entry, mul(incoming, cut * 0.5)),
    sub(exit, mul(outgoing, cut * 0.5)), sub(exit, mul(outgoing, cut * 0.25)), exit];
  const first = controls.slice(1).map((p, i) => mul(sub(p, controls[i]), 5));
  const second = first.slice(1).map((p, i) => mul(sub(p, first[i]), 4));
  for (let i = 1; i <= 240; i++) {
    const t = i / 240, tangent = bezier(first, t), acceleration = bezier(second, t);
    const curve = (tangent.x * acceleration.y - tangent.y * acceleration.x) / Math.hypot(tangent.x, tangent.y) ** 3;
    append(bezier(controls, t), tangent, curve);
  }
  corners.push({ start: begin, end: raw[raw.length - 1].distance,
    curve: Math.sign(incoming.x * outgoing.y - incoming.y * outgoing.x), number: turn + 1 });
}
lineTo(start);
const scale = TRACK_LENGTH / raw[raw.length - 1].distance;
export const CORNERS = corners.map(c => ({ ...c, start: c.start * scale, end: c.end * scale }));
export const SECTOR_ENDS = [Math.round(TRACK_LENGTH / 3), Math.round(TRACK_LENGTH * 2 / 3), TRACK_LENGTH];
export const CHECKPOINTS = [...new Set([...CORNERS.flatMap(c => [Math.round(c.start), Math.round(c.end)]), ...SECTOR_ENDS])].sort((a, b) => a - b);
export const BRAKING_MARKERS = CORNERS.map(c => c.start - 25);
const points: TrackPoint[] = [];
let sample = 0;
for (let s = 0; s <= TRACK_LENGTH; s++) {
  const distance = s / scale;
  while (sample < raw.length - 2 && raw[sample + 1].distance < distance) sample++;
  const a = raw[sample], b = raw[sample + 1], f = clamp((distance - a.distance) / (b.distance - a.distance), 0, 1);
  points.push({ x: (lerp(a.x, b.x, f) - start.x) * scale, y: (lerp(a.y, b.y, f) - start.y) * scale,
    angle: lerp(a.angle, b.angle, f), curve: lerp(a.curve, b.curve, f) / scale });
}
// Eliminate numeric drift at the start/finish seam, including its tangent.
points[TRACK_LENGTH] = { ...points[0], angle: points[0].angle + Math.PI * 2 };

export function trackPoint(distance: number, lateral = 0): TrackPoint {
  const lap = Math.floor(distance / TRACK_LENGTH), s = distance - lap * TRACK_LENGTH;
  const index = Math.floor(s), f = s - index, a = points[index], b = points[index + 1];
  const angle = lerp(a.angle, b.angle, f) + lap * Math.PI * 2;
  return { x: lerp(a.x, b.x, f) + Math.cos(angle) * lateral,
    y: lerp(a.y, b.y, f) + Math.sin(angle) * lateral, angle, curve: lerp(a.curve, b.curve, f) };
}
export function curvatureAt(distance: number): number { return trackPoint(distance).curve; }
export function nextCorner(distance: number) {
  const corner = CORNERS.find(c => distance < c.end);
  return corner ? { number: corner.number, distance: Math.max(0, corner.start - distance), curve: corner.curve } : null;
}
