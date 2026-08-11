import bcrypt from "bcryptjs";
import { query, queryOne } from "./db";
import { entidadePorSlug, type Campo, type Entidade } from "./registry";
import type { Sessao } from "./session";

export type Registro = Record<string, unknown>;

/** Campos de senha não existem como coluna: viram `senha_hash` na gravação. */
function colunasSelecionadas(entidade: Entidade): string {
  const nomes = new Set<string>(["id"]);
  for (const campo of entidade.campos) {
    if (campo.tipo === "senha") continue;
    nomes.add(campo.nome);
  }
  return [...nomes].join(", ");
}

/** Colunas de texto usadas na busca livre da listagem. */
function camposBuscaveis(entidade: Entidade): string[] {
  const nomes = entidade.campos
    .filter((c) => c.tipo === "text" || c.tipo === "textarea")
    .map((c) => c.nome);
  if (!nomes.includes(entidade.campoTitulo)) nomes.unshift(entidade.campoTitulo);
  return nomes.slice(0, 6);
}

export type Filtro = { campo: string; valor: string };

export type Pagina = {
  linhas: Registro[];
  total: number;
  pagina: number;
  tamanho: number;
  paginas: number;
};

export const TAMANHO_PAGINA = 25;

function montarFiltros(
  entidade: Entidade,
  opcoes: { busca?: string; filtros?: Filtro[] },
): { where: string; params: unknown[] } {
  const condicoes: string[] = [];
  const params: unknown[] = [];

  if (opcoes.busca?.trim()) {
    params.push(`%${opcoes.busca.trim()}%`);
    const indice = params.length;
    const alvos = camposBuscaveis(entidade).map((c) => `${c}::text ilike $${indice}`);
    condicoes.push(`(${alvos.join(" or ")})`);
  }

  for (const filtro of opcoes.filtros ?? []) {
    const campo = entidade.campos.find((c) => c.nome === filtro.campo);
    if (!campo || campo.tipo === "senha" || !filtro.valor) continue;
    params.push(campo.tipo === "boolean" ? filtro.valor === "true" : filtro.valor);
    condicoes.push(`${campo.nome} = $${params.length}`);
  }

  return { where: condicoes.length > 0 ? `where ${condicoes.join(" and ")}` : "", params };
}

function ordenacaoSegura(entidade: Entidade, ordem?: string, direcao?: string): string {
  const permitido = new Set(["id", ...entidade.campos.filter((c) => c.tipo !== "senha").map((c) => c.nome)]);
  if (ordem && permitido.has(ordem)) {
    return `${ordem} ${direcao === "desc" ? "desc" : "asc"} nulls last`;
  }
  return entidade.ordenacao ?? `${entidade.campoTitulo} asc`;
}

export async function listarPagina(
  entidade: Entidade,
  opcoes: {
    busca?: string;
    filtros?: Filtro[];
    pagina?: number;
    tamanho?: number;
    ordem?: string;
    direcao?: string;
  } = {},
): Promise<Pagina> {
  const { where, params } = montarFiltros(entidade, opcoes);
  const tamanho = Math.min(Math.max(opcoes.tamanho ?? TAMANHO_PAGINA, 5), 200);
  const pagina = Math.max(opcoes.pagina ?? 1, 1);
  const deslocamento = (pagina - 1) * tamanho;

  const contagem = await queryOne<{ total: string }>(
    `select count(*)::text as total from ${entidade.tabela} ${where}`,
    params,
  );
  const total = Number(contagem?.total ?? 0);

  const linhas = await query(
    `select ${colunasSelecionadas(entidade)} from ${entidade.tabela} ${where}
      order by ${ordenacaoSegura(entidade, opcoes.ordem, opcoes.direcao)}
      limit ${tamanho} offset ${deslocamento}`,
    params,
  );

  return { linhas, total, pagina, tamanho, paginas: Math.max(Math.ceil(total / tamanho), 1) };
}

/** Todas as linhas do filtro atual, para exportação em CSV. */
export async function listarParaExportar(
  entidade: Entidade,
  opcoes: { busca?: string; filtros?: Filtro[]; ordem?: string; direcao?: string } = {},
): Promise<Registro[]> {
  const { where, params } = montarFiltros(entidade, opcoes);
  return query(
    `select ${colunasSelecionadas(entidade)} from ${entidade.tabela} ${where}
      order by ${ordenacaoSegura(entidade, opcoes.ordem, opcoes.direcao)} limit 5000`,
    params,
  );
}

