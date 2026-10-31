"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Local-only recorder for the staged executive portal.
 * No server upload is attempted here until a verified media-intake endpoint,
 * object ownership checks and private R2 storage are connected.
 */
export default function ExecutiveMediaRecorder({ kind }: { kind: "voice" | "video" }) {
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const objects = useRef<string | null>(null);
  const chunks = useRef<Blob[]>([]);
  const [state, setState] = useState<"idle" | "recording" | "preview" | "error">("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  function release() {
    try { if (recorder.current?.state === "recording") recorder.current.stop(); } catch { /* shutting down */ }
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    recorder.current = null;
    if (objects.current) URL.revokeObjectURL(objects.current);
    objects.current = null;
    setPreview(null);
  }

  useEffect(() => () => {
    try { if (recorder.current?.state === "recording") recorder.current.stop(); } catch { /* ignore */ }
    stream.current?.getTracks().forEach(track => track.stop());
    if (objects.current) URL.revokeObjectURL(objects.current);
  }, []);

  async function start() {
    release(); chunks.current=[];
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("error");setStatus("Camera/microphone recording is unavailable. Choose a recording file instead.");return;
    }
    try {
      const media=await navigator.mediaDevices.getUserMedia(kind==="voice" ? {audio:true} : {audio:true,video:{facingMode:"user"}});
      stream.current=media;
      const candidates=kind==="voice"
        ? ["audio/mp4","audio/webm;codecs=opus","audio/webm"]
        : ["video/mp4","video/webm;codecs=vp8,opus","video/webm"];
      const mime=candidates.find(t=>MediaRecorder.isTypeSupported(t));
      const recording=new MediaRecorder(media,mime?{mimeType:mime}:undefined);
      recorder.current=recording;
      recording.ondataavailable=e=>{if(e.data.size>0)chunks.current.push(e.data)};
      recording.onstop=()=>{
        media.getTracks().forEach(t=>t.stop());stream.current=null;
        if (!chunks.current.length) {setState("error");setStatus("Nothing was recorded.");return;}
        const blob=new Blob(chunks.current,{type:recording.mimeType});
        const url=URL.createObjectURL(blob);objects.current=url;setPreview(url);
        setState("preview");setStatus("Recording saved only in this browser. It has NOT been uploaded.");
      };
      recording.onerror=()=>{setState("error");setStatus("Recording failed. Please retry.")};
      recording.start();setState("recording");setStatus("Recording. Tap Stop to preview.");
    } catch {
      stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;
      setState("error");setStatus("Permission declined or hardware unavailable. Choose a recording file instead.");
    }
  }
  function stop(){if(recorder.current?.state==="recording") recorder.current.stop()}
  function choose(file:File|null){release();if(!file)return;
    if(!file.type.startsWith(kind==="voice"?"audio/":"video/")) {setState("error");setStatus("Choose the correct recording type.");return;}
    // This type check is UX-only. A future upload route MUST validate byte signatures and size.
    const url=URL.createObjectURL(file);objects.current=url;setPreview(url);
    setState("preview");setStatus("Selected locally. NOT uploaded or sent.");
  }
  return <section className="execqueue-note" aria-label={`${kind} reply`}>
    <strong>Send {kind} reply</strong>
    <p>Preview or retake before sending. Live encrypted upload is not connected in this stage.</p>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>
      <button type="button" className="execqueue-secondary" onClick={()=>void start()} disabled={state==="recording"}>Record {kind}</button>
      <button type="button" className="execqueue-secondary" onClick={stop} disabled={state!=="recording"}>Stop</button>
      <button type="button" className="execqueue-secondary" onClick={()=>{release();setState("idle");setStatus("Recording discarded.")}}>Retake / discard</button>
    </div>
    <label className="execqueue-label">Or choose an existing recording
      <input type="file" accept={kind==="voice"?"audio/*":"video/*"} className="execqueue-select" onChange={e=>choose(e.target.files?.[0]??null)}/>
    </label>
    {preview && (kind==="voice" ? <audio src={preview} controls style={{width:"100%"}} />
                                  : <video src={preview} controls playsInline style={{maxWidth:"100%",maxHeight:260}} />)}
    <p aria-live="polite" role="status">{status}</p>
  </section>;
}
