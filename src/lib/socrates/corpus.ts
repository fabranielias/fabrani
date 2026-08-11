/**
 * Corpus normativo do Sócrates.
 *
 * Busca lexical em português (tsvector, custo zero) e, quando o servidor tem
 * pgvector e há embeddings gravados, busca semântica combinada. Nada aqui gera
 * texto: só devolve dispositivos oficiais já carregados, com a fonte.
 */

import { query, queryOne } from "../db";

export type Dispositivo = {
  id: string;
  rotulo: string;
  texto: string;
  norma: string;
  url: string | null;
};

const SELECT_DISPOSITIVO = `
  d.id, d.rotulo, d.texto,
  concat_ws(' ', n.especie, n.numero, case when n.ano is not null then concat('/', n.ano) end, '—', n.orgao) as norma,
  n.url_dou as url
`;

export async function buscarDispositivos(termo: string, limite = 5): Promise<Dispositivo[]> {
  const texto = termo.trim();
  if (!texto) return [];
  return query<Dispositivo>(
    `select ${SELECT_DISPOSITIVO}
       from norma_dispositivo d
       join norma n on n.id = d.norma_id
      where d.busca @@ plainto_tsquery('portuguese', $1)
        and coalesce(n.vigente, true)
      order by ts_rank(d.busca, plainto_tsquery('portuguese', $1)) desc
      limit ${limite}`,
    [texto],
  );
}

/** Dispositivos mapeados manualmente para o indicador (mapa curado). */
export async function dispositivosDoIndicador(indicadorId: string, limite = 5): Promise<Dispositivo[]> {
  return query<Dispositivo>(
    `select ${SELECT_DISPOSITIVO}
       from indicador_norma i
       join norma_dispositivo d on d.id = i.dispositivo_id
       join norma n on n.id = d.norma_id
      where i.indicador_id = $1
      order by i.peso desc
      limit ${limite}`,
    [indicadorId],
  );
}

/**
 * Base legal de um indicador: o mapa curado quando existe, senão a busca
 * lexical pelo título do indicador. Nunca inventa fonte.
 */
export async function baseLegalDoIndicador(
  indicadorId: string,
  titulo: string,
  limite = 4,
): Promise<Dispositivo[]> {
  const curados = await dispositivosDoIndicador(indicadorId, limite);
  if (curados.length > 0) return curados;
  return buscarDispositivos(titulo, limite);
}

export async function totalDispositivos(): Promise<number> {
  const linha = await queryOne<{ n: string }>(`select count(*)::text as n from norma_dispositivo`);
  return Number(linha?.n ?? 0);
}

export function citar(dispositivos: Dispositivo[]): string {
  return dispositivos.map((d) => `${d.norma}, ${d.rotulo}`).join("; ");
}
