"use client";

import { useActionState, useState } from "react";
import { salvarIndicadorAction } from "@/app/actions";
import { paraInputDate } from "@/lib/utils";

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";

export type AvaliacaoForm = {
  id: string;
  conceito_autoavaliado: number | null;
  conceito_meta: number;
  conceito_inep: number | null;
  is_nsa: boolean;
  justificativa_nsa: string | null;
  analise: string | null;
  plano_acao: string | null;
  responsavel: string | null;
  prazo: string | null;
  status: string;
};

export function FormularioIndicador({ avaliacao }: { avaliacao: AvaliacaoForm }) {
  const [erro, acao, pendente] = useActionState(salvarIndicadorAction, null);
  const [nsa, setNsa] = useState(avaliacao.is_nsa);
  const [conceito, setConceito] = useState<number | null>(avaliacao.conceito_autoavaliado);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={avaliacao.id} />
      <input type="hidden" name="is_nsa" value={String(nsa)} />

      <div>
        <span className="block text-xs font-medium text-slate-700">Conceito autoavaliado</span>
        <div className="mt-1.5 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={nsa}
              onClick={() => setConceito(n)}
              aria-pressed={conceito === n}
              className={`h-10 w-10 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 ${
                conceito === n
                  ? "border-cyan-400/50 bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-50 shadow-[0_0_18px_-4px_rgba(34,211,238,0.9)]"
                  : "border-slate-300 bg-white/40 text-slate-700 hover:border-cyan-400/40 hover:text-slate-900"
              }`}
            >
              {n}
            </button>
          ))}
          <label className="ml-3 flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={nsa}
              onChange={(e) => {
                setNsa(e.target.checked);
                if (e.target.checked) setConceito(null);
              }}
              className="h-4 w-4 rounded border-slate-300"
            />
            NSA (não se aplica)
          </label>
        </div>
        <input type="hidden" name="conceito_autoavaliado" value={nsa || conceito === null ? "" : String(conceito)} />
      </div>

      {nsa ? (
        <div>
          <label htmlFor="justificativa_nsa" className="block text-xs font-medium text-slate-700">
            Justificativa do NSA
          </label>
          <textarea
            id="justificativa_nsa"
            name="justificativa_nsa"
            rows={2}
            defaultValue={avaliacao.justificativa_nsa ?? ""}
            className={INPUT}
          />
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="conceito_meta" className="block text-xs font-medium text-slate-700">
            Meta
          </label>
          <input
            id="conceito_meta"
            name="conceito_meta"
            type="number"
            min={1}
            max={5}
            defaultValue={avaliacao.conceito_meta}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="conceito_inep" className="block text-xs font-medium text-slate-700">
            Conceito INEP (histórico)
          </label>
          <input
            id="conceito_inep"
            name="conceito_inep"
            type="number"
            min={1}
            max={5}
            defaultValue={avaliacao.conceito_inep ?? ""}
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="status" className="block text-xs font-medium text-slate-700">
            Status
          </label>
          <select id="status" name="status" defaultValue={avaliacao.status} className={INPUT}>
            <option value="NAO_INICIADO">Não iniciado</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="CONCLUIDO">Concluído</option>
            <option value="BLOQUEADO">Bloqueado</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="analise" className="block text-xs font-medium text-slate-700">
          Análise / justificativa do conceito
        </label>
        <textarea id="analise" name="analise" rows={4} defaultValue={avaliacao.analise ?? ""} className={INPUT} />
      </div>

      <div>
        <label htmlFor="plano_acao" className="block text-xs font-medium text-slate-700">
          Plano de ação para alcançar a meta
        </label>
        <textarea id="plano_acao" name="plano_acao" rows={4} defaultValue={avaliacao.plano_acao ?? ""} className={INPUT} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="responsavel" className="block text-xs font-medium text-slate-700">
            Responsável
          </label>
          <input id="responsavel" name="responsavel" defaultValue={avaliacao.responsavel ?? ""} className={INPUT} />
        </div>
        <div>
          <label htmlFor="prazo" className="block text-xs font-medium text-slate-700">
            Prazo
          </label>
          <input id="prazo" name="prazo" type="date" defaultValue={paraInputDate(avaliacao.prazo)} className={INPUT} />
        </div>
      </div>

      {erro ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pendente}
        className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)] transition-all hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.85)] active:scale-[0.99] px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {pendente ? "Salvando…" : "Salvar avaliação"}
      </button>
    </form>
  );
}
