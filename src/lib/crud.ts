import { query, queryOne } from "./db";
import { entidadePorSlug, type Campo, type Entidade } from "./registry";
import type { Sessao } from "./session";

export type Registro = Record<string, unknown>;

function colunasSelecionadas(entidade: Entidade): string {
  const nomes = new Set<string>(["id"]);
  for (const campo of entidade.campos) nomes.add(campo.nome);
  return [...nomes].join(", ");
}

export async function listar(
  entidade: Entidade,
  opcoes: { busca?: string; limite?: number } = {},
): Promise<Registro[]> {
  const params: unknown[] = [];
  let where = "";
  if (opcoes.busca) {
    params.push(`%${opcoes.busca}%`);
    where = `where ${entidade.campoTitulo}::text ilike $1`;
  }
  const ordem = entidade.ordenacao ?? `${entidade.campoTitulo} asc`;
  return query(
    `select ${colunasSelecionadas(entidade)} from ${entidade.tabela} ${where} order by ${ordem} limit ${
      opcoes.limite ?? 300
    }`,
    params,
  );
}

export async function obter(entidade: Entidade, id: string): Promise<Registro | null> {
  return queryOne(`select ${colunasSelecionadas(entidade)} from ${entidade.tabela} where id = $1`, [id]);
}

export type OpcoesRef = Record<string, { id: string; rotulo: string }[]>;

export async function carregarOpcoesRef(entidade: Entidade): Promise<OpcoesRef> {
  const resultado: OpcoesRef = {};
  for (const campo of entidade.campos) {
    if (campo.tipo !== "ref" || !campo.ref) continue;
    const alvo = entidadePorSlug(campo.ref);
    if (!alvo) continue;
    const linhas = await query<{ id: string; rotulo: string }>(
      `select id, coalesce(${alvo.campoTitulo}::text, '(sem título)') as rotulo from ${alvo.tabela}
       order by 2 limit 500`,
    );
    resultado[campo.nome] = linhas;
  }
  return resultado;
}

function converter(campo: Campo, bruto: FormDataEntryValue | null): unknown {
  if (campo.tipo === "boolean") return bruto === "true" || bruto === "on";
  const valor = typeof bruto === "string" ? bruto.trim() : "";
  if (valor === "") return null;
  switch (campo.tipo) {
    case "number":
      return Number.parseInt(valor, 10);
    case "decimal":
      return Number.parseFloat(valor.replace(",", "."));
    case "tags":
      return valor.split(",").map((t) => t.trim()).filter(Boolean);
    default:
      return valor;
  }
}

export async function salvar(
  entidade: Entidade,
  id: string | null,
  form: FormData,
  sessao: Sessao,
): Promise<string> {
  const colunas: string[] = [];
  const valores: unknown[] = [];
  for (const campo of entidade.campos) {
    if (!form.has(campo.nome) && campo.tipo !== "boolean") continue;
    colunas.push(campo.nome);
    valores.push(converter(campo, form.get(campo.nome)));
  }
  if (colunas.length === 0) throw new Error("Nenhum campo enviado.");

  let registroId: string;
  if (id) {
    const sets = colunas.map((c, i) => `${c} = $${i + 1}`).join(", ");
    const linha = await queryOne<{ id: string }>(
      `update ${entidade.tabela} set ${sets} where id = $${colunas.length + 1} returning id`,
      [...valores, id],
    );
    if (!linha) throw new Error("Registro não encontrado.");
    registroId = linha.id;
  } else {
    const placeholders = colunas.map((_, i) => `$${i + 1}`).join(", ");
    const linha = await queryOne<{ id: string }>(
      `insert into ${entidade.tabela} (${colunas.join(", ")}) values (${placeholders}) returning id`,
      valores,
    );
    registroId = linha!.id;
  }

  await registrarAuditoria(sessao, id ? "ATUALIZAR" : "CRIAR", entidade.tabela, registroId,
    Object.fromEntries(colunas.map((c, i) => [c, valores[i]])));

  return registroId;
}

export async function registrarAuditoria(
  sessao: Sessao | null,
  acao: string,
  entidade: string,
  entidadeId: string | null,
  depois?: unknown,
) {
  await query(
    `insert into auditoria_log (usuario_id, usuario_email, acao, entidade, entidade_id, depois)
     values ($1,$2,$3,$4,$5,$6)`,
    [
      sessao?.id ?? null,
      sessao?.email ?? null,
      acao,
      entidade,
      entidadeId,
      depois ? JSON.stringify(depois) : null,
    ],
  );
}
