export const MAX_CURRENCY = 1_000_000_000_000;

export function clampFinite(value: number | undefined, minimum: number, maximum: number) {
  const safe = Number.isFinite(value) ? (value as number) : minimum;
  return Math.min(maximum, Math.max(minimum, safe));
}

export function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function normalizePositive(values: readonly number[]) {
  const positive = values.map((value) => Math.max(0, Number.isFinite(value) ? value : 0));
  const total = positive.reduce((sum, value) => sum + value, 0);
  if (positive.length === 0) return [];
  if (total === 0) return positive.map(() => 1 / positive.length);
  return positive.map((value) => value / total);
}

export function createSeededRandom(requestedSeed: number) {
  let state = (Math.round(clampFinite(requestedSeed, 1, 2_147_483_646)) >>> 0) || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function percentile(sortedValues: readonly number[], requestedPercentile: number) {
  if (sortedValues.length === 0) return 0;
  const percentileValue = clampFinite(requestedPercentile, 0, 100) / 100;
  const index = Math.min(sortedValues.length - 1, Math.floor(percentileValue * (sortedValues.length - 1)));
  return sortedValues[index];
}
