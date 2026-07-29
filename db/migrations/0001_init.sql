-- Sistema de Gestão Regulatória MEC/INEP — Faculdade Fabrani
-- Migração inicial. Compatível com PostgreSQL 15+ e Supabase.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- governança
create table if not exists usuario (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  nome          text not null,
  papel         text not null default 'AUDITOR',
  senha_hash    text,
  curso_escopo  uuid[] default '{}',
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now()
);

create table if not exists auditoria_log (
  id          bigserial primary key,
  usuario_id  uuid references usuario(id),
  usuario_email text,
  acao        text not null,
  entidade    text not null,
  entidade_id text,
  depois      jsonb,
  criado_em   timestamptz not null default now()
);

-- ------------------------------------------------------------- institucional
create table if not exists mantenedora (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  sigla         text,
  cnpj          text,
  natureza      text,
  endereco      text,
  municipio     text,
  uf            char(2),
  cep           text,
  representante_legal text,
  email         text,
  telefone      text,
  observacao    text,
  criado_em     timestamptz not null default now()
);

create table if not exists ies (
  id                uuid primary key default gen_random_uuid(),
  mantenedora_id    uuid references mantenedora(id),
  codigo_emec       text unique,
  nome              text not null,
  sigla             text,
  cnpj              text,
  organizacao_academica text,
  modalidade_credenciamento text,
  endereco          text,
  municipio_sede    text,
  uf_sede           char(2),
  cep               text,
  codigo_endereco_emec text,
  telefone          text,
  email             text,
  site              text,
  procurador_institucional text,
  ci                numeric(3,2),
  ci_ano            int,
  igc               numeric(3,2),
  igc_ano           int,
  fonte             text,
  sincronizado_em   timestamptz,
  criado_em         timestamptz not null default now()
);

create table if not exists curso (
  id                     uuid primary key default gen_random_uuid(),
  ies_id                 uuid references ies(id),
  codigo_emec            text,
  nome                   text not null,
  grau                   text,
  formato_oferta         text,
  cncst_denominacao      text,
  cncst_eixo_tecnologico text,
  carga_horaria_total    int,
  carga_horaria_extensao int,
  prazo_integralizacao_semestres int,
  data_inicio_oferta     date,
  vagas_anuais           int,
  turno                  text,
  rotulo_cine_brasil     text,
  cc                     numeric(3,2),
  cc_ano                 int,
  cpc                    numeric(3,2),
  cpc_ano                int,
  conceito_enade         numeric(3,2),
  enade_area             text,
  enade_sem_area         boolean not null default false,
  coordenador            text,
  situacao               text,
  regime_ead_12456       text,
  observacao             text,
  criado_em              timestamptz not null default now()
);

create table if not exists polo (
  id            uuid primary key default gen_random_uuid(),
  ies_id        uuid references ies(id),
  codigo_emec   text,
  nome          text not null,
  endereco      text,
  municipio     text,
  uf            char(2),
  cep           text,
  situacao      text,
  data_criacao  date,
  data_informe_emec date,
  responsavel   text,
  vagas_totais  int,
  area_m2       numeric(10,2),
  laboratorios  text,
  biblioteca    text,
  acessibilidade text,
  infraestrutura_tecnologica text,
  adequacao_12456_status text,
  adequacao_12456_prazo  date,
  adequacao_12456_plano  text,
  observacao    text,
  criado_em     timestamptz not null default now()
);

create table if not exists ato_regulatorio (
  id              uuid primary key default gen_random_uuid(),
  escopo          text not null default 'IES',
  ies_id          uuid references ies(id),
  curso_id        uuid references curso(id),
  tipo            text not null,
  especie_ato     text,
  numero_ato      text,
  data_assinatura date,
  data_publicacao date,
  secao_dou       text,
  pagina_dou      text,
  vigencia_inicio date,
  vigencia_fim    date,
  prorrogado      boolean not null default false,
  processo_emec   text,
  observacao      text,
  criado_em       timestamptz not null default now()
);

-- --------------------------------------------------------------- documentos
create table if not exists documento (
  id               uuid primary key default gen_random_uuid(),
  titulo           text not null,
  categoria        text,
  curso_id         uuid references curso(id),
  polo_id          uuid references polo(id),
  storage_path     text,
  storage_provider text default 'local',
  nome_arquivo     text,
  mime_type        text,
  tamanho_bytes    bigint,
  sha256           text,
  versao           int not null default 1,
  documento_pai_id uuid references documento(id),
  valido_de        date,
  valido_ate       date,
  status           text not null default 'RASCUNHO',
  aprovado_por     text,
  aprovado_em      timestamptz,
  descricao        text,
  criado_por       text,
  criado_em        timestamptz not null default now()
);

