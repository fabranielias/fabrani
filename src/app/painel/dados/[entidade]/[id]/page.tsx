import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { Badge, Card, CardTitulo, TituloPagina } from "@/components/ui";
import { EnvioArquivos } from "@/components/EnvioArquivos";
import { FormularioEntidade } from "@/components/FormularioEntidade";
import { alvoDaEntidade, documentosDoAlvo } from "@/lib/acervo";
import { carregarOpcoesRef, dependencias, historico, obter } from "@/lib/crud";
import { entidadePorSlug } from "@/lib/registry";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { storageConfigurado } from "@/lib/storage";
import { formatarData, rotularEnum } from "@/lib/utils";
import { ExcluirRegistro } from "./ExcluirRegistro";

export const dynamic = "force-dynamic";

export default async function EditarRegistroPage({
  params,
  searchParams,
}: {
  params: Promise<{ entidade: string; id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { entidade: slug, id } = await params;
  const { salvo } = await searchParams;
  const entidade = entidadePorSlug(slug);
  if (!entidade) notFound();

  const registro = await obter(entidade, id);
  if (!registro) notFound();

  const alvo = alvoDaEntidade(slug);
  const [opcoes, sessao, eventos, presos, anexos] = await Promise.all([
    carregarOpcoesRef(entidade),
    sessaoAtual(),
    historico(entidade.tabela, id),
    dependencias(entidade, id),
    alvo ? documentosDoAlvo(alvo, id) : Promise.resolve([]),
  ]);

  const titulo = String(registro[entidade.campoTitulo] ?? entidade.rotuloSingular);
  const somenteLeitura =
    !podeEscrever(sessao) || Boolean(entidade.papeisEscrita && sessao && !entidade.papeisEscrita.includes(sessao.papel));
  const podeExcluir = sessao?.papel === "SUPERADMIN" && entidade.permiteExcluir !== false;

  return (
    <>
      <TituloPagina titulo={titulo} descricao={`${entidade.rotuloSingular} · edição de dados regulatórios`} />
      {salvo ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
          Registro salvo e gravado no log de auditoria.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <FormularioEntidade
              entidade={entidade}
              registro={registro}
              opcoes={opcoes}
              somenteLeitura={somenteLeitura}
            />
          </Card>

          {alvo ? (
            <Card>
              <CardTitulo
                titulo="Anexos e evidências"
                descricao={`Arquivos que comprovam este registro de ${entidade.rotuloSingular.toLowerCase()}.`}
              />
              {anexos.length === 0 ? (
                <p className="mb-4 text-xs text-slate-500">Nenhum documento vinculado ainda.</p>
              ) : (
                <ul className="mb-4 space-y-1.5">
                  {anexos.map((a) => (
                    <li
                      key={a.vinculo_id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <Link
                        href={`/painel/documentos/${a.documento_id}`}
                        className="min-w-0 flex-1 truncate text-slate-800 hover:text-cyan-600"
                      >
                        {a.nome_exibicao}
                      </Link>
                      <Badge tom={a.status === "VIGENTE" ? "ok" : "neutro"}>{rotularEnum(a.status)}</Badge>
                      {a.tem_arquivo ? (
                        <a
                          href={`/api/documentos/${a.documento_id}/download`}
                          className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500 hover:text-cyan-600"
                        >
                          <Download size={13} aria-hidden /> baixar
                        </a>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              <EnvioArquivos
                alvoTipo={alvo}
                alvoId={id}
                desabilitado={somenteLeitura}
                storageAtivo={storageConfigurado()}
                compacto
              />
            </Card>
          ) : null}
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardTitulo titulo="Histórico" descricao="Toda alteração deste registro, com autor e data." />
            {eventos.length === 0 ? (
              <p className="text-xs text-slate-500">Sem alterações registradas.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {eventos.map((e, i) => (
                  <li key={`${e.criado_em}-${i}`} className="flex items-start justify-between gap-2">
                    <span className="min-w-0">
                      <Badge tom={e.acao === "EXCLUIR" ? "risco" : e.acao === "CRIAR" ? "ok" : "neutro"}>
                        {rotularEnum(e.acao)}
                      </Badge>
                      <span className="ml-2 text-slate-600">{e.usuario_email ?? "—"}</span>
                    </span>
                    <span className="shrink-0 text-slate-400">{e.criado_em}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {presos.length > 0 ? (
            <Card>
              <CardTitulo titulo="Registros relacionados" descricao="Outros dados que dependem deste." />
              <ul className="space-y-1 text-xs text-slate-600">
                {presos.map((d) => (
                  <li key={d.tabela} className="flex justify-between gap-2">
                    <span>{rotularEnum(d.tabela)}</span>
                    <span className="tabular-nums text-slate-900">{d.total}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          {registro.criado_em ? (
            <p className="text-[11px] text-slate-500">Criado em {formatarData(String(registro.criado_em))}</p>
          ) : null}

          {podeExcluir ? (
            <ExcluirRegistro slug={slug} id={id} titulo={titulo} dependencias={presos} />
          ) : null}
        </div>
      </div>
    </>
  );
}
