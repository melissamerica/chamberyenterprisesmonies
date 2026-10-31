import { LIVE_CONNECTIONS_ENABLED } from "@/lib/workspace-mode";
import { env } from "@/server/runtime-env";
import { NextResponse } from "@/server/next-server";
export async function GET() {
  const runtime=env as unknown as Record<string,string|undefined>;
  return NextResponse.json({outlook:LIVE_CONNECTIONS_ENABLED&&!!runtime.MAKE_OUTLOOK_CALENDAR_WEBHOOK_URL,google:LIVE_CONNECTIONS_ENABLED&&!!runtime.MAKE_CALENDAR_WEBHOOK_URL},{headers:{'Cache-Control':'no-store'}});
}
