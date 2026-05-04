-- Executar no SQL Editor do Supabase (https://supabase.com/dashboard)

create table torneios (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  data date not null,
  ativo boolean default true,
  fixado boolean default false,
  created_at timestamptz default now()
);

create table categorias (
  id uuid default gen_random_uuid() primary key,
  nome text not null,
  created_at timestamptz default now()
);

create table duplas (
  id uuid default gen_random_uuid() primary key,
  categoria_id uuid references categorias(id) not null,
  jogador1 text not null,
  jogador2 text not null,
  created_at timestamptz default now()
);

create table jogos (
  id uuid default gen_random_uuid() primary key,
  categoria_id uuid references categorias(id) not null,
  dupla_a_id uuid references duplas(id) not null,
  dupla_b_id uuid references duplas(id) not null,
  pontos_a int,
  pontos_b int,
  ordem int not null default 1,
  status text not null default 'pendente',
  created_at timestamptz default now()
);

create table brackets (
  id uuid default gen_random_uuid() primary key,
  categoria_id uuid references categorias(id) not null unique,
  dados jsonb not null,
  campeao text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Todos podem visualizar
alter table torneios enable row level security;
alter table brackets enable row level security;
alter table categorias enable row level security;
alter table duplas enable row level security;
alter table jogos enable row level security;

create policy "Leitura publica" on torneios for select using (true);
create policy "Leitura publica" on brackets for select using (true);
create policy "Leitura publica" on categorias for select using (true);
create policy "Leitura publica" on duplas for select using (true);
create policy "Leitura publica" on jogos for select using (true);

-- Somente usuarios autenticados (admin) podem modificar
create policy "Admin insere" on torneios for insert with check (auth.role() = 'authenticated');
create policy "Admin atualiza" on torneios for update using (auth.role() = 'authenticated');
create policy "Admin exclui" on torneios for delete using (auth.role() = 'authenticated');

create policy "Admin insere" on brackets for insert with check (auth.role() = 'authenticated');
create policy "Admin atualiza" on brackets for update using (auth.role() = 'authenticated');
create policy "Admin exclui" on brackets for delete using (auth.role() = 'authenticated');

create policy "Admin insere" on categorias for insert with check (auth.role() = 'authenticated');
create policy "Admin atualiza" on categorias for update using (auth.role() = 'authenticated');
create policy "Admin exclui" on categorias for delete using (auth.role() = 'authenticated');

create policy "Admin insere" on duplas for insert with check (auth.role() = 'authenticated');
create policy "Admin atualiza" on duplas for update using (auth.role() = 'authenticated');
create policy "Admin exclui" on duplas for delete using (auth.role() = 'authenticated');

create policy "Admin insere" on jogos for insert with check (auth.role() = 'authenticated');
create policy "Admin atualiza" on jogos for update using (auth.role() = 'authenticated');
create policy "Admin exclui" on jogos for delete using (auth.role() = 'authenticated');
