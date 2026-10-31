import { env } from "cloudflare:workers";
import { defaultTemplates, executiveTemplateTerminology, type Executive, type ExecutiveTemplates, type SavedCustomTemplate } from "./executive-profiles";

function templateDatabase() {
  const db = env.DB;
  if (!db) throw new Error("Custom template storage is unavailable.");
  return db;
}
function templateKey(template: ExecutiveTemplates) {
  const { updatedAt: _updatedAt, templateId: _templateId, ...content } = { ...defaultTemplates, ...template };
  return JSON.stringify(Object.fromEntries(Object.entries(content).sort(([a], [b]) => a.localeCompare(b))));
}
// Existing executive templates stay available before they are copied into the library.
// The next save copies them and their assignments atomically, without losing history.
export async function readTemplateWorkspace() {
  const db = templateDatabase();
  const [assigned, saved] = await Promise.all([
    db.prepare("SELECT traveler_id, traveler_name, template_json FROM custom_templates ORDER BY traveler_id").all<{ traveler_id: string; traveler_name: string; template_json: string }>(),
    db.prepare("SELECT id, template_json, updated_at FROM template_library ORDER BY updated_at DESC, id").all<{ id: string; template_json: string; updated_at: string }>(),
  ]);
  const library: SavedCustomTemplate[] = saved.results.map(row => ({ id: row.id, template: executiveTemplateTerminology({ ...JSON.parse(row.template_json), templateId: row.id }), updatedAt: row.updated_at }));
  const templates: Executive[] = assigned.results.map(row => {
    let template = executiveTemplateTerminology(JSON.parse(row.template_json) as ExecutiveTemplates);
    if (template.customName && !template.templateId) {
      let existing = library.find(value => templateKey(value.template) === templateKey(template));
      if (!existing) {
        const id = `legacy-${row.traveler_id}`;
        existing = { id, template: { ...template, templateId: id }, updatedAt: template.updatedAt ?? "" };
        library.push(existing);
      }
      template = { ...template, templateId: existing.id };
    }
    return { id: row.traveler_id, name: row.traveler_name, templates: template };
  });
  return { templates, library };
}

async function persistTemplateWorkspace(templateId: string, template: ExecutiveTemplates, executives: Array<{ id: string; name: string }>, snapshot: Awaited<ReturnType<typeof readTemplateWorkspace>>) {
  const db = templateDatabase();
  const updatedAt = new Date().toISOString();
  const saved = { ...executiveTemplateTerminology(template), customName: template.customName!.trim(), templateId, updatedAt };
  const targets = new Set(executives.map(value => value.id));
  const assignments = snapshot.templates.map(executive => executive.templates.templateId === templateId && !targets.has(executive.id) ? { ...executive, templates: { ...defaultTemplates, updatedAt } } : executive);
  for (const executive of executives) {
    const index = assignments.findIndex(value => value.id === executive.id);
    const value = { ...executive, templates: saved };
    if (index >= 0) assignments[index] = value; else assignments.push(value);
  }
  const library = [...snapshot.library.filter(value => value.id !== templateId), { id: templateId, template: saved, updatedAt }].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await db.batch([
    ...snapshot.library.map(value => db.prepare("INSERT INTO template_library (id, template_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO NOTHING").bind(value.id, JSON.stringify(value.template), value.updatedAt)),
    db.prepare("INSERT INTO template_library (id, template_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET template_json = excluded.template_json, updated_at = excluded.updated_at").bind(templateId, JSON.stringify(saved), updatedAt),
    ...assignments.map(executive => db.prepare("INSERT INTO custom_templates (traveler_id, traveler_name, template_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(traveler_id) DO UPDATE SET traveler_name = excluded.traveler_name, template_json = excluded.template_json, updated_at = excluded.updated_at").bind(executive.id, executive.name, JSON.stringify(executive.templates), executive.templates.updatedAt ?? updatedAt)),
  ]);
  return { template: saved, templates: assignments, library };
}

export async function writeCustomTemplate(executives: Array<{ id: string; name: string }>, template: ExecutiveTemplates, requestedId?: string) {
  const snapshot = await readTemplateWorkspace();
  const id = requestedId ?? crypto.randomUUID();
  if (requestedId && !snapshot.library.some(value => value.id === requestedId)) return null;
  return persistTemplateWorkspace(id, template, executives, snapshot);
}
export async function assignCustomTemplate(templateId: string, executives: Array<{ id: string; name: string }>) {
  const snapshot = await readTemplateWorkspace();
  const saved = snapshot.library.find(value => value.id === templateId);
  return saved ? persistTemplateWorkspace(templateId, saved.template, executives, snapshot) : null;
}
