'use client';

import { useEffect, useState } from 'react';
import LoginCard from './LoginCard';
import { supabase } from '../lib/supabaseClient';

export default function Gate({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<'checking' | 'authed' | 'anon'>('checking');

  useEffect(() => {
    let mounted = true;

    // Initial session check
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setStatus(data.session ? 'authed' : 'anon');
    });

    // React to sign-in / sign-out in real-time
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setStatus(session ? 'authed' : 'anon');
      // optional: scroll parent up a bit when state changes (nice in iframe)
      window.parent?.postMessage({ type: 'declassifai:scrollTop' }, '*');
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === 'checking') return null;    // quick & no flicker
  if (status === 'anon') return <LoginCard />;
  return <>{children}</>;
}