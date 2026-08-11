"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { vincularDocumentoAction } from "../acoes";

type Grupo = { tipo: string; rotulo: string; opcoes: { id: string; rotulo: string }[] };

export function SeletorVinculo({
  documentoId,
  grupos,
  desabilitado,
}: {
  documentoId: string;
  grupos: Grupo[];
  desabilitado: boolean;
}) {
  const [tipo, setTipo] = useState(grupos[0]?.tipo ?? "");
  const grupo = grupos.find((g) => g.tipo === tipo);

  if (grupos.length === 0) {
    return <p className="text-xs text-slate-500">Nenhum registro disponível para vincular ainda.</p>;
  }

  return (
    <form action={vincularDocumentoAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]">
      <input type="hidden" name="documento_id" value={documentoId} />
      <select
        name="alvo_tipo"
        value={tipo}
        onChange={(e) => setTipo(e.target.value)}
        disabled={desabilitado}
        aria-label="Tipo de registro"
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
      >
        {grupos.map((g) => (
          <option key={g.tipo} value={g.tipo}>
            {g.rotulo}
          </option>
        ))}
      </select>
      <select
        name="alvo_id"
        required
        disabled={desabilitado}
        aria-label="Registro"
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
      >
        {(grupo?.opcoes ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={desabilitado}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-cyan-400 hover:text-slate-900 disabled:opacity-60"
      >
        <Link2 size={14} aria-hidden /> Vincular
      </button>
    </form>
  );
}
