"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { autenticar, criarSessao, encerrarSessao, podeEscrever, sessaoAtual } from "@/lib/session";
import { entidadePorSlug } from "@/lib/registry";
import { registrarAuditoria, salvar } from "@/lib/crud";
import { query, queryOne } from "@/lib/db";

export async function entrarAction(_estado: string | null, form: FormData): Promise<string | null> {
  const email = String(form.get("email") ?? "");
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return "Informe e-mail e senha.";

  let sessao;
  try {
    sessao = await autenticar(email, senha);
  } catch (erro) {
    return erro instanceof Error ? erro.message : "Falha ao autenticar.";
  }
  if (!sessao) return "Credenciais inválidas.";

  await criarSessao(sessao);
  await registrarAuditoria(sessao, "LOGIN", "usuario", sessao.id);
  redirect("/painel");
}

export async function sairAction() {
  await encerrarSessao();
  redirect("/login");
}

async function exigirEscrita() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeEscrever(sessao)) throw new Error("Seu papel tem acesso somente de leitura.");
  return sessao;
}

export async function salvarRegistroAction(_estado: string | null, form: FormData): Promise<string | null> {
  const sessao = await exigirEscrita();
  const slug = String(form.get("__entidade") ?? "");
  const id = String(form.get("__id") ?? "") || null;
  const entidade = entidadePorSlug(slug);
  if (!entidade) return "Entidade desconhecida.";

  let novoId: string;
  try {
    novoId = await salvar(entidade, id, form, sessao);
  } catch (erro) {
    return erro instanceof Error ? erro.message : "Falha ao salvar.";
  }
  revalidatePath(`/painel/dados/${slug}`);
  redirect(`/painel/dados/${slug}/${novoId}?salvo=1`);
}

export async function salvarIndicadorAction(_estado: string | null, form: FormData): Promise<string | null> {
  const sessao = await exigirEscrita();
  const id = String(form.get("id") ?? "");
  if (!id) return "Registro inválido.";

  const conceito = form.get("conceito_autoavaliado");
  const meta = form.get("conceito_meta");
  const inep = form.get("conceito_inep");
  const nsa = form.get("is_nsa") === "true";
  const prazo = String(form.get("prazo") ?? "").trim();

  await query(
    `update avaliacao_indicador set
        conceito_autoavaliado = $1,
        conceito_meta = coalesce($2, 5),
        conceito_inep = $3,
        is_nsa = $4,
        justificativa_nsa = $5,
        analise = $6,
        plano_acao = $7,
        responsavel = $8,
        prazo = $9,
        status = $10,
        atualizado_em = now()
      where id = $11`,
    [
      conceito ? Number(conceito) : null,
      meta ? Number(meta) : null,
      inep ? Number(inep) : null,
      nsa,
      String(form.get("justificativa_nsa") ?? "") || null,
      String(form.get("analise") ?? "") || null,
      String(form.get("plano_acao") ?? "") || null,
      String(form.get("responsavel") ?? "") || null,
      prazo || null,
      String(form.get("status") ?? "NAO_INICIADO"),
      id,
    ],
  );
  await registrarAuditoria(sessao, "ATUALIZAR", "avaliacao_indicador", id);

  const ciclo = await queryOne<{ ciclo_id: string }>(
    "select ciclo_id from avaliacao_indicador where id = $1",
    [id],
  );
  revalidatePath(`/painel/avaliacao/${ciclo?.ciclo_id}`);
  redirect(`/painel/avaliacao/${ciclo?.ciclo_id}/indicador/${id}?salvo=1`);
}

export async function vincularEvidenciaAction(form: FormData) {
  const sessao = await exigirEscrita();
  const avaliacaoIndicadorId = String(form.get("avaliacao_indicador_id") ?? "");
  const documentoId = String(form.get("documento_id") ?? "");
  const requisito = String(form.get("requisito_evidencia_id") ?? "") || null;
  if (!avaliacaoIndicadorId || !documentoId) return;

  await query(
    `insert into evidencia_vinculo (documento_id, avaliacao_indicador_id, requisito_evidencia_id)
     values ($1,$2,$3)`,
    [documentoId, avaliacaoIndicadorId, requisito],
  );
  await registrarAuditoria(sessao, "VINCULAR_EVIDENCIA", "evidencia_vinculo", avaliacaoIndicadorId, {
    documentoId,
  });
  const ciclo = await queryOne<{ ciclo_id: string }>(
    "select ciclo_id from avaliacao_indicador where id = $1",
    [avaliacaoIndicadorId],
  );
  revalidatePath(`/painel/avaliacao/${ciclo?.ciclo_id}/indicador/${avaliacaoIndicadorId}`);
}

export async function atualizarRequisitoLegalAction(form: FormData) {
  const sessao = await exigirEscrita();
  const id = String(form.get("id") ?? "");
  const situacao = String(form.get("situacao") ?? "NAO_VERIFICADO");
  if (!id) return;
  await query(
    `update avaliacao_requisito_legal set situacao = $1, observacao = $2, atualizado_em = now() where id = $3`,
    [situacao, String(form.get("observacao") ?? "") || null, id],
  );
  await registrarAuditoria(sessao, "ATUALIZAR", "avaliacao_requisito_legal", id, { situacao });
  const ciclo = await queryOne<{ ciclo_id: string }>(
    "select ciclo_id from avaliacao_requisito_legal where id = $1",
    [id],
  );
  revalidatePath(`/painel/avaliacao/${ciclo?.ciclo_id}/requisitos-legais`);
}
