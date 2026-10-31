import { LIVE_CONNECTIONS_ENABLED } from "@/lib/workspace-mode";
import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";

type CalendarPayload = {
  title?: unknown;
  start?: unknown;
  end?: unknown;
  location?: unknown;
  notes?: unknown;
  timezone?: unknown;
  sourceId?: unknown;
  provider?: unknown;
  allDay?: unknown;
  showAs?: unknown;
  reminderMinutes?: unknown;
};

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  if(!LIVE_CONNECTIONS_ENABLED)return NextResponse.json({error:"Live calendar publishing is disabled in this test workspace."},{status:409});
  let body: CalendarPayload;
  try {
    body = await request.json() as CalendarPayload;
  } catch {
    return NextResponse.json({ error: "The calendar request was not valid JSON." }, { status: 400 });
  }

  const title = text(body.title, 240);
  const start = text(body.start, 80);
  const end = text(body.end, 80);
  const location = text(body.location, 500);
  const notes = text(body.notes, 4000);
  const timezone = text(body.timezone, 80) || "America/New_York";
  const sourceId = text(body.sourceId, 160);
  const showAs = ["Free", "Working Elsewhere", "Tentative", "Busy", "Out of Office"].includes(String(body.showAs)) ? body.showAs : "Busy";
  const reminderMinutes = body.reminderMinutes === null ? null : typeof body.reminderMinutes === "number" && Number.isInteger(body.reminderMinutes) && body.reminderMinutes >= 0 && body.reminderMinutes <= 10080 ? body.reminderMinutes : 15;
  const provider = body.provider === "google" ? "google" : "outlook";
  const calendarName = provider === "google" ? "Google Calendar" : "Outlook";

  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (!title || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
    return NextResponse.json(
      { error: "Review the event title, start time, and end time before publishing." },
      { status: 400 },
    );
  }

  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const webhookUrl = provider === "outlook" ? runtimeEnv.MAKE_OUTLOOK_CALENDAR_WEBHOOK_URL : runtimeEnv.MAKE_CALENDAR_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: `Connect ${calendarName} to finish automatic calendar publishing. Your itinerary and expense report are already available.`, code: "CALENDAR_NOT_CONNECTED" }, { status: 503 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, start, end, location, notes, timezone, sourceId, provider, allDay: body.allDay === true, showAs, reminderMinutes }),
      signal: AbortSignal.timeout(20_000),
    });
    const responseText = await response.text();
    let result: { ok?: boolean; eventId?: string; htmlLink?: string; error?: string } = {};
    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      result = {};
    }

    if (!response.ok || !result.ok || !result.eventId) {
      return NextResponse.json(
        { error: result.error || `${calendarName} did not confirm that the event was created.` },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      eventId: result.eventId,
      htmlLink: result.htmlLink,
      provider,
    });
  } catch {
    return NextResponse.json(
      { error: "The calendar connection did not respond. Please try again." },
      { status: 504 },
    );
  }
}
