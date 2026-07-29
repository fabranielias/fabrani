/**
 * Sócrates — orquestração.
 *
 * Reúne contexto institucional, corpus normativo e ferramentas para: responder
 * perguntas com citação, analisar indicador como banca, planejar execuções
 * ("preencha X") e gerar atas/ofícios a partir de modelo.
 */

import { query, queryOne } from "../db";
import type { Sessao } from "../session";
import { registrarAuditoria } from "../crud";
import { baseLegalDoIndicador, buscarDispositivos, citar, type Dispositivo } from "./corpus";
import { conversar, extrairJson, hashConteudo, MODELO_PROFUNDO, MODELO_RAPIDO } from "./llm";
import {
  acaoSchema,
  alvoDaAcao,
  aplicarAcao,
  catalogoEntidades,
  estadoAtual,
  planoSchema,
  type Acao,
} from "./ferramentas";

const PAPEL = `Você é Sócrates, avaliador sênior do Sistema Nacional de Avaliação da Educação Superior (SINAES) e consultor regulatório da Faculdade Brasileira de Negócios Inovadores (FABRANI, código e-MEC 1751876, mantida pelo Instituto de Aperfeiçoamento em Práticas da Advocacia — IAPA, CNPJ 17.982.283/0001-17), faculdade EaD sediada em Jaboticabal/SP.

Regras invioláveis:
- Nunca invente dispositivo normativo, número de processo, data ou estatística. Se a informação não estiver no contexto recebido, diga que falta e indique quem deve fornecê-la.
- Cite a base legal apenas a partir dos dispositivos fornecidos no contexto.
- Conceitos que você atribuir são simulação interna da instituição, jamais resultado do INEP.
- Escreva em português do Brasil, no registro formal de documento acadêmico-regulatório, sem adjetivação vazia.
- Um bom texto de indicador descreve: a prática, sua abrangência, a periodicidade, o responsável, o resultado medido e a evidência que a comprova.`;

export type Fonte = { norma: string; rotulo: string; url: string | null };

function fontes(dispositivos: Dispositivo[]): Fonte[] {
  return dispositivos.map((d) => ({ norma: d.norma, rotulo: d.rotulo, url: d.url }));
}

function blocoNormativo(dispositivos: Dispositivo[]): string {
  if (dispositivos.length === 0) return "Nenhum dispositivo carregado no corpus para este tema.";
  return dispositivos.map((d) => `[${d.norma}, ${d.rotulo}] ${d.texto}`).join("\n\n");
}

// ------------------------------------------------------------------ PERGUNTAS

export async function perguntar(
  pergunta: string,
  sessao: Sessao,
): Promise<{ resposta: string; fontes: Fonte[]; tokens: number }> {
  const dispositivos = await buscarDispositivos(pergunta, 6);
  const { texto, tokens } = await conversar({
    sistema: PAPEL,
    modelo: MODELO_RAPIDO,
    maxTokens: 1200,
    pergunta: `Pergunta: ${pergunta}

Dispositivos disponíveis no corpus:
${blocoNormativo(dispositivos)}

Responda de forma objetiva citando os dispositivos entre colchetes. Se o corpus não cobrir a pergunta, diga isso explicitamente antes de responder pelo conhecimento geral, marcando essa parte como "sem base carregada".`,
  });

  await query(
    `insert into socrates_interacao (usuario_id, pergunta, resposta, fontes, tokens) values ($1,$2,$3,$4,$5)`,
    [sessao.id, pergunta, texto, JSON.stringify(fontes(dispositivos)), tokens],
  );

  return { resposta: texto, fontes: fontes(dispositivos), tokens };
}

// ------------------------------------------------------------------ INDICADOR

type DadosIndicador = {
  id: string;
  ciclo_id: string;
  indicador_id: string;
  codigo: string;
  titulo: string;
  texto_base: string | null;
  analise: string | null;
  plano_acao: string | null;
  conceito_autoavaliado: number | null;
  conceito_meta: number;
  ciclo_titulo: string;
};

export type AnaliseIndicador = {
  diagnostico: string;
  conceitoSimulado: number | null;
  textoSugerido: string;
  planoSugerido: string;
  evidenciasFaltantes: string[];
  fontes: Fonte[];
  doCache: boolean;
};

