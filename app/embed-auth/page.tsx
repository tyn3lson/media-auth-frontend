// /app/embed-auth/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function EmbedAuth() {
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'checking'|'sign-in'|'redirecting'>('checking');

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const returnTo = url.searchParams.get('return_to'); // Squarespace page URL

      // 1) Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setError(error.message);
        setPhase('sign-in');
        return;
      }

      // 2) If signed in, redirect back to Squarespace with token in fragment
      if (session?.access_token && returnTo) {
        setPhase('redirecting');
        const target = `${returnTo}#dai_token=${encodeURIComponent(session.access_token)}`;
        window.location.replace(target);
        return;
      }

      // 3) If not signed in, show button
      setPhase('sign-in');
    })();
  }, []);

  async function signInWithGoogle() {
    const url = new URL(window.location.href);
    const returnTo = url.searchParams.get('return_to') || window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/embed-auth?return_to=${encodeURIComponent(returnTo)}` }
    });
    if (error) setError(error.message);
  }

  return (
    <div style={{ padding: 20, fontFamily: 'system-ui', color: '#e5faff', background: '#0a0f14', minHeight: '100vh' }}>
      <h1 style={{ marginTop: 0 }}>Link DeclassifAI Account</h1>
      {phase === 'checking' && <p>Checking your session…</p>}
      {phase === 'sign-in' && (
        <>
          <p>Sign in to link your account and return to your site.</p>
          <button onClick={signInWithGoogle} style={{ padding: '10px 14px', borderRadius: 999 }}>Continue with Google</button>
        </>
      )}
      {phase === 'redirecting' && <p>Linking and returning…</p>}
      {error && <p style={{ color: '#ffb4b4' }}>Error: {error}</p>}
    </div>
  );
}
