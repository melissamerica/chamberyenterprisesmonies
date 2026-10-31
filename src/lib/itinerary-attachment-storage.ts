import { uploadDatabase, storedUpload } from "./upload-storage";
import type { UploadTrip } from "./workspace-uploads";
import type { ItineraryAttachment } from "./itinerary-attachments";

type AttachmentRecord={id:string;trip_id:string;entry_id:string;filename:string;content_type:string;byte_count:number;created_at:string};
export async function attachmentTrip(tripId:number,executiveId:string) {
  const row=await uploadDatabase().prepare("SELECT trip_json FROM executive_upload_trips WHERE trip_id = ? AND executive_id = ?").bind(String(tripId),executiveId).first<{trip_json:string}>();
  return row?JSON.parse(row.trip_json) as UploadTrip:null;
}
export async function tripAttachments(tripId:number,executiveId:string) {
  const result=await uploadDatabase().prepare("SELECT a.id, a.trip_id, a.entry_id, f.filename, f.content_type, a.byte_count, a.created_at FROM itinerary_attachments a JOIN executive_upload_files f ON f.id = a.id AND f.executive_id = a.executive_id WHERE a.trip_id = ? AND a.executive_id = ? ORDER BY a.created_at, a.id").bind(String(tripId),executiveId).all<AttachmentRecord>();
  return result.results.map(row=>({id:row.id,tripId:Number(row.trip_id),entryId:Number(row.entry_id),name:row.filename,contentType:row.content_type,byteCount:row.byte_count,createdAt:row.created_at} satisfies ItineraryAttachment));
}
export async function linkedAttachment(id:string) {
  const row=await uploadDatabase().prepare("SELECT id FROM itinerary_attachments WHERE id = ?").bind(id).first<{id:string}>();
  return row?storedUpload(id):null;
}
export function attachmentMaterials(trip:UploadTrip,entryId:number,digitalCount:number) {
  return {...trip,items:trip.items.map(item=>{if(item.id!==entryId)return item;const paper=item.materialsAttached&&(item.materialsFormat==="hardcopy"||item.materialsFormat==="both");return {...item,materialsAttached:digitalCount>0||!!paper,materialsFormat:digitalCount>0?(paper?"both" as const:"digital" as const):paper?"hardcopy" as const:undefined};})};
}
export async function saveAttachment(trip:UploadTrip,file:{id:string},entryId:number,byteCount:number) {
  const db=uploadDatabase(),at=new Date().toISOString();const updated=attachmentMaterials(trip,entryId,1);
  await db.batch([
    db.prepare("INSERT INTO itinerary_attachments (id, trip_id, executive_id, entry_id, byte_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(file.id,String(trip.id),trip.executiveId!,String(entryId),byteCount,at,at),
    db.prepare("UPDATE executive_upload_trips SET trip_json = ?, updated_at = ? WHERE trip_id = ? AND executive_id = ?").bind(JSON.stringify(updated),at,String(trip.id),trip.executiveId!),
  ]);
  return updated;
}
export async function reassignAttachment(trip:UploadTrip,id:string,entryId:number,attachments:ItineraryAttachment[]) {
  const prior=attachments.find(file=>file.id===id)!;let updated=trip;
  if(prior.entryId!==entryId)updated=attachmentMaterials(updated,prior.entryId,attachments.filter(file=>file.id!==id&&file.entryId===prior.entryId).length);
  updated=attachmentMaterials(updated,entryId,1);const db=uploadDatabase(),at=new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE itinerary_attachments SET entry_id = ?, updated_at = ? WHERE id = ? AND trip_id = ? AND executive_id = ?").bind(String(entryId),at,id,String(trip.id),trip.executiveId!),
    db.prepare("UPDATE executive_upload_trips SET trip_json = ?, updated_at = ? WHERE trip_id = ? AND executive_id = ?").bind(JSON.stringify(updated),at,String(trip.id),trip.executiveId!),
  ]);
  return updated;
}