-- ------------------------------------------------------------- instrumentos
create table if not exists instrumento (
  id              uuid primary key default gen_random_uuid(),
  codigo          text unique not null,
  tipo            text not null,
  titulo          text not null,
  versao          text not null,
  atos            text[] not null default '{}',
  norma_origem    text,
  vigencia_inicio date,
  vigencia_fim    date,
  situacao        text not null default 'VIGENTE',
  escala_min      smallint not null default 1,
  escala_max      smallint not null default 5,
  conceito_satisfatorio numeric(3,2) not null default 3.0,
  observacao      text
);

create table if not exists eixo (
  id             uuid primary key default gen_random_uuid(),
  instrumento_id uuid not null references instrumento(id) on delete cascade,
  numero         smallint not null,
  titulo         text not null,
  peso           numeric(6,2) not null default 0,
  dimensoes_sinaes smallint[] default '{}',
  descricao      text,
  unique (instrumento_id, numero)
);

create table if not exists indicador (
  id           uuid primary key default gen_random_uuid(),
  eixo_id      uuid not null references eixo(id) on delete cascade,
  codigo       text not null,
  titulo       text not null,
  texto_base   text,
  nsa_policy   text not null default 'FIXED_APPLICABLE',
  critico_ead  boolean not null default false,
  ordem        int not null default 0,
  unique (eixo_id, codigo)
);

create table if not exists criterio_conceito (
  id           uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references indicador(id) on delete cascade,
  conceito     smallint not null check (conceito between 1 and 5),
  texto        text not null,
  origem       text not null default 'VERBATIM',
  unique (indicador_id, conceito)
);

create table if not exists requisito_evidencia (
  id           uuid primary key default gen_random_uuid(),
  indicador_id uuid not null references indicador(id) on delete cascade,
  slug         text not null,
  titulo       text not null,
  obrigatorio  boolean not null default true,
  unique (indicador_id, slug)
);

create table if not exists requisito_legal (
  id             uuid primary key default gen_random_uuid(),
  instrumento_id uuid not null references instrumento(id) on delete cascade,
  codigo         text not null,
  titulo         text not null,
  base_legal     text,
  aplica_ead     boolean not null default true,
  unique (instrumento_id, codigo)
);

-- ------------------------------------------------------------- avaliação
create table if not exists ciclo_avaliacao (
  id             uuid primary key default gen_random_uuid(),
  instrumento_id uuid not null references instrumento(id),
  escopo         text not null default 'IES',
  ies_id         uuid references ies(id),
  curso_id       uuid references curso(id),
  titulo         text not null,
  finalidade     text not null default 'AUTOAVALIACAO',
  ano_referencia int not null,
  meta_conceito  numeric(3,2) not null default 5.0,
  status         text not null default 'ABERTO',
  responsavel    text,
  observacao     text,
  criado_em      timestamptz not null default now()
);

create table if not exists avaliacao_indicador (
  id                    uuid primary key default gen_random_uuid(),
  ciclo_id              uuid not null references ciclo_avaliacao(id) on delete cascade,
  indicador_id          uuid not null references indicador(id) on delete cascade,
  conceito_autoavaliado smallint check (conceito_autoavaliado between 1 and 5),
  conceito_meta         smallint not null default 5,
  conceito_inep         smallint,
  is_nsa                boolean not null default false,
  justificativa_nsa     text,
  analise               text,
  plano_acao            text,
  responsavel           text,
  prazo                 date,
  status                text not null default 'NAO_INICIADO',
  atualizado_em         timestamptz not null default now(),
  unique (ciclo_id, indicador_id)
);

create table if not exists avaliacao_requisito_legal (
  id                 uuid primary key default gen_random_uuid(),
  ciclo_id           uuid not null references ciclo_avaliacao(id) on delete cascade,
  requisito_legal_id uuid not null references requisito_legal(id) on delete cascade,
  situacao           text not null default 'NAO_VERIFICADO',
  observacao         text,
  atualizado_em      timestamptz not null default now(),
  unique (ciclo_id, requisito_legal_id)
);

create table if not exists evidencia_vinculo (
  id                     uuid primary key default gen_random_uuid(),
  documento_id           uuid not null references documento(id) on delete cascade,
  avaliacao_indicador_id uuid references avaliacao_indicador(id) on delete cascade,
  requisito_evidencia_id uuid references requisito_evidencia(id) on delete set null,
  observacao             text,
  vinculado_em           timestamptz not null default now()
);

