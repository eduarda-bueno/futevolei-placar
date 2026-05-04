# Placar CT Riozinho - Futevolei & Beach Tennis

Aplicativo PWA para gerenciar placares e torneios de futevolei e beach tennis.

## Funcionalidades

### Placar
- Placar digital com fonte Digital-7 (estilo LCD)
- Botoes de + e - para cada dupla
- Nomes das duplas editaveis por clique
- Layout responsivo: vertical (cards empilhados) e horizontal (lado a lado)
- Botao "Zerar Placar" com confirmacao

### Configuracoes (Admin - acesso via login)
- Criar e gerenciar torneios
- Categorias: Feminino, Masculino, Misto
- Subcategorias: Estreante, Iniciante, Intermediario, Avancado, 30+
- Cadastro de duplas com input unico
- Sorteio automatico de chave eliminatoria com BYEs
- Bracket visual horizontal com conectores SVG
- Selecao de vencedor por clique
- Troca de duplas de posicao (botao "Alterar Jogos")
- Bracket salvo no Supabase (persiste entre sessoes)

### Jogos
- Visualizacao publica dos jogos por categoria
- Cards grandes com placar destacado

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Estilo**: Tailwind CSS 4 + inline styles
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **PWA**: vite-plugin-pwa com workbox
- **Fontes**: Roboto (UI) + Digital-7 (placar)
- **Deploy**: Vercel

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

Executar o arquivo `supabase-schema.sql` no SQL Editor do Supabase para criar todas as tabelas:

- **torneios** - nome e data dos torneios
- **categorias** - categorias do torneio (ex: Feminino - Iniciante)
- **duplas** - duplas cadastradas por categoria
- **jogos** - jogos com placar e status
- **brackets** - chave eliminatoria salva como JSON

Todas as tabelas possuem Row Level Security:
- Leitura publica (qualquer pessoa pode ver)
- Escrita apenas para usuarios autenticados (admin)

## Estrutura do Projeto

```
src/
  App.tsx           # Layout compartilhado (degrade + menu inferior)
  main.tsx          # Entry point
  index.css         # Tailwind import
  lib/
    supabase.ts     # Cliente Supabase
  pages/
    PlacarRapido.tsx  # Tela do placar digital
    Chaves.tsx        # Tela publica de jogos
    Admin.tsx         # Painel admin (torneios, categorias, bracket)
    AdminLogin.tsx    # Tela de login admin
public/
  ct-riozinho-logo.png  # Logo do CT
  digital-7.ttf         # Fonte do placar
  digital-7-mono.ttf    # Fonte do placar (mono)
```
