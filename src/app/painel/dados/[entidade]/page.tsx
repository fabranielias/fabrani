import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, Download, Plus, Search } from "lucide-react";
import { Badge, Botao, Card, Celula, TituloPagina, Vazio } from "@/components/ui";
import { carregarOpcoesRef, listarPagina, TAMANHO_PAGINA, type Filtro } from "@/lib/crud";
import { entidadePorSlug, type Campo, type Entidade } from "@/lib/registry";
import { podeVer, sessaoAtual } from "@/lib/session";
import { formatarData, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Busca = Record<string, string | undefined>;

function renderizar(campo: Campo, valor: unknown, opcoes: Record<string, { id: string; rotulo: string }[]>) {
  if (valor === null || valor === undefined || valor === "") return "—";
  switch (campo.tipo) {
    case "date":
      return formatarData(String(valor));
    case "boolean":
      return <Badge tom={valor ? "ok" : "neutro"}>{valor ? "Sim" : "Não"}</Badge>;
    case "select":
      return <Badge>{rotularEnum(String(valor))}</Badge>;
    case "ref": {
      const item = (opcoes[campo.nome] ?? []).find((o) => o.id === String(valor));
      return item?.rotulo ?? "—";
    }
    case "tags":
      return Array.isArray(valor) ? valor.join(", ") : String(valor);
    default:
      return String(valor);
  }
}

/** Campos que viram filtro: os marcados e, por padrão, todos os selects e booleanos da lista. */
function camposFiltraveis(entidade: Entidade): Campo[] {
  return entidade.campos
    .filter((c) => c.filtravel ?? ((c.tipo === "select" || c.tipo === "boolean") && c.naLista))
    .slice(0, 4);
}

function comParametros(base: string, atual: Busca, mudancas: Busca): string {
  const p = new URLSearchParams();
  for (const [chave, valor] of Object.entries({ ...atual, ...mudancas })) {
    if (valor) p.set(chave, valor);
  }
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}

export default async function ListaEntidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ entidade: string }>;
  searchParams: Promise<Busca>;
}) {
  const { entidade: slug } = await params;
  const consulta = await searchParams;
  const entidade = entidadePorSlug(slug);
  if (!entidade) notFound();

  const sessao = await sessaoAtual();
  if (!podeVer(entidade.papeisLeitura, sessao?.papel)) notFound();

  const filtraveis = camposFiltraveis(entidade);
  const filtros: Filtro[] = filtraveis
    .map((c) => ({ campo: c.nome, valor: consulta[`f_${c.nome}`] ?? "" }))
    .filter((f) => f.valor !== "");

  const pagina = Number(consulta.pagina ?? "1") || 1;
  const ordem = consulta.ordem;
  const direcao = consulta.direcao === "desc" ? "desc" : "asc";

  const [resultado, opcoes] = await Promise.all([
    listarPagina(entidade, {
      busca: consulta.busca,
      filtros,
      pagina,
      tamanho: TAMANHO_PAGINA,
      ordem,
      direcao,
    }),
    carregarOpcoesRef(entidade),
  ]);

  const colunas = entidade.campos.filter((c) => c.naLista).slice(0, 6);
  const base = `/painel/dados/${slug}`;
  const contexto: Busca = { ...consulta, pagina: undefined };
  const temFiltro = Boolean(consulta.busca) || filtros.length > 0;

  return (
    <>
      <TituloPagina
        titulo={entidade.rotulo}
        descricao={entidade.descricao}
        acao={
          <div className="flex gap-2">
            <a
              href={comParametros(`/api/dados/${slug}/csv`, contexto, {})}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/40 px-4 py-2 text-sm text-slate-800 hover:border-cyan-400"
            >
              <Download size={15} aria-hidden /> CSV
            </a>
            <Botao href={`${base}/novo`}>
              <Plus size={15} aria-hidden /> Novo registro
            </Botao>
          </div>
        }
      />

      {consulta.excluido ? (
        <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
          Registro excluído. A auditoria guarda o conteúdo anterior.
        </p>
      ) : null}

      <Card padding={false}>
        <form className="border-b border-slate-200 px-4 py-3" action={base}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                name="busca"
                defaultValue={consulta.busca ?? ""}
                placeholder="Buscar…"
                aria-label={`Buscar em ${entidade.rotulo}`}
                className="w-full rounded-lg border border-slate-300 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-400"
              />
            </div>

            {filtraveis.map((campo) => (
              <select
                key={campo.nome}
                name={`f_${campo.nome}`}
                defaultValue={consulta[`f_${campo.nome}`] ?? ""}
                aria-label={campo.rotulo}
                className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">{campo.rotulo}: todos</option>
                {campo.tipo === "boolean" ? (
                  <>
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </>
                ) : (
                  (campo.opcoes ?? []).map((o) => (
                    <option key={o} value={o}>
                      {rotularEnum(o)}
                    </option>
                  ))
                )}
              </select>
            ))}

            {ordem ? <input type="hidden" name="ordem" value={ordem} /> : null}
            {ordem ? <input type="hidden" name="direcao" value={direcao} /> : null}

            <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
              Filtrar
            </button>
            {temFiltro ? (
              <Link href={base} className="text-xs text-slate-500 hover:text-slate-900">
                limpar
              </Link>
            ) : null}
            <span className="ml-auto text-xs text-slate-500">{resultado.total} registro(s)</span>
          </div>
        </form>

        {resultado.linhas.length === 0 ? (
          <div className="p-6">
            <Vazio
              titulo={temFiltro ? "Nenhum registro para este filtro" : `Nenhum registro de ${entidade.rotuloSingular.toLowerCase()}`}
              descricao={entidade.descricao}
              acao={temFiltro ? undefined : <Botao href={`${base}/novo`}>Cadastrar agora</Botao>}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto px-2 py-1">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    {colunas.map((c) => {
                      const ativa = ordem === c.nome;
                      const proxima = ativa && direcao === "asc" ? "desc" : "asc";
                      return (
                        <th key={c.nome} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                          <Link
                            href={comParametros(base, contexto, { ordem: c.nome, direcao: proxima })}
                            className="inline-flex items-center gap-1 hover:text-slate-900"
                          >
                            {c.rotulo}
                            {ativa ? (
                              direcao === "asc" ? (
                                <ArrowUp size={11} aria-hidden />
                              ) : (
                                <ArrowDown size={11} aria-hidden />
                              )
                            ) : null}
                          </Link>
                        </th>
                      );
                    })}
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 [&>tr]:transition-colors [&>tr:hover]:bg-cyan-400/[0.04]">
                  {resultado.linhas.map((r) => (
                    <tr key={String(r.id)}>
                      {colunas.map((c) => (
                        <Celula key={c.nome}>{renderizar(c, r[c.nome], opcoes)}</Celula>
                      ))}
                      <Celula className="text-right">
                        <Link
                          href={`${base}/${String(r.id)}`}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          abrir
                        </Link>
                      </Celula>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {resultado.paginas > 1 ? (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
                <span>
                  Página {resultado.pagina} de {resultado.paginas}
                </span>
                <div className="flex gap-2">
                  {resultado.pagina > 1 ? (
                    <Link
                      href={comParametros(base, contexto, { pagina: String(resultado.pagina - 1) })}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                    >
                      anterior
                    </Link>
                  ) : null}
                  {resultado.pagina < resultado.paginas ? (
                    <Link
                      href={comParametros(base, contexto, { pagina: String(resultado.pagina + 1) })}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                    >
                      próxima
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        )}
      </Card>
    </>
  );
}
