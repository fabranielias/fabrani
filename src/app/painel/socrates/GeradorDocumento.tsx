"use client";

import Link from "next/link";
import { useActionState } from "react";
import { gerarDocumentoAction } from "./acoes";

export function GeradorDocumento({
  habilitado,
  modelos,
  colegiados,
}: {
  habilitado: boolean;
  modelos: { tipo: string; titulo: string }[];
  colegiados: { id: string; nome: string; tipo: string }[];
}) {
  const [estado, acao, pendente] = useActionState(gerarDocumentoAction, null);

  return (
    <form action={acao} className="space-y-3">
      <select
        name="tipo"
        required
        disabled={!habilitado}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
      >
        {modelos.map((m) => (
          <option key={m.tipo} value={m.tipo}>
            {m.titulo}
          </option>
        ))}
      </select>
      <select
        name="colegiado_id"
        disabled={!habilitado}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
      >
        <option value="">Colegiado (opcional)</option>
        {colegiados.map((c) => (
          <option key={c.id} value={c.id}>
            {c.tipo} — {c.nome}
          </option>
        ))}
      </select>
      <textarea
        name="contexto"
        rows={3}
        required
        disabled={!habilitado}
        placeholder="Data, pauta e deliberações; ou o assunto do ofício."
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
      />
      <button
        type="submit"
        disabled={!habilitado || pendente}
        className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
      >
        {pendente ? "Redigindo…" : "Gerar rascunho"}
      </button>
      {estado?.erro ? (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          {estado.erro}
        </p>
      ) : null}
      {estado?.documentoId ? (
        <p className="text-xs text-emerald-700">
          Rascunho criado no acervo.{" "}
          <Link href={`/painel/documentos/${estado.documentoId}`} className="underline">
            Abrir documento
          </Link>
        </p>
      ) : null}
    </form>
  );
}
