export type ExpenseEvidence = {fileId:string;kind:"receipt"|"statement"};
export type ExpenseApprovalSignature = {status:string;signatureName?:string|null;signedAt?:string|null;approverEmail?:string;reportHash?:string};
export function statementOnly(item:{expenseEvidence?:ExpenseEvidence[]}) {
  return !!item.expenseEvidence?.some(value=>value.kind==="statement")&&!item.expenseEvidence.some(value=>value.kind==="receipt");
}
export function validApprovalEmail(value:unknown):value is string {
  return typeof value==="string"&&value.length<=254&&/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(value)&&!/[\r\n]/.test(value);
}
export const approvalConsent="I approve this expense report and agree that my typed name is my electronic signature.";
