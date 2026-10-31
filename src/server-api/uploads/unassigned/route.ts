import { NextResponse } from "next/server";
import { saveUnassignedUploads, uploadDatabase } from "@/lib/upload-storage";
import type { UploadRow } from "@/lib/workspace-uploads";

export async function PUT(request:Request) {
  let body:{executiveId?:unknown;executiveName?:unknown;rows?:unknown};
  try{body=await request.json();}catch{return NextResponse.json({error:"The unassigned receipts were not valid."},{status:400});}
  if(!body||typeof body.executiveId!=="string"||!body.executiveId||body.executiveId.length>160||typeof body.executiveName!=="string"||!body.executiveName.trim()||body.executiveName.length>1000||!Array.isArray(body.rows)||body.rows.length>5000)return NextResponse.json({error:"Choose an executive and valid receipt details."},{status:400});
  const rows=body.rows as UploadRow[];
  for(const row of rows)if(!row||row.kind!=="expense"||![row.key,row.fileId,row.source,row.title,row.date,row.amount,row.category,row.detail,row.location,row.tripId,row.match,row.duplicateChoice].every(value=>typeof value==="string"&&value.length<=12000)||!row.fileId||!row.key.startsWith(`${row.fileId}:`)||JSON.stringify(row).length>40000)return NextResponse.json({error:"Check the unassigned receipt details."},{status:400});
  try{
    const db=uploadDatabase();
    for(const id of new Set(rows.map(row=>row.fileId))){const file=await db.prepare("SELECT executive_id FROM executive_upload_files WHERE id = ?").bind(id).first<{executive_id:string}>();if(file?.executive_id!==body.executiveId)return NextResponse.json({error:"Use receipts uploaded for this executive."},{status:400});}
    return NextResponse.json({unassigned:await saveUnassignedUploads(body.executiveId,body.executiveName,rows)});
  }catch(error){console.error("Unassigned receipt save failed",error);return NextResponse.json({error:"The unassigned receipts could not save. Keep this page open and retry."},{status:503});}
}
