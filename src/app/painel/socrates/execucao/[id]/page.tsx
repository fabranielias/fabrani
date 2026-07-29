import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { sessaoAtual } from "@/lib/session";
import { Badge, Botao, Card, TituloPagina, Vazio } from "@/components/ui";
import { aplicarExecucaoAction, descartarExecucaoAction } from "../../acoes";

export const dynamic = "force-dynamic";

type Execucao = {
  id: string;
  pedido: string;
  resumo: string | null;
  status: string;
  tokens: number;
  criado_em: string;
};

type Acao = {
  id: string;
  ordem: number;
  ferramenta: string;
  alvo_tipo: string;
  alvo_id: string | null;
  descricao: string;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
  fontes: { norma: string; rotulo: string }[] | null;
  status: string;
  erro: string | null;
};

function formatar(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (typeof valor === "object") return JSON.stringify(valor, null, 2);
  return String(valor);
}

/** Campos que a ação vai escrever, sem o envelope da ferramenta. */
function camposDepois(acao: Acao): Record<string, unknown> {
  const depois = acao.depois ?? {};
  const dados = depois["dados"];
  if (dados && typeof dados === "object") return dados as Record<string, unknown>;
  const copia: Record<string, unknown> = { ...depois };
  delete copia.ferramenta;
  delete copia.descricao;
  return copia;
}

export default async function ExecucaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sessao = await sessaoAtual();
  const execucao = await queryOne<Execucao>(
    `select id, pedido, resumo, status, tokens, to_char(criado_em, 'DD/MM/YYYY HH24:MI') as criado_em
       from socrates_execucao where id = $1`,
    [id],
  );
  if (!execucao) notFound();

  const acoes = await query<Acao>(
    `select id, ordem, ferramenta, alvo_tipo, alvo_id, descricao, antes, depois, fontes, status, erro
       from socrates_acao where execucao_id = $1 order by ordem`,
    [id],
  );

  const propostas = acoes.filter((a) => a.status === "PROPOSTA");
  const podeAplicar = sessao?.papel !== "AUDITOR" && sessao?.papel !== "DOCENTE" && propostas.length > 0;

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo="Plano do Sócrates"
        descricao={execucao.pedido}
        acao={<Botao href="/painel/socrates" variante="secundario">Voltar</Botao>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Badge tom={execucao.status === "APLICADA" ? "ok" : execucao.status === "ERRO" ? "risco" : "info"}>
          {execucao.status}
        </Badge>
        <Badge>{acoes.length} ação(ões)</Badge>
        <Badge>{execucao.tokens.toLocaleString("pt-BR")} tokens</Badge>
        <Badge>{execucao.criado_em}</Badge>
      </div>

      {execucao.resumo ? (
        <Card>
          <p className="text-sm leading-relaxed text-slate-700">{execucao.resumo}</p>
        </Card>
      ) : null}

      {acoes.length === 0 ? (
        <Vazio
          titulo="O Sócrates não propôs nenhuma ação"
          descricao="Reescreva o pedido indicando o registro ou o ciclo a ser preenchido."
        />
      ) : (
        <form action={aplicarExecucaoAction} className="space-y-4">
          <input type="hidden" name="execucao_id" value={execucao.id} />

          {acoes.map((acao) => {
            const campos = camposDepois(acao);
            return (
              <Card key={acao.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {acao.status === "PROPOSTA" ? (
                      <input
                        type="checkbox"
                        name="acao_id"
                        value={acao.id}
                        defaultChecked
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                    ) : null}
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {acao.ordem}. {acao.descricao}
                      </p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                        {acao.ferramenta} · {acao.alvo_tipo}
                      </p>
                    </div>
                  </div>
                  <Badge
                    tom={
                      acao.status === "ACEITA"
                        ? "ok"
                        : acao.status === "ERRO"
                          ? "risco"
                          : acao.status === "DESCARTADA"
                            ? "neutro"
                            : "info"
                    }
                  >
                    {acao.status}
                  </Badge>
                </div>

                {acao.erro ? <p className="mt-2 text-xs text-rose-700">{acao.erro}</p> : null}

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                        <th className="px-2 py-1.5">Campo</th>
                        <th className="px-2 py-1.5">Antes</th>
                        <th className="px-2 py-1.5">Depois</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {Object.entries(campos).map(([campo, valor]) => (
                        <tr key={campo}>
                          <td className="px-2 py-1.5 font-medium text-slate-700">{campo}</td>
                          <td className="whitespace-pre-wrap px-2 py-1.5 text-slate-500">
                            {formatar(acao.antes?.[campo])}
                          </td>
                          <td className="whitespace-pre-wrap px-2 py-1.5 text-slate-900">{formatar(valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {acao.fontes && acao.fontes.length > 0 ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Base normativa consultada: {acao.fontes.map((f) => `${f.norma}, ${f.rotulo}`).join(" · ")}
                  </p>
                ) : null}
              </Card>
            );
          })}

          {podeAplicar ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700"
              >
                Aplicar selecionadas
              </button>
              <button
                type="submit"
                formAction={descartarExecucaoAction}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Descartar plano
              </button>
            </div>
          ) : null}
        </form>
      )}

      <p className="text-xs text-slate-500">
        Aplicar grava rascunhos versionados e registra tudo na auditoria com origem SOCRATES. Nenhuma ação protocola
        processo em e-MEC, Censup ou Enade.
      </p>
    </div>
  );
}
