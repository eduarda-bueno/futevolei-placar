import { useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#113776';

interface AdminLoginProps {
  onLogin: () => void;
}

export function AdminLogin({ onLogin }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);

    if (error) {
      setErro('Email ou senha incorretos.');
      return;
    }

    onLogin();
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 350, margin: '0 auto', width: '100%' }}>
      <h1 style={{ color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 }}>
        Configurações
      </h1>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: '100%',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 14,
            outline: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
          }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          required
          style={{
            width: '100%',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 12,
            padding: '14px 16px',
            fontSize: 14,
            outline: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#fff',
          }}
        />
        {erro && <p style={{ color: '#ff6b6b', fontSize: 13 }}>{erro}</p>}
        <button
          type="submit"
          disabled={carregando}
          style={{
            width: '100%',
            padding: 14,
            borderRadius: 12,
            border: 'none',
            fontSize: 16,
            fontWeight: 'bold',
            color: BLUE,
            background: '#fff',
            cursor: 'pointer',
            opacity: carregando ? 0.6 : 1,
          }}
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