export async function analisarIndicador(avaliacaoId: string): Promise<AnaliseIndicador> {
  const dados = await queryOne<DadosIndicador>(
    `select ai.id, ai.ciclo_id, ai.indicador_id, ind.codigo, ind.titulo, ind.texto_base,
            ai.analise, ai.plano_acao, ai.conceito_autoavaliado, ai.conceito_meta,
            c.titulo as ciclo_titulo
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join ciclo_avaliacao c on c.id = ai.ciclo_id
      where ai.id = $1`,
    [avaliacaoId],
  );
  if (!dados) throw new Error("Indicador não encontrado.");

  const criterios = await query<{ conceito: number; texto: string; origem: string }>(
    `select conceito, texto, origem from criterio_conceito where indicador_id = $1 order by conceito`,
    [dados.indicador_id],
  );
  const requisitos = await query<{ titulo: string; vinculado: boolean }>(
    `select re.titulo,
            exists (select 1 from evidencia_vinculo ev
                     where ev.avaliacao_indicador_id = $1 and ev.requisito_evidencia_id = re.id) as vinculado
       from requisito_evidencia re where re.indicador_id = $2 order by re.titulo`,
    [avaliacaoId, dados.indicador_id],
  );
  const evidencias = await query<{ titulo: string }>(
    `select d.titulo from evidencia_vinculo ev join documento d on d.id = ev.documento_id
      where ev.avaliacao_indicador_id = $1`,
    [avaliacaoId],
  );
  const dispositivos = await baseLegalDoIndicador(dados.indicador_id, dados.titulo);

  const cacheKey = hashConteudo([
    "analise-indicador-v1",
    dados.indicador_id,
    dados.analise,
    dados.plano_acao,
    dados.conceito_autoavaliado,
    evidencias.map((e) => e.titulo),
  ]);

  const emCache = await queryOne<{ texto_sugerido: string | null }>(
    `select texto_sugerido from socrates_sugestao where cache_key = $1`,
    [cacheKey],
  );
  if (emCache?.texto_sugerido) {
    return { ...(JSON.parse(emCache.texto_sugerido) as Omit<AnaliseIndicador, "doCache">), doCache: true };
  }

  const provisorio = criterios.some((c) => c.origem !== "VERBATIM");
  const { texto, tokens } = await conversar({
    sistema: PAPEL,
    modelo: MODELO_PROFUNDO,
    maxTokens: 2200,
    pergunta: `Atue como a comissão avaliadora analisando um indicador do instrumento do INEP.

Indicador ${dados.codigo} — ${dados.titulo}
Texto base: ${dados.texto_base ?? "não carregado"}
${provisorio ? "ATENÇÃO: parte dos critérios abaixo é texto provisório (não verbatim do instrumento oficial). Sinalize isso no diagnóstico." : ""}

Critérios de conceito:
${criterios.map((c) => `${c.conceito}: ${c.texto}`).join("\n")}

Análise atual da IES: ${dados.analise ?? "(vazia)"}
Plano de ação atual: ${dados.plano_acao ?? "(vazio)"}
Conceito autoavaliado: ${dados.conceito_autoavaliado ?? "não informado"} | Meta: ${dados.conceito_meta}
Evidências vinculadas: ${evidencias.length > 0 ? evidencias.map((e) => e.titulo).join("; ") : "nenhuma"}
Requisitos de evidência: ${requisitos.map((r) => `${r.titulo}${r.vinculado ? " (ok)" : " (faltando)"}`).join("; ") || "não cadastrados"}

Base normativa disponível:
${blocoNormativo(dispositivos)}

Responda APENAS um JSON:
{"diagnostico": "por que o texto atual alcança ou não o conceito pretendido, citando o critério",
 "conceito_simulado": 1-5,
 "texto_sugerido": "redação completa da análise do indicador, pronta para colar, usando apenas fatos presentes no contexto e deixando [INFORMAR: ...] onde faltar dado",
 "plano_sugerido": "ações objetivas para alcançar o conceito 5",
 "evidencias_faltantes": ["..."]}`,
  });

  const bruto = extrairJson<{
    diagnostico: string;
    conceito_simulado: number | null;
    texto_sugerido: string;
    plano_sugerido: string;
    evidencias_faltantes?: string[];
  }>(texto);

  const analise: Omit<AnaliseIndicador, "doCache"> = {
    diagnostico: bruto.diagnostico,
    conceitoSimulado: bruto.conceito_simulado ?? null,
    textoSugerido: bruto.texto_sugerido,
    planoSugerido: bruto.plano_sugerido,
    evidenciasFaltantes: bruto.evidencias_faltantes ?? [],
    fontes: fontes(dispositivos),
  };

  await query(
    `insert into socrates_sugestao
       (alvo_tipo, alvo_id, regra, severidade, titulo, mensagem, texto_sugerido, fontes, origem, cache_key, custo_tokens)
     values ('INDICADOR',$1,'analise_llm','INFO',$2,$3,$4,$5,'LLM',$6,$7)
     on conflict do nothing`,
    [
      avaliacaoId,
      `Análise do indicador ${dados.codigo}`,
      bruto.diagnostico,
      JSON.stringify(analise),
      JSON.stringify(analise.fontes),
      cacheKey,
      tokens,
    ],
  );

  return { ...analise, doCache: false };
}

