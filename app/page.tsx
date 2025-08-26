'use client';

import React, { useRef, useState, useEffect } from 'react';

/** .env.local → NEXT_PUBLIC_API_BASE=https://declassifai-backend1.onrender.com */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

const PILL_WIDTH_DESKTOP = 680;
const PILL_WIDTH = `clamp(480px, 56vw, ${PILL_WIDTH_DESKTOP}px)`;

/* ---------- SHA-256 helper (hex) ---------- */
async function sha256Hex(ab: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', ab);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Friendly format helpers ---------- */
function formatBytes(n?: number) {
  if (typeof n !== 'number') return '';
  const u = ['B','KB','MB','GB','TB']; let i = 0; let v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i>0 ? 1 : 0)} ${u[i]}`;
}
function formatDate(iso?: string) {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(); } catch { return iso; }
}

/* ================= Page ================= */

export default function Page() {
  const [lastRecordedHash, setLastRecordedHash] = useState<string>('');

  // ===== Embed mode detection + auto-resize (for Squarespace iframe) =====
  const [isEmbed, setIsEmbed] = useState(false);
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      setIsEmbed(p.get('embed') === '1');
    } catch {}
    const post = () => {
      const h = document.body.scrollHeight;
      window.parent?.postMessage({ type: 'DECLASSIFAI_EMBED_HEIGHT', height: h }, '*');
    };
    post();
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    const id = setInterval(post, 1000);
    return () => { ro.disconnect(); clearInterval(id); };
  }, []);
  // ======================================================================

  return (
    <main className={`page-shimmer min-h-screen relative overflow-hidden ${isEmbed ? 'text-[#111]' : 'text-white'}`}>
      {!isEmbed && <Header />}

      <section
        className="mx-auto px-4 sm:px-6 pb-20 space-y-10 relative z-10"
        style={{ maxWidth: PILL_WIDTH_DESKTOP + 80 }}
      >
        <UploadPill onRecorded={(h) => setLastRecordedHash(h)} />
        <VerifyPill lastRecordedHash={lastRecordedHash} />
      </section>

      {!isEmbed && <Footer />}
      <GlobalStyles embed={isEmbed} />
    </main>
  );
}

function Header() {
  return (
    <section className="mx-auto text-center pt-10 pb-8 relative z-10" style={{ maxWidth: PILL_WIDTH_DESKTOP + 80 }}>
      <img
        src="/logo.png"
        alt="DeclassifAI"
        className="mx-auto h-28 w-auto rounded-lg shadow-[0_0_80px_rgba(73,242,255,.45)]"
      />
      <p className="mt-5 text-white/90">Your proof, safe and sound — check it anytime.</p>
    </section>
  );
}

function Footer() {
  return (
    <footer
      className="mx-auto text-center pb-10 text-xs text-white/60 relative z-10"
      style={{ maxWidth: PILL_WIDTH_DESKTOP + 80 }}
    >
      © {new Date().getFullYear()} DeclassifAI · All rights reserved
    </footer>
  );
}

/* ================= Result Banner ================= */

function ResultBanner({ kind, text }: { kind: 'ok' | 'error'; text: string }) {
  const isOk = kind === 'ok';
  return (
    <div role="status" className={`result-banner ${isOk ? 'ok' : 'err'}`} aria-live="polite">
      <span className="result-icon" aria-hidden="true">{isOk ? '✅' : '❌'}</span>
      <span className="result-text">{text}</span>
    </div>
  );
}

/* ================= Upload Pill + Details Modal ================= */

function UploadPill({ onRecorded }: { onRecorded: (hash: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'' | 'ok' | 'error'>('');
  const [msg, setMsg] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // track the latest upload (to power the Details button/modal)
  const [lastSha, setLastSha] = useState<string>('');
  const [lastRecordId, setLastRecordId] = useState<string>('');
  const [showDetails, setShowDetails] = useState(false);

  const openPicker = () => inputRef.current?.click();
  const prevent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  async function recordFile() {
    if (!file) return;
    setBusy(true); setMsg(''); setStatus('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd });
      const data = await r.json().catch(()=> ({}));
      if (!r.ok) throw new Error(data?.detail || data?.message || `HTTP ${r.status}`);
      const h: string = data?.sha256 || data?.hash || data?.digest || '';
      if (h) { onRecorded(h); setLastSha(h); }
      if (data?.record_id) setLastRecordId(data.record_id);
      setStatus('ok');
      setMsg('Uploaded. We’ll finish things in the background.');
    } catch(e:any) {
      setStatus('error');
      setMsg(`Couldn't upload — ${e?.message || 'try again.'}`);
    } finally { setBusy(false); }
  }

  return (
    <>
      <PillShell
        color="cyan"
        variant="upload"
        title="Lock It In"
        subtitle="Save a permanent fingerprint of your file."
        onClick={openPicker}
        dragHandlers={{
          onDragOver: prevent,
          onDragEnter: prevent,
          onDragLeave: prevent,
          onDrop:      (e)=>{ prevent(e); const f=e.dataTransfer.files?.[0]; if (f) setFile(f); }
        }}
      >
        <div className="flex flex-col gap-3 items-center w-full">
          <button className="inner-strip h-[40px]" onClick={(e)=>{ e.stopPropagation(); openPicker(); }} type="button">
            {file ? file.name : 'Drag & drop or click to choose'}
          </button>

          <div className="flex gap-2">
            <button
              className="cta cta-cyan brand-btn h-[40px]"
              onClick={(e)=>{ e.stopPropagation(); recordFile(); }}
              disabled={!file || busy}
            >
              {busy ? 'Uploading…' : 'Upload'}
            </button>

            {lastSha && (
              <button
                className="cta h-[40px] border border-white/20 hover:border-white/40 rounded-full px-5 text-sm"
                onClick={(e)=>{ e.stopPropagation(); setShowDetails(true); }}
              >
                Details
              </button>
            )}
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e)=> setFile(e.target.files?.[0] ?? null)}
        />
      </PillShell>

      {status && <div className="mt-2"><ResultBanner kind={status} text={msg} /></div>}

      {showDetails && lastSha && (
        <MetadataModal
          sha256={lastSha}
          recordId={lastRecordId}
          onClose={()=> setShowDetails(false)}
        />
      )}
    </>
  );
}

