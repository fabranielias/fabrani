/**
 * Ferramentas de escrita do Sócrates.
 *
 * O agente não emite SQL: ele propõe ações tipadas, cada uma validada por Zod e
 * aplicada só depois do aceite humano. Toda aplicação grava auditoria com
 * origem SOCRATES.
 */

import { z } from "zod";
import { query, queryOne } from "../db";
import { registrarAuditoria } from "../crud";
import { entidadePorSlug, ENTIDADES, type Campo } from "../registry";
import type { Sessao } from "../session";

export const FERRAMENTAS = [
  "preencher_indicador",
  "preencher_entidade",
  "gerar_documento",
  "vincular_evidencia",
  "abrir_pendencia",
  "montar_dossie",
] as const;

export type Ferramenta = (typeof FERRAMENTAS)[number];

const preencherIndicador = z.object({
  ferramenta: z.literal("preencher_indicador"),
  descricao: z.string(),
  avaliacao_indicador_id: z.string().uuid(),
  dados: z.object({
    analise: z.string().optional(),
    plano_acao: z.string().optional(),
    responsavel: z.string().optional(),
    prazo: z.string().optional(),
    conceito_autoavaliado: z.number().int().min(1).max(5).optional(),
  }),
});

const preencherEntidade = z.object({
  ferramenta: z.literal("preencher_entidade"),
  descricao: z.string(),
  entidade: z.string(),
  id: z.string().uuid().nullable().optional(),
  dados: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
});

const gerarDocumento = z.object({
  ferramenta: z.literal("gerar_documento"),
  descricao: z.string(),
  tipo: z.string(),
  titulo: z.string(),
  categoria: z.string().optional(),
  curso_id: z.string().uuid().nullable().optional(),
  corpo_markdown: z.string(),
});

const vincularEvidencia = z.object({
  ferramenta: z.literal("vincular_evidencia"),
  descricao: z.string(),
  avaliacao_indicador_id: z.string().uuid(),
  documento_id: z.string().uuid(),
  requisito_evidencia_id: z.string().uuid().nullable().optional(),
});

const abrirPendencia = z.object({
  ferramenta: z.literal("abrir_pendencia"),
  descricao: z.string(),
  titulo: z.string(),
  categoria: z.enum(["REGULATORIO", "ENADE", "CENSO", "CPA", "EAD", "SUPERVISAO", "INTERNO"]),
  data_limite: z.string(),
  responsavel: z.string().optional(),
  criticidade: z.enum(["CRITICA", "ALTA", "MEDIA", "BAIXA"]).optional(),
});

const montarDossie = z.object({
  ferramenta: z.literal("montar_dossie"),
  descricao: z.string(),
  ciclo_id: z.string().uuid(),
  titulo: z.string(),
});

export const acaoSchema = z.discriminatedUnion("ferramenta", [
  preencherIndicador,
  preencherEntidade,
  gerarDocumento,
  vincularEvidencia,
  abrirPendencia,
  montarDossie,
]);

export type Acao = z.infer<typeof acaoSchema>;

export const planoSchema = z.object({
  resumo: z.string(),
  acoes: z.array(acaoSchema).max(80),
});

export type Plano = z.infer<typeof planoSchema>;

/** Alvo de uma ação, para exibição e auditoria. */
export function alvoDaAcao(acao: Acao): { tipo: string; id: string | null } {
  switch (acao.ferramenta) {
    case "preencher_indicador":
      return { tipo: "INDICADOR", id: acao.avaliacao_indicador_id };
    case "preencher_entidade":
      return { tipo: acao.entidade.toUpperCase(), id: acao.id ?? null };
    case "gerar_documento":
      return { tipo: "DOCUMENTO", id: null };
    case "vincular_evidencia":
      return { tipo: "INDICADOR", id: acao.avaliacao_indicador_id };
    case "abrir_pendencia":
      return { tipo: "PRAZO", id: null };
    case "montar_dossie":
      return { tipo: "CICLO", id: acao.ciclo_id };
  }
}

