import { beforeEach, describe, expect, it, vi } from "vitest";
const mocked = vi.hoisted(() => ({
  getUser: vi.fn(),
  memberships: [] as Array<{ firm_id: string; role: string; created_at: string }>,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    auth: { getUser: mocked.getUser },
    from: (table: string) => {
      if (table !== "firm_members") throw new Error("Unexpected table");
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({ data: mocked.memberships }),
          }),
        }),
      };
    },
  },
}));
import { currentTenant, withTenant } from "./tenant";

const request = (method = "GET", requestedFirm?: string, bearer = true) =>
  new Request("http://localhost/api/uploads", {
    method,
    headers: {
      ...(bearer ? { Authorization: "Bearer valid-session-token" } : {}),
      ...(requestedFirm ? { "x-firm-id": requestedFirm } : {}),
    },
  });

beforeEach(() => {
  mocked.getUser.mockReset().mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  mocked.memberships = [{ firm_id: "firm-a", role: "editor", created_at: "2026-01-01" }];
});

describe("verified firm request boundary", () => {
  it("does not accept unauthenticated workspace requests", async () => {
    const response = await withTenant(request("GET", undefined, false), async () => Response.json({ ok: true }));
    expect(response.status).toBe(401);
    expect(mocked.getUser).not.toHaveBeenCalled();
  });

  it("does not allow an unrecognized x-firm-id to override membership", async () => {
    const response = await withTenant(request("GET", "another-customers-firm"), async () => Response.json(currentTenant()));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ firmId: "firm-a", role: "editor", userId: "user-a" });
  });

  it("rejects viewer writes before running the handler", async () => {
    mocked.memberships = [{ firm_id: "firm-a", role: "viewer", created_at: "2026-01-01" }];
    const handler = vi.fn(async () => Response.json({ ok: true }));
    const response = await withTenant(request("PUT"), handler);
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("requires a verified membership even with a valid user session", async () => {
    mocked.memberships = [];
    const response = await withTenant(request(), async () => Response.json({ ok: true }));
    expect(response.status).toBe(401);
  });
});
