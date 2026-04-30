import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Dupla {
  id: string;
  jogador1: string;
  jogador2: string;
}

interface Jogo {
  id: string;
  dupla_a: Dupla;
  dupla_b: Dupla;
  pontos_a: number | null;
  pontos_b: number | null;
  ordem: number;
  status: string;
}

interface Categoria {
  id: string;
  nome: string;
  jogos: Jogo[];
}

export function Chaves() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarChaves();
  }, []);

  async function carregarChaves() {
    setCarregando(true);
    const { data: cats } = await supabase
      .from('categorias')
      .select('id, nome')
      .order('nome');

    if (!cats) {
      setCarregando(false);
      return;
    }

    const categoriasComJogos: Categoria[] = [];

    for (const cat of cats) {
      const { data: jogos } = await supabase
        .from('jogos')
        .select(`
          id, pontos_a, pontos_b, ordem, status,
          dupla_a:duplas!jogos_dupla_a_id_fkey(id, jogador1, jogador2),
          dupla_b:duplas!jogos_dupla_b_id_fkey(id, jogador1, jogador2)
        `)
        .eq('categoria_id', cat.id)
        .order('ordem');

      categoriasComJogos.push({
        ...cat,
        jogos: (jogos || []).map((j: any) => ({
          ...j,
          dupla_a: j.dupla_a,
          dupla_b: j.dupla_b,
        })),
      });
    }

    setCategorias(categoriasComJogos);
    setCarregando(false);
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Nenhuma chave cadastrada ainda.
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {categorias.map((cat) => (
        <div key={cat.id}>
          <h2 className="text-lg font-bold text-slate-800 mb-3">{cat.nome}</h2>
          {cat.jogos.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum jogo nesta categoria.</p>
          ) : (
            <div className="space-y-2">
              {cat.jogos.map((jogo) => (
                <div
                  key={jogo.id}
                  className="bg-white rounded-lg shadow p-3 flex items-center justify-between"
                >
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-slate-700">
                      {jogo.dupla_a.jogador1} / {jogo.dupla_a.jogador2}
                    </p>
                  </div>
                  <div className="px-3 text-center">
                    {jogo.status === 'finalizado' ? (
                      <span className="text-lg font-bold text-slate-800">
                        {jogo.pontos_a} x {jogo.pontos_b}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 uppercase">vs</span>
                    )}
                  </div>
                  <div className="flex-1 text-sm text-right">
                    <p className="font-medium text-slate-700">
                      {jogo.dupla_b.jogador1} / {jogo.dupla_b.jogador2}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
