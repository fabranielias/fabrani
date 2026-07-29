import { createClient } from "@supabase/supabase-js";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "evidencias";

export function storageConfigurado(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function cliente() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Supabase Storage não configurado.");
  return createClient(url, chave, { auth: { persistSession: false } });
}

export async function enviarArquivo(caminho: string, arquivo: File): Promise<string> {
  const supabase = cliente();
  const { error } = await supabase.storage.from(BUCKET).upload(caminho, arquivo, {
    contentType: arquivo.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`Falha no upload: ${error.message}`);
  return caminho;
}

export async function urlAssinada(caminho: string, segundos = 300): Promise<string | null> {
  if (!storageConfigurado()) return null;
  const supabase = cliente();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(caminho, segundos);
  if (error) return null;
  return data.signedUrl;
}
