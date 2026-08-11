import Link from "next/link";
import { ArrowRight, ClipboardList, ListChecks } from "lucide-react";
import { Barra } from "@/components/ui";
import { calcularProgresso, listarPassos, proximoPendente } from "@/lib/trilha";

/**
 * Aviso persistente do painel: some quando a trilha chega a 100% e volta sozinho
 * se o instrumento gerar passos novos.
 */
export async function AvisoTrilha() {
  const passos = await listarPassos();
  if (passos.length === 0) return null;

  const progresso = calcularProgresso(passos);
  if (progresso.pendentes === 0 && progresso.vencidos === 0) return null;

  const proximo = proximoPendente(passos);

  return (
    <section className="entrada fio-neon mb-6 rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-400/[0.08] to-violet-500/[0.06] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="fonte-display flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ListChecks size={16} className="text-cyan-500" aria-hidden />
            O dossiê regulatório está {progresso.percentual}% preenchido
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Faltam {progresso.pendentes} itens
            {progresso.vencidos > 0 ? ` e há ${progresso.vencidos} com evidência vencida` : ""}.
            {proximo ? ` Próximo passo: ${proximo.titulo}.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={proximo ? `/painel/trilha/${proximo.codigo}` : "/painel/trilha"}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)]"
          >
            Continuar preenchimento <ArrowRight size={15} aria-hidden />
          </Link>
          <Link
            href="/painel/trilha/checklist"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white/40 px-4 py-2 text-sm text-slate-800 hover:border-cyan-400/50"
          >
            <ClipboardList size={15} aria-hidden /> Ver checklist
          </Link>
        </div>
      </div>
      <div className="mt-4">
        <Barra valor={progresso.percentual} />
      </div>
    </section>
  );
}
