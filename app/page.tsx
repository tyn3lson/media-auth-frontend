'use client';

import React, { useRef, useState } from 'react';
import Gate from './components/Gate';
import { supabase } from './lib/supabaseClient';

/** .env.local → NEXT_PUBLIC_API_BASE=https://declassifai-backend1.onrender.com */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

const PILL_WIDTH_DESKTOP = 680;
const PILL_WIDTH = `clamp(480px, 56vw, ${PILL_WIDTH_DESKTOP}px)`;

/* ---------- Authenticated fetch helper ---------- */
async function authFetch(path: string, init?: RequestInit) {
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  if (!token) throw new Error('Not signed in');
  return fetch(`${API_BASE}${path}`, {
    ...(init || {}),
    headers: {
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

/* ---------- SHA-256 helper (hex) ---------- */
async function sha256Hex(ab: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', ab);
  const bytes = Array.from(new Uint8Array(digest));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function Page() {
  return (
    <Gate>
      <main className="page-minimal min-h-screen relative overflow-hidden text-[var(--sq-text,#e6f1ff)]">
        <div className="mx-auto w-full max-w-[720px] px-6">
          {/* Logo only */}
          <header className="flex items-center justify-center gap-3 pt-10 pb-8">
            <img
              src="/logo.png"
              alt="DeclassifAI"
              className="h-14 w-auto rounded-lg shadow-[0_0_55px_rgba(73,242,255,.35)]"
            />
          </header>

          {/* Two pills only */}
          <section className="grid gap-6 pb-20">
            <UploadPill />
            <VerifyPill />
          </section>
        </div>

        <MinimalStyles />
      </main>
    </Gate>
  );
}

/* ================= Upload Pill ================= */

function UploadPill() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => inputRef.current?.click();
  const prevent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  async function recordFile() {
    if (!file) return;
    setBusy(true);
    try {
      // 1) Compute SHA-256
      const ab = await file.arrayBuffer();
      const sha = await sha256Hex(ab);
      const size = file.size;
      const ctLocal = file.type || 'application/octet-stream';

      // 2) Presign
      const pres = await authFetch(`/s3/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha256: sha, filename: file.name, content_type: ctLocal, size })
      });
      const presJson = await pres.json();
      if (!pres.ok) throw new Error(presJson?.detail || `presign HTTP ${pres.status}`);

      const url: string = presJson.url;
      const key: string = presJson.key;
      const ctRequired: string = presJson?.headers?.['Content-Type'] || ctLocal;

      // 3) Upload to S3
      const putRes = await fetch(url, { method: 'PUT', headers: { 'Content-Type': ctRequired }, body: file });
      if (!putRes.ok) throw new Error(`S3 PUT ${putRes.status}`);

      // 4) Commit
      const commit = await authFetch(`/upload/commit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha256: sha, key, size, content_type: ctRequired, original_filename: file.name })
      });
      if (!commit.ok) {
        const err = await commit.json().catch(()=> ({}));
        throw new Error(err?.detail || `commit HTTP ${commit.status}`);
      }

      // Optional: tiny success flash on the pill (handled by CSS class)
      const el = document.querySelector('.pill-surface[data-variant="upload"]');
      el?.classList.add('flash');
      setTimeout(()=> el?.classList.remove('flash'), 700);

      setFile(null);
      inputRef.current && (inputRef.current.value = ''); // reset picker
    } catch (e) {
      const el = document.querySelector('.pill-surface[data-variant="upload"]');
      el?.classList.add('flash-error');
      setTimeout(()=> el?.classList.remove('flash-error'), 900);
    } finally { setBusy(false); }
  }

  return (
    <PillShell
      color="cyan"
      variant="upload"
      onClick={openPicker}
      dragHandlers={{
        onDragOver: prevent,
        onDragEnter: prevent,
        onDragLeave: prevent,
        onDrop: (e) => { prevent(e); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }
      }}
    >
      <div className="flex flex-col items-center w-full gap-3">
        <button className="inner-strip h-[44px]" onClick={(e)=>{ e.stopPropagation(); openPicker(); }} type="button">
          {file ? file.name : 'Drag & drop or click to choose'}
        </button>

        <button
          className="cta cta-cyan brand-btn h-[44px]"
          onClick={(e)=>{ e.stopPropagation(); recordFile(); }}
          disabled={!file || busy}
        >
          {busy ? 'Working…' : 'Upload'}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e)=> setFile(e.target.files?.[0] ?? null)}
      />
    </PillShell>
  );
}

