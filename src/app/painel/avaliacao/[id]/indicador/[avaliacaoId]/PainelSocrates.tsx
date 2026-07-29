"use client";

import { useActionState } from "react";
import { analisarIndicadorAction, aplicarTextoIndicadorAction } from "@/app/painel/socrates/acoes";

export function PainelSocrates({ avaliacaoId }: { avaliacaoId: string }) {
  const [estado, acao, pendente] = useActionState(analisarIndicadorAction, null);
  const analise = estado?.analise;

  return (
    <div className="space-y-3">
      <form action={acao}>
        <input type="hidden" name="avaliacao_indicador_id" value={avaliacaoId} />
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {pendente ? "Analisando como banca…" : "Pedir análise ao Sócrates"}
        </button>
      </form>

      {estado?.erro ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          {estado.erro}
        </p>
      ) : null}

      {analise ? (
        <div className="space-y-3 text-xs">
          <p className="text-[11px] text-slate-500">
            {analise.doCache ? "Resposta reaproveitada do cache (custo zero)." : "Análise nova."} Conceito simulado:{" "}
            <strong>{analise.conceitoSimulado ?? "—"}</strong> — simulação interna, não é resultado do INEP.
          </p>

          <div className="rounded-lg bg-slate-50 px-3 py-2.5 leading-relaxed text-slate-700 ring-1 ring-slate-200">
            {analise.diagnostico}
          </div>

          {analise.evidenciasFaltantes.length > 0 ? (
            <ul className="list-disc space-y-1 pl-4 text-slate-600">
              {analise.evidenciasFaltantes.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}

          <form action={aplicarTextoIndicadorAction} className="space-y-2">
            <input type="hidden" name="avaliacao_indicador_id" value={avaliacaoId} />
            <label className="block text-[11px] font-medium text-slate-700">Análise sugerida</label>
            <textarea
              name="analise"
              rows={8}
              defaultValue={analise.textoSugerido}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-900"
            />
            <label className="block text-[11px] font-medium text-slate-700">Plano de ação sugerido</label>
            <textarea
              name="plano_acao"
              rows={4}
              defaultValue={analise.planoSugerido}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-900"
            />
            <button className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-700">
              Aceitar e gravar no indicador
            </button>
          </form>

          {analise.fontes.length > 0 ? (
            <p className="text-[11px] text-slate-500">
              Base normativa: {analise.fontes.map((f) => `${f.norma}, ${f.rotulo}`).join(" · ")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
