/**
 * Browser preferences are scoped to the authenticated person AND firm.
 * Server records are authoritative; the cache must never import data from
 * unscoped prototype keys without an explicit user recovery action.
 */
export const LEGACY_WORKSPACE_KEYS = [
  "trip-workspace-trips",
  "trip-workspace-calendar-publishing",
  "trip-workspace-dismissed-attention",
  "anya-executives",
  "anya-selected-executive",
  "anya-last-workspace",
  "anya-last-edited-page",
] as const;

const prefixForUser = (userId: string) => `chambery-workspace-v1:${encodeURIComponent(userId)}:`;
const prefixForFirm = (userId: string, firmId: string) => `${prefixForUser(userId)}${encodeURIComponent(firmId)}:`;

export function scopedWorkspaceCache(storage: Pick<Storage, "getItem" | "setItem" | "removeItem">, userId: string, firmId: string) {
  if (!userId || !firmId) throw new Error("Workspace storage requires a verified user and firm.");
  const prefix = prefixForFirm(userId, firmId);
  return {
    get: (key: string) => storage.getItem(prefix + key),
    set: (key: string, value: string) => storage.setItem(prefix + key, value),
    remove: (key: string) => storage.removeItem(prefix + key),
  };
}

export function clearWorkspaceCacheForUser(storage: Storage, userId: string) {
  if (!userId) return;
  const prefix = prefixForUser(userId);
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  for (const key of keys) storage.removeItem(key);
}

/** Old local-only data may belong to a different account. Never automatically merge it. */
export function legacyWorkspaceExists(storage: Pick<Storage, "getItem">) {
  return LEGACY_WORKSPACE_KEYS.some(key => storage.getItem(key) !== null);
}
