import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { Badge, Botao, Card, Celula, Tabela, TituloPagina, Vazio } from "@/components/ui";
import { carregarOpcoesRef, listar } from "@/lib/crud";
import { entidadePorSlug, type Campo } from "@/lib/registry";
import { formatarData, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

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

export default async function ListaEntidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ entidade: string }>;
  searchParams: Promise<{ busca?: string }>;
}) {
  const { entidade: slug } = await params;
  const { busca } = await searchParams;
  const entidade = entidadePorSlug(slug);
  if (!entidade) notFound();

  const [registros, opcoes] = await Promise.all([listar(entidade, { busca }), carregarOpcoesRef(entidade)]);
  const colunas = entidade.campos.filter((c) => c.naLista).slice(0, 6);

  return (
    <>
      <TituloPagina
        titulo={entidade.rotulo}
        descricao={entidade.descricao}
        acao={
          <Botao href={`/painel/dados/${slug}/novo`}>
            <Plus size={15} aria-hidden /> Novo registro
          </Botao>
        }
      />

      <Card padding={false}>
        <form className="flex items-center gap-2 border-b border-slate-200 px-4 py-3" action={`/painel/dados/${slug}`}>
          <input
            name="busca"
            defaultValue={busca ?? ""}
            placeholder={`Buscar por ${entidade.campoTitulo}…`}
            className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-slate-900"
          />
          <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Buscar
          </button>
          <span className="ml-auto text-xs text-slate-500">{registros.length} registro(s)</span>
        </form>

        {registros.length === 0 ? (
          <div className="p-6">
            <Vazio
              titulo={`Nenhum registro de ${entidade.rotuloSingular.toLowerCase()}`}
              descricao={entidade.descricao}
              acao={<Botao href={`/painel/dados/${slug}/novo`}>Cadastrar agora</Botao>}
            />
          </div>
        ) : (
          <div className="px-2 py-1">
            <Tabela cabecalho={[...colunas.map((c) => c.rotulo), ""]}>
              {registros.map((r) => (
                <tr key={String(r.id)} className="hover:bg-slate-50">
                  {colunas.map((c) => (
                    <Celula key={c.nome}>{renderizar(c, r[c.nome], opcoes)}</Celula>
                  ))}
                  <Celula className="text-right">
                    <Link
                      href={`/painel/dados/${slug}/${String(r.id)}`}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      abrir
                    </Link>
                  </Celula>
                </tr>
              ))}
            </Tabela>
          </div>
        )}
      </Card>
    </>
  );
}