// ------------------------------------------------------------------- EXECUÇÃO

async function contextoInstitucional(): Promise<string> {
  const ies = await query<{ id: string; nome: string }>(`select id, nome from ies order by nome`);
  const polos = await query<{ id: string; nome: string }>(`select id, nome from polo order by nome`);
  const cursos = await query<{ id: string; nome: string }>(`select id, nome from curso order by nome`);
  const ciclos = await query<{ id: string; titulo: string }>(
    `select id, titulo from ciclo_avaliacao where status = 'ABERTO' order by titulo`,
  );
  const colegiados = await query<{ id: string; nome: string; tipo: string }>(
    `select id, nome, tipo from colegiado where situacao = 'ATIVO' order by tipo, nome`,
  );
  const indicadoresPendentes = await query<{ id: string; codigo: string; ciclo: string }>(
    `select ai.id, ind.codigo, c.titulo as ciclo
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join ciclo_avaliacao c on c.id = ai.ciclo_id
      where ai.is_nsa = false and (ai.analise is null or length(ai.analise) < 240)
      order by c.titulo, ind.ordem limit 120`,
  );

  return `IES: ${ies.map((i) => `${i.nome} [${i.id}]`).join("; ") || "nenhuma"}
Polos: ${polos.map((p) => `${p.nome} [${p.id}]`).join("; ") || "nenhum"}
Cursos: ${cursos.map((c) => `${c.nome} [${c.id}]`).join("; ") || "nenhum"}
Ciclos de avaliação abertos: ${ciclos.map((c) => `${c.titulo} [${c.id}]`).join("; ") || "nenhum"}
Colegiados ativos: ${colegiados.map((c) => `${c.tipo} ${c.nome} [${c.id}]`).join("; ") || "nenhum"}
Indicadores com análise ausente ou curta (avaliacao_indicador_id): ${
    indicadoresPendentes.map((i) => `${i.codigo}@${i.ciclo} [${i.id}]`).join("; ") || "nenhum"
  }

Entidades disponíveis para preencher_entidade:
${catalogoEntidades()}`;
}

