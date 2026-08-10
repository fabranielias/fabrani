import { query, queryOne } from "./db";
import { registrarAuditoria } from "./crud";
import type { Sessao } from "./session";

/**
 * Alvos possíveis de um vínculo de evidência. Cada documento pode comprovar
 * um indicador, um requisito legal, um curso, um polo, um ato — o que existir
 * no acervo regulatório.
 */
export const ALVOS = {
  AVALIACAO_INDICADOR: { rotulo: "Indicador do ciclo", tabela: "avaliacao_indicador", titulo: "id::text" },
  REQUISITO_LEGAL: { rotulo: "Requisito legal", tabela: "requisito_legal", titulo: "titulo" },
  CURSO: { rotulo: "Curso", tabela: "curso", titulo: "nome" },
  POLO: { rotulo: "Polo", tabela: "polo", titulo: "nome" },
  ATO: { rotulo: "Ato regulatório", tabela: "ato_regulatorio", titulo: "titulo" },
  PROCESSO: { rotulo: "Processo e-MEC", tabela: "processo_regulatorio", titulo: "titulo" },
  PRAZO: { rotulo: "Prazo", tabela: "prazo", titulo: "titulo" },
  REUNIAO: { rotulo: "Reunião", tabela: "reuniao", titulo: "pauta" },
  PESSOA: { rotulo: "Pessoa", tabela: "pessoa", titulo: "nome" },
  COLEGIADO: { rotulo: "Colegiado", tabela: "colegiado", titulo: "nome" },
  CPA_CICLO: { rotulo: "Ciclo da CPA", tabela: "cpa_ciclo", titulo: "titulo" },
  CENSO_ANO: { rotulo: "Censo", tabela: "censo_ano", titulo: "ano_base::text" },
  ENADE_CICLO: { rotulo: "Ciclo do ENADE", tabela: "enade_ciclo", titulo: "titulo" },
  IES: { rotulo: "IES", tabela: "ies", titulo: "nome" },
  SUGESTAO: { rotulo: "Apontamento do Sócrates", tabela: "socrates_sugestao", titulo: "titulo" },
} as const;

export type AlvoTipo = keyof typeof ALVOS;

export function alvoValido(tipo: string): tipo is AlvoTipo {
  return tipo in ALVOS;
}

/** Mapa entidade do registry → alvo de evidência, para a aba Anexos do CRUD. */
const ALVO_POR_ENTIDADE: Record<string, AlvoTipo> = {
  curso: "CURSO",
  polo: "POLO",
  ato: "ATO",
  processo: "PROCESSO",
  prazo: "PRAZO",
  reuniao: "REUNIAO",
  pessoa: "PESSOA",
  colegiado: "COLEGIADO",
  "cpa-ciclo": "CPA_CICLO",
  "censo-ano": "CENSO_ANO",
  "enade-ciclo": "ENADE_CICLO",
  ies: "IES",
};

export function alvoDaEntidade(slug: string): AlvoTipo | null {
  return ALVO_POR_ENTIDADE[slug] ?? null;
}

export async function rotuloDoAlvo(tipo: AlvoTipo, id: string): Promise<string> {
  const alvo = ALVOS[tipo];
  const linha = await queryOne<{ rotulo: string | null }>(
    `select ${alvo.titulo} as rotulo from ${alvo.tabela} where id = $1`,
    [id],
  );
  return linha?.rotulo ?? alvo.rotulo;
}

export type OpcaoAlvo = { id: string; rotulo: string };

/** Alvos oferecidos na tela de vínculo, já com rótulo legível. */
const TIPOS_SELECIONAVEIS: AlvoTipo[] = [
  "CURSO",
  "POLO",
  "ATO",
  "PROCESSO",
  "PRAZO",
  "REUNIAO",
  "PESSOA",
  "COLEGIADO",
  "REQUISITO_LEGAL",
  "IES",
];

export async function opcoesDeAlvo(): Promise<{ tipo: AlvoTipo; rotulo: string; opcoes: OpcaoAlvo[] }[]> {
  const resultado: { tipo: AlvoTipo; rotulo: string; opcoes: OpcaoAlvo[] }[] = [];
  for (const tipo of TIPOS_SELECIONAVEIS) {
    const alvo = ALVOS[tipo];
    try {
      const opcoes = await query<OpcaoAlvo>(
        `select id, ${alvo.titulo} as rotulo from ${alvo.tabela} order by 2 limit 200`,
      );
      if (opcoes.length > 0) resultado.push({ tipo, rotulo: alvo.rotulo, opcoes });
    } catch {
      // Tabela ainda não populada nesta instalação: apenas não oferece o alvo.
    }
  }
  return resultado;
}

