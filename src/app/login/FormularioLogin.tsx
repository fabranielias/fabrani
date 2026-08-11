"use client";

import { useActionState } from "react";
import { entrarAction } from "@/app/actions";

export function FormularioLogin() {
  const [erro, acao, pendente] = useActionState(entrarAction, null);

  return (
    <form action={acao} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="block text-xs font-medium text-slate-700">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </div>
      <div>
        <label htmlFor="senha" className="block text-xs font-medium text-slate-700">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
        />
      </div>

      {erro ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pendente}
        className="w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2.5 text-sm font-medium text-slate-50 shadow-[0_0_22px_-6px_rgba(34,211,238,0.8)] transition-all hover:shadow-[0_0_30px_-4px_rgba(168,85,247,0.85)] active:scale-[0.99] disabled:opacity-60"
      >
        {pendente ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
