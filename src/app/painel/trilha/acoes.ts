"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { entidadePorSlug } from "@/lib/registry";
import { salvar, traduzirErro } from "@/lib/crud";
import { query } from "@/lib/db";
import {
  limparResposta,
  listarPassos,
  obterPasso,
  proximoPendente,
  resolvido,
  responderPasso,
  sincronizarTrilha,
} from "@/lib/trilha";

async function exigirEscrita() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeEscrever(sessao)) throw new Error("Seu papel tem acesso somente de leitura.");
  return sessao;
}

/** Endereço do próximo passo pendente do mesmo bloco. */
async function hrefProximo(bloco: "A" | "B" | "C", ordemAtual: number): Promise<string> {
  const passos = await listarPassos({ bloco });
  const proximo = proximoPendente(passos, ordemAtual);
  return proximo ? `/painel/trilha/${proximo.codigo}` : `/painel/trilha?bloco=${bloco}&concluido=1`;
}

export async function salvarPassoAction(_estado: string | null, form: FormData): Promise<string | null> {
  const sessao = await exigirEscrita();
  const codigo = String(form.get("__codigo") ?? "");
  const acao = String(form.get("__acao") ?? "salvar");
  const observacao = String(form.get("observacao") ?? "").trim() || null;

  const passo = await obterPasso(codigo);
  if (!passo) return "Passo não encontrado.";

  if (acao === "reabrir") {
    await limparResposta(passo, sessao);
    revalidatePath(`/painel/trilha/${codigo}`);
    redirect(`/painel/trilha/${codigo}`);
  }

  if (acao === "nao_ha") {
    await responderPasso(passo, "NAO_HA", sessao, { observacao });
    revalidatePath("/painel/trilha");
    redirect(await hrefProximo(passo.bloco, passo.ordem));
  }

  if (acao === "nsa") {
    if (!passo.aceita_nsa) return "Este item não admite NSA — o instrumento o considera sempre aplicável.";
    if (!observacao) return "Justifique por que o indicador não se aplica à FABRANI.";
    await responderPasso(passo, "NSA", sessao, { observacao });
    revalidatePath("/painel/trilha");
    redirect(await hrefProximo(passo.bloco, passo.ordem));
  }

  // ------------------------------------------------------------------ salvar
  if (passo.tipo === "DADOS" && passo.entidade_slug) {
    const entidade = entidadePorSlug(passo.entidade_slug);
    if (!entidade) return "Entidade do passo não encontrada.";
    try {
      const registroId = await salvar(entidade, passo.registro_id, form, sessao);
      if (registroId !== passo.registro_id) {
        await query("update trilha_passo set registro_id = $1 where id = $2", [registroId, passo.id]);
      }
    } catch (erro) {
      if (erro instanceof Error && !("code" in erro)) return erro.message;
      return traduzirErro(erro);
    }
  }

  if (passo.tipo === "DOCUMENTO" && passo.documentos === 0) {
    return "Envie o arquivo antes de avançar — ou marque “Não há esse documento”.";
  }

  await responderPasso(passo, "CONCLUIDO", sessao, { observacao });
  revalidatePath("/painel/trilha");
  revalidatePath(`/painel/dados/${passo.entidade_slug ?? ""}`);
  redirect(await hrefProximo(passo.bloco, passo.ordem));
}

export async function sincronizarTrilhaAction(): Promise<void> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  await sincronizarTrilha();
  revalidatePath("/painel/trilha");
}

/** Progresso resumido usado pelo aviso do painel executivo. */
export async function resumoTrilha(): Promise<{
  percentual: number;
  pendentes: number;
  proximo: { codigo: string; titulo: string } | null;
}> {
  const passos = await listarPassos();
  if (passos.length === 0) return { percentual: 0, pendentes: 0, proximo: null };
  const resolvidos = passos.filter(resolvido).length;
  const proximo = proximoPendente(passos);
  return {
    percentual: Math.round((resolvidos / passos.length) * 100),
    pendentes: passos.length - resolvidos,
    proximo: proximo ? { codigo: proximo.codigo, titulo: proximo.titulo } : null,
  };
}
