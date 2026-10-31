import { expenseCategory, expenseReportData, fillTemplate, itineraryDays, itineraryMaterialsLabel, itineraryTemplateBody, reservationTemplateTitle, type ExecutiveTemplates, type OutputTrip } from "./executive-profiles";

import { statementOnly, type ExpenseApprovalSignature } from "./expense-evidence";
import { billingCodeText, effectiveBillingCode } from "./billing-codes";

const navy = "233746";
const border = "D5DCE2";

export async function buildExpenseWorkbook(templates: ExecutiveTemplates, trip: OutputTrip, approval?: ExpenseApprovalSignature) {
  approval ??= trip.expenseReport?.approval;
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Anya";
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet("Expense Report", { views: [{ state: "frozen", ySplit: 7 }], pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const report = expenseReportData(templates, trip);
  const count = report.columns.length;
  sheet.columns = report.columns.map(column => ({ width: column.key === "expense" ? 38 : column.key === "source" ? 30 : column.key === "billingCode" ? 28 : column.key === "date" ? 16 : 15 }));
  sheet.mergeCells(1, 1, 2, count);
  const title = sheet.getCell(1, 1);
  title.value = report.heading;
  title.font = { name: "Calibri", size: 22, bold: true, color: { argb: "FFFFFFFF" } };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${navy}` } };
  title.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  sheet.getRow(1).height = 23; sheet.getRow(2).height = 23;
  sheet.mergeCells(4, 1, 4, count);
  sheet.getCell(4, 1).value = `PURPOSE: ${trip.name}     |     TRAVEL DATES: ${trip.dates}`;
  sheet.mergeCells(5, 1, 5, count);
  sheet.getCell(5, 1).value = `NAME: ${trip.traveler}     |     ROUTE: ${trip.route}`;
  for (const row of [4, 5]) { sheet.getCell(row, 1).font = { name: "Calibri", size: 11, color: { argb: `FF${navy}` } }; sheet.getCell(row, 1).alignment = { wrapText: true }; sheet.getRow(row).height = 30; }
  if (trip.billingCode) { sheet.mergeCells(6, 1, 6, count); sheet.getCell(6, 1).value = `DEFAULT BILLING CODE: ${billingCodeText(trip.billingCode)}`; sheet.getCell(6, 1).font = { name: "Calibri", size: 11 }; sheet.getCell(6, 1).alignment = { wrapText: true }; sheet.getRow(6).height = 30; }
  report.columns.forEach((column, index) => {
    const cell = sheet.getCell(7, index + 1); cell.value = column.label;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${navy}` } };
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { wrapText: true, vertical: "middle" };
  });
  sheet.getRow(7).height = 32;
  const first = 8;
  report.items.forEach((item, index) => {
    const row = first + index;
    const amount = typeof item.cost === "number" && Number.isFinite(item.cost) ? item.cost : null;
    report.columns.forEach((column, j) => {
      const cell = sheet.getCell(row, j + 1);
      if (column.key === "date") {
        const date = item.expenseDate ?? item.start?.slice(0, 10);
        cell.value = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : item.expenseDate ?? item.date;
        cell.numFmt = "mmm d, yyyy";
      } else if (column.key === "expense") cell.value = item.expenseDescription ?? item.title;
      else if (column.key === "source") cell.value = item.source ?? "";
      else if (column.key === "billingCode") cell.value = billingCodeText(effectiveBillingCode(item, trip)) || "—";
      else if (column.key === "amount" && templates.expenseShowCategory !== false) {
        const categoryCells = report.columns.map((c, k) => c.numeric && c.key !== "amount" ? sheet.getCell(row, k + 1).address : null).filter(Boolean);
        cell.value = { formula: `IF(COUNT(${categoryCells.join(",")})=0,"Amount missing",SUM(${categoryCells.join(",")}))`, result: amount ?? "Amount missing" };
      } else cell.value = column.key === "amount" || column.key === expenseCategory(item) ? amount ?? "Amount missing" : null;
      if (column.numeric) cell.numFmt = '$#,##0.00;($#,##0.00);"—"';
      cell.font = { name: "Calibri", size: 11, color: { argb: `FF${navy}` } };
      cell.alignment = { wrapText: true, vertical: "top", horizontal: column.numeric ? "right" : "left" };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statementOnly(item) ? "FFFFE599" : index % 2 ? "FFF3F5F7" : "FFFFFFFF" } };
      cell.border = { bottom: { style: "thin", color: { argb: `FF${border}` } } };
    });
    sheet.getRow(row).height = Math.max(42, ...report.columns.map((column, j) => { const value = sheet.getCell(row, j + 1).value; return typeof value === "string" ? Math.ceil(value.length / ((sheet.getColumn(j + 1).width ?? 15) - 2)) * 16 + 12 : 30; }));
  });
  if (report.showTotal) {
    const row = first + report.items.length;
    report.columns.forEach((column, j) => {
      const cell = sheet.getCell(row, j + 1);
      if (j === 0) cell.value = report.hasMissingAmounts ? "Known total" : "Total";
      else if (column.numeric) {
        const total = report.items.reduce((sum, item) => sum + (typeof item.cost === "number" && Number.isFinite(item.cost) && (column.key === "amount" || column.key === expenseCategory(item)) ? item.cost : 0), 0);
        cell.value = report.items.length ? { formula: `SUM(${sheet.getCell(first, j + 1).address}:${sheet.getCell(row - 1, j + 1).address})`, result: total } : 0;
        cell.numFmt = '$#,##0.00;($#,##0.00);"—"';
      }
      cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: `FF${navy}` } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EDF1" } };
      cell.alignment = { horizontal: column.numeric ? "right" : "left" };
      cell.border = { top: { style: "double", color: { argb: `FF${navy}` } } };
    });
    sheet.getRow(row).height = 26;
  }
  if (report.hasMissingAmounts) { const row = first + report.items.length + 2; sheet.mergeCells(row, 1, row, count); sheet.getCell(row, 1).value = "Missing amounts are excluded from the total. Enter them in the relevant category column."; sheet.getCell(row, 1).alignment = { wrapText: true }; sheet.getRow(row).height = 30; }
  const signatureRow=first+report.items.length+4;
  sheet.mergeCells(signatureRow,1,signatureRow,count);
  sheet.getCell(signatureRow,1).value="Yellow highlight: credit card statement is the only transaction evidence; no separate receipt attached.";
  sheet.getCell(signatureRow,1).alignment={wrapText:true};sheet.getRow(signatureRow).height=32;
  sheet.mergeCells(signatureRow+2,1,signatureRow+2,count);
  sheet.getCell(signatureRow+2,1).value=`Approver signature: ${approval?.status==="approved"?approval.signatureName??"":"________________________________"}`;
  sheet.getCell(signatureRow+2,1).font={name:"Calibri",size:12,bold:true};
  sheet.mergeCells(signatureRow+3,1,signatureRow+3,count);
  sheet.getCell(signatureRow+3,1).value=approval?.signedAt?`Electronically signed: ${approval.signedAt} | ${approval.approverEmail}`:"Date: ________________________________";
  sheet.mergeCells(signatureRow+4,1,signatureRow+4,count);
  sheet.getCell(signatureRow+4,1).value=approval?.reportHash?`Signed report SHA-256: ${approval.reportHash}`:"";
  sheet.getCell(signatureRow+4,1).alignment={wrapText:true};sheet.getRow(signatureRow+4).height=30;
  sheet.autoFilter = { from: { row: 7, column: 1 }, to: { row: Math.max(7, first + report.items.length - 1), column: count } };
  sheet.pageSetup.printArea = `A1:${sheet.getCell(signatureRow + 4, count).address}`;
  sheet.pageSetup.printTitlesRow = "7:7";
  sheet.headerFooter.oddFooter = "&LTravel expense report&RPage &P of &N";
  return workbook.xlsx.writeBuffer();
}