/* ================= Verify Pill ================= */

function VerifyPill() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [computedHash, setComputedHash] = useState<string>('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const openPicker = () => inputRef.current?.click();
  const prevent = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };

  async function setFileAndCompute(f: File | null) {
    setFile(f);
    if (!f) return setComputedHash('');
    const ab = await f.arrayBuffer();
    setComputedHash(await sha256Hex(ab));
  }

  async function verifyFile() {
    if (!file) return;
    setBusy(true);
    try {
      // Prefer hash-only endpoint first
      if (computedHash) {
        const r1 = await authFetch(`/verify-hash`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash: computedHash }),
        });
        const d1 = await r1.json().catch(()=> ({}));
        if (r1.ok && typeof d1?.found === 'boolean') {
          const el = document.querySelector('.pill-surface[data-variant="verify"]');
          el?.classList.add(d1.found ? 'flash' : 'flash-error');
          setTimeout(()=> el?.classList.remove(d1.found ? 'flash' : 'flash-error'), 900);
          return;
        }
      }
      // Fallback: POST file
      const fd = new FormData(); fd.append('file', file);
      const r2 = await authFetch(`/verify`, { method: 'POST', body: fd });
      const d2 = await r2.json().catch(()=> ({}));
      const ok = r2.ok && !!d2?.found;
      const el = document.querySelector('.pill-surface[data-variant="verify"]');
      el?.classList.add(ok ? 'flash' : 'flash-error');
      setTimeout(()=> el?.classList.remove(ok ? 'flash' : 'flash-error'), 900);
    } catch {
      const el = document.querySelector('.pill-surface[data-variant="verify"]');
      el?.classList.add('flash-error');
      setTimeout(()=> el?.classList.remove('flash-error'), 900);
    } finally { setBusy(false); }
  }

  return (
    <PillShell
      color="green"
      variant="verify"
      onClick={openPicker}
      dragHandlers={{
        onDragOver: prevent,
        onDragEnter: prevent,
        onDragLeave: prevent,
        onDrop: async (e)=>{ prevent(e); const f=e.dataTransfer.files?.[0] ?? null; await setFileAndCompute(f); }
      }}
    >
      <div className="flex flex-col items-center w-full gap-3">
        <button className="inner-strip h-[44px]" onClick={(e)=>{ e.stopPropagation(); openPicker(); }} type="button">
          {file ? file.name : 'Drag & drop or click to choose'}
        </button>

        <button
          className="cta cta-green brand-btn h-[44px]"
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
  );
}

/* ================= Shared, ultra-minimal pill shell ================= */

