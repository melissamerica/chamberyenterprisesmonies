import { NextResponse } from "@/server/next-server";
import { attachmentTrip, tripAttachments, saveAttachment, reassignAttachment } from "@/lib/itinerary-attachment-storage";
import { attachmentContentTypes } from "@/lib/itinerary-attachments";
import { storeUpload, removeStoredUpload } from "@/lib/upload-storage";
function validIds(tripId:number,executiveId:unknown,entryId?:number){return Number.isSafeInteger(tripId)&&tripId>0&&typeof executiveId==="string"&&!!executiveId.trim()&&executiveId.length<=160&&(entryId===undefined||Number.isSafeInteger(entryId)&&entryId>=0);}
export async function GET(request:Request){
  const query=new URL(request.url).searchParams,tripId=Number(query.get("trip")),executiveId=query.get("executive");
  if(!validIds(tripId,executiveId))return NextResponse.json({error:"Choose a trip and executive."},{status:400});
  try{return NextResponse.json({attachments:await tripAttachments(tripId,executiveId!)},{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Attachment load failed",error);return NextResponse.json({error:"Attachments could not load. Try again."},{status:503});}
}
export async function POST(request:Request){
  let stored:{id:string}|undefined;
  try{
    const form=await request.formData(),file=form.get("file"),tripId=Number(form.get("tripId")),rawEntryId=form.get("entryId"),entryId=Number(rawEntryId),executiveId=form.get("executiveId");
    if((typeof rawEntryId!=="string"||!rawEntryId.trim())||!validIds(tripId,executiveId,entryId)||!(file instanceof File)||!file.size||file.size>20*1024*1024)return NextResponse.json({error:"Choose an itinerary entry and a file under 20 MB."},{status:400});
    const contentType=attachmentContentTypes[file.name.split(".").pop()?.toLowerCase()??""];
    if(!contentType)return NextResponse.json({error:"Use PDF, images, Word, Excel, PowerPoint, CSV, or text files."},{status:400});
    const trip=await attachmentTrip(tripId,executiveId as string);
    if(!trip||entryId!==0&&!trip.items.some(item=>item.id===entryId&&item.kind!=="Expense"&&item.itineraryEligible!==false))return NextResponse.json({error:"Choose an entry from this executive’s itinerary."},{status:400});
    const prior=await tripAttachments(tripId,executiveId as string);
    stored=await storeUpload(new File([await file.arrayBuffer()],file.name,{type:contentType}),executiveId as string);
    const updated=await saveAttachment(trip,stored,entryId,file.size);
    return NextResponse.json({trip:updated,attachments:[...prior,{id:stored.id,tripId,entryId,name:file.name,contentType,byteCount:file.size,createdAt:new Date().toISOString()}]});
  }catch(error){if(stored)try{await removeStoredUpload(stored.id);}catch(cleanup){console.error("Attachment cleanup failed",cleanup);}console.error("Attachment save failed",error);return NextResponse.json({error:"The attachment could not save. Your file is still selected; try again."},{status:503});}
}
export async function PUT(request:Request){
  let body:{id?:string;tripId?:number;entryId?:number;executiveId?:string};try{body=await request.json();}catch{return NextResponse.json({error:"Choose the attachment and its itinerary entry."},{status:400});}
  if(!body||!validIds(body.tripId!,body.executiveId,body.entryId)||body.entryId===undefined||typeof body.id!=="string"||!body.id)return NextResponse.json({error:"Choose the attachment and its itinerary entry."},{status:400});
  try{const trip=await attachmentTrip(body.tripId!,body.executiveId!);const files=await tripAttachments(body.tripId!,body.executiveId!);
    if(!trip||!files.some(file=>file.id===body.id)||body.entryId!==0&&!trip.items.some(item=>item.id===body.entryId&&item.kind!=="Expense"&&item.itineraryEligible!==false))return NextResponse.json({error:"Choose an attachment and entry from this executive’s itinerary."},{status:400});
    const updated=await reassignAttachment(trip,body.id,body.entryId!,files);return NextResponse.json({trip:updated,attachments:files.map(file=>file.id===body.id?{...file,entryId:body.entryId!}:file)});
  }catch(error){console.error("Attachment assignment failed",error);return NextResponse.json({error:"The assignment could not save. Try again."},{status:503});}
}