export async function buildItineraryDocument(templates: ExecutiveTemplates, trip: OutputTrip) {
  const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Packer, Footer, PageNumber, TableLayoutType, BorderStyle } = await import("docx");
  const text = (value: string, bold = false, white = false) => new Paragraph({ children: [new TextRun({ text: value, bold, color: white ? "FFFFFF" : navy, size: 26 })], spacing: { after: 60 } });
  const cell = (paragraphs: InstanceType<typeof Paragraph>[], width: number, color = "FFFFFF", span?: number) => new TableCell({ children: paragraphs, width: { size: width, type: WidthType.DXA }, columnSpan: span, shading: { fill: color }, margins: { top: 90, bottom: 90, left: 120, right: 120 } });
  const borders = Object.fromEntries(["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"].map(key => [key, { style: BorderStyle.SINGLE, size: 1, color: border }]));
  const children: Array<InstanceType<typeof Paragraph> | InstanceType<typeof Table>> = [
    new Table({ width: { size: 9360, type: WidthType.DXA }, rows: [new TableRow({ children: [cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: fillTemplate(templates.itineraryHeading, undefined, trip).toUpperCase(), bold: true, size: 34, color: "FFFFFF" })] }), new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: trip.dates, size: 28, color: "FFFFFF" })], spacing: { before: 100 } })], 9360, navy)] })] }),
    new Paragraph({ text: `Destination: ${trip.route}`, spacing: { before: 180, after: 80 } }),
    new Paragraph({ text: trip.name, spacing: { after: 180 } }),
  ];
  if (templates.itineraryLayout === "table") {
    children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [4680, 4680], borders, rows: [new TableRow({ tableHeader: true, children: [cell([text("Reservation", true, true)], 4680, navy), cell([text("Details", true, true)], 4680, navy)] }), ...trip.items.filter(item => item.kind !== "Expense" && item.itineraryEligible !== false).map((item, index) => new TableRow({ children: [cell([text(reservationTemplateTitle(templates, item, trip, "print"), true)], 4680, index % 2 ? "F3F5F7" : "FFFFFF"), cell([...itineraryTemplateBody(templates, item, trip).split("\n").map(line => text(line)), ...(itineraryMaterialsLabel(item) ? [text(itineraryMaterialsLabel(item), true)] : []), ...(templates.showSources && item.source ? [text(`Source: ${item.source}`)] : [])], 4680, index % 2 ? "F3F5F7" : "FFFFFF")] }))] }));
  } else for (const day of itineraryDays(templates, trip)) {
    children.push(new Table({ width: { size: 9360, type: WidthType.DXA }, layout: TableLayoutType.FIXED, columnWidths: [2620, 6740], borders, rows: [new TableRow({ tableHeader: true, children: [cell([new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: day.label, bold: true, size: 28, color: "FFFFFF" })] })], 9360, navy, 2)] }), ...day.rows.map(row => new TableRow({ children: [cell([text(row.time)], 2620, row.background), cell([text(row.title, true), ...row.body.split("\n").filter(Boolean).map(line => text(line)), ...(row.materials ? [text(row.materials, true)] : []), ...(row.source ? [text(`Source: ${row.source}`)] : [])], 6740, row.background)] }))] }));
    children.push(new Paragraph({ spacing: { after: 100 } }));
  }
  const document = new Document({ creator: "Anya", styles: { default: { document: { run: { font: "Calibri", size: 26, color: navy }, paragraph: { spacing: { after: 60 } } } } }, sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 720, bottom: 720, left: 1440, right: 1440 } } }, footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: `${trip.traveler} | ${trip.dates}     `, size: 22, color: navy }), new TextRun({ children: [PageNumber.CURRENT], size: 22 })] })] }) }, children }] });
  return Packer.toBlob(document);
}

export function downloadOutput(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
