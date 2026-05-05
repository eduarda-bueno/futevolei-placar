# Placar CT Riozinho - Futevolei & Beach Tennis

Aplicativo PWA para gerenciar placares e torneios de futevolei e beach tennis.

## Funcionalidades

### Placar (tela principal)
- Placar digital com fonte Digital-7 (estilo LCD)
- Botoes de + e - para cada dupla
- Nomes das duplas editaveis por clique
- Layout responsivo: vertical (cards empilhados) e horizontal (lado a lado)
- Botao "Zerar Placar" com confirmacao

### Jogos (visualizacao publica)
- Lista de torneios fixados pelo admin
- Categorias agrupadas por tipo (Feminino, Masculino, Misto)
- Mostra apenas categorias com sorteio
- Bracket visual com placar nos slots
- Duas chaves espelhadas com final no centro
- Estatisticas com filtros (Vitorias, Derrotas, Pontos)
- Exibe campeao (Campeas/Campeoes conforme categoria)

### Configuracoes (Admin)
- Login com nome de usuario simples
- Criar torneios via popup (nome + data inicio + data fim)
- Fixar/desfixar torneios no menu de jogos
- Soft-delete (desativa, nao exclui do banco)
- Categorias: Feminino, Masculino, Misto
- Subcategorias: Estreante, Iniciante, Intermediario, Avancado, 30+
- Cadastro de duplas compacto (tags inline)
- 3 modos de sorteio
- Popup de placar ao clicar no jogo
- Vencedor automatico pelo placar maior
- Alterar posicao de duplas (modo troca)
- Estatisticas com filtros

## Modos de Sorteio

### 1. Sorteio Aleatorio (eliminatoria)
```
Dupla 1 ─┐
          ├─ Vencedor ─┐
Dupla 2 ─┘             ├─ Vencedor ─┐
Dupla 3 ─┐             │            ├─ CAMPEAO
          ├─ Vencedor ─┘            │
Dupla 4 ─┘                         │
Dupla 5 ─┐                         │
          ├─ Vencedor ─┐            │
Dupla 6 ─┘             ├─ Vencedor ─┘
Dupla 7 ─┐             │
          ├─ Vencedor ─┘
Dupla 8 ─┘
```
- BYEs nas pontas quando numero nao e potencia de 2
- Jogos reais concentrados no meio do bracket

### 2. Todos Contra Todos (round-robin)
- Cada dupla joga contra todas as outras
- Funciona com qualquer numero (par ou impar)
- Classificacao com V, D, Pts, Sofridos

### 3. Duas Chaves (espelhadas com final)
```
CHAVE A                 FINAL              CHAVE B
Dupla 1 ─┐                              ┌─ Dupla 5
          ├─ Venc A ─┐  ┌────────┐  ┌─ Venc C ─┤
Dupla 2 ─┘           ├─▶│ Camp A │  │           └─ Dupla 6
                         │   vs  │
Dupla 3 ─┐           ┌─▶│ Camp B │  │           ┌─ Dupla 7
          ├─ Venc B ─┘  └────────┘  └─ Venc D ─┤
Dupla 4 ─┘                              └─ Dupla 8
```
- Divisao equilibrada (metade + metade)
- Chave A esquerda, Chave B espelhada direita, Final no centro

## Placar e Estatisticas

### Inserir placar (admin)
- Clica no jogo → popup com nomes e campos de placar
- Digita pontos → Confirmar → vencedor automatico
- Botao Limpar para resetar

### Estatisticas (admin e publico)
- Botao "Estatisticas" abre popup com tabela
- Colunas: #, Dupla, V (vitorias), D (derrotas), Pts (pontos feitos), Sof (sofridos)
- Filtros: ordenar por Vitorias, Derrotas ou Pontos
- Funciona nos 3 modos de sorteio
- Calculado em tempo real dos placares salvos

## Fluxo de Botoes
```
Sem sorteio:        Com sorteio:
┌──────────┐        ┌──────────────────┐
│ Aleatorio│        │ Visualizar Sort. │ (verde)
├──────────┤        ├──────────────────┤
│Todos x T.│        │  Refazer Sorteio │ (popup com 3 opcoes)
├──────────┤        └──────────────────┘
│Duas Chav.│
└──────────┘
```

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite 7
- **Estilo**: Tailwind CSS 4 + inline styles
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **PWA**: vite-plugin-pwa com workbox
- **Fontes**: Roboto (UI) + Digital-7 (placar)
- **Deploy**: Vercel (auto-deploy via GitHub)

## Setup Local
```bash
npm install

# .env com:
# VITE_SUPABASE_URL=sua_url
# VITE_SUPABASE_ANON_KEY=sua_key

npm run dev      # desenvolvimento
npm run build    # producao
```

## Banco de Dados (Supabase)

Executar `supabase-schema.sql` no SQL Editor.

| Tabela | Campos principais |
|---|---|
| **torneios** | nome, data_inicio, data_fim, ativo, fixado |
| **categorias** | torneio_id, nome, ativo |
| **duplas** | categoria_id, jogador1, jogador2, ativo |
| **jogos** | categoria_id, dupla_a_id, dupla_b_id, pontos, status, ativo |
| **brackets** | categoria_id, dados (jsonb), campeao, ativo |

### brackets.dados (JSON)
- Eliminatoria: `BracketRound[]` (matches com scoreA/scoreB)
- Round-robin: `{ tipo: 'todos_contra_todos', jogos: [{a, b, winner, scoreA, scoreB}] }`
- Duas chaves: `{ tipo: 'duas_chaves', chaveA, chaveB, final }`

### Soft-delete
Coluna `ativo` (boolean default true). "Excluir" seta `ativo=false`.

### Login Admin
Usuario simples (ex: `admin`) → convertido para `admin@ctriozinho.app`.
Criar no Supabase Dashboard > Authentication > Users.

## Estrutura
```
src/
  App.tsx             # Layout, menu, footer context
  pages/
    PlacarRapido.tsx  # Placar digital
    Chaves.tsx        # Jogos publico (torneios > categorias > bracket + stats)
    Admin.tsx         # Admin (torneios > categorias > duplas > sorteio + placar + stats)
    AdminLogin.tsx    # Login
public/
  digital-7.ttf       # Fonte placar
```

## Fluxo Admin
```
Login > Torneios (+Novo/fixar/excluir)
  > Categoria (Feminino/Masculino/Misto)
    > Subcategoria (Estreante/Iniciante/Intermediario/Avancado/30+)
      > Duplas + Sorteio > Bracket + Placar + Estatisticas
```

## Fluxo Jogos (publico)
```
Torneios fixados > Categorias com bracket > Bracket + Placar + Estatisticas
```
