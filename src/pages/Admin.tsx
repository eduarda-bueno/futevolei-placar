import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useFooter } from '../App';

interface Torneio {
  id: string;
  nome: string;
  data: string;
}

interface Categoria {
  id: string;
  nome: string;
}

interface Dupla {
  id: string;
  categoria_id: string;
  jogador1: string;
  jogador2: string;
}

interface AdminProps {
  onLogout: () => void;
}

const BLUE = '#113776';

const CATEGORIAS_PRINCIPAIS = ['Feminino', 'Masculino', 'Misto'];
const SUBCATEGORIAS = ['Estreante', 'Iniciante', 'Intermediário', 'Avançado', '30+'];

type Etapa = 'torneio' | 'categoria' | 'subcategoria' | 'painel';

// ── Bracket types ──
type BracketSlot = { nome: string; id: string } | 'BYE' | null;
interface BracketMatch {
  a: BracketSlot;
  b: BracketSlot;
  winner: 'a' | 'b' | null;
}
type BracketRound = BracketMatch[];

// ── Round Robin types ──
interface RRMatch {
  a: { nome: string; id: string };
  b: { nome: string; id: string };
  winner: 'a' | 'b' | null;
}

interface RoundRobinData {
  tipo: 'todos_contra_todos';
  jogos: RRMatch[];
}

type TipoTorneio = 'eliminatorio' | 'todos_contra_todos';

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

function buildBracket(duplasList: Dupla[]): BracketRound[] {
  const shuffled = [...duplasList].sort(() => Math.random() - 0.5);
  const teams: BracketSlot[] = shuffled.map((d) => ({
    nome: d.jogador1 + (d.jogador2 ? ` e ${d.jogador2}` : ''),
    id: d.id,
  }));

  // Next power of 2
  let size = 1;
  while (size < teams.length) size *= 2;
  const byeCount = size - teams.length;

  // Build seeded list: teams fill first, BYEs at the end of each pair
  // This ensures BYEs are spread evenly and always in slot B position
  const seeded: BracketSlot[] = new Array(size).fill(null);

  // Place all teams first
  for (let i = 0; i < teams.length; i++) {
    seeded[i] = teams[i];
  }
  // Fill remaining with BYE
  for (let i = teams.length; i < size; i++) {
    seeded[i] = 'BYE';
  }

  // Now interleave so BYEs spread across the bracket (not all at bottom)
  // Use standard tournament seeding: 1v16, 8v9, 5v12, 4v13, etc.
  // Simpler: just ensure BYEs pair with real teams by swapping
  // Put BYE always as slot B in a match, spread across top and bottom
  const paired: BracketSlot[] = new Array(size).fill(null);
  const realTeams = seeded.filter((s) => s !== 'BYE');
  const totalMatches = size / 2;

  // Matches that get a BYE (spread from the end, every other match)
  const byeMatchIndices: number[] = [];
  for (let i = 0; i < byeCount; i++) {
    // Spread BYEs: alternate top and bottom of bracket
    if (i % 2 === 0) {
      byeMatchIndices.push(totalMatches - 1 - Math.floor(i / 2));
    } else {
      byeMatchIndices.push(Math.floor(i / 2));
    }
  }

  let teamIdx = 0;
  for (let m = 0; m < totalMatches; m++) {
    const isBye = byeMatchIndices.includes(m);
    paired[m * 2] = realTeams[teamIdx++];
    paired[m * 2 + 1] = isBye ? 'BYE' : realTeams[teamIdx++];
  }

  // Build first round
  const firstRound: BracketRound = [];
  for (let i = 0; i < size; i += 2) {
    const match: BracketMatch = { a: paired[i], b: paired[i + 1], winner: null };
    if (match.b === 'BYE' && match.a && match.a !== 'BYE') {
      match.winner = 'a';
    } else if (match.a === 'BYE' && match.b && match.b !== 'BYE') {
      match.winner = 'b';
    }
    firstRound.push(match);
  }

  const rounds: BracketRound[] = [firstRound];
  let prevRound = firstRound;

  while (prevRound.length > 1) {
    const nextRound: BracketRound = [];
    for (let i = 0; i < prevRound.length; i += 2) {
      const winnerA = prevRound[i].winner ? prevRound[i][prevRound[i].winner!] : null;
      const winnerB = prevRound[i + 1]?.winner ? prevRound[i + 1][prevRound[i + 1].winner!] : null;
      nextRound.push({ a: winnerA, b: winnerB, winner: null });
    }
    rounds.push(nextRound);
    prevRound = nextRound;
  }

  return rounds;
}

