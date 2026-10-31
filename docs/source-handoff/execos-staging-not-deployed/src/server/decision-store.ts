import type { D1Database } from "@cloudflare/workers-types";
import type { DecisionAnswerPayload, DecisionResponse, ExecutiveDecision, DecisionState, DelegationMode, DelegateOption } from "../contracts/decision";
import type { ExecutivePrincipal } from "./auth";

// Use existing D1 DB binding during integration; never open a second database.
export type D1Exec = Pick<D1Database, "prepare" | "batch">;
const METHODS = new Set(["choice", "typed", "voice", "video", "request_info", "defer", "talk", "delegate"]);
const MAX_BODY_TEXT = 5000;

function nextState(method: DecisionAnswerPayload["method"]): DecisionState {
  switch (method) {
    case "request_info": return "needs_more_information";
    case "defer": return "deferred";
    case "talk": return "talk_requested";
    case "delegate": return "delegation_requested";
    default: return "awaiting_ea_review";
  }
}

export function validateAnswer(data: unknown): DecisionAnswerPayload {
  if (!data || typeof data !== "object") throw new Error("INVALID_REQUEST");
  const b = data as Record<string, unknown>;
  if (!Number.isSafeInteger(b.expectedVersion) || Number(b.expectedVersion) < 1) throw new Error("INVALID_VERSION");
  if (typeof b.idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(b.idempotencyKey)) throw new Error("INVALID_IDEMPOTENCY_KEY");
  if (typeof b.method !== "string" || !METHODS.has(b.method)) throw new Error("INVALID_METHOD");
  for (const field of ["choiceId","text","mediaId","deferUntil","delegateToUserId","delegationMode","delegationInstructions","delegationDueAt"]) {
    if (b[field] !== undefined && typeof b[field] !== "string") throw new Error("INVALID_FIELD");
  }
  if (typeof b.text === "string" && b.text.length > MAX_BODY_TEXT) throw new Error("TEXT_TOO_LONG");
  if (typeof b.delegationInstructions === "string" && b.delegationInstructions.length > 3000) throw new Error("INSTRUCTIONS_TOO_LONG");
  if (b.method === "choice" && !b.choiceId) throw new Error("CHOICE_REQUIRED");
  if (b.method === "typed" && !String(b.text ?? "").trim()) throw new Error("TEXT_REQUIRED");
  if ((b.method === "voice" || b.method === "video") && !b.mediaId) throw new Error("VERIFIED_MEDIA_REQUIRED");
  if (b.method === "defer" && (!b.deferUntil || isNaN(Date.parse(String(b.deferUntil))) || Date.parse(String(b.deferUntil)) <= Date.now())) throw new Error("FUTURE_TIME_REQUIRED");
  if (b.method === "delegate") {
    if (!b.delegateToUserId || typeof b.delegateToUserId !== "string") throw new Error("DELEGATE_REQUIRED");
    if (!["request_input", "delegate_decision", "assign_execution"].includes(String(b.delegationMode))) throw new Error("DELEGATION_MODE_REQUIRED");
    if (b.delegationDueAt && (isNaN(Date.parse(String(b.delegationDueAt))) || Date.parse(String(b.delegationDueAt)) <= Date.now())) throw new Error("INVALID_DELEGATION_DUE_AT");
    if (b.delegationMode !== "request_input" && b.authorityAcknowledged !== true) throw new Error("AUTHORITY_CONFIRMATION_REQUIRED");
    if (b.delegationMode !== "request_input" && !String(b.delegationInstructions ?? "").trim()) throw new Error("AUTHORITY_SCOPE_REQUIRED");
  }
  if (b.authorityAcknowledged !== undefined && typeof b.authorityAcknowledged !== "boolean") throw new Error("INVALID_AUTHORITY_FLAG");
  return b as unknown as DecisionAnswerPayload;
}

