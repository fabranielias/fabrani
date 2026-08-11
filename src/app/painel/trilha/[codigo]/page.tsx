import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BookOpen, Download, ExternalLink, FileText, Lock, Plus, Scale } from "lucide-react";
import { Badge, Barra, Card, TituloPagina, Vazio } from "@/components/ui";
import { EnvioArquivos } from "@/components/EnvioArquivos";
import { FormularioPasso } from "./FormularioPasso";
import { entidadePorSlug } from "@/lib/registry";
import { carregarOpcoesRef, listar, obter } from "@/lib/crud";
import { alvoValido, documentosDoAlvo, type DocumentoVinculado } from "@/lib/acervo";
import { storageConfigurado } from "@/lib/storage";
import { query } from "@/lib/db";
import { podeEscrever, sessaoAtual } from "@/lib/session";
import { calcularProgresso, listarPassos, obterPasso, resolvido, ROTULO_BLOCO } from "@/lib/trilha";
import { formatarData, rotularEnum } from "@/lib/utils";

export const dynamic = "force-dynamic";

const CATEGORIAS = entidadePorSlug("documento")?.campos.find((c) => c.nome === "categoria")?.opcoes ?? [];

function Documentos({ documentos }: { documentos: DocumentoVinculado[] }) {
  if (documentos.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2">
      {documentos.map((doc) => (
        <li
          key={doc.vinculo_id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm"
        >
          <FileText size={15} className="shrink-0 text-slate-400" aria-hidden />
          <Link href={`/painel/documentos/${doc.documento_id}`} className="min-w-0 flex-1 truncate text-slate-800 hover:underline">
            {doc.nome_exibicao}
          </Link>
          {doc.categoria ? <Badge>{rotularEnum(doc.categoria)}</Badge> : null}
          <span className="text-[11px] text-slate-500">v{doc.versao}</span>
          {doc.valido_ate ? (
            <Badge tom={new Date(doc.valido_ate) < new Date() ? "risco" : "ok"}>
              até {formatarData(doc.valido_ate)}
            </Badge>
          ) : null}
          <a
            href={`/api/documentos/${doc.documento_id}/download`}
            className="inline-flex items-center gap-1 text-xs text-cyan-600 hover:underline"
          >
            <Download size={13} aria-hidden /> baixar
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function PassoPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const passo = await obterPasso(decodeURIComponent(codigo));
  if (!passo) notFound();

  const doBloco = await listarPassos({ bloco: passo.bloco });
  const indice = doBloco.findIndex((p) => p.id === passo.id);
  const progresso = calcularProgresso(doBloco);
  const anterior = indice > 0 ? doBloco[indice - 1] : null;

  if (passo.bloco === "C") {
    const blocoA = await listarPassos({ bloco: "A" });
    if (calcularProgresso(blocoA).pendentes > 0) {
      return (
        <>
          <TituloPagina titulo="Cursos ainda bloqueados" descricao={ROTULO_BLOCO.C} />
          <Card>
            <div className="flex items-start gap-3">
              <Lock size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
              <p className="text-sm leading-relaxed text-slate-700">
                Os passos dos cursos abrem depois que o Bloco A estiver percorrido: os dados da IES e da mantenedora
                alimentam o PPC, os atos e o corpo docente. Volte ao Bloco A e responda os itens que faltam — se um
                documento não existir, marque “não há” e siga.
              </p>
            </div>
            <Link
              href="/painel/trilha?bloco=A"
              className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-4 py-2 text-sm font-medium text-slate-50"
            >
              Ir para o Bloco A
            </Link>
          </Card>
        </>
      );
    }
  }

  const entidade = passo.entidade_slug ? entidadePorSlug(passo.entidade_slug) : null;
  const campos =
    passo.tipo === "DADOS" && entidade
      ? entidade.campos.filter((c) => (passo.campos.length === 0 ? true : passo.campos.includes(c.nome)))
      : [];
  const registro = entidade && passo.registro_id ? ((await obter(entidade, passo.registro_id)) ?? undefined) : undefined;
  const opcoes = entidade && passo.tipo === "DADOS" ? await carregarOpcoesRef(entidade) : {};

  const registros = passo.tipo === "REGISTROS" && entidade ? await listar(entidade, { limite: 100 }) : [];

  const documentos =
    passo.alvo_tipo && passo.alvo_id && alvoValido(passo.alvo_tipo)
      ? await documentosDoAlvo(passo.alvo_tipo, passo.alvo_id, passo.categoria_documento ?? undefined)
      : [];

  const evidenciasEsperadas =
    passo.tipo === "INDICADOR" && passo.alvo_id
      ? await query<{ id: string; titulo: string; obrigatorio: boolean }>(
          "select id, titulo, obrigatorio from requisito_evidencia where indicador_id = $1 order by titulo",
          [passo.alvo_id],
        )
      : [];

  const requisitosLegais =
    passo.tipo === "REQUISITO_LEGAL"
      ? await query<{ id: string; codigo: string; titulo: string; base_legal: string | null }>(
          `select r.id, r.codigo, r.titulo, r.base_legal from requisito_legal r
             join instrumento i on i.id = r.instrumento_id
            where i.codigo = 'CURSO-2017' and r.aplica_ead order by r.codigo`,
        )
      : [];

  const escrita = podeEscrever(sessao);
  const hrefAnterior = anterior ? `/painel/trilha/${anterior.codigo}` : `/painel/trilha?bloco=${passo.bloco}`;

  return (
    <>
      <TituloPagina
        titulo={passo.titulo}
        descricao={passo.secao}
        acao={
          <Link href={`/painel/trilha?bloco=${passo.bloco}`} className="text-xs text-slate-500 hover:text-slate-900">
            ver todos os passos
          </Link>
        }
      />

      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-slate-500">
          <span>
            {ROTULO_BLOCO[passo.bloco]} · passo {indice + 1} de {doBloco.length}
          </span>
          <span className="tabular-nums">{progresso.percentual}%</span>
        </div>
        <Barra valor={progresso.percentual} tom={progresso.percentual === 100 ? "ok" : "info"} />
      </div>

      {passo.status ? (
        <p className="mb-5 rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-700 ring-1 ring-slate-200">
          Respondido como{" "}
          <strong>
            {passo.status === "CONCLUIDO" ? "entregue" : passo.status === "NAO_HA" ? "não há" : "não se aplica"}
          </strong>{" "}
          por {passo.respondido_por ?? "—"} em {passo.respondido_em ?? "—"}
          {passo.observacao ? ` · ${passo.observacao}` : ""}
          {passo.vencido ? " · atenção: há evidência vencida neste item." : ""}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {passo.explicacao ? (
            <Card>
              <div className="flex items-start gap-3">
                <BookOpen size={17} className="mt-0.5 shrink-0 text-cyan-500" aria-hidden />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">Por que o MEC pede</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{passo.explicacao}</p>
                  {passo.base_legal ? (
                    <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <Scale size={13} aria-hidden /> {passo.base_legal}
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>
          ) : null}

          {passo.tipo === "REGISTROS" && entidade ? (
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="fonte-display text-sm font-semibold text-slate-900">
                  {entidade.rotulo} cadastrados ({registros.length})
                </h2>
                <div className="flex gap-2">
                  <Link
                    href={`/painel/dados/${entidade.slug}/novo`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <Plus size={13} aria-hidden /> Cadastrar
                  </Link>
                  <Link
                    href={`/painel/dados/${entidade.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink size={13} aria-hidden /> Abrir lista completa
                  </Link>
                </div>
              </div>
              {registros.length === 0 ? (
                <Vazio
                  titulo="Nada cadastrado ainda"
                  descricao="Cadastre pelo menos um registro ou marque “não há” para seguir na trilha."
                />
              ) : (
                <ul className="divide-y divide-slate-200/60 text-sm">
                  {registros.map((linha) => (
                    <li key={String(linha.id)} className="py-2">
                      <Link
                        href={`/painel/dados/${entidade.slug}/${String(linha.id)}`}
                        className="text-slate-800 hover:underline"
                      >
                        {String(linha[entidade.campoTitulo] ?? "(sem título)")}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ) : null}

          {passo.tipo === "REQUISITO_LEGAL" ? (
            <Card>
              <h2 className="fonte-display mb-3 text-sm font-semibold text-slate-900">
                Requisitos de atendimento obrigatório ({requisitosLegais.length})
              </h2>
              <ul className="space-y-2 text-sm">
                {requisitosLegais.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 bg-white/60 px-3 py-2">
                    <p className="text-slate-800">
                      <span className="text-slate-500">{r.codigo}</span> · {r.titulo}
                    </p>
                    {r.base_legal ? <p className="mt-0.5 text-[11px] text-slate-500">{r.base_legal}</p> : null}
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <h2 className="fonte-display mb-4 text-sm font-semibold text-slate-900">
              {passo.tipo === "DADOS" ? "Preencha os dados" : "Registre este passo"}
            </h2>
            <FormularioPasso
              codigo={passo.codigo}
              campos={campos}
              registro={registro}
              opcoes={opcoes}
              aceitaNsa={passo.aceita_nsa}
              jaRespondido={resolvido(passo) || passo.status !== null}
              observacaoAtual={passo.observacao}
              hrefAnterior={hrefAnterior}
              somenteLeitura={!escrita}
            />
          </Card>
        </div>

        <div className="space-y-5">
          {passo.alvo_tipo && passo.alvo_id ? (
            <Card>
              <h2 className="fonte-display text-sm font-semibold text-slate-900">Evidências deste item</h2>
              <p className="mt-1 mb-4 text-xs leading-relaxed text-slate-500">
                O arquivo vai para o acervo único da FABRANI, já vinculado a este item — o Sócrates encontra por aqui.
                {passo.exige_validade ? " Informe a data de validade: o passo reabre sozinho quando vencer." : ""}
              </p>
              <EnvioArquivos
                alvoTipo={passo.alvo_tipo}
                alvoId={passo.alvo_id}
                categorias={CATEGORIAS}
                categoriaPadrao={passo.categoria_documento ?? undefined}
                storageAtivo={storageConfigurado()}
                desabilitado={!escrita}
                compacto
              />
              <Documentos documentos={documentos} />
            </Card>
          ) : null}

          {evidenciasEsperadas.length > 0 ? (
            <Card>
              <h2 className="fonte-display mb-3 text-sm font-semibold text-slate-900">O que a comissão procura</h2>
              <ul className="space-y-2 text-xs leading-relaxed text-slate-600">
                {evidenciasEsperadas.map((e) => (
                  <li key={e.id} className="flex items-start gap-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-cyan-400" aria-hidden />
                    <span>
                      {e.titulo}
                      {e.obrigatorio ? null : <span className="text-slate-400"> (desejável)</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
