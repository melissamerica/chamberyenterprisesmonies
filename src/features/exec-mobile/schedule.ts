// Synthetic, typed event source for the ExecOS mobile ticker.
// A future calendar adapter can supply ScheduleEvent[] without changing the UI.
export type ScheduleKind = "meeting" | "flight";
export interface ScheduleEvent {
  id: string;
  kind: ScheduleKind;
  title: string;
  startsAt: string; // ISO 8601 instant
}
export interface DemoScheduleItem {
  id: string;
  kind: ScheduleKind;
  title: string;
  minutesAhead: number;
}
export function buildDemoSchedule(items: DemoScheduleItem[], now: Date): ScheduleEvent[] {
  return items.map((item) => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    startsAt: new Date(now.getTime() + item.minutesAhead * 60_000).toISOString(),
  }));
}
export function next48Hours(events: ScheduleEvent[], now: Date): ScheduleEvent[] {
  const start = now.getTime();
  const end = start + 48 * 60 * 60_000;
  return events
    .filter((event) => {
      const date = Date.parse(event.startsAt);
      return Number.isFinite(date) && date >= start && date < end;
    })
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
}
export function formatScheduleTime(startsAt: string, now: Date): string {
  const date = new Date(startsAt);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const relative = date.toDateString() === now.toDateString()
    ? "Today"
    : date.toDateString() === tomorrow.toDateString()
      ? "Tomorrow"
      : new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(date);
  return relative + " · " + time;
}
