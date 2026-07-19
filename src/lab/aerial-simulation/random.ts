export interface SeededRandom {
  uniform: () => number;
  normal: () => number;
}

export function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  return (Math.trunc(seed) >>> 0) || 1;
}

/** Mulberry32 plus a cached Box-Muller transform. */
export function createSeededRandom(seed: number): SeededRandom {
  let state = normalizeSeed(seed);
  let spareNormal: number | null = null;

  const uniform = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };

  const normal = () => {
    if (spareNormal !== null) {
      const value = spareNormal;
      spareNormal = null;
      return value;
    }
    const u1 = Math.max(Number.EPSILON, uniform());
    const u2 = uniform();
    const magnitude = Math.sqrt(-2 * Math.log(u1));
    const angle = 2 * Math.PI * u2;
    spareNormal = magnitude * Math.sin(angle);
    return magnitude * Math.cos(angle);
  };

  return { uniform, normal };
}

export function deriveSeed(seed: number, label: string): number {
  let hash = normalizeSeed(seed) ^ 2_166_136_261;
  for (let index = 0; index < label.length; index += 1) {
    hash ^= label.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return normalizeSeed(hash);
}
