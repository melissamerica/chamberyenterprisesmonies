import { describe, expect, it } from "vitest";
import { buildDemoSchedule, next48Hours, formatScheduleTime } from "./schedule";

describe("ExecOS executive mobile 48-hour ticker", () => {
  const now = new Date("2026-11-08T12:00:00.000Z");
  it("converts synthetic relative events to ISO instants", () => {
    const [event] = buildDemoSchedule([{ id: "a", kind: "flight", title: "Trip", minutesAhead: 60 }], now);
    expect(event.startsAt).toBe("2026-11-08T13:00:00.000Z");
  });
  it("includes only the next 48 hours and sorts chronologically", () => {
    const events = buildDemoSchedule([
      { id: "late", kind: "meeting", title: "Beyond", minutesAhead: 2880 },
      { id: "second", kind: "flight", title: "Next", minutesAhead: 60 },
      { id: "first", kind: "meeting", title: "Now", minutesAhead: 0 },
      { id: "past", kind: "meeting", title: "Past", minutesAhead: -1 },
    ], now);
    expect(next48Hours(events, now).map((event) => event.id)).toEqual(["first", "second"]);
  });
  it("rejects invalid dates", () => {
    expect(next48Hours([{ id: "bad", kind: "meeting", title: "Bad", startsAt: "invalid" }], now)).toEqual([]);
  });
  it("formats local schedule text", () => {
    expect(formatScheduleTime("2026-11-08T13:00:00.000Z", now)).toMatch(/\d{1,2}:00\s?[AP]M/);
  });
});
