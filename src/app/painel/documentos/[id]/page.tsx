import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { opcoesDeAlvo, vinculosDoDocumento } from "@/lib/acervo";
import { query, queryOne } from "@/lib/db";
import { entidadePorSlug } from "@/lib/registry";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { storageConfigurado } from "@/lib/storage";
import { formatarData, formatarTamanho, rotularEnum } from "@/lib/utils";
import { Badge, Botao, Card, CardTitulo, TituloPagina } from "@/components/ui";
import { EnvioArquivos } from "@/components/EnvioArquivos";
import { desvincularDocumentoAction } from "../acoes";
import { ExcluirDocumento } from "./ExcluirDocumento";
import { FormularioDocumento } from "./FormularioDocumento";
import { SeletorVinculo } from "./SeletorVinculo";

export const dynamic = "force-dynamic";

type Documento = {
  id: string;
  titulo: string;
  nome_exibicao: string | null;
  categoria: string | null;
  pasta: string | null;
  tags: string[] | null;
  status: string;
  descricao: string | null;
  criado_por: string | null;
  criado_em: string;
  corpo_markdown: string | null;
  gerado_por_socrates: boolean;
  storage_path: string | null;
  nome_arquivo: string | null;
  mime_type: string | null;
  tamanho_bytes: string | null;
  sha256: string | null;
  versao: number;
  documento_pai_id: string | null;
  valido_de: string | null;
  valido_ate: string | null;
  curso_id: string | null;
  polo_id: string | null;
};

