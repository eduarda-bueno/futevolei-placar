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
- Todos os modos de bracket somente leitura com placar
- Estatisticas com filtros (V/D/Pts)
- Campeao (Campeas feminino / Campeoes masculino e misto)

### Configuracoes (Admin)
- Login com usuario simples
- Torneios via popup (nome + datas)
- Fixar/desfixar torneios
- Soft-delete em todas as tabelas
- Categorias e subcategorias
- Duplas como tags inline
- Popup de placar ao clicar no jogo
- Alterar posicao de duplas (modo troca)
- Estatisticas com filtros
- Podio completo (ouro, prata, disputa 3o, bronze)

## Sorteio (2 niveis)

### Nivel 1: Estrutura
- **Uma Chave** — bracket unico
- **Duas Chaves** — espelhadas com final no centro (4+ duplas)

### Nivel 2: Tipo
- **Sorteio Aleatorio** — eliminatoria com BYEs
- **Todos Contra Todos** — round-robin com classificacao
- **Dupla Eliminacao** — principal + repescagem + grande final (so Uma Chave, 3+ duplas)

### 5 Combinacoes
| Estrutura | Tipo | Resultado |
|---|---|---|
| Uma Chave | Aleatorio | Bracket eliminatorio + podio |
| Uma Chave | Todos x Todos | Round-robin com classificacao |
| Uma Chave | Dupla Eliminacao | Principal ← Final → Repescagem (espelhado) |
| Duas Chaves | Aleatorio | Brackets espelhados + final |
| Duas Chaves | Todos x Todos | Round-robin em cada chave + final |

### Dupla Eliminacao
```
Chave Principal          Final         Repescagem
Dupla 1 ─┐                          ┌─ (perdedores)
          ├─ Venc ─┐  ┌────────┐  ┌─ Venc ─┤
Dupla 2 ─┘        ├─▶│Camp P  │  │         └─ (perdedores)
                      │  vs   │
Dupla 3 ─┐        ┌─▶│Camp R  │  │         ┌─ (perdedores)
          ├─ Venc ─┘  └────────┘  └─ Venc ─┤
Dupla 4 ─┘                          └─ (perdedores)
```
- Quem perde na principal vai para a repescagem
- Perdedores chegam por ondas (round by round)
- Repescagem espelhada, brackets visiveis vazios ate preenchidos
- Grande final entre campeao principal vs campeao repescagem

### Podio (eliminatoria simples)
- 🏆 Campeao = vencedor da final
- 🥈 Segundo = perdedor da final
- Disputa 3o lugar = jogo entre semifinalistas perdedores
- 🥉 Terceiro = vencedor da disputa

## Tech Stack
- React 19 + TypeScript + Vite 7 + Tailwind 4
- Supabase (PostgreSQL + Auth + RLS)
- vite-plugin-pwa + Vercel

## Banco de Dados

| Tabela | Campos principais |
|---|---|
| torneios | nome, data_inicio, data_fim, ativo, fixado |
| categorias | torneio_id, nome, ativo |
| duplas | categoria_id, jogador1, jogador2, ativo |
| jogos | categoria_id, dupla_a_id, dupla_b_id, pontos, status, ativo |
| brackets | categoria_id, dados (jsonb), campeao, ativo |

### brackets.dados (JSON)
- Eliminatoria: `BracketRound[]`
- Round-robin: `{ tipo: 'todos_contra_todos', jogos }`
- Dupla elim: `{ tipo: 'dupla_eliminacao', winners, losers, grandFinal }`
- Duas chaves elim: `{ tipo: 'duas_chaves', chaveA, chaveB, final }`
- Duas chaves RR: `{ tipo: 'duas_chaves', subtipo: 'todos_contra_todos', jogosA, jogosB, final }`

## Fluxo Admin
```
Login > Torneios > Categoria > Subcategoria > Duplas + Sorteio
  Uma Chave: Aleatorio / Todos x Todos / Dupla Eliminacao
  Duas Chaves: Aleatorio / Todos x Todos
  > Bracket + Placar + Podio + Estatisticas
```
