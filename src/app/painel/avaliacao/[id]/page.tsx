import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Barra, Card, CardTitulo, Celula, Metrica, Tabela, TituloPagina } from "@/components/ui";
import { query } from "@/lib/db";
import { resumoCiclo } from "@/lib/avaliacao";
import { formatarConceito, rotularEnum } from "@/lib/utils";
import { parecerBancaAction } from "@/app/painel/socrates/acoes";

export const dynamic = "force-dynamic";

type LinhaIndicador = {
  avaliacao_id: string;
  codigo: string;
  titulo: string;
  eixo_numero: number;
  eixo_titulo: string;
  conceito_autoavaliado: number | null;
  conceito_meta: number;
  conceito_inep: number | null;
  is_nsa: boolean;
  status: string;
  responsavel: string | null;
  evidencias: number;
};

export default async function CicloPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resumo = await resumoCiclo(id);
  if (!resumo) notFound();

  const indicadores = await query<LinhaIndicador & { evidencias: string }>(
    `select ai.id as avaliacao_id, ind.codigo, ind.titulo, e.numero as eixo_numero, e.titulo as eixo_titulo,
            ai.conceito_autoavaliado, ai.conceito_meta, ai.conceito_inep, ai.is_nsa, ai.status, ai.responsavel,
            (select count(*) from evidencia_vinculo v where v.avaliacao_indicador_id = ai.id)::text as evidencias
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join eixo e on e.id = ind.eixo_id
      where ai.ciclo_id = $1
      order by e.numero, ind.ordem, ind.codigo`,
    [id],
  );

  return (
    <>
      <TituloPagina
        titulo={resumo.ciclo.titulo}
        descricao={`${resumo.ciclo.instrumento_titulo} · ${rotularEnum(resumo.ciclo.finalidade)} · ${resumo.ciclo.ano_referencia}`}
        acao={
          <div className="flex gap-2">
            <form action={parecerBancaAction}>
              <input type="hidden" name="ciclo_id" value={id} />
              <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                Parecer de banca (Sócrates)
              </button>
            </form>
            <Link
              href={`/painel/avaliacao/${id}/requisitos-legais`}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Requisitos legais
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          rotulo="Conceito simulado"
          valor={formatarConceito(resumo.conceitoSimulado)}
          detalhe={`Faixa ${resumo.faixa ?? "—"}`}
          tom={(resumo.faixa ?? 0) >= 4 ? "ok" : "atencao"}
        />
        <Metrica rotulo="Cobertura da autoavaliação" valor={`${resumo.cobertura.toFixed(0)}%`} />
        <Metrica rotulo="Indicadores" valor={indicadores.length} detalhe={`${indicadores.filter((i) => i.is_nsa).length} NSA`} />
        <Metrica
          rotulo="Sem evidência"
          valor={indicadores.filter((i) => Number(i.evidencias) === 0 && !i.is_nsa).length}
          detalhe="Conceito sem lastro documental"
          tom="atencao"
        />
      </div>

      <Card className="mt-4">
        <CardTitulo
          titulo="Conceito por eixo"
          descricao="Média aritmética dos indicadores aplicáveis (NSA fora do denominador), ponderada pelo peso do eixo."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {resumo.eixos.map((e) => (
            <div key={e.eixo_id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-medium text-slate-500">
                Eixo {e.numero} · peso {e.peso}%
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-900">{e.titulo}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{formatarConceito(e.media)}</p>
              <div className="mt-2">
                <Barra valor={e.media ?? 0} max={5} tom={(e.media ?? 0) >= 4 ? "ok" : (e.media ?? 0) >= 3 ? "atencao" : "risco"} />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                {e.avaliados}/{e.total - e.nsa} avaliados · {e.nsa} NSA
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-4" padding={false}>
        <div className="border-b border-slate-200 px-5 py-4">
          <CardTitulo
            titulo="Indicadores"
            descricao="Clique para ver o critério de cada conceito, lançar a nota, o plano de ação e anexar evidências."
          />
        </div>
        <div className="px-2 py-1">
          <Tabela cabecalho={["Cód.", "Indicador", "Atual", "Meta", "INEP", "Evid.", "Status", ""]}>
            {indicadores.map((i) => (
              <tr key={i.avaliacao_id} className="hover:bg-slate-50">
                <Celula className="font-mono text-xs text-slate-500">{i.codigo}</Celula>
                <Celula>
                  <span className="text-slate-900">{i.titulo}</span>
                  <span className="ml-2 text-[11px] text-slate-400">Eixo {i.eixo_numero}</span>
                </Celula>
                <Celula className="tabular-nums">
                  {i.is_nsa ? <Badge>NSA</Badge> : (i.conceito_autoavaliado ?? "—")}
                </Celula>
                <Celula className="tabular-nums">{i.conceito_meta}</Celula>
                <Celula className="tabular-nums">{i.conceito_inep ?? "—"}</Celula>
                <Celula>
                  <Badge tom={Number(i.evidencias) > 0 ? "ok" : "atencao"}>{i.evidencias}</Badge>
                </Celula>
                <Celula>
                  <Badge tom={i.status === "CONCLUIDO" ? "ok" : i.status === "EM_ANDAMENTO" ? "info" : "neutro"}>
                    {rotularEnum(i.status)}
                  </Badge>
                </Celula>
                <Celula className="text-right">
                  <Link
                    href={`/painel/avaliacao/${id}/indicador/${i.avaliacao_id}`}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    abrir
                  </Link>
                </Celula>
              </tr>
            ))}
          </Tabela>
        </div>
      </Card>
    </>
  );
}
