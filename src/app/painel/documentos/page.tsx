import Link from "next/link";
import { Download, Search } from "lucide-react";
import { Badge, Card, CardTitulo, Celula, Metrica, Tabela, TituloPagina, Vazio } from "@/components/ui";
import { EnvioArquivos } from "@/components/EnvioArquivos";
import { query, queryOne } from "@/lib/db";
import { entidadePorSlug } from "@/lib/registry";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { storageConfigurado } from "@/lib/storage";
import { diasAte, formatarData, formatarTamanho, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Filtros = {
  busca?: string;
  categoria?: string;
  status?: string;
  validade?: string;
  vinculo?: string;
  excluido?: string;
};

type LinhaDocumento = {
  id: string;
  nome: string;
  categoria: string | null;
  pasta: string | null;
  versao: number;
  status: string;
  valido_ate: string | null;
  sha256: string | null;
  nome_arquivo: string | null;
  tamanho_bytes: string | null;
  tem_arquivo: boolean;
  curso_nome: string | null;
  vinculos: string;
};

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<Filtros> }) {
  const filtros = await searchParams;

  const condicoes: string[] = ["d.excluido_em is null"];
  const params: unknown[] = [];

  if (filtros.busca?.trim()) {
    params.push(filtros.busca.trim());
    condicoes.push(
      `(d.busca @@ plainto_tsquery('portuguese', $${params.length}) or d.titulo ilike '%' || $${params.length} || '%' or d.nome_arquivo ilike '%' || $${params.length} || '%')`,
    );
  }
  if (filtros.categoria) {
    params.push(filtros.categoria);
    condicoes.push(`d.categoria = $${params.length}`);
  }
  if (filtros.status) {
    params.push(filtros.status);
    condicoes.push(`d.status = $${params.length}`);
  }
  if (filtros.validade === "vencido") condicoes.push("d.valido_ate is not null and d.valido_ate < current_date");
  if (filtros.validade === "vigente") condicoes.push("(d.valido_ate is null or d.valido_ate >= current_date)");
  if (filtros.vinculo === "sem") {
    condicoes.push("not exists (select 1 from evidencia_vinculo v where v.documento_id = d.id)");
  }

  const where = `where ${condicoes.join(" and ")}`;

  const [documentos, sessao, resumo] = await Promise.all([
    query<LinhaDocumento>(
      `select d.id, coalesce(d.nome_exibicao, d.titulo) as nome, d.categoria, d.pasta, d.versao, d.status,
              d.valido_ate, d.sha256, d.nome_arquivo, d.tamanho_bytes::text as tamanho_bytes,
              (d.storage_path is not null) as tem_arquivo, c.nome as curso_nome,
              (select count(*) from evidencia_vinculo v where v.documento_id = d.id)::text as vinculos
         from documento d left join curso c on c.id = d.curso_id
         ${where}
        order by d.criado_em desc limit 300`,
      params,
    ),
    sessaoAtual(),
    queryOne<{ total: string; vigentes: string; vencidos: string; sem_vinculo: string; sem_arquivo: string }>(
      `select count(*)::text as total,
              count(*) filter (where status = 'VIGENTE')::text as vigentes,
              count(*) filter (where valido_ate is not null and valido_ate < current_date)::text as vencidos,
              count(*) filter (where not exists (select 1 from evidencia_vinculo v where v.documento_id = documento.id))::text as sem_vinculo,
              count(*) filter (where storage_path is null)::text as sem_arquivo
         from documento where excluido_em is null`,
    ),
  ]);

  const categorias = entidadePorSlug("documento")?.campos.find((c) => c.nome === "categoria")?.opcoes ?? [];
  const storageAtivo = storageConfigurado();
  const somenteLeitura = !podeEscrever(sessao);

  return (
    <>
      <TituloPagina
        titulo="Acervo de evidências"
        descricao="Arquivos guardados no Supabase Storage, com nome próprio, hash SHA-256, versão e validade. Cada documento pode comprovar indicadores, cursos, polos, atos e prazos."
      />

      {filtros.excluido ? (
        <p className="mb-4 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
          Documento excluído. O registro permanece na auditoria.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Metrica rotulo="Documentos" valor={resumo?.total ?? "0"} />
        <Metrica rotulo="Vigentes" valor={resumo?.vigentes ?? "0"} tom="ok" />
        <Metrica rotulo="Vencidos" valor={resumo?.vencidos ?? "0"} detalhe="Reabrem lacunas" tom="risco" />
        <Metrica rotulo="Sem vínculo" valor={resumo?.sem_vinculo ?? "0"} detalhe="Nenhum alvo aponta" tom="atencao" />
        <Metrica rotulo="Sem arquivo" valor={resumo?.sem_arquivo ?? "0"} detalhe="Só metadado" tom="atencao" />
      </div>

      <Card className="mt-4">
        <CardTitulo
          titulo="Enviar documentos"
          descricao="Vários arquivos de uma vez: dê o nome de cada um, defina categoria, pasta e validade — o arquivo vai direto para o cofre no Supabase."
        />
        <EnvioArquivos
          categorias={categorias}
          desabilitado={somenteLeitura}
          storageAtivo={storageAtivo}
        />
      </Card>

      <Card className="mt-4" padding={false}>
        <div className="border-b border-slate-200 px-5 py-4">
          <CardTitulo titulo="Documentos" />
          <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" action="/painel/documentos">
            <div className="relative sm:col-span-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                name="busca"
                defaultValue={filtros.busca ?? ""}
                placeholder="Buscar por nome, descrição, tag…"
                aria-label="Buscar documentos"
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-400"
              />
            </div>
            <select
              name="categoria"
              defaultValue={filtros.categoria ?? ""}
              aria-label="Categoria"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
            >
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {rotularEnum(c)}
                </option>
              ))}
            </select>
            <select
              name="status"
              defaultValue={filtros.status ?? ""}
              aria-label="Situação"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
            >
              <option value="">Todas as situações</option>
              <option value="VIGENTE">Vigente</option>
              <option value="RASCUNHO">Rascunho</option>
              <option value="EM_APROVACAO">Em aprovação</option>
              <option value="SUPERADO">Superado</option>
            </select>
            <div className="flex gap-2">
              <select
                name="validade"
                defaultValue={filtros.validade ?? ""}
                aria-label="Validade"
                className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
              >
                <option value="">Validade</option>
                <option value="vigente">Dentro da validade</option>
                <option value="vencido">Vencidos</option>
              </select>
              <button
                type="submit"
                className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Filtrar
              </button>
            </div>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
            <Link href="/painel/documentos?vinculo=sem" className="hover:text-slate-900">
              ver só os sem vínculo
            </Link>
            <Link href="/painel/documentos" className="hover:text-slate-900">
              limpar filtros
            </Link>
            <span className="ml-auto">{documentos.length} documento(s)</span>
          </div>
        </div>

        {documentos.length === 0 ? (
          <div className="p-6">
            <Vazio
              titulo="Nenhum documento encontrado"
              descricao="Ajuste os filtros ou envie os primeiros arquivos do acervo."
            />
          </div>
        ) : (
          <div className="px-2 py-1">
            <Tabela cabecalho={["Documento", "Categoria", "v.", "Validade", "Vínculos", "Situação", ""]}>
              {documentos.map((d) => {
                const dias = diasAte(d.valido_ate);
                return (
                  <tr key={d.id}>
                    <Celula>
                      <Link href={`/painel/documentos/${d.id}`} className="text-slate-900 hover:text-cyan-600">
                        {d.nome}
                      </Link>
                      <p className="text-[11px] text-slate-500">
                        {[d.pasta, d.curso_nome, d.nome_arquivo, formatarTamanho(d.tamanho_bytes)]
                          .filter((p) => p && p !== "—")
                          .join(" · ")}
                      </p>
                      {!d.tem_arquivo ? (
                        <Badge tom="atencao">sem arquivo anexado</Badge>
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
                    <Celula className="whitespace-nowrap text-right">
                      {d.tem_arquivo ? (
                        <a
                          href={`/api/documentos/${d.id}/download`}
                          className="mr-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-cyan-600"
                        >
                          <Download size={13} aria-hidden /> baixar
                        </a>
                      ) : null}
                      <Link
                        href={`/painel/documentos/${d.id}`}
                        className="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >
                        abrir
                      </Link>
                    </Celula>
                  </tr>
                );
              })}
            </Tabela>
          </div>
        )}
      </Card>
    </>
  );
}
