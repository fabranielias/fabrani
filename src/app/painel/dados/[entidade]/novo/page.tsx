import { notFound } from "next/navigation";
import { Card, TituloPagina } from "@/components/ui";
import { FormularioEntidade } from "@/components/FormularioEntidade";
import { carregarOpcoesRef } from "@/lib/crud";
import { entidadePorSlug } from "@/lib/registry";
import { podeEscrever, sessaoAtual } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NovoRegistroPage({ params }: { params: Promise<{ entidade: string }> }) {
  const { entidade: slug } = await params;
  const entidade = entidadePorSlug(slug);
  if (!entidade) notFound();

  const [opcoes, sessao] = await Promise.all([carregarOpcoesRef(entidade), sessaoAtual()]);

  return (
    <>
      <TituloPagina titulo={`Novo — ${entidade.rotuloSingular}`} descricao={entidade.descricao} />
      <Card>
        <FormularioEntidade entidade={entidade} opcoes={opcoes} somenteLeitura={!podeEscrever(sessao)} />
      </Card>
    </>
  );
}