export async function listExecutiveDecisions(db: D1Exec, who: ExecutivePrincipal): Promise<ExecutiveDecision[]> {
  if (!who.roles.includes("executive")) throw new Error("FORBIDDEN");
  const rows = await db.prepare(`SELECT d.id, d.version, d.title, d.question, d.context,
    d.recommendation, d.due_at, d.status, d.choices_json, d.source_label
    FROM execos_decisions d
    WHERE d.tenant_id=? AND d.executive_user_id=?
      AND d.status='pending'
      AND EXISTS (SELECT 1 FROM execos_executive_assignments a
        WHERE a.tenant_id=d.tenant_id AND a.executive_user_id=d.executive_user_id AND a.active=1)
    ORDER BY CASE WHEN d.due_at IS NULL THEN 1 ELSE 0 END, d.due_at, d.created_at LIMIT 100`)
    .bind(who.tenantId,who.userId).all<Record<string, unknown>>();
  return (rows.results??[]).map(r=>({
    id:String(r.id), version:Number(r.version), title:String(r.title), question:String(r.question),
    context:r.context?String(r.context):undefined, recommendation:r.recommendation?String(r.recommendation):undefined,
    dueAt:r.due_at?String(r.due_at):null, status:r.status as DecisionState,
    choices:JSON.parse(String(r.choices_json)), sourceLabel:r.source_label?String(r.source_label):undefined,
  }));
}

/** Recipient directory is built server-side from explicit, current authorization grants. */
export async function listAuthorizedDelegates(db:D1Exec, who:ExecutivePrincipal):Promise<DelegateOption[]> {
  if (!who.roles.includes("executive")) throw new Error("FORBIDDEN");
  const result=await db.prepare(`SELECT delegate_user_id, display_name,
     allow_request_input, allow_delegate_decision, allow_assign_execution
     FROM execos_allowed_delegates WHERE tenant_id=? AND executive_user_id=? AND active=1
     ORDER BY display_name LIMIT 100`).bind(who.tenantId,who.userId).all<{
       delegate_user_id:string;display_name:string;allow_request_input:number;
       allow_delegate_decision:number;allow_assign_execution:number;
     }>();
  return (result.results??[]).map(r=>({
     id:r.delegate_user_id, displayName:r.display_name,
     allowedModes:([
       r.allow_request_input?"request_input":null,
       r.allow_delegate_decision?"delegate_decision":null,
       r.allow_assign_execution?"assign_execution":null,
     ].filter(Boolean) as DelegationMode[]),
  })).filter(r=>r.allowedModes.length>0);
}

