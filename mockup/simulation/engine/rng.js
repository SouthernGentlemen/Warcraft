const ZERO_SEED_SUBSTITUTE = 0x9e3779b9 | 0;

export function nextRandom(state) {
  let x = state.rng | 0;
  if (x === 0) x = ZERO_SEED_SUBSTITUTE;
  x ^= x << 13;
  x |= 0;
  x ^= x >>> 17;
  x ^= x << 5;
  x |= 0;
  state.rng = x | 0;
  return x & 0x7fffffff;
}

export function randomRange(state, lo, hi) {
  if (hi <= lo) return lo;
  const span = hi - lo + 1;
  return lo + (nextRandom(state) % span);
}

export function rollBasisPoints(state, chanceBp) {
  if (chanceBp <= 0) return false;
  if (chanceBp >= 10_000) {
    randomRange(state, 0, 9_999);
    return true;
  }
  return randomRange(state, 0, 9_999) < chanceBp;
}
