import { useState } from 'react';

export function PlacarRapido() {
  const [pontosA, setPontosA] = useState(0);
  const [pontosB, setPontosB] = useState(0);
  const [nomeA, setNomeA] = useState('Time A');
  const [nomeB, setNomeB] = useState('Time B');
  const [editando, setEditando] = useState<'A' | 'B' | null>(null);

  const resetar = () => {
    setPontosA(0);
    setPontosB(0);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Placar */}
      <div className="flex gap-4 mb-6">
        {/* Time A */}
        <div className="flex-1 bg-blue-600 rounded-2xl p-4 text-center">
          {editando === 'A' ? (
            <input
              type="text"
              value={nomeA}
              onChange={(e) => setNomeA(e.target.value)}
              onBlur={() => setEditando(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditando(null)}
              autoFocus
              className="w-full bg-blue-700 text-white text-center text-sm font-medium rounded px-2 py-1 mb-2 outline-none"
            />
          ) : (
            <p
              onClick={() => setEditando('A')}
              className="text-white text-sm font-medium mb-2 truncate cursor-pointer hover:underline"
            >
              {nomeA}
            </p>
          )}
          <p className="text-white text-7xl font-bold mb-4">{pontosA}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setPontosA(Math.max(0, pontosA - 1))}
              className="w-16 h-16 rounded-full bg-white/20 text-white text-3xl font-bold hover:bg-white/30 transition-colors"
            >
              -
            </button>
            <button
              onClick={() => setPontosA(pontosA + 1)}
              className="w-16 h-16 rounded-full bg-white text-blue-600 text-3xl font-bold hover:bg-blue-50 transition-colors"
            >
              +
            </button>
          </div>
        </div>

        {/* Time B */}
        <div className="flex-1 bg-red-600 rounded-2xl p-4 text-center">
          {editando === 'B' ? (
            <input
              type="text"
              value={nomeB}
              onChange={(e) => setNomeB(e.target.value)}
              onBlur={() => setEditando(null)}
              onKeyDown={(e) => e.key === 'Enter' && setEditando(null)}
              autoFocus
              className="w-full bg-red-700 text-white text-center text-sm font-medium rounded px-2 py-1 mb-2 outline-none"
            />
          ) : (
            <p
              onClick={() => setEditando('B')}
              className="text-white text-sm font-medium mb-2 truncate cursor-pointer hover:underline"
            >
              {nomeB}
            </p>
          )}
          <p className="text-white text-7xl font-bold mb-4">{pontosB}</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setPontosB(Math.max(0, pontosB - 1))}
              className="w-16 h-16 rounded-full bg-white/20 text-white text-3xl font-bold hover:bg-white/30 transition-colors"
            >
              -
            </button>
            <button
              onClick={() => setPontosB(pontosB + 1)}
              className="w-16 h-16 rounded-full bg-white text-red-600 text-3xl font-bold hover:bg-red-50 transition-colors"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Botão Resetar */}
      <button
        onClick={resetar}
        className="w-full bg-slate-200 text-slate-700 py-3 px-4 rounded-lg hover:bg-slate-300 transition-colors font-medium"
      >
        Zerar Placar
      </button>

      <p className="text-center text-xs text-slate-400 mt-4">
        Clique no nome do time para editar
      </p>
    </div>
  );
}
