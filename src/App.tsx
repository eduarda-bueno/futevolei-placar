import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { PlacarRapido } from './pages/PlacarRapido';
import { Chaves } from './pages/Chaves';
import { AdminLogin } from './pages/AdminLogin';
import { Admin } from './pages/Admin';

const LOGO_BG = '#2a5082';

function AppLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: `linear-gradient(180deg, ${LOGO_BG} 0%, ${LOGO_BG} 15%, #3a7aaa 35%, #5aabb8 50%, #7ec8c8 60%, #c9b896 75%, #e2ceab 90%, #d4b88a 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontFamily: 'Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: current === '/admin' || current === '/chaves' ? 1200 : 500,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 16px 12px',
          transition: 'max-width 0.3s',
        }}
      >
        {/* Conteúdo da página */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
          {children}
        </div>

        {/* Wave separator */}
        <svg
          viewBox="0 0 400 20"
          preserveAspectRatio="none"
          style={{ width: '100%', height: 14, flexShrink: 0, display: 'block' }}
        >
          <path
            d="M0,10 C50,0 100,20 150,10 C200,0 250,20 300,10 C350,0 400,20 400,10"
            fill="none"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Footer Nav */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 40,
            paddingTop: 8,
            flexShrink: 0,
          }}
        >
          <div
            onClick={() => navigate('/')}
            style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 11,
              width: 70,
              cursor: 'pointer',
              opacity: current === '/' ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}>📋</span>
            Placar
          </div>
          <div
            onClick={() => navigate('/chaves')}
            style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 11,
              width: 70,
              cursor: 'pointer',
              opacity: current === '/chaves' ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}>⚽</span>
            Jogos
          </div>
          <div
            onClick={() => navigate('/admin')}
            style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 11,
              width: 70,
              cursor: 'pointer',
              opacity: current === '/admin' ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}>⚙️</span>
            Config
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminRoute() {
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAdmin(!!data.session);
    });
  }, []);

  if (admin === null) return null;

  if (!admin) {
    return <AdminLogin onLogin={() => setAdmin(true)} />;
  }

  return <Admin onLogout={() => setAdmin(false)} />;
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<PlacarRapido />} />
          <Route path="/chaves" element={<Chaves />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
