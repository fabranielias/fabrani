import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { MAX_BYTES, extensaoAceita, montarCaminho, storageConfigurado, urlDeUpload } from "@/lib/storage";

type Corpo = { nomeArquivo?: string; categoria?: string | null; tamanho?: number };

export async function POST(request: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });
  if (!podeEscrever(sessao)) {
    return NextResponse.json({ erro: "Seu papel tem acesso somente de leitura." }, { status: 403 });
  }
  if (!storageConfigurado()) {
    return NextResponse.json(
      { erro: "Supabase Storage não configurado: o envio de arquivos está indisponível." },
      { status: 503 },
    );
  }

  const corpo = (await request.json()) as Corpo;
  const nomeArquivo = String(corpo.nomeArquivo ?? "").trim();
  if (!nomeArquivo) return NextResponse.json({ erro: "Informe o nome do arquivo." }, { status: 400 });
  if (!extensaoAceita(nomeArquivo)) {
    return NextResponse.json(
      { erro: `Executáveis e scripts não são aceitos no acervo: ${nomeArquivo}` },
      { status: 400 },
    );
  }
  const tamanho = Number(corpo.tamanho ?? 0);
  if (tamanho > MAX_BYTES) {
    return NextResponse.json({ erro: "Arquivo acima de 50 MB." }, { status: 400 });
  }

  const caminho = montarCaminho(nomeArquivo, corpo.categoria ?? null, randomUUID());
  try {
    const { url, token } = await urlDeUpload(caminho);
    return NextResponse.json({ caminho, url, token });
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Falha ao preparar o envio." },
      { status: 502 },
    );
  }
}
