"use client";

import { useActionState } from "react";
import { planejarAction } from "./acoes";

const EXEMPLOS = [
  "Preencha a análise dos indicadores do eixo 1 do ciclo institucional 2026",
  "Gere a ata da CPA de agosto sobre os resultados da pesquisa com discentes",
  "Cadastre o polo de Ribeirão Preto com responsável a definir",
  "Abra as pendências do fechamento do Censo com prazo e responsável",
];

export function CaixaPedido({ habilitado }: { habilitado: boolean }) {
  const [estado, acao, pendente] = useActionState(planejarAction, null);

  return (
    <form action={acao} className="space-y-3">
      <textarea
        name="pedido"
        rows={3}
        required
        disabled={!habilitado || pendente}
        placeholder="preencha…"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
      />
      <div className="flex flex-wrap gap-1.5">
        {EXEMPLOS.map((e) => (
          <span key={e} className="rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
            {e}
          </span>
        ))}
      </div>
      {estado?.erro ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {estado.erro}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!habilitado || pendente}
        className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)] transition-all hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.85)] active:scale-[0.99] px-4 py-2.5 text-sm font-medium disabled:opacity-60"
      >
        {pendente ? "Montando o plano…" : "Montar plano"}
      </button>
      <p className="text-[11px] text-slate-500">
        Nada é gravado agora: o Sócrates monta o plano, você revisa o diff e decide o que aceitar.
      </p>
    </form>
  );
}
