import { Badge, Card, Celula, Tabela, TituloPagina, Vazio } from "@/components/ui";
import { query } from "@/lib/db";
import { rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AuditoriaPage() {
  const linhas = await query<{
    id: string;
    usuario_email: string | null;
    acao: string;
    entidade: string;
    entidade_id: string | null;
    criado_em: string;
  }>(
    "select id::text, usuario_email, acao, entidade, entidade_id, criado_em from auditoria_log order by id desc limit 200",
  );

  return (
    <>
      <TituloPagina
        titulo="Log de auditoria"
        descricao="Registro append-only de quem alterou o quê. Exigível em supervisão e útil para responder diligências."
      />
      <Card padding={false}>
        {linhas.length === 0 ? (
          <div className="p-6">
            <Vazio titulo="Nenhum evento registrado ainda" />
          </div>
        ) : (
          <div className="px-2 py-1">
            <Tabela cabecalho={["Data/hora", "Usuário", "Ação", "Entidade", "Registro"]}>
              {linhas.map((l) => (
                <tr key={l.id}>
                  <Celula className="whitespace-nowrap text-xs tabular-nums text-slate-500">
                    {new Date(l.criado_em).toLocaleString("pt-BR")}
                  </Celula>
                  <Celula className="text-xs">{l.usuario_email ?? "—"}</Celula>
                  <Celula>
                    <Badge tom={l.acao === "LOGIN" ? "neutro" : "info"}>{rotularEnum(l.acao)}</Badge>
                  </Celula>
                  <Celula className="font-mono text-xs">{l.entidade}</Celula>
                  <Celula className="font-mono text-[10px] text-slate-400">{l.entidade_id ?? "—"}</Celula>
                </tr>
              ))}
            </Tabela>
          </div>
        )}
      </Card>
    </>
  );
}
