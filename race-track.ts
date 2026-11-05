export const ROAD_HALF_WIDTH_RATIO = 0.82;
export const OFFROAD_LIMIT = 0.92;
export const LAP_LENGTH = 2100;

const SECTIONS = [
  { end: 360, curve: 0, speed: 90, name: 'PROSTA STARTOWA' },
  { end: 600, curve: 0.55, speed: 73, name: 'PRAWY ZAKRĘT' },
  { end: 900, curve: 0, speed: 90, name: 'PROSTA' },
  { end: 1130, curve: -0.9, speed: 58, name: 'CIASNY LEWY' },
  { end: 1510, curve: 0, speed: 90, name: 'PROSTA' },
  { end: 1770, curve: 0.72, speed: 66, name: 'PRAWY ZAKRĘT' },
  { end: LAP_LENGTH, curve: 0, speed: 90, name: 'PROSTA DO METY' },
];

export function trackAt(distance: number) {
  const local = ((distance % LAP_LENGTH) + LAP_LENGTH) % LAP_LENGTH;
  const index = SECTIONS.findIndex(section => local < section.end);
  const section = SECTIONS[index];
  const start = index === 0 ? 0 : SECTIONS[index - 1].end;
  const ramp = Math.max(0, Math.min(1, (local - start) / 45, (section.end - local) / 45));
  let nextTurn = section.curve;
  let nextDistance = 0;
  let nextSpeed = section.speed;
  if (section.curve === 0) {
    for (let step = 1; step <= SECTIONS.length; step++) {
      const next = (index + step) % SECTIONS.length;
      if (SECTIONS[next].curve !== 0) {
        const nextStart = next === 0 ? 0 : SECTIONS[next - 1].end;
        nextDistance = (nextStart - local + LAP_LENGTH) % LAP_LENGTH;
        nextTurn = SECTIONS[next].curve; nextSpeed = SECTIONS[next].speed;
        break;
      }
    }
  }
  return {
    curve: section.curve * ramp, safeSpeed: section.speed,
    inCorner: section.curve !== 0, section: Math.floor(distance / LAP_LENGTH) * SECTIONS.length + index,
    name: section.name, nextTurn, nextDistance, nextSpeed,
  };
}

// Rendering and physics use the same normalised road coordinates.
export function projectRoadPoint(width: number, height: number, z: number, lane: number, bend = 0) {
  const scale = 32 / (32 + z);
  const half = width * ROAD_HALF_WIDTH_RATIO * scale;
  return { x: width / 2 + bend * scale - lane * half,
    y: height * 0.31 + height * 0.69 * scale, half, scale };
}
