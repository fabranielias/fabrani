"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { excluirRegistroAction } from "@/app/actions";

export function ExcluirRegistro({
  slug,
  id,
  titulo,
  dependencias,
}: {
  slug: string;
  id: string;
  titulo: string;
  dependencias: { tabela: string; total: number }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [erro, acao, pendente] = useActionState(excluirRegistroAction, null);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700"
      >
        <Trash2 size={13} aria-hidden /> excluir registro
      </button>
    );
  }

  return (
    <form action={acao} className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
      <input type="hidden" name="__entidade" value={slug} />
      <input type="hidden" name="__id" value={id} />
      <input type="hidden" name="__titulo" value={titulo} />

      {dependencias.length > 0 ? (
        <p className="text-xs leading-relaxed text-rose-800">
          Este registro está referenciado por{" "}
          {dependencias.map((d) => `${d.total} em ${d.tabela}`).join(", ")}. A exclusão será recusada enquanto essas
          ligações existirem — prefira desativar o registro.
        </p>
      ) : (
        <p className="text-xs leading-relaxed text-rose-800">
          A exclusão é definitiva. O conteúdo anterior fica guardado na auditoria. Para confirmar, digite exatamente o
          nome do registro.
        </p>
      )}

      <div>
        <label htmlFor="conf-registro" className="block text-xs font-medium text-rose-900">
          Nome do registro
        </label>
        <input
          id="conf-registro"
          name="confirmacao"
          required
          placeholder={titulo}
          className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>

      {erro ? (
        <p role="alert" className="text-xs text-rose-700">
          {erro}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={pendente}
          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-60"
        >
          {pendente ? "Excluindo…" : "Excluir definitivamente"}
        </button>
        <button type="button" onClick={() => setAberto(false)} className="text-xs text-slate-600 hover:text-slate-900">
          cancelar
        </button>
      </div>
    </form>
  );
}
