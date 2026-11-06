/**
 * Connector contracts for a later explicitly authorized integration phase.
 * No credentials, network clients, webhooks, or side effects in V1.
 */
import type { Assignment, ProjectOpsData, TimeSuggestion, TravelExpense } from "./model";

export type ProjectManagementProvider = "jira" | "microsoft-project";
export type FinancialProvider = "erp-or-psa";
export type TravelProvider = "company-travel-provider";

export interface ProjectAssignmentSnapshot {
  provider: ProjectManagementProvider;
  sourceAssignmentId: string;
  projectCode: string;
  consultantId: string;
  attendance: Assignment["attendance"];
  startDate: string;
  endDate: string;
  location: string;
  isConfirmedByPM: boolean;
}

export interface ProjectSystemConnector {
  readonly provider: ProjectManagementProvider;
  readConfirmedAssignments(firmId: string): Promise<ProjectAssignmentSnapshot[]>;
  createAdministrativeTask(firmId: string, projectCode: string, summary: string): Promise<{ externalTaskId: string }>;
}

export interface CalendarConnector {
  readTimeCandidates(firmId: string, userId: string, startDate: string, endDate: string): Promise<TimeSuggestion[]>;
}

export interface FinanceConnector {
  readProjectBudget(firmId: string, projectCode: string): Promise<number>;
  prepareApprovedInvoiceDraft(firmId: string, projectCode: string, sourceRefs: string[]): Promise<{ externalDraftId: string }>;
}

export interface CorporateTravelConnector {
  readConfirmedBookings(firmId: string, userId: string): Promise<TravelExpense[]>;
  proposeBookingChange(firmId: string, reservationRef: string, changes: Record<string, string>): Promise<{ proposedChangeId: string }>;
}

/**
 * Explicit opt-in and mapping will be required before real connectors are built:
 * tenant credentials, external project IDs, policy permissions, audit events,
 * approval thresholds, idempotency keys, and error-retry semantics.
 */
export interface ProjectOpsIntegrationConfig {
  firmId: string;
  enabled: false;
  projectSystem: null;
  calendar: null;
  finance: null;
  corporateTravel: null;
}

export function disabledIntegrationConfig(data: ProjectOpsData): ProjectOpsIntegrationConfig {
  return { firmId: data.firmId, enabled: false, projectSystem: null, calendar: null, finance: null, corporateTravel: null };
}

export function assertLiveIntegrationsDisabled(config: ProjectOpsIntegrationConfig): void {
  if (config.enabled !== false || config.projectSystem !== null || config.calendar !== null ||
      config.finance !== null || config.corporateTravel !== null) {
    throw new Error("Live integration is not authorized in Alec Project Operations V1");
  }
}
