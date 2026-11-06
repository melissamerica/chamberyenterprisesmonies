import { describe, expect, it } from "vitest";
import { clearWorkspaceCacheForUser, legacyWorkspaceExists, scopedWorkspaceCache } from "./workspace-cache";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: key => data.get(key) ?? null,
    key: index => [...data.keys()][index] ?? null,
    removeItem: key => { data.delete(key); },
    setItem: (key, value) => { data.set(key, value); },
  };
}

describe("authenticated workspace browser cache", () => {
  it("isolates firm and user copies of the same key", () => {
    const storage = memoryStorage();
    const aliceFirmA = scopedWorkspaceCache(storage, "alice", "firm-a");
    const aliceFirmB = scopedWorkspaceCache(storage, "alice", "firm-b");
    const bobFirmA = scopedWorkspaceCache(storage, "bob", "firm-a");
    aliceFirmA.set("trip-workspace-trips", "[1]");
    aliceFirmB.set("trip-workspace-trips", "[2]");
    bobFirmA.set("trip-workspace-trips", "[3]");
    expect(aliceFirmA.get("trip-workspace-trips")).toBe("[1]");
    expect(aliceFirmB.get("trip-workspace-trips")).toBe("[2]");
    expect(bobFirmA.get("trip-workspace-trips")).toBe("[3]");
  });

  it("keeps pre-authentication local data quarantined", () => {
    const storage = memoryStorage();
    storage.setItem("trip-workspace-trips", '[{"id":7}]');
    expect(legacyWorkspaceExists(storage)).toBe(true);
    expect(scopedWorkspaceCache(storage, "alice", "firm-a").get("trip-workspace-trips")).toBeNull();
    expect(storage.getItem("trip-workspace-trips")).toContain('"id":7');
  });

  it("clears only the signing-out user's scoped cache", () => {
    const storage = memoryStorage();
    const alice = scopedWorkspaceCache(storage, "alice", "firm-a");
    const bob = scopedWorkspaceCache(storage, "bob", "firm-a");
    alice.set("any", "alice-record");
    bob.set("any", "bob-record");
    storage.setItem("trip-workspace-trips", "legacy-still-preserved");
    clearWorkspaceCacheForUser(storage, "alice");
    expect(alice.get("any")).toBeNull();
    expect(bob.get("any")).toBe("bob-record");
    expect(storage.getItem("trip-workspace-trips")).toBe("legacy-still-preserved");
  });

  it("requires both authenticated identifiers", () => {
    const storage = memoryStorage();
    expect(() => scopedWorkspaceCache(storage, "", "firm")).toThrow();
    expect(() => scopedWorkspaceCache(storage, "alice", "")).toThrow();
  });
});
