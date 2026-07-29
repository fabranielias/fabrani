import Link from "next/link";
import { sessaoAtual } from "@/lib/session";
import { query } from "@/lib/db";
import { llmConfigurado, orcamento } from "@/lib/socrates/llm";
import { totalDispositivos } from "@/lib/socrates/corpus";
import { modelosDisponiveis } from "@/lib/socrates/agente";
import { Badge, Card, CardTitulo, Metrica, TituloPagina, Vazio } from "@/components/ui";
import { CaixaPedido } from "./CaixaPedido";
import { CaixaPergunta } from "./CaixaPergunta";
import { GeradorDocumento } from "./GeradorDocumento";
import { sincronizarRegrasAction, tratarSugestaoAction } from "./acoes";

export const dynamic = "force-dynamic";

type Sugestao = {
  id: string;
  alvo_tipo: string;
  severidade: string;
  titulo: string;
  mensagem: string;
  criado_em: string;
};

type Execucao = {
  id: string;
  pedido: string;
  resumo: string | null;
  status: string;
  criado_em: string;
  acoes: number;
};

function tomDaSeveridade(s: string) {
  return s === "RISCO" ? "risco" : s === "ATENCAO" ? "atencao" : "info";
}

export default async function SocratesPage() {
  const sessao = await sessaoAtual();

  const sugestoes = await query<Sugestao>(
    `select id, alvo_tipo, severidade, titulo, mensagem, to_char(criado_em, 'DD/MM') as criado_em
       from socrates_sugestao
      where status = 'ABERTA' and origem in ('REGRA','RADAR')
      order by case severidade when 'RISCO' then 0 when 'ATENCAO' then 1 else 2 end, criado_em desc
      limit 40`,
  );
  const contagem = await query<{ severidade: string; n: string }>(
    `select severidade, count(*)::text as n from socrates_sugestao
      where status = 'ABERTA' and origem in ('REGRA','RADAR') group by severidade`,
  );
  const execucoes = await query<Execucao>(
    `select e.id, e.pedido, e.resumo, e.status, to_char(e.criado_em, 'DD/MM HH24:MI') as criado_em,
            (select count(*) from socrates_acao a where a.execucao_id = e.id)::int as acoes
       from socrates_execucao e order by e.criado_em desc limit 12`,
  );
  const colegiados = await query<{ id: string; nome: string; tipo: string }>(
    `select id, nome, tipo from colegiado where situacao = 'ATIVO' order by tipo, nome`,
  );

  const modelos = await modelosDisponiveis();
  const dispositivos = await totalDispositivos();
  const { usados, teto } = await orcamento();
  const temChave = llmConfigurado();

  const risco = Number(contagem.find((c) => c.severidade === "RISCO")?.n ?? 0);
  const atencao = Number(contagem.find((c) => c.severidade === "ATENCAO")?.n ?? 0);
  const podeEscrever = sessao?.papel !== "AUDITOR" && sessao?.papel !== "DOCENTE";

  return (
    <div className="space-y-6">
      <TituloPagina
        titulo="Sócrates"
        descricao="Avaliador sênior residente: verifica conformidade sem custo, cita a norma, redige e preenche o sistema mediante aprovação."
        acao={
          podeEscrever ? (
            <form action={sincronizarRegrasAction}>
              <button className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
                Reavaliar agora
              </button>
            </form>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica rotulo="Riscos abertos" valor={risco} detalhe="corrigir antes da visita" tom="risco" />
        <Metrica rotulo="Pontos de atenção" valor={atencao} detalhe="camada sem custo" tom="atencao" />
        <Metrica rotulo="Dispositivos no corpus" valor={dispositivos} detalhe="busca em português" tom="info" />
        <Metrica
          rotulo="Tokens no mês"
          valor={usados.toLocaleString("pt-BR")}
          detalhe={temChave ? `teto ${teto.toLocaleString("pt-BR")}` : "sem chave — só camadas grátis"}
          tom={temChave ? "ok" : "neutro"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardTitulo
              titulo="Peça ao Sócrates"
              descricao='Ex.: "preencha a análise do indicador 1.2 do ciclo institucional", "cadastre o polo de Ribeirão Preto", "abra as pendências do Censo".'
            />
            <CaixaPedido habilitado={Boolean(podeEscrever)} />
          </Card>

          <Card>
            <CardTitulo
              titulo="Bom dia, Sócrates"
              descricao="O que um avaliador apontaria hoje. Gerado por regras determinísticas — sem consumo de token."
            />
            {sugestoes.length === 0 ? (
              <Vazio titulo="Nada pendente" descricao="Nenhuma inconsistência detectada pelas regras." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {sugestoes.map((s) => (
                  <li key={s.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tom={tomDaSeveridade(s.severidade)}>{s.severidade}</Badge>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">{s.alvo_tipo}</span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-900">{s.titulo}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{s.mensagem}</p>
                    </div>
                    {podeEscrever ? (
                      <form action={tratarSugestaoAction} className="shrink-0">
                        <input type="hidden" name="sugestao_id" value={s.id} />
                        <input type="hidden" name="status" value="DESCARTADA" />
                        <button className="text-xs text-slate-500 hover:text-slate-900">dispensar</button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitulo titulo="Consultar a norma" descricao="Resposta com citação do corpus normativo carregado." />
            <CaixaPergunta />
          </Card>

          <Card>
            <CardTitulo titulo="Gerar documento" descricao="Ata de CPA/NDE/equipe multidisciplinar, ofício, ato e resposta a diligência." />
            <GeradorDocumento
              habilitado={Boolean(podeEscrever)}
              modelos={modelos.map((m) => ({ tipo: m.tipo, titulo: m.titulo }))}
              colegiados={colegiados}
            />
          </Card>

          <Card>
            <CardTitulo titulo="Execuções" descricao="Todo preenchimento passa por plano, diff e aceite." />
            {execucoes.length === 0 ? (
              <Vazio titulo="Nenhuma execução ainda" />
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {execucoes.map((e) => (
                  <li key={e.id} className="py-2.5">
                    <Link href={`/painel/socrates/execucao/${e.id}`} className="block hover:opacity-80">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-slate-900">{e.pedido}</span>
                        <Badge tom={e.status === "APLICADA" ? "ok" : e.status === "ERRO" ? "risco" : "info"}>
                          {e.status}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {e.acoes} ação(ões) · {e.criado_em}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
