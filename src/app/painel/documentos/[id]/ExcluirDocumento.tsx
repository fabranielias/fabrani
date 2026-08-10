"use client";

import { useActionState, useState } from "react";
import { Trash2 } from "lucide-react";
import { excluirDocumentoAction } from "../acoes";

export function ExcluirDocumento({ id, nome }: { id: string; nome: string }) {
  const [aberto, setAberto] = useState(false);
  const [erro, acao, pendente] = useActionState(excluirDocumentoAction, null);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-700"
      >
        <Trash2 size={13} aria-hidden /> excluir documento
      </button>
    );
  }

  return (
    <form action={acao} className="space-y-3 rounded-xl border border-rose-200 bg-rose-50/60 p-4">
      <input type="hidden" name="id" value={id} />
      <p className="text-xs leading-relaxed text-rose-800">
        A exclusão remove o documento do acervo e de todos os vínculos de evidência. O registro e o motivo ficam na
        auditoria. Para confirmar, digite exatamente o nome do documento.
      </p>
      <div>
        <label htmlFor="excluir-confirmacao" className="block text-xs font-medium text-rose-900">
          Nome do documento
        </label>
        <input
          id="excluir-confirmacao"
          name="confirmacao"
          required
          placeholder={nome}
          className="mt-1 w-full rounded-lg border border-rose-300 bg-white px-3 py-2 text-sm text-slate-900"
        />
      </div>
      <div>
        <label htmlFor="excluir-motivo" className="block text-xs font-medium text-rose-900">
          Motivo da exclusão
        </label>
        <textarea
          id="excluir-motivo"
          name="justificativa"
          rows={2}
          required
          minLength={10}
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
