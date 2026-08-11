import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Celula, Tabela, TituloPagina, Vazio } from "@/components/ui";
import { atualizarRequisitoLegalAction } from "@/app/actions";
import { query, queryOne } from "@/lib/db";
import { rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RequisitosLegaisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ciclo = await queryOne<{ id: string; titulo: string }>(
    "select id, titulo from ciclo_avaliacao where id = $1",
    [id],
  );
  if (!ciclo) notFound();

  const linhas = await query<{
    id: string;
    situacao: string;
    observacao: string | null;
    titulo: string;
    base_legal: string | null;
    codigo: string;
  }>(
    `select arl.id, arl.situacao, arl.observacao, rl.titulo, rl.base_legal, rl.codigo
       from avaliacao_requisito_legal arl
       join requisito_legal rl on rl.id = arl.requisito_legal_id
      where arl.ciclo_id = $1
      order by rl.codigo`,
    [id],
  );

  return (
    <>
      <TituloPagina
        titulo="Requisitos legais e normativos"
        descricao="Não entram no cálculo do conceito, mas o descumprimento de qualquer um deles compromete o resultado do processo."
        acao={
          <Link href={`/painel/avaliacao/${id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Voltar ao ciclo
          </Link>
        }
      />

      <Card padding={false}>
        {linhas.length === 0 ? (
          <div className="p-6">
            <Vazio titulo="Nenhum requisito legal vinculado a este ciclo" />
          </div>
        ) : (
          <div className="px-2 py-1">
            <Tabela cabecalho={["Cód.", "Requisito", "Base legal", "Situação", "Atualizar"]}>
              {linhas.map((r) => (
                <tr key={r.id}>
                  <Celula className="font-mono text-xs text-slate-500">{r.codigo}</Celula>
                  <Celula>
                    <p className="text-slate-900">{r.titulo}</p>
                    {r.observacao ? <p className="mt-0.5 text-xs text-slate-500">{r.observacao}</p> : null}
                  </Celula>
                  <Celula className="text-xs text-slate-500">{r.base_legal ?? "—"}</Celula>
                  <Celula>
                    <Badge
                      tom={
                        r.situacao === "ATENDIDO" ? "ok" : r.situacao === "NAO_ATENDIDO" ? "risco" : r.situacao === "NSA" ? "neutro" : "atencao"
                      }
                    >
                      {rotularEnum(r.situacao)}
                    </Badge>
                  </Celula>
                  <Celula>
                    <form action={atualizarRequisitoLegalAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={r.id} />
                      <select
                        name="situacao"
                        defaultValue={r.situacao}
                        aria-label={`Situação do requisito ${r.codigo}`}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-900"
                      >
                        <option value="NAO_VERIFICADO">Não verificado</option>
                        <option value="ATENDIDO">Atendido</option>
                        <option value="PARCIAL">Parcial</option>
                        <option value="NAO_ATENDIDO">Não atendido</option>
                        <option value="NSA">NSA</option>
                      </select>
                      <input
                        name="observacao"
                        defaultValue={r.observacao ?? ""}
                        placeholder="observação"
                        aria-label={`Observação do requisito ${r.codigo}`}
                        className="w-36 rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-slate-900"
                      />
                      <button type="submit" className="rounded-lg border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                        ok
                      </button>
                    </form>
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
