import { Badge, Card, CardTitulo, Celula, Tabela, TituloPagina } from "@/components/ui";
import { query } from "@/lib/db";
import { formatarData, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InstrumentosPage() {
  const instrumentos = await query<{
    id: string;
    codigo: string;
    titulo: string;
    tipo: string;
    versao: string;
    situacao: string;
    vigencia_inicio: string | null;
    fonte: string | null;
    observacao: string | null;
    eixos: string;
    indicadores: string;
    verbatim: string;
  }>(
    `select i.id, i.codigo, i.titulo, i.tipo, i.versao, i.situacao, i.vigencia_inicio, i.fonte, i.observacao,
            (select count(*) from eixo e where e.instrumento_id = i.id)::text as eixos,
            (select count(*) from indicador ind join eixo e on e.id = ind.eixo_id where e.instrumento_id = i.id)::text as indicadores,
            (select count(*) from criterio_conceito cc
               join indicador ind on ind.id = cc.indicador_id
               join eixo e on e.id = ind.eixo_id
              where e.instrumento_id = i.id and cc.origem = 'VERBATIM')::text as verbatim
       from instrumento i order by i.tipo, i.codigo`,
  );

  return (
    <>
      <TituloPagina
        titulo="Instrumentos de avaliação"
        descricao="Os instrumentos são dados versionados, não código. Quando o INEP publicar uma nova versão, basta importar o catálogo — os ciclos antigos continuam apontando para a versão que os avaliou."
      />

      <Card padding={false}>
        <div className="px-2 py-1">
          <Tabela cabecalho={["Código", "Instrumento", "Tipo", "Versão", "Eixos", "Indicadores", "Texto oficial", "Situação"]}>
            {instrumentos.map((i) => (
              <tr key={i.id}>
                <Celula className="font-mono text-xs">{i.codigo}</Celula>
                <Celula>
                  <p className="text-slate-900">{i.titulo}</p>
                  {i.fonte ? <p className="text-[11px] text-slate-500">{i.fonte}</p> : null}
                  {i.observacao ? <p className="mt-0.5 text-[11px] text-amber-700">{i.observacao}</p> : null}
                </Celula>
                <Celula>
                  <Badge>{rotularEnum(i.tipo)}</Badge>
                </Celula>
                <Celula className="text-xs">
                  {i.versao}
                  {i.vigencia_inicio ? <span className="block text-slate-400">{formatarData(i.vigencia_inicio)}</span> : null}
                </Celula>
                <Celula className="tabular-nums">{i.eixos}</Celula>
                <Celula className="tabular-nums">{i.indicadores}</Celula>
                <Celula>
                  <Badge tom={Number(i.verbatim) > 0 ? "ok" : "atencao"}>
                    {Number(i.verbatim) > 0 ? `${i.verbatim} critérios verbatim` : "critérios padrão"}
                  </Badge>
                </Celula>
                <Celula>
                  <Badge tom={i.situacao === "VIGENTE" ? "ok" : i.situacao === "PROPOSTA" ? "atencao" : "neutro"}>
                    {rotularEnum(i.situacao)}
                  </Badge>
                </Celula>
              </tr>
            ))}
          </Tabela>
        </div>
      </Card>

      <Card className="mt-4">
        <CardTitulo
          titulo="Como manter os instrumentos fiéis ao INEP"
          descricao="Regra do sistema: nenhum texto oficial é inventado."
        />
        <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
          <li>
            Critérios marcados como <strong>padrão</strong> são redações provisórias de escala — servem para operar a
            autoavaliação, mas não substituem o instrumento.
          </li>
          <li>
            Ao publicar/obter o PDF oficial, gere o JSON em <code className="font-mono text-xs">catalog/instrumentos/</code> com
            <code className="font-mono text-xs"> origem: &quot;VERBATIM&quot;</code> e rode o seed: o catálogo é reimportado por código.
          </li>
          <li>Ciclos já encerrados preservam o instrumento e os pesos usados no cálculo.</li>
        </ol>
      </Card>
    </>
  );
}
