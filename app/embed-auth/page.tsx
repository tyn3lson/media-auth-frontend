// /app/embed-auth/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EmbedAuth() {
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<'checking' | 'sign-in' | 'redirecting'>('checking');
  const [error, setError] = useState<string | null>(null);

  // Build a normalized return URL (Squarespace page you came from, or app home)
  const returnTo =
    params.get('return_to') ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        setPhase('checking');

        // 1) If Supabase sent us back with ?code=..., exchange it for a real session.
        const code = params.get('code');
        if (code) {
          const { error: xErr } = await supabase.auth.exchangeCodeForSession(code);
          if (xErr) throw xErr;
        }

        // 2) Check if we have a session now
        const { data, error: sErr } = await supabase.auth.getSession();
        if (sErr) throw sErr;

        const accessToken = data.session?.access_token;

        // 3) If signed in, send the token back to the embedding site and redirect
        if (accessToken) {
          if (cancelled) return;
          setPhase('redirecting');

          // If embedded in an iFrame, notify parent (Squarespace) as well
          try {
            window.parent?.postMessage(
              { type: 'declassifai:linked', token: accessToken },
              '*'
            );
          } catch {
            /* noop */
          }

          // Append token in URL fragment so it never hits server logs
          const target =
            returnTo && /^https?:\/\//i.test(returnTo)
              ? `${returnTo}#dai_token=${encodeURIComponent(accessToken)}`
              : '/';

          // Use replace to avoid back-button loops
          window.location.replace(target);
          return;
        }

        // 4) No session yet — show sign-in button
        if (!cancelled) setPhase('sign-in');
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Authentication error');
          setPhase('sign-in');
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [params, returnTo]);

  async function signInWithGoogle() {
    setError(null);
    // After Google, come back here with the same return_to so we can bounce you back
    const bounce = `${window.location.origin}/embed-auth?return_to=${encodeURIComponent(
      returnTo || window.location.origin
    )}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: bounce },
    });

    if (error) setError(error.message);
  }

  return (
    <div
      style={{
        padding: 24,
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        color: '#e5faff',
        background: '#0a0f14',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Link DeclassifAI Account</h1>

      {phase === 'checking' && <p style={{ opacity: 0.9 }}>Checking your session…</p>}

      {phase === 'sign-in' && (
        <>
          <p style={{ opacity: 0.9 }}>
            Sign in to link your account and return to your site.
          </p>
          <button
            onClick={signInWithGoogle}
            style={{
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,.2)',
              background:
                'linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.06))',
              color: '#e5faff',
              cursor: 'pointer',
            }}
          >
            Continue with Google
          </button>
          {error && (
            <p style={{ color: '#ffb4b4', marginTop: 12 }}>Error: {error}</p>
          )}
        </>
      )}

      {phase === 'redirecting' && (
        <p style={{ opacity: 0.9 }}>Linking and returning…</p>
      )}
    </div>
  );
}
