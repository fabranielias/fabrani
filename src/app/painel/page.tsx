import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CalendarClock, FileWarning, Radar } from "lucide-react";
import { Badge, Barra, Card, CardTitulo, Celula, Metrica, Tabela, TituloPagina, Vazio } from "@/components/ui";
import { query, queryOne } from "@/lib/db";
import { lacunas } from "@/lib/avaliacao";
import { diasAte, formatarConceito, formatarData, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

type LinhaPrazo = {
  id: string;
  titulo: string;
  categoria: string;
  data_limite: string;
  base_legal: string | null;
  status: string;
};

export default async function PainelPage() {
  const ies = await queryOne<{ nome: string; ci: string | null; ci_ano: number | null; igc: string | null }>(
    "select nome, ci, ci_ano, igc from ies order by criado_em limit 1",
  );

  const cursos = await query<{
    id: string;
    nome: string;
    cc: string | null;
    cc_ano: number | null;
    cpc: string | null;
    formato_oferta: string | null;
    regime_ead_12456: string | null;
    enade_sem_area: boolean;
  }>("select id, nome, cc, cc_ano, cpc, formato_oferta, regime_ead_12456, enade_sem_area from curso order by nome");

  const prazos = await query<LinhaPrazo>(
    `select id, titulo, categoria, data_limite, base_legal, status from prazo
      where status <> 'CONCLUIDO' order by data_limite asc limit 8`,
  );

  const atos = await query<{
    id: string;
    tipo: string;
    numero_ato: string | null;
    vigencia_fim: string | null;
    prorrogado: boolean;
  }>("select id, tipo, numero_ato, vigencia_fim, prorrogado from ato_regulatorio order by vigencia_fim nulls first limit 6");

  const topLacunas = await lacunas(undefined, 8);

  const contagens = await queryOne<{
    docs_pendentes: string;
    docs_vencidos: string;
    polos_inadequados: string;
    supervisao_ativa: string;
    censo_abertos: string;
    indicadores_sem_conceito: string;
  }>(
    `select
       (select count(*) from documento where status <> 'VIGENTE')::text as docs_pendentes,
       (select count(*) from documento where valido_ate is not null and valido_ate < current_date)::text as docs_vencidos,
       (select count(*) from polo where coalesce(adequacao_12456_status,'NAO_INICIADA') <> 'ADEQUADO')::text as polos_inadequados,
       (select count(*) from supervisao_ocorrencia where situacao <> 'ENCERRADA')::text as supervisao_ativa,
       (select count(*) from censo_modulo where status <> 'FECHADO')::text as censo_abertos,
       (select count(*) from avaliacao_indicador ai join ciclo_avaliacao c on c.id = ai.ciclo_id
         where not ai.is_nsa and ai.conceito_autoavaliado is null and c.status = 'ABERTO')::text as indicadores_sem_conceito`,
  );

  const normas = await query<{ id: string; especie: string; numero: string | null; ano: number | null; ementa: string; data_publicacao: string | null }>(
    "select id, especie, numero, ano, ementa, data_publicacao from norma order by data_publicacao desc nulls last limit 5",
  );

  const ciclos = await query<{ id: string; titulo: string; instrumento_codigo: string }>(
    `select c.id, c.titulo, i.codigo as instrumento_codigo from ciclo_avaliacao c
      join instrumento i on i.id = c.instrumento_id where c.status = 'ABERTO' order by c.ano_referencia desc`,
  );

  return (
    <>
      <TituloPagina
        titulo="Painel executivo"
        descricao={`${ies?.nome ?? "IES não cadastrada"} — situação regulatória, conceitos, prazos e lacunas de indicadores em uma tela.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica
          rotulo="Conceito Institucional (CI)"
          valor={formatarConceito(ies?.ci ?? null)}
          detalhe={ies?.ci_ano ? `Referência ${ies.ci_ano}` : "Ano não informado"}
          tom={Number(ies?.ci ?? 0) >= 4 ? "ok" : "atencao"}
        />
        <Metrica
          rotulo="Indicadores sem conceito"
          valor={contagens?.indicadores_sem_conceito ?? "0"}
          detalhe="Autoavaliação em aberto"
          tom={Number(contagens?.indicadores_sem_conceito ?? 0) > 0 ? "atencao" : "ok"}
        />
        <Metrica
          rotulo="Documentos pendentes"
          valor={contagens?.docs_pendentes ?? "0"}
          detalhe={`${contagens?.docs_vencidos ?? 0} vencido(s)`}
          tom={Number(contagens?.docs_vencidos ?? 0) > 0 ? "risco" : "neutro"}
        />
        <Metrica
          rotulo="Módulos do Censo em aberto"
          valor={contagens?.censo_abertos ?? "0"}
          detalhe="Fechar todos evita inativação no Censup"
          tom={Number(contagens?.censo_abertos ?? 0) > 0 ? "atencao" : "ok"}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitulo
            titulo="Prazos e obrigações"
            descricao="Calendário unificado: regulação, ENADE, Censo, CPA e adequação EaD."
            acao={
              <Link href="/painel/dados/prazo" className="text-xs font-medium text-slate-600 hover:text-slate-900">
                ver todos <ArrowUpRight size={12} className="inline" />
              </Link>
            }
          />
          {prazos.length === 0 ? (
            <Vazio titulo="Nenhum prazo cadastrado" descricao="Cadastre as obrigações para acompanhar a contagem regressiva." />
          ) : (
            <Tabela cabecalho={["Obrigação", "Categoria", "Data limite", "Faltam", "Base legal"]}>
              {prazos.map((p) => {
                const dias = diasAte(p.data_limite);
                const tom = dias === null ? "neutro" : dias < 0 ? "risco" : dias < 60 ? "atencao" : "ok";
                return (
                  <tr key={p.id}>
                    <Celula className="font-medium text-slate-900">{p.titulo}</Celula>
                    <Celula>
                      <Badge>{rotularEnum(p.categoria)}</Badge>
                    </Celula>
                    <Celula className="tabular-nums">{formatarData(p.data_limite)}</Celula>
                    <Celula>
                      <Badge tom={tom}>{dias === null ? "—" : dias < 0 ? `${Math.abs(dias)} d em atraso` : `${dias} dias`}</Badge>
                    </Celula>
                    <Celula className="text-xs text-slate-500">{p.base_legal ?? "—"}</Celula>
                  </tr>
                );
              })}
            </Tabela>
          )}
        </Card>

        <Card>
          <CardTitulo titulo="Conceitos por curso" descricao="CC, CPC e enquadramento no ENADE." />
          <ul className="space-y-3">
            {cursos.map((c) => (
              <li key={c.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{c.nome}</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <Badge tom={Number(c.cc ?? 0) >= 4 ? "ok" : "atencao"}>CC {formatarConceito(c.cc)}</Badge>
                  <Badge>CPC {formatarConceito(c.cpc)}</Badge>
                  <Badge tom="info">{rotularEnum(c.formato_oferta)}</Badge>
                  {c.enade_sem_area ? <Badge tom="atencao">ENADE sem área</Badge> : null}
                </div>
                {c.regime_ead_12456 === "TRANSICAO_ATE_19_05_2027" ? (
                  <p className="mt-2 text-[11px] text-slate-500">
                    Adequação ao Decreto 12.456/2025 até 19/05/2027 — faltam {diasAte("2027-05-19")} dias.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitulo
            titulo="Lacunas por impacto ponderado"
            descricao="peso do eixo × (meta − conceito atual). Resolver os primeiros move mais o conceito final."
          />
          {topLacunas.length === 0 ? (
            <Vazio
              titulo="Nenhuma lacuna calculada"
              descricao="Lance os conceitos da autoavaliação para que o sistema priorize o que falta para o 5."
            />
          ) : (
            <ul className="space-y-2.5">
              {topLacunas.map((l) => (
                <li key={l.avaliacao_id}>
                  <Link
                    href={`/painel/avaliacao/${l.ciclo_id}/indicador/${l.avaliacao_id}`}
                    className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-800">
                        <span className="font-mono text-xs text-slate-500">{l.codigo}</span> {l.titulo}
                      </p>
                      <div className="mt-1">
                        <Barra valor={l.conceito_autoavaliado ?? 0} max={5} tom={(l.conceito_autoavaliado ?? 0) >= 3 ? "atencao" : "risco"} />
                      </div>
                    </div>
                    <Badge tom="risco">impacto {l.impacto.toFixed(0)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardTitulo titulo="Situação regulatória" descricao="Atos autorizativos e vigência." />
            {atos.length === 0 ? (
              <Vazio titulo="Nenhum ato cadastrado" />
            ) : (
              <ul className="space-y-2 text-sm">
                {atos.map((a) => {
                  const dias = diasAte(a.vigencia_fim);
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3">
                      <span className="text-slate-800">
                        {rotularEnum(a.tipo)} {a.numero_ato ? `nº ${a.numero_ato}` : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        {a.prorrogado ? <Badge tom="info">prorrogado</Badge> : null}
                        <Badge tom={dias === null ? "atencao" : dias < 180 ? "risco" : "ok"}>
                          {a.vigencia_fim ? formatarData(a.vigencia_fim) : "vigência a conferir"}
                        </Badge>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardTitulo titulo="Alertas" />
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <Radar size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                {contagens?.polos_inadequados ?? 0} polo(s) ainda não concluíram a adequação ao Decreto nº 12.456/2025.
              </li>
              <li className="flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 shrink-0 text-rose-600" aria-hidden />
                {contagens?.supervisao_ativa ?? 0} ocorrência(s) de supervisão em aberto — enquanto ativas, suspendem prazos
                regulatórios.
              </li>
              <li className="flex items-start gap-2">
                <FileWarning size={15} className="mt-0.5 shrink-0 text-slate-500" aria-hidden />
                {contagens?.docs_vencidos ?? 0} evidência(s) com validade expirada reabrem lacunas de indicadores.
              </li>
              <li className="flex items-start gap-2">
                <CalendarClock size={15} className="mt-0.5 shrink-0 text-indigo-600" aria-hidden />
                {ciclos.length} ciclo(s) de autoavaliação em aberto.
              </li>
            </ul>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitulo
            titulo="Ciclos de avaliação em aberto"
            acao={
              <Link href="/painel/avaliacao" className="text-xs font-medium text-slate-600 hover:text-slate-900">
                abrir <ArrowUpRight size={12} className="inline" />
              </Link>
            }
          />
          <ul className="space-y-2">
            {ciclos.map((c) => (
              <li key={c.id}>
                <Link href={`/painel/avaliacao/${c.id}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                  <span className="text-slate-800">{c.titulo}</span>
                  <Badge tom="info">{c.instrumento_codigo}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardTitulo
            titulo="Novidades normativas"
            acao={
              <Link href="/painel/dados/norma" className="text-xs font-medium text-slate-600 hover:text-slate-900">
                LegalOne <ArrowUpRight size={12} className="inline" />
              </Link>
            }
          />
          <ul className="space-y-2.5">
            {normas.map((n) => (
              <li key={n.id} className="text-sm">
                <p className="font-medium text-slate-900">
                  {rotularEnum(n.especie)} nº {n.numero}/{n.ano}
                  <span className="ml-2 text-xs font-normal text-slate-500">{formatarData(n.data_publicacao)}</span>
                </p>
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-600">{n.ementa}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
