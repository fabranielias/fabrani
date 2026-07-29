/**
 * Motor de regras determinístico do Sócrates.
 *
 * Roda inteiramente em SQL, sem LLM e sem custo. É a camada que sustenta os
 * selos inline, o resumo diário e a fila de pendências: tudo que um avaliador
 * cobraria numa visita e que dá para verificar sem interpretar texto.
 */

import { query } from "../db";

export type Severidade = "RISCO" | "ATENCAO" | "INFO";

export type Sugestao = {
  alvoTipo: string;
  alvoId: string | null;
  regra: string;
  severidade: Severidade;
  titulo: string;
  mensagem: string;
  href?: string;
};

const MINIMO_ANALISE = 240;

type Consulta = () => Promise<Sugestao[]>;

const conceitoSemEvidencia: Consulta = async () => {
  const linhas = await query<{ id: string; ciclo_id: string; codigo: string; conceito: number }>(
    `select ai.id, ai.ciclo_id, ind.codigo, ai.conceito_autoavaliado as conceito
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
      where ai.is_nsa = false
        and ai.conceito_autoavaliado >= 4
        and not exists (select 1 from evidencia_vinculo ev where ev.avaliacao_indicador_id = ai.id)`,
  );
  return linhas.map((l) => ({
    alvoTipo: "INDICADOR",
    alvoId: l.id,
    regra: "conceito_alto_sem_evidencia",
    severidade: "RISCO" as const,
    titulo: `Indicador ${l.codigo}: conceito ${l.conceito} sem evidência`,
    mensagem:
      "A comissão só confirma conceito 4 ou 5 com evidência documental. Vincule ao menos um documento antes da visita.",
    href: `/painel/avaliacao/${l.ciclo_id}/indicador/${l.id}`,
  }));
};

const analiseInsuficiente: Consulta = async () => {
  const linhas = await query<{ id: string; ciclo_id: string; codigo: string; tamanho: number }>(
    `select ai.id, ai.ciclo_id, ind.codigo, coalesce(length(ai.analise), 0) as tamanho
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
      where ai.is_nsa = false
        and ai.conceito_autoavaliado is not null
        and coalesce(length(ai.analise), 0) < ${MINIMO_ANALISE}`,
  );
  return linhas.map((l) => ({
    alvoTipo: "INDICADOR",
    alvoId: l.id,
    regra: "analise_insuficiente",
    severidade: "ATENCAO" as const,
    titulo: `Indicador ${l.codigo}: análise curta demais`,
    mensagem:
      "A análise precisa descrever a prática, sua abrangência, a periodicidade, o responsável e o resultado medido. Peça um rascunho ao Sócrates.",
    href: `/painel/avaliacao/${l.ciclo_id}/indicador/${l.id}`,
  }));
};

const indicadorSemPlano: Consulta = async () => {
  const linhas = await query<{ id: string; ciclo_id: string; codigo: string }>(
    `select ai.id, ai.ciclo_id, ind.codigo
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
      where ai.is_nsa = false
        and ai.conceito_autoavaliado is not null
        and ai.conceito_autoavaliado < ai.conceito_meta
        and (ai.plano_acao is null or ai.responsavel is null or ai.prazo is null)`,
  );
  return linhas.map((l) => ({
    alvoTipo: "INDICADOR",
    alvoId: l.id,
    regra: "lacuna_sem_plano",
    severidade: "ATENCAO" as const,
    titulo: `Indicador ${l.codigo}: lacuna sem plano de ação completo`,
    mensagem: "Toda lacuna abaixo da meta precisa de plano de ação, responsável e prazo.",
    href: `/painel/avaliacao/${l.ciclo_id}/indicador/${l.id}`,
  }));
};

const nsaSemJustificativa: Consulta = async () => {
  const linhas = await query<{ id: string; ciclo_id: string; codigo: string }>(
    `select ai.id, ai.ciclo_id, ind.codigo
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
      where ai.is_nsa = true and coalesce(ai.justificativa_nsa, '') = ''`,
  );
  return linhas.map((l) => ({
    alvoTipo: "INDICADOR",
    alvoId: l.id,
    regra: "nsa_sem_justificativa",
    severidade: "RISCO" as const,
    titulo: `Indicador ${l.codigo}: NSA sem justificativa`,
    mensagem:
      "NSA sem justificativa costuma ser revertido pela comissão, e o indicador volta a pesar na média.",
    href: `/painel/avaliacao/${l.ciclo_id}/indicador/${l.id}`,
  }));
};

