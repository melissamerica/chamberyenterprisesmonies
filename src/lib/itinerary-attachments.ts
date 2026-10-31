export type ItineraryAttachment = { id:string; tripId:number; entryId:number; name:string; contentType:string; byteCount:number; createdAt:string };
export const attachmentContentTypes:Record<string,string> = {
  pdf:"application/pdf",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",
  eml:"message/rfc822",html:"text/html",htm:"text/html",ics:"text/calendar",tsv:"text/tab-separated-values",
  txt:"text/plain",csv:"text/csv",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
export const attachmentAccept=Object.keys(attachmentContentTypes).map(extension=>`.${extension}`).join(",");
