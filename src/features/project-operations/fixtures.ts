import type { ProjectOpsData } from "./model";

/**
 * Fictional data only. Called after the user explicitly opens the isolated PM workspace.
 * `firmId` labels the in-memory session; no real firm or customer records are read.
 */
export function createSyntheticPortfolio(firmId: string): ProjectOpsData {
  if (!firmId) throw new Error("Firm membership is required");
  return {
    firmId,
    projects: [
      { id: "p-denver", code: "DEN-104", client: "Acme Manufacturing (fictional)", name: "Denver Implementation",
        budgetCents: 15000000, contractedRevenueCents: 24500000, recognizedRevenueCents: 12500000,
        laborCostToDateCents: 7800000, futureLaborForecastCents: 6300000, hourlyBillingRateCents: 22500,
        status: "at-risk", nextMilestone: "2026-11-20 • Implementation review",
        risks: ["Forecast costs exceed the project budget", "Subcontractor approval pending"] },
      { id: "p-boston", code: "BOS-209", client: "Bluewater Health (fictional)", name: "Boston Systems Migration",
        budgetCents: 24000000, contractedRevenueCents: 37500000, recognizedRevenueCents: 17500000,
        laborCostToDateCents: 9600000, futureLaborForecastCents: 9800000, hourlyBillingRateCents: 25000,
        status: "active", nextMilestone: "2026-12-04 • Testing complete",
        risks: ["Vendor deliverable awaiting documentation"] },
      { id: "p-atlanta", code: "ATL-315", client: "Crescent Logistics (fictional)", name: "Atlanta Operations Assessment",
        budgetCents: 9000000, contractedRevenueCents: 14800000, recognizedRevenueCents: 6400000,
        laborCostToDateCents: 3500000, futureLaborForecastCents: 3900000, hourlyBillingRateCents: 19500,
        status: "active", nextMilestone: "2026-11-27 • Findings presentation", risks: [] },
    ],
    assignments: [
      { id: "as-1", projectId: "p-denver", consultant: "Alex Morgan", allocationPct: 60, attendance: "onsite", city: "Denver", startDate: "2026-11-09", endDate: "2026-11-20", source: "jira" },
      { id: "as-2", projectId: "p-denver", consultant: "Jordan Lee", allocationPct: 100, attendance: "hybrid", city: "Denver", startDate: "2026-11-09", endDate: "2026-11-20", source: "microsoft-project" },
      { id: "as-3", projectId: "p-boston", consultant: "Alex Morgan", allocationPct: 40, attendance: "remote", city: "Boston", startDate: "2026-11-09", endDate: "2026-11-20", source: "jira" },
      { id: "as-4", projectId: "p-boston", consultant: "Sam Rivera", allocationPct: 75, attendance: "onsite", city: "Boston", startDate: "2026-11-09", endDate: "2026-12-04", source: "jira" },
      { id: "as-5", projectId: "p-atlanta", consultant: "Taylor Brooks", allocationPct: 100, attendance: "onsite", city: "Atlanta", startDate: "2026-11-09", endDate: "2026-11-27", source: "microsoft-project" },
    ],
    travel: [
      { id: "travel-1", projectId: "p-denver", category: "flight", description: "Flight to Denver", reservationRef: "DEMO-UA119",
        sourceDocument: "flight-confirmation-demo.txt", committedCents: 65000, actualCents: null, clientReimbursable: true, date: "2026-11-09" },
      { id: "travel-2", projectId: "p-denver", category: "hotel", description: "Denver hotel • 4 nights", reservationRef: "DEMO-HT884",
        sourceDocument: "hotel-confirmation-demo.txt", committedCents: 120000, actualCents: 118000, clientReimbursable: true, date: "2026-11-09" },
      { id: "travel-3", projectId: "p-boston", category: "flight", description: "Flight to Boston", reservationRef: "DEMO-DL220",
        sourceDocument: "flight-boston-demo.txt", committedCents: 75000, actualCents: 75000, clientReimbursable: true, date: "2026-11-11" },
      { id: "travel-4", projectId: "p-atlanta", category: "ground", description: "Ground transport", reservationRef: "DEMO-GR330",
        sourceDocument: "ground-demo.txt", committedCents: 21500, actualCents: null, clientReimbursable: false, date: "2026-11-14" },
    ],
    invoices: [
      { id: "v-1", projectId: "p-denver", vendor: "Fictional Integration Partners", invoiceNumber: "DEMO-INV-1001", purchaseOrder: "PO-DEMO-01",
        amountCents: 1200000, status: "pending" },
      { id: "v-2", projectId: "p-boston", vendor: "Fictional Data Services", invoiceNumber: "DEMO-INV-1002", purchaseOrder: "PO-DEMO-02",
        amountCents: 1500000, status: "approved" },
    ],
    time: [
      { id: "t-1", projectId: "p-denver", employee: "Alex Morgan", meeting: "Client workshop", date: "2026-11-11",
        suggestedHours: 2.5, confirmedHours: 2.5, selected: true, reviewed: false, source: "outlook-sample" },
      { id: "t-2", projectId: "p-denver", employee: "Alex Morgan", meeting: "On-site implementation work", date: "2026-11-11",
        suggestedHours: 3, confirmedHours: 3, selected: true, reviewed: false, source: "outlook-sample" },
      { id: "t-3", projectId: "p-denver", employee: "Alex Morgan", meeting: "Team lunch — review eligibility", date: "2026-11-11",
        suggestedHours: 1, confirmedHours: 1, selected: false, reviewed: false, source: "outlook-sample" },
      { id: "t-4", projectId: "p-boston", employee: "Sam Rivera", meeting: "Technical design review", date: "2026-11-12",
        suggestedHours: 1.5, confirmedHours: 1.5, selected: true, reviewed: false, source: "outlook-sample" },
      { id: "t-5", projectId: "p-atlanta", employee: "Taylor Brooks", meeting: "Client process interviews", date: "2026-11-13",
        suggestedHours: 4, confirmedHours: 4, selected: true, reviewed: false, source: "outlook-sample" },
    ],
    approvals: [
      { id: "apr-1", projectId: "p-denver", summary: "Review subcontractor invoice", amountCents: 1200000,
        sourceType: "vendor", sourceId: "v-1", status: "pending" },
      { id: "apr-2", projectId: "p-atlanta", summary: "Approve additional travel request (demo only)", amountCents: 50000,
        sourceType: "other", sourceId: "request-1", status: "pending" },
    ],
  };
}
