"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BillingCodeImport } from "@/components/billing-code-import";
import type { BillingCode } from "@/lib/billing-codes";

export function DetectedBillingUpload({ file, executives, onClose }: { file: File; executives: Array<{ id: string; name: string }>; onClose: () => void }) {
  const [codes, setCodes] = useState<BillingCode[]>([]), [loaded, setLoaded] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false), [notice, setNotice] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => { let active = true; setError(""); fetch("/api/billing-codes", { cache: "no-store" }).then(async response => { const result = await response.json() as { codes?: BillingCode[]; error?: string }; if (!response.ok || !Array.isArray(result.codes)) throw Error(result.error || "Billing codes could not load."); if (active) { setCodes(result.codes); setLoaded(true); } }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : "Billing codes could not load."); }); return () => { active = false; }; }, [reload]);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent showCloseButton={!busy} className="max-h-[90vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Billing-code list recognized</DialogTitle><DialogDescription>Review the codes before importing them.</DialogDescription></DialogHeader>{error && <div role="alert"><p>{error}</p><Button variant="outline" onClick={() => setReload(value => value + 1)}>Retry loading codes</Button></div>}{!loaded && !error && <p role="status">Loading billing codes…</p>}{loaded && <BillingCodeImport initialFile={file} codes={codes} executives={executives} disabled={false} onBusyChange={setBusy} onImported={(saved, message) => { setCodes(saved); setNotice(message); }} />}{notice && <p role="status">{notice}</p>}<Button type="button" variant="outline" disabled={busy} onClick={onClose}>Close</Button></DialogContent></Dialog>;
}
