import { LIVE_CONNECTIONS_ENABLED } from "@/lib/workspace-mode";
import { env } from "@/server/runtime-env";
import { uploadDatabase, storedUpload, saveUploadTrips, assertExpenseEditable } from "./upload-storage";
import { expenseReportData, defaultTemplates, type ExecutiveTemplates } from "./executive-profiles";
import { buildExpenseWorkbook } from "./travel-exports";
import { validApprovalEmail } from "./expense-evidence";
import type { UploadTrip } from "./workspace-uploads";

export type ApprovalDocument={fileId:string;name:string;kind:"receipt"|"statement";objectKey:string;contentType:string;sha256:string;size:number};
export type ApprovalSnapshot={trip:UploadTrip;templates:ExecutiveTemplates;reportHash:string};
export type ApprovalRecord={id:string;trip_id:string;executive_id:string;approver_email:string;token_hash:string;send_token_hash:string;snapshot_json:string;documents_json:string;status:string;signature_name:string|null;signed_at:string|null;notes:string|null;clarification:string;message_id:string|null;created_at:string;updated_at:string};
export function runtimeApprovalEnv(){return env as unknown as Record<string,string|undefined>;}
export function approvalBucket(){if(!env.BUCKET)throw Error("Document storage is unavailable.");return env.BUCKET;}
export async function sha256(value:string|ArrayBuffer){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",typeof value==="string"?new TextEncoder().encode(value):value))].map(n=>n.toString(16).padStart(2,"0")).join("");}
function token(){return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,"0")).join("");}
export function publicApproval(record:ApprovalRecord){const snapshot=JSON.parse(record.snapshot_json)as ApprovalSnapshot;return {id:record.id,tripId:record.trip_id,approverEmail:record.approver_email,status:record.status,signatureName:record.signature_name,signedAt:record.signed_at,notes:record.notes,clarification:record.clarification,createdAt:record.created_at,reportHash:snapshot.reportHash,trip:snapshot.trip,templates:snapshot.templates,documents:(JSON.parse(record.documents_json)as ApprovalDocument[]).map(({objectKey,sha256,...doc})=>({...doc,sha256}))};}
export async function approvalById(id:string){return uploadDatabase().prepare("SELECT * FROM expense_approval_requests WHERE id = ?").bind(id).first<ApprovalRecord>();}
export async function approvalByToken(value:string,delivery=false){if(!/^[a-f0-9]{64}$/.test(value))return null;return uploadDatabase().prepare(`SELECT * FROM expense_approval_requests WHERE ${delivery?"send_token_hash":"token_hash"} = ?`).bind(await sha256(value)).first<ApprovalRecord>();}
export async function tripApprovals(tripId:string){const result=await uploadDatabase().prepare("SELECT * FROM expense_approval_requests WHERE trip_id = ? ORDER BY created_at DESC").bind(tripId).all<ApprovalRecord>();return result.results;}
export function approvalLocked(status:string){return ["draft","sending","pending","approved","delivery_unknown"].includes(status);}
export async function createApproval(trip:UploadTrip,templates:ExecutiveTemplates,approverEmail:string,clarification:string){
 if(!validApprovalEmail(approverEmail))throw Error("Enter a valid approver email address.");
 const previous=(await tripApprovals(String(trip.id)))[0];if(previous&&approvalLocked(previous.status))throw Error("This report has already been finalized. Refresh its approval status.");
 const report=expenseReportData(templates,trip);if(!report.items.length||report.hasMissingAmounts)throw Error("Add expenses and complete their amounts before finalizing.");
 for(const item of report.items)if(!(item.expenseDescription??item.title).trim()||!(item.expenseDate??item.date).trim()||item.expenseEvidence?.some(value=>!["receipt","statement"].includes(value.kind)||typeof value.fileId!=="string"))throw Error("Complete the expense descriptions, dates, and evidence selections.");
 const documents=new Map((trip.expenseDocuments??[]).map(doc=>[doc.fileId,doc]));
 for(const item of report.items)for(const evidence of item.expenseEvidence??[])documents.set(evidence.fileId,{fileId:evidence.fileId,name:item.source??"Supporting document",kind:evidence.kind});
 const id=crypto.randomUUID(),reviewToken=token(),deliveryToken=token(),bucket=approvalBucket();const copied:ApprovalDocument[]=[];const written:string[]=[];let total=0;
 try{
  for(const doc of documents.values()){
   if(!["receipt","statement"].includes(doc.kind))throw Error("Choose Receipt or Credit card statement for each document.");
   const owner=await uploadDatabase().prepare("SELECT executive_id FROM executive_upload_files WHERE id = ?").bind(doc.fileId).first<{executive_id:string}>();if(owner?.executive_id!==trip.executiveId)throw Error("Use documents uploaded for this executive.");
   const file=await storedUpload(doc.fileId);if(!file)throw Error(`The document “${doc.name}” is unavailable. Upload it again before sending.`);
   const bytes=await file.object.arrayBuffer();total+=bytes.byteLength;if(total>14*1024*1024)throw Error("This email packet exceeds 14 MB. Compress the receipts or statement before sending.");
   const key=`expense-approvals/${id}/documents/${doc.fileId}`;await bucket.put(key,bytes,{httpMetadata:{contentType:file.content_type}});written.push(key);
   copied.push({fileId:doc.fileId,name:file.filename,kind:doc.kind,objectKey:key,contentType:file.content_type,sha256:await sha256(bytes),size:bytes.byteLength});
  }
  const reportHash=await sha256(JSON.stringify({trip,templates,documents:copied.map(doc=>({fileId:doc.fileId,kind:doc.kind,sha256:doc.sha256}))}));
  const snapshot:ApprovalSnapshot={trip:structuredClone(trip),templates,reportHash};const at=new Date().toISOString();
  const xlsx=await buildExpenseWorkbook(templates,trip,{status:"pending",approverEmail,reportHash});const key=`expense-approvals/${id}/report.xlsx`;await bucket.put(key,xlsx);written.push(key);
  await uploadDatabase().prepare("INSERT INTO expense_approval_requests (id,trip_id,executive_id,approver_email,token_hash,send_token_hash,snapshot_json,documents_json,status,clarification,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,String(trip.id),trip.executiveId,approverEmail.toLowerCase(),await sha256(reviewToken),await sha256(deliveryToken),JSON.stringify(snapshot),JSON.stringify(copied),"draft",clarification,at,at).run();
  await saveUploadTrips([trip]);
  const record=(await approvalById(id))!;await buildApprovalMessage(record,reviewToken);return {record,reviewToken,deliveryToken};
 }catch(error){await uploadDatabase().prepare("DELETE FROM expense_approval_requests WHERE id = ? AND status = 'draft'").bind(id).run();for(const key of [...written,`expense-approvals/${id}/message.raw`])await bucket.delete(key);throw error;}
}
function base64(bytes:Uint8Array){let out="";for(let i=0;i<bytes.length;i+=8192)out+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(out);}
const wrap64=(value:string)=>value.match(/.{1,76}/g)?.join("\r\n")??"";
function clean(value:string){return value.replace(/[\r\n"\\]/g,"_").replace(/[^\x20-\x7e]/g,"_");}
export async function buildApprovalMessage(record:ApprovalRecord,reviewToken:string){
 const config=runtimeApprovalEnv(),origin=config.EXPENSE_APPROVAL_PORTAL_URL;if(!origin||!config.EXPENSE_APPROVAL_SENDER_EMAIL)throw Error("The approval email connection is not configured.");
 const snapshot=JSON.parse(record.snapshot_json)as ApprovalSnapshot,boundary=`anya-${record.id}`,review=`${origin}/review/${reviewToken}`;
 const text=`Please review the complete expense report for ${snapshot.trip.traveler}: ${snapshot.trip.name}.\n\nApprove and sign: ${review}?action=approve\nReturn with notes/questions/corrections: ${review}?action=return\n\nYellow expense rows are supported only by a credit card statement, with no separate receipt attached.\n${record.clarification?`\nClarification from submitter:\n${record.clarification}\n`:""}`;
 const escape=(v:string)=>v.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
 const html=`<div style="font-family:Arial,sans-serif;color:#233746"><h2>Expense report for approval</h2><p>${escape(snapshot.trip.traveler)} · ${escape(snapshot.trip.name)} · ${escape(snapshot.trip.dates)}</p><p>The complete expense report and supporting receipts/statements are attached.</p><p>Yellow rows: statement only, no separate receipt.</p>${record.clarification?`<p>Clarification: ${escape(record.clarification)}</p>`:""}<p><a href="${review}?action=approve" style="background:#56315f;color:white;padding:12px 18px;display:inline-block">Approve &amp; sign</a> <a href="${review}?action=return" style="background:#eee;padding:12px 18px;display:inline-block">Return with notes / questions / corrections</a></p></div>`;
 const alt=boundary+"-alternative";let mime=`From: ${config.EXPENSE_APPROVAL_SENDER_EMAIL}\r\nTo: ${record.approver_email}\r\nSubject: =?UTF-8?B?${base64(new TextEncoder().encode(`Expense approval: ${snapshot.trip.name}`))}?=\r\nMessage-ID: <${record.id}@anya.expense-approval>\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n--${boundary}\r\nContent-Type: multipart/alternative; boundary="${alt}"\r\n\r\n--${alt}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap64(base64(new TextEncoder().encode(text)))}\r\n--${alt}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap64(base64(new TextEncoder().encode(html)))}\r\n--${alt}--\r\n`;
 const attachments=[{objectKey:`expense-approvals/${record.id}/report.xlsx`,name:"Expense_report.xlsx",contentType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},...JSON.parse(record.documents_json)as ApprovalDocument[]];
 for(const file of attachments){const object=await approvalBucket().get(file.objectKey);if(!object)throw Error("A report attachment could not load.");mime+=`--${boundary}\r\nContent-Type: ${file.contentType}\r\nContent-Disposition: attachment; filename="${clean(file.name)}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap64(base64(new Uint8Array(await object.arrayBuffer())))}\r\n`;}
 mime+=`--${boundary}--\r\n`;const raw=base64(new TextEncoder().encode(mime)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 await approvalBucket().put(`expense-approvals/${record.id}/message.raw`,raw);
}
export async function sendApproval(record:ApprovalRecord,deliveryToken:string){
 if(!LIVE_CONNECTIONS_ENABLED)throw Error("Live email delivery is disabled in this test workspace.");
 const config=runtimeApprovalEnv();if(config.EXPENSE_APPROVAL_EMAIL_READY!=="true"||!config.EXPENSE_APPROVAL_EMAIL_WEBHOOK)throw Error("Finish the email connection setup before sending for approval.");
 const claimed=await uploadDatabase().prepare("UPDATE expense_approval_requests SET status = 'sending', updated_at = ? WHERE id = ? AND status = 'draft'").bind(new Date().toISOString(),record.id).run();
 if(!claimed.meta.changes)throw Error("This report is already being sent. Refresh its approval status.");
 try{
 const response=await fetch(config.EXPENSE_APPROVAL_EMAIL_WEBHOOK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({key:config.EXPENSE_APPROVAL_EMAIL_KEY,approvalId:record.id,messageUrl:`${config.EXPENSE_APPROVAL_PORTAL_URL}/message/${deliveryToken}`,test:false}),signal:AbortSignal.timeout(45000)});
 const result=await response.json()as{ok?:boolean;messageId?:string};if(!response.ok||!result.ok||!result.messageId)throw Error("Gmail did not confirm delivery. Check Sent mail before trying again.");
 await uploadDatabase().prepare("UPDATE expense_approval_requests SET status = 'pending', message_id = ?, updated_at = ? WHERE id = ? AND status = 'sending'").bind(result.messageId,new Date().toISOString(),record.id).run();
 }catch(error){await uploadDatabase().prepare("UPDATE expense_approval_requests SET status = 'delivery_unknown', updated_at = ? WHERE id = ?").bind(new Date().toISOString(),record.id).run();throw error;}
 return (await approvalById(record.id))!;
}
export async function recordDecision(record:ApprovalRecord,decision:"approve"|"return",name:string,notes:string){
 const db=uploadDatabase(),at=new Date().toISOString(),snapshot=JSON.parse(record.snapshot_json)as ApprovalSnapshot;
 if(record.status!=="pending")throw Error("This report is not awaiting a decision. Reload its current status.");
 const signature=decision==="approve"?{status:"approved",signatureName:name,signedAt:at,approverEmail:record.approver_email,reportHash:snapshot.reportHash}:undefined;
 const trip={...snapshot.trip,expenseReport:{...snapshot.trip.expenseReport!,approval:signature}};
 const statements=[];
 if(signature)statements.push(db.prepare("UPDATE executive_upload_trips SET trip_json = jsonb_set(trip_json::jsonb, '{expenseReport,approval}', ?::jsonb, true)::text, updated_at = ? WHERE trip_id = ? AND EXISTS (SELECT 1 FROM expense_approval_requests WHERE id = ? AND status = 'pending')").bind(JSON.stringify(signature),at,String(trip.id),record.id));
 statements.push(db.prepare("UPDATE expense_approval_requests SET status = ?, signature_name = ?, signed_at = ?, notes = ?, updated_at = ? WHERE id = ? AND status = 'pending'").bind(decision==="approve"?"approved":"returned",decision==="approve"?name:null,decision==="approve"?at:null,decision==="return"?notes:null,at,record.id));
 const results=await db.batch(statements);
 if(!results.at(-1)?.meta.changes)throw Error("A decision has already been recorded. Reload the report.");
 return (await approvalById(record.id))!;
}