/* ================= Verify Pill ================= */

function VerifyPill({ lastRecordedHash }: { lastRecordedHash: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'' | 'ok' | 'error'>('');
  const [msg, setMsg] = useState('');
  const [computedHash, setComputedHash] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => inputRef.current?.click();
  const prevent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  async function setFileAndCompute(f: File | null) {
    setFile(f);
    setStatus(''); setMsg('');
    if (f) {
      const ab = await f.arrayBuffer();
      const h = await sha256Hex(ab);
      setComputedHash(h);
    } else {
      setComputedHash('');
    }
  }

  async function verifyFile() {
    if (!file) return;
    setBusy(true); setStatus(''); setMsg('');
    try {
      // Prefer hash-only endpoint first
      if (computedHash) {
        const r1 = await fetch(`${API_BASE}/verify-hash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash: computedHash }),
        });
        const d1 = await r1.json().catch(()=> ({}));
        if (r1.ok && typeof d1?.found === 'boolean') {
          if (d1.found) { setStatus('ok'); setMsg('Match found.'); }
          else { setStatus('error'); setMsg('No record found for this file.'); }
          return;
        }
      }
      // Fallback: POST the file
      const fd = new FormData();
      fd.append('file', file);
      const r2 = await fetch(`${API_BASE}/verify`, { method: 'POST', body: fd });
      const d2 = await r2.json().catch(()=> ({}));
      if (!r2.ok) throw new Error(d2?.detail || d2?.message || `HTTP ${r2.status}`);
      if (d2?.found) { setStatus('ok'); setMsg('Match found.'); }
      else { setStatus('error'); setMsg('No record found for this file.'); }
    } catch(e:any) {
      setStatus('error');
      setMsg(`Couldn't verify — ${e?.message || 'try again.'}`);
    } finally { setBusy(false); }
  }

  const short = (h: string) => h ? `${h.slice(0,10)}…${h.slice(-6)}` : '—';

  return (
    <>
      <PillShell
        color="green"
        variant="verify"
        title="Check the Truth"
        subtitle="See if this file is already saved."
        onClick={openPicker}
        dragHandlers={{
          onDragOver: prevent,
          onDragEnter: prevent,
          onDragLeave: prevent,
          onDrop:      async (e)=>{ prevent(e); const f=e.dataTransfer.files?.[0] ?? null; await setFileAndCompute(f); }
        }}
      >
        <div className="flex flex-col gap-3 items-center w-full">
          <button className="inner-strip h-[40px]" onClick={(e)=>{ e.stopPropagation(); openPicker(); }} type="button">
            {file ? file.name : 'Drag & drop or click to choose'}
          </button>

          <button
            className="cta cta-green brand-btn h-[40px]"
            onClick={(e)=>{ e.stopPropagation(); verifyFile(); }}
            disabled={!file || busy}
          >
            {busy ? 'Checking…' : 'Verify'}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={async (e)=> await setFileAndCompute(e.target.files?.[0] ?? null)}
        />
      </PillShell>

      {status && <div className="mt-1"><ResultBanner kind={status} text={msg} /></div>}

      <div className="verify-helper">
        <div>File ID (this file): <span className="mono">{short(computedHash)}</span></div>
        <div>Most recent file ID: <span className="mono">{short(lastRecordedHash)}</span></div>
      </div>
    </>
  );
}

/* ================= Friendly Metadata Modal ================= */

function StatusBadge({ state }: { state?: string }) {
  const label = state === 'anchored' ? 'Verified on chain'
               : state === 'processing' ? 'Processing'
               : state === 'queued' ? 'Queued'
               : 'Pending';
  return (
    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs border border-white/15 bg-white/5">
      {label}
    </span>
  );
}

type Rec = {
  id: string;
  sha256: string;
  original_filename: string;
  stored_filename: string;
  size_bytes: number;
  content_type: string;
  uploaded_at: string;
  image_width?: number;
  image_height?: number;
  anchored?: { state?: string; tx_hash?: string; explorer_url?: string; updated_at?: string };
};

function MetadataModal({ sha256, recordId, onClose }: { sha256: string; recordId?: string; onClose: ()=>void }) {
  const [rec, setRec] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/files/by-hash/${sha256}`, { cache: 'no-store' });
        if (res.ok && alive) setRec(await res.json());
      } finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [sha256]);

  useEffect(() => {
    if (!recordId) return;
    let timer: any;
    let count = 0;
    const tick = async () => {
      count++;
      try {
        const r = await fetch(`${API_BASE}/job/${recordId}`);
        const j = await r.json();
        if (j?.anchored?.state === 'anchored') {
          const res = await fetch(`${API_BASE}/files/by-hash/${sha256}`, { cache: 'no-store' });
          if (res.ok) setRec(await res.json());
          return;
        }
      } catch {}
      if (count < 40) timer = setTimeout(tick, 3000);
    };
    timer = setTimeout(tick, 3000);
    return () => clearTimeout(timer);
  }, [recordId, sha256]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-black/70 backdrop-blur p-5 text-white z-10">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">File details</h3>
          <StatusBadge state={rec?.anchored?.state} />
        </div>

        {loading ? (
          <div className="mt-4 text-white/80">Loading…</div>
        ) : !rec ? (
          <div className="mt-4 text-red-400">Couldn’t load details.</div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="opacity-70">File name:</span> {rec.original_filename}</div>
              <div><span className="opacity-70">Size:</span> {formatBytes(rec.size_bytes)}</div>
              <div><span className="opacity-70">Type:</span> {rec.content_type}</div>
              <div><span className="opacity-70">Added:</span> {formatDate(rec.uploaded_at)}</div>
              {rec.image_width && rec.image_height && (
                <div className="sm:col-span-2"><span className="opacity-70">Dimensions:</span> {rec.image_width} × {rec.image_height}</div>
              )}
              <div className="sm:col-span-2">
                <span className="opacity-70">File ID:</span>{' '}
                <span className="break-all">{rec.sha256}</span>
              </div>
            </div>

            {rec.anchored?.explorer_url && (
              <a
                className="mt-4 inline-flex rounded-full px-4 py-2 border border-white/20 hover:border-white/40 text-sm"
                href={rec.anchored.explorer_url} target="_blank" rel="noreferrer"
              >
                View public proof
              </a>
            )}
          </>
        )}

        <div className="mt-5 flex justify-end">
          <button
            className="rounded-full px-4 py-2 border border-white/20 hover:border-white/40 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= Shared pill shell ================= */

function PillShell({
  children, color, variant, title, subtitle, onClick, dragHandlers
}: {
  children: React.ReactNode;
  color: 'cyan'|'green';
  variant: 'upload'|'verify';
  title: string;
  subtitle: string;
  onClick: () => void;
  dragHandlers?: {
    onDragOver: (e: React.DragEvent) => void;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}) {
  const gradient = color==='cyan'
    ? 'linear-gradient(180deg, #49f2ff 0%, #14c9ec 45%, #0b8dbf 75%, #0a6e9e 100%)'
    : 'linear-gradient(180deg, #63f59f 0%, #2fd876 48%, #15934a 76%, #0f6e55 100%)';
  const glow = color==='cyan'
    ? 'rgba(73,242,255,.30)'
    : 'rgba(46,224,122,.30)';

  return (
    <div className="pill-wrap" onClick={onClick} role="button">
      <div className="glow" style={{ background: glow }} />
      <div
        className={`pill-surface sheen`}
        style={{ background: gradient, padding: '20px 0' }}
        onDragOver={dragHandlers?.onDragOver}
        onDragEnter={dragHandlers?.onDragEnter}
        onDragLeave={dragHandlers?.onDragLeave}
        onDrop={dragHandlers?.onDrop}
        data-variant={variant}
      >
        <div className="flex flex-col gap-3 items-center text-center" onClick={(e)=>e.stopPropagation()}>
          <div>
            <h3 className="text-[17px] font-semibold leading-tight pill-title brand-title">{title}</h3>
            <p className="text-white/85 text-[13px] leading-snug pill-sub">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ================= Global styles ================= */

function GlobalStyles({ embed = false }: { embed?: boolean }) {
  return (
    <style jsx global>{`
      /* Full-page animated background */
      .page-shimmer{
        position:relative;
        ${embed
          ? 'background: transparent !important;'
          : 'background: linear-gradient(-45deg, #07131b, #0a1a26, #091623, #0d2231); background-size: 380% 380%; animation: pageGradient 26s ease-in-out infinite;'}
      }
      ${embed ? '.page-shimmer::before,.page-shimmer::after{ display:none !important; }' : `
      .page-shimmer::before{
        content:"";
        position:absolute; inset:-10%;
        background:
          radial-gradient(70% 100% at 15% 20%, rgba(0,255,200,.08), transparent 60%),
          radial-gradient(80% 110% at 85% 75%, rgba(80,180,255,.08), transparent 62%);
        mix-blend-mode: screen;
        filter: blur(24px) saturate(110%);
        animation: pageAurora 60s ease-in-out infinite alternate;
        pointer-events:none;
        z-index:0;
      }
      .page-shimmer::after {
        content: '';
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image:
          radial-gradient(1px 1px at 25% 25%, rgba(255, 255, 255, 0.05), transparent),
          radial-gradient(1px 1px at 75% 75%, rgba(255, 255, 255, 0.05), transparent);
        background-size: 50px 50px;
        animation: noiseShift 10s linear infinite;
        opacity: 0.045;
      }`}

      @keyframes noiseShift { 0%{ background-position: 0 0, 25px 25px } 100%{ background-position: 50px 50px, 75px 75px } }
      @keyframes pageGradient{ 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      @keyframes pageAurora{ 0%{transform:translate3d(0,0,0) scale(1)} 50%{transform:translate3d(-20px,12px,0) scale(1.04)} 100%{transform:translate3d(18px,-12px,0) scale(1.02)} }

      @media (prefers-reduced-motion: reduce){
        .page-shimmer{ animation:none !important }
        .page-shimmer::before,.page-shimmer::after{ animation:none !important }
      }

      /* Pills */
      .pill-wrap{ position:relative; margin:0 auto; width:${PILL_WIDTH}; z-index:1; cursor:pointer; }
      .glow{ position:absolute; inset:-26px; border-radius:9999px; filter: blur(26px) saturate(120%); pointer-events:none; }

      .pill-surface{
        position:relative; overflow:hidden; border-radius:9999px;
        box-shadow: 0 0 0 1px rgba(255,255,255,.08),
                    inset 0 1px 0 rgba(255,255,255,.28),
                    inset 0 10px 22px rgba(255,255,255,.08),
                    inset 0 -18px 28px rgba(0,0,0,.38),
                    0 18px 58px rgba(0,0,0,.35);
        transition: transform .15s ease, box-shadow .25s ease, background .2s ease, filter .2s ease;
      }
      .pill-surface:hover{ transform: translateY(-1px); }
      .sheen::after{
        content:''; position:absolute; left:0; right:0; top:0; height:38%;
        border-top-left-radius:9999px; border-top-right-radius:9999px;
        background:linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,.10) 28%, rgba(255,255,255,0) 70%);
        mix-blend-mode:screen; pointer-events:none;
      }

      .brand-title{
        font-family: 'Orbitron', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;
        text-transform: uppercase;
        letter-spacing: .6px;
        font-weight: 700;
      }
      .pill-surface[data-variant="upload"] .pill-title{
        color:#e9fdff;
        text-shadow: 0 0 2px rgba(73,242,255,.35), 0 0 6px rgba(73,242,255,.22);
      }
      .pill-surface[data-variant="verify"] .pill-title{
        color:#effff3;
        text-shadow: 0 0 2px rgba(46,224,122,.32), 0 0 6px rgba(46,224,122,.20);
      }
      .pill-sub{ color: rgba(255,255,255,.88); text-shadow: none; letter-spacing: .1px; }

      .inner-strip{
        width:85%; border-radius:9999px; display:flex; align-items:center; justify-content:center;
        border:1px solid rgba(255,255,255,.26); background:rgba(255,255,255,.10); backdrop-filter:blur(2px);
        transition: transform .12s ease, box-shadow .18s ease, background .18s ease;
      }
      .inner-strip:hover{ transform: translateY(-1px); box-shadow:0 8px 20px rgba(0,0,0,.25); background:rgba(255,255,255,.14); }

      .cta{
        display:inline-flex; align-items:center; justify-content:center;
        min-width:128px; padding:0 20px; border-radius:9999px; font-weight:700; letter-spacing:.25px;
        transition: transform .12s ease, box-shadow .18s ease; height:40px;
      }
      .brand-btn{ font-family: 'Orbitron', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; letter-spacing:.25px; text-shadow:none; }
      .cta-cyan{ color:#031a1f; background:linear-gradient(#49f2ff,#1bc7d7); box-shadow:0 6px 16px rgba(73,242,255,.22), 0 0 0 2px rgba(73,242,255,.18) inset; }
      .cta-cyan:hover{ transform:translateY(-1px); box-shadow:0 10px 22px rgba(73,242,255,.28), 0 0 0 2px rgba(73,242,255,.22) inset; }
      .cta-green{ color:#072015; background:linear-gradient(#63f59f,#31d977); box-shadow:0 6px 16px rgba(46,224,122,.22), 0 0 0 2px rgba(46,224,122,.18) inset; }
      .cta-green:hover{ transform:translateY(-1px); box-shadow:0 10px 22px rgba(46,224,122,.28), 0 0 0 2px rgba(46,224,122,.22) inset; }

      .verify-helper{ margin-top:.5rem; font-size:12px; text-align:center; color:rgba(255,255,255,.82); }
      .verify-helper .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; color:#fff; }

      .result-banner{
        width:${PILL_WIDTH};
        margin: 0 auto; display:flex; align-items:center; justify-content:center; gap:.6rem;
        border-radius:9999px; padding: 12px 18px; font-size:14px; font-weight:600;
        box-shadow: 0 10px 28px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.18);
        animation: fadeUp .28s ease-out forwards; transform: translateY(6px); opacity: 0; text-align:center;
      }
      .result-banner.ok{
        color:#062012; background: linear-gradient(#6bf1a7, #2fd876);
        box-shadow: 0 10px 28px rgba(0,0,0,.35), 0 0 0 2px rgba(46,224,122,.18) inset, 0 0 18px rgba(46,224,122,.28);
      }
      .result-banner.err{
        color:#1d0a0a; background: linear-gradient(#ff9aa0,#ff6b74);
        box-shadow: 0 10px 28px rgba(0,0,0,.35), 0 0 0 2px rgba(255,107,116,.22) inset, 0 0 18px rgba(255,107,116,.30);
      }
      .result-icon{ font-size:16px; }
      .result-text{ opacity:.95; }
      @keyframes fadeUp{ to { transform: translateY(0); opacity: 1; } }
    `}</style>
  );
}