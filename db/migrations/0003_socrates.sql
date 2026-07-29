-- Sócrates: agente regulatório residente.
-- Corpus normativo pesquisável, sugestões (regra ou LLM), execuções com aceite
-- humano e modelos de documento para atas, ofícios e atos.

-- ------------------------------------------------------------------ CORPUS
create table if not exists norma_dispositivo (
  id         uuid primary key default gen_random_uuid(),
  norma_id   uuid not null references norma(id) on delete cascade,
  rotulo     text not null,                       -- "Art. 12, § 2º"
  texto      text not null,
  ordem      int not null default 0,
  hash       text not null,
  busca      tsvector generated always as (to_tsvector('portuguese', coalesce(rotulo,'') || ' ' || texto)) stored,
  criado_em  timestamptz not null default now(),
  unique (norma_id, rotulo)
);
create index if not exists idx_dispositivo_busca on norma_dispositivo using gin (busca);

-- Embedding só quando o servidor oferece pgvector (Supabase sim, Postgres local não).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'vector') then
    create extension if not exists vector;
    execute 'alter table norma_dispositivo add column if not exists embedding vector(1536)';
  end if;
end
$$;

-- Mapa curado indicador → dispositivo que o fundamenta.
create table if not exists indicador_norma (
  indicador_id  uuid not null references indicador(id) on delete cascade,
  dispositivo_id uuid not null references norma_dispositivo(id) on delete cascade,
  peso          smallint not null default 1,
  primary key (indicador_id, dispositivo_id)
);

-- ------------------------------------------------------------- SUGESTÕES
create table if not exists socrates_sugestao (
  id            uuid primary key default gen_random_uuid(),
  alvo_tipo     text not null,                    -- INDICADOR | DOCUMENTO | COLEGIADO | PRAZO | CENSO | POLO | CURSO
  alvo_id       uuid,
  regra         text not null,
  severidade    text not null default 'ATENCAO',  -- RISCO | ATENCAO | INFO
  titulo        text not null,
  mensagem      text not null,
  texto_sugerido text,
  fontes        jsonb,
  origem        text not null default 'REGRA',    -- REGRA | LLM
  cache_key     text,
  custo_tokens  int not null default 0,
  status        text not null default 'ABERTA',   -- ABERTA | ACEITA | DESCARTADA | RESOLVIDA
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_sugestao_alvo on socrates_sugestao (alvo_tipo, alvo_id, status);
create unique index if not exists idx_sugestao_cache on socrates_sugestao (cache_key) where cache_key is not null;

create table if not exists socrates_interacao (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuario(id) on delete set null,
  pergunta   text not null,
  resposta   text not null,
  fontes     jsonb,
  tokens     int not null default 0,
  criado_em  timestamptz not null default now()
);

create table if not exists socrates_orcamento (
  mes           text primary key,                 -- 'AAAA-MM'
  tokens_usados bigint not null default 0,
  teto          bigint not null default 2000000
);

-- ------------------------------------------------------------- EXECUÇÃO
create table if not exists socrates_execucao (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuario(id) on delete set null,
  pedido     text not null,
  resumo     text,
  status     text not null default 'PLANEJADA',   -- PLANEJADA | APLICADA | DESCARTADA | ERRO
  origem     text not null default 'LLM',
  tokens     int not null default 0,
  erro       text,
  criado_em  timestamptz not null default now(),
  aplicado_em timestamptz
);

create table if not exists socrates_acao (
  id          uuid primary key default gen_random_uuid(),
  execucao_id uuid not null references socrates_execucao(id) on delete cascade,
  ordem       int not null default 0,
  ferramenta  text not null,                      -- preencher_indicador | preencher_entidade | gerar_documento | ...
  alvo_tipo   text not null,
  alvo_id     uuid,
  descricao   text not null,
  antes       jsonb,
  depois      jsonb,
  fontes      jsonb,
  status      text not null default 'PROPOSTA',   -- PROPOSTA | ACEITA | DESCARTADA | ERRO
  erro        text
);
create index if not exists idx_acao_execucao on socrates_acao (execucao_id, ordem);

-- --------------------------------------------------- MODELOS DE DOCUMENTO
create table if not exists modelo_documento (
  id         uuid primary key default gen_random_uuid(),
  tipo       text not null,                       -- ATA_CPA | ATA_NDE | ATA_EQUIPE_MULTI | OFICIO | ATO_INTERNO | RESPOSTA_DILIGENCIA | RELATORIO_CPA
  titulo     text not null,
  versao     int not null default 1,
  corpo      text not null,                       -- Markdown com marcadores {{campo}}
  campos     jsonb not null default '[]'::jsonb,
  base_legal text,
  vigente    boolean not null default true,
  unique (tipo, versao)
);

-- Documentos gerados pelo Sócrates guardam o corpo em texto, sem arquivo binário.
alter table documento add column if not exists corpo_markdown text;
alter table documento add column if not exists gerado_por_socrates boolean not null default false;