/** The DB batch is deliberately conditional and tenant-scoped. All writes in one D1 batch. */
export async function submitExecutiveAnswer(db: D1Exec, who: ExecutivePrincipal, decisionId: string, raw: unknown): Promise<DecisionResponse> {
  if (!who.roles.includes("executive")) throw new Error("FORBIDDEN");
  const payload=validateAnswer(raw);
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(decisionId)) throw new Error("INVALID_ID");
  const old = await db.prepare(`SELECT response_json FROM execos_responses WHERE tenant_id=? AND executive_user_id=? AND idempotency_key=?`)
    .bind(who.tenantId,who.userId,payload.idempotencyKey).first<{response_json:string}>();
  if(old) { const previous=JSON.parse(old.response_json) as DecisionResponse; if(previous.decisionId!==decisionId) throw new Error("IDEMPOTENCY_CONFLICT"); return previous; }
  const row = await db.prepare(`SELECT id, version, status, choices_json, tenant_id, executive_user_id FROM execos_decisions
    WHERE tenant_id=? AND executive_user_id=? AND id=?`).bind(who.tenantId,who.userId,decisionId)
    .first<{id:string;version:number;status:string;choices_json:string}>();
  if(!row) throw new Error("NOT_FOUND");
  if(row.version!==payload.expectedVersion || row.status!=="pending") throw new Error("CONFLICT");
  if(payload.method==="choice" && !(JSON.parse(row.choices_json) as Array<{id:string}>).some(c=>c.id===payload.choiceId)) throw new Error("INVALID_CHOICE");
  // Media must be linked to a validated, tenant-scoped private R2 upload before submission.
  if(["voice","video"].includes(payload.method)) throw new Error("MEDIA_VALIDATION_NOT_CONNECTED");
  if(payload.method==="delegate") {
    // Approved execution requires an independently verified approved-work record.
    if(payload.delegationMode==="assign_execution") throw new Error("APPROVED_ACTION_CHECK_NOT_CONNECTED");
    const canDelegate=await db.prepare(`SELECT delegate_user_id FROM execos_allowed_delegates
       WHERE tenant_id=? AND executive_user_id=? AND delegate_user_id=? AND active=1
         AND ( (?='request_input' AND allow_request_input=1)
            OR (?='delegate_decision' AND allow_delegate_decision=1)
            OR (?='assign_execution' AND allow_assign_execution=1))`)
       .bind(who.tenantId,who.userId,payload.delegateToUserId,payload.delegationMode,payload.delegationMode,payload.delegationMode)
       .first();
    if(!canDelegate) throw new Error("DELEGATE_NOT_AUTHORIZED");
  }
  const now=new Date().toISOString(); const responseId=crypto.randomUUID(); const status=nextState(payload.method);
  const response:DecisionResponse={id:responseId,decisionId,method:payload.method,status,savedAt:now,newVersion:row.version+1};
  // D1 batch is transactional. INSERT ... SELECT gates ALL follow-up writes on the
  // current version; no orphan response is inserted when optimistic concurrency fails.
  // Gate the initial insert against current delegated-recipient authorization inside
  // the transaction. All subsequent writes depend on the inserted response ID.
  const delegateGuard=payload.method==="delegate" ?
   ` AND EXISTS (SELECT 1 FROM execos_allowed_delegates g WHERE
     g.tenant_id=d.tenant_id AND g.executive_user_id=d.executive_user_id
     AND g.delegate_user_id=? AND g.active=1 AND
     ((?='request_input' AND g.allow_request_input=1) OR
      (?='delegate_decision' AND g.allow_delegate_decision=1) OR
      (?='assign_execution' AND g.allow_assign_execution=1)))` : "";
  const result=await db.batch([
    db.prepare(`INSERT INTO execos_responses (id,tenant_id,decision_id,executive_user_id,idempotency_key,method,
       choice_id,text_reply,media_id,defer_until,status,response_json,created_at)
       SELECT ?,?,?,?,?,?,?,?,?,?,?,?,? FROM execos_decisions d
       WHERE d.id=? AND d.tenant_id=? AND d.executive_user_id=? AND d.version=?
         AND d.status='pending'${delegateGuard}`)
      .bind(responseId,who.tenantId,decisionId,who.userId,payload.idempotencyKey,payload.method,
        payload.choiceId??null,payload.text??null,payload.mediaId??null,payload.deferUntil??null,status,JSON.stringify(response),now,
        decisionId,who.tenantId,who.userId,payload.expectedVersion,
        ...(payload.method==="delegate"?[payload.delegateToUserId,payload.delegationMode,payload.delegationMode,payload.delegationMode]:[])),
    db.prepare(`UPDATE execos_decisions SET status=?, version=version+1, updated_at=?
      WHERE id=? AND tenant_id=? AND executive_user_id=? AND version=?
        AND EXISTS (SELECT 1 FROM execos_responses r WHERE r.id=? AND r.decision_id=execos_decisions.id)`)
      .bind(status,now,decisionId,who.tenantId,who.userId,payload.expectedVersion,responseId),
    ...(payload.method==="delegate"?[
      db.prepare(`INSERT INTO execos_delegations (id,tenant_id,decision_id,response_id,
        principal_user_id,delegate_user_id,delegation_mode,instructions,due_at,status,created_at)
        SELECT ?,?,?,?,?,?,?,?,?,?,? FROM execos_responses r
        WHERE r.id=? AND r.tenant_id=? AND r.decision_id=?`)
       .bind(crypto.randomUUID(),who.tenantId,decisionId,responseId,who.userId,
         payload.delegateToUserId,payload.delegationMode,payload.delegationInstructions??null,
         payload.delegationDueAt??null,"pending_delivery",now,
         responseId,who.tenantId,decisionId),
    ]:[]),
    db.prepare(`INSERT INTO execos_decision_audit (id,tenant_id,decision_id,actor_user_id,event,details_json,created_at)
       SELECT ?,?,?,?,?,?,? FROM execos_responses r WHERE r.id=? AND r.tenant_id=?`)
      .bind(crypto.randomUUID(),who.tenantId,decisionId,who.userId,"executive_response",JSON.stringify({method:payload.method,status}),now,responseId,who.tenantId),
  ]);
  if(result[0]?.meta?.changes!==1 || result[1]?.meta?.changes!==1 ||
     (payload.method==="delegate" && result[2]?.meta?.changes!==1)) throw new Error("CONFLICT");
  // This state records intent and a pending delivery, NOT notification receipt.
  // A separate authorized worker is required to deliver, acknowledge, and track completion.
  return response;
}
