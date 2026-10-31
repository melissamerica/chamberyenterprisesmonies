export type ExecutivePrincipal = {
  userId: string;
  tenantId: string;
  sessionId: string;
  roles: ReadonlyArray<"executive" | "ea" | "chief_of_staff" | "admin">;
};
/**
 * SECURITY STOP: must be replaced with a VERIFIED server-side IdP session
 * plus database-backed tenant membership. Never trust submitted executiveId,
 * tenantId, arbitrary cookies, or user-controlled forwarded identity headers.
 * Fail CLOSED until an auth provider is selected and integrated.
 */
export async function requireExecutivePrincipal(): Promise<ExecutivePrincipal> {
  throw new Error("AUTH_PROVIDER_NOT_CONNECTED: protected feature intentionally disabled");
}
