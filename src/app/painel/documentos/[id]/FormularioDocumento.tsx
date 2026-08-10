"use client";

import { useActionState } from "react";
import { atualizarDocumentoAction } from "../acoes";
import { paraInputDate, rotularEnum } from "@/lib/utils";

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400";

type Documento = {
  id: string;
  nome_exibicao: string | null;
  titulo: string;
  categoria: string | null;
  pasta: string | null;
  tags: string[] | null;
  descricao: string | null;
  status: string;
  valido_de: string | null;
  valido_ate: string | null;
  curso_id: string | null;
  polo_id: string | null;
};

export function FormularioDocumento({
  documento,
  categorias,
  cursos,
  polos,
  somenteLeitura,
}: {
  documento: Documento;
  categorias: string[];
  cursos: { id: string; rotulo: string }[];
  polos: { id: string; rotulo: string }[];
  somenteLeitura: boolean;
}) {
  const [erro, acao, pendente] = useActionState(atualizarDocumentoAction, null);

  return (
    <form action={acao} className="space-y-4">
      <input type="hidden" name="id" value={documento.id} />

      <fieldset disabled={somenteLeitura || pendente} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="doc-nome" className="block text-xs font-medium text-slate-700">
            Nome do documento <span className="text-rose-600">*</span>
          </label>
          <input
            id="doc-nome"
            name="nome_exibicao"
            required
            defaultValue={documento.nome_exibicao ?? documento.titulo}
            className={INPUT}
          />
          <p className="mt-1 text-[11px] text-slate-500">
            É este nome que aparece no acervo e no dossiê de visita — o nome do arquivo original fica preservado.
          </p>
        </div>

        <div>
          <label htmlFor="doc-categoria" className="block text-xs font-medium text-slate-700">
            Categoria
          </label>
          <select id="doc-categoria" name="categoria" defaultValue={documento.categoria ?? ""} className={INPUT}>
            <option value="">—</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {rotularEnum(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-pasta" className="block text-xs font-medium text-slate-700">
            Pasta
          </label>
          <input id="doc-pasta" name="pasta" defaultValue={documento.pasta ?? ""} placeholder="ex.: CPA/2026" className={INPUT} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="doc-tags" className="block text-xs font-medium text-slate-700">
            Etiquetas
          </label>
          <input
            id="doc-tags"
            name="tags"
            defaultValue={(documento.tags ?? []).join(", ")}
            placeholder="separe por vírgula"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="doc-status" className="block text-xs font-medium text-slate-700">
            Situação
          </label>
          <select id="doc-status" name="status" defaultValue={documento.status} className={INPUT}>
            <option value="RASCUNHO">Rascunho</option>
            <option value="EM_APROVACAO">Em aprovação</option>
            <option value="VIGENTE">Vigente</option>
            <option value="SUPERADO">Superado</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="doc-de" className="block text-xs font-medium text-slate-700">
              Válido de
            </label>
            <input id="doc-de" type="date" name="valido_de" defaultValue={paraInputDate(documento.valido_de)} className={INPUT} />
          </div>
          <div>
            <label htmlFor="doc-ate" className="block text-xs font-medium text-slate-700">
              Válido até
            </label>
            <input id="doc-ate" type="date" name="valido_ate" defaultValue={paraInputDate(documento.valido_ate)} className={INPUT} />
          </div>
        </div>

        <div>
          <label htmlFor="doc-curso" className="block text-xs font-medium text-slate-700">
            Curso
          </label>
          <select id="doc-curso" name="curso_id" defaultValue={documento.curso_id ?? ""} className={INPUT}>
            <option value="">—</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="doc-polo" className="block text-xs font-medium text-slate-700">
            Polo
          </label>
          <select id="doc-polo" name="polo_id" defaultValue={documento.polo_id ?? ""} className={INPUT}>
            <option value="">—</option>
            {polos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="doc-descricao" className="block text-xs font-medium text-slate-700">
            Descrição
          </label>
          <textarea id="doc-descricao" name="descricao" rows={3} defaultValue={documento.descricao ?? ""} className={INPUT} />
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
        className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)] transition-all hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.85)] active:scale-[0.99] disabled:opacity-60"
      >
        {pendente ? "Salvando…" : "Salvar alterações"}
      </button>
      {somenteLeitura ? (
        <span className="ml-3 text-xs text-slate-500">Seu papel tem acesso somente de leitura.</span>
      ) : null}
    </form>
  );
}
