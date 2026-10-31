import { NextResponse } from "next/server";
import { saveUploadDecision, removeVendorRule, removeDeferredUpload, uploadDatabase } from "@/lib/upload-storage";
import { createVendorRule, isOpenUploadTrip, isoDay, type UploadRow, type UploadTrip } from "@/lib/workspace-uploads";
import { validLearningFeedback, type LearningFeedback } from "@/lib/expense-learning";
import { expenseLearningStatements } from "@/lib/expense-learning-storage";

export async function PUT(request:Request) {
  let body:{executiveId?:unknown;row?:unknown;choice?:unknown;remember?:unknown;trip?:unknown;learning?:unknown};
  try{body=await request.json();}catch{return NextResponse.json({error:"Choose how to handle this transaction."},{status:400});}
  if(!body||typeof body.executiveId!=="string"||!body.executiveId||body.executiveId.length>160||typeof body.choice!=="string"||typeof body.remember!=="boolean")return NextResponse.json({error:"The transaction choice was not valid."},{status:400});
  const executiveId=body.executiveId,row=body.row as UploadRow;
  if(!row||row.kind!=="expense"||![row.key,row.fileId,row.source,row.title,row.date,row.amount,row.location].every(v=>typeof v==="string"&&v.length<=4000)||!row.key.startsWith(`${row.fileId}:`)||!row.fileId||row.city!==undefined&&(typeof row.city!=="string"||row.city.length>160)||JSON.stringify(row).length>20000)return NextResponse.json({error:"Check the transaction details."},{status:400});
  const later=body.choice==="later";
  if(!validLearningFeedback(body.learning))return NextResponse.json({error:"Choose a valid feedback scope and reason."},{status:400});
  if(later&&body.remember)return NextResponse.json({error:"Deferred transactions need a decision before it can be remembered."},{status:400});
  const trip=body.choice==="exclude"||later?undefined:body.trip as UploadTrip;
  if(body.choice!=="exclude"&&!later){
    if(!trip||!Number.isSafeInteger(trip.id)||trip.id<=0||String(trip.id)!==body.choice||trip.executiveId!==executiveId||!isOpenUploadTrip(trip)||![trip.name,trip.traveler,trip.dates,trip.route].every(v=>typeof v==="string"&&v.length<=1000)||!Array.isArray(trip.items)||trip.items.length>5000||JSON.stringify(trip).length>1000000)return NextResponse.json({error:"Choose an open trip."},{status:400});
    if(!row.title.trim()||!isoDay(row.date)||!row.amount.trim()||!Number.isFinite(Number(row.amount))||row.duplicateId&&!['new','update'].includes(row.duplicateChoice))return NextResponse.json({error:"Enter the description, date, amount, and any duplicate decision first."},{status:400});
    if(!trip.items.some(item=>item.importKey===row.key&&item.sourceFileId===row.fileId&&item.cost===Number(row.amount)))return NextResponse.json({error:"The transaction is missing from the selected trip."},{status:400});
    for(const item of trip.items)if(!item||!Number.isSafeInteger(item.id)||!["Flight","Hotel","Car","Appointment","Expense"].includes(item.kind)||![item.title,item.detail,item.date,item.time].every(v=>typeof v==="string"&&v.length<=12000)||item.cost!==undefined&&(typeof item.cost!=="number"||!Number.isFinite(item.cost))||item.importKey&&(typeof item.importKey!=="string"||typeof item.sourceFileId!=="string"))return NextResponse.json({error:"Check the imported trip details."},{status:400});
  }
  let rule;try{if(body.remember)rule=createVendorRule(executiveId,row,trip?"assign":"exclude",trip?String(trip.id):undefined);}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Enter the vendor and city."},{status:400});}
  try{
    const db=uploadDatabase(),ids=new Set([row.fileId,...trip?.items.filter(item=>item.importKey).map(item=>item.sourceFileId!)??[]]);
    for(const id of ids){const file=await db.prepare("SELECT executive_id FROM executive_upload_files WHERE id = ?").bind(id).first<{executive_id:string}>();if(file?.executive_id!==executiveId)return NextResponse.json({error:"Use transactions uploaded for this executive."},{status:400});}
    let memory:D1PreparedStatement[]=[],learningWarning:string|undefined;
    if(!later){try{memory=await expenseLearningStatements(executiveId,row,trip?"assign":"exclude",trip?.name,body.learning as LearningFeedback|undefined);}catch{learningWarning="The transaction saved, but its learning feedback could not be recorded.";}}
    return NextResponse.json({...await saveUploadDecision(executiveId,row,trip,rule,later,memory),...(learningWarning?{learningWarning}:{})});
  }catch(error){console.error("Upload decision save failed",error);return NextResponse.json({error:"Your choice could not save. The transaction is still here; try again."},{status:503});}
}
export async function DELETE(request:Request) {
  let body:{executiveId?:unknown;id?:unknown;reviewKey?:unknown};try{body=await request.json();}catch{return NextResponse.json({error:"Choose a remembered selection to remove."},{status:400});}
  if(!body||typeof body.executiveId!=="string"||!body.executiveId||body.executiveId.length>160||typeof (body.reviewKey??body.id)!=="string"||String(body.reviewKey??body.id).length>1000)return NextResponse.json({error:"The remembered selection was not valid."},{status:400});
  try{if(typeof body.reviewKey==="string")await removeDeferredUpload(body.executiveId,body.reviewKey);else await removeVendorRule(body.executiveId,body.id as string);return NextResponse.json({removed:true});}catch{return NextResponse.json({error:"The remembered selection could not be removed. Try again."},{status:503});}
}
