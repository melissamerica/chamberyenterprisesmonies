import { parseLabeledConfirmation, readTravelDocument } from "./travel-confirmations";
import { readBillingCodeFile } from "./billing-code-import";
import { attachmentAccept } from "./itinerary-attachments";

export type RecognizedUpload = { kind: "travel" | "expenses" | "calendar" | "billing" | "attachment" | "review"; text?: string; warning?: string };
export const automaticUploadAccept = `image/*,${attachmentAccept}`;

/** Route only when the document contains evidence of a known workflow. Ordinary materials stay attachments. */
export function classifyUploadText(text: string, filename = ""): RecognizedUpload["kind"] {
  if (/^BEGIN:VCALENDAR\s*$/im.test(text)) return "calendar";
  if (parseLabeledConfirmation(text, filename)) return "travel";
  const booking = /\b(?:confirmation|booking|reservation|record locator|ticket number)\b/i.test(text);
  const reservation = /\b(?:flight\s*(?:number|#|:|[A-Z]{2}\s*\d)|departure\s*(?:date|time|:)|arrival\s*(?:date|time|:)|check[- ]?in\s*(?:date|:)|check[- ]?out\s*(?:date|:)|pick[- ]?up\s*(?:date|:)|drop[- ]?off\s*(?:date|:))\b/i.test(text);
  const cancellation = /\b(?:booking|reservation|flight)\s+(?:has been\s+)?cancelled\b|cancellation confirmation/i.test(text);
  if (booking && (reservation || /\b(?:DL|AA|UA|WN|B6|AS|F9|NK|Delta)\s*\d{1,4}\b[\s\S]*?\d{1,2}:\d{2}\s*[AP]M\s+[A-Z]{3}\b/i.test(text) || /\b(?:flight confirmation|hotel reservation|car rental confirmation|rental.car reservation)\b/i.test(text)) || cancellation) return "travel";
  const header = text.slice(0, 8000);
  if (/\b(?:billing|client|account|project)[ _-]+codes?\b/i.test(header) && /\b(?:description|label|client name|code name)\b/i.test(header)) return "billing";
  const amount = /(?:\$|USD\s*)\s*[\d,]+\.\d{2}\b|\b(?:total|amount|balance|debit|credit)\b[^\r\n]*\d+[.,]\d{2}\b|(?:^|[\s,;])[-+]?\d+\.\d{2}(?=$|[\s,;])/im.test(text);
  const receipt = /\b(?:receipt|subtotal|sales tax|gratuity|tip|amount paid|payment received|card ending|transaction date)\b/i.test(text);
  const statement = /\b(?:credit card statement|account statement|statement period|previous balance|minimum payment|payment due|transaction(?: date)?[,\t;|]+(?:description|merchant)|date[,\t;|]+(?:description|merchant)[^\r\n]*(?:amount|debit|credit))\b/i.test(text);
  if (amount && (receipt || statement)) return "expenses";
  // Incomplete or ambiguous travel/financial documents are not ordinary itinerary materials.
  if (/\b(?:flight|airline|hotel|rental.car|booking|reservation|receipt|invoice|statement|billing.code)\b/i.test(text) || /(?:flight|hotel|rental|confirmation|receipt|statement|invoice|billing.code)/i.test(filename)) return "review";
  return text.trim().length >= 40 ? "attachment" : "review";
}

export async function recognizeUpload(file: File): Promise<RecognizedUpload> {
  if (!file.size) throw Error(`${file.name}: this file is empty.`);
  if (file.size > 20 * 1024 * 1024) throw Error(`${file.name}: use a file under 20 MB.`);
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  let text = "";
  try {
    if (["xlsx", "csv", "tsv", "docx"].includes(extension)) {
      const sheets = await readBillingCodeFile(file);
      text = sheets.map(sheet => sheet.rows.map(row => row.join("\t")).join("\n")).join("\n");
    } else if (extension === "pptx") {
      const { default: JSZip } = await import("jszip");
      const zip = await JSZip.loadAsync(await file.arrayBuffer());
      for (const entry of Object.values(zip.files).filter(entry => /^ppt\/slides\/slide\d+\.xml$/.test(entry.name))) {
        const xml = new DOMParser().parseFromString(await entry.async("string"), "application/xml");
        text += Array.from(xml.getElementsByTagNameNS("*", "t")).map(node => node.textContent).join(" ") + "\n";
      }
    } else if (file.type.startsWith("image/") || ["png", "jpg", "jpeg", "webp", "gif", "pdf", "txt", "eml", "html", "htm", "ics"].includes(extension)) {
      const readable = !file.type && /^(png|jpg|jpeg|webp|gif)$/.test(extension) ? new File([file], file.name, { type: `image/${extension === "jpg" ? "jpeg" : extension}` }) : file;
      text = await readTravelDocument(readable);
    }
  } catch (error) {
    return { kind: "review", warning: `The document could not be identified: ${error instanceof Error ? error.message : "its contents could not be read"}. Nothing has been imported.` };
  }
  return { kind: classifyUploadText(text, file.name), text };
}
