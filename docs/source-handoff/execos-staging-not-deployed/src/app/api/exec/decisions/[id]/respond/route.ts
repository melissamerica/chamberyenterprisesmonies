import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { requireExecutivePrincipal } from "../../../../../../server/auth";
import { submitExecutiveAnswer } from "../../../../../../server/decision-store";

export async function POST(request:Request,ctx:{params:Promise<{id:string}>}) {
  try {
    // Add CSRF cookie/session binding and same-origin checks in chosen auth integration.
    const origin=request.headers.get("Origin");
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({error:"Origin not allowed"},{status:403});
    }
    const who=await requireExecutivePrincipal();
    if (!env.DB) throw new Error("D1_UNAVAILABLE");
    const {id}=await ctx.params;
    const data=await request.json();
    const response=await submitExecutiveAnswer(env.DB,who,id,data);
    return NextResponse.json({response},{headers:{"Cache-Control":"no-store"}});
  } catch(e) {
    const code=e instanceof Error?e.message:"UNKNOWN";
    const status=code==="NOT_FOUND"?404:code==="FORBIDDEN"?403:
      code==="CONFLICT"?409:code==="DELEGATE_NOT_AUTHORIZED"?403:code==="AUTH_PROVIDER_NOT_CONNECTED: protected feature intentionally disabled"?503:
      code==="MEDIA_VALIDATION_NOT_CONNECTED"||code==="APPROVED_ACTION_CHECK_NOT_CONNECTED"?503:code.startsWith("INVALID")||code.endsWith("REQUIRED")||code==="TEXT_TOO_LONG"||code==="INSTRUCTIONS_TOO_LONG"?400:503;
    return NextResponse.json({error:status===503?"Executive response service not enabled":code},{status,headers:{"Cache-Control":"no-store"}});
  }
}
