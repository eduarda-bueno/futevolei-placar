import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const BLUE = '#113776';

interface Torneio {
  id: string;
  nome: string;
  data: string;
}

interface Categoria {
  id: string;
  nome: string;
}

type BracketSlot = { nome: string; id: string } | 'BYE' | null;
interface BracketMatch {
  a: BracketSlot;
  b: BracketSlot;
  winner: 'a' | 'b' | null;
}
type BracketRound = BracketMatch[];

function getNomeRodada(totalRounds: number, roundIndex: number): string {
  const fromFinal = totalRounds - 1 - roundIndex;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semifinal';
  if (fromFinal === 2) return 'Quartas de Final';
  if (fromFinal === 3) return 'Oitavas de Final';
  return `Rodada ${roundIndex + 1}`;
}

function slotName(s: BracketSlot): string {
  if (!s) return '—';
  if (s === 'BYE') return 'BYE';
  return s.nome;
}

type Tela = 'torneios' | 'categorias' | 'bracket';

export function Chaves() {
  const [tela, setTela] = useState<Tela>('torneios');

  // Torneios
  const [torneios, setTorneios] = useState<Torneio[]>([]);
  const [torneioSelecionado, setTorneioSelecionado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Categorias
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);

  // Bracket
  const [bracket, setBracket] = useState<BracketRound[] | null>(null);
  const [campeao, setCampeao] = useState<string | null>(null);
  const [carregandoBracket, setCarregandoBracket] = useState(false);

  useEffect(() => {
    carregarTorneios();
  }, []);

  async function carregarTorneios() {
    setCarregando(true);
    const { data } = await supabase.from('torneios').select('*').eq('ativo', true).order('data', { ascending: false });
    setTorneios(data || []);
    setCarregando(false);
  }

  async function carregarCategorias() {
    const { data } = await supabase.from('categorias').select('*').order('nome');
    setCategorias(data || []);
  }

  async function carregarBracket(categoriaId: string) {
    setCarregandoBracket(true);
    const { data } = await supabase.from('brackets').select('*').eq('categoria_id', categoriaId).single();
    if (data) {
      setBracket(data.dados as BracketRound[]);
      setCampeao(data.campeao || null);
    } else {
      setBracket(null);
      setCampeao(null);
    }
    setCarregandoBracket(false);
  }

  function selecionarTorneio(id: string) {
    setTorneioSelecionado(id);
    carregarCategorias();
    setTela('categorias');
  }

  function selecionarCategoria(id: string) {
    setCategoriaSelecionada(id);
    carregarBracket(id);
    setTela('bracket');
  }

  function formatarData(data: string) {
    return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
  }

  const torneioNome = torneios.find((t) => t.id === torneioSelecionado)?.nome || '';
  const categoriaNome = categorias.find((c) => c.id === categoriaSelecionada)?.nome || '';

  // ── Tela 1: Torneios ──
  if (tela === 'torneios') {
    if (carregando) {
      return (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Carregando...</div>
        </div>
      );
    }

    if (torneios.length === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>Nenhum torneio cadastrado ainda.</div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', paddingTop: 16 }}>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>Torneios</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {torneios.map((t) => (
            <button
              key={t.id}
              onClick={() => selecionarTorneio(t.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '14px 16px',
                background: '#fff',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <span style={{ color: BLUE, fontWeight: 'bold', fontSize: 15, display: 'block' }}>{t.nome}</span>
              <span style={{ color: '#999', fontSize: 12 }}>{formatarData(t.data)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Tela 2: Categorias ──
  if (tela === 'categorias') {
    // Agrupar categorias por tipo principal
    const grupos: Record<string, Categoria[]> = {};
    for (const cat of categorias) {
      const partes = cat.nome.split(' - ');
      const principal = partes[0] || cat.nome;
      if (!grupos[principal]) grupos[principal] = [];
      grupos[principal].push(cat);
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', paddingTop: 16 }}>
        <button
          onClick={() => setTela('torneios')}
          style={{ color: '#fff', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, textAlign: 'left' }}
        >
          ← Voltar
        </button>

        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>{torneioNome}</p>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 }}>Categorias</h2>

        {categorias.length === 0 ? (
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center' }}>Nenhuma categoria cadastrada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(grupos).map(([grupo, cats]) => (
              <div key={grupo}>
                <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{grupo}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cats.map((cat) => {
                    const sub = cat.nome.split(' - ')[1] || cat.nome;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => selecionarCategoria(cat.id)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          borderRadius: 10,
                          border: '1px solid rgba(255,255,255,0.2)',
                          background: 'rgba(255,255,255,0.08)',
                          color: '#fff',
                          fontSize: 14,
                          fontWeight: 500,
                          textAlign: 'left',
                          cursor: 'pointer',
                        }}
                      >
                        {sub}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Tela 3: Bracket (somente visualizacao) ──
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', paddingTop: 16 }}>
      <button
        onClick={() => setTela('categorias')}
        style={{ color: '#fff', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16, textAlign: 'left' }}
      >
        ← Voltar
      </button>

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>{torneioNome}</p>
      <h2 style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 }}>{categoriaNome}</h2>

      {carregandoBracket ? (
        <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.5)' }}>Carregando...</div>
      ) : !bracket ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
          Chave ainda nao foi sorteada para esta categoria.
        </p>
      ) : (
        <>
          {/* Campeao */}
          {campeao && (
            <div style={{ textAlign: 'center', marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 14, flexShrink: 0 }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
              <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 'bold' }}>{campeao}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>Campeao!</div>
            </div>
          )}

          {/* Bracket visual - somente leitura */}
          <div style={{ overflow: 'auto', flex: 1, paddingBottom: 16 }}>
            <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 40, padding: '0 8px' }}>
              {bracket.map((round, rIdx) => {
                const SLOT_H = 30;
                const MATCH_H = SLOT_H * 2;
                const BASE_GAP = 40;
                const r0Step = MATCH_H + BASE_GAP;
                const stepSize = r0Step * Math.pow(2, rIdx);
                const topPad = (r0Step / 2) * (Math.pow(2, rIdx) - 1);
                const COL_W = 200;

                return (
                  <div key={rIdx} style={{ flexShrink: 0, width: COL_W, position: 'relative' }}>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, textAlign: 'center', marginBottom: 16, fontWeight: 700, letterSpacing: 1, lineHeight: '14px' }}>
                      {getNomeRodada(bracket.length, rIdx)}
                    </div>
                    {round.map((match, mIdx) => {
                      const aIsBye = match.a === 'BYE';
                      const bIsBye = match.b === 'BYE';

                      return (
                        <div
                          key={mIdx}
                          style={{
                            marginTop: mIdx === 0 ? topPad : stepSize - MATCH_H,
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.15)',
                          }}
                        >
                          <div
                            style={{
                              padding: '0 14px',
                              height: SLOT_H,
                              fontSize: 14,
                              fontWeight: match.winner === 'a' ? 'bold' : 'normal',
                              color: aIsBye ? 'rgba(255,255,255,0.2)' : '#fff',
                              background: match.winner === 'a' ? 'rgba(46,204,113,0.4)' : 'transparent',
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {match.winner === 'a' && <span style={{ color: '#2ecc71', marginRight: 6 }}>✓</span>}
                            {slotName(match.a)}
                          </div>
                          <div
                            style={{
                              padding: '0 14px',
                              height: SLOT_H,
                              fontSize: 14,
                              fontWeight: match.winner === 'b' ? 'bold' : 'normal',
                              color: bIsBye ? 'rgba(255,255,255,0.2)' : '#fff',
                              background: match.winner === 'b' ? 'rgba(46,204,113,0.4)' : 'transparent',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {match.winner === 'b' && <span style={{ color: '#2ecc71', marginRight: 6 }}>✓</span>}
                            {slotName(match.b)}
                          </div>
                        </div>
                      );
                    })}

                    {/* Connector lines */}
                    {rIdx < bracket.length - 1 && (() => {
                      const labelH = 30;
                      const totalH = labelH + topPad + (round.length - 1) * stepSize + MATCH_H;
                      return (
                        <svg
                          style={{
                            position: 'absolute',
                            right: -40,
                            top: 0,
                            width: 40,
                            height: totalH,
                            pointerEvents: 'none',
                          }}
                        >
                          {round.map((_, mIdx) => {
                            if (mIdx % 2 !== 0) return null;
                            const y1 = labelH + topPad + mIdx * stepSize + MATCH_H / 2;
                            const y2 = labelH + topPad + (mIdx + 1) * stepSize + MATCH_H / 2;
                            const mid = (y1 + y2) / 2;
                            return (
                              <g key={mIdx}>
                                <line x1="0" y1={y1} x2="16" y2={y1} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                <line x1="0" y1={y2} x2="16" y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                <line x1="16" y1={y1} x2="16" y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                                <line x1="16" y1={mid} x2="40" y2={mid} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
