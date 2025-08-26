'use client';
import React, { useEffect, useRef, useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || '').replace(/\/+$/, '');

export default function Embed() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [sha, setSha] = useState('');

  // auto-resize for Squarespace iframe
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const post = () => {
      const h = ref.current?.offsetHeight ?? document.body.scrollHeight;
      window.parent?.postMessage({ type: 'DECLASSIFAI_EMBED_HEIGHT', height: h }, '*');
    };
    post();
    const ro = new ResizeObserver(post);
    if (ref.current) ro.observe(ref.current);
    const id = setInterval(post, 1000);
    return () => { ro.disconnect(); clearInterval(id); };
  }, []);

  async function onUpload() {
    if (!file) return;
    setBusy(true); setNote(''); setSha('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form });
      const data = await res.json().catch(()=> ({}));
      if (!res.ok) throw new Error(data?.detail || data?.message || 'Upload failed');
      setSha(data.sha256 || '');
      setNote('Uploaded. We’ll finish things in the background.');
    } catch (e: any) {
      setNote(e?.message || 'Something went wrong.');
    } finally { setBusy(false); }
  }

  return (
    <div ref={ref} style={{ padding: 16, background: 'transparent', color: '#fff', fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <h2 style={{ margin: 0, marginBottom: 8, fontSize: 20 }}>Upload</h2>
        <p style={{ marginTop: 0, opacity: .85 }}>Save a secure record of your file. You can view the details anytime.</p>

        <div style={{ display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap', marginTop: 8 }}>
          <input type="file" onChange={(e)=> setFile(e.target.files?.[0] ?? null)} />
          <button
            onClick={onUpload}
            disabled={!file || busy || !API_BASE}
            style={{ padding: '8px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,.25)', background: 'transparent', color: '#fff' }}
          >
            {busy ? 'Uploading…' : 'Upload'}
          </button>
          {sha && (
            <a
              href={`/metadata/${sha}`} // this uses your existing details UI route
              target="_blank" rel="noreferrer"
              style={{ padding: '8px 16px', borderRadius: 9999, border: '1px solid rgba(255,255,255,.25)', textDecoration: 'none', color:'#fff' }}
            >
              View details
            </a>
          )}
        </div>

        {note && <div style={{ marginTop: 10, fontSize: 14, opacity: .9 }}>{note}</div>}

        {sha && (
          <div style={{ marginTop: 10, fontSize: 12, opacity: .8 }}>
            File ID: <span style={{ wordBreak:'break-all' }}>{sha}</span>
          </div>
        )}
      </div>

      <style jsx global>{`
        body { background: transparent !important; }
        a { color: inherit; }
      `}</style>
    </div>
  );
}