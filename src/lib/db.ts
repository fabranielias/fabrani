import { Pool, type QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { mecPool?: Pool };

function connectionString(): string {
  const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Defina a connection string do Postgres (Supabase) em .env.local",
    );
  }
  return url;
}

export function getPool(): Pool {
  if (!globalForDb.mecPool) {
    const url = connectionString();
    const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
    globalForDb.mecPool = new Pool({
      connectionString: url,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 5,
    });
  }
  return globalForDb.mecPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as never[]);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function countOf(table: string, where = "", params: unknown[] = []): Promise<number> {
  const rows = await query<{ n: string }>(
    `select count(*)::text as n from ${table} ${where}`,
    params,
  );
  return Number(rows[0]?.n ?? 0);
}