export type DocumentoVinculado = {
  vinculo_id: string;
  documento_id: string;
  nome_exibicao: string;
  titulo: string;
  categoria: string | null;
  status: string;
  versao: number;
  valido_ate: string | null;
  nome_arquivo: string | null;
  tamanho_bytes: string | null;
  tem_arquivo: boolean;
  observacao: string | null;
};

export async function documentosDoAlvo(tipo: AlvoTipo, id: string): Promise<DocumentoVinculado[]> {
  return query<DocumentoVinculado>(
    `select v.id as vinculo_id, d.id as documento_id,
            coalesce(d.nome_exibicao, d.titulo) as nome_exibicao, d.titulo, d.categoria, d.status,
            d.versao, d.valido_ate, d.nome_arquivo, d.tamanho_bytes::text as tamanho_bytes,
            (d.storage_path is not null) as tem_arquivo, v.observacao
       from evidencia_vinculo v
       join documento d on d.id = v.documento_id
      where v.alvo_tipo = $1 and v.alvo_id = $2 and d.excluido_em is null
      order by d.criado_em desc`,
    [tipo, id],
  );
}

export type VinculoDoDocumento = {
  id: string;
  alvo_tipo: AlvoTipo;
  alvo_id: string;
  observacao: string | null;
  rotulo: string;
};

export async function vinculosDoDocumento(documentoId: string): Promise<VinculoDoDocumento[]> {
  const linhas = await query<{
    id: string;
    alvo_tipo: string | null;
    alvo_id: string | null;
    observacao: string | null;
  }>(
    `select id, alvo_tipo, alvo_id, observacao from evidencia_vinculo
      where documento_id = $1 and alvo_tipo is not null order by vinculado_em desc`,
    [documentoId],
  );
  const resultado: VinculoDoDocumento[] = [];
  for (const linha of linhas) {
    if (!linha.alvo_tipo || !linha.alvo_id || !alvoValido(linha.alvo_tipo)) continue;
    resultado.push({
      id: linha.id,
      alvo_tipo: linha.alvo_tipo,
      alvo_id: linha.alvo_id,
      observacao: linha.observacao,
      rotulo: await rotuloDoAlvo(linha.alvo_tipo, linha.alvo_id),
    });
  }
  return resultado;
}

export async function vincular(
  documentoId: string,
  tipo: AlvoTipo,
  alvoId: string,
  sessao: Sessao,
  opcoes: { requisitoEvidenciaId?: string | null; observacao?: string | null } = {},
): Promise<void> {
  await query(
    `insert into evidencia_vinculo
       (documento_id, alvo_tipo, alvo_id, avaliacao_indicador_id, requisito_evidencia_id, observacao, criado_por)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict do nothing`,
    [
      documentoId,
      tipo,
      alvoId,
      tipo === "AVALIACAO_INDICADOR" ? alvoId : null,
      opcoes.requisitoEvidenciaId ?? null,
      opcoes.observacao ?? null,
      sessao.email,
    ],
  );
  await registrarAuditoria(sessao, "VINCULAR_EVIDENCIA", "evidencia_vinculo", documentoId, {
    alvo_tipo: tipo,
    alvo_id: alvoId,
  });
}

export async function desvincular(vinculoId: string, sessao: Sessao): Promise<void> {
  const linha = await queryOne<{ documento_id: string; alvo_tipo: string | null; alvo_id: string | null }>(
    "select documento_id, alvo_tipo, alvo_id from evidencia_vinculo where id = $1",
    [vinculoId],
  );
  if (!linha) return;
  await query("delete from evidencia_vinculo where id = $1", [vinculoId]);
  await registrarAuditoria(sessao, "DESVINCULAR_EVIDENCIA", "evidencia_vinculo", linha.documento_id, {
    alvo_tipo: linha.alvo_tipo,
    alvo_id: linha.alvo_id,
  });
}

export async function registrarAcesso(documentoId: string, email: string, acao: string): Promise<void> {
  await query("insert into documento_acesso (documento_id, usuario_email, acao) values ($1,$2,$3)", [
    documentoId,
    email,
    acao,
  ]);
}
