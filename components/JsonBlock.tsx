"use client";
import { useState } from "react";

export default function JsonBlock({ data }: { data: any }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mt-3">
      <button onClick={() => setOpen(!open)} className="text-sm underline underline-offset-2">
        {open ? "Hide details" : "View details"}
      </button>
      {open && (
        <pre className="mt-2 overflow-auto rounded-lg bg-slate-950 p-3 text-xs leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}