export async function listar(
  entidade: Entidade,
  opcoes: { busca?: string; limite?: number } = {},
): Promise<Registro[]> {
  const { where, params } = montarFiltros(entidade, opcoes);
  return query(
    `select ${colunasSelecionadas(entidade)} from ${entidade.tabela} ${where}
      order by ${entidade.ordenacao ?? `${entidade.campoTitulo} asc`} limit ${opcoes.limite ?? 300}`,
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
    if (campo.tipo === "senha") {
      const senha = String(form.get(campo.nome) ?? "").trim();
      if (senha === "") {
        if (!id) throw new Error("Defina a senha de acesso do usuário.");
        continue;
      }
      if (senha.length < 8) throw new Error("A senha precisa ter ao menos 8 caracteres.");
      colunas.push("senha_hash");
      valores.push(await bcrypt.hash(senha, 10));
      continue;
    }
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

  await registrarAuditoria(
    sessao,
    id ? "ATUALIZAR" : "CRIAR",
    entidade.tabela,
    registroId,
    Object.fromEntries(colunas.map((c, i) => [c, c === "senha_hash" ? "(redefinida)" : valores[i]])),
  );

  return registroId;
}

/** Traduz erros do Postgres para uma frase que o usuário entenda. */
export function traduzirErro(erro: unknown): string {
  if (typeof erro !== "object" || erro === null) return "Não foi possível concluir a operação.";
  const pg = erro as { code?: string; detail?: string; message?: string; constraint?: string };
  switch (pg.code) {
    case "23505":
      return "Já existe um registro com esses dados — verifique os campos únicos (código, CNPJ, e-mail).";
    case "23503":
      return "Este registro está ligado a outros e não pode ser removido ou alterado assim.";
    case "23502":
      return "Preencha todos os campos obrigatórios.";
    case "23514":
      return "Algum valor informado está fora do que o sistema aceita.";
    case "22P02":
      return "Formato inválido em algum campo (data, número ou identificador).";
    default:
      return pg.message ?? "Não foi possível concluir a operação.";
  }
}

/** Tabelas que referenciam esta e travariam a exclusão. */
export async function dependencias(entidade: Entidade, id: string): Promise<{ tabela: string; total: number }[]> {
  const referencias = await query<{ tabela: string; coluna: string }>(
    `select src.relname as tabela, att.attname as coluna
       from pg_constraint c
       join pg_class src on src.oid = c.conrelid
       join pg_class alvo on alvo.oid = c.confrelid
       join pg_attribute att on att.attrelid = c.conrelid and att.attnum = c.conkey[1]
      where c.contype = 'f' and alvo.relname = $1`,
    [entidade.tabela],
  );

  const resultado: { tabela: string; total: number }[] = [];
  for (const ref of referencias) {
    const linha = await queryOne<{ total: string }>(
      `select count(*)::text as total from ${ref.tabela} where ${ref.coluna} = $1`,
      [id],
    );
    const total = Number(linha?.total ?? 0);
    if (total > 0) resultado.push({ tabela: ref.tabela, total });
  }
  return resultado;
}

export async function excluir(entidade: Entidade, id: string, sessao: Sessao): Promise<void> {
  if (entidade.permiteExcluir === false) {
    throw new Error(`${entidade.rotulo} faz parte do catálogo regulatório e não pode ser excluído.`);
  }
  const presos = await dependencias(entidade, id);
  if (presos.length > 0) {
    const lista = presos.map((d) => `${d.total} em ${d.tabela}`).join(", ");
    throw new Error(`Não é possível excluir: existem registros dependentes (${lista}).`);
  }
  const antes = await obter(entidade, id);
  if (!antes) throw new Error("Registro não encontrado.");
  await query(`delete from ${entidade.tabela} where id = $1`, [id]);
  await registrarAuditoria(sessao, "EXCLUIR", entidade.tabela, id, antes);
}

export type EventoHistorico = {
  acao: string;
  usuario_email: string | null;
  criado_em: string;
  depois: unknown;
};

export async function historico(tabela: string, id: string): Promise<EventoHistorico[]> {
  return query<EventoHistorico>(
    `select acao, usuario_email, to_char(criado_em, 'DD/MM/YYYY HH24:MI') as criado_em, depois
       from auditoria_log where entidade = $1 and entidade_id = $2
      order by criado_em desc limit 30`,
    [tabela, id],
  );
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
