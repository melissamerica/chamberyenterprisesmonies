import { uploadDatabase } from "./upload-storage";
import { buildExpenseDecision, type ExpenseDecision, type ExpensePreference, type LearningFeedback, type LearningKnowledge } from "./expense-learning";
import type { UploadRow } from "./workspace-uploads";

export async function loadExpenseLearning(executiveId: string): Promise<LearningKnowledge> {
  const db = uploadDatabase();
  const [settings, decisions, preferences] = await Promise.all([
    db.prepare("SELECT enabled FROM expense_learning_settings WHERE executive_id = ?").bind(executiveId).first<{ enabled: number }>(),
    db.prepare("SELECT decision_json, active FROM expense_learning_decisions WHERE executive_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 500").bind(executiveId).all<{ decision_json: string; active: number }>(),
    db.prepare("SELECT preference_json, active FROM expense_learning_preferences WHERE executive_id = ? ORDER BY updated_at DESC LIMIT 200").bind(executiveId).all<{ preference_json: string; active: number }>(),
  ]);
  return { enabled: settings?.enabled !== 0,
    decisions: decisions.results.map(value => ({ ...JSON.parse(value.decision_json) as ExpenseDecision, active: value.active === 1 })),
    preferences: preferences.results.map(value => ({ ...JSON.parse(value.preference_json) as ExpensePreference, active: value.active === 1 })) };
}

/** Included in the same D1 batch as the successful expense decision. */
export async function expenseLearningStatements(executiveId: string, row: UploadRow, action: "assign" | "exclude", tripName?: string, feedback?: LearningFeedback) {
  const db = uploadDatabase(), knowledge = await loadExpenseLearning(executiveId);
  if (!knowledge.enabled && !feedback?.rememberCategory) return [];
  const prior = await db.prepare("SELECT row_json FROM executive_unassigned_uploads WHERE id = ? AND executive_id = ?").bind(row.key, executiveId).first<{ row_json: string }>()
    ?? await db.prepare("SELECT row_json FROM executive_deferred_uploads WHERE id = ? AND executive_id = ?").bind(row.key, executiveId).first<{ row_json: string }>();
  const { decision, preference } = buildExpenseDecision(executiveId, row, prior ? JSON.parse(prior.row_json) as UploadRow : undefined, action, tripName, feedback, knowledge);
  const statements = [db.prepare("INSERT INTO expense_learning_decisions (id, executive_id, row_key, decision_json, recorded_at, active) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(id) DO NOTHING").bind(decision.id, executiveId, row.key, JSON.stringify(decision), decision.recordedAt)];
  if (preference) statements.push(db.prepare("INSERT INTO expense_learning_preferences (id, executive_id, preference_json, updated_at, active) VALUES (?, ?, ?, ?, 1) ON CONFLICT(id) DO UPDATE SET preference_json = excluded.preference_json, updated_at = excluded.updated_at, active = 1").bind(preference.id, executiveId, JSON.stringify(preference), preference.recordedAt));
  return statements;
}

export async function setExpenseLearningEnabled(executiveId: string, enabled: boolean) {
  await uploadDatabase().prepare("INSERT INTO expense_learning_settings (executive_id, enabled, updated_at) VALUES (?, ?, ?) ON CONFLICT(executive_id) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at").bind(executiveId, enabled ? 1 : 0, new Date().toISOString()).run();
}
export async function setExpenseMemoryActive(executiveId: string, kind: "preference" | "decision", id: string, active: boolean) {
  const db = uploadDatabase();
  // Table names are fixed by code, never interpolated from a request.
  if (kind === "preference") await db.prepare("UPDATE expense_learning_preferences SET active = ? WHERE id = ? AND executive_id = ?").bind(active ? 1 : 0, id, executiveId).run();
  else await db.prepare("UPDATE expense_learning_decisions SET active = ? WHERE id = ? AND executive_id = ?").bind(active ? 1 : 0, id, executiveId).run();
}
