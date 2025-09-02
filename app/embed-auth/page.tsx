'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function EmbedAuth() {
  const [status, setStatus] = useState<'checking'|'signed-out'|'sending'|'done'>('checking');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setError(error.message);
        setStatus('signed-out');
        return;
      }
      if (session?.access_token) {
        setStatus('sending');
        // Send the token back to the opener (Squarespace page)
        try {
          window.opener?.postMessage(
            { type: 'declassifai-auth', token: session.access_token },
            window.location.origin
          );
          setStatus('done');
          // Close after a short delay so users see the success state
          setTimeout(() => window.close(), 600);
        } catch (e: any) {
          setError(String(e));
          setStatus('done');
        }
      } else {
        setStatus('signed-out');
      }
    })();
  }, []);

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/embed-auth` }
    });
    if (error) setError(error.message);
  }

  return (
    <div style={{padding:20, fontFamily:'system-ui', color:'#e5faff', background:'#0a0f14', minHeight:'100vh'}}>
      <h1 style={{marginTop:0}}>Link DeclassifAI Account</h1>
      {status === 'checking' && <p>Checking your session…</p>}
      {status === 'signed-out' && (
        <>
          <p>Please sign in so we can link your account to the Squarespace widget.</p>
          <button onClick={signInWithGoogle} style={{padding:'10px 14px', borderRadius:999}}>Continue with Google</button>
        </>
      )}
      {status === 'sending' && <p>Linking…</p>}
      {status === 'done' && <p>Linked! You can close this window.</p>}
      {error && <p style={{color:'#ffb4b4'}}>Error: {error}</p>}
    </div>
  );
}
