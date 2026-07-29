import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}
const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
const pool = new Pool({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });

type Dispositivos = {
  dispositivos: Array<{
    norma: { especie: string; orgao: string; numero: string; ano: number };
    itens: Array<{ rotulo: string; natureza: string; texto: string }>;
  }>;
};

type Modelos = {
  modelos: Array<{
    tipo: string;
    titulo: string;
    base_legal?: string;
    campos?: string[];
    corpo: string;
  }>;
};

function ler<T>(...caminho: string[]): T {
  return JSON.parse(readFileSync(join(process.cwd(), ...caminho), "utf8")) as T;
}

async function main() {
  const cli = await pool.connect();
  try {
    await cli.query("begin");

    const { dispositivos } = ler<Dispositivos>("catalog", "normas", "dispositivos.json");
    let inseridos = 0;
    for (const grupo of dispositivos) {
      const { rows } = await cli.query<{ id: string }>(
        `select id from norma where especie = $1 and orgao = $2 and numero = $3 and ano = $4`,
        [grupo.norma.especie, grupo.norma.orgao, grupo.norma.numero, grupo.norma.ano],
      );
      const normaId = rows[0]?.id;
      if (!normaId) {
        console.warn(`Norma não cadastrada, ignorada: ${grupo.norma.especie} ${grupo.norma.numero}/${grupo.norma.ano}`);
        continue;
      }
      let ordem = 0;
      for (const item of grupo.itens) {
        const texto = item.natureza === "VERBATIM" ? item.texto : `[SÍNTESE — confira o texto oficial] ${item.texto}`;
        await cli.query(
          `insert into norma_dispositivo (norma_id, rotulo, texto, ordem, hash)
           values ($1,$2,$3,$4,$5)
           on conflict (norma_id, rotulo) do update set texto = excluded.texto, hash = excluded.hash`,
          [normaId, item.rotulo, texto, (ordem += 1), createHash("sha256").update(texto).digest("hex")],
        );
        inseridos += 1;
      }
    }

    const { modelos } = ler<Modelos>("catalog", "modelos", "documentos.json");
    for (const modelo of modelos) {
      await cli.query(
        `insert into modelo_documento (tipo, titulo, versao, corpo, campos, base_legal)
         values ($1,$2,1,$3,$4,$5)
         on conflict (tipo, versao) do update
            set titulo = excluded.titulo, corpo = excluded.corpo,
                campos = excluded.campos, base_legal = excluded.base_legal`,
        [modelo.tipo, modelo.titulo, modelo.corpo, JSON.stringify(modelo.campos ?? []), modelo.base_legal ?? null],
      );
    }

    // Mapa curado indicador → dispositivo, por palavra-chave do título do indicador.
    const mapa: Array<[string, string]> = [
      ["extensão", "Curricularização da extensão"],
      ["autoavaliação", "Art. 11"],
      ["polo", "Polos"],
      ["material didático", "Corpo docente e mediação"],
      ["tutor", "Corpo docente e mediação"],
      ["acervo", "Acervo acadêmico digital"],
    ];
    let vinculos = 0;
    for (const [termo, rotulo] of mapa) {
      const { rowCount } = await cli.query(
        `insert into indicador_norma (indicador_id, dispositivo_id, peso)
         select i.id, d.id, 3
           from indicador i, norma_dispositivo d
          where lower(i.titulo) like '%' || $1 || '%' and d.rotulo = $2
         on conflict do nothing`,
        [termo, rotulo],
      );
      vinculos += rowCount ?? 0;
    }

    await cli.query("commit");
    console.log(
      `Sócrates: ${inseridos} dispositivo(s), ${modelos.length} modelo(s) de documento, ${vinculos} vínculo(s) indicador↔norma.`,
    );
  } catch (erro) {
    await cli.query("rollback");
    throw erro;
  } finally {
    cli.release();
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
