import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
const pool = new Pool({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });

async function main() {
  await pool.query(
    `create table if not exists _migration (nome text primary key, aplicada_em timestamptz not null default now())`,
  );
  const dir = join(process.cwd(), "db", "migrations");
  const arquivos = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  for (const arquivo of arquivos) {
    const { rows } = await pool.query("select 1 from _migration where nome = $1", [arquivo]);
    if (rows.length > 0) {
      console.log(`= ${arquivo} (já aplicada)`);
      continue;
    }
    const sql = readFileSync(join(dir, arquivo), "utf8");
    await pool.query("begin");
    try {
      await pool.query(sql);
      await pool.query("insert into _migration (nome) values ($1)", [arquivo]);
      await pool.query("commit");
      console.log(`+ ${arquivo}`);
    } catch (erro) {
      await pool.query("rollback");
      throw erro;
    }
  }
  await pool.end();
  console.log("Migrações concluídas.");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
