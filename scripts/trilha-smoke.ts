import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

async function main() {
  const { listarPassos, calcularProgresso, obterPasso, responderPasso, limparResposta } = await import(
    "../src/lib/trilha/index"
  );
  const { buscarNoDossie } = await import("../src/lib/socrates/dossie");
  const { avaliarRegras } = await import("../src/lib/socrates/regras");

  const passos = await listarPassos();
  console.log("total de passos:", passos.length, calcularProgresso(passos));

  const alvo = await obterPasso("A12");
  if (!alvo) throw new Error("passo A12 não encontrado");

  const { queryOne } = await import("../src/lib/db");
  const usuario = await queryOne<{ id: string; nome: string; email: string }>(
    "select id, nome, email from usuario where papel = 'SUPERADMIN' order by criado_em limit 1",
  );
  if (!usuario) throw new Error("nenhum superadmin cadastrado");
  const sessao = { ...usuario, papel: "SUPERADMIN" as const };
  await responderPasso(alvo, "NAO_HA", sessao, { observacao: "smoke test" });

  const regras = await avaliarRegras();
  console.log(
    "regras do dossiê:",
    regras.filter((r) => r.alvoTipo === "TRILHA").map((r) => r.titulo).slice(0, 3),
  );

  console.log("busca no dossiê:", (await buscarNoDossie("certidão")).slice(0, 3));

  await limparResposta(alvo, sessao);
  console.log("resposta de teste removida");
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
