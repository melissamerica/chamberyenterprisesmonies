import { afterEach, describe, expect, it, vi } from "vitest";
import { saveInteractiveTrip } from "./workspace-trip-client";
import type { UploadTrip } from "./workspace-uploads";

const draft: UploadTrip = {
  id: 123, name: "Client meeting", executiveId: "exec-1",
  traveler: "Alex", dates: "2026-11-04", route: "MIA → DEN", items: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("guarded interactive trip storage", () => {
  it("creates only if no existing trip id exists", async () => {
    const saved = { ...draft, updatedAt: "2026-11-03T12:00:00.000Z" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true, trip: saved }) });
    vi.stubGlobal("fetch", fetchMock);
    expect(await saveInteractiveTrip(draft)).toEqual(saved);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload).toEqual({ trips: [draft], ifMatch: null });
  });

  it("requires the exact prior server revision when editing", async () => {
    const existing = { ...draft, updatedAt: "2026-11-03T12:00:00.000Z" };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true, trip: { ...existing, updatedAt: "2026-11-03T12:01:00.000Z" } }) });
    vi.stubGlobal("fetch", fetchMock);
    await saveInteractiveTrip(existing);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).ifMatch).toBe(existing.updatedAt);
  });

  it("does not treat a rejected stale save as successful", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "This trip was changed in another session." }) });
    vi.stubGlobal("fetch", fetchMock);
    await expect(saveInteractiveTrip(draft)).rejects.toThrow("changed in another session");
  });

  it("does not accept a false success response with no revision", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true, trip: draft }) }));
    await expect(saveInteractiveTrip(draft)).rejects.toThrow("not saved");
  });
});
