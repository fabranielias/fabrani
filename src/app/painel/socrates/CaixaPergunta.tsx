"use client";

import { useActionState } from "react";
import { perguntarAction } from "./acoes";

export function CaixaPergunta() {
  const [estado, acao, pendente] = useActionState(perguntarAction, null);

  return (
    <form action={acao} className="space-y-3">
      <textarea
        name="pergunta"
        rows={2}
        required
        placeholder="Quando devo protocolar a renovação de reconhecimento?"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
      <button
        type="submit"
        disabled={pendente}
        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {pendente ? "Consultando…" : "Perguntar"}
      </button>
      {estado?.erro ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          {estado.erro}
        </p>
      ) : null}
      {estado?.resposta ? (
        <div className="whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-700 ring-1 ring-slate-200">
          {estado.resposta}
        </div>
      ) : null}
    </form>
  );
}
