import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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

interface Jogo {
  id: string;
  categoria_id: string;
  dupla_a_id: string;
  dupla_b_id: string;
  pontos_a: number | null;
  pontos_b: number | null;
  ordem: number;
  status: string;
}

interface AdminProps {
  onLogout: () => void;
}

export function Admin({ onLogout }: AdminProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [duplas, setDuplas] = useState<Dupla[]>([]);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState<string | null>(null);

  // Forms
  const [novaCategoria, setNovaCategoria] = useState('');
  const [novoJogador1, setNovoJogador1] = useState('');
  const [novoJogador2, setNovoJogador2] = useState('');
  const [duplaAId, setDuplaAId] = useState('');
  const [duplaBId, setDuplaBId] = useState('');

  useEffect(() => {
    carregarCategorias();
  }, []);

  useEffect(() => {
    if (categoriaSelecionada) {
      carregarDuplas(categoriaSelecionada);
      carregarJogos(categoriaSelecionada);
    }
  }, [categoriaSelecionada]);

  async function carregarCategorias() {
    const { data } = await supabase.from('categorias').select('*').order('nome');
    setCategorias(data || []);
    if (data && data.length > 0 && !categoriaSelecionada) {
      setCategoriaSelecionada(data[0].id);
    }
  }

  async function carregarDuplas(categoriaId: string) {
    const { data } = await supabase
      .from('duplas')
      .select('*')
      .eq('categoria_id', categoriaId)
      .order('jogador1');
    setDuplas(data || []);
  }

  async function carregarJogos(categoriaId: string) {
    const { data } = await supabase
      .from('jogos')
      .select('*')
      .eq('categoria_id', categoriaId)
      .order('ordem');
    setJogos(data || []);
  }

  async function adicionarCategoria(e: React.FormEvent) {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    await supabase.from('categorias').insert({ nome: novaCategoria.trim() });
    setNovaCategoria('');
    carregarCategorias();
  }

  async function excluirCategoria(id: string) {
    if (!confirm('Excluir categoria e todos os dados?')) return;
    await supabase.from('jogos').delete().eq('categoria_id', id);
    await supabase.from('duplas').delete().eq('categoria_id', id);
    await supabase.from('categorias').delete().eq('id', id);
    if (categoriaSelecionada === id) setCategoriaSelecionada(null);
    carregarCategorias();
  }

  async function adicionarDupla(e: React.FormEvent) {
    e.preventDefault();
    if (!novoJogador1.trim() || !novoJogador2.trim() || !categoriaSelecionada) return;
    await supabase.from('duplas').insert({
      categoria_id: categoriaSelecionada,
      jogador1: novoJogador1.trim(),
      jogador2: novoJogador2.trim(),
    });
    setNovoJogador1('');
    setNovoJogador2('');
    carregarDuplas(categoriaSelecionada);
  }

  async function excluirDupla(id: string) {
    if (!categoriaSelecionada) return;
    await supabase.from('jogos').delete().or(`dupla_a_id.eq.${id},dupla_b_id.eq.${id}`);
    await supabase.from('duplas').delete().eq('id', id);
    carregarDuplas(categoriaSelecionada);
    carregarJogos(categoriaSelecionada);
  }

  async function adicionarJogo(e: React.FormEvent) {
    e.preventDefault();
    if (!duplaAId || !duplaBId || duplaAId === duplaBId || !categoriaSelecionada) return;
    const ordem = jogos.length + 1;
    await supabase.from('jogos').insert({
      categoria_id: categoriaSelecionada,
      dupla_a_id: duplaAId,
      dupla_b_id: duplaBId,
      ordem,
      status: 'pendente',
    });
    setDuplaAId('');
    setDuplaBId('');
    carregarJogos(categoriaSelecionada);
  }

  async function atualizarPlacar(jogoId: string, pontosA: number, pontosB: number) {
    await supabase
      .from('jogos')
      .update({ pontos_a: pontosA, pontos_b: pontosB, status: 'finalizado' })
      .eq('id', jogoId);
    if (categoriaSelecionada) carregarJogos(categoriaSelecionada);
  }

  async function excluirJogo(id: string) {
    await supabase.from('jogos').delete().eq('id', id);
    if (categoriaSelecionada) carregarJogos(categoriaSelecionada);
  }

  function getNomeDupla(id: string) {
    const d = duplas.find((d) => d.id === id);
    return d ? `${d.jogador1} / ${d.jogador2}` : '—';
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Painel Admin</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700"
        >
          Sair
        </button>
      </div>

      {/* Categorias */}
      <section>
        <h2 className="font-semibold text-slate-700 mb-2">Categorias</h2>
        <form onSubmit={adicionarCategoria} className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="Nova categoria (ex: Masculino A)"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Adicionar
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {categorias.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1">
              <button
                onClick={() => setCategoriaSelecionada(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  categoriaSelecionada === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.nome}
              </button>
              <button
                onClick={() => excluirCategoria(cat.id)}
                className="text-red-400 hover:text-red-600 text-xs"
              >
                x
              </button>
            </div>
          ))}
        </div>
      </section>

      {categoriaSelecionada && (
        <>
          {/* Duplas */}
          <section>
            <h2 className="font-semibold text-slate-700 mb-2">Duplas</h2>
            <form onSubmit={adicionarDupla} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Jogador 1"
                value={novoJogador1}
                onChange={(e) => setNovoJogador1(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                placeholder="Jogador 2"
                value={novoJogador2}
                onChange={(e) => setNovoJogador2(e.target.value)}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
              >
                +
              </button>
            </form>
            <div className="space-y-1">
              {duplas.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between bg-white rounded-lg shadow-sm px-3 py-2"
                >
                  <span className="text-sm text-slate-700">
                    {d.jogador1} / {d.jogador2}
                  </span>
                  <button
                    onClick={() => excluirDupla(d.id)}
                    className="text-red-400 hover:text-red-600 text-xs"
                  >
                    excluir
                  </button>
                </div>
              ))}
              {duplas.length === 0 && (
                <p className="text-sm text-slate-400">Nenhuma dupla cadastrada.</p>
              )}
            </div>
          </section>

          {/* Jogos */}
          <section>
            <h2 className="font-semibold text-slate-700 mb-2">Jogos</h2>
            {duplas.length >= 2 && (
              <form onSubmit={adicionarJogo} className="flex gap-2 mb-3 items-center">
                <select
                  value={duplaAId}
                  onChange={(e) => setDuplaAId(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Dupla A</option>
                  {duplas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.jogador1} / {d.jogador2}
                    </option>
                  ))}
                </select>
                <span className="text-slate-400 text-sm">vs</span>
                <select
                  value={duplaBId}
                  onChange={(e) => setDuplaBId(e.target.value)}
                  className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Dupla B</option>
                  {duplas.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.jogador1} / {d.jogador2}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                >
                  +
                </button>
              </form>
            )}
            <div className="space-y-2">
              {jogos.map((jogo) => (
                <JogoItem
                  key={jogo.id}
                  jogo={jogo}
                  getNomeDupla={getNomeDupla}
                  onSalvarPlacar={atualizarPlacar}
                  onExcluir={excluirJogo}
                />
              ))}
              {jogos.length === 0 && (
                <p className="text-sm text-slate-400">Nenhum jogo cadastrado.</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function JogoItem({
  jogo,
  getNomeDupla,
  onSalvarPlacar,
  onExcluir,
}: {
  jogo: Jogo;
  getNomeDupla: (id: string) => string;
  onSalvarPlacar: (id: string, a: number, b: number) => void;
  onExcluir: (id: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [pA, setPA] = useState(jogo.pontos_a ?? 0);
  const [pB, setPB] = useState(jogo.pontos_b ?? 0);

  function salvar() {
    onSalvarPlacar(jogo.id, pA, pB);
    setEditando(false);
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex-1 text-slate-700">{getNomeDupla(jogo.dupla_a_id)}</span>
        <div className="px-3 text-center">
          {editando ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                value={pA}
                onChange={(e) => setPA(Number(e.target.value))}
                className="w-12 border rounded px-1 py-0.5 text-center text-sm"
              />
              <span className="text-slate-400">x</span>
              <input
                type="number"
                min={0}
                value={pB}
                onChange={(e) => setPB(Number(e.target.value))}
                className="w-12 border rounded px-1 py-0.5 text-center text-sm"
              />
              <button
                onClick={salvar}
                className="bg-green-500 text-white px-2 py-0.5 rounded text-xs"
              >
                OK
              </button>
            </div>
          ) : jogo.status === 'finalizado' ? (
            <span
              onClick={() => setEditando(true)}
              className="font-bold text-slate-800 cursor-pointer"
            >
              {jogo.pontos_a} x {jogo.pontos_b}
            </span>
          ) : (
            <button
              onClick={() => setEditando(true)}
              className="text-xs text-blue-500 hover:text-blue-700"
            >
              Placar
            </button>
          )}
        </div>
        <span className="flex-1 text-right text-slate-700">
          {getNomeDupla(jogo.dupla_b_id)}
        </span>
      </div>
      <div className="flex justify-end mt-1">
        <button
          onClick={() => onExcluir(jogo.id)}
          className="text-red-400 hover:text-red-600 text-xs"
        >
          excluir
        </button>
      </div>
    </div>
  );
}
