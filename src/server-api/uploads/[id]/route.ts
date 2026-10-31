import { storedUpload } from "@/lib/upload-storage";

export async function GET(_request:Request, context:{params:Promise<{id:string}>}){
  try{const {id}=await context.params;const file=await storedUpload(id);if(!file)return new Response("File not found",{status:404});
    const safe=file.filename.replace(/[\r\n"\\]/g,"_");return new Response(file.object.body,{headers:{"Content-Type":file.content_type,"Content-Disposition":`attachment; filename="${safe.replace(/[^\x20-\x7E]/g,"_")}"; filename*=UTF-8''${encodeURIComponent(safe)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(error){console.error("Source file load failed",error);return new Response("The source file could not load. Try again.",{status:503});}
}
