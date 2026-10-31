import { LIVE_CONNECTIONS_ENABLED } from "@/lib/workspace-mode";
import { NextResponse } from "next/server";
import { runtimeApprovalEnv } from "@/lib/expense-approval-storage";
export async function POST(){
 if(!LIVE_CONNECTIONS_ENABLED)return NextResponse.json({error:"Email connections are disabled in this test workspace."},{status:409});
 const env=runtimeApprovalEnv();if(!env.EXPENSE_APPROVAL_EMAIL_WEBHOOK)return NextResponse.json({error:"The email connection has not been configured."},{status:503});
 if(env.EXPENSE_APPROVAL_EMAIL_READY==="true")return NextResponse.json({ready:true});
 try{const response=await fetch(env.EXPENSE_APPROVAL_EMAIL_WEBHOOK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:env.EXPENSE_APPROVAL_EMAIL_KEY,approvalId:"connection-test",messageUrl:`${env.EXPENSE_APPROVAL_PORTAL_URL}/connection-test`,test:true})});if(!response.ok)throw Error("The connection test was not received.");return NextResponse.json({received:true,notice:"Connection test received. Tell Melissa’s app assistant the email setup test is complete; no email was sent."});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"The connection test could not complete."},{status:503});}
}
