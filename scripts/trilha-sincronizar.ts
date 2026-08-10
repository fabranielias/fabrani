import { config } from "dotenv";
config({ path: [".env.local", ".env"] });

async function main() {
  const { sincronizarTrilha, listarPassos, calcularProgresso } = await import("../src/lib/trilha/index");
  const resultado = await sincronizarTrilha();
  console.log(`passos sincronizados: ${resultado.total}`);
  for (const bloco of ["A", "B", "C"] as const) {
    const passos = await listarPassos({ bloco });
    const progresso = calcularProgresso(passos);
    console.log(`  bloco ${bloco}: ${progresso.total} passos, ${progresso.percentual}% respondido`);
  }
  process.exit(0);
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
