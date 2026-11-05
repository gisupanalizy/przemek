import { ghostAt, type AttackRace, type AttackRecord } from './time-attack-engine.ts';
import { BARRIER, BRAKING_MARKERS, CHECKPOINTS, ROAD_HALF, SECTOR_ENDS, TRACK_LENGTH, trackPoint } from './time-attack-track.ts';

export type AttackCamera = { angle: number };
export function followAttackCamera(camera: AttackCamera, target: number, dt: number, reduced: boolean) {
  // 0 and 2π face the same way: retries must not rotate the camera a full turn.
  const difference = Math.atan2(Math.sin(target - camera.angle), Math.cos(target - camera.angle));
  camera.angle += difference * (reduced ? 1 : Math.min(1, Math.max(dt, 1 / 120) * 7));
}
export function renderAttack(ctx: CanvasRenderingContext2D, w: number, h: number, race: AttackRace,
  record: AttackRecord | null, camera: AttackCamera, dt: number, reduced: boolean) {
  const center = trackPoint(race.s);
  followAttackCamera(camera, center.angle, dt, reduced);
  const scale = Math.max(3.2, Math.min(w / 46, h / 70, 9));
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#42614b'; ctx.fillRect(0, 0, w, h);
  ctx.save(); ctx.translate(w / 2, h * 0.73); ctx.scale(scale, scale);
  ctx.rotate(-camera.angle); ctx.translate(-center.x, -center.y);
  const begin = Math.max(-35, Math.floor((race.s - 170) / 4) * 4);
  const end = Math.min(TRACK_LENGTH + 65, race.s + 210);
  const path = (offset: number) => {
    ctx.beginPath();
    for (let s = begin; s <= end; s += 3) { const p = trackPoint(s, offset); if (s === begin) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }
  };
  // Fixed trackside scenery: every attempt has exactly the same surroundings.
  for (let s = 0; s < TRACK_LENGTH; s += 15) {
    if (![s - TRACK_LENGTH, s, s + TRACK_LENGTH].some(v => v >= begin && v <= end)) continue;
    for (const side of [-1, 1]) {
      const p = trackPoint(s, side * (17 + Math.sin(s * 0.31) * 5));
      ctx.fillStyle = '#304b3c'; ctx.fillRect(p.x - 2.2, p.y - 1, 5, 5);
      ctx.fillStyle = s % 30 === 0 ? '#71905a' : '#5a7d50'; ctx.fillRect(p.x - 2.7, p.y - 2.5, 4.5, 4.5);
      ctx.fillStyle = '#91a06b'; ctx.fillRect(p.x - 1.9, p.y - 2, 1.4, 1.1);
    }
  }
  ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
  path(0); ctx.strokeStyle = '#9a9f88'; ctx.lineWidth = (BARRIER + 0.4) * 2; ctx.stroke();
  path(0); ctx.strokeStyle = '#698465'; ctx.lineWidth = (BARRIER - 0.6) * 2; ctx.stroke();
  path(0); ctx.strokeStyle = '#ece5cd'; ctx.lineWidth = (ROAD_HALF + 0.75) * 2; ctx.stroke();
  path(0); ctx.strokeStyle = '#373c43'; ctx.lineWidth = ROAD_HALF * 2; ctx.stroke();
  // Alternating kerbs sit outside the actual asphalt edge.
  for (let s = begin; s < end; s += 4) {
    for (const side of [-1, 1]) {
      const a = trackPoint(s, side * (ROAD_HALF + 0.38)), b = trackPoint(s + 4, side * (ROAD_HALF + 0.38));
      ctx.strokeStyle = Math.floor(s / 4) % 2 ? '#d3433f' : '#ece5cd'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  for (const side of [-1, 1]) {
    path(side * BARRIER); ctx.strokeStyle = '#d4d8cf'; ctx.lineWidth = 0.4; ctx.stroke();
    path(side * (ROAD_HALF - 0.13)); ctx.strokeStyle = '#d9ddce'; ctx.lineWidth = 0.12; ctx.stroke();
  }
  for (const s of [0, ...CHECKPOINTS]) {
    if (s < begin || s > end) continue;
    const p = trackPoint(s);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    if (s === 0 || s === TRACK_LENGTH) {
      for (let col = 0; col < 14; col++) for (let row = 0; row < 2; row++) {
        ctx.fillStyle = (col + row) % 2 ? '#1b2026' : '#f1eddb'; ctx.fillRect(-7 + col, -row, 1, 1);
      }
    } else {
      const sector = SECTOR_ENDS.includes(s);
      ctx.fillStyle = sector ? '#e7cd7a' : '#8ba1a7'; ctx.globalAlpha = sector ? 0.85 : 0.3;
      ctx.fillRect(-ROAD_HALF, 0, ROAD_HALF * 2, sector ? 0.24 : 0.12); ctx.globalAlpha = 1;
      ctx.fillStyle = sector ? '#e7cd7a' : '#9fc0b3';
      ctx.fillRect(-ROAD_HALF - 1.8, -1, 0.8, 2); ctx.fillRect(ROAD_HALF + 1, -1, 0.8, 2);
    }
    ctx.restore();
  }
  // Braking markers preview each of the six turns without choosing a line.
  for (const s of BRAKING_MARKERS) {
    if (s < begin || s > end) continue;
    const p = trackPoint(s, -ROAD_HALF - 1.5);
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
    ctx.fillStyle = '#edcd79'; ctx.fillRect(-0.7, -1.7, 1.4, 3.4);
    ctx.fillStyle = '#393b30'; ctx.fillRect(-0.35, -0.95, 0.7, 1.9); ctx.restore();
  }
  if (record) {
    const ghost = ghostAt(record.trace, race.time);
    if (ghost && Math.abs(ghost.s - race.s) < 180) drawCar(ctx, ghost.s, ghost.x, ghost.heading, '#76dce2', 0.4, false);
  }
  drawCar(ctx, race.s, race.x, race.heading, '#ed4740', 1, race.braking);
  ctx.restore();
}

function drawCar(ctx: CanvasRenderingContext2D, s: number, x: number, heading: number, color: string, alpha: number, brake: boolean) {
  const p = trackPoint(s, x);
  ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle + heading); ctx.globalAlpha = alpha;
  ctx.fillStyle = '#14201f'; ctx.fillRect(-1.15, -1.65, 2.5, 4.3);
  ctx.fillStyle = '#11171b';
  for (const side of [-1, 1]) { ctx.fillRect(side < 0 ? -0.95 : 0.55, -1.4, 0.4, 0.95); ctx.fillRect(side < 0 ? -0.95 : 0.55, 1.0, 0.4, 1.05); }
  ctx.fillStyle = color; ctx.fillRect(-0.32, -2.2, 0.64, 2.4); ctx.fillRect(-0.62, -0.6, 1.24, 2.5);
  ctx.fillRect(-0.88, -1.95, 1.76, 0.3); ctx.fillRect(-0.94, 1.9, 1.88, 0.35);
  ctx.fillStyle = '#f3ead7'; ctx.fillRect(-0.12, -1.7, 0.24, 1.1); ctx.fillRect(-0.9, 2.05, 1.8, 0.1);
  ctx.fillStyle = '#17232c'; ctx.fillRect(-0.25, -0.1, 0.5, 0.9);
  ctx.fillStyle = '#e5b67c'; ctx.fillRect(-0.18, 0.05, 0.36, 0.36);
  ctx.fillStyle = brake ? '#ffae7a' : '#ab302f'; ctx.fillRect(-0.15, 2.25, 0.3, 0.2);
  ctx.restore();
}

export function trackMapPath(): string {
  const points = Array.from({ length: Math.ceil(TRACK_LENGTH / 8) + 1 }, (_, i) => trackPoint(Math.min(TRACK_LENGTH, i * 8)));
  const minX = Math.min(...points.map(p => p.x)), maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y)), maxY = Math.max(...points.map(p => p.y));
  const scale = Math.min(260 / (maxX - minX), 250 / (maxY - minY));
  return points.map((p, i) => `${i ? 'L' : 'M'}${((p.x - (minX + maxX) / 2) * scale + 150).toFixed(1)},${((p.y - (minY + maxY) / 2) * scale + 150).toFixed(1)}`).join(' ') + ' Z';
}
