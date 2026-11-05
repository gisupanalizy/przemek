// Versioned arcade rules; classic physics never invokes these modifiers.
export type AttackMode = 'classic' | 'snacks';
export type SnackKind = 'specjal' | 'kebab';
// Bump this when balance or item positions change: saved ghosts depend on both.
export const SNACK_RULES_VERSION = 'specjal-kebab-v2';
export const SNACK_BALANCE = {
  hungerSeconds: 45, warning: 70, critical: 80, minimumPace: 0.6,
  specjalSeconds: 5, blurSeconds: 3, specjalPace: 1.2,
  digestionSeconds: 4, digestionPace: 0.85, blurPixels: 3,
  pickupHalfWidth: 1.6,
} as const;
export const SNACK_ITEMS: ReadonlyArray<{ kind: SnackKind; s: number; x: number }> = [
  { kind: 'kebab', s: 40, x: -2.8 },
  { kind: 'specjal', s: 220, x: 2.8 },
  { kind: 'specjal', s: 440, x: -2.8 },
  { kind: 'kebab', s: 600, x: 2.8 },
  { kind: 'kebab', s: 760, x: -2.8 },
  { kind: 'specjal', s: 890, x: 2.8 },
  { kind: 'kebab', s: 1020, x: -2.8 },
  { kind: 'specjal', s: 1180, x: 2.8 },
];
export const SNACK_TOTALS = {
  specjal: SNACK_ITEMS.filter(item => item.kind === 'specjal').length,
  kebab: SNACK_ITEMS.filter(item => item.kind === 'kebab').length,
} as const;
export type SnackState = {
  hunger: number; specjalLeft: number; blurLeft: number; digestionLeft: number;
  collected: boolean[]; specials: number; kebabs: number;
  message: string; messageLeft: number; warned: boolean;
};
export function createSnacks(): SnackState {
  return { hunger: 0, specjalLeft: 0, blurLeft: 0, digestionLeft: 0,
    collected: SNACK_ITEMS.map(() => false), specials: 0, kebabs: 0,
    message: '', messageLeft: 0, warned: false };
}
export function advanceSnacks(state: SnackState, dt: number) {
  state.hunger = Math.min(100, state.hunger + dt * 100 / SNACK_BALANCE.hungerSeconds);
  state.specjalLeft = Math.max(0, state.specjalLeft - dt);
  state.blurLeft = Math.max(0, state.blurLeft - dt);
  state.digestionLeft = Math.max(0, state.digestionLeft - dt);
  state.messageLeft = Math.max(0, state.messageLeft - dt);
  if (state.hunger >= SNACK_BALANCE.warning && !state.warned) {
    state.warned = true; state.message = 'PRZEMEK, CZAS NA KEBABA'; state.messageLeft = 3;
  }
}
export function snackPace(state: SnackState, offroad: boolean): number {
  const hungerPace = 1 - Math.max(0, state.hunger - SNACK_BALANCE.critical)
    / (100 - SNACK_BALANCE.critical) * (1 - SNACK_BALANCE.minimumPace);
  return hungerPace * (state.digestionLeft > 0 ? SNACK_BALANCE.digestionPace : 1)
    * (!offroad && state.specjalLeft > 0 ? SNACK_BALANCE.specjalPace : 1);
}
// Sweep through the same longitudinal/lateral coordinates used by the renderer.
// A missed item stays missed; there is no respawn or collection from the grass.
export function collectSnacks(state: SnackState, fromS: number, fromX: number, toS: number, toX: number) {
  if (toS <= fromS) return;
  SNACK_ITEMS.forEach((item, i) => {
    if (state.collected[i] || item.s < fromS || item.s > toS) return;
    const f = (item.s - fromS) / (toS - fromS), x = fromX + (toX - fromX) * f;
    if (Math.abs(x - item.x) > SNACK_BALANCE.pickupHalfWidth) return;
    state.collected[i] = true;
    if (item.kind === 'specjal') {
      state.specials++; state.specjalLeft = SNACK_BALANCE.specjalSeconds; state.blurLeft = SNACK_BALANCE.blurSeconds;
      state.message = 'SPECJAL WJECHAŁ · +20% PRĘDKOŚCI';
    } else {
      state.kebabs++; state.hunger = 0; state.warned = false;
      state.digestionLeft = SNACK_BALANCE.digestionSeconds;
      state.message = 'KEBAB ZJEDZONY · CHWILA NA TRAWIENIE';
    }
    state.messageLeft = 3;
  });
}
