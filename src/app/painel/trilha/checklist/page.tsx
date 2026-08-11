import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Badge, Barra, Card, Celula, Tabela, TituloPagina } from "@/components/ui";
import { queryOne } from "@/lib/db";
import {
  agruparPorSecao,
  calcularProgresso,
  listarPassos,
  ROTULO_BLOCO,
  type Bloco,
  type PassoComEstado,
} from "@/lib/trilha";

export const dynamic = "force-dynamic";

function situacao(passo: PassoComEstado): { rotulo: string; tom: "ok" | "risco" | "atencao" | "neutro" } {
  if (passo.status === "CONCLUIDO" && passo.vencido) return { rotulo: "evidência vencida", tom: "atencao" };
  if (passo.status === "CONCLUIDO") return { rotulo: "entregue", tom: "ok" };
  if (passo.status === "NAO_HA") return { rotulo: "não há", tom: "risco" };
  if (passo.status === "NSA") return { rotulo: "não se aplica", tom: "neutro" };
  return { rotulo: "não preenchido", tom: "atencao" };
}

export default async function ChecklistPage() {
  const passos = await listarPassos();
  const geral = calcularProgresso(passos);
  const ies = await queryOne<{ nome: string; codigo_emec: string | null }>(
    "select nome, codigo_emec from ies order by criado_em limit 1",
  );
  const faltando = passos.filter((p) => p.status === null || p.status === "NAO_HA" || (p.status === "CONCLUIDO" && p.vencido));

  return (
    <>
      <TituloPagina
        titulo="Relatório de pendências do dossiê"
        descricao={`${ies?.nome ?? "IES"}${ies?.codigo_emec ? ` · código e-MEC ${ies.codigo_emec}` : ""} — o que já está no acervo, o que a instituição declarou não possuir e o que ainda não foi visitado na trilha.`}
        acao={
          <div className="flex gap-2">
            <Link
              href="/painel/trilha"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 print:hidden"
            >
              <ArrowLeft size={15} aria-hidden /> Voltar à trilha
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-500 print:hidden">
              <Printer size={15} aria-hidden /> Ctrl+P para imprimir
            </span>
          </div>
        }
      />

      <Card destaque className="mb-6">
        <div className="grid gap-4 sm:grid-cols-5">
          {[
            { rotulo: "Preenchido", valor: `${geral.percentual}%` },
            { rotulo: "Entregues", valor: geral.concluidos },
            { rotulo: "Sem documento", valor: geral.naoHa },
            { rotulo: "Vencidos", valor: geral.vencidos },
            { rotulo: "Não visitados", valor: geral.pendentes },
          ].map((item) => (
            <div key={item.rotulo}>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{item.rotulo}</p>
              <p className="fonte-display text-2xl font-semibold tabular-nums text-slate-900">{item.valor}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Barra valor={geral.percentual} tom={geral.percentual === 100 ? "ok" : "info"} />
        </div>
      </Card>

      <Card className="mb-6">
        <h2 className="fonte-display mb-3 text-sm font-semibold text-slate-900">
          O que está faltando ({faltando.length})
        </h2>
        {faltando.length === 0 ? (
          <p className="text-sm text-slate-600">Nada pendente: todos os passos da trilha foram respondidos.</p>
        ) : (
          <Tabela cabecalho={["Item", "Onde", "Situação", "Base legal", "Observação"]}>
            {faltando.map((passo) => {
              const s = situacao(passo);
              return (
                <tr key={passo.id}>
                  <Celula className="font-medium text-slate-900">
                    <Link href={`/painel/trilha/${passo.codigo}`} className="hover:underline">
                      {passo.titulo}
                    </Link>
                  </Celula>
                  <Celula className="text-xs text-slate-500">{passo.secao}</Celula>
                  <Celula>
                    <Badge tom={s.tom}>{s.rotulo}</Badge>
                  </Celula>
                  <Celula className="text-xs text-slate-500">{passo.base_legal ?? "—"}</Celula>
                  <Celula className="text-xs text-slate-500">{passo.observacao ?? "—"}</Celula>
                </tr>
              );
            })}
          </Tabela>
        )}
      </Card>

      {(["A", "B", "C"] as Bloco[]).map((bloco) => {
        const doBloco = passos.filter((p) => p.bloco === bloco);
        if (doBloco.length === 0) return null;
        const progresso = calcularProgresso(doBloco);
        return (
          <Card key={bloco} className="mb-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="fonte-display text-sm font-semibold text-slate-900">{ROTULO_BLOCO[bloco]}</h2>
              <span className="text-xs tabular-nums text-slate-500">
                {progresso.percentual}% · {progresso.pendentes} pendentes de {progresso.total}
              </span>
            </div>
            <div className="space-y-4">
              {agruparPorSecao(doBloco).map((grupo) => {
                const p = calcularProgresso(grupo.passos);
                return (
                  <div key={grupo.secao}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-medium text-slate-700">{grupo.secao}</p>
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {p.concluidos}/{p.total} entregues
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <Barra valor={p.percentual} tom={p.percentual === 100 ? "ok" : p.percentual === 0 ? "risco" : "info"} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </>
  );
}
