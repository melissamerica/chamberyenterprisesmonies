import { describe, expect, it } from "vitest";
import { createSyntheticPortfolio } from "./fixtures";
import { assertLiveIntegrationsDisabled, disabledIntegrationConfig } from "./integrations";
import {
  addTravelCommitment, decideApproval, parseLabeledTravel, portfolioTotals,
  prepareClientInvoiceDraft, projectFinancials, reconcileReservation,
  statusReport, updateTimeSuggestion, validateAllocationShares,
} from "./model";

const make = () => createSyntheticPortfolio("firm-fixture-1");

describe("Alec Project Operations V1 — isolated synthetic records", () => {
  it("requires a firm identifier and creates independent in-memory sessions", () => {
    expect(() => createSyntheticPortfolio("")).toThrow("Firm membership");
    const first = make();
    const second = createSyntheticPortfolio("another-firm");
    first.projects[0].name = "Locally edited";
    expect(second.projects[0].name).toBe("Denver Implementation");
    expect(first.firmId).not.toBe(second.firmId);
  });

  it("computes actuals, open commitments and remaining forecast separately", () => {
    const f = projectFinancials(make(), "p-denver");
    expect(f.actualCents).toBe(7_918_000);
    expect(f.outstandingCommitmentsCents).toBe(1_265_000);
    expect(f.forecastCents).toBe(15_483_000);
    expect(f.forecastHeadroomCents).toBe(-483_000);
    expect(portfolioTotals(make()).overBudgetCount).toBe(1);
  });

  it("reconciles a reservation once without double-counting reserved and posted costs", () => {
    const before = projectFinancials(make(), "p-denver");
    const next = reconcileReservation(make(), "p-denver", "DEMO-UA119", 68_000);
    const after = projectFinancials(next, "p-denver");
    expect(after.actualCents - before.actualCents).toBe(68_000);
    expect(before.outstandingCommitmentsCents - after.outstandingCommitmentsCents).toBe(65_000);
    expect(after.forecastCents - before.forecastCents).toBe(3_000);
    expect(() => reconcileReservation(next, "p-denver", "DEMO-UA119", 70_000)).toThrow("Already reconciled");
    expect(() => reconcileReservation(next, "p-boston", "DEMO-UA119", 68_000)).toThrow("exactly one");
    expect(() => reconcileReservation(next, "p-denver", "DEMO-UA119", -1)).toThrow("Invalid");
  });

  it("parses strictly labeled travel confirmations and rejects duplicate imports", () => {
    const parsed = parseLabeledTravel("Project: DEN-104\nReservation: ABC-001\nDescription: Client flight\nCategory: flight\nAmount: 320.55\nDate: 2026-11-12");
    expect(parsed.committedCents).toBe(32055);
    expect(() => parseLabeledTravel("Project: DEN-104\nAmount: -10")).toThrow();
    const input = { projectId: "p-denver", reservationRef: parsed.reservationRef, description: parsed.description,
      category: parsed.category, committedCents: parsed.committedCents, date: parsed.date,
      sourceDocument: "new-demo.txt", clientReimbursable: true };
    const data = addTravelCommitment(make(), input);
    expect(data.travel.length).toBe(make().travel.length + 1);
    expect(() => addTravelCommitment(data, { ...input, reservationRef: "abc-001" })).toThrow("already recorded");
    expect(() => addTravelCommitment(make(), { ...input, projectId: "unknown" })).toThrow("Unknown project");
  });

  it("requires explicit employee review before suggested hours appear in billing drafts", () => {
    const before = prepareClientInvoiceDraft(make(), "p-denver");
    expect(before.hours).toBe(0);
    expect(before.eligibleExpenseCents).toBe(118000); // Reconciled client-eligible hotel
    const selected = updateTimeSuggestion(make(), "t-1", true, 2.25);
    const draft = prepareClientInvoiceDraft(selected, "p-denver");
    expect(draft.hours).toBe(2.25);
    expect(draft.laborCents).toBe(50625);
    expect(draft.totalCents).toBe(168625);
    const skipped = updateTimeSuggestion(selected, "t-1", false, 2.25);
    expect(prepareClientInvoiceDraft(skipped, "p-denver").hours).toBe(0);
    expect(() => updateTimeSuggestion(make(), "t-1", true, 25)).toThrow("Invalid");
  });

  it("routes vendor approval through PM decision without releasing payments", () => {
    const before = projectFinancials(make(), "p-denver");
    const approved = decideApproval(make(), "apr-1", "approved");
    const after = projectFinancials(approved, "p-denver");
    expect(after.actualCents - before.actualCents).toBe(1_200_000);
    expect(before.outstandingCommitmentsCents - after.outstandingCommitmentsCents).toBe(1_200_000);
    expect(approved.invoices.find((i) => i.id === "v-1")?.status).toBe("approved");
    expect(() => decideApproval(approved, "apr-1", "approved")).toThrow("not pending");
    const declined = decideApproval(make(), "apr-1", "rejected");
    expect(declined.invoices.find((i) => i.id === "v-1")?.status).toBe("rejected");
    expect(projectFinancials(declined, "p-denver").outstandingCommitmentsCents).toBe(65_000);
  });

  it("checks that cross-project allocation shares total exactly 100%", () => {
    expect(validateAllocationShares([{ projectId: "a", percent: 60 }, { projectId: "b", percent: 40 }])).toBe(true);
    expect(validateAllocationShares([{ projectId: "a", percent: 60 }, { projectId: "b", percent: 60 }])).toBe(false);
    expect(validateAllocationShares([{ projectId: "a", percent: 50 }, { projectId: "a", percent: 50 }])).toBe(false);
  });

  it("prepares labeled demo reports and fails closed on external integrations", () => {
    const data = make();
    expect(statusReport(data, "p-denver")).toContain("SYNTHETIC DEMONSTRATION");
    expect(statusReport(data, "p-denver")).toContain("Pending PM approvals: 1");
    expect(() => assertLiveIntegrationsDisabled(disabledIntegrationConfig(data))).not.toThrow();
    expect(disabledIntegrationConfig(data).projectSystem).toBeNull();
  });
});
