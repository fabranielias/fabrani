import { notFound } from "next/navigation";
import { queryOne } from "@/lib/db";
import { Badge, Botao, Card, TituloPagina } from "@/components/ui";

export const dynamic = "force-dynamic";

type Documento = {
  id: string;
  titulo: string;
  categoria: string | null;
  status: string;
  descricao: string | null;
  criado_por: string | null;
  criado_em: string;
  corpo_markdown: string | null;
  gerado_por_socrates: boolean;
  storage_path: string | null;
};

export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await queryOne<Documento>(
    `select id, titulo, categoria, status, descricao, criado_por,
            to_char(criado_em, 'DD/MM/YYYY HH24:MI') as criado_em,
            corpo_markdown, gerado_por_socrates, storage_path
       from documento where id = $1`,
    [id],
  );
  if (!doc) notFound();

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo={doc.titulo}
        descricao={doc.descricao ?? undefined}
        acao={<Botao href="/painel/documentos" variante="secundario">Voltar ao acervo</Botao>}
      />

      <div className="flex flex-wrap gap-2">
        <Badge tom={doc.status === "VIGENTE" ? "ok" : "neutro"}>{doc.status}</Badge>
        {doc.categoria ? <Badge>{doc.categoria}</Badge> : null}
        {doc.gerado_por_socrates ? <Badge tom="info">Rascunho gerado pelo Sócrates</Badge> : null}
        <Badge>Criado em {doc.criado_em}</Badge>
        {doc.criado_por ? <Badge>{doc.criado_por}</Badge> : null}
      </div>

      {doc.corpo_markdown ? (
        <Card>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
            {doc.corpo_markdown}
          </pre>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-slate-600">
            {doc.storage_path
              ? "Este documento é um arquivo enviado ao acervo; use o acervo para baixá-lo."
              : "Documento sem conteúdo textual."}
          </p>
        </Card>
      )}

      {doc.gerado_por_socrates ? (
        <p className="text-xs text-slate-500">
          Rascunho: revise, complete os campos marcados com [INFORMAR: …] e altere o status para VIGENTE somente após a
          aprovação do colegiado competente.
        </p>
      ) : null}
    </div>
  );
}
