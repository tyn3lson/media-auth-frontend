"use client";
import { useState } from "react";
import Card from "./Card";
import JsonBlock from "./JsonBlock";
const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function VerifyBox() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  const verify = async () => {
    if (!file) return;
    setBusy(true); setResult(null);
    const form = new FormData(); form.append("file", file);
    try { const r = await fetch(`${backend}/verify`, { method: "POST", body: form }); setResult(await r.json()); }
    catch (e:any) { setResult({ error: String(e) }); }
    finally { setBusy(false); }
  };

  return (
    <Card title="Verify">
      <input
        type="file"
        onChange={(e)=>{ setFile(e.target.files?.[0] ?? null); setResult(null); }}
        className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:text-slate-100 hover:file:bg-slate-700"
      />
      <div className="mt-4 flex gap-2">
        <button onClick={verify} disabled={!file || busy}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60">
          {busy ? "Verifying…" : "Verify File"}
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