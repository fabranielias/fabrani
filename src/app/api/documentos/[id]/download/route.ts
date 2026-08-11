import { NextResponse } from "next/server";
import { registrarAcesso } from "@/lib/acervo";
import { queryOne } from "@/lib/db";
import { sessaoAtual } from "@/lib/session";
import { urlAssinada } from "@/lib/storage";

/** O caminho no bucket nunca vai ao cliente: só a URL assinada de curta duração. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });

  const { id } = await params;
  const doc = await queryOne<{ storage_path: string | null; excluido_em: string | null }>(
    "select storage_path, excluido_em from documento where id = $1",
    [id],
  );
  if (!doc || doc.excluido_em) return NextResponse.json({ erro: "Documento não encontrado." }, { status: 404 });
  if (!doc.storage_path) {
    return NextResponse.json({ erro: "Este documento não possui arquivo anexado." }, { status: 404 });
  }

  const url = await urlAssinada(doc.storage_path, 900);
  if (!url) return NextResponse.json({ erro: "Não foi possível liberar o arquivo." }, { status: 502 });

  await registrarAcesso(id, sessao.email, "DOWNLOAD");
  return NextResponse.redirect(url);
}
