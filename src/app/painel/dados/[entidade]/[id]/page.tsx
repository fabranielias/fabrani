import { notFound } from "next/navigation";
import { Card, TituloPagina } from "@/components/ui";
import { FormularioEntidade } from "@/components/FormularioEntidade";
import { carregarOpcoesRef, obter } from "@/lib/crud";
import { entidadePorSlug } from "@/lib/registry";
import { podeEscrever, sessaoAtual } from "@/lib/session";

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

  const [opcoes, sessao] = await Promise.all([carregarOpcoesRef(entidade), sessaoAtual()]);
  const titulo = String(registro[entidade.campoTitulo] ?? entidade.rotuloSingular);

  return (
    <>
      <TituloPagina titulo={titulo} descricao={`${entidade.rotuloSingular} · edição de dados regulatórios`} />
      {salvo ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
          Registro salvo e gravado no log de auditoria.
        </p>
      ) : null}
      <Card>
        <FormularioEntidade
          entidade={entidade}
          registro={registro}
          opcoes={opcoes}
          somenteLeitura={!podeEscrever(sessao)}
        />
      </Card>
    </>
  );
}
