import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

import { sincronizarSugestoes } from "../src/lib/socrates/regras";
import { sincronizarRadar } from "../src/lib/socrates/radar";
import { getPool } from "../src/lib/db";

async function main() {
  const { criadas, resolvidas } = await sincronizarSugestoes();
  const radar = await sincronizarRadar();
  console.log(
    `Sócrates: ${criadas} sugestão(ões) nova(s), ${resolvidas} resolvida(s), ${radar} alerta(s) do radar normativo.`,
  );
  await getPool().end();
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
