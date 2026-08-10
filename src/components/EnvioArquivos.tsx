"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, FileText, Loader2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024;

export type CampoExtra = { categoria?: string | null; pasta?: string | null };

type Item = {
  arquivo: File;
  nome: string;
  progresso: number;
  estado: "espera" | "enviando" | "pronto" | "erro" | "duplicado";
  mensagem?: string;
};

function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Nome sugerido a partir do arquivo: sem extensão, com espaços no lugar de separadores. */
function sugerirNome(arquivo: File): string {
  return arquivo.name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim()
    .slice(0, 120);
}

function enviarAoBucket(url: string, arquivo: File, onProgresso: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("content-type", arquivo.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable) onProgresso(Math.round((evento.loaded / evento.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Falha no envio ao acervo (${xhr.status}).`));
    };
    xhr.onerror = () => reject(new Error("Conexão interrompida durante o envio."));
    xhr.send(arquivo);
  });
}

export function EnvioArquivos({
  alvoTipo,
  alvoId,
  documentoPaiId,
  categorias = [],
  categoriaPadrao,
  desabilitado = false,
  storageAtivo = true,
  compacto = false,
  aoConcluir,
}: {
  alvoTipo?: string;
  alvoId?: string;
  /** Quando informado, o envio vira a próxima versão deste documento. */
  documentoPaiId?: string;
  categorias?: string[];
  categoriaPadrao?: string;
  desabilitado?: boolean;
  storageAtivo?: boolean;
  compacto?: boolean;
  aoConcluir?: () => void;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [arrastando, setArrastando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [categoria, setCategoria] = useState(categoriaPadrao ?? "");
  const [pasta, setPasta] = useState("");
  const [validoAte, setValidoAte] = useState("");
  const [status, setStatus] = useState("VIGENTE");
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  const adicionar = useCallback((lista: FileList | null) => {
    if (!lista) return;
    const novos: Item[] = [];
    for (const arquivo of Array.from(lista)) {
      if (arquivo.size > MAX_BYTES) {
        novos.push({
          arquivo,
          nome: sugerirNome(arquivo),
          progresso: 0,
          estado: "erro",
          mensagem: "Acima de 50 MB.",
        });
        continue;
      }
      novos.push({ arquivo, nome: sugerirNome(arquivo), progresso: 0, estado: "espera" });
    }
    setItens((atual) => [...atual, ...novos]);
  }, []);

  function atualizarItem(indice: number, mudanca: Partial<Item>) {
    setItens((atual) => atual.map((item, i) => (i === indice ? { ...item, ...mudanca } : item)));
  }

  async function enviarTudo() {
    setErroGeral(null);
    setEnviando(true);
    let houveSucesso = false;

    for (let i = 0; i < itens.length; i += 1) {
      const item = itens[i];
      if (item.estado === "pronto" || item.estado === "duplicado") continue;
      if (item.arquivo.size > MAX_BYTES) continue;

      atualizarItem(i, { estado: "enviando", progresso: 0, mensagem: undefined });
      try {
        const preparo = await fetch("/api/documentos/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            nomeArquivo: item.arquivo.name,
            categoria: categoria || null,
            tamanho: item.arquivo.size,
          }),
        });
        const dadosPreparo = (await preparo.json()) as { caminho?: string; url?: string; erro?: string };
        if (!preparo.ok || !dadosPreparo.url || !dadosPreparo.caminho) {
          throw new Error(dadosPreparo.erro ?? "Não foi possível preparar o envio.");
        }

        await enviarAoBucket(dadosPreparo.url, item.arquivo, (pct) => atualizarItem(i, { progresso: pct }));

        const confirmacao = await fetch("/api/documentos/confirmar", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            caminho: dadosPreparo.caminho,
            nomeArquivo: item.arquivo.name,
            nomeExibicao: item.nome.trim() || item.arquivo.name,
            categoria: categoria || null,
            pasta: pasta || null,
            status,
            validoAte: validoAte || null,
            alvoTipo: alvoTipo ?? null,
            alvoId: alvoId ?? null,
            documentoPaiId: documentoPaiId ?? null,
          }),
        });
        const dados = (await confirmacao.json()) as { duplicado?: boolean; erro?: string };
        if (!confirmacao.ok) throw new Error(dados.erro ?? "Falha ao registrar o documento.");

        houveSucesso = true;
        atualizarItem(i, {
          estado: dados.duplicado ? "duplicado" : "pronto",
          progresso: 100,
          mensagem: dados.duplicado ? "Arquivo idêntico já no acervo: vínculo reaproveitado." : undefined,
        });
      } catch (erro) {
        atualizarItem(i, {
          estado: "erro",
          mensagem: erro instanceof Error ? erro.message : "Falha no envio.",
        });
      }
    }

    setEnviando(false);
    if (houveSucesso) {
      aoConcluir?.();
      router.refresh();
    }
  }

  const pendentes = itens.filter((i) => i.estado === "espera" || i.estado === "erro").length;

  if (!storageAtivo) {
    return (
      <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
        Supabase Storage não configurado: o envio de arquivos está desativado para não gerar registro sem arquivo.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!desabilitado) setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          if (!desabilitado) adicionar(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-2xl border border-dashed px-6 text-center transition-colors",
          compacto ? "py-6" : "py-10",
          arrastando ? "border-cyan-400 bg-cyan-400/5" : "border-slate-300 bg-slate-50/40",
          desabilitado && "opacity-60",
        )}
      >
        <CloudUpload className="mx-auto text-slate-400" size={compacto ? 22 : 28} aria-hidden />
        <p className="mt-2 text-sm text-slate-700">
          Arraste os arquivos aqui ou{" "}
          <button
            type="button"
            disabled={desabilitado}
            onClick={() => inputRef.current?.click()}
            className="font-medium text-cyan-600 underline-offset-2 hover:underline disabled:no-underline"
          >
            escolha do computador
          </button>
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          PDF, Word, Excel, PowerPoint, CSV, imagens e ZIP — até 50 MB por arquivo.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          disabled={desabilitado}
          onChange={(e) => {
            adicionar(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {itens.length > 0 ? (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="text-xs font-medium text-slate-700">
              Categoria
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">—</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-slate-700">
              Pasta
              <input
                value={pasta}
                onChange={(e) => setPasta(e.target.value)}
                placeholder="ex.: CPA/2026"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Válido até
              <input
                type="date"
                value={validoAte}
                onChange={(e) => setValidoAte(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              />
            </label>
            <label className="text-xs font-medium text-slate-700">
              Situação
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="VIGENTE">Vigente</option>
                <option value="RASCUNHO">Rascunho</option>
                <option value="EM_APROVACAO">Em aprovação</option>
              </select>
            </label>
          </div>

          <ul className="space-y-2">
            {itens.map((item, i) => (
              <li
                key={`${item.arquivo.name}-${i}`}
                className="rounded-xl border border-slate-200 bg-white/60 px-3 py-2.5"
              >
                <div className="flex items-center gap-3">
                  <FileText size={16} className="shrink-0 text-slate-400" aria-hidden />
                  <input
                    value={item.nome}
                    disabled={item.estado === "pronto" || item.estado === "duplicado" || enviando}
                    onChange={(e) => atualizarItem(i, { nome: e.target.value })}
                    aria-label={`Nome de ${item.arquivo.name}`}
                    className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-slate-900 hover:border-slate-300 focus:border-cyan-400 focus:outline-none disabled:text-slate-500"
                  />
                  <span className="shrink-0 text-[11px] tabular-nums text-slate-500">
                    {formatarTamanho(item.arquivo.size)}
                  </span>
                  {item.estado === "enviando" ? (
                    <Loader2 size={15} className="shrink-0 animate-spin text-cyan-500" aria-hidden />
                  ) : item.estado === "pronto" ? (
                    <CheckCircle2 size={15} className="shrink-0 text-emerald-500" aria-hidden />
                  ) : item.estado === "duplicado" ? (
                    <CheckCircle2 size={15} className="shrink-0 text-amber-500" aria-hidden />
                  ) : item.estado === "erro" ? (
                    <TriangleAlert size={15} className="shrink-0 text-rose-500" aria-hidden />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setItens((atual) => atual.filter((_, idx) => idx !== i))}
                      aria-label={`Remover ${item.arquivo.name}`}
                      className="shrink-0 text-slate-400 hover:text-rose-500"
                    >
                      <X size={15} aria-hidden />
                    </button>
                  )}
                </div>
                {item.estado === "enviando" ? (
                  <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500 transition-[width]"
                      style={{ width: `${item.progresso}%` }}
                    />
                  </div>
                ) : null}
                {item.mensagem ? (
                  <p
                    className={cn(
                      "mt-1.5 pl-7 text-[11px]",
                      item.estado === "erro" ? "text-rose-600" : "text-amber-600",
                    )}
                  >
                    {item.mensagem}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {erroGeral ? (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
              {erroGeral}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={enviarTudo}
              disabled={desabilitado || enviando || pendentes === 0}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)] transition-all hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.85)] active:scale-[0.99] disabled:opacity-60"
            >
              {enviando ? "Enviando…" : `Enviar ${pendentes} arquivo(s)`}
            </button>
            {itens.some((i) => i.estado === "pronto" || i.estado === "duplicado") ? (
              <button
                type="button"
                onClick={() => setItens([])}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                limpar lista
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
