import { StorageClient } from "@supabase/storage-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "evidencias";

/** Tamanho máximo por arquivo aceito pelo bucket. */
export const MAX_BYTES = 50 * 1024 * 1024;

export const EXTENSOES_ACEITAS = [
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "csv",
  "txt",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "zip",
] as const;

export function storageConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * Usa o StorageClient direto em vez do supabase-js completo: evita carregar o
 * cliente de realtime, que exige WebSocket nativo (indisponível no Node 20).
 */
function bucket() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error(
      "Supabase Storage não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  const cliente = new StorageClient(`${url.replace(/\/$/, "")}/storage/v1`, {
    Authorization: `Bearer ${chave}`,
    apikey: chave,
  });
  return cliente.from(BUCKET);
}

/** Nome de arquivo seguro: sem acento, espaço ou caractere especial. */
export function normalizarNome(nome: string): string {
  const semExtensao = nome.replace(/\.[^.]+$/, "");
  const base = semExtensao
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "arquivo";
}

export function extensaoDe(nome: string): string {
  const partes = nome.split(".");
  if (partes.length < 2) return "";
  return partes[partes.length - 1].toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function extensaoAceita(nome: string): boolean {
  const ext = extensaoDe(nome);
  return (EXTENSOES_ACEITAS as readonly string[]).includes(ext);
}

export function montarCaminho(nomeArquivo: string, categoria: string | null, uuid: string): string {
  const ano = new Date().getFullYear();
  const pasta = categoria ? normalizarNome(categoria) : "geral";
  const ext = extensaoDe(nomeArquivo);
  return `${ano}/${pasta}/${uuid}-${normalizarNome(nomeArquivo)}${ext ? `.${ext}` : ""}`;
}

/** URL de upload assinada: o browser envia direto ao bucket, sem passar pelo servidor. */
export async function urlDeUpload(caminho: string): Promise<{ url: string; token: string }> {
  const { data, error } = await bucket().createSignedUploadUrl(caminho);
  if (error || !data) throw new Error(`Falha ao preparar o envio: ${error?.message ?? "sem resposta"}`);
  return { url: data.signedUrl, token: data.token };
}

export type ObjetoStorage = { tamanho: number; mime: string | null };

/** Confere que o objeto existe no bucket e devolve tamanho e mime reais. */
export async function descreverObjeto(caminho: string): Promise<ObjetoStorage | null> {
  const barra = caminho.lastIndexOf("/");
  const pasta = barra === -1 ? "" : caminho.slice(0, barra);
  const arquivo = barra === -1 ? caminho : caminho.slice(barra + 1);
  const { data, error } = await bucket().list(pasta, { search: arquivo, limit: 1 });
  if (error || !data || data.length === 0) return null;
  const item = data.find((o) => o.name === arquivo);
  if (!item) return null;
  const meta = item.metadata as { size?: number; mimetype?: string } | null;
  return { tamanho: meta?.size ?? 0, mime: meta?.mimetype ?? null };
}

export async function baixarArquivo(caminho: string): Promise<Buffer> {
  const { data, error } = await bucket().download(caminho);
  if (error || !data) throw new Error(`Falha ao ler o arquivo: ${error?.message ?? "sem resposta"}`);
  return Buffer.from(await data.arrayBuffer());
}

export async function enviarArquivo(caminho: string, arquivo: File): Promise<string> {
  const { error } = await bucket().upload(caminho, arquivo, {
    contentType: arquivo.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return caminho;
}

export async function urlAssinada(caminho: string, segundos = 900): Promise<string | null> {
  if (!storageConfigurado()) return null;
  const { data, error } = await bucket().createSignedUrl(caminho, segundos);
  if (error) return null;
  return data.signedUrl;
}

export async function removerArquivo(caminho: string): Promise<void> {
  const { error } = await bucket().remove([caminho]);
  if (error) throw new Error(`Falha ao remover o arquivo: ${error.message}`);
}
