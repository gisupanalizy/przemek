import { roadCurve, type Race } from './race-engine.ts';
import { projectRoadPoint } from './race-track.ts';
import { sprintSpritePoint, SPRINT_TYRES, SPRINT_WHITE_INNER, SPRINT_WHITE_OUTER, SPRINT_YAW_PER_STEER } from './track-limits.ts';

type Point = { x: number; y: number; half: number; scale: number };

export function renderRace(ctx: CanvasRenderingContext2D, w: number, h: number, race: Race, reducedMotion: boolean) {
  const horizon = h * 0.31;
  const offsets: number[] = [];
  let heading = 0, offset = 0;
  for (let i = 0; i <= 121; i++) {
    offsets.push(offset);
    heading += roadCurve(race.distance + i * 6) * 6 * w * 0.00007;
    offset += heading * 6;
  }
  const project = (z: number): Point => {
    const index = Math.max(0, Math.min(120, Math.floor(z / 6)));
    const bend = z < 0 ? 0 : offsets[index] + (offsets[index + 1] - offsets[index]) * Math.min(1, z / 6 - index);
    return projectRoadPoint(w, h, z, race.x, bend);
  };
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#76c6d8'; ctx.fillRect(0, 0, w, h);
  // Camera shake moves the road and tyres together, keeping contact unchanged.
  ctx.save();
  ctx.translate(!reducedMotion && race.protection > 1 ? Math.sin(race.time * 90) * 3 : 0, 0);
  ctx.fillStyle = '#dcebd4'; ctx.fillRect(0, horizon * 0.73, w, horizon * 0.3);
  // Authored pixel skyline and low hills, with no network assets.
  ctx.fillStyle = '#8ea88e';
  for (let i = -1; i < 17; i++) {
    const x = i * w / 15 - Math.sin(race.distance / 2200) * 18;
    const height = (0.12 + (Math.sin(i * 1.8) + 1) * 0.13) * horizon;
    ctx.fillRect(x, horizon - height, w / 13, height);
  }
  ctx.fillStyle = '#476c57'; ctx.fillRect(0, horizon - 6, w, 9);
  ctx.fillStyle = '#347057'; ctx.fillRect(0, horizon + 3, w, h - horizon);
  const quad = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number, color: string) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, cy); ctx.lineTo(dx, dy); ctx.closePath(); ctx.fill();
  };
  const vanishing = project(720);
  quad(vanishing.x, horizon + 2, vanishing.x, horizon + 2,
    vanishing.x + vanishing.half, vanishing.y + 1, vanishing.x - vanishing.half, vanishing.y + 1, '#3c424c');
  for (let i = 119; i >= 0; i--) {
    const nearZ = i * 6, farZ = (i + 1) * 6;
    const n = project(nearZ), f = project(farZ);
    const alternate = Math.floor((race.distance + nearZ) / 6) % 2 === 0;
    ctx.fillStyle = alternate ? '#39775d' : '#347057'; ctx.fillRect(0, f.y, w, n.y - f.y + 1);
    quad(f.x - f.half * 1.19, f.y, f.x + f.half * 1.19, f.y, n.x + n.half * 1.19, n.y, n.x - n.half * 1.19, n.y, '#91a19a');
    quad(f.x - f.half * 1.08, f.y, f.x + f.half * 1.08, f.y, n.x + n.half * 1.08, n.y, n.x - n.half * 1.08, n.y, alternate ? '#f1e9d7' : '#d8383a');
    quad(f.x - f.half, f.y, f.x + f.half, f.y, n.x + n.half, n.y, n.x - n.half, n.y, alternate ? '#3c424c' : '#3a4049');
    for (const side of [-1, 1]) {
      quad(f.x + side * f.half * SPRINT_WHITE_OUTER, f.y, f.x + side * f.half * SPRINT_WHITE_INNER, f.y,
        n.x + side * n.half * SPRINT_WHITE_INNER, n.y, n.x + side * n.half * SPRINT_WHITE_OUTER, n.y, '#eee9db');
    }
    if (alternate) for (const lane of [-1 / 3, 1 / 3]) {
      const ft = f.half * 0.008, nt = n.half * 0.008;
      quad(f.x + f.half * lane - ft, f.y, f.x + f.half * lane + ft, f.y,
        n.x + n.half * lane + nt, n.y, n.x + n.half * lane - nt, n.y, '#b7b9b7');
    }
  }
  // Trackside light posts and grandstand blocks move with world distance.
  for (let i = 11; i >= 1; i--) {
    const z = ((i * 70 - race.distance % 70) + 840) % 840;
    if (z < 10) continue;
    const p = project(z);
    for (const side of [-1, 1]) {
      const x = p.x + side * p.half * 1.28;
      ctx.fillStyle = '#cfdbcc'; ctx.fillRect(x, p.y - 180 * p.scale, Math.max(2, 5 * p.scale), 180 * p.scale);
      ctx.fillStyle = '#26382e'; ctx.fillRect(x - 28 * p.scale, p.y - 180 * p.scale, 58 * p.scale, 10 * p.scale);
    }
  }
  const ahead = race.rivals.filter(r => r.distance - race.distance > -20 && r.distance - race.distance < 720)
    .sort((a, b) => b.distance - a.distance);
  for (const rival of ahead) {
    const p = project(rival.distance - race.distance);
    drawCar(ctx, p.x + rival.x * p.half, p.y, Math.min(w * 0.36, w * 0.205 * p.scale), rival.color, false, 0, false);
  }
  ctx.save(); ctx.globalAlpha = race.protection > 0 && Math.floor(race.time * 12) % 2 === 0 ? 0.65 : 1;
  const player: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'> = {
    get fillStyle() { return ctx.fillStyle; },
    set fillStyle(color) { ctx.fillStyle = color; },
    fillRect(x, y, width, height) {
      const points = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]].map(([sx, sy]) => {
        const point = sprintSpritePoint(sx, sy, race.steering);
        const road = project(Math.max(0, point.z));
        return { x: road.x + (race.x + point.lateral) * road.half, y: road.y };
      });
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) ctx.lineTo(point.x, point.y);
      ctx.closePath(); ctx.fill();
    },
  };
  paintCar(player, '#e53938', race.boost, h * 0.98);
  ctx.restore();
  if (race.boost && !reducedMotion) {
    ctx.strokeStyle = '#c3edf8'; ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const y = horizon + ((i * 71 + race.time * 350) % Math.max(1, h - horizon));
      const x = w * 0.5 + side * (w * 0.35 + i * 7);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * 18, y + 45); ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCar(ctx: CanvasRenderingContext2D, x: number, bottom: number, width: number, color: string, player: boolean, steering: number, boost: boolean) {
  const u = width / 100;
  ctx.save(); ctx.translate(Math.round(x), Math.round(bottom)); ctx.scale(u, u);
  if (player) ctx.rotate(steering * SPRINT_YAW_PER_STEER);
  paintCar(ctx, color, boost, bottom);
  ctx.restore();
}