function propagateWinners(rounds: BracketRound[]): BracketRound[] {
  const updated = rounds.map((r) => r.map((m) => ({ ...m })));

  for (let r = 1; r < updated.length; r++) {
    for (let m = 0; m < updated[r].length; m++) {
      const srcA = updated[r - 1][m * 2];
      const srcB = updated[r - 1][m * 2 + 1];
      updated[r][m].a = srcA?.winner ? srcA[srcA.winner] : null;
      updated[r][m].b = srcB?.winner ? srcB[srcB.winner] : null;
      // If a slot becomes null and there was a winner, clear it
      if (!updated[r][m].a || !updated[r][m].b) {
        updated[r][m].winner = null;
      }
    }
  }

  return updated;
}

export function Admin({ onLogout }: AdminProps) {
  const [etapa, setEtapa] = useState<Etapa>('torneio');
  const [categoriaPrincipal, setCategoriaPrincipal] = useState('');

  // Torneio
  const [torneios, setTorneios] = useState<Torneio[]>([]);
  const [torneioSelecionado, setTorneioSelecionado] = useState<string | null>(null);
  const [novoTorneioNome, setNovoTorneioNome] = useState('');
  const [novoTorneioInicio, setNovoTorneioInicio] = useState('');
  const [novoTorneioFim, setNovoTorneioFim] = useState('');
  const [showCriarPopup, setShowCriarPopup] = useState(false);

  // Categorias, duplas
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [duplas, setDuplas] = useState<Dupla[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);

  // Forms
  const [novoJogador1, setNovoJogador1] = useState('');

  // Bracket
  const [bracket, setBracket] = useState<BracketRound[] | null>(null);
  const [campeao, setCampeao] = useState<string | null>(null);
  const [modoTroca, setModoTroca] = useState(false);
  const [trocaSelecionada, setTrocaSelecionada] = useState<{ round: number; match: number; side: 'a' | 'b' } | null>(null);
  const [showFixarPopup, setShowFixarPopup] = useState(false);
  const [verBracket, setVerBracket] = useState(false);
  const [roundRobin, setRoundRobin] = useState<RoundRobinData | null>(null);
  const [tipoSorteio, setTipoSorteio] = useState<TipoTorneio | null>(null);
  const { setHideFooter } = useFooter();

  useEffect(() => {
    setHideFooter(verBracket && !!(bracket || roundRobin));
    return () => setHideFooter(false);
  }, [verBracket, bracket, roundRobin]);

  useEffect(() => {
    carregarTorneios();
  }, []);

  useEffect(() => {
    if (categoriaSelecionada) {
      carregarDuplas(categoriaSelecionada);
      carregarBracket(categoriaSelecionada);
    }
  }, [categoriaSelecionada]);

  async function carregarTorneios() {
    const { data } = await supabase.from('torneios').select('*').eq('ativo', true).order('data', { ascending: false });
    setTorneios(data || []);
  }

  async function criarTorneio(e: React.FormEvent) {
    e.preventDefault();
    if (!novoTorneioNome.trim() || !novoTorneioInicio || !novoTorneioFim) return;
    await supabase.from('torneios').insert({
      nome: novoTorneioNome.trim(),
      data: novoTorneioInicio,
      data_inicio: novoTorneioInicio,
      data_fim: novoTorneioFim,
    });
    setNovoTorneioNome('');
    setNovoTorneioInicio('');
    setNovoTorneioFim('');
    carregarTorneios();
  }

  async function excluirTorneio(id: string) {
    if (!confirm('Excluir torneio?')) return;
    await supabase.from('torneios').update({ ativo: false }).eq('id', id);
    if (torneioSelecionado === id) setTorneioSelecionado(null);
    carregarTorneios();
  }

  function selecionarTorneio(id: string) {
    setTorneioSelecionado(id);
    setCategorias([]);
    setDuplas([]);
    setBracket(null);
    setCampeao(null);
    setCategoriaSelecionada(null);
    setVerBracket(false);
    // carregarCategorias precisa do torneioSelecionado atualizado
    // então usamos o id diretamente
    supabase.from('categorias').select('*').eq('torneio_id', id).eq('ativo', true).order('nome').then(({ data }) => {
      setCategorias(data || []);
    });
    setEtapa('categoria');
  }

  async function carregarCategorias() {
    if (!torneioSelecionado) return;
    const { data } = await supabase.from('categorias').select('*').eq('torneio_id', torneioSelecionado).eq('ativo', true).order('nome');
    setCategorias(data || []);
  }

  async function carregarDuplas(categoriaId: string) {
    const { data } = await supabase.from('duplas').select('*').eq('categoria_id', categoriaId).eq('ativo', true).order('jogador1');
    setDuplas(data || []);
  }

  async function carregarBracket(categoriaId: string) {
    const { data } = await supabase.from('brackets').select('*').eq('categoria_id', categoriaId).eq('ativo', true).single();
    if (data) {
      const dados = data.dados as any;
      if (dados?.tipo === 'todos_contra_todos') {
        setRoundRobin(dados as RoundRobinData);
        setBracket(null);
        setTipoSorteio('todos_contra_todos');
      } else {
        setBracket(dados as BracketRound[]);
        setRoundRobin(null);
        setTipoSorteio('eliminatorio');
      }
      setCampeao(data.campeao || null);
    } else {
      setBracket(null);
      setRoundRobin(null);
      setCampeao(null);
      setTipoSorteio(null);
    }
  }

  async function salvarDados(dados: any, champ: string | null) {
    if (!categoriaSelecionada) return;
    await supabase.from('brackets').upsert({
      categoria_id: categoriaSelecionada,
      dados,
      campeao: champ,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'categoria_id' });
  }

  function torneioFixado(): boolean {
    const t = torneios.find((t) => t.id === torneioSelecionado);
    return !!(t && (t as any).fixado);
  }

  async function toggleFixarTorneio() {
    if (!torneioSelecionado) return;
    const novoValor = !torneioFixado();
    await supabase.from('torneios').update({ fixado: novoValor }).eq('id', torneioSelecionado);
    await carregarTorneios();
    setShowFixarPopup(false);
  }

  // ── Round Robin ──
  function gerarRoundRobin() {
    if (duplas.length < 2) return;
    const teams = duplas.map((d) => ({
      nome: d.jogador1 + (d.jogador2 ? ` e ${d.jogador2}` : ''),
      id: d.id,
    }));
    // Shuffle
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    // Generate all pairs
    const jogos: RRMatch[] = [];
    for (let i = 0; i < shuffled.length; i++) {
      for (let j = i + 1; j < shuffled.length; j++) {
        jogos.push({ a: shuffled[i], b: shuffled[j], winner: null });
      }
    }
    const data: RoundRobinData = { tipo: 'todos_contra_todos', jogos };
    setRoundRobin(data);
    setBracket(null);
    setTipoSorteio('todos_contra_todos');
    setCampeao(null);
    setVerBracket(true);
    salvarDados(data, null);
  }

  function selecionarVencedorRR(idx: number, side: 'a' | 'b') {
    if (!roundRobin) return;
    const updated = { ...roundRobin, jogos: roundRobin.jogos.map((j, i) => i === idx ? { ...j, winner: j.winner === side ? null : side } : j) };
    setRoundRobin(updated);

    // Calcular classificacao e ver se tem campeao
    const stats: Record<string, { nome: string; v: number }> = {};
    let todosJogados = true;
    for (const j of updated.jogos) {
      if (!stats[j.a.id]) stats[j.a.id] = { nome: j.a.nome, v: 0 };
      if (!stats[j.b.id]) stats[j.b.id] = { nome: j.b.nome, v: 0 };
      if (j.winner === 'a') stats[j.a.id].v++;
      else if (j.winner === 'b') stats[j.b.id].v++;
      else todosJogados = false;
    }
    const champ = todosJogados
      ? Object.values(stats).sort((a, b) => b.v - a.v)[0]?.nome || null
      : null;
    setCampeao(champ);
    salvarDados(updated, champ);
  }

  function getClassificacao(): { nome: string; v: number; d: number; j: number }[] {
    if (!roundRobin) return [];
    const stats: Record<string, { nome: string; v: number; d: number; j: number }> = {};
    for (const jogo of roundRobin.jogos) {
      if (!stats[jogo.a.id]) stats[jogo.a.id] = { nome: jogo.a.nome, v: 0, d: 0, j: 0 };
      if (!stats[jogo.b.id]) stats[jogo.b.id] = { nome: jogo.b.nome, v: 0, d: 0, j: 0 };
      if (jogo.winner) {
        stats[jogo.a.id].j++;
        stats[jogo.b.id].j++;
        if (jogo.winner === 'a') { stats[jogo.a.id].v++; stats[jogo.b.id].d++; }
        else { stats[jogo.b.id].v++; stats[jogo.a.id].d++; }
      }
    }
    return Object.values(stats).sort((a, b) => b.v - a.v);
  }

  function selecionarCategoriaPrincipal(nome: string) {
    setCategoriaPrincipal(nome);
    setEtapa('subcategoria');
  }

  async function selecionarSubcategoria(sub: string) {
    const nomeCompleto = `${categoriaPrincipal} - ${sub}`;
    let cat = categorias.find((c) => c.nome === nomeCompleto);
    if (!cat) {
      const { data } = await supabase.from('categorias').insert({ nome: nomeCompleto, torneio_id: torneioSelecionado }).select().single();
      if (data) {
        cat = data;
        await carregarCategorias();
      }
    }
    if (cat) {
      setCategoriaSelecionada(cat.id);
      setBracket(null);
      setCampeao(null);
      setEtapa('painel');
    }
  }

  async function adicionarDupla(e: React.FormEvent) {
    e.preventDefault();
    if (!novoJogador1.trim() || !categoriaSelecionada) return;
    const texto = novoJogador1.trim();
    const partes = texto.split(/ e /i);
    const j1 = partes[0]?.trim() || '';
    const j2 = partes[1]?.trim() || '';
    await supabase.from('duplas').insert({
      categoria_id: categoriaSelecionada,
      jogador1: j1,
      jogador2: j2,
    });
    setNovoJogador1('');
    carregarDuplas(categoriaSelecionada);
  }

  async function excluirDupla(id: string) {
    if (!categoriaSelecionada) return;
    await supabase.from('duplas').update({ ativo: false }).eq('id', id);
    carregarDuplas(categoriaSelecionada);
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

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  // ── Bracket logic ──
  function sortearChave() {
    if (duplas.length < 2) return;
    const rounds = buildBracket(duplas);
    const propagated = propagateWinners(rounds);
    setBracket(propagated);
    setRoundRobin(null);
    setTipoSorteio('eliminatorio');
    setCampeao(null);
    setVerBracket(true);
    salvarDados(propagated, null);
  }

  function selecionarVencedor(roundIdx: number, matchIdx: number, side: 'a' | 'b') {
    if (!bracket) return;
    const match = bracket[roundIdx][matchIdx];
    const slot = match[side];
    if (!slot || slot === 'BYE') return;

    const updated = bracket.map((r) => r.map((m) => ({ ...m })));

    // If clicking the same winner, deselect
    if (updated[roundIdx][matchIdx].winner === side) {
      updated[roundIdx][matchIdx].winner = null;
    } else {
      updated[roundIdx][matchIdx].winner = side;
    }

    // Clear all subsequent rounds from this match forward
    for (let r = roundIdx + 1; r < updated.length; r++) {
      for (let m = 0; m < updated[r].length; m++) {
        updated[r][m].winner = null;
      }
    }

    const propagated = propagateWinners(updated);

    // Check champion
    const finalMatch = propagated[propagated.length - 1][0];
    let champ: string | null = null;
    if (finalMatch.winner) {
      const winnerSlot = finalMatch[finalMatch.winner];
      champ = winnerSlot && winnerSlot !== 'BYE' ? winnerSlot.nome : null;
    }
    setCampeao(champ);
    setBracket(propagated);
    salvarDados(propagated, champ);
  }

  function trocarDuplas(r1: number, m1: number, s1: 'a' | 'b', r2: number, m2: number, s2: 'a' | 'b') {
    if (!bracket) return;
    const updated = bracket.map((r) => r.map((m) => ({ ...m })));
    const temp = updated[r1][m1][s1];
    updated[r1][m1][s1] = updated[r2][m2][s2];
    updated[r2][m2][s2] = temp;

    // Reset all winners since positions changed
    for (const round of updated) {
      for (const match of round) {
        match.winner = null;
      }
    }

    // Re-apply BYE auto-advances in first round
    for (const match of updated[0]) {
      if (match.b === 'BYE' && match.a && match.a !== 'BYE') match.winner = 'a';
      else if (match.a === 'BYE' && match.b && match.b !== 'BYE') match.winner = 'b';
    }

    const propagated = propagateWinners(updated);
    setBracket(propagated);
    setCampeao(null);
    setModoTroca(false);
    setTrocaSelecionada(null);
    salvarDados(propagated, null);
  }

  function handleSlotClickTroca(rIdx: number, mIdx: number, side: 'a' | 'b') {
    if (!bracket) return;
    const slot = bracket[rIdx][mIdx][side];
    if (!slot || slot === 'BYE') return;

    if (!trocaSelecionada) {
      setTrocaSelecionada({ round: rIdx, match: mIdx, side });
    } else {
      trocarDuplas(trocaSelecionada.round, trocaSelecionada.match, trocaSelecionada.side, rIdx, mIdx, side);
    }
  }

  const categoriaNome = categorias.find((c) => c.id === categoriaSelecionada)?.nome || '';
  const torneioNome = torneios.find((t) => t.id === torneioSelecionado)?.nome || '';

  const btnVoltar = (onClick: () => void) => (
    <button onClick={onClick} style={{ color: '#fff', fontSize: 13, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
      ← Voltar
    </button>
  );

  const btnSair = (
    <button onClick={handleLogout} style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, background: 'none', border: 'none', cursor: 'pointer' }}>
      Sair
    </button>
  );

  // ── Etapa 1: Torneio ──
  if (etapa === 'torneio') {
    return (
      <div style={{ flex: 1, paddingTop: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>{btnSair}</div>

        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>Selecione ou adicione um torneio</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            placeholder="Nome do torneio"
            value={novoTorneioNome}
            onChange={(e) => setNovoTorneioNome(e.target.value)}
            style={{ flex: 1, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 12, padding: '12px 14px', fontSize: 14, outline: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
          />
          <button
            onClick={() => { if (novoTorneioNome.trim()) setShowCriarPopup(true); }}
            style={{ padding: '12px 20px', borderRadius: 12, border: 'none', fontSize: 14, fontWeight: 'bold', color: BLUE, background: '#fff', cursor: 'pointer', flexShrink: 0 }}
          >
            +
          </button>
        </div>

        {/* Popup criar torneio com datas */}
        {showCriarPopup && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}
            onClick={() => setShowCriarPopup(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, padding: '24px 20px', maxWidth: 340, width: '90%' }}
            >
              <h3 style={{ color: BLUE, fontSize: 16, fontWeight: 700, marginBottom: 16, textAlign: 'center' }}>{novoTorneioNome}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <div>
                  <label style={{ color: '#666', fontSize: 12, marginBottom: 4, display: 'block' }}>Data inicio</label>
                  <input
                    type="date"
                    value={novoTorneioInicio}
                    onChange={(e) => setNovoTorneioInicio(e.target.value)}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ color: '#666', fontSize: 12, marginBottom: 4, display: 'block' }}>Data fim</label>
                  <input
                    type="date"
                    value={novoTorneioFim}
                    onChange={(e) => setNovoTorneioFim(e.target.value)}
                    style={{ width: '100%', border: '1px solid #ddd', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none' }}
                  />
                </div>
              </div>
              <button
                onClick={(e) => { criarTorneio(e as any); setShowCriarPopup(false); }}
                style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', fontSize: 14, fontWeight: 'bold', color: '#fff', background: BLUE, cursor: 'pointer' }}
              >
                Criar Torneio
              </button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {torneios.map((t) => {
            const isFixado = !!(t as any).fixado;
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', background: '#fff', borderRadius: 12, overflow: 'hidden' }}>
                <button onClick={() => selecionarTorneio(t.id)} style={{ flex: 1, textAlign: 'left', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <span style={{ color: BLUE, fontWeight: 'bold', fontSize: 15, display: 'block' }}>{t.nome}</span>
                  <span style={{ color: '#999', fontSize: 12 }}>{formatarPeriodo(t)}</span>
                </button>
                <button
                  onClick={() => { setTorneioSelecionado(t.id); setShowFixarPopup(true); }}
                  style={{ padding: '6px 12px', marginRight: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 'bold', color: isFixado ? '#2ecc71' : '#999', borderRadius: 6 }}
                >
                  {isFixado ? '📌 Fixado' : '📌 Fixar'}
                </button>
                <button onClick={() => excluirTorneio(t.id)} style={{ color: '#e55', fontSize: 12, padding: '0 12px', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
              </div>
            );
          })}
        </div>

        {/* Popup Fixar/Desfixar */}
        {showFixarPopup && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 100,
            }}
            onClick={() => setShowFixarPopup(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: '28px 24px',
                maxWidth: 320,
                width: '90%',
                textAlign: 'center',
              }}
            >
              <p style={{ color: BLUE, fontSize: 15, fontWeight: 600, marginBottom: 20 }}>
                {torneioFixado()
                  ? 'Deseja desfixar este torneio do menu de jogos?'
                  : 'Deseja fixar este torneio no menu de jogos?'}
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={toggleFixarTorneio}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: '#fff',
                    background: torneioFixado() ? '#e74c3c' : '#2ecc71',
                    cursor: 'pointer',
                  }}
                >
                  Sim
                </button>
                <button
                  onClick={() => setShowFixarPopup(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    border: `1px solid ${BLUE}`,
                    fontSize: 14,
                    fontWeight: 'bold',
                    color: BLUE,
                    background: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Nao
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Etapa 2: Categoria ──
  if (etapa === 'categoria') {
    return (
      <div style={{ flex: 1, paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          {btnVoltar(() => setEtapa('torneio'))}
          {btnSair}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>{torneioNome}</p>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 20, textAlign: 'center' }}>Selecione a categoria</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CATEGORIAS_PRINCIPAIS.map((cat) => (
            <button
              key={cat}
              onClick={() => selecionarCategoriaPrincipal(cat)}
              style={{ width: '100%', padding: 16, borderRadius: 14, fontSize: 18, fontWeight: 'bold', color: '#fff', background: BLUE, border: 'none', cursor: 'pointer' }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Etapa 3: Subcategoria ──
  if (etapa === 'subcategoria') {
    return (
      <div style={{ flex: 1, paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          {btnVoltar(() => setEtapa('categoria'))}
          {btnSair}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textAlign: 'center', marginBottom: 4 }}>{torneioNome}</p>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>{categoriaPrincipal}</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 20, textAlign: 'center' }}>Selecione a subcategoria</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {SUBCATEGORIAS.map((sub) => (
            <button
              key={sub}
              onClick={() => selecionarSubcategoria(sub)}
              style={{ width: '100%', padding: 16, borderRadius: 14, fontSize: 18, fontWeight: 'bold', color: BLUE, background: '#fff', border: `2px solid ${BLUE}`, cursor: 'pointer' }}
            >
              {sub}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Etapa 4: Painel (Duplas + Chave) ──
  return (
    <div style={{ flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
        {btnVoltar(() => {
          if (verBracket) setVerBracket(false);
          else setEtapa('subcategoria');
        })}
        <h1 style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>{categoriaNome}</h1>
        {btnSair}
      </div>

      {/* ── Cadastro de duplas (sempre visivel, compacto) ── */}
      {!verBracket && (
        <>
          <form onSubmit={adicionarDupla} style={{ display: 'flex', gap: 6, marginBottom: 10, flexShrink: 0 }}>
            <input
              type="text"
              placeholder={`Dupla ${duplas.length + 1}`}
              value={novoJogador1}
              onChange={(e) => setNovoJogador1(e.target.value)}
              style={{ flex: 1, border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff' }}
            />
            <button type="submit" style={{ padding: '8px 14px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 'bold', color: BLUE, background: '#fff', cursor: 'pointer', flexShrink: 0 }}>
              +
            </button>
          </form>

          {duplas.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12, flexShrink: 0 }}>
              {duplas.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 8, padding: '5px 10px', gap: 6 }}>
                  <span style={{ color: '#fff', fontSize: 12 }}>
                    {d.jogador1}{d.jogador2 ? ` e ${d.jogador2}` : ''}
                  </span>
                  <button onClick={() => excluirDupla(d.id)} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Botoes de sorteio */}
          {duplas.length >= 2 && (
            <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginBottom: 12 }}>
              <button
                onClick={() => { if (tipoSorteio && !confirm('Refazer o sorteio? O atual sera perdido.')) return; sortearChave(); }}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 'bold', color: '#fff', background: '#e67e22', cursor: 'pointer' }}
              >
                {tipoSorteio === 'eliminatorio' ? 'Refazer Eliminatoria' : 'Sorteio Eliminatoria'}
              </button>
              <button
                onClick={() => { if (tipoSorteio && !confirm('Refazer o sorteio? O atual sera perdido.')) return; gerarRoundRobin(); }}
                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', fontSize: 12, fontWeight: 'bold', color: '#fff', background: '#3498db', cursor: 'pointer' }}
              >
                {tipoSorteio === 'todos_contra_todos' ? 'Refazer Todos x Todos' : 'Todos Contra Todos'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modo: Chave do torneio ── */}
      {bracket && verBracket && (
        <>
          {/* Campeão */}
          {campeao && !modoTroca && (
            <div style={{ textAlign: 'center', marginBottom: 16, padding: 16, background: 'rgba(255,255,255,0.15)', borderRadius: 14, flexShrink: 0 }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>🏆</div>
              <div style={{ color: '#ffd700', fontSize: 20, fontWeight: 'bold' }}>{campeao}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 4 }}>
                {categoriaNome.toLowerCase().startsWith('feminino') ? 'Campeãs!' : 'Campeões!'}
              </div>
            </div>
          )}

          {/* Modo troca info */}
          {modoTroca && (
            <div style={{ textAlign: 'center', marginBottom: 12, padding: 10, background: 'rgba(231,76,60,0.3)', borderRadius: 10, flexShrink: 0, color: '#fff', fontSize: 13 }}>
              {trocaSelecionada
                ? 'Agora clique na segunda dupla para trocar'
                : 'Clique na primeira dupla que deseja trocar'}
            </div>
          )}

          {/* Bracket visual - scroll both directions */}
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
                    {round.map((match, mIdx) => {
                      const aIsBye = match.a === 'BYE';
                      const bIsBye = match.b === 'BYE';
                      const canClickA = !aIsBye && !!match.a && !!match.b && match.b !== 'BYE';
                      const canClickB = !bIsBye && !!match.b && !!match.a && match.a !== 'BYE';
                      const isSwapSelA = trocaSelecionada?.round === rIdx && trocaSelecionada?.match === mIdx && trocaSelecionada?.side === 'a';
                      const isSwapSelB = trocaSelecionada?.round === rIdx && trocaSelecionada?.match === mIdx && trocaSelecionada?.side === 'b';
                      const canSwapA = modoTroca && !aIsBye && !!match.a;
                      const canSwapB = modoTroca && !bIsBye && !!match.b;

                      const slotBg = (isWinner: boolean, isSwapSel: boolean) => {
                        if (isSwapSel) return 'rgba(231,76,60,0.5)';
                        if (modoTroca) return 'transparent';
                        if (isWinner) return 'rgba(46,204,113,0.4)';
                        return 'transparent';
                      };

                      return (
                        <div
                          key={mIdx}
                          style={{
                            marginTop: mIdx === 0 ? topPad : stepSize - MATCH_H,
                            borderRadius: 8,
                            overflow: 'hidden',
                            border: isSwapSelA || isSwapSelB ? '1px solid rgba(231,76,60,0.6)' : '1px solid rgba(255,255,255,0.2)',
                            background: 'rgba(0,0,0,0.15)',
                          }}
                        >
                          <div
                            onClick={() => modoTroca ? (canSwapA && handleSlotClickTroca(rIdx, mIdx, 'a')) : (canClickA && selecionarVencedor(rIdx, mIdx, 'a'))}
                            style={{
                              padding: '0 14px',
                              height: SLOT_H,
                              fontSize: 14,
                              fontWeight: match.winner === 'a' && !modoTroca ? 'bold' : 'normal',
                              color: aIsBye ? 'rgba(255,255,255,0.2)' : '#fff',
                              background: slotBg(match.winner === 'a', isSwapSelA),
                              borderBottom: '1px solid rgba(255,255,255,0.1)',
                              cursor: (modoTroca ? canSwapA : canClickA) ? 'pointer' : 'default',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {!modoTroca && match.winner === 'a' && <span style={{ color: '#2ecc71', marginRight: 6 }}>✓</span>}
                            {isSwapSelA && <span style={{ marginRight: 6 }}>↔</span>}
                            {slotName(match.a)}
                          </div>
                          <div
                            onClick={() => modoTroca ? (canSwapB && handleSlotClickTroca(rIdx, mIdx, 'b')) : (canClickB && selecionarVencedor(rIdx, mIdx, 'b'))}
                            style={{
                              padding: '0 14px',
                              height: SLOT_H,
                              fontSize: 14,
                              fontWeight: match.winner === 'b' && !modoTroca ? 'bold' : 'normal',
                              color: bIsBye ? 'rgba(255,255,255,0.2)' : '#fff',
                              background: slotBg(match.winner === 'b', isSwapSelB),
                              cursor: (modoTroca ? canSwapB : canClickB) ? 'pointer' : 'default',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {!modoTroca && match.winner === 'b' && <span style={{ color: '#2ecc71', marginRight: 6 }}>✓</span>}
                            {isSwapSelB && <span style={{ marginRight: 6 }}>↔</span>}
                            {slotName(match.b)}
                          </div>
                        </div>
                      );
                    })}

                    {/* Connector lines */}
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
          </div>

          {/* Alterar Jogos */}
          <button
            onClick={() => { setModoTroca(!modoTroca); setTrocaSelecionada(null); }}
            style={{
              width: '100%',
              padding: 14,
              borderRadius: 12,
              border: 'none',
              fontSize: 14,
              fontWeight: 'bold',
              color: modoTroca ? '#fff' : BLUE,
              background: modoTroca ? 'rgba(231,76,60,0.7)' : '#fff',
              cursor: 'pointer',
              marginTop: 16,
              flexShrink: 0,
            }}
          >
            {modoTroca ? 'Cancelar Troca' : 'Alterar Jogos'}
          </button>

        </>
      )}

      {/* ── Modo: Todos Contra Todos ── */}
      {roundRobin && verBracket && (
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

          {/* Classificacao */}
          <div style={{ marginBottom: 16, flexShrink: 0 }}>
            <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Classificacao</h3>
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                <span style={{ width: 24 }}>#</span>
                <span style={{ flex: 1 }}>Dupla</span>
                <span style={{ width: 30, textAlign: 'center' }}>V</span>
                <span style={{ width: 30, textAlign: 'center' }}>D</span>
                <span style={{ width: 30, textAlign: 'center' }}>J</span>
              </div>
              {getClassificacao().map((s, i) => (
                <div key={i} style={{ display: 'flex', padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, color: '#fff', fontWeight: i === 0 ? 'bold' : 'normal', background: i === 0 ? 'rgba(46,204,113,0.15)' : 'transparent' }}>
                  <span style={{ width: 24, color: 'rgba(255,255,255,0.4)' }}>{i + 1}</span>
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.nome}</span>
                  <span style={{ width: 30, textAlign: 'center', color: '#2ecc71' }}>{s.v}</span>
                  <span style={{ width: 30, textAlign: 'center', color: '#e74c3c' }}>{s.d}</span>
                  <span style={{ width: 30, textAlign: 'center' }}>{s.j}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Jogos */}
          <h3 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>Jogos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto', flex: 1 }}>
            {roundRobin.jogos.map((jogo, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                <button
                  onClick={() => selecionarVencedorRR(idx, 'a')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: jogo.winner === 'a' ? 'bold' : 'normal',
                    color: '#fff',
                    background: jogo.winner === 'a' ? 'rgba(46,204,113,0.4)' : 'transparent',
                    border: 'none',
                    borderRight: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {jogo.winner === 'a' && '✓ '}{jogo.a.nome}
                </button>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, padding: '0 8px' }}>vs</span>
                <button
                  onClick={() => selecionarVencedorRR(idx, 'b')}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    fontSize: 13,
                    fontWeight: jogo.winner === 'b' ? 'bold' : 'normal',
                    color: '#fff',
                    background: jogo.winner === 'b' ? 'rgba(46,204,113,0.4)' : 'transparent',
                    border: 'none',
                    borderLeft: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    textAlign: 'right',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {jogo.b.nome}{jogo.winner === 'b' && ' ✓'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
