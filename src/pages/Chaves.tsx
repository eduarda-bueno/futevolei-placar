import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#113776';

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
}

export function Chaves() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoJogos, setCarregandoJogos] = useState(false);

  useEffect(() => {
    carregarCategorias();
  }, []);

  useEffect(() => {
    if (categoriaSelecionada) {
      carregarJogos(categoriaSelecionada);
    }
  }, [categoriaSelecionada]);

  async function carregarCategorias() {
    setCarregando(true);
    const { data } = await supabase
      .from('categorias')
      .select('id, nome')
      .order('nome');
    setCategorias(data || []);
    setCarregando(false);
  }

  async function carregarJogos(categoriaId: string) {
    setCarregandoJogos(true);
    const { data } = await supabase
      .from('jogos')
      .select(`
        id, pontos_a, pontos_b, ordem, status,
        dupla_a:duplas!jogos_dupla_a_id_fkey(id, jogador1, jogador2),
        dupla_b:duplas!jogos_dupla_b_id_fkey(id, jogador1, jogador2)
      `)
      .eq('categoria_id', categoriaId)
      .order('ordem');

    setJogos(
      (data || []).map((j: any) => ({
        ...j,
        dupla_a: j.dupla_a,
        dupla_b: j.dupla_b,
      }))
    );
    setCarregandoJogos(false);
  }

  if (carregando) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  if (categorias.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Nenhuma tabela de jogo cadastrada ainda.</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', paddingTop: 12 }}>
      <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>Jogos</h2>

      {/* Categorias */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
        {categorias.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoriaSelecionada(cat.id)}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: categoriaSelecionada === cat.id ? '#fff' : 'rgba(255,255,255,0.12)',
              color: categoriaSelecionada === cat.id ? BLUE : '#fff',
            }}
          >
            {cat.nome}
          </button>
        ))}
      </div>

      {/* Jogos */}
      {categoriaSelecionada && (
        <div>
          {carregandoJogos ? (
            <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.5)' }}>Carregando...</div>
          ) : jogos.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' }}>Nenhum jogo nesta categoria.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
              {jogos.map((jogo, idx) => (
                <div
                  key={jogo.id}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 24,
                    padding: '40px 24px',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                >
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, fontWeight: 700, marginBottom: 28, textAlign: 'center', letterSpacing: 2 }}>
                    JOGO {idx + 1}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>
                        {jogo.dupla_a.jogador1}
                      </p>
                      {jogo.dupla_a.jogador2 && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22, marginTop: 8 }}>
                          {jogo.dupla_a.jogador2}
                        </p>
                      )}
                    </div>
                    <div style={{ padding: '0 24px', textAlign: 'center' }}>
                      {jogo.status === 'finalizado' ? (
                        <span style={{ color: '#fff', fontSize: 48, fontWeight: 'bold' }}>
                          {jogo.pontos_a} x {jogo.pontos_b}
                        </span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 36, fontWeight: 'bold' }}>VS</span>
                      )}
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <p style={{ color: '#fff', fontSize: 28, fontWeight: 700 }}>
                        {jogo.dupla_b.jogador1}
                      </p>
                      {jogo.dupla_b.jogador2 && (
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22, marginTop: 8 }}>
                          {jogo.dupla_b.jogador2}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