function paintCar(ctx: Pick<CanvasRenderingContext2D, 'fillStyle' | 'fillRect'>, color: string, boost: boolean, bottom: number) {
  ctx.fillStyle = '#171c23'; ctx.fillRect(-47, -53, 94, 51);
  ctx.fillStyle = '#080c12';
  for (const tyre of SPRINT_TYRES) ctx.fillRect(tyre.x, tyre.y, tyre.w, tyre.h);
  ctx.fillStyle = '#414651';
  for (const sx of [-1, 1]) { ctx.fillRect(sx < 0 ? -46 : 39, -80, 5, 22); ctx.fillRect(sx < 0 ? -49 : 43, -34, 5, 28); }
  ctx.fillStyle = '#d6dcd9'; ctx.fillRect(-36, -88, 72, 6);
  ctx.fillStyle = color;
  ctx.fillRect(-14, -90, 28, 36); ctx.fillRect(-22, -60, 44, 48); ctx.fillRect(-29, -43, 58, 24);
  ctx.fillStyle = '#ecede0'; ctx.fillRect(-3, -88, 6, 27);
  ctx.fillStyle = '#111923'; ctx.fillRect(-10, -62, 20, 27);
  ctx.fillStyle = '#f0c66c'; ctx.fillRect(-6, -57, 12, 11);
  ctx.fillStyle = '#303b44'; ctx.fillRect(-6, -53, 12, 4);
  ctx.fillStyle = '#e4e7da'; ctx.fillRect(-13, -64, 4, 30); ctx.fillRect(9, -64, 4, 30); ctx.fillRect(-13, -65, 26, 4);
  ctx.fillStyle = '#0e1720'; ctx.fillRect(-40, -16, 80, 13);
  ctx.fillStyle = color; ctx.fillRect(-42, -18, 84, 5); ctx.fillRect(-42, -5, 84, 3);
  ctx.fillStyle = '#e9e7da'; ctx.fillRect(-24, -14, 48, 3);
  if (boost) { const plume = 16 + Math.sin(bottom * 2) * 3; ctx.fillStyle = '#61d8ef'; ctx.fillRect(-11, -4, 22, plume); ctx.fillStyle = '#e2fcff'; ctx.fillRect(-5, -4, 10, plume + 8); }
}