/** Estado atual do alvo, para montar o diff antes/depois. */
export async function estadoAtual(acao: Acao): Promise<Record<string, unknown> | null> {
  if (acao.ferramenta === "preencher_indicador") {
    return queryOne(
      `select analise, plano_acao, responsavel, prazo, conceito_autoavaliado
         from avaliacao_indicador where id = $1`,
      [acao.avaliacao_indicador_id],
    );
  }
  if (acao.ferramenta === "preencher_entidade" && acao.id) {
    const entidade = entidadePorSlug(acao.entidade);
    if (!entidade) return null;
    const colunas = Object.keys(acao.dados).filter((c) =>
      entidade.campos.some((campo) => campo.nome === c && campo.tipo !== "senha"),
    );
    if (colunas.length === 0) return null;
    return queryOne(`select ${colunas.join(", ")} from ${entidade.tabela} where id = $1`, [acao.id]);
  }
  return null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function converterValor(campo: Campo, valor: string | number | boolean | null): unknown {
  if (valor === null || valor === "") return null;
  if (campo.tipo === "ref" && !UUID.test(String(valor))) {
    throw new Error(
      `O campo "${campo.rotulo}" exige o identificador de um registro existente de "${campo.ref}"; recebido "${valor}".`,
    );
  }
  switch (campo.tipo) {
    case "boolean":
      return valor === true || valor === "true";
    case "number":
      return typeof valor === "number" ? Math.trunc(valor) : Number.parseInt(String(valor), 10);
    case "decimal":
      return typeof valor === "number" ? valor : Number.parseFloat(String(valor).replace(",", "."));
    case "tags":
      return String(valor).split(",").map((t) => t.trim()).filter(Boolean);
    default:
      return String(valor);
  }
}

async function aplicarPreencherEntidade(acao: z.infer<typeof preencherEntidade>): Promise<string> {
  const entidade = entidadePorSlug(acao.entidade);
  if (!entidade) throw new Error(`Entidade desconhecida: ${acao.entidade}`);

  const colunas: string[] = [];
  const valores: unknown[] = [];
  for (const [nome, valor] of Object.entries(acao.dados)) {
    const campo = entidade.campos.find((c) => c.nome === nome);
    if (!campo || campo.tipo === "senha") continue;
    colunas.push(nome);
    valores.push(converterValor(campo, valor));
  }
  if (colunas.length === 0) throw new Error("Nenhum campo válido para esta entidade.");

  if (acao.id) {
    const sets = colunas.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const linha = await queryOne<{ id: string }>(
      `update ${entidade.tabela} set ${sets} where id = $${colunas.length + 1} returning id`,
      [...valores, acao.id],
    );
    if (!linha) throw new Error("Registro não encontrado.");
    return linha.id;
  }

  const placeholders = colunas.map((_, i) => `$${i + 1}`).join(", ");
  const linha = await queryOne<{ id: string }>(
    `insert into ${entidade.tabela} (${colunas.join(", ")}) values (${placeholders}) returning id`,
    valores,
  );
  if (!linha) throw new Error("Falha ao inserir registro.");
  return linha.id;
}

async function montarTextoDossie(cicloId: string, titulo: string): Promise<string> {
  const itens = await query<{
    codigo: string;
    indicador: string;
    conceito: number | null;
    documento: string | null;
    requisito: string | null;
  }>(
    `select ind.codigo, ind.titulo as indicador, ai.conceito_autoavaliado as conceito,
            d.titulo as documento, re.titulo as requisito
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join eixo e on e.id = ind.eixo_id
       left join evidencia_vinculo ev on ev.avaliacao_indicador_id = ai.id
       left join documento d on d.id = ev.documento_id
       left join requisito_evidencia re on re.id = ev.requisito_evidencia_id
      where ai.ciclo_id = $1 and ai.is_nsa = false
      order by e.numero, ind.ordem, ind.codigo, d.titulo nulls last`,
    [cicloId],
  );

  const linhas: string[] = [`# ${titulo}`, ""];
  let atual = "";
  for (const item of itens) {
    if (item.codigo !== atual) {
      atual = item.codigo;
      linhas.push("", `## ${item.codigo} — ${item.indicador}`);
      linhas.push(`Conceito autoavaliado: ${item.conceito ?? "não informado"}`);
    }
    linhas.push(
      item.documento
        ? `- ${item.documento}${item.requisito ? ` (${item.requisito})` : ""}`
        : "- **Sem evidência vinculada**",
    );
  }
  return linhas.join("\n");
}

/** Aplica uma ação já aceita. Devolve o id do registro afetado. */
export async function aplicarAcao(acao: Acao, sessao: Sessao): Promise<string | null> {
  switch (acao.ferramenta) {
    case "preencher_indicador": {
      const campos: string[] = [];
      const valores: unknown[] = [];
      for (const [nome, valor] of Object.entries(acao.dados)) {
        if (valor === undefined) continue;
        campos.push(nome);
        valores.push(valor);
      }
      if (campos.length === 0) return acao.avaliacao_indicador_id;
      const sets = campos.map((c, i) => `${c} = $${i + 1}`).join(", ");
      await query(
        `update avaliacao_indicador set ${sets}, atualizado_em = now() where id = $${campos.length + 1}`,
        [...valores, acao.avaliacao_indicador_id],
      );
      await registrarAuditoria(sessao, "SOCRATES_PREENCHER", "avaliacao_indicador", acao.avaliacao_indicador_id, acao.dados);
      return acao.avaliacao_indicador_id;
    }

    case "preencher_entidade": {
      const id = await aplicarPreencherEntidade(acao);
      const entidade = entidadePorSlug(acao.entidade);
      await registrarAuditoria(sessao, "SOCRATES_PREENCHER", entidade?.tabela ?? acao.entidade, id, acao.dados);
      return id;
    }

    case "gerar_documento": {
      const linha = await queryOne<{ id: string }>(
        `insert into documento (titulo, categoria, curso_id, corpo_markdown, status, descricao, criado_por, gerado_por_socrates)
         values ($1,$2,$3,$4,'RASCUNHO',$5,$6,true) returning id`,
        [acao.titulo, acao.categoria ?? "ATA", acao.curso_id ?? null, acao.corpo_markdown, acao.descricao, sessao.email],
      );
      await registrarAuditoria(sessao, "SOCRATES_GERAR_DOCUMENTO", "documento", linha?.id ?? null, {
        tipo: acao.tipo,
        titulo: acao.titulo,
      });
      return linha?.id ?? null;
    }

    case "vincular_evidencia": {
      const linha = await queryOne<{ id: string }>(
        `insert into evidencia_vinculo (documento_id, avaliacao_indicador_id, requisito_evidencia_id, observacao)
         values ($1,$2,$3,'Vinculado pelo Sócrates') returning id`,
        [acao.documento_id, acao.avaliacao_indicador_id, acao.requisito_evidencia_id ?? null],
      );
      await registrarAuditoria(sessao, "SOCRATES_VINCULAR", "evidencia_vinculo", linha?.id ?? null, {
        documento_id: acao.documento_id,
      });
      return linha?.id ?? null;
    }

    case "abrir_pendencia": {
      const linha = await queryOne<{ id: string }>(
        `insert into prazo (titulo, categoria, data_limite, responsavel, criticidade, status, observacao)
         values ($1,$2,$3,$4,$5,'PENDENTE',$6) returning id`,
        [acao.titulo, acao.categoria, acao.data_limite, acao.responsavel ?? null, acao.criticidade ?? "MEDIA", acao.descricao],
      );
      await registrarAuditoria(sessao, "SOCRATES_PENDENCIA", "prazo", linha?.id ?? null, { titulo: acao.titulo });
      return linha?.id ?? null;
    }

    case "montar_dossie": {
      const corpo = await montarTextoDossie(acao.ciclo_id, acao.titulo);
      const linha = await queryOne<{ id: string }>(
        `insert into documento (titulo, categoria, corpo_markdown, status, descricao, criado_por, gerado_por_socrates)
         values ($1,'OUTRO',$2,'RASCUNHO',$3,$4,true) returning id`,
        [acao.titulo, corpo, acao.descricao, sessao.email],
      );
      await registrarAuditoria(sessao, "SOCRATES_DOSSIE", "documento", linha?.id ?? null, { ciclo_id: acao.ciclo_id });
      return linha?.id ?? null;
    }
  }
}

/** Catálogo de entidades e campos entregue ao modelo no prompt de planejamento. */
export function catalogoEntidades(): string {
  return ENTIDADES.map((e) => {
    const campos = e.campos
      .filter((c) => c.tipo !== "senha")
      .map((c) => (c.opcoes ? `${c.nome}(${c.tipo}: ${c.opcoes.join("|")})` : `${c.nome}(${c.tipo})`))
      .join(", ");
    return `- ${e.slug}: ${e.rotulo} — ${campos}`;
  }).join("\n");
}
