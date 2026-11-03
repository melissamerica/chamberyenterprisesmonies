import { NextResponse } from "@/server/next-server";
import { savedUploadTrips, savedUploadExclusions, savedVendorRules, savedDeferredUploads, savedUnassignedUploads, saveUploadTrips, saveWorkspaceTrip, storeUpload, uploadDatabase } from "@/lib/upload-storage";
import type { UploadTrip } from "@/lib/workspace-uploads";
import { validBillingSelection } from "@/lib/billing-codes";

export async function GET(){try{const [trips,exclusions,rules,deferred,unassigned]=await Promise.all([savedUploadTrips(),savedUploadExclusions(),savedVendorRules(),savedDeferredUploads(),savedUnassignedUploads()]);return NextResponse.json({trips,exclusions,rules,deferred,unassigned},{headers:{"Cache-Control":"no-store"}});}catch(error){console.error("Upload load failed",error);return NextResponse.json({error:"Saved uploads could not load. Retry before importing more files."},{status:503});}}
export async function POST(request:Request){
  try{const form=await request.formData();const file=form.get("file"),executiveId=form.get("executiveId");
    if(!(file instanceof File)||!file.size||file.size>20*1024*1024||typeof executiveId!=="string"||!executiveId.trim()||executiveId.length>160)return NextResponse.json({error:"Choose an executive and a file under 20 MB."},{status:400});
    if(!/\.(pdf|png|jpe?g|webp|gif|bmp|tiff?|txt|csv|tsv|xlsx|ics|docx|pptx|eml|html|htm)$/i.test(file.name))return NextResponse.json({error:"Use PDF, image, CSV, Excel (.xlsx), text, or calendar (.ics) files."},{status:400});
    return NextResponse.json({file:await storeUpload(file,executiveId)});
  }catch(error){console.error("Upload save failed",error);return NextResponse.json({error:"The file could not save. Keep it selected and try again."},{status:503});}
}
export async function PUT(request:Request){
  let body:{trips?:unknown;ifMatch?:unknown};try{body=await request.json();}catch{return NextResponse.json({error:"The upload assignments were not valid."},{status:400});}
  if(!body||!Array.isArray(body.trips)||!body.trips.length||body.trips.length>100)return NextResponse.json({error:"Select a trip for each included item."},{status:400});
  const trips=body.trips as UploadTrip[];const ids=new Set<string>();
  for(const trip of trips){
    if (!validBillingSelection(trip?.billingCode) || Array.isArray(trip?.items) && trip.items.some(item => !validBillingSelection(item?.billingCode, true))) return NextResponse.json({ error: "Choose a valid billing code and description." }, { status: 400 });
    if(!trip||!Number.isSafeInteger(trip.id)||trip.id<=0||typeof trip.executiveId!=="string"||!trip.executiveId||trip.executiveId.length>160||![trip.name,trip.traveler,trip.dates,trip.route].every(value=>typeof value==="string"&&value.length<=1000)||!Array.isArray(trip.items)||trip.items.length>5000||JSON.stringify(trip).length>1000000)return NextResponse.json({error:"The trip data was not valid."},{status:400});
    for(const item of trip.items){if(!item||!Number.isSafeInteger(item.id)||!["Flight","Hotel","Car","Appointment","Expense"].includes(item.kind)||![item.title,item.detail,item.date,item.time].every(value=>typeof value==="string"&&value.length<=12000)||item.cost!==undefined&&(typeof item.cost!=="number"||!Number.isFinite(item.cost)))return NextResponse.json({error:"Check the imported description, date, and amount."},{status:400});if(item.materialsAttached!==undefined&&typeof item.materialsAttached!=="boolean"||item.materialsFormat!==undefined&&!["digital","hardcopy","both"].includes(item.materialsFormat))return NextResponse.json({error:"Choose Digital, Hard copy, or Both for the attached materials."},{status:400});if(item.importKey){if(typeof item.importKey!=="string"||typeof item.sourceFileId!=="string")return NextResponse.json({error:"The source file is missing."},{status:400});ids.add(item.sourceFileId);}}
  }
  try{
    const db=uploadDatabase();
    for(const id of ids){
      const file=await db.prepare("SELECT executive_id FROM executive_upload_files WHERE id = ?").bind(id).first<{executive_id:string}>();
      if(!file||trips.some(trip=>trip.items.some(item=>item.sourceFileId===id)&&trip.executiveId!==file.executive_id))
        return NextResponse.json({error:"Use files uploaded for this executive."},{status:400});
    }
    if(Object.prototype.hasOwnProperty.call(body,"ifMatch")){
      if(trips.length!==1 || !(body.ifMatch===null || typeof body.ifMatch==="string" && Number.isFinite(Date.parse(body.ifMatch))))
        return NextResponse.json({error:"An exact saved revision is required for this trip."},{status:400});
      const trip=await saveWorkspaceTrip(trips[0], body.ifMatch as string|null);
      if(!trip)return NextResponse.json({error:"This trip was changed in another session. Your edits were not overwritten. Reload and review before saving again.",code:"TRIP_CONFLICT"},{status:409});
      return NextResponse.json({saved:true,trip});
    }
    const savedTrips = await saveUploadTrips(trips);
    return NextResponse.json({saved:true,trips:savedTrips});
  }
  catch(error){
    const message=error instanceof Error?error.message:"";
    const conflict=message.includes("changed in another session");
    console.error("Upload assignment save failed",error);
    return NextResponse.json({error:conflict?message:"Your selections could not save. They are still here; try again."},{status:conflict?409:503});
  }
}
