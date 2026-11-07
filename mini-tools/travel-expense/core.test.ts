import { describe, expect, it } from "vitest";
import { parseLabeledConfirmation, parseFlightTable, type TravelEntry } from "../../src/lib/travel-confirmations";
import { duplicateReason, expenseEntry, expenseSummary, sampleTrip, tripForExpense, tripFromConfirmation } from "./core";

describe("Travel Desk extraction and review", () => {
  it("reuses Anya's labeled booking parser for a real flight record", () => {
    const txt = [
      "Passenger: Jordan Vale", "Flight: DL 240", "Origin: TLH", "Destination: DEN",
      "Departure date: 2026-11-18", "Departure time: 8:00 AM",
      "Arrival date: 2026-11-18", "Arrival time: 11:40 AM", "Total: $438.20",
    ].join("\n");
    const result = parseLabeledConfirmation(txt, "fictional-confirmation.txt", 50);
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0].flightCode).toBe("DL 240");
    expect(result?.items[0].cost).toBe(438.20);
    const trip = tripFromConfirmation(result!, 51);
    expect(trip.traveler).toBe("Jordan Vale");
    expect(trip.items).toHaveLength(0); // review gate: parsing does not save
  });

  it("retains two legs but charges round-trip flight total only once", () => {
    const table = [
      "Airline / flight\tDL 240\tDL 241",
      "Date\t2026-11-18\t2026-11-20",
      "Departure airport\tTLH\tDEN",
      "Arrival airport\tDEN\tTLH",
      "Departure time\t8:00 AM\t3:00 PM",
      "Arrival time\t11:40 AM\t10:00 PM",
      "Passenger\tJordan Vale",
      "Confirmation\tSAMPLEABC",
      "Total\t$438.20",
    ].join("\n");
    const parsed = parseFlightTable(table, "fictional-roundtrip.txt", 10);
    expect(parsed?.items).toHaveLength(2);
    expect(parsed?.items[0].expenseEligible).toBe(true);
    expect(parsed?.items[1].expenseEligible).toBe(false);
    expect(parsed?.items[0].cost).toBe(438.20);
    expect(parsed?.items[1].cost).toBeUndefined();
    expect(expenseSummary({ ...tripFromConfirmation(parsed!, 1), items: parsed!.items }).knownTotal).toBe(438.20);
  });

  it("allows distinct legs with the same booking reference", () => {
    const first = sampleTrip.items[0];
    const second: TravelEntry = { ...first, id: 88, flightCode: "DL 241", start: "2026-11-20T19:00:00Z" };
    expect(duplicateReason([first], second)).toBeNull();
    expect(duplicateReason([first], { ...first, id: 89 })).toMatch(/matching flight/);
  });

  it("warns on duplicate receipts without silently excluding them", () => {
    const first = expenseEntry({ title: "Fictional Café", date: "2026-11-19", amount: "23.45", category: "Meals", source: "receipt-a.png" }, 1);
    const other = expenseEntry({ title: "Fictional Café", date: "2026-11-19", amount: "23.45", category: "Meals", source: "receipt-b.png" }, 2);
    expect(duplicateReason([first], other)).toMatch(/matching expense/);
    const trip = { ...tripForExpense(3, "Denver", "Jordan Vale"), items: [first, other] };
    expect(expenseSummary(trip).knownTotal).toBe(46.9); // helper warns; UI requires acknowledgement
  });

  it("flags a same-day booking amount when a receipt could double-count the expense", () => {
    const booking = sampleTrip.items[0];
    const receipt = expenseEntry({ title: "Airfare receipt", date: booking.date, amount: "438.20", category: "Flight", source: "receipt.jpg" }, 4);
    expect(duplicateReason([booking], receipt)).toMatch(/existing booking expense/);
  });

  it("keeps missing amounts missing and reports known totals separately", () => {
    const missing = expenseEntry({ title: "Transit", date: "2026-11-19", amount: "", category: "Transportation", source: "manual" }, 1);
    const known = expenseEntry({ title: "Coffee", date: "2026-11-19", amount: "12.50", category: "Meals", source: "manual" }, 2);
    const summary = expenseSummary({ ...tripForExpense(3, "Denver", "Jordan Vale"), items: [known, missing] });
    expect(missing.cost).toBeUndefined();
    expect(summary.knownTotal).toBe(12.5);
    expect(summary.missing).toBe(1);
    expect(summary.count).toBe(2);
  });
});
