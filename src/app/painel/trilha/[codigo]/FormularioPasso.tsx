"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, MinusCircle, RotateCcw } from "lucide-react";
import { salvarPassoAction } from "../acoes";
import type { Campo } from "@/lib/registry";
import { paraInputDate, rotularEnum } from "@/lib/utils";

type OpcoesRef = Record<string, { id: string; rotulo: string }[]>;

const INPUT =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-400";

function valorInicial(campo: Campo, registro?: Record<string, unknown>): string {
  const bruto = registro?.[campo.nome];
  if (bruto === null || bruto === undefined) return "";
  if (campo.tipo === "date") return paraInputDate(bruto);
  if (campo.tipo === "tags") return Array.isArray(bruto) ? bruto.join(", ") : String(bruto);
  return String(bruto);
}

function CampoPasso({ campo, registro, opcoes }: { campo: Campo; registro?: Record<string, unknown>; opcoes: OpcoesRef }) {
  const id = `passo-${campo.nome}`;
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

export function FormularioPasso({
  codigo,
  campos,
  registro,
  opcoes,
  aceitaNsa,
  jaRespondido,
  observacaoAtual,
  hrefAnterior,
  somenteLeitura = false,
}: {
  codigo: string;
  campos: Campo[];
  registro?: Record<string, unknown>;
  opcoes: OpcoesRef;
  aceitaNsa: boolean;
  jaRespondido: boolean;
  observacaoAtual: string | null;
  hrefAnterior: string;
  somenteLeitura?: boolean;
}) {
  const [erro, acao, pendente] = useActionState(salvarPassoAction, null);
  const [tipoAcao, setTipoAcao] = useState("salvar");
  const [confirmandoNaoHa, setConfirmandoNaoHa] = useState(false);

  return (
    <form action={acao} className="space-y-5">
      <input type="hidden" name="__codigo" value={codigo} />
      <input type="hidden" name="__acao" value={tipoAcao} />

      {campos.length > 0 ? (
        <fieldset disabled={somenteLeitura || pendente} className="grid gap-4 sm:grid-cols-2">
          {campos.map((campo) => (
            <CampoPasso key={campo.nome} campo={campo} registro={registro} opcoes={opcoes} />
          ))}
        </fieldset>
      ) : null}

      <div>
        <label htmlFor="observacao" className="block text-xs font-medium text-slate-700">
          Observação {confirmandoNaoHa ? "(por que não há este documento?)" : "(opcional)"}
        </label>
        <textarea
          id="observacao"
          name="observacao"
          rows={2}
          defaultValue={observacaoAtual ?? ""}
          placeholder={
            confirmandoNaoHa
              ? "ex.: documento em elaboração pela direção, previsão de conclusão em março"
              : "onde está descrito no PDI, número da ata, referência do documento…"
          }
          className={INPUT}
        />
      </div>

      {erro ? (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 ring-1 ring-rose-200">
          {erro}
        </p>
      ) : null}

      {confirmandoNaoHa ? (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-medium">Marcar como “não há”?</p>
          <p className="mt-1 text-xs leading-relaxed">
            O passo é registrado como pendência no relatório de checklist, com seu nome e a data — a trilha segue para o
            próximo item.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={pendente}
              onClick={() => setTipoAcao("nao_ha")}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
            >
              Confirmar e avançar
            </button>
            <button
              type="button"
              onClick={() => setConfirmandoNaoHa(false)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs text-amber-800"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={hrefAnterior}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft size={15} aria-hidden /> Voltar
        </Link>

        {!confirmandoNaoHa ? (
          <button
            type="button"
            disabled={somenteLeitura || pendente}
            onClick={() => setConfirmandoNaoHa(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <MinusCircle size={15} aria-hidden /> Não há
          </button>
        ) : null}

        {aceitaNsa ? (
          <button
            type="submit"
            disabled={somenteLeitura || pendente}
            onClick={() => setTipoAcao("nsa")}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            title="Não se aplica — exige justificativa na observação"
          >
            Não se aplica (NSA)
          </button>
        ) : null}

        {jaRespondido ? (
          <button
            type="submit"
            disabled={somenteLeitura || pendente}
            onClick={() => setTipoAcao("reabrir")}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw size={15} aria-hidden /> Reabrir
          </button>
        ) : null}

        <button
          type="submit"
          disabled={somenteLeitura || pendente}
          onClick={() => setTipoAcao("salvar")}
          className="ml-auto inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.75)] transition-all hover:shadow-[0_0_28px_-4px_rgba(168,85,247,0.85)] active:scale-[0.99] disabled:opacity-60"
        >
          {pendente ? "Salvando…" : "Salvar e avançar"} <ArrowRight size={15} aria-hidden />
        </button>
      </div>

      {somenteLeitura ? <p className="text-xs text-slate-500">Seu papel tem acesso somente de leitura.</p> : null}
    </form>
  );
}
