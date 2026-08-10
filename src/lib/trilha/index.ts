import { query, queryOne } from "../db";
import { registrarAuditoria } from "../crud";
import type { Sessao } from "../session";
import { BLOCO_A } from "./catalogo";

export type Bloco = "A" | "B" | "C";
export type TipoPasso = "DADOS" | "REGISTROS" | "DOCUMENTO" | "INDICADOR" | "REQUISITO_LEGAL";
export type StatusResposta = "CONCLUIDO" | "NAO_HA" | "NSA";

export type Passo = {
  id: string;
  codigo: string;
  bloco: Bloco;
  secao: string;
  ordem: number;
  tipo: TipoPasso;
  titulo: string;
  explicacao: string | null;
  base_legal: string | null;
  obrigatorio: boolean;
  aceita_nsa: boolean;
  entidade_slug: string | null;
  registro_id: string | null;
  campos: string[];
  alvo_tipo: string | null;
  alvo_id: string | null;
  categoria_documento: string | null;
  exige_validade: boolean;
  curso_id: string | null;
};

export type PassoComEstado = Passo & {
  status: StatusResposta | null;
  observacao: string | null;
  respondido_por: string | null;
  respondido_em: string | null;
  documentos: number;
  vencido: boolean;
};

export const ROTULO_BLOCO: Record<Bloco, string> = {
  A: "Bloco A · A FABRANI",
  B: "Bloco B · Instrumento institucional",
  C: "Bloco C · Cursos",
};

type Definicao = Omit<Passo, "id"> & { ativo: boolean };

function definicao(parcial: Partial<Definicao> & Pick<Definicao, "codigo" | "bloco" | "secao" | "ordem" | "tipo" | "titulo">): Definicao {
  return {
    explicacao: null,
    base_legal: null,
    obrigatorio: true,
    aceita_nsa: false,
    entidade_slug: null,
    registro_id: null,
    campos: [],
    alvo_tipo: null,
    alvo_id: null,
    categoria_documento: null,
    exige_validade: false,
    curso_id: null,
    ativo: true,
    ...parcial,
  };
}

async function definicoesBlocoA(): Promise<Definicao[]> {
  const ies = await queryOne<{ id: string }>("select id from ies order by criado_em limit 1");
  const mantenedora = await queryOne<{ id: string }>("select id from mantenedora order by criado_em limit 1");

  return BLOCO_A.map((item, indice) =>
    definicao({
      codigo: item.codigo,
      bloco: "A",
      secao: "A FABRANI — dados e documentos da instituição",
      ordem: indice + 1,
      tipo: item.tipo,
      titulo: item.titulo,
      explicacao: item.explicacao,
      base_legal: item.baseLegal ?? null,
      obrigatorio: item.obrigatorio ?? true,
      entidade_slug: item.entidade ?? null,
      registro_id:
        item.tipo === "DADOS"
          ? item.entidade === "ies"
            ? (ies?.id ?? null)
            : item.entidade === "mantenedora"
              ? (mantenedora?.id ?? null)
              : null
          : null,
      campos: item.campos ?? [],
      alvo_tipo: item.tipo === "DOCUMENTO" ? (item.categoria === "CONTRATO" && item.codigo === "A10" ? "MANTENEDORA" : "IES") : null,
      alvo_id:
        item.tipo === "DOCUMENTO"
          ? item.codigo === "A10"
            ? (mantenedora?.id ?? null)
            : (ies?.id ?? null)
          : null,
      categoria_documento: item.categoria ?? null,
      exige_validade: item.exigeValidade ?? false,
    }),
  );
}

type LinhaIndicador = {
  indicador_id: string;
  codigo: string;
  titulo: string;
  texto_base: string | null;
  nsa_policy: string;
  ordem: number;
  eixo_numero: number;
  eixo_titulo: string;
};

async function indicadoresDoInstrumento(codigoInstrumento: string): Promise<LinhaIndicador[]> {
  return query<LinhaIndicador>(
    `select i.id as indicador_id, i.codigo, i.titulo, i.texto_base, i.nsa_policy, i.ordem,
            e.numero as eixo_numero, e.titulo as eixo_titulo
       from indicador i
       join eixo e on e.id = i.eixo_id
       join instrumento n on n.id = e.instrumento_id
      where n.codigo = $1
      order by e.numero, i.ordem, i.codigo`,
    [codigoInstrumento],
  );
}

