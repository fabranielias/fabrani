import { NextResponse } from "next/server";
import { sincronizarSugestoes } from "@/lib/socrates/regras";
import { sincronizarRadar } from "@/lib/socrates/radar";

export const dynamic = "force-dynamic";

/**
 * Recalcula as sugestões determinísticas (prazos, evidências, colegiados).
 * Protegido por CRON_SECRET quando configurado; a Vercel envia o cabeçalho
 * Authorization: Bearer <CRON_SECRET> nos cron jobs.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;
  if (segredo && request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  try {
    const resultado = await sincronizarSugestoes();
    const radar = await sincronizarRadar();
    return NextResponse.json({ ok: true, ...resultado, radar });
  } catch (erro) {
    return NextResponse.json(
      { ok: false, erro: erro instanceof Error ? erro.message : "falha ao sincronizar" },
      { status: 500 },
    );
  }
}
