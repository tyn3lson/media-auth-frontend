'use client';

import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginCard() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  async function signin() {
    setLoading(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg('Signed in!');
  }

  async function signup() {
    setLoading(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg('Check your email to confirm your account.');
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl shadow-black/40 p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-2 h-12 w-12 rounded-xl bg-white/10 grid place-items-center">
            <span className="text-xl">🔐</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to DeclassifAI</h1>
          <p className="text-sm text-slate-300/80 mt-1">Access uploads & verification</p>
        </div>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full mb-4 rounded-lg bg-slate-900/60 border border-white/10 px-4 py-2.5 outline-none focus:border-indigo-400 transition"
          placeholder="you@domain.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block text-sm mb-1">Password</label>
        <div className="relative mb-6">
          <input
            className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-4 py-2.5 pr-12 outline-none focus:border-indigo-400 transition"
            placeholder="••••••••"
            type={showPw ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            className="absolute top-1/2 -translate-y-1/2 right-2 text-xs px-2 py-1 rounded-md bg-white/10 hover:bg-white/20"
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>

        {err && (
          <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-red-200 text-sm">
            {err}
          </div>
        )}
        {msg && (
          <div className="mb-4 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-emerald-200 text-sm">
            {msg}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={signin}
            disabled={loading}
            className="flex-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 px-4 py-2.5 font-medium"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            onClick={signup}
            disabled={loading}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 px-4 py-2.5"
          >
            {loading ? 'Sending…' : 'Sign up'}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Trouble signing in? <a className="underline hover:text-slate-200" href="mailto:support@de-classifai.com">Contact support</a>
      </p>
    </div>
  );
}