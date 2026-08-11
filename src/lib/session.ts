import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { queryOne } from "./db";

const COOKIE = "fabrani_mec_sessao";
const DURACAO_HORAS = 12;

export type Sessao = {
  id: string;
  email: string;
  nome: string;
  papel: string;
};

function segredo(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    throw new Error("AUTH_SECRET não configurado (mínimo de 16 caracteres).");
  }
  return new TextEncoder().encode(s);
}

export async function criarSessao(sessao: Sessao) {
  const token = await new SignJWT({ ...sessao })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_HORAS}h`)
    .sign(segredo());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_HORAS * 3600,
  });
}

export async function encerrarSessao() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function sessaoAtual(): Promise<Sessao | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, segredo());
    return {
      id: String(payload.id),
      email: String(payload.email),
      nome: String(payload.nome),
      papel: String(payload.papel),
    };
  } catch {
    return null;
  }
}

export async function autenticar(email: string, senha: string): Promise<Sessao | null> {
  const bcrypt = await import("bcryptjs");
  const usuario = await queryOne<{
    id: string;
    email: string;
    nome: string;
    papel: string;
    senha_hash: string | null;
    ativo: boolean;
  }>("select id, email, nome, papel, senha_hash, ativo from usuario where lower(email) = lower($1)", [
    email,
  ]);
  if (!usuario || !usuario.ativo || !usuario.senha_hash) return null;
  const ok = await bcrypt.compare(senha, usuario.senha_hash);
  if (!ok) return null;
  return { id: usuario.id, email: usuario.email, nome: usuario.nome, papel: usuario.papel };
}

const PAPEIS_LEITURA = new Set(["AUDITOR", "DOCENTE"]);

export function podeEscrever(sessao: Sessao | null): boolean {
  return !!sessao && !PAPEIS_LEITURA.has(sessao.papel);
}

/** Entidades com `papeisLeitura` só abrem para os papéis listados. */
export function podeVer(papeisLeitura: string[] | undefined, papel: string | undefined): boolean {
  return !papeisLeitura || (!!papel && papeisLeitura.includes(papel));
}
