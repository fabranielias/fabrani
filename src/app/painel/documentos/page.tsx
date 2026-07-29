import Link from "next/link";
import { Badge, Card, CardTitulo, Celula, Metrica, Tabela, TituloPagina, Vazio } from "@/components/ui";
import { FormularioUpload } from "./FormularioUpload";
import { query, queryOne } from "@/lib/db";
import { entidadePorSlug } from "@/lib/registry";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { storageConfigurado } from "@/lib/storage";
import { diasAte, formatarData, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DocumentosPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; duplicado?: string }>;
}) {
  const { enviado, duplicado } = await searchParams;

  const [documentos, cursos, polos, sessao, resumo] = await Promise.all([
    query<{
      id: string;
      titulo: string;
      categoria: string | null;
      versao: number;
      status: string;
      valido_ate: string | null;
      sha256: string | null;
      curso_nome: string | null;
      vinculos: string;
    }>(
      `select d.id, d.titulo, d.categoria, d.versao, d.status, d.valido_ate, d.sha256, c.nome as curso_nome,
              (select count(*) from evidencia_vinculo v where v.documento_id = d.id)::text as vinculos
         from documento d left join curso c on c.id = d.curso_id
        order by d.criado_em desc limit 200`,
    ),
    query<{ id: string; nome: string }>("select id, nome from curso order by nome"),
    query<{ id: string; nome: string }>("select id, nome from polo order by nome"),
    sessaoAtual(),
    queryOne<{ total: string; vigentes: string; vencidos: string; sem_vinculo: string }>(
      `select count(*)::text as total,
              count(*) filter (where status = 'VIGENTE')::text as vigentes,
              count(*) filter (where valido_ate is not null and valido_ate < current_date)::text as vencidos,
              count(*) filter (where not exists (select 1 from evidencia_vinculo v where v.documento_id = documento.id))::text as sem_vinculo
         from documento`,
    ),
  ]);

  const categorias = entidadePorSlug("documento")?.campos.find((c) => c.nome === "categoria")?.opcoes ?? [];

  return (
    <>
      <TituloPagina
        titulo="Acervo de evidências"
        descricao="Cada documento recebe hash SHA-256, versão e validade. As evidências alimentam os indicadores e o dossiê de visita."
      />

      {enviado ? (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 ring-1 ring-emerald-200">
          Documento registrado.
        </p>
      ) : null}
      {duplicado ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          Atenção: já existe documento com o mesmo hash — “{duplicado}”.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metrica rotulo="Documentos" valor={resumo?.total ?? "0"} />
        <Metrica rotulo="Vigentes" valor={resumo?.vigentes ?? "0"} tom="ok" />
        <Metrica rotulo="Vencidos" valor={resumo?.vencidos ?? "0"} detalhe="Reabrem lacunas" tom="risco" />
        <Metrica rotulo="Sem vínculo" valor={resumo?.sem_vinculo ?? "0"} detalhe="Nenhum indicador aponta" tom="atencao" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardTitulo titulo="Enviar documento" descricao="Versione sempre a partir do documento anterior para preservar o histórico." />
          <FormularioUpload
            cursos={cursos}
            polos={polos}
            documentos={documentos.map((d) => ({ id: d.id, titulo: d.titulo }))}
            categorias={categorias}
            somenteLeitura={!podeEscrever(sessao)}
            storageAtivo={storageConfigurado()}
          />
        </Card>

        <Card className="xl:col-span-3" padding={false}>
          <div className="border-b border-slate-200 px-5 py-4">
            <CardTitulo titulo="Documentos" />
          </div>
          {documentos.length === 0 ? (
            <div className="p-6">
              <Vazio titulo="Nenhum documento no acervo" />
            </div>
          ) : (
            <div className="px-2 py-1">
              <Tabela cabecalho={["Documento", "Categoria", "v.", "Validade", "Vínculos", "Status", ""]}>
                {documentos.map((d) => {
                  const dias = diasAte(d.valido_ate);
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <Celula>
                        <p className="text-slate-900">{d.titulo}</p>
                        {d.curso_nome ? <p className="text-[11px] text-slate-500">{d.curso_nome}</p> : null}
                        {d.sha256 ? (
                          <p className="font-mono text-[10px] text-slate-400">{d.sha256.slice(0, 16)}…</p>
                        ) : null}
                      </Celula>
                      <Celula className="text-xs">{d.categoria ? rotularEnum(d.categoria) : "—"}</Celula>
                      <Celula className="tabular-nums">{d.versao}</Celula>
                      <Celula>
                        {d.valido_ate ? (
                          <Badge tom={dias !== null && dias < 0 ? "risco" : dias !== null && dias < 60 ? "atencao" : "ok"}>
                            {formatarData(d.valido_ate)}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </Celula>
                      <Celula className="tabular-nums">{d.vinculos}</Celula>
                      <Celula>
                        <Badge tom={d.status === "VIGENTE" ? "ok" : d.status === "SUPERADO" ? "neutro" : "atencao"}>
                          {rotularEnum(d.status)}
                        </Badge>
                      </Celula>
                      <Celula className="text-right">
                        <Link href={`/painel/dados/documento/${d.id}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">
                          editar
                        </Link>
                      </Celula>
                    </tr>
                  );
                })}
              </Tabela>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
