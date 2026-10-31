import { NextResponse } from "@/server/next-server";
import { loadExpenseLearning, setExpenseLearningEnabled, setExpenseMemoryActive } from "@/lib/expense-learning-storage";

const validExecutive = (value: unknown): value is string => typeof value === "string" && !!value.trim() && value.length <= 160;
export async function GET(request: Request) {
  const executiveId = new URL(request.url).searchParams.get("executiveId");
  if (!validExecutive(executiveId)) return NextResponse.json({ error: "Choose an executive to view memory." }, { status: 400 });
  try { return NextResponse.json(await loadExpenseLearning(executiveId), { headers: { "Cache-Control": "no-store" } }); }
  catch { return NextResponse.json({ error: "Memory is temporarily unavailable. Document processing still works." }, { status: 503 }); }
}
export async function PATCH(request: Request) {
  let value: { executiveId?: unknown; enabled?: unknown; kind?: unknown; id?: unknown; active?: unknown };
  try { value = await request.json(); } catch { return NextResponse.json({ error: "Choose a memory setting." }, { status: 400 }); }
  if (!validExecutive(value?.executiveId)) return NextResponse.json({ error: "Choose an executive." }, { status: 400 });
  try {
    if (typeof value.enabled === "boolean") await setExpenseLearningEnabled(value.executiveId, value.enabled);
    else if (["preference", "decision"].includes(String(value.kind)) && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 6000 && typeof value.active === "boolean") await setExpenseMemoryActive(value.executiveId, value.kind as "preference" | "decision", value.id, value.active);
    else return NextResponse.json({ error: "Choose a valid memory setting." }, { status: 400 });
    return NextResponse.json(await loadExpenseLearning(value.executiveId), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "The memory setting could not save. Try again." }, { status: 503 }); }
}
