"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { executiveForTrip, type Executive } from "@/lib/executive-profiles";
import { attachmentContentTypes } from "@/lib/itinerary-attachments";
import type { UploadTrip } from "@/lib/workspace-uploads";

export function AttachmentUploadReview({ file, warning, executives, trips, onSaved, onSkip }: { file: File; warning?: string; executives: Executive[]; trips: UploadTrip[]; onSaved: (trip: UploadTrip) => void; onSkip: () => void }) {
  const [executiveId, setExecutiveId] = useState("");
  const [tripId, setTripId] = useState("");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false), latestTrips = useRef(trips); latestTrips.current = trips;
  const available = trips.filter(trip => executiveForTrip(trip, executives)?.id === executiveId);
  async function save() {
    if (lock.current) return;
    const trip = latestTrips.current.find(trip => String(trip.id) === tripId && executiveForTrip(trip, executives)?.id === executiveId);
    if (!trip) { setError("Select the executive and one of their trips."); return; }
    if (!attachmentContentTypes[file.name.split(".").at(-1)?.toLowerCase() ?? ""]) { setError("Save this file as PDF, an image, Word, Excel, PowerPoint, CSV, or text, then upload it again."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      // Existing locally created trips must be saved before linking a durable attachment.
      const response = await fetch("/api/uploads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trips: [{ ...trip, executiveId }] }) });
      const result = await response.json() as { saved?: boolean; error?: string };
      if (!response.ok || !result.saved) throw Error(result.error || "The trip could not save. Try again.");
      const form = new FormData(); form.set("file", file); form.set("executiveId", executiveId); form.set("tripId", tripId); form.set("entryId", "0");
      const saved = await fetch("/api/itinerary-attachments", { method: "POST", body: form });
      const data = await saved.json() as { trip?: UploadTrip; error?: string };
      if (!saved.ok || !data.trip) throw Error(data.error || "The attachment could not save. Your file is still selected; try again.");
      onSaved(data.trip);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The attachment could not save."); }
    finally { lock.current = false; setBusy(false); }
  }
  return <Dialog open onOpenChange={open => { if (!open && !lock.current) onSkip(); }}><DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>Add to itinerary attachments</DialogTitle><DialogDescription>This appears to be supporting material for an itinerary. Select the executive and trip for this file.</DialogDescription></DialogHeader>
    <p className="break-all text-sm font-medium">{file.name}</p>{warning && <p className="text-sm text-amber-800">{warning}</p>}
    <fieldset disabled={busy} className="space-y-4"><div className="grid gap-2"><Label htmlFor="upload-attachment-executive">Executive</Label><select id="upload-attachment-executive" className="simple-select w-full" value={executiveId} onChange={event => { setExecutiveId(event.target.value); setTripId(""); setError(""); }}><option value="">Select executive…</option>{executives.map(executive => <option key={executive.id} value={executive.id}>{executive.name}</option>)}</select></div>
    <div className="grid gap-2"><Label htmlFor="upload-attachment-trip">Trip</Label><select id="upload-attachment-trip" className="simple-select w-full" disabled={!executiveId} value={tripId} onChange={event => setTripId(event.target.value)}><option value="">Select trip…</option>{available.map(trip => <option key={trip.id} value={trip.id}>{trip.name} · {trip.dates}</option>)}</select>{executiveId && !available.length && <p className="text-sm text-slate-600">This executive has no trips. Create a trip first, then upload the file.</p>}</div></fieldset>
    <p className="text-sm text-slate-600">Saved under Travel itinerary → Attachments. You can link it to a calendar entry there.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onSkip}>Skip file</Button><Button type="button" disabled={busy || !tripId} onClick={() => void save()}>{busy ? "Saving…" : "Save itinerary attachment"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
