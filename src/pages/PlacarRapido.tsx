import { useState } from 'react';

const BLUE = '#113776';
const LOGO_BG = '#2a5082';

export function PlacarRapido() {
  const [pontosA, setPontosA] = useState(0);
  const [pontosB, setPontosB] = useState(0);
  const [nomeA, setNomeA] = useState('Dupla A');
  const [nomeB, setNomeB] = useState('Dupla B');
  const [editando, setEditando] = useState<'A' | 'B' | null>(null);

  const formatScore = (score: number) => score.toString().padStart(2, '0');

  const resetar = () => {
    if (window.confirm('Zerar placar?')) {
      setPontosA(0);
      setPontosB(0);
    }
  };

  const renderNome = (
    dupla: 'A' | 'B',
    nome: string,
    setNome: (v: string) => void,
    color: string,
  ) => {
    if (editando === dupla) {
      return (
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => setEditando(null)}
          onKeyDown={(e) => e.key === 'Enter' && setEditando(null)}
          autoFocus
          style={{
            background: 'transparent',
            color,
            border: 'none',
            borderBottom: `1px solid ${color}`,
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 'bold',
            outline: 'none',
            width: '100%',
            fontFamily: 'Roboto, sans-serif',
          }}
        />
      );
    }
    return (
      <span
        onClick={() => setEditando(dupla)}
        style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: 14, fontFamily: 'Roboto, sans-serif' }}
      >
        {nome}
      </span>
    );
  };

  const scoreCard = (
    variant: 'dark' | 'light',
    dupla: 'A' | 'B',
    nome: string,
    setNome: (v: string) => void,
    pontos: number,
    setPontos: (v: number) => void,
  ) => {
    const isDark = variant === 'dark';
    const fg = isDark ? '#fff' : BLUE;
    const bg = isDark ? BLUE : '#fff';
    const borderColor = isDark ? 'rgba(255,255,255,0.4)' : BLUE;

    return (
      <div
        style={{
          flex: 1,
          background: bg,
          borderRadius: 14,
          padding: '12px 8px',
          textAlign: 'center',
          color: fg,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 0,
        }}
      >
        {renderNome(dupla, nome, setNome, fg)}
        <div
          style={{
            fontFamily: "'Digital-7 Mono', 'Digital-7', monospace",
            fontSize: 80,
            fontWeight: 'bold',
            lineHeight: 1,
            color: fg,
          }}
        >
          {formatScore(pontos)}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <button
            onClick={() => setPontos(Math.max(0, pontos - 1))}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: `2px solid ${borderColor}`,
              background: 'transparent',
              color: fg,
              fontSize: 24,
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            −
          </button>
          <button
            onClick={() => setPontos(pontos + 1)}
            style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              border: `2px solid ${borderColor}`,
              background: 'transparent',
              color: fg,
              fontSize: 24,
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        .score-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          flex: 1;
          min-height: 0;
        }
        @media (orientation: landscape) {
          .score-row {
            flex-direction: row;
          }
        }
      `}</style>
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
            maxWidth: 500,
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 16px 12px',
          }}
        >
            {/* Score Cards */}
          <div className="score-row">
            {scoreCard('dark', 'A', nomeA, setNomeA, pontosA, setPontosA)}
            {scoreCard('light', 'B', nomeB, setNomeB, pontosB, setPontosB)}
          </div>

          {/* Zerar Placar */}
          <button
            onClick={resetar}
            style={{
              width: '100%',
              padding: 12,
              borderRadius: 12,
              border: 'none',
              fontSize: 16,
              fontWeight: 'bold',
              color: BLUE,
              background: '#fff',
              cursor: 'pointer',
              fontFamily: 'Roboto, sans-serif',
              margin: '10px 0',
              flexShrink: 0,
            }}
          >
            Zerar Placar
          </button>

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
            }}
          >
            <div style={{ color: '#fff', textAlign: 'center', fontSize: 11, width: 70 }}>
              <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}>📋</span>
              Placar
            </div>
            <div style={{ color: '#fff', textAlign: 'center', fontSize: 11, opacity: 0.5, width: 70 }}>
              <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}>⚽</span>
              Jogos
            </div>
            <div style={{ color: '#fff', textAlign: 'center', fontSize: 11, opacity: 0.5, width: 70 }}>
              <span style={{ fontSize: 18, display: 'block', marginBottom: 2 }}>⚙️</span>
              Config
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
