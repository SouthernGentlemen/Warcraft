export const FPS = 60;
export const BP = 10_000;
export const ULTIMATE_MAX = 10_000;
export const DEFAULT_AUTO_TICKS = 120;
export const MAX_SIM_TICKS = FPS * 180;
export const FNV_OFFSET_BASIS = 0x811c9dc5;
export const FNV_PRIME = 0x01000193;

export function clampInt(value, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.trunc(value)));
}

export function mulBp(value, basisPoints) {
  return Math.trunc((Math.trunc(value) * Math.trunc(basisPoints)) / BP);
}
