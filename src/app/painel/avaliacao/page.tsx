import Link from "next/link";
import { Badge, Card, CardTitulo, TituloPagina, Vazio } from "@/components/ui";
import { query } from "@/lib/db";
import { resumoCiclo } from "@/lib/avaliacao";
import { formatarConceito, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AvaliacaoPage() {
  const ciclos = await query<{ id: string }>("select id from ciclo_avaliacao order by ano_referencia desc, titulo");
  const resumos = (await Promise.all(ciclos.map((c) => resumoCiclo(c.id)))).filter((r) => r !== null);

  return (
    <>
      <TituloPagina
        titulo="Ciclos de avaliação SINAES"
        descricao="Autoavaliação espelhada no instrumento do INEP: conceito por eixo, simulação do CI/CC e cobertura de evidências."
      />

      {resumos.length === 0 ? (
        <Vazio titulo="Nenhum ciclo de avaliação" descricao="Crie um ciclo vinculando um instrumento versionado." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {resumos.map((r) => (
            <Card key={r.ciclo.id}>
              <CardTitulo
                titulo={r.ciclo.titulo}
                descricao={`${r.ciclo.instrumento_titulo}${r.ciclo.curso_nome ? ` · ${r.ciclo.curso_nome}` : ""}`}
                acao={
                  <Link href={`/painel/avaliacao/${r.ciclo.id}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                    abrir
                  </Link>
                }
              />
              <div className="mb-3 flex flex-wrap gap-1.5">
                <Badge tom={r.ciclo.status === "ABERTO" ? "info" : "neutro"}>{rotularEnum(r.ciclo.status)}</Badge>
                <Badge>{rotularEnum(r.ciclo.finalidade)}</Badge>
                <Badge>{r.ciclo.ano_referencia}</Badge>
                {r.ciclo.instrumento_situacao === "PROPOSTA" ? <Badge tom="atencao">instrumento em proposta</Badge> : null}
              </div>
              <dl className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Conceito simulado</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatarConceito(r.conceitoSimulado)}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Faixa</dt>
                  <dd className="text-lg font-semibold tabular-nums">{r.faixa ?? "—"}</dd>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <dt className="text-[10px] uppercase tracking-wide text-slate-500">Cobertura</dt>
                  <dd className="text-lg font-semibold tabular-nums">{r.cobertura.toFixed(0)}%</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
