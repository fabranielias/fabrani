import { query, queryOne } from "./db";
import { faixaDoConceito } from "./utils";

export type ResumoEixo = {
  eixo_id: string;
  numero: number;
  titulo: string;
  peso: number;
  total: number;
  nsa: number;
  avaliados: number;
  media: number | null;
};

export type ResumoCiclo = {
  ciclo: {
    id: string;
    titulo: string;
    finalidade: string;
    ano_referencia: number;
    escopo: string;
    status: string;
    responsavel: string | null;
    instrumento_id: string;
    instrumento_titulo: string;
    instrumento_codigo: string;
    instrumento_situacao: string;
    curso_nome: string | null;
  };
  eixos: ResumoEixo[];
  conceitoSimulado: number | null;
  faixa: number | null;
  cobertura: number;
};

export async function resumoCiclo(cicloId: string): Promise<ResumoCiclo | null> {
  const ciclo = await queryOne<ResumoCiclo["ciclo"]>(
    `select c.id, c.titulo, c.finalidade, c.ano_referencia, c.escopo, c.status, c.responsavel,
            i.id as instrumento_id, i.titulo as instrumento_titulo, i.codigo as instrumento_codigo,
            i.situacao as instrumento_situacao, cu.nome as curso_nome
       from ciclo_avaliacao c
       join instrumento i on i.id = c.instrumento_id
       left join curso cu on cu.id = c.curso_id
      where c.id = $1`,
    [cicloId],
  );
  if (!ciclo) return null;

  const eixos = await query<ResumoEixo & { media: string | null }>(
    `select e.id as eixo_id, e.numero, e.titulo, e.peso,
            count(ai.id)::int as total,
            count(*) filter (where ai.is_nsa)::int as nsa,
            count(*) filter (where not ai.is_nsa and ai.conceito_autoavaliado is not null)::int as avaliados,
            avg(ai.conceito_autoavaliado) filter (where not ai.is_nsa) as media
       from eixo e
       join indicador ind on ind.eixo_id = e.id
       join avaliacao_indicador ai on ai.indicador_id = ind.id and ai.ciclo_id = $1
      where e.instrumento_id = $2
      group by e.id, e.numero, e.titulo, e.peso
      order by e.numero`,
    [cicloId, ciclo.instrumento_id],
  );

  const normalizados: ResumoEixo[] = eixos.map((e) => ({
    ...e,
    peso: Number(e.peso),
    media: e.media === null ? null : Number(e.media),
  }));

  const comMedia = normalizados.filter((e) => e.media !== null);
  const somaPesos = comMedia.reduce((acc, e) => acc + e.peso, 0);
  const conceitoSimulado =
    somaPesos > 0 ? comMedia.reduce((acc, e) => acc + (e.media as number) * e.peso, 0) / somaPesos : null;

  const aplicaveis = normalizados.reduce((acc, e) => acc + (e.total - e.nsa), 0);
  const avaliados = normalizados.reduce((acc, e) => acc + e.avaliados, 0);

  return {
    ciclo,
    eixos: normalizados,
    conceitoSimulado,
    faixa: faixaDoConceito(conceitoSimulado),
    cobertura: aplicaveis === 0 ? 0 : (avaliados / aplicaveis) * 100,
  };
}

export type Lacuna = {
  avaliacao_id: string;
  ciclo_id: string;
  ciclo_titulo: string;
  codigo: string;
  titulo: string;
  eixo_numero: number;
  peso: number;
  conceito_autoavaliado: number | null;
  conceito_meta: number;
  impacto: number;
};

export async function lacunas(cicloId?: string, limite = 20): Promise<Lacuna[]> {
  const linhas = await query<Lacuna & { peso: string; impacto: string }>(
    `select ai.id as avaliacao_id, c.id as ciclo_id, c.titulo as ciclo_titulo,
            ind.codigo, ind.titulo, e.numero as eixo_numero, e.peso,
            ai.conceito_autoavaliado, ai.conceito_meta,
            e.peso * (ai.conceito_meta - coalesce(ai.conceito_autoavaliado, 0)) as impacto
       from avaliacao_indicador ai
       join indicador ind on ind.id = ai.indicador_id
       join eixo e on e.id = ind.eixo_id
       join ciclo_avaliacao c on c.id = ai.ciclo_id
      where not ai.is_nsa
        and coalesce(ai.conceito_autoavaliado, 0) < ai.conceito_meta
        and ($1::uuid is null or ai.ciclo_id = $1::uuid)
        and c.status = 'ABERTO'
      order by impacto desc, e.numero, ind.ordem
      limit ${limite}`,
    [cicloId ?? null],
  );
  return linhas.map((l) => ({ ...l, peso: Number(l.peso), impacto: Number(l.impacto) }));
}
