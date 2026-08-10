import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { alvoValido, registrarAcesso, vincular } from "@/lib/acervo";
import { registrarAuditoria } from "@/lib/crud";
import { query, queryOne } from "@/lib/db";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { baixarArquivo, descreverObjeto, removerArquivo, storageConfigurado } from "@/lib/storage";

type Corpo = {
  caminho?: string;
  nomeArquivo?: string;
  nomeExibicao?: string;
  titulo?: string;
  categoria?: string | null;
  pasta?: string | null;
  tags?: string[];
  descricao?: string | null;
  cursoId?: string | null;
  poloId?: string | null;
  status?: string;
  validoDe?: string | null;
  validoAte?: string | null;
  documentoPaiId?: string | null;
  alvoTipo?: string | null;
  alvoId?: string | null;
};

const STATUS_VALIDOS = new Set(["RASCUNHO", "EM_APROVACAO", "VIGENTE", "SUPERADO"]);

export async function POST(request: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  if (!podeEscrever(sessao)) {
    return NextResponse.json({ erro: "Seu papel tem acesso somente de leitura." }, { status: 403 });
  }
  if (!storageConfigurado()) {
    return NextResponse.json({ erro: "Supabase Storage não configurado." }, { status: 503 });
  }

  const corpo = (await request.json()) as Corpo;
  const caminho = String(corpo.caminho ?? "").trim();
  const nomeArquivo = String(corpo.nomeArquivo ?? "").trim();
  if (!caminho || !nomeArquivo) {
    return NextResponse.json({ erro: "Envio incompleto." }, { status: 400 });
  }

  // Só grava metadado depois de confirmar que o binário chegou ao bucket.
  const objeto = await descreverObjeto(caminho);
  if (!objeto) {
    return NextResponse.json({ erro: "Arquivo não encontrado no acervo após o envio." }, { status: 409 });
  }

  const bytes = await baixarArquivo(caminho);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const existente = await queryOne<{ id: string; nome_exibicao: string | null; titulo: string }>(
    "select id, nome_exibicao, titulo from documento where sha256 = $1 and excluido_em is null limit 1",
    [sha256],
  );
  if (existente && !corpo.documentoPaiId) {
    // Binário idêntico já no acervo: descarta a cópia e reaproveita o documento.
    await removerArquivo(caminho);
    if (corpo.alvoTipo && corpo.alvoId && alvoValido(corpo.alvoTipo)) {
      await vincular(existente.id, corpo.alvoTipo, corpo.alvoId, sessao);
    }
    return NextResponse.json({
      duplicado: true,
      id: existente.id,
      nome: existente.nome_exibicao ?? existente.titulo,
    });
  }

  const paiId = corpo.documentoPaiId || null;
  let versao = 1;
  if (paiId) {
    const pai = await queryOne<{ versao: number }>("select versao from documento where id = $1", [paiId]);
    if (!pai) return NextResponse.json({ erro: "Documento anterior não encontrado." }, { status: 400 });
    versao = pai.versao + 1;
  }

  const nomeExibicao = String(corpo.nomeExibicao ?? corpo.titulo ?? nomeArquivo).trim() || nomeArquivo;
  const status = STATUS_VALIDOS.has(String(corpo.status)) ? String(corpo.status) : "VIGENTE";
  const tags = Array.isArray(corpo.tags) ? corpo.tags.map((t) => String(t).trim()).filter(Boolean) : [];

  const criado = await queryOne<{ id: string }>(
    `insert into documento
       (titulo, nome_exibicao, categoria, pasta, tags, origem, curso_id, polo_id, storage_path,
        storage_provider, nome_arquivo, mime_type, tamanho_bytes, sha256, versao, documento_pai_id,
        valido_de, valido_ate, status, descricao, criado_por)
     values ($1,$2,$3,$4,$5,'UPLOAD',$6,$7,$8,'SUPABASE',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
     returning id`,
    [
      nomeExibicao,
      nomeExibicao,
      corpo.categoria || null,
      corpo.pasta || null,
      tags,
      corpo.cursoId || null,
      corpo.poloId || null,
      caminho,
      nomeArquivo,
      objeto.mime,
      objeto.tamanho,
      sha256,
      versao,
      paiId,
      corpo.validoDe || null,
      corpo.validoAte || null,
      status,
      corpo.descricao || null,
      sessao.email,
    ],
  );
  if (!criado) return NextResponse.json({ erro: "Falha ao registrar o documento." }, { status: 500 });

  if (paiId) {
    await query("update documento set status = 'SUPERADO' where id = $1", [paiId]);
    // A versão nova herda os vínculos da anterior.
    await query(
      `insert into evidencia_vinculo
         (documento_id, alvo_tipo, alvo_id, avaliacao_indicador_id, requisito_evidencia_id, observacao, criado_por)
       select $1, alvo_tipo, alvo_id, avaliacao_indicador_id, requisito_evidencia_id, observacao, $2
         from evidencia_vinculo where documento_id = $3
       on conflict do nothing`,
      [criado.id, sessao.email, paiId],
    );
  }

  if (corpo.alvoTipo && corpo.alvoId && alvoValido(corpo.alvoTipo)) {
    await vincular(criado.id, corpo.alvoTipo, corpo.alvoId, sessao);
  }

  await registrarAcesso(criado.id, sessao.email, "UPLOAD");
  await registrarAuditoria(sessao, "UPLOAD", "documento", criado.id, {
    nome: nomeExibicao,
    arquivo: nomeArquivo,
    sha256,
    versao,
    tamanho_bytes: objeto.tamanho,
  });

  return NextResponse.json({ id: criado.id, nome: nomeExibicao, versao });
}