export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await queryOne<Documento>(
    `select id, titulo, nome_exibicao, categoria, pasta, tags, status, descricao, criado_por,
            to_char(criado_em, 'DD/MM/YYYY HH24:MI') as criado_em, corpo_markdown, gerado_por_socrates,
            storage_path, nome_arquivo, mime_type, tamanho_bytes::text as tamanho_bytes, sha256, versao,
            documento_pai_id, valido_de, valido_ate, curso_id, polo_id
       from documento where id = $1 and excluido_em is null`,
    [id],
  );
  if (!doc) notFound();

  const [sessao, vinculos, grupos, cursos, polos, versoes, acessos] = await Promise.all([
    sessaoAtual(),
    vinculosDoDocumento(id),
    opcoesDeAlvo(),
    query<{ id: string; rotulo: string }>("select id, nome as rotulo from curso order by nome"),
    query<{ id: string; rotulo: string }>("select id, nome as rotulo from polo order by nome"),
    query<{ id: string; nome: string; versao: number; status: string; criado_em: string }>(
      `with recursive familia as (
         select id, documento_pai_id from documento where id = $1
         union
         select d.id, d.documento_pai_id from documento d join familia f on d.id = f.documento_pai_id
       )
       select d.id, coalesce(d.nome_exibicao, d.titulo) as nome, d.versao, d.status,
              to_char(d.criado_em, 'DD/MM/YYYY') as criado_em
         from documento d
        where d.id in (select id from familia) or d.documento_pai_id in (select id from familia)
        order by d.versao desc`,
      [id],
    ),
    query<{ acao: string; usuario_email: string | null; criado_em: string }>(
      `select acao, usuario_email, to_char(criado_em, 'DD/MM/YYYY HH24:MI') as criado_em
         from documento_acesso where documento_id = $1 order by criado_em desc limit 10`,
      [id],
    ),
  ]);

  const nome = doc.nome_exibicao ?? doc.titulo;
  const somenteLeitura = !podeEscrever(sessao);
  const categorias = entidadePorSlug("documento")?.campos.find((c) => c.nome === "categoria")?.opcoes ?? [];

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo={nome}
        descricao={doc.descricao ?? undefined}
        acao={
          <div className="flex gap-2">
            {doc.storage_path ? (
              <a
                href={`/api/documentos/${doc.id}/download`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.7)]"
              >
                <Download size={15} aria-hidden /> Baixar arquivo
              </a>
            ) : null}
            <Botao href="/painel/documentos" variante="secundario">
              Voltar ao acervo
            </Botao>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge tom={doc.status === "VIGENTE" ? "ok" : doc.status === "SUPERADO" ? "neutro" : "atencao"}>
          {rotularEnum(doc.status)}
        </Badge>
        <Badge>versão {doc.versao}</Badge>
        {doc.categoria ? <Badge>{rotularEnum(doc.categoria)}</Badge> : null}
        {doc.pasta ? <Badge>{doc.pasta}</Badge> : null}
        {(doc.tags ?? []).map((t) => (
          <Badge key={t} tom="info">
            {t}
          </Badge>
        ))}
        {doc.gerado_por_socrates ? <Badge tom="info">Rascunho do Sócrates</Badge> : null}
        <Badge>Criado em {doc.criado_em}</Badge>
        {doc.criado_por ? <Badge>{doc.criado_por}</Badge> : null}
      </div>

      {!doc.storage_path && !doc.corpo_markdown ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          Este registro não tem arquivo anexado nem conteúdo — envie o arquivo abaixo para que ele valha como
          evidência perante o MEC.
        </p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="space-y-4 xl:col-span-3">
          <Card>
            <CardTitulo titulo="Dados do documento" descricao="Renomeie, classifique e defina a validade." />
            <FormularioDocumento
              documento={doc}
              categorias={categorias}
              cursos={cursos}
              polos={polos}
              somenteLeitura={somenteLeitura}
            />
          </Card>

          {doc.corpo_markdown ? (
            <Card>
              <CardTitulo titulo="Conteúdo" />
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                {doc.corpo_markdown}
              </pre>
            </Card>
          ) : null}

          <Card>
            <CardTitulo
              titulo="Vínculos de evidência"
              descricao="Onde este documento comprova alguma exigência."
            />
            {vinculos.length === 0 ? (
              <p className="mb-3 text-xs text-slate-500">Ainda sem vínculo — o documento não conta como evidência.</p>
            ) : (
              <ul className="mb-3 space-y-1.5">
                {vinculos.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="text-[11px] uppercase tracking-wide text-slate-400">
                        {rotularEnum(v.alvo_tipo)}
                      </span>
                      <span className="block truncate text-slate-800">{v.rotulo}</span>
                    </span>
                    <form action={desvincularDocumentoAction}>
                      <input type="hidden" name="vinculo_id" value={v.id} />
                      <input type="hidden" name="documento_id" value={doc.id} />
                      <button
                        type="submit"
                        disabled={somenteLeitura}
                        className="text-xs text-slate-400 hover:text-rose-500 disabled:opacity-50"
                      >
                        remover
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <SeletorVinculo documentoId={doc.id} grupos={grupos} desabilitado={somenteLeitura} />
          </Card>
        </div>

        <div className="space-y-4 xl:col-span-2">
          <Card>
            <CardTitulo titulo="Arquivo" />
            {doc.storage_path ? (
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Nome original</dt>
                  <dd className="truncate text-slate-800">{doc.nome_arquivo}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tamanho</dt>
                  <dd className="text-slate-800">{formatarTamanho(doc.tamanho_bytes)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tipo</dt>
                  <dd className="text-slate-800">{doc.mime_type ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Validade</dt>
                  <dd className="text-slate-800">
                    {doc.valido_de || doc.valido_ate
                      ? `${formatarData(doc.valido_de)} → ${formatarData(doc.valido_ate)}`
                      : "—"}
                  </dd>
                </div>
                {doc.sha256 ? (
                  <div className="pt-1">
                    <dt className="text-slate-500">SHA-256</dt>
                    <dd className="break-all font-mono text-[10px] text-slate-500">{doc.sha256}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-xs text-slate-500">Nenhum arquivo anexado a este registro.</p>
            )}
          </Card>

          <Card>
            <CardTitulo
              titulo="Nova versão"
              descricao="O arquivo enviado aqui vira a versão seguinte, herda os vínculos e marca esta como superada."
            />
            <EnvioArquivos
              documentoPaiId={doc.id}
              categoriaPadrao={doc.categoria ?? undefined}
              categorias={categorias}
              desabilitado={somenteLeitura}
              storageAtivo={storageConfigurado()}
              compacto
            />
          </Card>

          <Card>
            <CardTitulo titulo="Versões" />
            <ul className="space-y-1 text-xs">
              {versoes.map((v) => (
                <li key={v.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/painel/documentos/${v.id}`}
                    className={v.id === doc.id ? "font-medium text-slate-900" : "text-slate-600 hover:text-cyan-600"}
                  >
                    v{v.versao} · {v.nome}
                  </Link>
                  <span className="shrink-0 text-slate-400">{v.criado_em}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardTitulo titulo="Histórico de acesso" />
            {acessos.length === 0 ? (
              <p className="text-xs text-slate-500">Sem registros.</p>
            ) : (
              <ul className="space-y-1 text-xs text-slate-600">
                {acessos.map((a, i) => (
                  <li key={`${a.criado_em}-${i}`} className="flex justify-between gap-2">
                    <span>
                      {rotularEnum(a.acao)} · {a.usuario_email ?? "—"}
                    </span>
                    <span className="shrink-0 text-slate-400">{a.criado_em}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {sessao?.papel === "SUPERADMIN" ? <ExcluirDocumento id={doc.id} nome={nome} /> : null}
        </div>
      </div>
    </div>
  );
}