export async function planejar(pedido: string, sessao: Sessao): Promise<string> {
  const contexto = await contextoInstitucional();
  const dispositivos = await buscarDispositivos(pedido, 5);

  const { texto, tokens } = await conversar({
    sistema: PAPEL,
    modelo: MODELO_PROFUNDO,
    maxTokens: 8000,
    pergunta: `O usuário pediu: "${pedido}".

Monte um plano de execução usando apenas estas ferramentas:
- preencher_indicador {avaliacao_indicador_id, dados:{analise, plano_acao, responsavel, prazo (AAAA-MM-DD), conceito_autoavaliado}}
- preencher_entidade {entidade (slug), id (uuid existente ou null para criar), dados:{campo: valor}}
- gerar_documento {tipo, titulo, categoria, curso_id, corpo_markdown}
- vincular_evidencia {avaliacao_indicador_id, documento_id, requisito_evidencia_id}
- abrir_pendencia {titulo, categoria, data_limite, responsavel, criticidade}
- montar_dossie {ciclo_id, titulo}

Contexto institucional (use SOMENTE os uuids abaixo; nunca invente uuid):
${contexto}

Base normativa recuperada:
${blocoNormativo(dispositivos)}

Regras: campos de referência (terminados em _id) só aceitam um uuid listado acima; se o registro referenciado não existir, deixe o campo fora do JSON em vez de inventar identificador. Se faltar dado factual, não invente — use abrir_pendencia ou escreva [INFORMAR: ...] no texto. Se o pedido não puder virar ações, devolva "acoes": [] e explique no resumo.

Responda APENAS um JSON: {"resumo": "...", "acoes": [{"ferramenta": "...", "descricao": "...", ...campos da ferramenta}]}`,
  });

  const plano = planoSchema.parse(extrairJson(texto));

  const execucao = await queryOne<{ id: string }>(
    `insert into socrates_execucao (usuario_id, pedido, resumo, status, tokens)
     values ($1,$2,$3,'PLANEJADA',$4) returning id`,
    [sessao.id, pedido, plano.resumo, tokens],
  );
  if (!execucao) throw new Error("Falha ao registrar a execução.");

  let ordem = 0;
  for (const acao of plano.acoes) {
    const alvo = alvoDaAcao(acao);
    const antes = await estadoAtual(acao);
    await query(
      `insert into socrates_acao (execucao_id, ordem, ferramenta, alvo_tipo, alvo_id, descricao, antes, depois, fontes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        execucao.id,
        (ordem += 1),
        acao.ferramenta,
        alvo.tipo,
        alvo.id,
        acao.descricao,
        antes ? JSON.stringify(antes) : null,
        JSON.stringify(acao),
        JSON.stringify(fontes(dispositivos)),
      ],
    );
  }

  await registrarAuditoria(sessao, "SOCRATES_PLANEJAR", "socrates_execucao", execucao.id, {
    pedido,
    acoes: plano.acoes.length,
  });

  return execucao.id;
}

export async function aplicarExecucao(
  execucaoId: string,
  sessao: Sessao,
  apenas?: string[],
): Promise<{ aplicadas: number; erros: number }> {
  const acoes = await query<{ id: string; depois: unknown; status: string }>(
    `select id, depois, status from socrates_acao where execucao_id = $1 order by ordem`,
    [execucaoId],
  );

  let aplicadas = 0;
  let erros = 0;
  for (const linha of acoes) {
    if (linha.status !== "PROPOSTA") continue;
    if (apenas && !apenas.includes(linha.id)) continue;
    try {
      const acao: Acao = acaoSchema.parse(linha.depois);
      const alvoId = await aplicarAcao(acao, sessao);
      await query(`update socrates_acao set status = 'ACEITA', alvo_id = coalesce(alvo_id, $2) where id = $1`, [
        linha.id,
        alvoId,
      ]);
      aplicadas += 1;
    } catch (erro) {
      erros += 1;
      await query(`update socrates_acao set status = 'ERRO', erro = $2 where id = $1`, [
        linha.id,
        erro instanceof Error ? erro.message : String(erro),
      ]);
    }
  }

  const restantes = await queryOne<{ n: string }>(
    `select count(*)::text as n from socrates_acao where execucao_id = $1 and status = 'PROPOSTA'`,
    [execucaoId],
  );
  if (Number(restantes?.n ?? 0) === 0) {
    await query(
      `update socrates_execucao set status = $2, aplicado_em = now() where id = $1`,
      [execucaoId, erros > 0 ? "ERRO" : "APLICADA"],
    );
  }

  await registrarAuditoria(sessao, "SOCRATES_APLICAR", "socrates_execucao", execucaoId, { aplicadas, erros });
  return { aplicadas, erros };
}

export async function descartarExecucao(execucaoId: string, sessao: Sessao) {
  await query(`update socrates_acao set status = 'DESCARTADA' where execucao_id = $1 and status = 'PROPOSTA'`, [
    execucaoId,
  ]);
  await query(`update socrates_execucao set status = 'DESCARTADA' where id = $1`, [execucaoId]);
  await registrarAuditoria(sessao, "SOCRATES_DESCARTAR", "socrates_execucao", execucaoId, null);
}

// ------------------------------------------------------------------- DOCUMENTOS

type Modelo = { id: string; tipo: string; titulo: string; corpo: string; base_legal: string | null };

export async function modelosDisponiveis(): Promise<Modelo[]> {
  return query<Modelo>(
    `select id, tipo, titulo, corpo, base_legal from modelo_documento where vigente order by titulo`,
  );
}

/**
 * Gera ata/ofício/ato a partir do modelo vigente, preenchido com dados reais do
 * banco. O LLM redige apenas as partes discursivas.
 */
export async function gerarDocumentoDeModelo(opcoes: {
  tipo: string;
  colegiadoId?: string | null;
  contexto: string;
  sessao: Sessao;
}): Promise<string> {
  const modelo = await queryOne<Modelo>(
    `select id, tipo, titulo, corpo, base_legal from modelo_documento
      where tipo = $1 and vigente order by versao desc limit 1`,
    [opcoes.tipo],
  );
  if (!modelo) throw new Error(`Não há modelo vigente para ${opcoes.tipo}.`);

  let composicao = "";
  let colegiadoNome = "";
  if (opcoes.colegiadoId) {
    const colegiado = await queryOne<{ nome: string; tipo: string }>(
      `select nome, tipo from colegiado where id = $1`,
      [opcoes.colegiadoId],
    );
    colegiadoNome = colegiado ? `${colegiado.tipo} — ${colegiado.nome}` : "";
    const membros = await query<{ nome: string; funcao: string | null; titulacao: string | null }>(
      `select nome, funcao, titulacao from colegiado_membro where colegiado_id = $1 and ate is null order by nome`,
      [opcoes.colegiadoId],
    );
    composicao = membros
      .map((m) => `- ${m.nome}${m.funcao ? ` (${m.funcao})` : ""}${m.titulacao ? ` — ${m.titulacao}` : ""}`)
      .join("\n");
  }

  const ies = await queryOne<{ nome: string; codigo_emec: string | null; municipio_sede: string | null }>(
    `select nome, codigo_emec, municipio_sede from ies limit 1`,
  );
  const dispositivos = await buscarDispositivos(`${modelo.tipo} ${modelo.base_legal ?? ""}`, 4);

  const { texto } = await conversar({
    sistema: PAPEL,
    modelo: MODELO_PROFUNDO,
    maxTokens: 3000,
    pergunta: `Preencha o modelo abaixo e devolva SOMENTE o documento final em Markdown.

Modelo (${modelo.titulo}):
${modelo.corpo}

Dados reais:
- IES: ${ies?.nome ?? "FABRANI"} (código e-MEC ${ies?.codigo_emec ?? "1751876"}), ${ies?.municipio_sede ?? "Jaboticabal/SP"}
- Colegiado: ${colegiadoNome || "não informado"}
- Composição vigente:
${composicao || "não informada"}
- Base legal do modelo: ${modelo.base_legal ?? "não informada"}

Pedido do usuário: ${opcoes.contexto}

Base normativa recuperada:
${blocoNormativo(dispositivos)}

Onde faltar dado factual, escreva [INFORMAR: ...] em vez de inventar.`,
  });

  const linha = await queryOne<{ id: string }>(
    `insert into documento (titulo, categoria, corpo_markdown, status, descricao, criado_por, gerado_por_socrates)
     values ($1,$2,$3,'RASCUNHO',$4,$5,true) returning id`,
    [
      `${modelo.titulo} — ${new Date().toLocaleDateString("pt-BR")}`,
      modelo.tipo.startsWith("ATA") ? "ATA" : "OUTRO",
      texto,
      opcoes.contexto,
      opcoes.sessao.email,
    ],
  );
  if (!linha) throw new Error("Falha ao gravar o documento.");

  await registrarAuditoria(opcoes.sessao, "SOCRATES_GERAR_DOCUMENTO", "documento", linha.id, {
    tipo: modelo.tipo,
    fontes: citar(dispositivos),
  });
  return linha.id;
}

// ------------------------------------------------------------ PARECER DE BANCA

export async function parecerDeBanca(
  cicloId: string,
  sessao: Sessao,
  limite = 20,
): Promise<{ analisados: number; erros: number }> {
  const alvos = await query<{ id: string }>(
    `select ai.id
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join eixo e on e.id = ind.eixo_id
      where ai.ciclo_id = $1 and ai.is_nsa = false
      order by e.numero, ind.ordem
      limit ${limite}`,
    [cicloId],
  );

  let analisados = 0;
  let erros = 0;
  for (const alvo of alvos) {
    try {
      await analisarIndicador(alvo.id);
      analisados += 1;
    } catch {
      erros += 1;
    }
  }

  await registrarAuditoria(sessao, "SOCRATES_BANCA", "ciclo_avaliacao", cicloId, { analisados, erros });
  return { analisados, erros };
}
