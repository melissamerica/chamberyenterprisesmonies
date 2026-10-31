export type FirmRole = "owner" | "admin" | "editor" | "viewer";

export const roleLabels: Record<FirmRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const roleDescriptions: Record<FirmRole, string> = {
  owner: "Full control, including single sign-on and admins.",
  admin: "Manages the team and all workspace data.",
  editor: "Creates and edits executives, trips, and expenses.",
  viewer: "Read-only access to the workspace.",
};

export const canManageMembers = (role: FirmRole) => role === "owner" || role === "admin";
export const canEditWorkspace = (role: FirmRole) => role !== "viewer";

/** Roles a manager may grant or change. Admins cannot create or modify owners/admins. */
export function assignableRoles(role: FirmRole): FirmRole[] {
  if (role === "owner") return ["owner", "admin", "editor", "viewer"];
  if (role === "admin") return ["editor", "viewer"];
  return [];
}
