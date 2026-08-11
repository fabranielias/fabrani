"use client";

import { vincularEvidenciaAction } from "@/app/actions";

export function VincularEvidencia({
  avaliacaoId,
  documentos,
  requisitos,
}: {
  avaliacaoId: string;
  documentos: { id: string; titulo: string }[];
  requisitos: { id: string; descricao: string }[];
}) {
  if (documentos.length === 0) {
    return <p className="mt-3 text-xs text-slate-500">Envie documentos no acervo para poder vinculá-los aqui.</p>;
  }

  return (
    <form action={vincularEvidenciaAction} className="mt-4 space-y-2 border-t border-slate-200 pt-3">
      <input type="hidden" name="avaliacao_indicador_id" value={avaliacaoId} />
      <label htmlFor="documento_id" className="block text-xs font-medium text-slate-700">
        Vincular documento como evidência
      </label>
      <select
        id="documento_id"
        name="documento_id"
        required
        className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-900"
      >
        {documentos.map((d) => (
          <option key={d.id} value={d.id}>
            {d.titulo}
          </option>
        ))}
      </select>
      {requisitos.length > 0 ? (
        <select
          name="requisito_evidencia_id"
          aria-label="Requisito atendido"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-slate-900"
        >
          <option value="">Requisito atendido (opcional)</option>
          {requisitos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.descricao}
            </option>
          ))}
        </select>
      ) : null}
      <button type="submit" className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
        Vincular
      </button>
    </form>
  );
}
