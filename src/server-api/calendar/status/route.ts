import { LIVE_CONNECTIONS_ENABLED } from "@/lib/workspace-mode";
import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
export async function GET() {
  const runtime=env as unknown as Record<string,string|undefined>;
  return NextResponse.json({outlook:LIVE_CONNECTIONS_ENABLED&&!!runtime.MAKE_OUTLOOK_CALENDAR_WEBHOOK_URL,google:LIVE_CONNECTIONS_ENABLED&&!!runtime.MAKE_CALENDAR_WEBHOOK_URL},{headers:{'Cache-Control':'no-store'}});
}
