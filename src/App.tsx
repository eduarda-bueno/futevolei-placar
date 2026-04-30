import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { PlacarRapido } from './pages/PlacarRapido';
import { Chaves } from './pages/Chaves';
import { AdminLogin } from './pages/AdminLogin';
import { Admin } from './pages/Admin';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto flex">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex-1 text-center py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            Placar
          </NavLink>
          <NavLink
            to="/chaves"
            className={({ isActive }) =>
              `flex-1 text-center py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            Chaves
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex-1 text-center py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`
            }
          >
            Admin
          </NavLink>
        </div>
      </nav>
      <main className="flex-1 px-4 py-6">{children}</main>
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
      <Layout>
        <Routes>
          <Route path="/" element={<PlacarRapido />} />
          <Route path="/chaves" element={<Chaves />} />
          <Route path="/admin" element={<AdminRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