const evidenciaObrigatoriaFaltante: Consulta = async () => {
  const linhas = await query<{ id: string; ciclo_id: string; codigo: string; faltantes: string }>(
    `select ai.id, ai.ciclo_id, ind.codigo, string_agg(re.titulo, '; ') as faltantes
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join requisito_evidencia re on re.indicador_id = ind.id and re.obrigatorio
      where ai.is_nsa = false
        and not exists (
          select 1 from evidencia_vinculo ev
           where ev.avaliacao_indicador_id = ai.id and ev.requisito_evidencia_id = re.id)
      group by ai.id, ai.ciclo_id, ind.codigo`,
  );
  return linhas.map((l) => ({
    alvoTipo: "INDICADOR",
    alvoId: l.id,
    regra: "requisito_evidencia_faltante",
    severidade: "ATENCAO" as const,
    titulo: `Indicador ${l.codigo}: evidência obrigatória ausente`,
    mensagem: `Faltam: ${l.faltantes}.`,
    href: `/painel/avaliacao/${l.ciclo_id}/indicador/${l.id}`,
  }));
};

const documentoVencido: Consulta = async () => {
  const linhas = await query<{ id: string; titulo: string; valido_ate: string }>(
    `select id, titulo, to_char(valido_ate, 'DD/MM/YYYY') as valido_ate
       from documento
      where status = 'VIGENTE' and valido_ate is not null and valido_ate < current_date`,
  );
  return linhas.map((l) => ({
    alvoTipo: "DOCUMENTO",
    alvoId: l.id,
    regra: "documento_vencido",
    severidade: "RISCO" as const,
    titulo: `Documento vencido: ${l.titulo}`,
    mensagem: `Validade encerrada em ${l.valido_ate}. Suba a versão nova — evidência vencida reabre a lacuna do indicador.`,
    href: "/painel/documentos",
  }));
};

const documentoVencendo: Consulta = async () => {
  const linhas = await query<{ id: string; titulo: string; dias: number }>(
    `select id, titulo, (valido_ate - current_date) as dias
       from documento
      where status = 'VIGENTE' and valido_ate between current_date and current_date + 60`,
  );
  return linhas.map((l) => ({
    alvoTipo: "DOCUMENTO",
    alvoId: l.id,
    regra: "documento_vencendo",
    severidade: "ATENCAO" as const,
    titulo: `Documento vence em ${l.dias} dia(s): ${l.titulo}`,
    mensagem: "Programe a revisão antes do vencimento.",
    href: "/painel/documentos",
  }));
};

const ndeIncompleto: Consulta = async () => {
  const linhas = await query<{
    id: string;
    nome: string;
    membros: number;
    stricto: number;
    integral: number;
  }>(
    `select c.id, c.nome,
            count(m.*) filter (where m.ate is null) as membros,
            count(m.*) filter (where m.ate is null and m.titulacao in ('MESTRADO','DOUTORADO')) as stricto,
            count(m.*) filter (where m.ate is null and m.regime_trabalho = 'INTEGRAL') as integral
       from colegiado c
       left join colegiado_membro m on m.colegiado_id = c.id
      where c.tipo = 'NDE' and c.situacao = 'ATIVO'
      group by c.id, c.nome`,
  );
  const saida: Sugestao[] = [];
  for (const l of linhas) {
    const problemas: string[] = [];
    if (l.membros < 5) problemas.push(`${l.membros} membros (mínimo 5)`);
    if (l.membros > 0 && l.stricto / l.membros < 0.6)
      problemas.push(`${l.stricto} com stricto sensu (mínimo 60%)`);
    if (l.membros > 0 && l.integral / l.membros < 0.2)
      problemas.push(`${l.integral} em tempo integral (mínimo 20%)`);
    if (problemas.length === 0) continue;
    saida.push({
      alvoTipo: "COLEGIADO",
      alvoId: l.id,
      regra: "nde_composicao",
      severidade: "RISCO",
      titulo: `NDE fora do mínimo legal: ${l.nome}`,
      mensagem: `${problemas.join("; ")}. Resolução CONAES nº 1/2010, art. 1º.`,
      href: `/painel/dados/colegiado/${l.id}`,
    });
  }
  return saida;
};