async function definicoesBlocoB(): Promise<Definicao[]> {
  const linhas = await indicadoresDoInstrumento("INSTITUCIONAL-2017");
  return linhas.map((linha, indice) =>
    definicao({
      codigo: `B-${linha.eixo_numero}-${linha.codigo}`,
      bloco: "B",
      secao: `Eixo ${linha.eixo_numero} — ${linha.eixo_titulo}`,
      ordem: indice + 1,
      tipo: "INDICADOR",
      titulo: `${linha.codigo} · ${linha.titulo}`,
      explicacao: linha.texto_base,
      base_legal: "Instrumento de Avaliação Institucional Externa (recredenciamento)",
      aceita_nsa: linha.nsa_policy !== "FIXED_APPLICABLE",
      alvo_tipo: "INDICADOR",
      alvo_id: linha.indicador_id,
      categoria_documento: "OUTRO",
    }),
  );
}

async function definicoesBlocoC(): Promise<Definicao[]> {
  const cursos = await query<{ id: string; nome: string }>("select id, nome from curso order by nome");
  const linhas = await indicadoresDoInstrumento("CURSO-2017");
  const definicoes: Definicao[] = [];

  for (const curso of cursos) {
    const prefixo = `C-${curso.id.slice(0, 8)}`;
    let ordem = 0;

    definicoes.push(
      definicao({
        codigo: `${prefixo}-00`,
        bloco: "C",
        secao: `${curso.nome} · Identificação`,
        ordem: ++ordem,
        tipo: "DADOS",
        titulo: `Identificação do curso: ${curso.nome}`,
        explicacao:
          "Grau, formato de oferta, carga horária, vagas e coordenador precisam refletir o que está autorizado no e-MEC. Divergência entre o cadastro e o PPC é apontamento na Dimensão 1.",
        base_legal: "Portaria Normativa MEC nº 23/2017; CNCST 4ª edição",
        entidade_slug: "curso",
        registro_id: curso.id,
        campos: [
          "nome",
          "codigo_emec",
          "grau",
          "formato_oferta",
          "cncst_denominacao",
          "cncst_eixo_tecnologico",
          "carga_horaria_total",
          "carga_horaria_extensao",
          "prazo_integralizacao_semestres",
          "data_inicio_oferta",
          "vagas_anuais",
          "coordenador",
          "situacao",
          "regime_ead_12456",
        ],
        curso_id: curso.id,
      }),
    );

    definicoes.push(
      definicao({
        codigo: `${prefixo}-DOCENTES`,
        bloco: "C",
        secao: `${curso.nome} · Dimensão 2 — Corpo Docente e Tutorial`,
        ordem: ++ordem,
        tipo: "REGISTROS",
        titulo: `Corpo docente e tutorial de ${curso.nome}`,
        explicacao:
          "Cadastre cada docente e tutor com titulação, regime de trabalho, experiência e Lattes, anexando diploma e contrato. É desse cadastro que saem os percentuais de mestres e doutores e de regime parcial/integral que o instrumento pontua.",
        base_legal: "Instrumento de Curso, Dimensão 2; Decreto nº 12.456/2025, art. 25",
        entidade_slug: "pessoa",
        curso_id: curso.id,
      }),
    );

    for (const linha of linhas) {
      definicoes.push(
        definicao({
          codigo: `${prefixo}-${linha.eixo_numero}-${linha.codigo}`,
          bloco: "C",
          secao: `${curso.nome} · Dimensão ${linha.eixo_numero} — ${linha.eixo_titulo}`,
          ordem: ++ordem,
          tipo: "INDICADOR",
          titulo: `${linha.codigo} · ${linha.titulo}`,
          explicacao: linha.texto_base,
          base_legal: "Instrumento de Avaliação de Cursos de Graduação",
          aceita_nsa: linha.nsa_policy !== "FIXED_APPLICABLE",
          alvo_tipo: "INDICADOR",
          alvo_id: linha.indicador_id,
          categoria_documento: "OUTRO",
          curso_id: curso.id,
        }),
      );
    }

    definicoes.push(
      definicao({
        codigo: `${prefixo}-RL`,
        bloco: "C",
        secao: `${curso.nome} · Requisitos legais e normativos`,
        ordem: ++ordem,
        tipo: "REQUISITO_LEGAL",
        titulo: `Requisitos legais de ${curso.nome}`,
        explicacao:
          "São itens de atendimento obrigatório: não recebem conceito, mas o descumprimento de qualquer um deles é registrado no relatório da comissão e pode inviabilizar o reconhecimento.",
        base_legal: "Instrumento de Curso — requisitos legais e normativos",
        curso_id: curso.id,
      }),
    );
  }

  return definicoes;
}

