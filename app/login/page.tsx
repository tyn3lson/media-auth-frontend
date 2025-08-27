'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');

  async function signin() {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setMsg(error ? error.message : 'Signed in! Go to the app.');
  }

  async function signup() {
    const { error } = await supabase.auth.signUp({ email, password: pw });
    setMsg(error ? error.message : 'Check your email to confirm.');
  }

  return (
    <main style={{maxWidth:420,margin:'120px auto',fontFamily:'sans-serif'}}>
      <h1>Sign in</h1>
      <input placeholder="email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%',padding:10,margin:'6px 0'}}/>
      <input type="password" placeholder="password" value={pw} onChange={e=>setPw(e.target.value)} style={{width:'100%',padding:10,margin:'6px 0'}}/>
      <button onClick={signin}>Sign in</button>
      <button onClick={signup} style={{marginLeft:8}}>Sign up</button>
      <div style={{marginTop:10}}>{msg}</div>
    </main>
  );
}