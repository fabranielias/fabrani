-- Trilha guiada do dossiê regulatório: passos gerados a partir dos instrumentos
-- e do catálogo institucional, com resposta por passo (concluído / não há / NSA).
--
-- Rollback:
--   drop table if exists trilha_resposta;
--   drop table if exists trilha_passo;

create table if not exists trilha_passo (
  id                  uuid primary key default gen_random_uuid(),
  codigo              text not null unique,
  bloco               text not null check (bloco in ('A', 'B', 'C')),
  secao               text not null,
  ordem               integer not null default 0,
  tipo                text not null check (tipo in ('DADOS', 'REGISTROS', 'DOCUMENTO', 'INDICADOR', 'REQUISITO_LEGAL')),
  titulo              text not null,
  explicacao          text,
  base_legal          text,
  obrigatorio         boolean not null default true,
  aceita_nsa          boolean not null default false,
  entidade_slug       text,
  registro_id         uuid,
  campos              text[] not null default '{}',
  alvo_tipo           text,
  alvo_id             uuid,
  categoria_documento text,
  exige_validade      boolean not null default false,
  curso_id            uuid references curso(id) on delete cascade,
  ativo               boolean not null default true,
  atualizado_em       timestamptz not null default now()
);

create index if not exists idx_trilha_passo_ordem on trilha_passo(bloco, ordem);
create index if not exists idx_trilha_passo_curso on trilha_passo(curso_id);
create index if not exists idx_trilha_passo_alvo on trilha_passo(alvo_tipo, alvo_id);

create table if not exists trilha_resposta (
  id             uuid primary key default gen_random_uuid(),
  passo_id       uuid not null unique references trilha_passo(id) on delete cascade,
  status         text not null check (status in ('CONCLUIDO', 'NAO_HA', 'NSA')),
  observacao     text,
  dados          jsonb,
  respondido_por text,
  respondido_em  timestamptz not null default now()
);

-- Documento pode comprovar diretamente um indicador do instrumento (sem depender
-- de um ciclo de avaliação aberto) e a mantenedora.
alter table evidencia_vinculo drop constraint if exists evidencia_vinculo_alvo_tipo_check;
alter table evidencia_vinculo add constraint evidencia_vinculo_alvo_tipo_check
  check (alvo_tipo is null or alvo_tipo in (
    'AVALIACAO_INDICADOR','REQUISITO_LEGAL','CURSO','POLO','ATO','PROCESSO','PRAZO',
    'REUNIAO','PESSOA','COLEGIADO','CPA_CICLO','CENSO_ANO','ENADE_CICLO','IES','SUGESTAO',
    'INDICADOR','MANTENEDORA','TRILHA_PASSO'
  ));
