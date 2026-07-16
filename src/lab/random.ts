export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRandom(seed: number) {
  let state = (seed >>> 0) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomBetween(random: () => number, minimum: number, maximum: number) {
  return minimum + (maximum - minimum) * random();
}

export function randomNormal(random: () => number) {
  const u = Math.max(Number.EPSILON, random());
  const v = Math.max(Number.EPSILON, random());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function sampleDistribution(
  random: () => number,
  distribution: "normal" | "triangular" | "beta" | "uniform" | "bernoulli",
) {
  if (distribution === "normal") return Math.max(-2.5, Math.min(2.5, randomNormal(random))) / 2.5;
  if (distribution === "triangular") return (random() + random() - 1);
  if (distribution === "beta") return ((random() + random() + random() + random()) / 4 - 0.5) * 2;
  if (distribution === "bernoulli") return random() > 0.5 ? 1 : -1;
  return random() * 2 - 1;
}

export function clamp(value: number, minimum = 0, maximum = 100) {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}

export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

