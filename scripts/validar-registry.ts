import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { ENTIDADES, entidadePorSlug } from "../src/lib/registry";
import { query } from "../src/lib/db";
import { getPool } from "../src/lib/db";

async function main() {
  const colunas = await query<{ table_name: string; column_name: string }>(
    `select table_name, column_name from information_schema.columns where table_schema = 'public'`,
  );
  const porTabela = new Map<string, Set<string>>();
  for (const c of colunas) {
    if (!porTabela.has(c.table_name)) porTabela.set(c.table_name, new Set());
    porTabela.get(c.table_name)!.add(c.column_name);
  }

  const erros: string[] = [];
  for (const entidade of ENTIDADES) {
    const cols = porTabela.get(entidade.tabela);
    if (!cols) {
      erros.push(`${entidade.slug}: tabela "${entidade.tabela}" não existe`);
      continue;
    }
    if (!cols.has(entidade.campoTitulo)) {
      erros.push(`${entidade.slug}: campoTitulo "${entidade.campoTitulo}" não existe em ${entidade.tabela}`);
    }
    for (const campo of entidade.campos) {
      if (!cols.has(campo.nome)) {
        erros.push(`${entidade.slug}: coluna "${campo.nome}" não existe em ${entidade.tabela}`);
      }
      if (campo.tipo === "ref" && (!campo.ref || !entidadePorSlug(campo.ref))) {
        erros.push(`${entidade.slug}.${campo.nome}: ref "${campo.ref}" não é uma entidade registrada`);
      }
    }
  }

  if (erros.length > 0) {
    console.error(`${erros.length} inconsistência(s) entre registry e schema:`);
    for (const e of erros) console.error(` - ${e}`);
    await getPool().end();
    process.exit(1);
  }

  console.log(`Registry validado: ${ENTIDADES.length} entidades coerentes com o schema.`);
  await getPool().end();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
