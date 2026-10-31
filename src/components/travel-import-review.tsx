
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TravelTripMatch } from "@/lib/travel-trip-matching";

export type TravelImportDecision = {tripId: number} | {name: string} | null;
export type TravelImportReviewRequest = {filename: string; executiveName: string; suggestedName: string; dates: string; route: string; detailsError?: string; trips: Array<{id: number; name: string; dates: string; route: string}>; matches: TravelTripMatch[]};
export function TravelImportReview({request, onDecide}: {request: TravelImportReviewRequest; onDecide: (choice: TravelImportDecision) => void}) {
  const [choice, setChoice] = useState(request.matches.length ? String(request.matches[0].tripId) : "new");
  const [name, setName] = useState(request.suggestedName);
  const selected = request.trips.find(trip => String(trip.id) === choice);
  const match = request.matches.find(value => String(value.tripId) === choice);
  const ordered = [...request.trips].sort((a,b) => (request.matches.findIndex(value => value.tripId === a.id) + 1 || 10000) - (request.matches.findIndex(value => value.tripId === b.id) + 1 || 10000));
  return <Dialog open onOpenChange={open => {if (!open) onDecide(null);}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>{request.matches.length ? "Is this the correct trip?" : "Create a trip for this document?"}</DialogTitle><DialogDescription>{request.matches.length ? "A possible trip match was found. Confirm before the document is added." : "No matching trip was found. Create one to continue, or choose an existing trip manually."}</DialogDescription></DialogHeader>
    <div className="space-y-4"><div className="rounded-md bg-slate-50 p-3 text-sm"><p className="break-words font-medium">{request.filename}</p><p className="mt-1 text-slate-600">{request.executiveName} · {request.dates}</p><p className="mt-1 break-words text-slate-600">{request.route}</p></div>
      {request.detailsError && <p className="text-sm text-amber-800">{request.detailsError} The document will need details reviewed after you choose a trip.</p>}
      <div className="grid gap-2"><Label htmlFor="confirmation-trip-choice">Trip</Label><select id="confirmation-trip-choice" className="simple-select w-full" value={choice} onChange={event => setChoice(event.target.value)}>{ordered.map(trip => <option key={trip.id} value={trip.id}>{request.matches.some(value => value.tripId === trip.id) ? "Suggested: " : ""}{trip.name} · {trip.dates}</option>)}<option value="new">Create a new trip</option></select></div>
      {selected && <div className="space-y-1 text-sm"><p className="font-medium">{selected.name}</p><p className="text-slate-600">{selected.dates} · {selected.route}</p><p className={match ? "text-emerald-800" : "text-amber-800"}>{match?.reason ?? "This trip was not suggested. Check its dates and destination before confirming."}</p></div>}
      {choice === "new" && <div className="grid gap-2"><Label htmlFor="confirmation-new-trip">Trip name</Label><Input id="confirmation-new-trip" maxLength={240} value={name} onChange={event => setName(event.target.value)} /></div>}
    </div><DialogFooter><Button type="button" variant="outline" onClick={() => onDecide(null)}>Skip document</Button><Button type="button" disabled={choice === "new" ? !name.trim() : !selected} onClick={() => onDecide(choice === "new" ? {name: name.trim()} : {tripId: selected!.id})}>{choice === "new" ? "Create trip and import" : "Yes, add to this trip"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
