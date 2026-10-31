// Minimal stand-in for `next/server` used by the ported API handlers.
export const NextResponse = {
  json: (value: unknown, init?: ResponseInit) => Response.json(value, init),
};
