import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useFooter } from '../App';

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
  scoreA?: number | null;
  scoreB?: number | null;
}
type BracketRound = BracketMatch[];

function slotName(s: BracketSlot): string {
  if (!s) return '—';
  if (s === 'BYE') return 'BYE';
  return s.nome;
}

type Tela = 'torneios' | 'categorias' | 'bracket';

export function Chaves() {
  const [tela, setTela] = useState<Tela>('torneios');
  const { setHideFooter } = useFooter();

  useEffect(() => {
    setHideFooter(tela === 'bracket');
    return () => setHideFooter(false);
  }, [tela]);

  // Torneios
  const [torneios, setTorneios] = useState<Torneio[]>([]);
  const [torneioSelecionado, setTorneioSelecionado] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Categorias
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);

  // Bracket / Round Robin / Duas Chaves / Double Elim
  const [bracket, setBracket] = useState<BracketRound[] | null>(null);
  const [roundRobin, setRoundRobin] = useState<any>(null);
  const [duasChaves, setDuasChaves] = useState<any>(null);
  const [campeao, setCampeao] = useState<string | null>(null);
  const [carregandoBracket, setCarregandoBracket] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [statsSort, setStatsSort] = useState<'v' | 'd' | 'pts'>('v');

  function getStatsFromRounds(rounds: BracketRound[]): { nome: string; v: number; d: number; pts: number; ptsSof: number }[] {
    const stats: Record<string, { nome: string; v: number; d: number; pts: number; ptsSof: number }> = {};
    for (const round of rounds) {
      for (const match of round) {
        if (!match.a || !match.b || match.a === 'BYE' || match.b === 'BYE' || !match.winner) continue;
        const nA = slotName(match.a); const nB = slotName(match.b);
        const idA = typeof match.a === 'object' ? match.a.id : ''; const idB = typeof match.b === 'object' ? match.b.id : '';
        if (!stats[idA]) stats[idA] = { nome: nA, v: 0, d: 0, pts: 0, ptsSof: 0 };
        if (!stats[idB]) stats[idB] = { nome: nB, v: 0, d: 0, pts: 0, ptsSof: 0 };
        stats[idA].pts += match.scoreA || 0; stats[idA].ptsSof += match.scoreB || 0;
        stats[idB].pts += match.scoreB || 0; stats[idB].ptsSof += match.scoreA || 0;
        if (match.winner === 'a') { stats[idA].v++; stats[idB].d++; } else { stats[idB].v++; stats[idA].d++; }
      }
    }
    return Object.values(stats);
  }

  function getAllStatsPublic() {
    let all: { nome: string; v: number; d: number; pts: number; ptsSof: number }[] = [];
    if (bracket) all = getStatsFromRounds(bracket);
    else if (duasChaves) {
      const merged: Record<string, typeof all[0]> = {};
      for (const s of [...getStatsFromRounds(duasChaves.chaveA), ...getStatsFromRounds(duasChaves.chaveB)]) {
        if (!merged[s.nome]) merged[s.nome] = { ...s };
        else { merged[s.nome].v += s.v; merged[s.nome].d += s.d; merged[s.nome].pts += s.pts; merged[s.nome].ptsSof += s.ptsSof; }
      }
      all = Object.values(merged);
    } else if (roundRobin) {
      const stats: Record<string, typeof all[0]> = {};
      for (const j of roundRobin.jogos) {
        if (!stats[j.a.id]) stats[j.a.id] = { nome: j.a.nome, v: 0, d: 0, pts: 0, ptsSof: 0 };
        if (!stats[j.b.id]) stats[j.b.id] = { nome: j.b.nome, v: 0, d: 0, pts: 0, ptsSof: 0 };
        if (j.winner) {
          stats[j.a.id].pts += j.scoreA || 0; stats[j.a.id].ptsSof += j.scoreB || 0;
          stats[j.b.id].pts += j.scoreB || 0; stats[j.b.id].ptsSof += j.scoreA || 0;
          if (j.winner === 'a') { stats[j.a.id].v++; stats[j.b.id].d++; } else { stats[j.b.id].v++; stats[j.a.id].d++; }
        }
      }
      all = Object.values(stats);
    }
    if (statsSort === 'v') all.sort((a, b) => b.v - a.v || b.pts - a.pts);
    else if (statsSort === 'd') all.sort((a, b) => a.d - b.d || b.v - a.v);
    else all.sort((a, b) => b.pts - a.pts || b.v - a.v);
    return all;
  }

  useEffect(() => {
    carregarTorneios();
  }, []);

  async function carregarTorneios() {
    setCarregando(true);
    const { data } = await supabase.from('torneios').select('*').eq('ativo', true).eq('fixado', true).order('data', { ascending: false });
    setTorneios(data || []);
    setCarregando(false);
  }

  async function carregarCategorias(torneioId: string) {
    const { data: allCats } = await supabase.from('categorias').select('*').eq('torneio_id', torneioId).eq('ativo', true).order('nome');
    if (!allCats || allCats.length === 0) {
      setCategorias([]);
      return;
    }
    // Filtrar apenas categorias que tem bracket
    const { data: brackets } = await supabase.from('brackets').select('categoria_id').eq('ativo', true);
    const catIdsComBracket = new Set((brackets || []).map((b: any) => b.categoria_id));
    setCategorias(allCats.filter((c) => catIdsComBracket.has(c.id)));
  }

  async function carregarBracket(categoriaId: string) {
    setCarregandoBracket(true);
    const { data } = await supabase.from('brackets').select('*').eq('categoria_id', categoriaId).eq('ativo', true).single();
    if (data) {
      const dados = data.dados as any;
      if (dados?.tipo === 'todos_contra_todos') {
        setRoundRobin(dados);
        setBracket(null);
        setDuasChaves(null);
      } else if (dados?.tipo === 'duas_chaves') {
        setDuasChaves(dados);
        setBracket(null);
        setRoundRobin(null);
  
      } else {
        setBracket(dados as BracketRound[]);
        setRoundRobin(null);
        setDuasChaves(null);
      }
      setCampeao(data.campeao || null);
    } else {
      setBracket(null);
      setRoundRobin(null);
      setDuasChaves(null);

      setCampeao(null);
    }
    setCarregandoBracket(false);
  }

  function selecionarTorneio(id: string) {
    setTorneioSelecionado(id);
    carregarCategorias(id);
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

  function formatarPeriodo(t: Torneio) {
    const inicio = (t as any).data_inicio;
    const fim = (t as any).data_fim;
    if (inicio && fim) {
      return `${formatarData(inicio)} a ${formatarData(fim)}`;
    }
    return formatarData(t.data);
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
              <span style={{ color: '#999', fontSize: 12 }}>{formatarPeriodo(t)}</span>
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
      ) : !bracket && !roundRobin && !duasChaves ? (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textAlign: 'center', marginTop: 20 }}>
          Chave ainda nao foi sorteada para esta categoria.
        </p>
      ) : roundRobin ? (
        <>
          {/* Campeao RR */}
          {campeao && (
            <div style={{ textAlign: 'center', marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 14, flexShrink: 0 }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
              <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 'bold' }}>{campeao}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                {categoriaNome.toLowerCase().startsWith('feminino') ? 'Campeãs!' : 'Campeões!'}
              </div>
            </div>
          )}
          {/* Classificacao */}
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Classificacao</h3>
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                <span style={{ width: 24 }}>#</span>
                <span style={{ flex: 1 }}>Dupla</span>
                <span style={{ width: 30, textAlign: 'center' }}>V</span>
                <span style={{ width: 30, textAlign: 'center' }}>D</span>
                <span style={{ width: 30, textAlign: 'center' }}>J</span>
              </div>
              {(() => {
                const stats: Record<string, { nome: string; v: number; d: number; j: number }> = {};
                for (const jogo of roundRobin.jogos) {
                  if (!stats[jogo.a.id]) stats[jogo.a.id] = { nome: jogo.a.nome, v: 0, d: 0, j: 0 };
                  if (!stats[jogo.b.id]) stats[jogo.b.id] = { nome: jogo.b.nome, v: 0, d: 0, j: 0 };
                  if (jogo.winner) {
                    stats[jogo.a.id].j++; stats[jogo.b.id].j++;
                    if (jogo.winner === 'a') { stats[jogo.a.id].v++; stats[jogo.b.id].d++; }
                    else { stats[jogo.b.id].v++; stats[jogo.a.id].d++; }
                  }
                }
                return Object.values(stats).sort((a, b) => b.v - a.v).map((s, i) => (
                  <div key={i} style={{ display: 'flex', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, color: '#fff', fontWeight: i === 0 ? 'bold' : 'normal', background: i === 0 ? 'rgba(46,204,113,0.15)' : 'transparent' }}>
                    <span style={{ width: 24, color: 'rgba(255,255,255,0.4)' }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>{s.nome}</span>
                    <span style={{ width: 30, textAlign: 'center', color: '#2ecc71' }}>{s.v}</span>
                    <span style={{ width: 30, textAlign: 'center', color: '#e74c3c' }}>{s.d}</span>
                    <span style={{ width: 30, textAlign: 'center' }}>{s.j}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
          {/* Jogos */}
          <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Jogos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {roundRobin.jogos.map((jogo: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: jogo.winner === 'a' ? 'bold' : 'normal', color: '#fff', background: jogo.winner === 'a' ? 'rgba(46,204,113,0.4)' : 'transparent', borderRight: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {jogo.winner === 'a' && '✓ '}{jogo.a.nome}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: '0 8px' }}>vs</span>
                <div style={{ flex: 1, padding: '10px 12px', fontSize: 13, fontWeight: jogo.winner === 'b' ? 'bold' : 'normal', color: '#fff', background: jogo.winner === 'b' ? 'rgba(46,204,113,0.4)' : 'transparent', borderLeft: '1px solid rgba(255,255,255,0.1)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {jogo.b.nome}{jogo.winner === 'b' && ' ✓'}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : duasChaves ? (
        (() => {
          const SH = 30; const MH = SH * 2; const BG = 40;
          const renderRoundsRO = (rounds: any[], mirrored: boolean) => (
            <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 40, flexDirection: mirrored ? 'row-reverse' : 'row' }}>
              {rounds.map((round: any, rIdx: number) => {
                const r0 = MH + BG; const ss = r0 * Math.pow(2, rIdx); const tp = (r0 / 2) * (Math.pow(2, rIdx) - 1);
                return (
                  <div key={rIdx} style={{ flexShrink: 0, width: 160, position: 'relative' }}>
                    {round.map((match: any, mIdx: number) => (
                      <div key={mIdx} style={{ marginTop: mIdx === 0 ? tp : ss - MH, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.15)' }}>
                        <div style={{ padding: '0 10px', height: SH, fontSize: 12, fontWeight: match.winner === 'a' ? 'bold' : 'normal', color: match.a === 'BYE' ? 'rgba(255,255,255,0.2)' : '#fff', background: match.winner === 'a' ? 'rgba(46,204,113,0.4)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {match.winner === 'a' && <span style={{ color: '#2ecc71', marginRight: 4 }}>✓</span>}<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{slotName(match.a)}</span>{match.scoreA != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{match.scoreA}</span>}
                        </div>
                        <div style={{ padding: '0 10px', height: SH, fontSize: 12, fontWeight: match.winner === 'b' ? 'bold' : 'normal', color: match.b === 'BYE' ? 'rgba(255,255,255,0.2)' : '#fff', background: match.winner === 'b' ? 'rgba(46,204,113,0.4)' : 'transparent', display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {match.winner === 'b' && <span style={{ color: '#2ecc71', marginRight: 4 }}>✓</span>}<span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{slotName(match.b)}</span>{match.scoreB != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{match.scoreB}</span>}
                        </div>
                      </div>
                    ))}
                    {rIdx < rounds.length - 1 && (() => {
                      const th = tp + (round.length - 1) * ss + SH * 2;
                      return (
                        <svg style={{ position: 'absolute', [mirrored ? 'left' : 'right']: -40, top: 0, width: 40, height: th, pointerEvents: 'none', transform: mirrored ? 'scaleX(-1)' : 'none' }}>
                          {round.map((_: any, mi: number) => { if (mi % 2 !== 0) return null; const y1 = tp + mi * ss + SH; const y2 = tp + (mi + 1) * ss + SH; const md = (y1 + y2) / 2; return (<g key={mi}><line x1="0" y1={y1} x2="16" y2={y1} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" /><line x1="0" y1={y2} x2="16" y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" /><line x1="16" y1={y1} x2="16" y2={y2} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" /><line x1="16" y1={md} x2="40" y2={md} stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" /></g>); })}
                        </svg>
                      );
                    })()}
                  </div>
                );
              })}
            </div>
          );
          const f = duasChaves.final;
          return (
            <>
              {campeao && (
                <div style={{ textAlign: 'center', marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 14, flexShrink: 0 }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
                  <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 'bold' }}>{campeao}</div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                    {categoriaNome.toLowerCase().startsWith('feminino') ? 'Campeãs!' : 'Campeões!'}
                  </div>
                </div>
              )}
              <div style={{ overflow: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20, justifyContent: 'center', minWidth: 'fit-content', padding: '0 8px' }}>
                  <div>
                    <h3 style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Chave A</h3>
                    {renderRoundsRO(duasChaves.chaveA, false)}
                  </div>
                  {f && (
                    <div style={{ flexShrink: 0 }}>
                      <h3 style={{ color: '#ffd700', fontSize: 12, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Final</h3>
                      <div style={{ borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(255,215,0,0.4)', background: 'rgba(0,0,0,0.2)', width: 150 }}>
                        <div style={{ padding: '0 10px', height: 32, fontSize: 12, fontWeight: f.winner === 'a' ? 'bold' : 'normal', color: '#fff', background: f.winner === 'a' ? 'rgba(46,204,113,0.4)' : 'transparent', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center' }}>{f.winner === 'a' && <span style={{ color: '#2ecc71', marginRight: 4 }}>✓</span>}{slotName(f.a)}</div>
                        <div style={{ padding: '0 10px', height: 32, fontSize: 12, fontWeight: f.winner === 'b' ? 'bold' : 'normal', color: '#fff', background: f.winner === 'b' ? 'rgba(46,204,113,0.4)' : 'transparent', display: 'flex', alignItems: 'center' }}>{f.winner === 'b' && <span style={{ color: '#2ecc71', marginRight: 4 }}>✓</span>}{slotName(f.b)}</div>
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 style={{ color: '#fff', fontSize: 12, fontWeight: 700, marginBottom: 6, textAlign: 'center' }}>Chave B</h3>
                    {renderRoundsRO(duasChaves.chaveB, true)}
                  </div>
                </div>
              </div>
            </>
          );
        })()
      ) : bracket ? (
        <>
          {/* Campeao */}
          {campeao && (
            <div style={{ textAlign: 'center', marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 14, flexShrink: 0 }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
              <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 'bold' }}>{campeao}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                {categoriaNome.toLowerCase().startsWith('feminino') ? 'Campeãs!' : 'Campeões!'}
              </div>
            </div>
          )}

          {/* Bracket visual - somente leitura */}
          {bracket && <div style={{ overflow: 'auto', flex: 1, paddingBottom: 16 }}>
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
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{slotName(match.a)}</span>
                            {match.scoreA != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{match.scoreA}</span>}
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
                            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{slotName(match.b)}</span>
                            {match.scoreB != null && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{match.scoreB}</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* Connector lines */}
                    {rIdx < bracket.length - 1 && (() => {
                      const labelH = 0;
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
          </div>}
        </>
      ) : null}

      {/* Botao Estatisticas - aparece em todos os modos */}
      {(bracket || duasChaves || roundRobin) && (
        <>
          <button
            onClick={() => setShowStats(true)}
            style={{ width: '100%', padding: 12, borderRadius: 12, border: '2px solid rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 'bold', color: '#fff', background: 'transparent', cursor: 'pointer', marginTop: 12, flexShrink: 0 }}
          >
            Estatisticas
          </button>

          {showStats && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }} onClick={() => setShowStats(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: '20px 16px', maxWidth: 420, width: '95%', maxHeight: '80vh', overflow: 'auto' }}>
                <h3 style={{ color: '#113776', fontSize: 16, fontWeight: 700, marginBottom: 12, textAlign: 'center' }}>Estatisticas</h3>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, justifyContent: 'center' }}>
                  {(['v', 'd', 'pts'] as const).map((s) => (
                    <button key={s} onClick={() => setStatsSort(s)} style={{ padding: '6px 14px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer', background: statsSort === s ? '#113776' : '#eee', color: statsSort === s ? '#fff' : '#666' }}>
                      {s === 'v' ? 'Vitorias' : s === 'd' ? 'Derrotas' : 'Pontos'}
                    </button>
                  ))}
                </div>
                <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #eee' }}>
                  <div style={{ display: 'flex', padding: '8px 10px', background: '#f5f5f5', fontSize: 11, fontWeight: 600, color: '#999' }}>
                    <span style={{ width: 22 }}>#</span><span style={{ flex: 1 }}>Dupla</span><span style={{ width: 28, textAlign: 'center' }}>V</span><span style={{ width: 28, textAlign: 'center' }}>D</span><span style={{ width: 36, textAlign: 'center' }}>Pts</span><span style={{ width: 36, textAlign: 'center' }}>Sof</span>
                  </div>
                  {getAllStatsPublic().map((s, i) => (
                    <div key={i} style={{ display: 'flex', padding: '8px 10px', borderTop: '1px solid #f0f0f0', fontSize: 13, color: '#113776', fontWeight: i === 0 ? 'bold' : 'normal', background: i === 0 ? 'rgba(46,204,113,0.08)' : '#fff' }}>
                      <span style={{ width: 22, color: '#999' }}>{i + 1}</span><span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nome}</span><span style={{ width: 28, textAlign: 'center', color: '#2ecc71' }}>{s.v}</span><span style={{ width: 28, textAlign: 'center', color: '#e74c3c' }}>{s.d}</span><span style={{ width: 36, textAlign: 'center' }}>{s.pts}</span><span style={{ width: 36, textAlign: 'center', color: '#999' }}>{s.ptsSof}</span>
                    </div>
                  ))}
                  {getAllStatsPublic().length === 0 && (
                    <div style={{ padding: 16, textAlign: 'center', color: '#999', fontSize: 13 }}>Nenhum jogo com placar.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
