"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import {
  analisarIndicador,
  aplicarExecucao,
  descartarExecucao,
  gerarDocumentoDeModelo,
  parecerDeBanca,
  perguntar,
  planejar,
  type AnaliseIndicador,
} from "@/lib/socrates/agente";
import { sincronizarSugestoes } from "@/lib/socrates/regras";
import { registrarAuditoria } from "@/lib/crud";
import { query } from "@/lib/db";

async function exigirEscrita() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeEscrever(sessao)) throw new Error("Seu papel tem acesso somente de leitura.");
  return sessao;
}

function mensagemDeErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : "Falha inesperada no Sócrates.";
}

export async function sincronizarRegrasAction() {
  await exigirEscrita();
  await sincronizarSugestoes();
  revalidatePath("/painel/socrates");
}

export async function perguntarAction(
  _estado: { resposta?: string; erro?: string } | null,
  form: FormData,
): Promise<{ resposta?: string; erro?: string }> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const pergunta = String(form.get("pergunta") ?? "").trim();
  if (!pergunta) return { erro: "Escreva a pergunta." };
  try {
    const { resposta, fontes } = await perguntar(pergunta, sessao);
    const citacoes = fontes.map((f) => `${f.norma}, ${f.rotulo}`).join(" · ");
    revalidatePath("/painel/socrates");
    return { resposta: citacoes ? `${resposta}\n\n---\nFontes consultadas: ${citacoes}` : resposta };
  } catch (erro) {
    return { erro: mensagemDeErro(erro) };
  }
}

export async function planejarAction(
  _estado: { erro?: string } | null,
  form: FormData,
): Promise<{ erro?: string }> {
  const sessao = await exigirEscrita();
  const pedido = String(form.get("pedido") ?? "").trim();
  if (!pedido) return { erro: "Descreva o que o Sócrates deve preencher." };

  let execucaoId: string;
  try {
    execucaoId = await planejar(pedido, sessao);
  } catch (erro) {
    return { erro: mensagemDeErro(erro) };
  }
  revalidatePath("/painel/socrates");
  redirect(`/painel/socrates/execucao/${execucaoId}`);
}

export async function aplicarExecucaoAction(form: FormData) {
  const sessao = await exigirEscrita();
  const execucaoId = String(form.get("execucao_id") ?? "");
  if (!execucaoId) return;
  const selecionadas = form.getAll("acao_id").map(String).filter(Boolean);
  await aplicarExecucao(execucaoId, sessao, selecionadas.length > 0 ? selecionadas : undefined);
  revalidatePath(`/painel/socrates/execucao/${execucaoId}`);
  revalidatePath("/painel/socrates");
}

export async function descartarExecucaoAction(form: FormData) {
  const sessao = await exigirEscrita();
  const execucaoId = String(form.get("execucao_id") ?? "");
  if (!execucaoId) return;
  await descartarExecucao(execucaoId, sessao);
  revalidatePath(`/painel/socrates/execucao/${execucaoId}`);
  revalidatePath("/painel/socrates");
}

export async function gerarDocumentoAction(
  _estado: { erro?: string; documentoId?: string } | null,
  form: FormData,
): Promise<{ erro?: string; documentoId?: string }> {
  const sessao = await exigirEscrita();
  const tipo = String(form.get("tipo") ?? "");
  const contexto = String(form.get("contexto") ?? "").trim();
  const colegiadoId = String(form.get("colegiado_id") ?? "") || null;
  if (!tipo || !contexto) return { erro: "Escolha o modelo e descreva o conteúdo." };
  try {
    const documentoId = await gerarDocumentoDeModelo({ tipo, colegiadoId, contexto, sessao });
    revalidatePath("/painel/documentos");
    revalidatePath("/painel/socrates");
    return { documentoId };
  } catch (erro) {
    return { erro: mensagemDeErro(erro) };
  }
}

export async function analisarIndicadorAction(
  _estado: { analise?: AnaliseIndicador; erro?: string } | null,
  form: FormData,
): Promise<{ analise?: AnaliseIndicador; erro?: string }> {
  await exigirEscrita();
  const id = String(form.get("avaliacao_indicador_id") ?? "");
  if (!id) return { erro: "Indicador inválido." };
  try {
    return { analise: await analisarIndicador(id) };
  } catch (erro) {
    return { erro: mensagemDeErro(erro) };
  }
}

export async function aplicarTextoIndicadorAction(form: FormData) {
  const sessao = await exigirEscrita();
  const id = String(form.get("avaliacao_indicador_id") ?? "");
  const analise = String(form.get("analise") ?? "");
  const plano = String(form.get("plano_acao") ?? "");
  if (!id || !analise) return;
  await query(
    `update avaliacao_indicador set analise = $1, plano_acao = coalesce(nullif($2,''), plano_acao),
            atualizado_em = now() where id = $3`,
    [analise, plano, id],
  );
  await registrarAuditoria(sessao, "SOCRATES_PREENCHER", "avaliacao_indicador", id, { origem: "painel" });
  revalidatePath(`/painel/avaliacao`);
}

export async function parecerBancaAction(form: FormData) {
  const sessao = await exigirEscrita();
  const cicloId = String(form.get("ciclo_id") ?? "");
  if (!cicloId) return;
  await parecerDeBanca(cicloId, sessao);
  revalidatePath("/painel/socrates");
}

export async function tratarSugestaoAction(form: FormData) {
  await exigirEscrita();
  const id = String(form.get("sugestao_id") ?? "");
  const status = String(form.get("status") ?? "DESCARTADA");
  if (!id) return;
  await query(`update socrates_sugestao set status = $2, atualizado_em = now() where id = $1`, [id, status]);
  revalidatePath("/painel/socrates");
}
