-- DRAFT: adapt via existing Drizzle migration generation + meta journal.
-- Not applied to any database. Existing production access permissions are a prerequisite.
CREATE TABLE IF NOT EXISTS execos_executive_assignments (
  tenant_id TEXT NOT NULL,
  executive_user_id TEXT NOT NULL,
  assigned_ea_user_id TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY(tenant_id, executive_user_id, assigned_ea_user_id)
);
CREATE TABLE IF NOT EXISTS execos_decisions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  executive_user_id TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  question TEXT NOT NULL,
  context TEXT,
  recommendation TEXT,
  choices_json TEXT NOT NULL,
  source_label TEXT,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_execos_decisions_queue
  ON execos_decisions(tenant_id,executive_user_id,status,due_at);
CREATE TABLE IF NOT EXISTS execos_responses (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  decision_id TEXT NOT NULL REFERENCES execos_decisions(id),
  executive_user_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  method TEXT NOT NULL,
  choice_id TEXT,
  text_reply TEXT,
  media_id TEXT,
  defer_until TEXT,
  status TEXT NOT NULL,
  response_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(tenant_id,executive_user_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS execos_media (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  executive_user_id TEXT NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  media_kind TEXT NOT NULL CHECK(media_kind IN ('voice','video')),
  media_state TEXT NOT NULL DEFAULT 'pending',
  content_type TEXT NOT NULL,
  byte_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS execos_decision_audit (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  decision_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  event TEXT NOT NULL,
  details_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_execos_audit_decision
  ON execos_decision_audit(tenant_id,decision_id,created_at);

-- Delegation permission directory. Grants must be administered by an authorized tenant admin.
-- The name is for display only and must never be used as identity proof.
CREATE TABLE IF NOT EXISTS execos_allowed_delegates (
  tenant_id TEXT NOT NULL,
  executive_user_id TEXT NOT NULL,
  delegate_user_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  allow_request_input INTEGER NOT NULL DEFAULT 1,
  allow_delegate_decision INTEGER NOT NULL DEFAULT 0,
  allow_assign_execution INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  PRIMARY KEY(tenant_id, executive_user_id, delegate_user_id)
);
CREATE TABLE IF NOT EXISTS execos_delegations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  decision_id TEXT NOT NULL REFERENCES execos_decisions(id),
  response_id TEXT NOT NULL UNIQUE REFERENCES execos_responses(id),
  principal_user_id TEXT NOT NULL,
  delegate_user_id TEXT NOT NULL,
  delegation_mode TEXT NOT NULL CHECK(delegation_mode IN('request_input','delegate_decision','assign_execution')),
  instructions TEXT,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending_delivery',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_execos_delegations_recipient
  ON execos_delegations(tenant_id,delegate_user_id,status,due_at);
