import { NextResponse } from "next/server";
import { saveUploadExclusions, uploadDatabase } from "@/lib/upload-storage";
import type { UploadRow } from "@/lib/workspace-uploads";

export async function PUT(request:Request){
  let body:{executiveId?:unknown;rows?:unknown};try{body=await request.json();}catch{return NextResponse.json({error:"The approval was not valid."},{status:400});}
  if(!body||typeof body.executiveId!=="string"||!body.executiveId||body.executiveId.length>160||!Array.isArray(body.rows)||!body.rows.length||body.rows.length>1000)return NextResponse.json({error:"Select charges to approve as irrelevant."},{status:400});
  const rows=body.rows as UploadRow[];
  for(const row of rows)if(!row||row.kind!=="expense"||![row.key,row.fileId,row.source,row.title,row.date,row.amount].every(value=>typeof value==="string"&&value.length<=4000)||!row.key||!row.fileId||!row.key.startsWith(`${row.fileId}:`)||JSON.stringify(row).length>20000)return NextResponse.json({error:"The charge details were not valid."},{status:400});
  try{const db=uploadDatabase();for(const id of new Set(rows.map(row=>row.fileId))){const file=await db.prepare("SELECT executive_id FROM executive_upload_files WHERE id = ?").bind(id).first<{executive_id:string}>();if(file?.executive_id!==body.executiveId)return NextResponse.json({error:"Approve charges uploaded for this executive."},{status:400});}return NextResponse.json({exclusions:await saveUploadExclusions(body.executiveId,rows)});}
  catch(error){console.error("Charge exclusion approval failed",error);return NextResponse.json({error:"The approval could not save. Your charges are still here; try again."},{status:503});}
}