-- ------------------------------------------------------------- regulatório
create table if not exists processo_regulatorio (
  id              uuid primary key default gen_random_uuid(),
  numero_processo text,
  codigo_avaliacao text,
  tipo            text not null,
  curso_id        uuid references curso(id),
  ies_id          uuid references ies(id),
  fase            text not null default 'PLANEJAMENTO',
  data_protocolo  date,
  janela_inicio   date,
  janela_fim      date,
  prazo_parecer   date,
  taxa_paga       boolean not null default false,
  taxa_vencimento date,
  prazos_suspensos boolean not null default false,
  responsavel     text,
  observacao      text,
  criado_em       timestamptz not null default now()
);

create table if not exists processo_fase (
  id           uuid primary key default gen_random_uuid(),
  processo_id  uuid not null references processo_regulatorio(id) on delete cascade,
  fase         text not null,
  data_entrada date,
  prazo_legal  date,
  responsavel  text,
  observacao   text
);

create table if not exists visita_in_loco (
  id               uuid primary key default gen_random_uuid(),
  processo_id      uuid references processo_regulatorio(id),
  curso_id         uuid references curso(id),
  codigo_avaliacao text,
  modalidade       text,
  data_inicio      date,
  data_fim         date,
  comissao         text,
  ponto_focal      text,
  link_nuvem       text,
  status           text default 'PLANEJADA',
  observacao       text
);

create table if not exists supervisao_ocorrencia (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null,
  origem         text,
  curso_id       uuid references curso(id),
  numero         text,
  data_ciencia   date,
  prazo_resposta date,
  situacao       text not null default 'ABERTA',
  suspende_prazos boolean not null default false,
  medidas        text,
  responsavel    text,
  descricao      text,
  criado_em      timestamptz not null default now()
);

-- ------------------------------------------------------------------ LegalOne
create table if not exists norma (
  id              uuid primary key default gen_random_uuid(),
  especie         text not null,
  orgao           text not null,
  numero          text,
  ano             int,
  data_assinatura date,
  data_publicacao date,
  ementa          text not null,
  url_dou         text,
  vigente         boolean not null default true,
  relevancia      text default 'MEDIA',
  tags            text[] default '{}',
  observacao      text,
  criado_em       timestamptz not null default now()
);

create table if not exists norma_indicador (
  id           uuid primary key default gen_random_uuid(),
  norma_id     uuid not null references norma(id) on delete cascade,
  indicador_id uuid not null references indicador(id) on delete cascade,
  nota         text,
  unique (norma_id, indicador_id)
);

-- ---------------------------------------------------------- pessoas/colegiados
create table if not exists pessoa (
  id                    uuid primary key default gen_random_uuid(),
  nome                  text not null,
  email                 text,
  cpf_hash              text,
  titulacao             text,
  area_titulacao        text,
  funcao                text,
  regime_trabalho       text,
  curso_id              uuid references curso(id),
  polo_id               uuid references polo(id),
  data_admissao         date,
  meses_docencia_superior int,
  meses_docencia_ead    int,
  meses_tutoria_ead     int,
  meses_experiencia_profissional int,
  producao_ultimos_3_anos int,
  lattes                text,
  disciplinas           text,
  situacao              text default 'ATIVO',
  observacao            text,
  criado_em             timestamptz not null default now()
);

create table if not exists colegiado (
  id            uuid primary key default gen_random_uuid(),
  tipo          text not null,
  nome          text not null,
  curso_id      uuid references curso(id),
  ato_designacao text,
  data_designacao date,
  mandato_meses int,
  regimento     text,
  atribuicoes   text,
  situacao      text default 'ATIVO',
  criado_em     timestamptz not null default now()
);

create table if not exists colegiado_membro (
  id            uuid primary key default gen_random_uuid(),
  colegiado_id  uuid not null references colegiado(id) on delete cascade,
  pessoa_id     uuid references pessoa(id),
  nome          text not null,
  perfil        text,
  titulacao     text,
  regime_trabalho text,
  funcao        text,
  desde         date,
  ate           date
);

create table if not exists reuniao (
  id            uuid primary key default gen_random_uuid(),
  colegiado_id  uuid references colegiado(id) on delete cascade,
  data          date not null,
  pauta         text,
  deliberacoes  text,
  participantes text,
  documento_id  uuid references documento(id)
);

-- --------------------------------------------------------------------- CPA
create table if not exists cpa_ciclo (
  id               uuid primary key default gen_random_uuid(),
  ano_referencia   int not null,
  titulo           text not null,
  tipo_relatorio   text default 'PARCIAL',
  etapa            text default 'SENSIBILIZACAO',
  inicio_coleta    date,
  fim_coleta       date,
  data_postagem_emec date,
  participacao_discentes numeric(5,2),
  participacao_docentes numeric(5,2),
  participacao_tecnicos numeric(5,2),
  responsavel      text,
  status           text default 'ABERTO',
  observacao       text
);

