import { NextResponse } from "next/server";
import { listarParaExportar, type Filtro } from "@/lib/crud";
import { entidadePorSlug } from "@/lib/registry";
import { sessaoAtual } from "@/lib/session";

function celula(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const texto = Array.isArray(valor)
    ? valor.join("; ")
    : valor instanceof Date
      ? valor.toISOString().slice(0, 10)
      : String(valor);
  return `"${texto.replace(/"/g, '""')}"`;
}

export async function GET(request: Request, { params }: { params: Promise<{ entidade: string }> }) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });

  const { entidade: slug } = await params;
  const entidade = entidadePorSlug(slug);
  if (!entidade) return NextResponse.json({ erro: "Entidade desconhecida." }, { status: 404 });

  const url = new URL(request.url);
  const filtros: Filtro[] = [];
  for (const campo of entidade.campos) {
    const valor = url.searchParams.get(`f_${campo.nome}`);
    if (valor) filtros.push({ campo: campo.nome, valor });
  }

  const linhas = await listarParaExportar(entidade, {
    busca: url.searchParams.get("busca") ?? undefined,
    filtros,
    ordem: url.searchParams.get("ordem") ?? undefined,
    direcao: url.searchParams.get("direcao") ?? undefined,
  });

  const colunas = entidade.campos.filter((c) => c.tipo !== "senha");
  const cabecalho = colunas.map((c) => celula(c.rotulo)).join(";");
  const corpo = linhas.map((linha) => colunas.map((c) => celula(linha[c.nome])).join(";")).join("\r\n");
  // BOM para o Excel em pt-BR reconhecer os acentos.
  const csv = `\uFEFF${cabecalho}\r\n${corpo}`;

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