/**
 * Recria os passos a partir dos instrumentos e do catálogo, sem perder respostas:
 * o passo é identificado por `codigo`, então reexecutar apenas atualiza textos e
 * desativa o que deixou de existir no instrumento vigente.
 */
export async function sincronizarTrilha(): Promise<{ total: number; novos: number }> {
  const definicoes = [...(await definicoesBlocoA()), ...(await definicoesBlocoB()), ...(await definicoesBlocoC())];
  if (definicoes.length === 0) return { total: 0, novos: 0 };

  const antes = await queryOne<{ total: string }>("select count(*)::text as total from trilha_passo");
  const blocoBase: Record<Bloco, number> = { A: 0, B: 1000, C: 2000 };

  for (const d of definicoes) {
    await query(
      `insert into trilha_passo
         (codigo, bloco, secao, ordem, tipo, titulo, explicacao, base_legal, obrigatorio, aceita_nsa,
          entidade_slug, registro_id, campos, alvo_tipo, alvo_id, categoria_documento, exige_validade, curso_id, ativo)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,true)
       on conflict (codigo) do update set
         bloco = excluded.bloco, secao = excluded.secao, ordem = excluded.ordem, tipo = excluded.tipo,
         titulo = excluded.titulo, explicacao = excluded.explicacao, base_legal = excluded.base_legal,
         obrigatorio = excluded.obrigatorio, aceita_nsa = excluded.aceita_nsa,
         entidade_slug = excluded.entidade_slug, registro_id = excluded.registro_id, campos = excluded.campos,
         alvo_tipo = excluded.alvo_tipo, alvo_id = excluded.alvo_id,
         categoria_documento = excluded.categoria_documento, exige_validade = excluded.exige_validade,
         curso_id = excluded.curso_id, ativo = true, atualizado_em = now()`,
      [
        d.codigo,
        d.bloco,
        d.secao,
        blocoBase[d.bloco] + d.ordem,
        d.tipo,
        d.titulo,
        d.explicacao,
        d.base_legal,
        d.obrigatorio,
        d.aceita_nsa,
        d.entidade_slug,
        d.registro_id,
        d.campos,
        d.alvo_tipo,
        d.alvo_id,
        d.categoria_documento,
        d.exige_validade,
        d.curso_id,
      ],
    );
  }

  await query("update trilha_passo set ativo = false where codigo <> all($1::text[])", [
    definicoes.map((d) => d.codigo),
  ]);

  return { total: definicoes.length, novos: definicoes.length - Number(antes?.total ?? 0) };
}

const SELECT_PASSO = `
  select p.id, p.codigo, p.bloco, p.secao, p.ordem, p.tipo, p.titulo, p.explicacao, p.base_legal,
         p.obrigatorio, p.aceita_nsa, p.entidade_slug, p.registro_id, p.campos, p.alvo_tipo, p.alvo_id,
         p.categoria_documento, p.exige_validade, p.curso_id,
         r.status, r.observacao, r.respondido_por,
         to_char(r.respondido_em, 'DD/MM/YYYY HH24:MI') as respondido_em,
         coalesce(dc.total, 0)::int as documentos,
         coalesce(dc.vencido, false) as vencido
    from trilha_passo p
    left join trilha_resposta r on r.passo_id = p.id
    left join lateral (
      select count(*)::int as total,
             bool_or(d.valido_ate is not null and d.valido_ate < current_date) as vencido
        from evidencia_vinculo v
        join documento d on d.id = v.documento_id and d.excluido_em is null
       where v.alvo_tipo = p.alvo_tipo and v.alvo_id = p.alvo_id
    ) dc on p.alvo_id is not null
   where p.ativo`;

