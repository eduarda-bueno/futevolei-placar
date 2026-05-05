# Placar CT Riozinho - Futevolei & Beach Tennis

Aplicativo PWA para gerenciar placares e torneios de futevolei e beach tennis.

## Funcionalidades

### Placar (tela principal)
- Placar digital com fonte Digital-7 (estilo LCD)
- Botoes de + e - para cada dupla
- Nomes das duplas editaveis por clique
- Layout responsivo: vertical (cards empilhados) e horizontal (lado a lado)
- Botao "Zerar Placar" com confirmacao
- Degrade de fundo (ceu/areia)

### Jogos (visualizacao publica)
- Lista de torneios fixados (somente os que o admin fixou)
- Categorias agrupadas por tipo (Feminino, Masculino, Misto)
- Mostra apenas categorias que possuem sorteio
- Suporta todos os 3 modos de torneio (somente leitura)
- Placar visivel nos slots do bracket (numero pequeno)
- Duas chaves espelhadas com final no centro
- Exibe campeao (Campeas para feminino, Campeoes para masculino/misto)

### Configuracoes (Admin - acesso via login)
- Login com nome de usuario simples (sem email)
- Criar torneios via popup (nome + data inicio + data fim)
- Fixar/desfixar torneios no menu de jogos (icone 📌)
- Soft-delete de torneios (desativa, nao exclui do banco)
- Categorias vinculadas ao torneio: Feminino, Masculino, Misto
- Subcategorias: Estreante, Iniciante, Intermediario, Avancado, 30+
- Cadastro de duplas compacto (tags inline com remocao)
- 3 modos de sorteio (ver abaixo)
- Popup para inserir placar (nome das duplas + campos de placar)
- Vencedor definido automaticamente pelo placar maior
- Troca de duplas de posicao (botao "Alterar Jogos")
- Apos sortear: "Visualizar Sorteio" + "Refazer Sorteio" (popup com opcoes)
- Bracket salvo no Supabase (persiste entre sessoes)
- Footer escondido automaticamente na tela do bracket

## Modos de Sorteio

### 1. Sorteio Aleatorio (eliminatoria simples)
Chave eliminatoria com BYEs automaticos. Perdeu, esta fora.

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

### 2. Todos Contra Todos (round-robin)
Cada dupla joga contra todas as outras. Funciona com qualquer numero (par ou impar).
Tabela de classificacao com V (vitorias), D (derrotas), J (jogos).

### 3. Duas Chaves (espelhadas com final)
Duplas divididas em dois grupos. Chaves espelhadas convergem para a final no centro.

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

## Fluxo de Botoes de Sorteio

```
Sem sorteio:
  ┌─────────────────┐  ┌──────────────────┐
  │ Sorteio Aleatorio│  │ Todos Contra Todos│
  └─────────────────┘  └──────────────────┘
  ┌──────────────────────────────────────────┐
  │           Duas Chaves                    │
  └──────────────────────────────────────────┘

Com sorteio:
  ┌──────────────────┐  ┌──────────────────┐
  │ Visualizar Sorteio│  │  Refazer Sorteio │
  └──────────────────┘  └──────────────────┘
         (verde)         (abre popup com 3 opcoes)
```

## Layout
- Degrade compartilhado em todas as telas (ceu/areia)
- Menu inferior com onda SVG: Placar, Jogos, Config
- Menu destaca a aba ativa
- Credito "desenvolvido por Duda" no footer
- Desktop (1200px) para telas de Config e Jogos
- Mobile (500px) para tela do Placar

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite 7
- **Estilo**: Tailwind CSS 4 + inline styles
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **PWA**: vite-plugin-pwa com workbox (funciona offline)
- **Fontes**: Roboto (UI) + Digital-7 (placar)
- **Deploy**: Vercel (auto-deploy via GitHub)

## Setup Local

```bash
# Instalar dependencias
npm install

# Configurar variaveis de ambiente
# Criar arquivo .env com:
# VITE_SUPABASE_URL=sua_url
# VITE_SUPABASE_ANON_KEY=sua_key

# Rodar em desenvolvimento
npm run dev

# Build para producao
npm run build
```

## Banco de Dados (Supabase)

Executar o arquivo `supabase-schema.sql` no SQL Editor do Supabase para criar todas as tabelas.

### Tabelas

| Tabela | Descricao | Campos principais |
|---|---|---|
| **torneios** | Torneios com periodo | nome, data_inicio, data_fim, ativo, fixado |
| **categorias** | Categorias por torneio | torneio_id, nome, ativo |
| **duplas** | Duplas por categoria | categoria_id, jogador1, jogador2, ativo |
| **jogos** | Jogos com placar | categoria_id, dupla_a_id, dupla_b_id, pontos, status, ativo |
| **brackets** | Dados do torneio (JSON) | categoria_id, dados (jsonb), campeao, ativo |

O campo `brackets.dados` armazena como JSON um dos 3 formatos:
- Eliminatoria: `BracketRound[]` (array de rodadas, cada match com scoreA/scoreB)
- Round-robin: `{ tipo: 'todos_contra_todos', jogos: [...] }`
- Duas chaves: `{ tipo: 'duas_chaves', chaveA, chaveB, final, ... }`

### Soft-delete
Todas as tabelas possuem coluna `ativo` (boolean default true). Ao "excluir", o registro e desativado (ativo=false), nunca removido. Para reativar via SQL:
```sql
update torneios set ativo = true where id = 'xxx';
```

### Row Level Security
- Leitura publica (qualquer pessoa pode ver)
- Escrita apenas para usuarios autenticados (admin)

### Login Admin
O login usa Supabase Auth. O usuario digita um nome simples (ex: `admin`) que e convertido para `admin@ctriozinho.app`. Criar o usuario no Supabase Dashboard > Authentication > Users > Add user com email `seuusuario@ctriozinho.app`.

## Estrutura do Projeto

```
src/
  App.tsx             # Layout compartilhado (degrade + menu + footer context)
  main.tsx            # Entry point
  index.css           # Tailwind import
  lib/
    supabase.ts       # Cliente Supabase
  pages/
    PlacarRapido.tsx  # Tela do placar digital
    Chaves.tsx        # Tela publica: torneios > categorias > bracket (leitura)
    Admin.tsx         # Painel admin: torneios > categorias > duplas > sorteio
    AdminLogin.tsx    # Tela de login com usuario simples
public/
  ct-riozinho-logo.png  # Logo do CT (fundo transparente)
  digital-7.ttf         # Fonte do placar
  digital-7-mono.ttf    # Fonte do placar (mono)
  icons/                # Icones PWA
```

## Fluxo do Admin

```
Login > Torneios (+ Novo Torneio via popup / fixar / excluir)
         |
         v
       Categoria (Feminino / Masculino / Misto)
         |
         v
       Subcategoria (Estreante / Iniciante / Intermediario / Avancado / 30+)
         |
         v
       Tela unica: Cadastro de Duplas + Sorteio
         |
         ├─ Sem sorteio: 3 botoes (Aleatorio / Todos x Todos / Duas Chaves)
         └─ Com sorteio: Visualizar Sorteio + Refazer Sorteio (popup)
                |
                v
              Bracket com popup de placar (clique no jogo)
```

## Fluxo dos Jogos (publico)

```
Torneios fixados > Categorias com bracket > Visualizacao (somente leitura + placar)
```
