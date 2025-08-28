// app/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const router = useRouter();

  // form state
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);

  // status
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // if already signed in, go to app
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        // smooth in Squarespace iframe too
        window.parent?.postMessage({ type: 'declassifai:scrollTop' }, '*');
        router.replace('/');
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function signIn() {
    setLoading(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg('Signed in ✔');
  }

  async function signUp() {
    // simple local validation (Supabase may also enforce a regex policy)
    if (pw.length < 8) {
      setErr('Password must be at least 8 characters.'); return;
    }
    setLoading(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg('Check your email to confirm your account.');
  }

  async function resetPw() {
    setLoading(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
    });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    setMsg('Password reset link sent (if the email exists).');
  }

  return (
    <main className="min-h-screen grid place-items-center bg-black text-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl shadow-black/40 p-6">
        <div className="mb-6 text-center">
          <img
            src="/logo.png"
            alt="DeclassifAI"
            className="mx-auto h-14 w-auto rounded-lg shadow-[0_0_40px_rgba(73,242,255,.35)]"
          />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in to DeclassifAI</h1>
          <p className="text-sm text-slate-300/80 mt-1">Access uploads & verification</p>
        </div>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full mb-4 rounded-lg bg-slate-900/60 border border-white/10 px-4 py-2.5 outline-none focus:border-cyan-400 transition"
          placeholder="you@domain.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />

        <label className="block text-sm mb-1">Password</label>
        <div className="relative mb-3">
          <input
            className="w-full rounded-lg bg-slate-900/60 border border-white/10 px-4 py-2.5 pr-12 outline-none focus:border-cyan-400 transition"
            placeholder="••••••••"
            type={showPw ? 'text' : 'password'}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoComplete="current-password"
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
          <div className="mb-3 rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-red-200 text-sm">
            {err}
          </div>
        )}
        {msg && (
          <div className="mb-3 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-emerald-200 text-sm">
            {msg}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={signIn}
            disabled={loading}
            className="flex-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 px-4 py-2.5 font-medium text-black"
            type="button"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
          <button
            onClick={signUp}
            disabled={loading}
            className="flex-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 px-4 py-2.5"
            type="button"
          >
            {loading ? 'Sending…' : 'Sign up'}
          </button>
        </div>

        <div className="mt-3 text-center">
          <button
            onClick={resetPw}
            disabled={loading || !email}
            className="text-xs text-slate-300 underline hover:text-white disabled:opacity-50"
            type="button"
          >
            Forgot password?
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4 text-center">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        Trouble signing in? <a className="underline hover:text-slate-200" href="mailto:support@de-classifai.com">Contact support</a>
      </p>
    </main>
  );
}