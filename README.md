# Placar CT Riozinho - Futevolei & Beach Tennis

Aplicativo PWA para gerenciar placares e torneios de futevolei e beach tennis.

## Funcionalidades

### Placar (tela principal)
- Placar digital com fonte Digital-7 (estilo LCD)
- Botoes de + e - para cada dupla
- Nomes editaveis por clique
- Layout responsivo: vertical/horizontal
- Botao "Zerar Placar" com confirmacao

### Jogos (visualizacao publica)
- Torneios fixados pelo admin
- Categorias agrupadas (Feminino, Masculino, Misto)
- Bracket/round-robin somente leitura com placar
- Duas chaves espelhadas com final no centro
- Estatisticas com filtros (V/D/Pts)
- Campeao (Campeas feminino / Campeoes masculino e misto)

### Configuracoes (Admin)
- Login com usuario simples
- Torneios via popup (nome + datas)
- Fixar/desfixar torneios
- Soft-delete em todas as tabelas
- Categorias: Feminino, Masculino, Misto
- Subcategorias: Estreante, Iniciante, Intermediario, Avancado, 30+
- Duplas como tags inline
- Popup de placar ao clicar no jogo
- Alterar posicao de duplas (modo troca)
- Estatisticas com filtros

## Sorteio (2 niveis)

### Nivel 1: Estrutura
- **Uma Chave** — bracket unico
- **Duas Chaves** — espelhadas com final no centro (4+ duplas)

### Nivel 2: Tipo (dentro de cada estrutura)
- **Sorteio Aleatorio** — eliminatoria com BYEs nas pontas
- **Todos Contra Todos** — round-robin com classificacao

### Combinacoes
| Estrutura | Tipo | Resultado |
|---|---|---|
| Uma Chave | Aleatorio | Bracket eliminatorio |
| Uma Chave | Todos x Todos | Round-robin com classificacao |
| Duas Chaves | Aleatorio | Brackets espelhados + final |
| Duas Chaves | Todos x Todos | Round-robin em cada chave + final |

### Visual
- BYE matches invisiveis (espaco mantido para alinhamento)
- Conectores ocultos em BYEs, parciais quando 1 BYE
- Placar visivel no cantinho direito dos slots

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
# .env: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
npm run build
```

## Banco de Dados (Supabase)

| Tabela | Campos principais |
|---|---|
| torneios | nome, data_inicio, data_fim, ativo, fixado |
| categorias | torneio_id, nome, ativo |
| duplas | categoria_id, jogador1, jogador2, ativo |
| jogos | categoria_id, dupla_a_id, dupla_b_id, pontos, status, ativo |
| brackets | categoria_id, dados (jsonb), campeao, ativo |

### brackets.dados (JSON)
- Eliminatoria: `BracketRound[]` (scoreA/scoreB)
- Round-robin: `{ tipo: 'todos_contra_todos', jogos }`
- Duas chaves elim: `{ tipo: 'duas_chaves', chaveA, chaveB, final }`
- Duas chaves RR: `{ tipo: 'duas_chaves', subtipo: 'todos_contra_todos', jogosA, jogosB, final }`

### Login Admin
Usuario simples → `usuario@ctriozinho.app`. Criar no Supabase Dashboard.

## Estrutura
```
src/
  App.tsx             # Layout, menu, footer context
  pages/
    PlacarRapido.tsx  # Placar digital
    Chaves.tsx        # Jogos publico
    Admin.tsx         # Admin completo
    AdminLogin.tsx    # Login
```

## Fluxo Admin
```
Login > Torneios > Categoria > Subcategoria > Duplas + Sorteio
  Sorteio: Uma Chave / Duas Chaves > Aleatorio / Todos x Todos
  > Bracket + Placar + Estatisticas
```
