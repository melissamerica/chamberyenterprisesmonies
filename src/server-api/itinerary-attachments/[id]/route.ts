import { linkedAttachment } from "@/lib/itinerary-attachment-storage";
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
  try{const {id}=await context.params;const file=await linkedAttachment(id);if(!file)return new Response("Attachment not found",{status:404});
    const safe=file.filename.replace(/[\r\n"\\]/g,"_");const preview=/^(application\/pdf|image\/(png|jpeg|webp|gif)|text\/plain)$/.test(file.content_type);const disposition=new URL(request.url).searchParams.get("download")==="1"||!preview?"attachment":"inline";
    return new Response(file.object.body,{headers:{"Content-Type":file.content_type,"Content-Disposition":`${disposition}; filename="${safe.replace(/[^\x20-\x7E]/g,"_")}"; filename*=UTF-8''${encodeURIComponent(safe)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){console.error("Attachment preview failed",error);return new Response("The attachment could not open. Try again.",{status:503});}
}
