import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { requireExecutivePrincipal } from "../../../../server/auth";
import { listAuthorizedDelegates } from "../../../../server/decision-store";
export async function GET() {
  try {
    const who=await requireExecutivePrincipal();
    if (!env.DB) throw new Error("D1_UNAVAILABLE");
    const delegates=await listAuthorizedDelegates(env.DB,who);
    return NextResponse.json({delegates},{headers:{"Cache-Control":"no-store, private"}});
  } catch(e) {
    const forbidden=e instanceof Error&&e.message==="FORBIDDEN";
    return NextResponse.json({error:forbidden?"Forbidden":"Executive access unavailable"},
      {status:forbidden?403:503,headers:{"Cache-Control":"no-store"}});
  }
}
