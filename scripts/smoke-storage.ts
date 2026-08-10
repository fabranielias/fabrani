import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { randomUUID } from "node:crypto";
import {
  descreverObjeto,
  baixarArquivo,
  montarCaminho,
  removerArquivo,
  storageConfigurado,
  urlAssinada,
  urlDeUpload,
} from "../src/lib/storage";

async function main() {
  if (!storageConfigurado()) throw new Error("Storage não configurado.");

  const caminho = montarCaminho("Ata da CPA — teste.pdf", "ATA", randomUUID());
  console.log("caminho:", caminho);

  const { url } = await urlDeUpload(caminho);
  const conteudo = Buffer.from(`%PDF-1.4 teste fabrani ${Date.now()}`);
  const envio = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/pdf" },
    body: new Uint8Array(conteudo),
  });
  console.log("upload:", envio.status);
  if (!envio.ok) throw new Error(await envio.text());

  const objeto = await descreverObjeto(caminho);
  console.log("objeto:", objeto);

  const bytes = await baixarArquivo(caminho);
  console.log("download bytes:", bytes.length, bytes.equals(conteudo) ? "idêntico" : "DIVERGENTE");

  const assinada = await urlAssinada(caminho, 60);
  const leitura = await fetch(assinada ?? "");
  console.log("url assinada:", leitura.status);

  await removerArquivo(caminho);
  console.log("removido:", (await descreverObjeto(caminho)) === null ? "ok" : "falhou");
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
