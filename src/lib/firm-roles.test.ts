import { describe, expect, it } from "vitest";
import { assignableRoles, canEditWorkspace, canManageMembers } from "./firm-roles";

describe("firm roles", () => {
  it("viewers cannot edit the workspace", () => {
    expect(canEditWorkspace("viewer")).toBe(false);
    expect(canEditWorkspace("editor")).toBe(true);
  });
  it("only owners and admins manage the team", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("admin")).toBe(true);
    expect(canManageMembers("editor")).toBe(false);
  });
  it("admins cannot grant owner or admin", () => {
    expect(assignableRoles("admin")).toEqual(["editor", "viewer"]);
    expect(assignableRoles("owner")).toContain("admin");
    expect(assignableRoles("editor")).toEqual([]);
  });
});
