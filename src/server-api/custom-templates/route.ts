import { NextResponse } from "next/server";
import { validateCustomTemplate, type ExecutiveTemplates } from "@/lib/executive-profiles";
import { readTemplateWorkspace, writeCustomTemplate, assignCustomTemplate } from "@/lib/custom-template-storage";

function validExecutives(value: unknown): value is Array<{ id: string; name: string }> {
  return Array.isArray(value) && value.length <= 100 && value.every(item => item && typeof item.id === "string" && !!item.id.trim() && item.id.length <= 160 && typeof item.name === "string" && !!item.name.trim() && item.name.length <= 240);
}
function normalizedExecutives(value: Array<{ id: string; name: string }>) {
  return [...new Map(value.map(item => [item.id, { id: item.id, name: item.name.trim() }])).values()];
}
function validTemplateId(value: unknown): value is string { return typeof value === "string" && !!value.trim() && value.length <= 240; }

export async function GET() {
  try { return NextResponse.json(await readTemplateWorkspace(), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Custom template load failed", error); return NextResponse.json({ error: "Saved custom templates could not load. Try again." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  let body: { travelers?: unknown; template?: unknown; templateId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "The template request was not valid." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "The template request was not valid." }, { status: 400 });
  const error = validateCustomTemplate(body.template);
  if (error) return NextResponse.json({ error }, { status: 400 });
  if (!validExecutives(body.travelers) || (body.templateId !== undefined && !validTemplateId(body.templateId))) return NextResponse.json({ error: "Choose valid executives and a template." }, { status: 400 });
  try {
    const saved = await writeCustomTemplate(normalizedExecutives(body.travelers), body.template as ExecutiveTemplates, body.templateId as string | undefined);
    return saved ? NextResponse.json(saved) : NextResponse.json({ error: "This template no longer exists. Reload the template page." }, { status: 404 });
  } catch (error) { console.error("Custom template save failed", error); return NextResponse.json({ error: "Your template could not save. Your edits are still here; try again." }, { status: 503 }); }
}
export async function POST(request: Request) {
  let body: { travelers?: unknown; templateId?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "The assignment request was not valid." }, { status: 400 }); }
  if (!body || !validTemplateId(body.templateId) || !validExecutives(body.travelers)) return NextResponse.json({ error: "Choose a saved template and valid executives." }, { status: 400 });
  try {
    const saved = await assignCustomTemplate(body.templateId, normalizedExecutives(body.travelers));
    return saved ? NextResponse.json(saved) : NextResponse.json({ error: "This template no longer exists. Reload the template page." }, { status: 404 });
  } catch (error) { console.error("Template assignment failed", error); return NextResponse.json({ error: "The assignments could not save. Your selections are still here; try again." }, { status: 503 }); }
}