const colegiadoSemAta: Consulta = async () => {
  const linhas = await query<{ id: string; nome: string; tipo: string; ultima: string | null }>(
    `select c.id, c.nome, c.tipo, to_char(max(r.data), 'DD/MM/YYYY') as ultima
       from colegiado c
       left join reuniao r on r.colegiado_id = c.id
      where c.situacao = 'ATIVO'
      group by c.id, c.nome, c.tipo
     having max(r.data) is null or max(r.data) < current_date - 180`,
  );
  return linhas.map((l) => ({
    alvoTipo: "COLEGIADO",
    alvoId: l.id,
    regra: "colegiado_sem_reuniao",
    severidade: "ATENCAO" as const,
    titulo: `${l.tipo} sem reunião registrada: ${l.nome}`,
    mensagem: l.ultima
      ? `Última ata em ${l.ultima}. A regularidade das reuniões é evidência dos indicadores 1.13 e 2.1 — peça ao Sócrates para gerar a ata.`
      : "Nenhuma ata registrada. A regularidade das reuniões é evidência dos indicadores 1.13 e 2.1.",
    href: `/painel/dados/reuniao`,
  }));
};

const prazoProximo: Consulta = async () => {
  const linhas = await query<{ id: string; titulo: string; dias: number; criticidade: string }>(
    `select id, titulo, (data_limite - current_date) as dias, coalesce(criticidade, 'MEDIA') as criticidade
       from prazo
      where status in ('PENDENTE', 'EM_ANDAMENTO')
        and data_limite between current_date - 3650 and current_date + 45`,
  );
  return linhas.map((l) => ({
    alvoTipo: "PRAZO",
    alvoId: l.id,
    regra: l.dias < 0 ? "prazo_vencido" : "prazo_proximo",
    severidade: l.dias < 0 || l.criticidade === "CRITICA" ? ("RISCO" as const) : ("ATENCAO" as const),
    titulo: l.dias < 0 ? `Prazo vencido: ${l.titulo}` : `Prazo em ${l.dias} dia(s): ${l.titulo}`,
    mensagem:
      l.dias < 0
        ? "Obrigação com data limite ultrapassada e ainda em aberto."
        : "Obrigação regulatória se aproximando do vencimento.",
    href: `/painel/dados/prazo/${l.id}`,
  }));
};

const censoModuloAberto: Consulta = async () => {
  const linhas = await query<{ id: string; modulo: string; ano: number; status: string; dias: number | null }>(
    `select m.id, m.modulo, a.ano_referencia as ano, m.status,
            (a.coleta_fim - current_date) as dias
       from censo_modulo m
       join censo_ano a on a.id = m.censo_ano_id
      where m.status <> 'FECHADO' and a.status <> 'FECHADO'`,
  );
  return linhas.map((l) => ({
    alvoTipo: "CENSO",
    alvoId: l.id,
    regra: "censo_modulo_aberto",
    severidade: l.dias !== null && l.dias <= 30 ? ("RISCO" as const) : ("ATENCAO" as const),
    titulo: `Censo ${l.ano}: módulo ${l.modulo} em ${l.status}`,
    mensagem:
      l.dias !== null
        ? `Faltam ${l.dias} dia(s) para o fim da coleta. IES que não fecha os módulos é inativada, com publicação no DOU.`
        : "Módulo ainda não fechado no Censup.",
    href: `/painel/dados/censo-modulo/${l.id}`,
  }));
};

const poloSemAdequacao: Consulta = async () => {
  const linhas = await query<{ id: string; nome: string; status: string }>(
    `select id, nome, coalesce(adequacao_12456_status, 'NAO_INICIADA') as status
       from polo
      where situacao in ('ATIVO', 'EM_IMPLANTACAO')
        and coalesce(adequacao_12456_status, 'NAO_INICIADA') <> 'ADEQUADO'`,
  );
  return linhas.map((l) => ({
    alvoTipo: "POLO",
    alvoId: l.id,
    regra: "polo_adequacao_12456",
    severidade: "ATENCAO" as const,
    titulo: `Polo ${l.nome}: adequação ao Decreto nº 12.456/2025 ${l.status === "NAO_INICIADA" ? "não iniciada" : "em andamento"}`,
    mensagem:
      "Registre o plano e as evidências de infraestrutura mínima (art. 29) antes do fim do período de transição.",
    href: `/painel/dados/polo/${l.id}`,
  }));
};

