import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleDashed, ClipboardList, Lock, MinusCircle, TriangleAlert } from "lucide-react";
import { Badge, Barra, Card, TituloPagina } from "@/components/ui";
import {
  agruparPorSecao,
  calcularProgresso,
  listarPassos,
  proximoPendente,
  resolvido,
  ROTULO_BLOCO,
  sincronizarTrilha,
  type Bloco,
  type PassoComEstado,
} from "@/lib/trilha";

export const dynamic = "force-dynamic";

const DESCRICAO: Record<Bloco, string> = {
  A: "Dados da mantenedora e da IES, atos autorizativos, polos, colegiados e os documentos institucionais (contrato social, PDI, regimento, certidões).",
  B: "Os cinco eixos do instrumento de avaliação institucional externa — um passo por indicador, com as evidências que a comissão procura.",
  C: "Cada curso pelas três dimensões do instrumento de curso, incluindo corpo docente e tutorial e os requisitos legais.",
};

function IconeStatus({ passo }: { passo: PassoComEstado }) {
  if (passo.status === "CONCLUIDO" && passo.vencido)
    return <TriangleAlert size={15} className="shrink-0 text-amber-500" aria-label="evidência vencida" />;
  if (passo.status === "CONCLUIDO")
    return <CheckCircle2 size={15} className="shrink-0 text-emerald-500" aria-label="concluído" />;
  if (passo.status === "NAO_HA")
    return <MinusCircle size={15} className="shrink-0 text-rose-400" aria-label="não há" />;
  if (passo.status === "NSA")
    return <MinusCircle size={15} className="shrink-0 text-slate-400" aria-label="não se aplica" />;
  return <CircleDashed size={15} className="shrink-0 text-slate-300" aria-label="pendente" />;
}

export default async function TrilhaPage({
  searchParams,
}: {
  searchParams: Promise<{ bloco?: string; concluido?: string }>;
}) {
  const { bloco: blocoParam, concluido } = await searchParams;

  let passos = await listarPassos();
  if (passos.length === 0) {
    await sincronizarTrilha();
    passos = await listarPassos();
  }

  const geral = calcularProgresso(passos);
  const blocoA = passos.filter((p) => p.bloco === "A");
  const progressoA = calcularProgresso(blocoA);
  const cursosLiberados = progressoA.pendentes === 0;
  const blocoAtivo = (["A", "B", "C"].includes(blocoParam ?? "") ? blocoParam : "A") as Bloco;
  const doBloco = passos.filter((p) => p.bloco === blocoAtivo);
  const proximo = proximoPendente(passos);

  return (
    <>
      <TituloPagina
        titulo="Dossiê guiado"
        descricao="Um passo de cada vez: o sistema pergunta, explica por que o MEC exige e guarda tudo no mesmo repositório que o Sócrates consulta. Se o documento não existir, marque “não há” e siga em frente."
        acao={
          <Link
            href="/painel/trilha/checklist"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/40 px-4 py-2 text-sm text-slate-800 hover:border-cyan-400/50"
          >
            <ClipboardList size={15} aria-hidden /> Relatório de pendências
          </Link>
        }
      />

      {concluido ? (
        <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Bloco {blocoParam} percorrido até o fim. Veja o relatório de pendências para conferir o que ficou como “não há”.
        </p>
      ) : null}

      <Card destaque className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Dossiê regulatório</p>
            <p className="fonte-display mt-1 text-3xl font-semibold tabular-nums text-slate-900">{geral.percentual}%</p>
            <p className="mt-1 text-xs text-slate-500">
              {geral.concluidos} entregues · {geral.naoHa} sem documento · {geral.nsa} não se aplica ·{" "}
              {geral.vencidos} vencidos · {geral.pendentes} a fazer
            </p>
          </div>
          {proximo ? (
            <Link
              href={`/painel/trilha/${proximo.codigo}`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)]"
            >
              Continuar de onde parou <ArrowRight size={15} aria-hidden />
            </Link>
          ) : (
            <Badge tom="ok" brilho>
              trilha completa
            </Badge>
          )}
        </div>
        <div className="mt-4">
          <Barra valor={geral.percentual} tom={geral.percentual === 100 ? "ok" : "info"} />
        </div>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {(["A", "B", "C"] as Bloco[]).map((bloco) => {
          const progresso = calcularProgresso(passos.filter((p) => p.bloco === bloco));
          const bloqueado = bloco === "C" && !cursosLiberados;
          return (
            <Card key={bloco} className={bloco === blocoAtivo ? "border-cyan-400/40" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="fonte-display text-sm font-semibold text-slate-900">{ROTULO_BLOCO[bloco]}</h2>
                {bloqueado ? (
                  <Lock size={15} className="text-slate-400" aria-hidden />
                ) : (
                  <span className="text-xs tabular-nums text-slate-500">{progresso.percentual}%</span>
                )}
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{DESCRICAO[bloco]}</p>
              <div className="mt-3">
                <Barra valor={progresso.percentual} tom={progresso.percentual === 100 ? "ok" : "info"} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                {progresso.total} passos · {progresso.pendentes} pendentes
              </p>
              {bloqueado ? (
                <p className="mt-3 text-[11px] text-amber-700">
                  Termine o Bloco A (ou marque “não há” nos itens que faltam) para liberar os cursos.
                </p>
              ) : (
                <Link
                  href={`/painel/trilha?bloco=${bloco}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-cyan-600 hover:underline"
                >
                  Ver passos <ArrowRight size={13} aria-hidden />
                </Link>
              )}
            </Card>
          );
        })}
      </div>

      <div className="space-y-4">
        {agruparPorSecao(doBloco).map((grupo) => {
          const progresso = calcularProgresso(grupo.passos);
          const bloqueado = blocoAtivo === "C" && !cursosLiberados;
          return (
            <Card key={grupo.secao}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="fonte-display text-sm font-semibold text-slate-900">{grupo.secao}</h3>
                <span className="text-[11px] tabular-nums text-slate-500">
                  {grupo.passos.filter(resolvido).length}/{progresso.total}
                </span>
              </div>
              <ul className="divide-y divide-slate-200/60">
                {grupo.passos.map((passo) => (
                  <li key={passo.id}>
                    {bloqueado ? (
                      <span className="flex items-center gap-3 px-1 py-2 text-sm text-slate-400">
                        <Lock size={15} aria-hidden /> {passo.titulo}
                      </span>
                    ) : (
                      <Link
                        href={`/painel/trilha/${passo.codigo}`}
                        className="flex items-center gap-3 rounded-lg px-1 py-2 text-sm text-slate-700 transition-colors hover:bg-cyan-400/[0.06] hover:text-slate-900"
                      >
                        <IconeStatus passo={passo} />
                        <span className="min-w-0 flex-1 truncate">{passo.titulo}</span>
                        {passo.documentos > 0 ? (
                          <span className="shrink-0 text-[11px] text-slate-500">{passo.documentos} arquivo(s)</span>
                        ) : null}
                        <ArrowRight size={14} className="shrink-0 text-slate-300" aria-hidden />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </>
  );
}