function PillShell({
  children, color, variant, onClick, dragHandlers
}: {
  children: React.ReactNode;
  color: 'cyan'|'green';
  variant: 'upload'|'verify';
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
  const glow = color==='cyan' ? 'rgba(73,242,255,.28)' : 'rgba(46,224,122,.28)';

  return (
    <div className="pill-wrap" onClick={onClick} role="button">
      <div className="glow" style={{ background: glow }} />
      <div
        className="pill-surface sheen"
        style={{ background: gradient, padding: '20px 0' }}
        onDragOver={dragHandlers?.onDragOver}
        onDragEnter={dragHandlers?.onDragEnter}
        onDragLeave={dragHandlers?.onDragLeave}
        onDrop={dragHandlers?.onDrop}
        data-variant={variant}
      >
        <div className="flex flex-col items-center text-center gap-3" onClick={(e)=>e.stopPropagation()}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ================= Global minimal styles ================= */

function MinimalStyles() {
  return (
    <style jsx global>{`
      :root{
        --sq-text: var(--theme-text, #e6f1ff);
        --brand-acc: #49F2FF;
        --brand-acc-2: #206389;
        --brand-acc-3: #0A70AC;
      }

      .page-minimal{
        position:relative;
        background:
          radial-gradient(1200px 800px at 70% -10%, rgba(73,242,255,.10), transparent),
          linear-gradient(180deg, #06101b, #06101b);
        min-height:100vh;
      }

      /* gentle moving aurora */
      .page-minimal::before{
        content:""; position:absolute; inset:-12%;
        background:
          radial-gradient(70% 100% at 12% 18%, rgba(73,242,255,.08), transparent 60%),
          radial-gradient(70% 110% at 88% 78%, rgba(10,112,172,.08), transparent 62%);
        mix-blend-mode:screen; filter: blur(20px) saturate(110%);
        animation: aur 60s ease-in-out infinite alternate;
        pointer-events:none; z-index:0;
      }
      @keyframes aur{ 0%{transform:translate3d(0,0,0)} 50%{transform:translate3d(-16px,8px,0)} 100%{transform:translate3d(14px,-10px,0)} }
      @media (prefers-reduced-motion: reduce){ .page-minimal::before{ animation: none !important; } }

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
        content:''; position:absolute; left:0; right:0; top:0; height:36%;
        border-top-left-radius:9999px; border-top-right-radius:9999px;
        background:linear-gradient(180deg, rgba(255,255,255,.26), rgba(255,255,255,.10) 28%, rgba(255,255,255,0) 70%);
        mix-blend-mode:screen; pointer-events:none;
      }

      .inner-strip{
        width:85%; border-radius:9999px; display:flex; align-items:center; justify-content:center;
        border:1px solid rgba(255,255,255,.26); background:rgba(255,255,255,.10); backdrop-filter:blur(2px);
        transition: transform .12s ease, box-shadow .18s ease, background .18s ease;
        text-wrap: balance;
      }
      .inner-strip:hover{ transform: translateY(-1px); box-shadow:0 8px 20px rgba(0,0,0,.25); background:rgba(255,255,255,.14); }

      .cta{
        display:inline-flex; align-items:center; justify-content:center;
        min-width:140px; padding:0 22px; border-radius:9999px; font-weight:700; letter-spacing:.25px;
        transition: transform .12s ease, box-shadow .18s ease; height:44px;
        font-family: 'Orbitron', ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      }
      .brand-btn{ letter-spacing:.25px; text-shadow:none; }
      .cta-cyan{ color:#031a1f; background:linear-gradient(#49f2ff,#1bc7d7); box-shadow:0 6px 16px rgba(73,242,255,.22), 0 0 0 2px rgba(73,242,255,.18) inset; }
      .cta-cyan:hover{ transform:translateY(-1px); box-shadow:0 10px 22px rgba(73,242,255,.28), 0 0 0 2px rgba(73,242,255,.22) inset; }
      .cta-green{ color:#072015; background:linear-gradient(#63f59f,#31d977); box-shadow:0 6px 16px rgba(46,224,122,.22), 0 0 0 2px rgba(46,224,122,.18) inset; }
      .cta-green:hover{ transform:translateY(-1px); box-shadow:0 10px 22px rgba(46,224,122,.28), 0 0 0 2px rgba(46,224,122,.22) inset; }

      /* subtle success/error feedback on the pill itself */
      .flash{ animation: okflash .7s ease; }
      .flash-error{ animation: errflash .9s ease; }
      @keyframes okflash {
        0% { box-shadow: 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.28), 0 18px 58px rgba(0,0,0,.35), 0 0 0 rgba(46,224,122,0); }
        40% { box-shadow: 0 0 0 1px rgba(255,255,255,.10), inset 0 1px 0 rgba(255,255,255,.30), 0 18px 58px rgba(0,0,0,.35), 0 0 30px rgba(46,224,122,.55); }
        100% { box-shadow: 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.28), 0 18px 58px rgba(0,0,0,.35), 0 0 0 rgba(46,224,122,0); }
      }
      @keyframes errflash {
        0% { box-shadow: 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.28), 0 18px 58px rgba(0,0,0,.35), 0 0 0 rgba(255,107,116,0); }
        40% { box-shadow: 0 0 0 1px rgba(255,255,255,.10), inset 0 1px 0 rgba(255,255,255,.30), 0 18px 58px rgba(0,0,0,.35), 0 0 26px rgba(255,107,116,.55); }
        100% { box-shadow: 0 0 0 1px rgba(255,255,255,.08), inset 0 1px 0 rgba(255,255,255,.28), 0 18px 58px rgba(0,0,0,.35), 0 0 0 rgba(255,107,116,0); }
      }
    `}</style>
  );
}
