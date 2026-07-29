"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarAuditoria } from "@/lib/crud";
import { query, queryOne } from "@/lib/db";
import { enviarArquivo, storageConfigurado } from "@/lib/storage";
import { podeEscrever, sessaoAtual } from "@/lib/session";

const MAX_BYTES = 25 * 1024 * 1024;

export async function enviarDocumentoAction(_estado: string | null, form: FormData): Promise<string | null> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  if (!podeEscrever(sessao)) return "Seu papel tem acesso somente de leitura.";

  const titulo = String(form.get("titulo") ?? "").trim();
  if (!titulo) return "Informe o título do documento.";

  const arquivo = form.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return "Selecione um arquivo.";
  if (arquivo.size > MAX_BYTES) return "Arquivo acima de 25 MB.";

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const duplicado = await queryOne<{ id: string; titulo: string }>(
    "select id, titulo from documento where sha256 = $1 limit 1",
    [sha256],
  );

  const paiId = String(form.get("documento_pai_id") ?? "") || null;
  let versao = 1;
  if (paiId) {
    const pai = await queryOne<{ versao: number }>("select versao from documento where id = $1", [paiId]);
    versao = (pai?.versao ?? 1) + 1;
    await query("update documento set status = 'SUPERADO' where id = $1", [paiId]);
  }

  let storagePath: string | null = null;
  let provider = "PENDENTE";
  if (storageConfigurado()) {
    try {
      storagePath = await enviarArquivo(`${new Date().getFullYear()}/${randomUUID()}-${arquivo.name}`, arquivo);
      provider = "SUPABASE";
    } catch (erro) {
      return erro instanceof Error ? erro.message : "Falha no upload.";
    }
  }

  const criado = await queryOne<{ id: string }>(
    `insert into documento
       (titulo, categoria, curso_id, polo_id, storage_path, storage_provider, nome_arquivo, mime_type,
        tamanho_bytes, sha256, versao, documento_pai_id, valido_de, valido_ate, status, descricao, criado_por)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
     returning id`,
    [
      titulo,
      String(form.get("categoria") ?? "") || null,
      String(form.get("curso_id") ?? "") || null,
      String(form.get("polo_id") ?? "") || null,
      storagePath,
      provider,
      arquivo.name,
      arquivo.type || null,
      arquivo.size,
      sha256,
      versao,
      paiId,
      String(form.get("valido_de") ?? "") || null,
      String(form.get("valido_ate") ?? "") || null,
      String(form.get("status") ?? "RASCUNHO"),
      String(form.get("descricao") ?? "") || null,
      sessao.email,
    ],
  );

  await registrarAuditoria(sessao, "UPLOAD", "documento", criado?.id ?? null, { titulo, sha256, versao });
  revalidatePath("/painel/documentos");

  if (duplicado) {
    redirect(`/painel/documentos?duplicado=${encodeURIComponent(duplicado.titulo)}`);
  }
  redirect("/painel/documentos?enviado=1");
}