create table if not exists cpa_resultado (
  id            uuid primary key default gen_random_uuid(),
  cpa_ciclo_id  uuid not null references cpa_ciclo(id) on delete cascade,
  segmento      text not null,
  eixo_numero   smallint,
  dimensao_sinaes smallint,
  pergunta      text,
  media         numeric(4,2),
  respondentes  int,
  acao_melhoria text
);

-- ------------------------------------------------------------------- ENADE
create table if not exists enade_ciclo (
  id               uuid primary key default gen_random_uuid(),
  ano              int not null unique,
  ano_ciclo        smallint,
  modalidades      text,
  areas            text,
  edital           text,
  data_prova       date,
  inscricao_inicio date,
  inscricao_fim    date,
  questionario_inicio date,
  questionario_fim date,
  observacao       text
);

create table if not exists curso_enade_edicao (
  id             uuid primary key default gen_random_uuid(),
  curso_id       uuid not null references curso(id) on delete cascade,
  enade_ciclo_id uuid not null references enade_ciclo(id) on delete cascade,
  enquadrado     boolean not null default false,
  area_avaliacao text,
  motivo_nao_enquadramento text,
  declaracao_nao_enquadramento boolean not null default false,
  proximo_ciclo_previsto int,
  concluintes_previstos int,
  inscritos      int,
  regulares      int,
  irregulares    int,
  conceito_obtido numeric(3,2),
  observacao     text,
  unique (curso_id, enade_ciclo_id)
);

create table if not exists enade_estudante (
  id                    uuid primary key default gen_random_uuid(),
  curso_enade_edicao_id uuid not null references curso_enade_edicao(id) on delete cascade,
  ra                    text not null,
  nome                  text not null,
  cpf_hash              text,
  habilitacao           text,
  percentual_integralizacao numeric(5,2),
  ano_fim_ensino_medio  int,
  ano_formatura         int,
  situacao              text not null default 'PENDENTE_INSCRICAO',
  questionario_respondido boolean not null default false,
  observacao            text
);

-- ------------------------------------------------------------------- CENSO
create table if not exists censo_ano (
  id                 uuid primary key default gen_random_uuid(),
  ano_referencia     int not null unique,
  portaria           text,
  coleta_inicio      date,
  coleta_fim         date,
  conclusao_insercao date,
  justificativas_fim date,
  divulgacao_prevista date,
  recenseador        text,
  status             text default 'PLANEJADO',
  observacao         text
);

create table if not exists censo_modulo (
  id            uuid primary key default gen_random_uuid(),
  censo_ano_id  uuid not null references censo_ano(id) on delete cascade,
  modulo        text not null,
  status        text not null default 'NAO_INICIADO',
  responsavel   text,
  registros_declarados int,
  fechado_em    timestamptz,
  observacao    text,
  unique (censo_ano_id, modulo)
);

create table if not exists censo_pendencia (
  id              uuid primary key default gen_random_uuid(),
  censo_modulo_id uuid not null references censo_modulo(id) on delete cascade,
  tipo            text,
  codigo          text,
  descricao       text,
  registro_ref    text,
  justificativa   text,
  responsavel     text,
  status          text not null default 'ABERTA',
  resolvida_em    timestamptz
);

-- ------------------------------------------------------- indicadores e prazos
create table if not exists indicador_qualidade (
  id       uuid primary key default gen_random_uuid(),
  tipo     text not null,
  escopo   text not null default 'IES',
  ies_id   uuid references ies(id),
  curso_id uuid references curso(id),
  ano      int not null,
  valor    numeric(5,2),
  faixa    smallint,
  fonte    text
);

create table if not exists prazo (
  id           uuid primary key default gen_random_uuid(),
  titulo       text not null,
  categoria    text not null,
  data_limite  date not null,
  data_inicio  date,
  curso_id     uuid references curso(id),
  base_legal   text,
  responsavel  text,
  criticidade  text default 'ALTA',
  status       text not null default 'PENDENTE',
  observacao   text
);

create index if not exists idx_avaliacao_indicador_ciclo on avaliacao_indicador(ciclo_id);
create index if not exists idx_indicador_eixo on indicador(eixo_id);
create index if not exists idx_eixo_instrumento on eixo(instrumento_id);
create index if not exists idx_prazo_data on prazo(data_limite);
create index if not exists idx_documento_categoria on documento(categoria);