const supervisaoSemResposta: Consulta = async () => {
  const linhas = await query<{ id: string; numero: string | null; dias: number | null }>(
    `select id, numero, (prazo_resposta - current_date) as dias
       from supervisao_ocorrencia
      where situacao in ('ABERTA', 'EM_RESPOSTA')`,
  );
  return linhas.map((l) => ({
    alvoTipo: "SUPERVISAO",
    alvoId: l.id,
    regra: "supervisao_aberta",
    severidade: l.dias !== null && l.dias <= 10 ? ("RISCO" as const) : ("ATENCAO" as const),
    titulo: `Supervisão em aberto${l.numero ? `: ${l.numero}` : ""}`,
    mensagem:
      l.dias !== null
        ? `Prazo de resposta em ${l.dias} dia(s). Peça ao Sócrates o rascunho da resposta à diligência.`
        : "Ocorrência sem prazo de resposta informado.",
    href: `/painel/dados/supervisao/${l.id}`,
  }));
};

const enadeEstudanteIrregular: Consulta = async () => {
  const linhas = await query<{ n: string }>(
    `select count(*)::text as n from enade_estudante where situacao = 'IRREGULAR'`,
  );
  const n = Number(linhas[0]?.n ?? 0);
  if (n === 0) return [];
  return [
    {
      alvoTipo: "ENADE",
      alvoId: null,
      regra: "enade_irregular",
      severidade: "RISCO" as const,
      titulo: `${n} estudante(s) em situação irregular no ENADE`,
      mensagem: "Situação irregular impede a colação de grau e a emissão do diploma.",
      href: "/painel/dados/enade-estudante",
    },
  ];
};

const REGRAS: Consulta[] = [
  conceitoSemEvidencia,
  analiseInsuficiente,
  indicadorSemPlano,
  nsaSemJustificativa,
  evidenciaObrigatoriaFaltante,
  documentoVencido,
  documentoVencendo,
  ndeIncompleto,
  colegiadoSemAta,
  prazoProximo,
  censoModuloAberto,
  poloSemAdequacao,
  supervisaoSemResposta,
  enadeEstudanteIrregular,
];

const ORDEM_SEVERIDADE: Record<Severidade, number> = { RISCO: 0, ATENCAO: 1, INFO: 2 };

/** Avalia todas as regras. Sem LLM, sem custo. */
export async function avaliarRegras(): Promise<Sugestao[]> {
  const resultados = await Promise.all(REGRAS.map((r) => r()));
  return resultados
    .flat()
    .sort((a, b) => ORDEM_SEVERIDADE[a.severidade] - ORDEM_SEVERIDADE[b.severidade]);
}

/** Sugestões de um alvo específico — usado pelos selos inline. */
export async function regrasDoAlvo(alvoTipo: string, alvoId: string): Promise<Sugestao[]> {
  const todas = await avaliarRegras();
  return todas.filter((s) => s.alvoTipo === alvoTipo && s.alvoId === alvoId);
}

/** Persiste o resultado das regras, preservando o status das sugestões já tratadas. */
export async function sincronizarSugestoes(): Promise<{ criadas: number; resolvidas: number }> {
  const atuais = await avaliarRegras();
  const chaves = atuais.map((s) => `${s.regra}|${s.alvoId ?? ""}`);

  const existentes = await query<{ id: string; regra: string; alvo_id: string | null }>(
    `select id, regra, alvo_id from socrates_sugestao where origem = 'REGRA' and status = 'ABERTA'`,
  );
  const existentesPorChave = new Map(existentes.map((e) => [`${e.regra}|${e.alvo_id ?? ""}`, e.id]));

  let criadas = 0;
  for (const s of atuais) {
    const chave = `${s.regra}|${s.alvoId ?? ""}`;
    if (existentesPorChave.has(chave)) continue;
    await query(
      `insert into socrates_sugestao (alvo_tipo, alvo_id, regra, severidade, titulo, mensagem, origem)
       values ($1,$2,$3,$4,$5,$6,'REGRA')`,
      [s.alvoTipo, s.alvoId, s.regra, s.severidade, s.titulo, s.mensagem],
    );
    criadas += 1;
  }

  const obsoletas = existentes.filter((e) => !chaves.includes(`${e.regra}|${e.alvo_id ?? ""}`));
  for (const o of obsoletas) {
    await query(
      `update socrates_sugestao set status = 'RESOLVIDA', atualizado_em = now() where id = $1`,
      [o.id],
    );
  }

  return { criadas, resolvidas: obsoletas.length };
}
