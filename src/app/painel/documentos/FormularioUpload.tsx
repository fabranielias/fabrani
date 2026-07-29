"use client";

import { useActionState } from "react";
import { enviarDocumentoAction } from "./acoes";

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";

export function FormularioUpload({
  cursos,
  polos,
  documentos,
  categorias,
  somenteLeitura,
  storageAtivo,
}: {
  cursos: { id: string; nome: string }[];
  polos: { id: string; nome: string }[];
  documentos: { id: string; titulo: string }[];
  categorias: string[];
  somenteLeitura: boolean;
  storageAtivo: boolean;
}) {
  const [erro, acao, pendente] = useActionState(enviarDocumentoAction, null);

  return (
    <form action={acao} className="space-y-4">
      {!storageAtivo ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          Supabase Storage ainda não configurado: os metadados e o hash SHA-256 são registrados, mas o binário não é
          armazenado. Configure as chaves para habilitar o arquivo.
        </p>
      ) : null}

      <fieldset disabled={somenteLeitura || pendente} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="titulo" className="block text-xs font-medium text-slate-700">
            Título <span className="text-rose-600">*</span>
          </label>
          <input id="titulo" name="titulo" required className={INPUT} />
        </div>

        <div>
          <label htmlFor="arquivo" className="block text-xs font-medium text-slate-700">
            Arquivo (até 25 MB) <span className="text-rose-600">*</span>
          </label>
          <input id="arquivo" name="arquivo" type="file" required className={INPUT} />
        </div>

        <div>
          <label htmlFor="categoria" className="block text-xs font-medium text-slate-700">
            Categoria
          </label>
          <select id="categoria" name="categoria" className={INPUT}>
            <option value="">—</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="curso_id" className="block text-xs font-medium text-slate-700">
            Curso
          </label>
          <select id="curso_id" name="curso_id" className={INPUT}>
            <option value="">— institucional —</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="polo_id" className="block text-xs font-medium text-slate-700">
            Polo
          </label>
          <select id="polo_id" name="polo_id" className={INPUT}>
            <option value="">—</option>
            {polos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="documento_pai_id" className="block text-xs font-medium text-slate-700">
            Nova versão de
          </label>
          <select id="documento_pai_id" name="documento_pai_id" className={INPUT}>
            <option value="">— documento novo —</option>
            {documentos.map((d) => (
              <option key={d.id} value={d.id}>
                {d.titulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-xs font-medium text-slate-700">
            Status
          </label>
          <select id="status" name="status" defaultValue="VIGENTE" className={INPUT}>
            <option value="RASCUNHO">Rascunho</option>
            <option value="EM_APROVACAO">Em aprovação</option>
            <option value="VIGENTE">Vigente</option>
            <option value="SUPERADO">Superado</option>
          </select>
        </div>

        <div>
          <label htmlFor="valido_de" className="block text-xs font-medium text-slate-700">
            Válido de
          </label>
          <input id="valido_de" name="valido_de" type="date" className={INPUT} />
        </div>

        <div>
          <label htmlFor="valido_ate" className="block text-xs font-medium text-slate-700">
            Válido até
          </label>
          <input id="valido_ate" name="valido_ate" type="date" className={INPUT} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="descricao" className="block text-xs font-medium text-slate-700">
            Descrição
          </label>
          <textarea id="descricao" name="descricao" rows={2} className={INPUT} />
        </div>
      </fieldset>

      {erro ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={somenteLeitura || pendente}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {pendente ? "Enviando…" : "Enviar documento"}
      </button>
    </form>
  );
}
