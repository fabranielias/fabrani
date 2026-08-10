"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { alvoValido, desvincular, vincular } from "@/lib/acervo";
import { registrarAuditoria } from "@/lib/crud";
import { query, queryOne } from "@/lib/db";
import { podeEscrever, sessaoAtual } from "@/lib/session";

async function exigirSessao() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  return sessao;
}

export async function atualizarDocumentoAction(
  _estado: string | null,
  form: FormData,
): Promise<string | null> {
  const sessao = await exigirSessao();
  if (!podeEscrever(sessao)) return "Seu papel tem acesso somente de leitura.";

  const id = String(form.get("id") ?? "");
  if (!id) return "Documento inválido.";
  const nome = String(form.get("nome_exibicao") ?? "").trim();
  if (!nome) return "Informe o nome do documento.";

  const tags = String(form.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  await query(
    `update documento set
       nome_exibicao = $1, titulo = $1, categoria = $2, pasta = $3, tags = $4,
       descricao = $5, status = $6, valido_de = $7, valido_ate = $8,
       curso_id = $9, polo_id = $10
     where id = $11 and excluido_em is null`,
    [
      nome,
      String(form.get("categoria") ?? "") || null,
      String(form.get("pasta") ?? "").trim() || null,
      tags,
      String(form.get("descricao") ?? "").trim() || null,
      String(form.get("status") ?? "VIGENTE"),
      String(form.get("valido_de") ?? "") || null,
      String(form.get("valido_ate") ?? "") || null,
      String(form.get("curso_id") ?? "") || null,
      String(form.get("polo_id") ?? "") || null,
      id,
    ],
  );

  await registrarAuditoria(sessao, "ATUALIZAR", "documento", id, { nome_exibicao: nome });
  revalidatePath(`/painel/documentos/${id}`);
  revalidatePath("/painel/documentos");
  return null;
}

export async function excluirDocumentoAction(
  _estado: string | null,
  form: FormData,
): Promise<string | null> {
  const sessao = await exigirSessao();
  if (sessao.papel !== "SUPERADMIN") return "Somente o superadministrador pode excluir documentos.";

  const id = String(form.get("id") ?? "");
  const justificativa = String(form.get("justificativa") ?? "").trim();
  if (!id) return "Documento inválido.";
  if (justificativa.length < 10) return "Descreva o motivo da exclusão (mínimo de 10 caracteres).";

  const doc = await queryOne<{ nome_exibicao: string | null; titulo: string }>(
    "select nome_exibicao, titulo from documento where id = $1 and excluido_em is null",
    [id],
  );
  if (!doc) return "Documento não encontrado.";

  const confirmacao = String(form.get("confirmacao") ?? "").trim();
  const nome = doc.nome_exibicao ?? doc.titulo;
  if (confirmacao !== nome) return `Digite exatamente “${nome}” para confirmar a exclusão.`;

  await query("update documento set excluido_em = now(), excluido_por = $1, status = 'SUPERADO' where id = $2", [
    sessao.email,
    id,
  ]);
  await registrarAuditoria(sessao, "EXCLUIR", "documento", id, { nome, justificativa });

  revalidatePath("/painel/documentos");
  redirect("/painel/documentos?excluido=1");
}

export async function vincularDocumentoAction(form: FormData) {
  const sessao = await exigirSessao();
  if (!podeEscrever(sessao)) return;
  const documentoId = String(form.get("documento_id") ?? "");
  const alvoTipo = String(form.get("alvo_tipo") ?? "");
  const alvoId = String(form.get("alvo_id") ?? "");
  if (!documentoId || !alvoId || !alvoValido(alvoTipo)) return;

  await vincular(documentoId, alvoTipo, alvoId, sessao, {
    observacao: String(form.get("observacao") ?? "").trim() || null,
  });
  revalidatePath(`/painel/documentos/${documentoId}`);
}

export async function desvincularDocumentoAction(form: FormData) {
  const sessao = await exigirSessao();
  if (!podeEscrever(sessao)) return;
  const vinculoId = String(form.get("vinculo_id") ?? "");
  const documentoId = String(form.get("documento_id") ?? "");
  if (!vinculoId) return;
  await desvincular(vinculoId, sessao);
  if (documentoId) revalidatePath(`/painel/documentos/${documentoId}`);
}
