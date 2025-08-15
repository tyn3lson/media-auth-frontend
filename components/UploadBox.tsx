"use client";
import { useRef, useState } from "react";
import Card from "./Card";
import JsonBlock from "./JsonBlock";
const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function UploadBox() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const drop = useRef<HTMLDivElement | null>(null);

  const pick = (f?: File) => { setFile(f ?? null); setResult(null); };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); drop.current?.classList.remove("ring-2"); };

  const upload = async () => {
    if (!file) return;
    setBusy(true); setResult(null);
    const form = new FormData(); form.append("file", file);
    try { const r = await fetch(`${backend}/upload`, { method: "POST", body: form }); setResult(await r.json()); }
    catch (e:any) { setResult({ error: String(e) }); }
    finally { setBusy(false); }
  };

  return (
    <Card title="Register / Upload">
      <div
        ref={drop}
        onDragOver={(e)=>{e.preventDefault(); drop.current?.classList.add("ring-2","ring-blue-400");}}
        onDragLeave={()=>drop.current?.classList.remove("ring-2","ring-blue-400")}
        onDrop={onDrop}
        className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center"
      >
        <p className="text-sm text-slate-300">Drag & drop a file here, or</p>
        <label className="mt-2 inline-block cursor-pointer rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500">
          Choose File
          <input type="file" className="hidden" onChange={(e)=>pick(e.target.files?.[0] ?? undefined)} />
        </label>
        {file && <p className="mt-2 text-xs text-slate-400">{file.name}</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={upload} disabled={!file || busy}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-500 disabled:opacity-60">
          {busy ? "Uploading…" : "Upload"}
        </button>
        <button onClick={()=>{setFile(null); setResult(null);}}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm">
          Reset
        </button>
      </div>

      {result && (<><h3 className="mt-4 text-sm font-semibold">Response</h3><JsonBlock data={result} /></>)}
    </Card>
  );
}