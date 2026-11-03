import { env } from "@/server/runtime-env";
import type { DeferredUpload, UnassignedUpload, VendorRule, UploadTrip, UploadExclusion, UploadRow } from "./workspace-uploads";

export function uploadDatabase() { if (!env.DB) throw new Error("Upload storage is unavailable."); return env.DB; }
function bucket() { if (!env.BUCKET) throw new Error("File storage is unavailable."); return env.BUCKET; }
export async function storeUpload(file:File, executiveId:string) {
  const id=crypto.randomUUID();const key=`executive-uploads/${id}`;const db=uploadDatabase();
  await bucket().put(key,await file.arrayBuffer(),{httpMetadata:{contentType:file.type||"application/octet-stream"}});
  try{await db.prepare("INSERT INTO executive_upload_files (id, executive_id, filename, object_key, content_type, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind(id,executiveId,file.name,key,file.type||"application/octet-stream",new Date().toISOString()).run();}
  catch(error){await bucket().delete(key);throw error;}
  return {id,name:file.name};
}
export async function storedUpload(id:string) {
  const file=await uploadDatabase().prepare("SELECT filename, object_key, content_type FROM executive_upload_files WHERE id = ?").bind(id).first<{filename:string;object_key:string;content_type:string}>();
  if(!file)return null;const object=await bucket().get(file.object_key);return object?{...file,object}:null;
}
export async function removeStoredUpload(id:string) {
  const file=await uploadDatabase().prepare("SELECT object_key FROM executive_upload_files WHERE id = ?").bind(id).first<{object_key:string}>();
  if(file)await bucket().delete(file.object_key);
  await uploadDatabase().prepare("DELETE FROM executive_upload_files WHERE id = ?").bind(id).run();
}
export async function savedUploadTrips() {
  const result=await uploadDatabase().prepare("SELECT trip_json, updated_at FROM executive_upload_trips ORDER BY updated_at DESC").all<{trip_json:string;updated_at:string}>();
  return result.results.map(row=>({...JSON.parse(row.trip_json) as UploadTrip, updatedAt:row.updated_at}));
}

/**
 * Guarded write for interactive workspace edits. The server is authoritative.
 * Missing revision means CREATE ONLY; an existing revision must match exactly.
 * This is additive to the old upload decision API, which still supports its
 * existing atomic batch workflows.
 */
export async function saveWorkspaceTrip(trip: UploadTrip, ifMatch: string | null): Promise<UploadTrip | null> {
  await assertExpenseEditable(trip);
  const db = uploadDatabase();
  const currentTime = Date.now();
  const previousTime = ifMatch ? Date.parse(ifMatch) : 0;
  const updatedAt = new Date(Math.max(currentTime, Number.isFinite(previousTime) ? previousTime + 1 : 0)).toISOString();
  const { updatedAt: _previousRevision, ...data } = trip;
  const statement = ifMatch === null
    ? db.prepare("INSERT INTO executive_upload_trips (trip_id, executive_id, trip_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(trip_id) DO NOTHING")
        .bind(String(trip.id), trip.executiveId, JSON.stringify(data), updatedAt)
    : db.prepare("UPDATE executive_upload_trips SET executive_id = ?, trip_json = ?, updated_at = ? WHERE trip_id = ? AND updated_at = ?")
        .bind(trip.executiveId, JSON.stringify(data), updatedAt, String(trip.id), ifMatch);
  const result = await statement.run();
  return result.meta.changes === 1 ? { ...data, updatedAt } : null;
}
export async function saveUploadTrips(trips:UploadTrip[]) {
  for(const trip of trips)await assertExpenseEditable(trip);
  const updatedAt=new Date().toISOString();const db=uploadDatabase();
  await db.batch(trips.flatMap(trip=>[db.prepare("INSERT INTO executive_upload_trips (trip_id, executive_id, trip_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(trip_id) DO UPDATE SET executive_id = excluded.executive_id, trip_json = excluded.trip_json, updated_at = excluded.updated_at").bind(String(trip.id),trip.executiveId,JSON.stringify(trip),updatedAt), ...trip.items.filter(item=>item.kind==="Expense"&&item.importKey).map(item=>db.prepare("DELETE FROM executive_unassigned_uploads WHERE id = ? AND executive_id = ?").bind(item.importKey,trip.executiveId))]));
}
export async function savedUploadExclusions() {
  const result=await uploadDatabase().prepare("SELECT executive_id, row_json, approved_at FROM executive_upload_exclusions ORDER BY approved_at DESC").all<{executive_id:string;row_json:string;approved_at:string}>();
  return result.results.map(row=>({executiveId:row.executive_id,row:JSON.parse(row.row_json) as UploadRow,approvedAt:row.approved_at} satisfies UploadExclusion));
}
export async function saveUploadExclusions(executiveId:string, rows:UploadRow[]) {
  const approvedAt=new Date().toISOString();const db=uploadDatabase();
  await db.batch(rows.map(row=>db.prepare("INSERT INTO executive_upload_exclusions (id, executive_id, source_file_id, row_json, approved_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET row_json = excluded.row_json, approved_at = excluded.approved_at").bind(row.key,executiveId,row.fileId,JSON.stringify(row),approvedAt)));
  return rows.map(row=>({executiveId,row,approvedAt}));
}

export async function savedVendorRules() {
  const result=await uploadDatabase().prepare("SELECT rule_json FROM executive_vendor_rules ORDER BY updated_at DESC").all<{rule_json:string}>();
  return result.results.map(row=>JSON.parse(row.rule_json) as VendorRule);
}
export async function saveUploadDecision(executiveId:string,row:UploadRow,trip:UploadTrip|undefined,rule:VendorRule|undefined, later=false, learningStatements:D1PreparedStatement[]=[]) {
  if(trip)await assertExpenseEditable(trip);
  const db=uploadDatabase(),at=new Date().toISOString();
  const priorDeferred=await db.prepare("SELECT id FROM executive_deferred_uploads WHERE id = ? AND executive_id = ?").bind(row.key,executiveId).first<{id:string}>();
  const reviewRow={...row,reviewStatus:trip?"assigned" as const:"pending" as const,reviewTripId:trip?String(trip.id):undefined};
  const statements=later
    ? [db.prepare("INSERT INTO executive_deferred_uploads (id, executive_id, row_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET row_json = excluded.row_json, updated_at = excluded.updated_at").bind(row.key,executiveId,JSON.stringify(reviewRow),at)]
    : trip
    ? [db.prepare("INSERT INTO executive_upload_trips (trip_id, executive_id, trip_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(trip_id) DO UPDATE SET executive_id = excluded.executive_id, trip_json = excluded.trip_json, updated_at = excluded.updated_at").bind(String(trip.id),executiveId,JSON.stringify(trip),at)]
    : [db.prepare("INSERT INTO executive_upload_exclusions (id, executive_id, source_file_id, row_json, approved_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET row_json = excluded.row_json, approved_at = excluded.approved_at").bind(row.key,executiveId,row.fileId,JSON.stringify(row),at)];
  if(trip&&priorDeferred)statements.push(db.prepare("UPDATE executive_deferred_uploads SET row_json = ?, updated_at = ? WHERE id = ? AND executive_id = ?").bind(JSON.stringify(reviewRow),at,row.key,executiveId));
  else if(!later&&!trip)statements.push(db.prepare("DELETE FROM executive_deferred_uploads WHERE id = ? AND executive_id = ?").bind(row.key,executiveId));
  if(rule)statements.push(db.prepare("INSERT INTO executive_vendor_rules (id, executive_id, rule_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET rule_json = excluded.rule_json, updated_at = excluded.updated_at").bind(rule.id,executiveId,JSON.stringify(rule),at));
  statements.push(db.prepare("DELETE FROM executive_unassigned_uploads WHERE id = ? AND executive_id = ?").bind(row.key,executiveId));
  await db.batch([...statements,...learningStatements]);
  return {trips:trip?[trip]:[],exclusions:trip||later?[]:[{executiveId,row,approvedAt:at}],deferred:later||trip&&priorDeferred?[{executiveId,row:reviewRow,updatedAt:at}]:[],rule};
}
export async function removeVendorRule(executiveId:string,id:string) { await uploadDatabase().prepare("DELETE FROM executive_vendor_rules WHERE executive_id = ? AND id = ?").bind(executiveId,id).run(); }

export async function savedDeferredUploads() {
  const result=await uploadDatabase().prepare("SELECT executive_id, row_json, updated_at FROM executive_deferred_uploads ORDER BY updated_at DESC").all<{executive_id:string;row_json:string;updated_at:string}>();
  return result.results.map(value=>({executiveId:value.executive_id,row:JSON.parse(value.row_json) as UploadRow,updatedAt:value.updated_at} satisfies DeferredUpload));
}

export async function removeDeferredUpload(executiveId:string,key:string) { await uploadDatabase().prepare("DELETE FROM executive_deferred_uploads WHERE executive_id = ? AND id = ?").bind(executiveId,key).run(); }

export async function savedUnassignedUploads() {
  const result = await uploadDatabase().prepare("SELECT executive_id, executive_name, row_json, updated_at FROM executive_unassigned_uploads ORDER BY updated_at DESC").all<{executive_id:string;executive_name:string;row_json:string;updated_at:string}>();
  return result.results.map(value => ({executiveId:value.executive_id, executiveName:value.executive_name, row:JSON.parse(value.row_json) as UploadRow, updatedAt:value.updated_at} satisfies UnassignedUpload));
}

export async function saveUnassignedUploads(executiveId:string, executiveName:string, rows:UploadRow[]) {
  const db=uploadDatabase(), at=new Date().toISOString();
  if(rows.length)await db.batch(rows.map(row=>db.prepare("INSERT INTO executive_unassigned_uploads (id, executive_id, executive_name, row_json, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET row_json = excluded.row_json, executive_name = excluded.executive_name, updated_at = excluded.updated_at").bind(row.key,executiveId,executiveName,JSON.stringify(row),at)));
  return rows.map(row=>({executiveId,executiveName,row,updatedAt:at}));
}

export async function assertExpenseEditable(trip:UploadTrip) {
 const latest=await uploadDatabase().prepare("SELECT snapshot_json,status,signature_name,signed_at,approver_email FROM expense_approval_requests WHERE trip_id = ? ORDER BY created_at DESC LIMIT 1").bind(String(trip.id)).first<{snapshot_json:string;status:string;signature_name:string|null;signed_at:string|null;approver_email:string}>();
 if(!latest||!["draft","sending","pending","approved","delivery_unknown"].includes(latest.status))return;
 const snapshot=JSON.parse(latest.snapshot_json)as{trip:UploadTrip;reportHash:string};
 const project=(value:UploadTrip)=>JSON.stringify(value.items.filter(item=>item.kind!=="Appointment"&&item.expenseEligible!==false&&(typeof item.cost==="number"||!!item.source)).map(item=>({id:item.id,title:item.title,date:item.date,expenseDescription:item.expenseDescription,expenseDate:item.expenseDate,cost:item.cost,category:item.expenseCategory,evidence:item.expenseEvidence,billingCode:item.billingCode})))+JSON.stringify(value.expenseDocuments??[])+JSON.stringify(value.billingCode??null);
 if(project(trip)!==project(snapshot.trip))throw Error("This expense report is finalized. The approver must return it before expenses or evidence can change.");
 if(latest.status==="approved")trip.expenseReport={...(trip.expenseReport??snapshot.trip.expenseReport!),approval:{status:"approved",signatureName:latest.signature_name??undefined,signedAt:latest.signed_at??undefined,approverEmail:latest.approver_email,reportHash:snapshot.reportHash}};
}
