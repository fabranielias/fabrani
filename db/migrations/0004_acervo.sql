-- Acervo documental: nomeação, organização, busca, soft delete e vínculo polimórfico.
--
-- Rollback:
--   alter table documento drop column if exists nome_exibicao, drop column if exists pasta,
--     drop column if exists tags, drop column if exists origem, drop column if exists busca,
--     drop column if exists excluido_em, drop column if exists excluido_por;
--   alter table evidencia_vinculo drop column if exists alvo_tipo, drop column if exists alvo_id,
--     drop column if exists criado_por;

alter table documento add column if not exists nome_exibicao text;
alter table documento add column if not exists pasta text;
alter table documento add column if not exists tags text[] not null default '{}';
alter table documento add column if not exists origem text not null default 'UPLOAD';
alter table documento add column if not exists excluido_em timestamptz;
alter table documento add column if not exists excluido_por text;

update documento set nome_exibicao = titulo where nome_exibicao is null;
update documento set origem = 'GERADO' where gerado_por_socrates and origem = 'UPLOAD';

alter table documento add column if not exists busca tsvector;

create or replace function documento_atualizar_busca() returns trigger
language plpgsql as $$
begin
  new.busca := to_tsvector(
    'portuguese',
    coalesce(new.titulo, '') || ' ' || coalesce(new.nome_exibicao, '') || ' ' ||
    coalesce(new.descricao, '') || ' ' || coalesce(new.categoria, '') || ' ' ||
    coalesce(new.pasta, '') || ' ' || coalesce(array_to_string(new.tags, ' '), '')
  );
  return new;
end $$;

drop trigger if exists trg_documento_busca on documento;
create trigger trg_documento_busca before insert or update on documento
  for each row execute function documento_atualizar_busca();

update documento set titulo = titulo;

create index if not exists idx_documento_busca on documento using gin (busca);
create index if not exists idx_documento_sha256 on documento(sha256);
create index if not exists idx_documento_pai on documento(documento_pai_id);
create index if not exists idx_documento_validade on documento(valido_ate);

-- ----------------------------------------------------- vínculo polimórfico
alter table evidencia_vinculo add column if not exists alvo_tipo text;
alter table evidencia_vinculo add column if not exists alvo_id uuid;
alter table evidencia_vinculo add column if not exists criado_por text;

update evidencia_vinculo
   set alvo_tipo = 'AVALIACAO_INDICADOR', alvo_id = avaliacao_indicador_id
 where alvo_tipo is null and avaliacao_indicador_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'evidencia_vinculo_alvo_tipo_check'
  ) then
    alter table evidencia_vinculo add constraint evidencia_vinculo_alvo_tipo_check
      check (alvo_tipo is null or alvo_tipo in (
        'AVALIACAO_INDICADOR','REQUISITO_LEGAL','CURSO','POLO','ATO','PROCESSO','PRAZO',
        'REUNIAO','PESSOA','COLEGIADO','CPA_CICLO','CENSO_ANO','ENADE_CICLO','IES','SUGESTAO'
      ));
  end if;
end $$;

create unique index if not exists uq_evidencia_vinculo_alvo
  on evidencia_vinculo (documento_id, alvo_tipo, alvo_id, coalesce(requisito_evidencia_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where alvo_tipo is not null;

create index if not exists idx_evidencia_vinculo_alvo on evidencia_vinculo(alvo_tipo, alvo_id);

-- --------------------------------------------------- rastro de download/erro
create table if not exists documento_acesso (
  id           uuid primary key default gen_random_uuid(),
  documento_id uuid not null references documento(id) on delete cascade,
  usuario_email text,
  acao         text not null,
  criado_em    timestamptz not null default now()
);

create index if not exists idx_documento_acesso_doc on documento_acesso(documento_id);
