/**
 * Camada de LLM do Sócrates (Anthropic).
 *
 * Só é chamada sob demanda. Antes de gastar token há três defesas: cache por
 * hash do conteúdo, teto mensal e escada de modelos (barato para criticar,
 * caro só para redigir). Sem chave configurada o sistema continua funcionando
 * nas camadas determinísticas.
 */

import { createHash } from "node:crypto";
import { query, queryOne } from "../db";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const VERSAO_API = "2023-06-01";

export const MODELO_RAPIDO = "claude-3-5-haiku-latest";
export const MODELO_PROFUNDO = "claude-sonnet-4-5";

export type Resposta = { texto: string; tokens: number; doCache: boolean };

export function llmConfigurado(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function hashConteudo(partes: unknown[]): string {
  return createHash("sha256").update(JSON.stringify(partes)).digest("hex");
}

function mesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function orcamento(): Promise<{ mes: string; usados: number; teto: number }> {
  const mes = mesAtual();
  await query(`insert into socrates_orcamento (mes) values ($1) on conflict (mes) do nothing`, [mes]);
  const linha = await queryOne<{ tokens_usados: string; teto: string }>(
    `select tokens_usados::text, teto::text from socrates_orcamento where mes = $1`,
    [mes],
  );
  return { mes, usados: Number(linha?.tokens_usados ?? 0), teto: Number(linha?.teto ?? 0) };
}

async function registrarConsumo(tokens: number) {
  await query(
    `update socrates_orcamento set tokens_usados = tokens_usados + $2 where mes = $1`,
    [mesAtual(), tokens],
  );
}

type Conteudo = { type: string; text?: string };
type RespostaApi = {
  content?: Conteudo[];
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

export async function conversar(opcoes: {
  sistema: string;
  pergunta: string;
  modelo?: string;
  maxTokens?: number;
  cacheKey?: string;
}): Promise<Resposta> {
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) {
    throw new Error(
      "Sócrates está sem chave da Anthropic: as camadas de regras e busca normativa seguem ativas, mas a redação assistida exige ANTHROPIC_API_KEY.",
    );
  }

  if (opcoes.cacheKey) {
    const emCache = await queryOne<{ texto_sugerido: string | null }>(
      `select texto_sugerido from socrates_sugestao where cache_key = $1`,
      [opcoes.cacheKey],
    );
    if (emCache?.texto_sugerido) {
      return { texto: emCache.texto_sugerido, tokens: 0, doCache: true };
    }
  }

  const { usados, teto } = await orcamento();
  if (usados >= teto) {
    throw new Error(
      `Teto mensal de tokens atingido (${usados}/${teto}). O Sócrates continua ativo nas camadas sem custo.`,
    );
  }

  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": chave,
      "anthropic-version": VERSAO_API,
    },
    body: JSON.stringify({
      model: opcoes.modelo ?? MODELO_RAPIDO,
      max_tokens: opcoes.maxTokens ?? 1500,
      system: opcoes.sistema,
      messages: [{ role: "user", content: opcoes.pergunta }],
    }),
  });

  const corpo = (await resposta.json()) as RespostaApi;
  if (!resposta.ok) {
    throw new Error(corpo.error?.message ?? `Anthropic respondeu ${resposta.status}.`);
  }

  const texto = (corpo.content ?? [])
    .filter((c) => c.type === "text")
    .map((c) => c.text ?? "")
    .join("\n")
    .trim();
  const tokens = (corpo.usage?.input_tokens ?? 0) + (corpo.usage?.output_tokens ?? 0);
  await registrarConsumo(tokens);

  return { texto, tokens, doCache: false };
}

/** Extrai o primeiro objeto JSON da resposta, tolerando cercas de código. */
export function extrairJson<T>(texto: string): T {
  const limpo = texto.replace(/```json/gi, "```").split("```").find((p) => p.trim().startsWith("{")) ?? texto;
  const inicio = limpo.indexOf("{");
  const fim = limpo.lastIndexOf("}");
  if (inicio === -1 || fim === -1) throw new Error("Resposta do Sócrates não trouxe JSON válido.");
  return JSON.parse(limpo.slice(inicio, fim + 1)) as T;
}
