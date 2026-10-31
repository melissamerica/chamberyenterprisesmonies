import type { BillingCode } from "./billing-codes";

export const billingImportLimit = 1000;
export type BillingImportSheet = { name: string; rows: string[][] };
export type BillingImportMapping = { headerRow: number; codeColumn: number; labelColumn: number };
export type BillingImportRow = { key: number; sourceRow: number; code: string; label: string; selected: boolean };
export type BillingImportInput = { code: string; label: string; expectedUpdatedAt?: string };
const heading = (value: string) => value.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const codeHeadings = new Set(["code", "codes", "billingcode", "billingcodes", "clientcode", "projectcode", "accountcode", "accountnumber", "costcode", "costcenter", "costcentre", "glcode", "glnumber", "mattercode", "matter", "matterid", "clientid", "projectid"]);
const labelHeadings = new Set(["description", "codedescription", "billingdescription", "billingcodedescription", "name", "label", "client", "clientname", "project", "projectname", "account", "accountname", "mattername", "matterdescription"]);

export function billingCodeKey(code: string) { return code.trim().toLocaleLowerCase("en-US"); }
export function billingImportIssue(row: Pick<BillingImportRow, "code" | "label">) {
  if (!row.code.trim()) return "Code is missing";
  if (row.code.trim().length > 80) return "Code exceeds 80 characters";
  if (!row.label.trim()) return "Description is missing";
  if (row.label.trim().length > 240) return "Description exceeds 240 characters";
  return "";
}
export function guessBillingColumns(rows: string[][]): BillingImportMapping {
  for (let index = 0; index < Math.min(rows.length, 30); index++) {
    const columns = rows[index].map(heading);
    const codeColumn = columns.findIndex(value => codeHeadings.has(value));
    const labelColumn = Array.from(labelHeadings).map(value => columns.indexOf(value)).find(index => index >= 0) ?? -1;
    if (codeColumn >= 0 && labelColumn >= 0 && codeColumn !== labelColumn) return {headerRow: index, codeColumn, labelColumn};
  }
  return {headerRow: -1, codeColumn: 0, labelColumn: 1};
}
export function billingImportRows(rows: string[][], mapping: BillingImportMapping, codes: BillingCode[]): BillingImportRow[] {
  const known = new Set(codes.map(code => billingCodeKey(code.code))), seen = new Set<string>();
  const result: BillingImportRow[] = [];
  for (let index = mapping.headerRow + 1; index < rows.length; index++) {
    const source = rows[index];
    if (!source.some(value => value.trim())) continue;
    const code = (source[mapping.codeColumn] ?? "").trim(), label = (source[mapping.labelColumn] ?? "").trim();
    if (!code && !label) continue;
    if (codeHeadings.has(heading(code)) && labelHeadings.has(heading(label))) continue;
    const key = billingCodeKey(code);
    const row = {key: index, sourceRow: index + 1, code, label, selected: !known.has(key) && !seen.has(key) && !billingImportIssue({code, label})};
    result.push(row); seen.add(key);
    if (result.length > billingImportLimit) throw Error(`This sheet contains more than ${billingImportLimit} codes. Split it into smaller files and upload each one.`);
  }
  return result;
}
export function delimitedBillingRows(text: string, separator?: string): string[][] {
  const input = text.replace(/^\uFEFF/, "");
  if (!separator) {
    const candidates = [",", "\t", ";"].map(value => {
      try { const rows = delimitedBillingRows(input, value); return {rows, score: rows.slice(0, 100).filter(row => row.length > 1).length}; }
      catch { return {rows: undefined, score: -1}; }
    }).sort((a, b) => b.score - a.score);
    if (candidates[0].rows && candidates[0].score > 0) return candidates[0].rows;
    return delimitedBillingRows(input, ",");
  }
  const rows: string[][] = []; let row: string[] = [], value = "", quoted = false;
  for (let i = 0; i < input.length; i++) {
    const character = input[i];
    if (character === '"') { if (quoted && input[i + 1] === '"') { value += '"'; i++; } else if (quoted || !value.trim()) quoted = !quoted; else value += character; }
    else if (character === separator && !quoted) { row.push(value); value = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && input[i + 1] === "\n") i++; row.push(value); rows.push(row); row = []; value = ""; }
    else value += character;
  }
  if (quoted) throw Error("A quoted cell is unfinished. Check the CSV file and upload it again.");
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}
export function billingTextRows(text: string): string[][] {
  return text.split(/\r?\n/).filter(line => line.trim()).map(line => {
    const clean = line.trim().replace(/^[•●]\s*/, "");
    if (/\t| {2,}|\s\|\s/.test(clean)) return clean.split(/\t+| {2,}|\s\|\s/).map(value => value.trim());
    const header = clean.match(/^(billing\s+code|client\s+code|account\s+code|code)\s+(description|name|label)$/i);
    if (header) return [header[1], header[2]];
    const pair = clean.match(/^([^\s:]+)\s*(?::\s*|\s+[–—-]\s+|\s+)(.+)$/);
    return pair ? [pair[1], pair[2].trim()] : [clean, ""];
  });
}
function docxRows(xml: string): string[][] {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw Error("This Word document could not be read. Save it as .docx or CSV and try again.");
  const namespace = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const elements = (element: Document | Element, name: string) => Array.from(element.getElementsByTagNameNS(namespace, name));
  const paragraphText = (paragraph: Element) => {
    const parts: string[] = [];
    const visit = (node: Element) => { for (const child of Array.from(node.children)) { if (child.namespaceURI === namespace && child.localName === "t") parts.push(child.textContent ?? ""); else if (child.localName === "tab") parts.push("\t"); else if (child.localName === "br") parts.push(" "); else visit(child); } };
    visit(paragraph); return parts.join("");
  };
  const rows: string[][] = [];
  const visit = (node: Element) => {
    if (node.namespaceURI === namespace && node.localName === "tbl") {
      for (const row of elements(node, "tr")) {
        const cells = Array.from(row.children).filter(child => child.localName === "tc");
        if (cells.length) rows.push(cells.map(cell => elements(cell, "p").map(paragraphText).join(" ").trim()));
      }
    } else if (node.namespaceURI === namespace && node.localName === "p") rows.push(...billingTextRows(paragraphText(node)));
    else for (const child of Array.from(node.children)) visit(child);
  };
  visit(document.documentElement);
  return rows;
}
async function fileText(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
  return new TextDecoder(encoding).decode(bytes);
}
export async function readBillingCodeFile(file: File): Promise<BillingImportSheet[]> {
  if (!file.size) throw Error("This file is empty. Choose a file containing billing codes.");
  if (file.size > 20 * 1024 * 1024) throw Error("Please use a file smaller than 20 MB.");
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  if (extension === "xlsx") {
    const {default: ExcelJS} = await import("exceljs"); const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheets: BillingImportSheet[] = [];
    workbook.eachSheet(sheet => {
      const rows: string[][] = [];
      if (sheet.actualRowCount > 20000 || sheet.columnCount > 200) throw Error("This workbook is too large. Upload a sheet containing just the billing-code list.");
      sheet.eachRow((row, rowNumber) => {
        while (rows.length < rowNumber - 1) rows.push([]);
        const cells: string[] = [];
        for (let i = 1; i <= row.cellCount; i++) {
          const cell = row.getCell(i), value = cell.value;
          cells.push(typeof value === "number" && /^0+$/.test(cell.numFmt) ? String(value).padStart(cell.numFmt.length, "0") : cell.text);
        }
        rows.push(cells);
      });
      if (rows.some(row => row.some(value => value.trim()))) sheets.push({name: sheet.name, rows});
    });
    if (!sheets.length) throw Error("No billing codes were found in this workbook.");
    return sheets;
  }
  if (["csv", "tsv"].includes(extension ?? "")) return [{name: file.name, rows: delimitedBillingRows(await fileText(file), extension === "tsv" ? "\t" : undefined)}];
  if (extension === "docx") {
    const {default: JSZip} = await import("jszip"), zip = await JSZip.loadAsync(await file.arrayBuffer());
    const document = zip.file("word/document.xml");
    if (!document) throw Error("This file is not a readable Word document. Save it as .docx and try again.");
    return [{name: file.name, rows: docxRows(await document.async("string"))}];
  }
  if (extension === "pdf") { const {readTravelDocument} = await import("./travel-confirmations"); return [{name: file.name, rows: billingTextRows(await readTravelDocument(file))}]; }
  if (extension === "txt") return [{name: file.name, rows: billingTextRows(await fileText(file))}];
  throw Error("Upload Excel (.xlsx), CSV, TSV, Word (.docx), PDF, or text (.txt). For older .xls or .doc files, save a copy as .xlsx, .docx, or CSV first.");
}
