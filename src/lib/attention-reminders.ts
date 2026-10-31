export type ReminderCalendar = "outlook" | "google";

export function reminderTimes(date: string, time: string, now = Date.now()) {
  const start = new Date(`${date}T${time}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || !Number.isFinite(start.getTime()) || start.getTime() <= now) {
    throw new Error("Choose a reminder date and time in the future.");
  }
  return { start: start.toISOString(), end: new Date(start.getTime() + 15 * 60_000).toISOString() };
}

export function reminderCalendarUrl(provider: ReminderCalendar, title: string, notes: string, start: string, end: string) {
  if (provider === "google") {
    const compact = (value: string) => value.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
    const parameters = new URLSearchParams({ action: "TEMPLATE", text: title, details: notes, dates: `${compact(start)}/${compact(end)}` });
    return `https://calendar.google.com/calendar/render?${parameters}`;
  }
  const parameters = new URLSearchParams({ subject: title, body: notes, startdt: start, enddt: end, allday: "false", path: "/calendar/action/compose", rru: "addevent" });
  return `https://outlook.office.com/calendar/0/deeplink/compose?${parameters}`;
}
