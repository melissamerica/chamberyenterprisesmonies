import { NextResponse } from "@/server/next-server";
import { approvalByToken, approvalById, publicApproval, recordDecision, approvalBucket, type ApprovalDocument, type ApprovalSnapshot } from "@/lib/expense-approval-storage";
import { buildExpenseWorkbook } from "@/lib/travel-exports";
import { validApprovalEmail } from "@/lib/expense-evidence";
type Context={params:Promise<{path:string[]}>};
const headers={"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"};
export async function GET(request:Request,context:Context){
 try{const {path}=await context.params;const [value,action,argument]=path;
 if(action==="message"){const record=await approvalByToken(value,true);if(!record||record.status!=="sending")return new Response("Message unavailable",{status:404,headers});const object=await approvalBucket().get(`expense-approvals/${record.id}/message.raw`);return object?new Response(object.body,{headers:{...headers,"Content-Type":"text/plain"}}):new Response("Not found",{status:404,headers});}
 const record=request.headers.get("x-anya-owner-preview")==="1"?await approvalById(value):await approvalByToken(value);if(!record)return new Response("This approval link is unavailable.",{status:404,headers});
 if(action==="report"){const snapshot=JSON.parse(record.snapshot_json)as ApprovalSnapshot;const bytes=await buildExpenseWorkbook(snapshot.templates,snapshot.trip,{status:record.status,signatureName:record.signature_name,signedAt:record.signed_at,approverEmail:record.approver_email,reportHash:snapshot.reportHash});return new Response(new Uint8Array(bytes),{headers:{...headers,"Content-Type":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","Content-Disposition":"attachment; filename=Expense_report.xlsx"}});}
 if(action==="file"){const doc=(JSON.parse(record.documents_json)as ApprovalDocument[]).find(doc=>doc.fileId===argument);if(!doc)return new Response("File unavailable",{status:404,headers});const object=await approvalBucket().get(doc.objectKey);return object?new Response(object.body,{headers:{...headers,"Content-Type":doc.contentType,"Content-Disposition":`attachment; filename="${doc.name.replace(/[\r\n"\\]|[^\x20-\x7e]/g,"_")}"`}}):new Response("File unavailable",{status:404,headers});}
 return NextResponse.json(publicApproval(record),{headers});
 }catch(error){console.error("Approval review load failed",error);return new Response("The report could not load. Try again.",{status:503,headers});}
}
export async function POST(request:Request,context:Context){
 try{const {path}=await context.params;if(path.length!==1)return NextResponse.json({error:"Use the review form to submit a decision."},{status:400,headers});const record=await approvalByToken(path[0]);if(!record)return NextResponse.json({error:"This approval link is unavailable."},{status:404,headers});
 const body=await request.json()as{decision:string;name:string;email:string;consent:boolean;notes:string};
 if(!validApprovalEmail(body.email)||body.email.toLowerCase()!==record.approver_email.toLowerCase())throw Error("Enter the approver email address this request was sent to.");
 if(body.decision==="approve"){if(typeof body.name!=="string"||body.name.trim().length<2||body.name.length>160||body.consent!==true)throw Error("Enter your full name and agree to sign electronically.");}
 else if(body.decision==="return"){if(typeof body.notes!=="string"||!body.notes.trim()||body.notes.length>12000)throw Error("Include the reasons, questions, or corrections needed.");}
 else throw Error("Choose Approve or Return.");
 return NextResponse.json(publicApproval(await recordDecision(record,body.decision,typeof body.name==="string"?body.name.trim():"",typeof body.notes==="string"?body.notes.trim():"")),{headers});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"The decision could not save."},{status:409,headers});}
}
