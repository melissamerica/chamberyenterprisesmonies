import { LIVE_CONNECTIONS_ENABLED } from "@/lib/workspace-mode";
import { NextResponse } from "@/server/next-server";
import { uploadDatabase } from "@/lib/upload-storage";
import { tripApprovals, publicApproval, createApproval, sendApproval, runtimeApprovalEnv, approvalById } from "@/lib/expense-approval-storage";
import { defaultTemplates, type ExecutiveTemplates } from "@/lib/executive-profiles";
import type { UploadTrip } from "@/lib/workspace-uploads";

export async function GET(request:Request){
 try{const url=new URL(request.url),tripId=url.searchParams.get("trip"),executiveId=url.searchParams.get("executive");if(!tripId||!executiveId)return NextResponse.json({error:"Choose a trip and executive."},{status:400});
 const savedTrip=await uploadDatabase().prepare("SELECT executive_id FROM executive_upload_trips WHERE trip_id = ?")
   .bind(tripId).first<{executive_id:string}>();
 if(!savedTrip||savedTrip.executive_id!==executiveId)
   return NextResponse.json({error:"Choose a saved trip belonging to this executive."},{status:404});
 const files=await uploadDatabase().prepare("SELECT id,filename FROM executive_upload_files WHERE executive_id = ? ORDER BY created_at DESC").bind(executiveId).all<{id:string;filename:string}>();
 return NextResponse.json({approvals:(await tripApprovals(tripId)).map(publicApproval),files:files.results.filter(file=>!file.filename.toLowerCase().endsWith(".ics")),emailReady:LIVE_CONNECTIONS_ENABLED&&runtimeApprovalEnv().EXPENSE_APPROVAL_EMAIL_READY==="true",sender:runtimeApprovalEnv().EXPENSE_APPROVAL_SENDER_EMAIL},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("Approval load failed",error);return NextResponse.json({error:"The approval details could not load. Retry before sending."},{status:503});}
}
export async function POST(request:Request){
 if(!LIVE_CONNECTIONS_ENABLED)return NextResponse.json({error:"Live email delivery is disabled in this workspace."},{status:409});
 try{if(runtimeApprovalEnv().EXPENSE_APPROVAL_EMAIL_READY!=="true")return NextResponse.json({error:"Finish email setup before sending for approval."},{status:409});
 const body=await request.json()as{trip:UploadTrip;templates?:ExecutiveTemplates;approverEmail:string;clarification?:string};
 const trip=body.trip;
 if(!trip||!Number.isSafeInteger(trip.id)||trip.id<=0||typeof trip.executiveId!=="string"||!trip.executiveId||![trip.name,trip.traveler,trip.dates,trip.route].every(v=>typeof v==="string"&&v.length<=1000)||!Array.isArray(trip.items)||trip.items.length>5000||JSON.stringify(trip).length>1000000)throw Error("Choose a valid trip.");
 for(const item of trip.items)if(!item||!Number.isSafeInteger(item.id)||!["Flight","Hotel","Car","Appointment","Expense"].includes(item.kind)||![item.title,item.detail,item.date,item.time].every(v=>typeof v==="string"&&v.length<=12000)||item.cost!==undefined&&(typeof item.cost!=="number"||!Number.isFinite(item.cost)))throw Error("Check the expense details.");
 if(body.clarification!==undefined&&(typeof body.clarification!=="string"||body.clarification.length>12000))throw Error("Keep clarification under 12,000 characters.");
 const templates={...defaultTemplates,...body.templates};
 const {record,deliveryToken}=await createApproval(trip,templates,body.approverEmail,body.clarification??"");
 try{return NextResponse.json({approval:publicApproval(await sendApproval(record,deliveryToken))});}
 catch(error){return NextResponse.json({error:error instanceof Error?error.message:"The email could not send.",approval:publicApproval((await approvalById(record.id))!)},{status:502});}
 }catch(error){console.error("Approval send failed",error);return NextResponse.json({error:error instanceof Error?error.message:"The report could not finalize."},{status:400});}
}
export async function PATCH(request:Request){
 try{const body=await request.json()as{id:string;action:string};const record=await approvalById(body.id);if(!record||record.status!=="delivery_unknown")throw Error("Only an unconfirmed email delivery can be resolved here.");
 const status=body.action==="confirm-sent"?"pending":body.action==="cancel-send"?"cancelled":"";if(!status)throw Error("Choose whether the email was sent or cancel this attempt.");
 const updated=await uploadDatabase().prepare("UPDATE expense_approval_requests SET status = ?, updated_at = ? WHERE id = ? AND status = 'delivery_unknown'").bind(status,new Date().toISOString(),record.id).run();
 if(updated.meta.changes!==1)throw Error("This approval status changed in another session. Reload before resolving delivery.");
 return NextResponse.json({approval:publicApproval((await approvalById(record.id))!)});
 }catch(error){return NextResponse.json({error:error instanceof Error?error.message:"The delivery could not update."},{status:400});}
}
