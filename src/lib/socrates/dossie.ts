/**
 * Ponto único de busca do Sócrates no dossiê da FABRANI.
 *
 * O acervo já é um repositório: documento (com tsvector de título, categoria,
 * pasta e tags), vínculo polimórfico e trilha guiada com o que a instituição
 * declarou possuir ou não. Esta busca combina as três fontes numa lista curta,
 * sempre com a referência do registro — nada é inferido.
 */

import { query } from "../db";

export type AchadoDossie = {
  origem: "DOCUMENTO" | "TRILHA" | "DADO";
  titulo: string;
  detalhe: string;
  href: string;
};

async function documentos(termo: string, limite: number): Promise<AchadoDossie[]> {
  const linhas = await query<{
    id: string;
    nome: string;
    categoria: string | null;
    status: string;
    valido_ate: string | null;
    vinculos: string;
  }>(
    `select d.id, coalesce(d.nome_exibicao, d.titulo) as nome, d.categoria, d.status,
            to_char(d.valido_ate, 'DD/MM/YYYY') as valido_ate,
            (select string_agg(distinct v.alvo_tipo, ', ') from evidencia_vinculo v where v.documento_id = d.id) as vinculos
       from documento d
      where d.excluido_em is null
        and (d.busca @@ plainto_tsquery('portuguese', $1) or coalesce(d.nome_exibicao, d.titulo) ilike $2)
      order by ts_rank(d.busca, plainto_tsquery('portuguese', $1)) desc, d.criado_em desc
      limit ${limite}`,
    [termo, `%${termo}%`],
  );
  return linhas.map((l) => ({
    origem: "DOCUMENTO" as const,
    titulo: l.nome,
    detalhe: [
      l.categoria ? `categoria ${l.categoria}` : null,
      `situação ${l.status}`,
      l.valido_ate ? `válido até ${l.valido_ate}` : null,
      l.vinculos ? `vinculado a ${l.vinculos}` : "sem vínculo",
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/painel/documentos/${l.id}`,
  }));
}

async function passos(termo: string, limite: number): Promise<AchadoDossie[]> {
  const linhas = await query<{
    codigo: string;
    titulo: string;
    secao: string;
    base_legal: string | null;
    status: string | null;
    observacao: string | null;
  }>(
    `select p.codigo, p.titulo, p.secao, p.base_legal, r.status, r.observacao
       from trilha_passo p
       left join trilha_resposta r on r.passo_id = p.id
      where p.ativo and (p.titulo ilike $1 or p.secao ilike $1 or coalesce(p.explicacao,'') ilike $1)
      order by p.ordem
      limit ${limite}`,
    [`%${termo}%`],
  );
  return linhas.map((l) => ({
    origem: "TRILHA" as const,
    titulo: l.titulo,
    detalhe: [
      l.secao,
      l.status === "CONCLUIDO"
        ? "entregue"
        : l.status === "NAO_HA"
          ? "a instituição declarou não possuir"
          : l.status === "NSA"
            ? "não se aplica"
            : "ainda não preenchido",
      l.observacao,
      l.base_legal,
    ]
      .filter(Boolean)
      .join(" · "),
    href: `/painel/trilha/${l.codigo}`,
  }));
}

export async function buscarNoDossie(pergunta: string, limite = 6): Promise<AchadoDossie[]> {
  const termo = pergunta.trim();
  if (!termo) return [];
  const [docs, trilha] = await Promise.all([documentos(termo, limite), passos(termo, limite)]);
  return [...docs, ...trilha].slice(0, limite * 2);
}

/** Bloco de contexto para o prompt — sempre com o caminho de onde o dado saiu. */
export function blocoDossie(achados: AchadoDossie[]): string {
  if (achados.length === 0) {
    return "Nada encontrado no dossiê da FABRANI para este tema (nem documento no acervo, nem passo da trilha).";
  }
  return achados.map((a) => `[${a.origem}] ${a.titulo} — ${a.detalhe} (${a.href})`).join("\n");
}