export async function listarPassos(filtro: { bloco?: Bloco; cursoId?: string } = {}): Promise<PassoComEstado[]> {
  const condicoes: string[] = [];
  const params: unknown[] = [];
  if (filtro.bloco) {
    params.push(filtro.bloco);
    condicoes.push(`p.bloco = $${params.length}`);
  }
  if (filtro.cursoId) {
    params.push(filtro.cursoId);
    condicoes.push(`p.curso_id = $${params.length}`);
  }
  const extra = condicoes.length > 0 ? ` and ${condicoes.join(" and ")}` : "";
  return query<PassoComEstado>(`${SELECT_PASSO}${extra} order by p.ordem`, params);
}

export async function obterPasso(codigo: string): Promise<PassoComEstado | null> {
  return queryOne<PassoComEstado>(`${SELECT_PASSO} and p.codigo = $1`, [codigo]);
}

/** Passo é considerado resolvido quando foi respondido e a evidência não venceu. */
export function resolvido(passo: PassoComEstado): boolean {
  if (!passo.status) return false;
  if (passo.status === "CONCLUIDO" && passo.vencido) return false;
  return true;
}

export type Progresso = {
  total: number;
  concluidos: number;
  naoHa: number;
  nsa: number;
  vencidos: number;
  pendentes: number;
  percentual: number;
};

export function calcularProgresso(passos: PassoComEstado[]): Progresso {
  const total = passos.length;
  let concluidos = 0;
  let naoHa = 0;
  let nsa = 0;
  let vencidos = 0;
  for (const passo of passos) {
    if (passo.status === "CONCLUIDO" && passo.vencido) vencidos += 1;
    else if (passo.status === "CONCLUIDO") concluidos += 1;
    else if (passo.status === "NAO_HA") naoHa += 1;
    else if (passo.status === "NSA") nsa += 1;
  }
  const resolvidos = concluidos + naoHa + nsa;
  return {
    total,
    concluidos,
    naoHa,
    nsa,
    vencidos,
    pendentes: total - resolvidos,
    percentual: total === 0 ? 0 : Math.round((resolvidos / total) * 100),
  };
}

export function proximoPendente(passos: PassoComEstado[], depoisDe?: number): PassoComEstado | null {
  const candidatos = passos.filter((p) => !resolvido(p) && (depoisDe === undefined || p.ordem > depoisDe));
  return candidatos[0] ?? passos.filter((p) => !resolvido(p))[0] ?? null;
}

export function agruparPorSecao(passos: PassoComEstado[]): { secao: string; passos: PassoComEstado[] }[] {
  const mapa = new Map<string, PassoComEstado[]>();
  for (const passo of passos) {
    const lista = mapa.get(passo.secao) ?? [];
    lista.push(passo);
    mapa.set(passo.secao, lista);
  }
  return [...mapa.entries()].map(([secao, itens]) => ({ secao, passos: itens }));
}

export async function responderPasso(
  passo: Passo,
  status: StatusResposta,
  sessao: Sessao,
  opcoes: { observacao?: string | null; dados?: unknown } = {},
): Promise<void> {
  await query(
    `insert into trilha_resposta (passo_id, status, observacao, dados, respondido_por)
     values ($1,$2,$3,$4,$5)
     on conflict (passo_id) do update set
       status = excluded.status, observacao = excluded.observacao, dados = excluded.dados,
       respondido_por = excluded.respondido_por, respondido_em = now()`,
    [passo.id, status, opcoes.observacao ?? null, opcoes.dados ? JSON.stringify(opcoes.dados) : null, sessao.email],
  );
  await registrarAuditoria(sessao, `TRILHA_${status}`, "trilha_passo", passo.id, {
    codigo: passo.codigo,
    titulo: passo.titulo,
    observacao: opcoes.observacao ?? null,
  });
}

export async function limparResposta(passo: Passo, sessao: Sessao): Promise<void> {
  await query("delete from trilha_resposta where passo_id = $1", [passo.id]);
  await registrarAuditoria(sessao, "TRILHA_REABRIR", "trilha_passo", passo.id, { codigo: passo.codigo });
}
