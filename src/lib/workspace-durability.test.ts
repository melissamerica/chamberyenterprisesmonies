import { describe, expect, it, vi } from "vitest";
import { clearUserNavigation, missingById, navigationKey, persistFirmTrip, readLegacyWorkspace } from "./workspace-durability";
import type { UploadTrip } from "./workspace-uploads";

const trip = (id: number): UploadTrip => ({ id, executiveId: "exec-1", name: `Trip ${id}`, traveler: "Executive", dates: "", route: "", items: [] });

describe("firm workspace durability", () => {
  it("never imports legacy data without an explicit read", () => {
    const getItem = vi.fn((key: string) => key === "trip-workspace-trips" ? JSON.stringify([trip(1)]) : "[]");
    expect(getItem).not.toHaveBeenCalled();
    expect(readLegacyWorkspace({ getItem }).trips).toHaveLength(1);
  });

  it("does not overwrite firm data when recovering old browser records", () => {
    expect(missingById([trip(1)], [trip(1), trip(2), trip(2)]).map(t => t.id)).toEqual([2]);
  });

  it("rejects malformed legacy caches without deleting them", () => {
    const getItem = vi.fn((key: string) => key.includes("trips") ? "{invalid" : JSON.stringify([{ id: "", name: "" }]));
    expect(readLegacyWorkspace({ getItem })).toEqual({ trips: [], executives: [] });
  });

  it("requires explicit success confirmation from the server", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: false }) }) as unknown as typeof fetch;
    await expect(persistFirmTrip(trip(2), request)).rejects.toThrow(/could not be saved/);
    expect(vi.mocked(request)).toHaveBeenCalledWith("/api/uploads", expect.objectContaining({ method: "PUT" }));
  });

  it("accepts a confirmed firm-scoped server write", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true }) }) as unknown as typeof fetch;
    await expect(persistFirmTrip(trip(3), request)).resolves.toBeUndefined();
  });

  it("never sends a trip with no executive ownership", async () => {
    const request = vi.fn() as unknown as typeof fetch;
    await expect(persistFirmTrip({ ...trip(3), executiveId: "" }, request)).rejects.toThrow(/executive/);
    expect(vi.mocked(request)).not.toHaveBeenCalled();
  });

  it("separates navigation by firm and user and clears only the signed-out user", () => {
    const values = new Map<string, string>();
    const a = navigationKey("firm-A", "user-1", "last-workspace");
    const b = navigationKey("firm-B", "user-1", "last-workspace");
    const c = navigationKey("firm-A", "user-2", "last-workspace");
    [a, b, c, "trip-workspace-trips"].forEach(key => values.set(key, "test"));
    const storage = {
      get length() { return values.size; },
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => { values.delete(key); },
    };
    clearUserNavigation(storage, "user-1");
    expect([...values.keys()]).toEqual([c, "trip-workspace-trips"]);
  });
});
