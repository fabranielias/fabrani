import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, CardTitulo, TituloPagina } from "@/components/ui";
import { FormularioIndicador } from "./FormularioIndicador";
import { VincularEvidencia } from "./VincularEvidencia";
import { PainelSocrates } from "./PainelSocrates";
import { query, queryOne } from "@/lib/db";
import { regrasDoAlvo } from "@/lib/socrates/regras";
import { baseLegalDoIndicador } from "@/lib/socrates/corpus";
import { formatarData } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Avaliacao = {
  id: string;
  ciclo_id: string;
  indicador_id: string;
  conceito_autoavaliado: number | null;
  conceito_meta: number;
  conceito_inep: number | null;
  is_nsa: boolean;
  justificativa_nsa: string | null;
  analise: string | null;
  plano_acao: string | null;
  responsavel: string | null;
  prazo: string | null;
  status: string;
  codigo: string;
  titulo: string;
  texto_base: string | null;
  critico_ead: boolean;
  eixo_numero: number;
  eixo_titulo: string;
  ciclo_titulo: string;
};

export default async function IndicadorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; avaliacaoId: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { id, avaliacaoId } = await params;
  const { salvo } = await searchParams;

  const av = await queryOne<Avaliacao>(
    `select ai.id, ai.ciclo_id, ai.indicador_id, ai.conceito_autoavaliado, ai.conceito_meta, ai.conceito_inep,
            ai.is_nsa, ai.justificativa_nsa, ai.analise, ai.plano_acao, ai.responsavel, ai.prazo, ai.status,
            ind.codigo, ind.titulo, ind.texto_base, ind.critico_ead,
            e.numero as eixo_numero, e.titulo as eixo_titulo, c.titulo as ciclo_titulo
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join eixo e on e.id = ind.eixo_id
       join ciclo_avaliacao c on c.id = ai.ciclo_id
      where ai.id = $1 and ai.ciclo_id = $2`,
    [avaliacaoId, id],
  );
  if (!av) notFound();

  const criterios = await query<{ conceito: number; texto: string; origem: string }>(
    "select conceito, texto, origem from criterio_conceito where indicador_id = $1 order by conceito",
    [av.indicador_id],
  );

  const requisitos = await query<{ id: string; titulo: string; obrigatorio: boolean }>(
    "select id, titulo, obrigatorio from requisito_evidencia where indicador_id = $1 order by titulo",
    [av.indicador_id],
  );

  const evidencias = await query<{
    vinculo_id: string;
    documento_id: string;
    titulo: string;
    status: string;
    valido_ate: string | null;
  }>(
    `select v.id as vinculo_id, d.id as documento_id, d.titulo, d.status, d.valido_ate
       from evidencia_vinculo v join documento d on d.id = v.documento_id
      where v.avaliacao_indicador_id = $1 order by d.titulo`,
    [avaliacaoId],
  );

  const documentos = await query<{ id: string; titulo: string }>(
    "select id, titulo from documento order by titulo limit 500",
  );

  const alertas = await regrasDoAlvo("INDICADOR", avaliacaoId);
  const baseLegal = await baseLegalDoIndicador(av.indicador_id, av.titulo);

  return (
    <>
      <TituloPagina
        titulo={`${av.codigo} — ${av.titulo}`}
        descricao={av.texto_base ?? undefined}
        acao={
          <Link href={`/painel/avaliacao/${id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Voltar ao ciclo
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        <Badge tom="info">Eixo {av.eixo_numero} · {av.eixo_titulo}</Badge>
        {av.critico_ead ? <Badge tom="atencao">crítico para EaD</Badge> : null}
      </div>

      {salvo ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
          Avaliação salva.
        </p>
      ) : null}

      {alertas.length > 0 ? (
        <Card className="mb-4 border-amber-200 bg-amber-50/50">
          <CardTitulo titulo="Sócrates aponta" descricao="Verificação determinística, sem consumo de token." />
          <ul className="space-y-1.5 text-xs">
            {alertas.map((a) => (
              <li key={a.regra} className="flex items-start gap-2">
                <Badge tom={a.severidade === "RISCO" ? "risco" : "atencao"}>{a.severidade}</Badge>
                <span className="text-slate-700">
                  <strong className="font-medium text-slate-900">{a.titulo}.</strong> {a.mensagem}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="grid gap-4 lg:col-span-3">
          <Card>
            <CardTitulo titulo="Lançamento da autoavaliação" />
            <FormularioIndicador avaliacao={av} />
          </Card>

          <Card>
            <CardTitulo
              titulo="Sócrates"
              descricao="Análise como banca avaliadora, com redação pronta para revisão. Consome tokens apenas quando solicitado."
            />
            <PainelSocrates avaliacaoId={avaliacaoId} />
          </Card>

          {baseLegal.length > 0 ? (
            <Card>
              <CardTitulo titulo="Base normativa do indicador" />
              <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
                {baseLegal.map((d) => (
                  <li key={d.id}>
                    <span className="font-medium text-slate-900">
                      {d.norma}, {d.rotulo}
                    </span>
                    <p className="text-slate-600">{d.texto}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        <div className="grid gap-4 lg:col-span-2">
          <Card>
            <CardTitulo
              titulo="Escala do indicador"
              descricao="Critério de cada conceito. O que estiver marcado como padrão ainda não foi substituído pelo texto oficial do instrumento."
            />
            <ol className="space-y-2">
              {criterios.map((c) => (
                <li
                  key={c.conceito}
                  className={`rounded-lg border p-2.5 text-xs leading-relaxed ${
                    c.conceito === av.conceito_autoavaliado
                      ? "border-slate-900 bg-slate-50"
                      : c.conceito === 5
                        ? "border-emerald-200 bg-emerald-50/40"
                        : "border-slate-200"
                  }`}
                >
                  <p className="mb-1 flex items-center gap-2 font-semibold text-slate-800">
                    Conceito {c.conceito}
                    {c.origem !== "VERBATIM" ? <Badge tom="atencao">texto padrão</Badge> : null}
                  </p>
                  <p className="text-slate-600">{c.texto}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <CardTitulo titulo="Evidências exigidas" descricao="Checklist do que a comissão espera encontrar." />
            <ul className="space-y-1.5 text-xs text-slate-700">
              {requisitos.length === 0 ? <li className="text-slate-500">Nenhum requisito cadastrado.</li> : null}
              {requisitos.map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <span className={r.obrigatorio ? "text-rose-600" : "text-slate-400"}>•</span>
                  {r.titulo}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitulo titulo="Evidências vinculadas" />
            {evidencias.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum documento vinculado a este indicador.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {evidencias.map((e) => (
                  <li key={e.vinculo_id} className="flex items-center justify-between gap-2">
                    <Link href={`/painel/dados/documento/${e.documento_id}`} className="text-slate-800 hover:underline">
                      {e.titulo}
                    </Link>
                    <span className="flex items-center gap-1">
                      <Badge tom={e.status === "VIGENTE" ? "ok" : "atencao"}>{e.status}</Badge>
                      {e.valido_ate ? <span className="text-[11px] text-slate-500">até {formatarData(e.valido_ate)}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <VincularEvidencia
            avaliacaoId={avaliacaoId}
            documentos={documentos}
            requisitos={requisitos.map((r) => ({ id: r.id, descricao: r.titulo }))}
          />
          </Card>
        </div>
      </div>
    </>
  );
}
