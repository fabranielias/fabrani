"use client";

import { useActionState } from "react";
import Link from "next/link";
import { salvarRegistroAction } from "@/app/actions";
import type { Campo, Entidade } from "@/lib/registry";
import { paraInputDate, rotularEnum } from "@/lib/utils";

type OpcoesRef = Record<string, { id: string; rotulo: string }[]>;

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-900";

function valorInicial(campo: Campo, registro?: Record<string, unknown>): string {
  const bruto = registro?.[campo.nome];
  if (bruto === null || bruto === undefined) return "";
  if (campo.tipo === "date") return paraInputDate(bruto);
  if (campo.tipo === "tags") return Array.isArray(bruto) ? bruto.join(", ") : String(bruto);
  return String(bruto);
}

function CampoInput({
  campo,
  registro,
  opcoes,
}: {
  campo: Campo;
  registro?: Record<string, unknown>;
  opcoes: OpcoesRef;
}) {
  const id = `campo-${campo.nome}`;
  const valor = valorInicial(campo, registro);

  return (
    <div className={campo.largura === "full" || campo.tipo === "textarea" ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className="block text-xs font-medium text-slate-700">
        {campo.rotulo}
        {campo.obrigatorio ? <span className="ml-1 text-rose-600">*</span> : null}
      </label>

      {campo.tipo === "textarea" ? (
        <textarea id={id} name={campo.nome} defaultValue={valor} rows={3} className={INPUT} />
      ) : campo.tipo === "select" ? (
        <select id={id} name={campo.nome} defaultValue={valor} className={INPUT}>
          <option value="">—</option>
          {(campo.opcoes ?? []).map((o) => (
            <option key={o} value={o}>
              {rotularEnum(o)}
            </option>
          ))}
        </select>
      ) : campo.tipo === "boolean" ? (
        <select id={id} name={campo.nome} defaultValue={valor === "true" ? "true" : "false"} className={INPUT}>
          <option value="false">Não</option>
          <option value="true">Sim</option>
        </select>
      ) : campo.tipo === "ref" ? (
        <select id={id} name={campo.nome} defaultValue={valor} className={INPUT}>
          <option value="">—</option>
          {(opcoes[campo.nome] ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={campo.nome}
          defaultValue={valor}
          required={campo.obrigatorio}
          type={campo.tipo === "date" ? "date" : campo.tipo === "number" || campo.tipo === "decimal" ? "number" : "text"}
          step={campo.tipo === "decimal" ? "0.01" : undefined}
          className={INPUT}
        />
      )}

      {campo.ajuda ? <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{campo.ajuda}</p> : null}
    </div>
  );
}

export function FormularioEntidade({
  entidade,
  registro,
  opcoes,
  somenteLeitura = false,
}: {
  entidade: Entidade;
  registro?: Record<string, unknown>;
  opcoes: OpcoesRef;
  somenteLeitura?: boolean;
}) {
  const [erro, acao, pendente] = useActionState(salvarRegistroAction, null);
  const id = registro?.id ? String(registro.id) : "";

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="__entidade" value={entidade.slug} />
      <input type="hidden" name="__id" value={id} />

      <fieldset disabled={somenteLeitura || pendente} className="grid gap-4 sm:grid-cols-2">
        {entidade.campos.map((campo) => (
          <CampoInput key={campo.nome} campo={campo} registro={registro} opcoes={opcoes} />
        ))}
      </fieldset>

      {erro ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={somenteLeitura || pendente}
          className="rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)] transition-all hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.85)] active:scale-[0.99] px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {pendente ? "Salvando…" : id ? "Salvar alterações" : `Criar ${entidade.rotuloSingular.toLowerCase()}`}
        </button>
        <Link
          href={`/painel/dados/${entidade.slug}`}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          Voltar
        </Link>
        {somenteLeitura ? <span className="text-xs text-slate-500">Seu papel tem acesso somente de leitura.</span> : null}
      </div>
    </form>
  );
}
