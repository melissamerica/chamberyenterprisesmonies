import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { requireExecutivePrincipal } from "../../../../server/auth";
import { listExecutiveDecisions } from "../../../../server/decision-store";
export async function GET() {
  try {
    const who=await requireExecutivePrincipal();
    if (!env.DB) throw new Error("D1_UNAVAILABLE");
    const decisions=await listExecutiveDecisions(env.DB,who);
    return NextResponse.json({decisions},{headers:{"Cache-Control":"no-store, private"}});
  } catch(e) {
    const code=e instanceof Error?e.message:"UNAVAILABLE";
    return NextResponse.json({error:code==="FORBIDDEN"?"Forbidden":"Executive access unavailable"},
      {status:code==="FORBIDDEN"?403:503,headers:{"Cache-Control":"no-store"}});
  }
}
