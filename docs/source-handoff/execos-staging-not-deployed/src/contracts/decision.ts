/** Stable, versioned server-provided options; labels are never instructions. */
export type DecisionState =
  | "pending" | "awaiting_ea_review" | "needs_more_information"
  | "deferred" | "talk_requested" | "delegation_requested" | "delegated" | "awaiting_delegate_input" | "closed" | "cancelled";
export type DelegationMode = "request_input" | "delegate_decision" | "assign_execution";
export interface DelegateOption { id: string; displayName: string; allowedModes: DelegationMode[]; }
export type ReplyMethod = "choice" | "typed" | "voice" | "video" | "request_info" | "defer" | "talk" | "delegate";

export interface ExecutiveDecision {
  id: string;
  version: number;
  title: string;
  question: string;
  context?: string;
  recommendation?: string;
  dueAt: string | null;
  status: DecisionState;
  choices: Array<{ id: string; label: string }>;
  sourceLabel?: string;
}
export interface DecisionAnswerPayload {
  expectedVersion: number;
  idempotencyKey: string;
  method: ReplyMethod;
  choiceId?: string;
  text?: string;
  /** Server-issued, private, validated uploaded-media ID; never a remote URL. */
  mediaId?: string;
  deferUntil?: string;
  delegateToUserId?: string;
  delegationMode?: DelegationMode;
  delegationInstructions?: string;
  delegationDueAt?: string;
  /** Affirmation needed whenever delegated authority changes, not just input requested. */
  authorityAcknowledged?: boolean;
}
export interface DecisionResponse {
  id: string;
  decisionId: string;
  method: ReplyMethod;
  /** A recording itself cannot imply approval. */
  status: DecisionState;
  savedAt: string;
  newVersion: number;
}
