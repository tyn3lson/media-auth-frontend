"use client";
import { useEffect, useState } from "react";
const backend = process.env.NEXT_PUBLIC_BACKEND_URL!;

export default function HealthBadge() {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => {
      try { const r = await fetch(`${backend}/health`, { cache: "no-store" }); setOk(r.ok); }
      catch { setOk(false); }
    };
    check();
    const t = setInterval(check, 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm
      ${ok ? "border-green-500/30 bg-green-500/10 text-green-300"
           : ok===false ? "border-red-500/30 bg-red-500/10 text-red-300"
           : "border-slate-700 bg-slate-800 text-slate-300"}`}>
      <span className={`h-2 w-2 rounded-full ${ok ? "bg-green-400" : ok===false ? "bg-red-400" : "bg-slate-500"}`} />
      API: {ok === null ? "Checking…" : ok ? "Online" : "Offline"}
    </span>
  );
}