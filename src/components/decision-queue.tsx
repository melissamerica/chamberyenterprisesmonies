import { useCallback, useEffect, useState } from "react";
import { EAQueueComposer, ExecutiveQueuePlayer, type CommunicationBatch, type SavedItemResponse } from "@/features/communication-queue";

type Props = { executive: { id: string; name: string }; onBack: () => void };

async function call<T>(init: { method: "GET"; executiveId: string } | { method: "POST"; body: unknown }): Promise<T> {
  const res = init.method === "GET"
    ? await fetch(`/api/decision-queue?executive=${encodeURIComponent(init.executiveId)}`, { cache: "no-store" })
    : await fetch("/api/decision-queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(init.body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Something went wrong. Try again.");
  return data as T;
}

const blank = (executiveId: string): CommunicationBatch => ({ id: crypto.randomUUID(), executiveId, title: "", items: [], status: "draft" });

export function DecisionQueue({ executive, onBack }: Props) {
  const [batches, setBatches] = useState<CommunicationBatch[]>([]);
  const [responses, setResponses] = useState<SavedItemResponse[]>([]);
  const [current, setCurrent] = useState<CommunicationBatch | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York";
  const ctx = { id: executive.id, displayName: executive.name, timeZone };

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await call<{ batches: CommunicationBatch[]; responses: SavedItemResponse[] }>({ method: "GET", executiveId: executive.id });
      setBatches(data.batches); setResponses(data.responses);
      setCurrent(c => (c && data.batches.find(b => b.id === c.id)) || data.batches[0] || blank(executive.id));
    } catch (e) { setError((e as Error).message); setCurrent(c => c ?? blank(executive.id)); }
    finally { setLoading(false); }
  }, [executive.id]);
  useEffect(() => { setCurrent(null); setPreviewing(false); void load(); }, [load]);

  const upsert = (b: CommunicationBatch) => { setBatches(list => [b, ...list.filter(x => x.id !== b.id)]); setCurrent(b); return b; };
  const batchResponses = current ? responses.filter(r => r.batchId === current.id) : [];

  if (previewing && current) return <div className="decision-preview">
    <p className="mb-3 text-sm text-muted-foreground">Preview — this is exactly what {executive.name} sees. Answers you record here are saved.</p>
    <ExecutiveQueuePlayer executive={ctx} batch={current} authorizedContacts={[]} existingResponses={batchResponses}
      onRespond={async r => { const saved = await call<SavedItemResponse>({ method: "POST", body: { op: "respond", ...r } }); setResponses(list => [...list, saved]); return saved; }}
      onClose={() => setPreviewing(false)} />
  </div>;

  return <section aria-labelledby="dq-title">
    <button type="button" className="mb-6 text-sm font-medium text-primary underline underline-offset-4" onClick={onBack}>Home</button>
    <h1 id="dq-title" className="font-serif text-3xl">Decision Queue · {executive.name}</h1>
    <p className="mt-1 mb-6 text-sm text-muted-foreground">Batch questions for {executive.name.split(" ")[0]}. Nothing is sent — delivery is recorded only while live sends are off.</p>
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {batches.map(b => <button key={b.id} type="button" onClick={() => setCurrent(b)} aria-pressed={current?.id === b.id}
        className={`rounded-full border px-3 py-1 text-sm ${current?.id === b.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{b.title || "Untitled"} · {b.status}</button>)}
      <button type="button" className="rounded-full border border-dashed border-border px-3 py-1 text-sm" onClick={() => setCurrent(blank(executive.id))}>+ New queue</button>
      {current && (current.status === "delivered" || current.status === "completed") && <button type="button" className="ml-auto rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground" onClick={() => setPreviewing(true)}>Preview as {executive.name.split(" ")[0]}</button>}
    </div>
    {error && <p role="alert" className="mb-4 text-sm text-destructive">{error} <button className="underline" onClick={() => void load()}>Retry</button></p>}
    {loading && !current ? <p className="text-sm text-muted-foreground">Loading…</p> : current &&
      <EAQueueComposer key={current.id + current.status} executive={ctx} draft={current} upcomingFlights={[]} existingResponses={batchResponses}
        onSaveDraft={async b => upsert(await call<CommunicationBatch>({ method: "POST", body: { op: "save", batch: b } }))}
        onSchedule={async (batchId, intent) => upsert(await call<CommunicationBatch>({ method: "POST", body: { op: "schedule", batchId, intent } }))} />}
  </section>;
}
