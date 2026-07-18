const PRIVATE_SESSION_PREFIX = "vg-private-";

/** Removes private data left by a different identity in the same browser tab. */
export function purgeForeignPrivateSessionData(
  storage: { length: number; key: (index: number) => string | null; removeItem: (key: string) => void },
  currentKeys: { mission: string; feasibility: string },
) {
  const allowed = new Set([currentKeys.mission, currentKeys.feasibility]);
  const foreign: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(PRIVATE_SESSION_PREFIX) && !allowed.has(key)) foreign.push(key);
  }
  for (const key of foreign) storage.removeItem(key);
}
