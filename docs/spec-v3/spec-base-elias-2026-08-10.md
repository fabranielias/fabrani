# SPEC COMPLETA — Painel Regulatório MEC (mec.fabrani.com.br)

> Documento único de handoff: spec + 14 tarefas atômicas. Gerado em 2026-08-10.
> Fonte de verdade: specs/painel-regulatorio/ (spec.md + tasks/*.md).

---

# SPEC — Painel Regulatório MEC: Calendário, Fique de Atenção e Resolução Assistida

**Projeto:** mec.fabrani.com.br (Supabase project `MEC`, ref `xpcyrpzvxpcsldfjtksx`)
**Autor:** Elias Evangelista (spec redigida com mentor IA em 2026-08-10)
**Status:** SPEC APROVADA (2026-08-10) — implementação será agendada pelo Elias; não iniciar por conta própria
**Execução:** tarefas atômicas em `tasks/task-XX-*.md`, pensadas para execução por agente de IA

---

## 1. Visão

Transformar o sistema de "espelho dos instrumentos INEP" (estado atual: estrutura excelente,
dados operacionais vazios) em **cockpit operacional diário** da gestão regulatória, com três
elementos centrais no dashboard:

1. **Calendário MEC** — painel claro com todas as obrigações recorrentes do ano regulatório,
   cada uma com dono, prazo e status.
2. **Fique de Atenção** (painel VERMELHO) — lista viva dos gargalos reais da faculdade,
   gerada por regras do Sócrates. Nada entra à mão; tudo nasce de regra + dado.
3. **Como Resolver** — workspace de resolução por item: chat com o Sócrates (braço de
   resolução), upload de documentação, rodar pesquisa (CPA), gerar/enviar documento e
   marcar como resolvido — tudo dentro do próprio card, com trilha de auditoria.

## 2. Contexto do sistema hoje (levantado em 2026-08-10)

- Banco: 48 tabelas, RLS habilitado em todas **sem policies** (deny-by-default; acesso via
  backend com service key). Auth caseiro: `usuario.senha_hash` (bcrypt), papéis
  `SUPERADMIN`/`SECRETARIA`, sem 2FA.
- Populado: `instrumento` (3), `indicador` (130), `criterio_conceito` (650),
  `requisito_legal` (24), `requisito_evidencia` (141), `modelo_documento` (7),
  `prazo` (6 — todos sem responsável, sem recorrência), `socrates_sugestao` (125 — todas de
  UMA regra, `nsa_sem_justificativa`, sem dedupe).
- Vazio (gargalo): `documento` (1), `evidencia_vinculo` (0), `pessoa` (0),
  `enade_estudante` (0), `censo_pendencia` (0), `cpa_resultado` (0), `reuniao` (0),
  `colegiado_membro` (0), `socrates_acao` (0), `socrates_interacao` (0).
- Processo crítico em andamento: reconhecimento **e-MEC nº 202417965** (avaliação 227446),
  fase PARECER_SERES. Atos regulatórios com número/vigência "a conferir no e-MEC".
- Frontend: deployado em mec.fabrani.com.br (Vercel). **O código-fonte está no Git**
  (repo vinculado ao projeto Vercel); a task-00 clona e mapeia a arquitetura.

## 3. Os gargalos reais (fonte do painel "Fique de Atenção")

Cada item abaixo vira uma **regra do Sócrates** que gera cards no painel vermelho:

| # | Gargalo | Regra geradora (código) |
|---|---|---|
| G1 | Movimento em processo e-MEC / DOU sem tratamento | `processo_movimento_pendente` |
| G2 | Colegiado sem reunião no semestre (NDE, CPA, Colegiado, CONSU) | `colegiado_sem_reuniao` |
| G3 | Prazo do calendário sem responsável ou vencendo em ≤30 dias | `prazo_sem_dono` / `prazo_vencendo` |
| G4 | Indicador do instrumento sem evidência vinculada | `indicador_sem_evidencia` |
| G5 | Evidência com validade vencida (contratos, acervo, CI) | `evidencia_vencida` |
| G6 | Relatório CPA do ciclo não postado (limite 31/03) | `cpa_relatorio_pendente` |
| G7 | Pesquisa CPA do período não realizada | `cpa_pesquisa_pendente` |
| G8 | Módulo do Censo não iniciado/com pendências dentro da janela | `censo_modulo_pendente` |
| G9 | Concluinte ENADE sem inscrição/questionário (trava colação) | `enade_estudante_irregular` |
| G10 | Docente sem cadastro completo (titulação/regime/Lattes) | `docente_incompleto` |
| G11 | Ato regulatório com dados pendentes de conferência no e-MEC | `ato_dados_pendentes` |
| G12 | Aditamento e-MEC não protocolado (polo novo >60 dias, troca de coordenador, vagas) | `aditamento_pendente` |
| G13 | NSA sem justificativa (regra existente — manter, com dedupe) | `nsa_sem_justificativa` |

## 4. Requisitos funcionais (EARS)

### RF-A — Calendário MEC (dashboard)
- **A1.** QUANDO o usuário abrir o dashboard, O SISTEMA DEVE exibir o painel "Calendário
  MEC" com visão de 12 meses (linha do tempo ou grade mensal) de todos os `prazo`,
  coloridos por criticidade (ALTA=vermelho, MÉDIA=âmbar, BAIXA=cinza) e status.
- **A2.** ENQUANTO existir prazo sem `responsavel`, O SISTEMA DEVE exibi-lo com selo
  "SEM DONO" e gerar card G3 no Fique de Atenção.
- **A3.** O SISTEMA DEVE gerar automaticamente, a cada ano-referência, os prazos
  recorrentes do calendário-padrão (seed na task-02): Censo (preparação, coleta,
  conferência), CPA (pesquisa semestral, relatório até 31/03), ENADE (enquadramento,
  inscrições, questionários, prova), reuniões mínimas de colegiados (NDE ≥2/semestre,
  CPA ≥2/semestre, Colegiado ≥1/semestre, CONSU ≥1/semestre), vigências de atos e PDI.
- **A4.** QUANDO um prazo entrar em D-30/D-14/D-7/D-1, O SISTEMA DEVE notificar o
  responsável (e-mail sempre; WhatsApp se integração ativa) e escalar ao SUPERADMIN em D-7
  se não houver movimentação.
- **A5.** QUANDO o usuário clicar num prazo, O SISTEMA DEVE abrir o detalhe com base
  legal, histórico, evidências vinculadas e botão "Resolver" (abre o workspace RF-C).

### RF-B — Fique de Atenção (painel vermelho)
- **B1.** O dashboard DEVE exibir, acima da dobra, o painel "⚠ Fique de Atenção" em
  destaque vermelho com os cards ABERTOS de `socrates_sugestao`, agrupados por regra
  (ex.: "23 indicadores NSA sem justificativa" = 1 card expansível, não 23).
- **B2.** Cada card DEVE mostrar: título, severidade (RISCO/ATENÇÃO/INFO), origem
  (REGRA/LLM), contagem de itens agrupados, dono sugerido e botão "Resolver".
- **B3.** O motor de regras DEVE rodar 1×/dia (cron) e após qualquer mutação relevante,
  criando/fechando cards automaticamente (card fecha sozinho quando a condição da regra
  deixa de ser verdadeira).
- **B4.** O SISTEMA NÃO DEVE permitir fechar card manualmente sem justificativa
  registrada em `auditoria_log`.

### RF-C — Como Resolver (workspace de resolução)
- **C1.** QUANDO o usuário clicar em "Resolver" num card ou prazo, O SISTEMA DEVE abrir
  o workspace com: (a) chat com o Sócrates, (b) painel de ações, (c) linha do tempo do item.
- **C2.** O chat do Sócrates DEVE abrir já contextualizado (regra, dados do item, base
  legal, modelo de documento aplicável) e propor o caminho de resolução em passos.
- **C3.** O painel de ações DEVE oferecer, conforme o tipo do item:
  - **Subir documentação** — upload para Supabase Storage, cria `documento` +
    `evidencia_vinculo` ao indicador/requisito/prazo de origem;
  - **Rodar pesquisa** — dispara pesquisa CPA (task-08): cria questionário do ciclo,
    gera link público, acompanha respostas, consolida em `cpa_resultado`;
  - **Gerar e enviar documento** — instancia `modelo_documento` (ata, ofício, resposta
    a diligência), Sócrates preenche rascunho, usuário revisa, sistema gera PDF e
    registra envio/protocolo;
  - **Marcar como resolvido** — só habilita quando a ação exigida pela regra foi
    concluída (evidência anexada, pesquisa consolidada, documento enviado); grava em
    `socrates_acao` + `auditoria_log`.
- **C4.** TODA interação do chat DEVE ser persistida em `socrates_interacao` e debitada
  do `socrates_orcamento` do mês; QUANDO o orçamento atingir 90%, O SISTEMA DEVE avisar
  o SUPERADMIN e degradar para respostas por regra (sem LLM).
- **C5.** O colaborador com papel `SECRETARIA` DEVE conseguir executar todo o fluxo de
  resolução; ações destrutivas (excluir documento, reabrir item) exigem `SUPERADMIN`.

### RF-D — Robô e-MEC/DOU (alimenta G1 e G11)
- **D1.** O SISTEMA DEVE consultar diariamente (cron) a consulta pública do e-MEC para a
  IES (código e-MEC) e processos abertos, e a busca do DOU (Imprensa Nacional) por
  CNPJ/nome da mantenedora e nº dos processos.
- **D2.** QUANDO houver movimento novo, O SISTEMA DEVE criar `supervisao_ocorrencia` ou
  atualizar `processo_regulatorio`/`ato_regulatorio`, gerar card G1 e notificar
  imediatamente (WhatsApp + e-mail) o PI e o SUPERADMIN.
- **D3.** SE a fonte estiver indisponível ou o layout mudar, O SISTEMA DEVE registrar a
  falha e gerar card de ATENÇÃO "robô sem leitura há N dias" (nunca falhar em silêncio).

### RF-E — Cadastros que alimentam tudo
- **E1.** CRUD de docentes (`pessoa` + vínculo a curso/colegiado) com titulação, regime,
  link Lattes e documentos; importador CSV.
- **E2.** Importador Censo (CSV do sistema acadêmico) com validador que popula
  `censo_pendencia` (CPF inválido, vínculo duplicado, divergência e-MEC × Censo).
- **E3.** Gestão ENADE: lista de concluintes por edição (`enade_estudante`), status de
  inscrição/questionário/prova, flag de irregularidade com trava de colação.

## 5. Requisitos não-funcionais

- **Segurança (contexto sensível — ver task-01):** revogar EXECUTE público de
  `rls_auto_enable()`; extinguir a conta compartilhada `contato@` como SUPERADMIN
  (contas nominais); migrar auth caseiro → Supabase Auth com 2FA (task-13); menor
  privilégio por papel; todo acesso a documento passa por URL assinada com expiração.
- **Auditoria:** toda mutação relevante grava `auditoria_log` (quem, quando, o quê, antes/depois).
- **Custo IA:** teto mensal em `socrates_orcamento`; respostas por regra não consomem tokens.
- **Idioma:** todo o produto em pt-BR.

## 6. Ordem de execução (waves)

| Wave | Tasks | Entrega |
|---|---|---|
| 0 — Fundação | 00, 01 | Repo localizado; segurança imediata corrigida |
| 1 — Calendário | 02, 03 | Motor de prazos recorrentes + painel Calendário MEC |
| 2 — Atenção | 04, 05 | Motor de regras (13 regras) + painel vermelho |
| 3 — Resolução | 06, 07, 08, 09 | Workspace: chat Sócrates, upload de evidências, pesquisa CPA, geração/envio de documentos |
| 4 — Robô | 10 | Monitor e-MEC/DOU + notificações |
| 5 — Cadastros | 11, 12 | Docentes; Censo importador/validador; ENADE |
| 6 — Auth | 13 | Migração Supabase Auth + 2FA |

Dependências: 02→03; 04→05; (04,07)→06; 06 usa 08 e 09 como ações; 10 e 11–12
independentes após wave 0; 13 por último (mexe em toda sessão).

## 7. Fora de escopo (por decisão de foco — revisão de sexta)

- Multi-tenant / white-label para venda a outras IES (estacionamento de ideias).
- Integração automática com sistemas acadêmicos de terceiros (só CSV nesta fase).
- Assinatura digital ICP-Brasil/Gov.br de atas (fase futura; por ora PDF + registro).

## 8. Definição de pronto (global)

- Critérios EARS da task atendidos e demonstráveis na UI.
- Migration aplicada via `_migration` (idempotente, com rollback documentado).
- RLS/policies coerentes com o modelo de acesso do backend.
- `get_advisors` (security) sem WARN novo introduzido pela task.
- Registro em `auditoria_log` verificado para as mutações da task.
- Nenhuma credencial ou dado sensível em código, log ou commit.

---

# Tasks — Painel Regulatório MEC

Execução por agente de IA, **uma task por sessão/branch**, na ordem das waves.
Ler SEMPRE `../spec.md` antes de qualquer task. Não iniciar sem aprovação do Elias.

| Wave | Task | Título | Depende de |
|---|---|---|---|
| 0 | [task-00](task-00-localizar-repo.md) | Localizar e preparar o repositório | — |
| 0 | [task-01](task-01-seguranca-imediata.md) | Segurança imediata (1 dia) | 00 |
| 1 | [task-02](task-02-motor-prazos-recorrentes.md) | Motor de prazos recorrentes + seed calendário | 00 |
| 1 | [task-03](task-03-ui-calendario-mec.md) | UI Calendário MEC | 02 |
| 2 | [task-04](task-04-motor-regras-socrates.md) | Motor de regras Sócrates (13 regras) | 02 |
| 2 | [task-05](task-05-ui-fique-de-atencao.md) | UI Fique de Atenção (vermelho) | 04 |
| 3 | [task-06](task-06-workspace-resolucao.md) | Workspace "Como Resolver" (chat + ações) | 04, 07 |
| 3 | [task-07](task-07-repositorio-evidencias.md) | Repositório de evidências | 00 |
| 3 | [task-08](task-08-pesquisa-cpa.md) | Pesquisa CPA | 00 |
| 3 | [task-09](task-09-geracao-envio-documentos.md) | Geração e envio de documentos | 07 |
| 4 | [task-10](task-10-robo-emec-dou.md) | Robô e-MEC/DOU + WhatsApp | 00 |
| 5 | [task-11](task-11-docentes.md) | Docentes e colegiados | 00, 07 |
| 5 | [task-12](task-12-censo-enade.md) | Censo (importador/validador) + ENADE | 00, 11 |
| 6 | [task-13](task-13-migracao-auth.md) | Migração Supabase Auth + 2FA | todas |

**Ordem interna da wave 3:** 07 → 08/09 (paralelo) → 06 (o workspace consome as três).

## Regras de execução para o agente
1. Ler `spec.md` + a task inteira antes de escrever código.
2. Migrations idempotentes, registradas em `_migration`, com rollback documentado.
3. Rodar `get_advisors` (security) do Supabase ao final — zero WARN novo.
4. Toda mutação relevante → `auditoria_log`.
5. Nada de credencial em código/commit; env vars sempre.
6. Ao concluir: commit atômico + resumo do que foi feito e como verificar.

---

# Task 00 — Clonar o repositório e mapear a arquitetura

**Wave:** 0 · **Depende de:** nada · **Bloqueia:** todas as outras

## Contexto
O app está no ar em mec.fabrani.com.br (Vercel) com banco Supabase `MEC`
(ref `xpcyrpzvxpcsldfjtksx`). **O código-fonte está no Git** (repositório vinculado ao
projeto Vercel); a pasta local `C:\dev\fabrani\mec-fabrani` está vazia.

## Passos
1. Identificar a URL do repositório: via projeto Vercel vinculado (MCP `list_projects`/
   `get_project`) ou confirmar com o Elias.
2. Clonar para `C:\dev\fabrani\mec-fabrani` (conteúdo do repo na raiz da pasta);
   mover esta pasta `specs/` para dentro do repo e commitar.
3. Criar `.env.local` a partir das variáveis do projeto Vercel (NUNCA commitar).
4. Rodar o app localmente e confirmar login e dashboard funcionando.
5. Documentar em `docs/arquitetura.md`: framework, estrutura de pastas, como o backend
   fala com o Supabase (service key? API routes? edge functions?), onde ficam as
   páginas do dashboard e como o Sócrates chama o LLM hoje.

## Critérios de aceite
- Repo clonado, app roda local, `docs/arquitetura.md` descreve o stack real.
- `specs/painel-regulatorio/` versionado no repo.

## Definição de pronto
- Commit da spec no repo; nenhum segredo commitado.

---

# Task 01 — Segurança imediata (correções de 1 dia)

**Wave:** 0 · **Depende de:** 00 · **Bloqueia:** nada (mas é pré-requisito moral das demais)

## Contexto
Linter de segurança do Supabase (2026-08-10) apontou:
- `public.rls_auto_enable()` é SECURITY DEFINER executável por `anon` e `authenticated`
  via `/rest/v1/rpc/rls_auto_enable`.
- Extensão `vector` instalada no schema `public`.
- Conta compartilhada `contato@fabrani.com.br` com papel SUPERADMIN na tabela `usuario`
  (compartilhada = sem rastreabilidade na auditoria; contexto da empresa exige contas nominais).

## Passos
1. Migration: `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated;`
   (manter só para `service_role`/owner).
2. Migration: mover extensão `vector` para schema `extensions`
   (`ALTER EXTENSION vector SET SCHEMA extensions;` — validar dependências antes).
3. Desativar (`ativo=false`) o usuário `contato@fabrani.com.br`; garantir que Elias e
   Thomaz têm contas nominais ativas. NÃO deletar (preserva histórico de auditoria).
4. Verificar no código (task-00 mapeou) que nada usa a conta compartilhada.
5. Rodar `get_advisors` (security) e confirmar que os 3 WARNs sumiram sem WARN novo.

## Critérios de aceite
- RPC `rls_auto_enable` retorna 401/403 para chamada anônima.
- `usuario` sem conta compartilhada ativa.
- Advisors sem os WARNs listados.

## Definição de pronto
- Migrations registradas em `_migration`; mudanças em `auditoria_log`.

---

# Task 02 — Motor de prazos recorrentes + seed do calendário-padrão MEC

**Wave:** 1 · **Depende de:** 00 · **Bloqueia:** 03, 04 (regra G3)

## Contexto
`prazo` tem 6 registros estáticos, todos com `responsavel=null`, sem recorrência.
O calendário regulatório é anual e previsível — o sistema deve gerá-lo sozinho.

## Modelo de dados (migration)
1. Nova tabela `prazo_modelo` (o "calendário-padrão"):
   - `id`, `titulo`, `categoria` (CENSO|ENADE|CPA|COLEGIADO|REGULATORIO|EAD|PDI),
     `base_legal`, `criticidade`, `regra_data` (jsonb — ex.: `{"tipo":"data_fixa","mes":3,"dia":31}`,
     `{"tipo":"janela","mes_inicio":2,"mes_fim":5}`, `{"tipo":"por_semestre","qtd":2}`),
     `papel_dono_padrao` (SUPERADMIN|SECRETARIA|PI|CPA), `ativo`.
2. Alterações em `prazo`: adicionar `prazo_modelo_id` (fk), `ano_referencia` (int),
   `recorrente` (bool). `responsavel` passa a ser obrigatório para novos prazos gerados
   (preenchido pelo mapeamento papel→usuário; se não houver, fica null e a regra G3 acusa).
3. Função `gerar_prazos_ano(ano int)` (idempotente — não duplica se já existir
   `prazo_modelo_id+ano_referencia`): materializa os modelos em `prazo`.
4. Cron (pg_cron ou edge function agendada): todo 1º/dez gera o ano seguinte.

## Seed do calendário-padrão (mínimo)
- CENSO: preparação (jan), coleta Censup (fev–mai), conferência/migração (jun–jul).
- CPA: pesquisa 1º semestre (abr–mai), pesquisa 2º semestre (out–nov),
  relatório de autoavaliação no e-MEC (31/03).
- ENADE: verificação de enquadramento (mai), inscrição de concluintes (jun–ago),
  Questionário do Estudante (set–nov), Questionário do Coordenador (out–nov), prova (nov).
- COLEGIADO: NDE 2 reuniões/semestre, CPA 2/semestre, Colegiado de curso 1/semestre,
  CONSU 1/semestre (datas-limite: fim de cada semestre letivo).
- REGULATORIO: conferência trimestral de dados no e-MEC; migrar os 6 prazos atuais
  para o novo modelo (adequação Decreto 12.456/2025, polos 60 dias etc.).
- Datas de edital (ENADE/Censo do ano corrente) são ajustáveis por ano no `prazo`
  gerado — o modelo dá o default, o usuário refina quando o edital sai.

## Notificações
- Edge function diária: prazos em D-30/D-14/D-7/D-1 → e-mail ao responsável;
  D-7 sem movimentação → copia SUPERADMIN. Gancho de WhatsApp: enfileirar em tabela
  `notificacao_fila` (canal, destino, payload, status) — o disparo real é da task-10.

## Critérios de aceite (EARS)
- QUANDO `gerar_prazos_ano(2027)` rodar 2×, ENTÃO a contagem de prazos de 2027 não muda.
- QUANDO um prazo entrar em D-7 sem movimentação, ENTÃO existe notificação na fila para
  responsável E SUPERADMIN.
- Todos os modelos do seed geram prazo com dono resolvido a partir do papel.

## Definição de pronto
- Migrations + seed idempotentes; testes da função de geração; `auditoria_log` nas mutações.

---

# Task 03 — UI: painel "Calendário MEC" no dashboard

**Wave:** 1 · **Depende de:** 02 · **Bloqueia:** —

## Contexto
O dashboard precisa de um campo claro de calendário (pedido explícito do Elias).
Dados vêm de `prazo` (já com dono, recorrência e categoria após a task-02).

## Escopo de UI
1. **Posição:** seção própria "📅 Calendário MEC" no dashboard principal, logo abaixo
   do painel "Fique de Atenção" (task-05).
2. **Visões:**
   - *Linha do ano* (default): 12 meses em faixa horizontal, cada prazo como pill na
     posição do `data_limite`, cor por criticidade (ALTA vermelho, MÉDIA âmbar,
     BAIXA cinza), riscado quando `CONCLUIDO`.
   - *Lista "próximos 60 dias"*: ordenada por data, com dono, categoria e status.
   - Filtros: categoria (CENSO/ENADE/CPA/COLEGIADO/REGULATORIO/EAD), status, dono.
3. **Selo "SEM DONO"** em prazos com `responsavel=null` (badge cinza-escuro pulsante).
4. **Clique no prazo** → drawer de detalhe: base legal, observação, histórico
   (auditoria), evidências vinculadas, botão **"Resolver"** (abre workspace da task-06;
   até a task-06 existir, o botão abre modal de edição status/dono).
5. Responsivo (o Elias e a secretaria usam desktop; degradar bem em mobile).

## Critérios de aceite (EARS)
- QUANDO o dashboard carregar, ENTÃO o painel exibe todos os prazos do ano corrente
  em ≤1s (query indexada por `ano_referencia`).
- QUANDO um prazo estiver a ≤30 dias e PENDENTE, ENTÃO a pill exibe contagem regressiva
  ("D-12").
- QUANDO o usuário filtrar por categoria, ENTÃO linha do ano e lista refletem o filtro.
- Prazo CONCLUIDO não some — fica riscado (histórico visível do ano).

## Definição de pronto
- Componente com estados vazio/carregando/erro; sem regressão no restante do dashboard;
  screenshot desktop + mobile anexado ao PR.

---

# Task 04 — Motor de regras do Sócrates: 13 regras + agrupamento

**Wave:** 2 · **Depende de:** 02 · **Bloqueia:** 05, 06

## Contexto
Hoje `socrates_sugestao` tem 125 linhas ABERTAS de UMA única regra
(`nsa_sem_justificativa`) — sem dedupe vira ruído. O painel vermelho (task-05) precisa
de um motor com as 13 regras da spec (§3) e agrupamento por regra.

## Modelo de dados (migration)
1. `socrates_sugestao`: adicionar `grupo_key` (text — ex.: `nsa_sem_justificativa:CURSO-2017`),
   `resolvida_em`, `resolvida_por`, `fechamento` (AUTO|MANUAL), `justificativa_fechamento`.
2. Nova tabela `socrates_regra`: `codigo`, `titulo`, `severidade`, `descricao`,
   `ativa`, `papel_dono_padrao`, `acao_resolucao` (UPLOAD|PESQUISA|DOCUMENTO|CADASTRO|EMEC),
   `ultima_execucao`, `duracao_ms` — registro e liga/desliga por regra.

## Regras a implementar (queries SQL puras — custo LLM zero)
| Código | Condição de abertura | Fecha quando |
|---|---|---|
| `processo_movimento_pendente` | `supervisao_ocorrencia` sem tratamento OU `processo_regulatorio` com fase alterada há ≤7d sem ação | ação registrada em `socrates_acao` |
| `colegiado_sem_reuniao` | colegiado ativo sem `reuniao` REALIZADA no semestre corrente (mínimos: NDE 2, CPA 2, Colegiado 1, CONSU 1) | reuniões do semestre ≥ mínimo |
| `prazo_sem_dono` | `prazo` PENDENTE com `responsavel` null | dono atribuído |
| `prazo_vencendo` | `prazo` PENDENTE com `data_limite` ≤ 30d | prazo CONCLUIDO ou data ajustada |
| `indicador_sem_evidencia` | indicador de instrumento VIGENTE aplicável sem `evidencia_vinculo` | vínculo criado |
| `evidencia_vencida` | `documento.validade` < hoje (campo criado na task-07) | documento substituído |
| `cpa_relatorio_pendente` | `cpa_ciclo` corrente sem relatório postado e data > 01/02 | relatório marcado postado |
| `cpa_pesquisa_pendente` | semestre corrente sem pesquisa CONSOLIDADA (task-08) | pesquisa consolidada |
| `censo_modulo_pendente` | `censo_modulo` ≠ FECHADO dentro da janela de coleta; ou `censo_pendencia` aberta | módulo fechado / pendências zeradas |
| `enade_estudante_irregular` | `enade_estudante` irregular OU edição aplicável sem estudantes carregados | regularizado / carga feita |
| `docente_incompleto` | `pessoa` docente sem titulação/regime/Lattes; OU curso sem NENHUM docente cadastrado | cadastro completo |
| `ato_dados_pendentes` | `ato_regulatorio` sem `numero_ato`/`data_publicacao`/vigência | dados preenchidos |
| `aditamento_pendente` | `polo` criado há >45d sem registro no e-MEC; troca de coordenador sem aditamento | aditamento registrado |
| `nsa_sem_justificativa` | (existente) — migrar para o novo motor com `grupo_key` | justificativa preenchida |

## Execução
- Edge function `socrates-regras`: roda todas as regras ativas; **upsert por
  `grupo_key`+alvo** (nunca duplica); fecha AUTO os cards cuja condição sumiu.
- Agendamento: 1×/dia (cron) + trigger pós-mutação nas tabelas-fonte (debounce simples:
  marcar "dirty" e rodar no próximo ciclo de 5 min).
- Migrar as 125 sugestões atuais para o formato novo (mesma regra, com `grupo_key`).

## Critérios de aceite (EARS)
- QUANDO o motor rodar 2× seguidas sem mudança de dados, ENTÃO nenhuma sugestão nova é criada.
- QUANDO a condição de uma regra deixar de valer, ENTÃO o card fecha com `fechamento=AUTO`.
- QUANDO uma regra falhar, ENTÃO as demais continuam e a falha fica em `socrates_regra.ultima_execucao`.
- Contagem de cards ABERTOS por regra bate com query manual de conferência.

## Definição de pronto
- 13 regras com teste (fixture → abre; correção → fecha AUTO); migration idempotente.

---

# Task 05 — UI: painel "⚠ Fique de Atenção" (vermelho)

**Wave:** 2 · **Depende de:** 04 · **Bloqueia:** —

## Contexto
Pedido explícito do Elias: campo vermelho de atenção no topo do dashboard com cada
gargalo real da faculdade, e dele sair a resolução.

## Escopo de UI
1. **Posição:** primeira seção do dashboard, acima do Calendário MEC.
2. **Visual:** container com borda/faixa vermelha; header "⚠ Fique de Atenção" com
   contagem total de itens abertos (ex.: "8 pontos exigem ação").
3. **Cards agrupados por regra** (dados da task-04): 1 card por `grupo_key` com:
   - título da regra + contagem ("Indicadores sem justificativa de NSA — 23 itens"),
   - severidade (RISCO = vermelho cheio; ATENÇÃO = âmbar; INFO = cinza),
   - dono sugerido (papel), idade do card ("aberto há 12 dias"),
   - expansão para listar os itens individuais,
   - botão **"Resolver"** → workspace da task-06 (até lá: expande e mostra detalhe).
4. **Ordenação:** severidade > idade > contagem. RISCO nunca fica abaixo da dobra.
5. **Estado vazio:** "✅ Nenhum ponto de atenção aberto" em verde (o painel nunca some —
   mostra que o motor está vivo, com data/hora da última execução das regras).
6. **Fechamento manual** (exceção): modal exigindo justificativa → grava
   `fechamento=MANUAL` + `justificativa_fechamento` + `auditoria_log` (RF-B4).

## Critérios de aceite (EARS)
- QUANDO existir card RISCO, ENTÃO ele aparece no topo com destaque vermelho.
- QUANDO N itens da mesma regra existirem, ENTÃO o painel mostra 1 card com contagem N.
- QUANDO todos os cards fecharem, ENTÃO o estado vazio verde aparece com timestamp do motor.
- QUANDO o usuário tentar fechar sem justificativa, ENTÃO o sistema bloqueia.

## Definição de pronto
- Estados vazio/carregando/erro; contraste AA no vermelho; screenshot no PR.

---

# Task 06 — Workspace "Como Resolver": chat do Sócrates + ações

**Wave:** 3 · **Depende de:** 04, 07 · **Usa:** 08 (pesquisa), 09 (documentos)

## Contexto
Coração do pedido do Elias: de cada card do "Fique de Atenção" (e de cada prazo do
calendário) abre-se um campo de resolução onde o colaborador conversa com o Sócrates,
sobe documentação, roda pesquisa, envia documento e **resolve ali dentro**.

## Escopo
### Layout (drawer/página `resolver/[sugestao_id|prazo_id]`)
- **Coluna esquerda — Chat do Sócrates:** histórico persistido (`socrates_interacao`),
  input de mensagem, sugestões de resposta rápida.
- **Coluna direita — Painel de ação:** checklist de resolução gerado pela regra
  (`socrates_regra.acao_resolucao`) + botões de ação + linha do tempo do item
  (aberto → interações → ações → resolvido).

### Chat (braço de resolução do Sócrates)
1. Primeira mensagem automática, contextualizada SEM LLM (template da regra): o que é o
   problema, base legal, o que resolve, passos.
2. Mensagens seguintes: LLM (claude via edge function `socrates-chat`) com contexto
   injetado: regra, item, dados do banco relacionados (indicador + critério de conceito 5,
   prazo, modelo de documento aplicável), instrumento vigente. System prompt: avaliador
   sênior INEP, pt-BR, respostas curtas e acionáveis, nunca inventar norma — citar só as
   que estão em `norma`/`norma_dispositivo`.
3. Todo turno debita `socrates_orcamento` (RF-C4): a 90% do teto avisa SUPERADMIN e
   degrada para modo regra (respostas template, sem LLM).
4. O chat pode **propor ações executáveis** (botões no balão): "Gerar minuta da ata",
   "Subir evidência", "Rodar pesquisa" — que disparam o painel de ação.

### Painel de ação (por tipo de resolução da regra)
- `UPLOAD` → componente de upload (task-07) já vinculado ao alvo (indicador/requisito/prazo).
- `PESQUISA` → cria/acompanha pesquisa CPA (task-08) do ciclo corrente.
- `DOCUMENTO` → gera documento de `modelo_documento` com rascunho do Sócrates,
  revisão do usuário, PDF e registro de envio (task-09).
- `CADASTRO` → deep-link para o CRUD correspondente (docente, ato, censo) com retorno
  ao workspace.
- `EMEC` → checklist manual (protocolo no e-MEC é externo) + campo para nº de protocolo
  + upload do comprovante.
- **"Marcar como resolvido"**: habilita só quando o checklist da regra está completo
  (evidência anexada / pesquisa consolidada / documento enviado / cadastro feito);
  grava `socrates_acao`, fecha a sugestão (`fechamento=MANUAL` com ação vinculada) e
  reflete no painel vermelho e no calendário.

### Permissões
- `SECRETARIA` executa todo o fluxo (RF-C5). Excluir documento/reabrir item = `SUPERADMIN`.

## Critérios de aceite (EARS)
- QUANDO o workspace abrir, ENTÃO a primeira orientação aparece sem consumir tokens.
- QUANDO o usuário concluir a ação exigida, ENTÃO "Marcar como resolvido" habilita;
  antes disso, desabilitado com tooltip do que falta.
- QUANDO o item for resolvido, ENTÃO o card some do painel vermelho (ou decrementa a
  contagem do grupo) sem reload manual.
- QUANDO o orçamento de tokens passar de 90%, ENTÃO o chat entra em modo regra e avisa.
- TODA interação e ação ficam em `socrates_interacao`/`socrates_acao` + `auditoria_log`.

## Definição de pronto
- Fluxo completo demonstrado com a regra `colegiado_sem_reuniao` (chat → gerar ata →
  anexar → resolver) e com `indicador_sem_evidencia` (chat → upload → resolver).

---

# Task 07 — Repositório de evidências: upload, vínculo e validade

**Wave:** 3 · **Depende de:** 00 · **Bloqueia:** 06 (ação UPLOAD), regras G4/G5

## Contexto
`documento` tem 1 registro e `evidencia_vinculo` está vazio — o "espelho do instrumento"
não tem evidência real por trás. Este é o maior gap entre a promessa do sistema e a visita
in loco. `requisito_evidencia` (141 linhas) já diz QUAIS evidências cada requisito pede.

## Escopo
### Migration
1. `documento`: garantir campos `titulo`, `tipo`, `storage_path`, `mime`, `tamanho`,
   `validade` (date, nullable — contratos/acervo/CI vencem), `origem` (UPLOAD|GERADO),
   `enviado_por`, `criado_em`, `hash_sha256` (integridade).
2. `evidencia_vinculo`: `documento_id` + alvo polimórfico (`alvo_tipo`
   INDICADOR|REQUISITO_LEGAL|PRAZO|SUGESTAO|REUNIAO, `alvo_id`), `observacao`.
3. Bucket Supabase Storage `evidencias` privado; acesso somente por URL assinada
   (expiração ≤1h) emitida pelo backend após checagem de papel.

### Funcionalidade
1. Componente de upload reutilizável (usado no workspace da task-06 e nas telas de
   indicador/requisito): arrastar-soltar, múltiplos arquivos, PDF/DOCX/XLSX/PNG/JPG,
   limite 50MB, barra de progresso; calcula hash no backend.
2. Tela "Evidências" por indicador e por requisito legal: o que `requisito_evidencia`
   pede × o que está anexado × validade — com % de cobertura.
3. **Importação em massa do Drive:** página de triagem que recebe um lote de arquivos
   (upload manual de pasta zipada OU integração Drive se MCP disponível) e permite
   classificar rapidamente cada arquivo (tipo + alvo) em fila estilo inbox.
4. Painel de cobertura no dashboard (mini-card): "Evidências: X de Y indicadores
   cobertos" — alimenta a decisão de prontidão para visita.

## Critérios de aceite (EARS)
- QUANDO um documento for anexado a um indicador, ENTÃO a regra `indicador_sem_evidencia`
  fecha o item AUTO no próximo ciclo.
- QUANDO `validade` < hoje, ENTÃO a regra `evidencia_vencida` abre card (task-04).
- QUANDO um usuário sem papel adequado pedir URL, ENTÃO o backend nega (403).
- Download só via URL assinada; link expira.

## Definição de pronto
- Upload → vínculo → cobertura demonstrados; RLS/policies do bucket auditadas;
  advisors sem WARN novo.

---

# Task 08 — Módulo de pesquisa CPA (rodar a pesquisa de dentro do sistema)

**Wave:** 3 · **Depende de:** 00 · **Usada por:** 06 (ação PESQUISA), regras G6/G7

## Contexto
Pedido do Elias: no campo de resolução, o colaborador deve poder "rodar a pesquisa".
A pesquisa de autoavaliação (docentes, discentes, técnicos) é insumo obrigatório do
relatório da CPA (Lei 10.861/2004). `cpa_ciclo` existe (1 ciclo); `cpa_resultado` vazio.

## Escopo
### Migration
1. `cpa_pesquisa`: `id`, `cpa_ciclo_id`, `titulo`, `publico` (DISCENTE|DOCENTE|TECNICO|EGRESSO),
   `semestre`, `status` (RASCUNHO|ABERTA|ENCERRADA|CONSOLIDADA), `abre_em`, `fecha_em`,
   `token_publico` (link anônimo).
2. `cpa_pergunta`: `pesquisa_id`, `eixo_id` (fk `eixo` — 13 eixos já cadastrados),
   `texto`, `tipo` (LIKERT_5|TEXTO), `ordem`.
3. `cpa_resposta`: `pesquisa_id`, `pergunta_id`, `valor_likert`, `valor_texto`,
   `respondido_em` — **anônima** (sem fk para pessoa; opcional `segmento`).
4. Seed: questionário-padrão por público, com perguntas mapeadas aos eixos do SINAES
   (reaproveitável a cada semestre; editável antes de abrir).

### Funcionalidade
1. Criar pesquisa a partir do padrão → revisar perguntas → **abrir** (gera link público
   `pesquisa/[token]`, sem login, mobile-first).
2. Página pública de resposta: Likert 1–5 + comentário; proteção simples anti-duplicação
   (localStorage + rate limit por IP); LGPD: aviso de anonimato no topo.
3. Acompanhamento em tempo real: nº de respostas por público, meta configurável.
4. **Encerrar e consolidar**: agrega médias por eixo/pergunta em `cpa_resultado`
   (jsonb com médias, distribuição e comentários), marca CONSOLIDADA — isso fecha a
   regra `cpa_pesquisa_pendente` e alimenta o relatório da CPA (task-09 usa
   `cpa_resultado` para preencher o modelo `RELATORIO_CPA`).

## Critérios de aceite (EARS)
- QUANDO a pesquisa abrir, ENTÃO o link público funciona sem login e registra respostas.
- QUANDO a pesquisa for consolidada, ENTÃO `cpa_resultado` contém médias por eixo e a
  regra G7 fecha AUTO.
- Nenhuma resposta é vinculável a um respondente identificado.
- QUANDO o Sócrates gerar o rascunho do relatório CPA (task-09), ENTÃO os números vêm
  de `cpa_resultado`, nunca inventados.

## Definição de pronto
- Ciclo completo demonstrado: criar → abrir → responder (3 públicos) → consolidar →
  card G7 fechado.

---

# Task 09 — Geração e envio de documentos (modelos + Sócrates redator)

**Wave:** 3 · **Depende de:** 07 · **Usada por:** 06 (ação DOCUMENTO), regras G2/G6/G13

## Contexto
`modelo_documento` já tem 7 modelos com placeholders `{{campo}}` e base legal
(atas CPA/NDE/equipe multi, ofício, portaria, resposta a diligência, relatório CPA).
Falta o fluxo: instanciar → Sócrates preencher rascunho → revisar → PDF → enviar →
virar evidência.

## Escopo
### Migration
1. `documento_gerado`: `id`, `modelo_id`, `alvo_tipo`/`alvo_id` (sugestão, prazo,
   reuniao, cpa_ciclo), `campos_preenchidos` (jsonb), `corpo_final` (markdown),
   `status` (RASCUNHO|REVISADO|EMITIDO|ENVIADO), `pdf_documento_id` (fk `documento`),
   `numero_sequencial` (por tipo/ano — ofícios e portarias numeram automaticamente),
   `enviado_para`, `enviado_em`, `protocolo`.

### Funcionalidade
1. **Instanciar do workspace (task-06):** modelo aplicável vem da regra
   (ex.: `colegiado_sem_reuniao` → ATA_NDE/ATA_CPA; `cpa_relatorio_pendente` →
   RELATORIO_CPA; resposta a diligência quando G1 traz despacho).
2. **Sócrates redator:** preenche os `{{campos}}` com dados do banco (IES, código e-MEC,
   participantes de `colegiado_membro`, resultados de `cpa_resultado`) e redige as
   seções discursivas como RASCUNHO claramente marcado — o usuário SEMPRE revisa
   (editor markdown com diff do rascunho).
3. **Emitir:** gera PDF (papel timbrado configurável na `ies`), grava como `documento`
   (`origem=GERADO`, hash) e cria `evidencia_vinculo` automático ao alvo.
4. **Enviar:** registro manual de envio (destinatário, data, nº de protocolo e-MEC
   quando houver, comprovante anexável). Envio por e-mail direto do sistema: fase 2 —
   fora deste escopo.
5. Numeração automática: `OFICIO 001/2026`, `PORTARIA 001/2026` por ano.

## Critérios de aceite (EARS)
- QUANDO o Sócrates gerar rascunho, ENTÃO nenhum campo factual (datas, nomes, números)
  vem inventado — só do banco; lacunas ficam como `[PREENCHER]`.
- QUANDO o documento for EMITIDO, ENTÃO existe PDF em `documento` com hash e vínculo
  ao alvo, e a regra correspondente enxerga a evidência.
- QUANDO dois ofícios forem emitidos no mesmo ano, ENTÃO a numeração é sequencial sem furo.
- Documento EMITIDO é imutável (correção = nova versão, mantendo a anterior).

## Definição de pronto
- Demonstração: ata de NDE gerada do workspace, revisada, emitida em PDF e fechando
  o card G2 correspondente.

---

# Task 10 — Robô de monitoramento e-MEC/DOU + notificações WhatsApp

**Wave:** 4 · **Depende de:** 00 · **Alimenta:** regras G1/G11, fila de notificações (task-02)

## Contexto
A ação repetitiva nº 1 da faculdade: vigiar manualmente e-MEC e DOU todo dia.
Processo crítico vivo: reconhecimento **nº 202417965** (avaliação 227446), fase
PARECER_SERES. Atos com número/vigência "a conferir no e-MEC" (G11).

## Escopo
### Coletores (edge function agendada 1×/dia, horário comercial)
1. **e-MEC consulta pública:** consultar a IES pelo código e-MEC (dados em `ies`) e os
   processos em `processo_regulatorio`. A consulta pública do e-MEC usa endpoints
   internos (JSON) — mapear na implementação; SE houver captcha/bloqueio, degradar para
   comparação de snapshot HTML. Extrair: fase atual, despachos, datas, atos publicados.
2. **DOU (Imprensa Nacional):** busca na API/portal do DOU por: nome da mantenedora,
   CNPJ, nº dos processos e-MEC, "FABRANI". Seção 1 (atos) e 3.
3. Persistir snapshot bruto por execução (tabela `robo_execucao`: fonte, payload,
   hash, executado_em) — diffs são feitos contra o último snapshot.

### Reações a movimento novo
- Atualizar `processo_regulatorio.fase` / criar `processo_fase` com histórico.
- Preencher campos pendentes de `ato_regulatorio` (nº portaria, DOU, vigência) quando a
  publicação sair — fecha G11.
- Criar `supervisao_ocorrencia` para qualquer menção não mapeada (diligência, medida
  cautelar) → card G1 RISCO.
- **Notificar imediato:** e-mail + WhatsApp para PI e SUPERADMIN. WhatsApp: consumir a
  fila `notificacao_fila` (task-02) via API já usada pela FABRANI (automação existente
  do Tiago — descobrir endpoint/token na implementação; SE indisponível, e-mail apenas
  e card INFO "canal WhatsApp não configurado").

### Watchdog (RF-D3)
- SE uma fonte não retornar leitura válida por 3 dias, ENTÃO card ATENÇÃO
  "robô sem leitura da fonte X há N dias". Nunca falhar em silêncio.

## Critérios de aceite (EARS)
- QUANDO a fase do processo 202417965 mudar no e-MEC, ENTÃO em ≤24h existe card G1 +
  notificação enviada.
- QUANDO uma portaria da FABRANI sair no DOU, ENTÃO `ato_regulatorio` é atualizado e
  G11 fecha AUTO.
- QUANDO a fonte quebrar, ENTÃO o watchdog acusa em ≤3 dias.
- Snapshots permitem reprocessar sem nova coleta.

## Definição de pronto
- Robô rodando em produção com 1 ciclo real registrado; teste de diff com fixture;
  segredos em env vars (nunca no código).

## Nota de conformidade
Coleta apenas de dados PÚBLICOS (consulta pública e-MEC, DOU). Respeitar robots/termos,
1 execução/dia, user-agent identificado, backoff em erro.

---

# Task 11 — Cadastro de docentes e colegiados (pessoa) + importador

**Wave:** 5 · **Depende de:** 00, 07 · **Alimenta:** regras G2/G10, Censo docente, CC

## Contexto
`pessoa` (0), `colegiado_membro` (0) — mas titulação/regime do corpo docente pesa nos
indicadores de Corpo Docente do CC, no Censo (módulo Docente) e nas atas (participantes).

## Escopo
### Migration
1. `pessoa`: garantir `nome`, `cpf` (único, validado), `email`, `tipo`
   (DOCENTE|TECNICO|COORDENADOR), `titulacao` (GRADUACAO|ESPECIALIZACAO|MESTRADO|DOUTORADO),
   `regime` (HORISTA|PARCIAL|INTEGRAL), `lattes_url`, `data_admissao`, `ativo`.
2. `pessoa_curso`: vínculo pessoa×curso com `funcao` (DOCENTE|COORDENADOR|NDE) e vigência.
3. `colegiado_membro`: popular a partir de `pessoa` (fk), com `funcao` no colegiado
   (PRESIDENTE|MEMBRO|SEGMENTO_DISCENTE|SEGMENTO_TECNICO|SOCIEDADE_CIVIL) e vigência.

### Funcionalidade
1. CRUD de pessoas com anexos (diploma de titulação, contrato, termo NDE) via
   componente da task-07 — cada anexo vira `documento` com validade quando aplicável.
2. Importador CSV (template baixável) com validação linha a linha e relatório de erros.
3. Tela de composição por colegiado: membros vigentes, funções, alerta de composição
   incompleta (CPA sem sociedade civil/segmentos = irregular; NDE < 5 docentes).
4. Indicadores derivados no dashboard (mini-card): % mestres/doutores, % tempo
   parcial/integral por curso — exatamente os cortes que o instrumento de curso usa.

## Critérios de aceite (EARS)
- QUANDO um docente for cadastrado sem titulação/regime/Lattes, ENTÃO a regra G10 abre
  card; ao completar, fecha AUTO.
- QUANDO a CPA não tiver representante da sociedade civil vigente, ENTÃO card ATENÇÃO.
- QUANDO o CSV tiver CPF inválido/duplicado, ENTÃO a linha é rejeitada com motivo claro
  e as demais entram.
- Atas geradas (task-09) puxam participantes de `colegiado_membro`.

## Definição de pronto
- Corpo docente real da FABRANI importado (Elias fornece CSV); mini-card de titulação
  refletindo os dados; CPF armazenado com máscara de exibição e acesso restrito por papel.

---

# Task 12 — Censo: importador + validador de pendências · ENADE: gestão de estudantes

**Wave:** 5 · **Depende de:** 00, 11 · **Alimenta:** regras G8/G9

## Contexto
`censo_modulo` existe (8 módulos NAO_INICIADO em 2 anos), `censo_pendencia` e
`enade_estudante` vazios. As duas maiores esteiras anuais de dados da secretaria.

## Escopo — Censo
1. **Importador CSV** de alunos (template no layout conceitual do Censup: aluno, CPF,
   curso, situação de vínculo, ingresso, financiamento) e reuso do importador de
   docentes (task-11).
2. **Validador pré-Censup** — popula `censo_pendencia` com tipo e gravidade:
   - CPF inválido/duplicado; aluno sem situação de vínculo no ano-base;
   - docente vinculado a curso sem registro em `pessoa_curso`;
   - divergência nº de cursos/vagas entre banco local e dados declarados no e-MEC;
   - módulo dentro da janela de coleta (prazos da task-02) ainda NAO_INICIADO.
3. Tela por `censo_ano`: 4 módulos (IES/CURSO/DOCENTE/ALUNO) com status, contagem de
   registros declarados, pendências abertas e botão de fechar módulo (exige zero
   pendências BLOQUEANTES).
4. O sistema NÃO fala com o Censup (sem API pública) — ele prepara e confere; a
   digitação/migração no Censup continua manual, com checklist espelho.

## Escopo — ENADE
1. `enade_estudante`: popular por importação CSV (concluintes/ingressantes por curso e
   `curso_enade_edicao`), com `status_inscricao` (PENDENTE|INSCRITO|DISPENSADO),
   `questionario_estudante` (bool), `presenca_prova`, `situacao_regularidade`
   (REGULAR|IRREGULAR).
2. Tela por edição: funil de regularidade (inscritos → questionário → prova → regulares),
   filtro de irregulares, exportação da lista.
3. **Trava de colação:** flag visível `situacao_regularidade=IRREGULAR` por estudante +
   card G9; a colação em si acontece fora do sistema — aqui é o alerta que impede o erro.
4. Prazos da edição (inscrição, questionário, prova) entram no Calendário MEC via
   task-02 (ajustados quando o edital sai).

## Critérios de aceite (EARS)
- QUANDO o CSV de alunos subir, ENTÃO pendências são geradas e listadas por gravidade;
  corrigir o dado e reimportar fecha a pendência.
- QUANDO a janela de coleta abrir e um módulo estiver NAO_INICIADO, ENTÃO card G8.
- QUANDO um concluinte estiver sem questionário a ≤14 dias do fim do prazo, ENTÃO
  card G9 lista nominalmente os pendentes.
- Fechar módulo com pendência BLOQUEANTE aberta é impossível.

## Definição de pronto
- Ciclo demonstrado com dados reais de 1 curso (Elias/Thomaz fornecem CSV);
  dados pessoais de alunos acessíveis apenas a papéis autorizados.

---

# Task 13 — Migração para Supabase Auth + 2FA (por último)

**Wave:** 6 · **Depende de:** todas as anteriores (mexe em toda sessão) · **Bloqueia:** nada

## Contexto
Auth atual é caseiro: `usuario.senha_hash` (bcrypt) validado pelo backend. Sem 2FA,
sem recuperação de senha segura, sem rate limit de tentativas. Dado o histórico de
ameaça digital da empresa, este sistema (dados regulatórios + docs institucionais)
precisa de autenticação de prateleira, não artesanal.

## Escopo
1. Criar usuários no Supabase Auth (email) para cada `usuario.ativo=true`; vincular
   por `auth_user_id` (nova coluna em `usuario`); papéis continuam na tabela `usuario`
   (claim custom via hook JWT ou lookup no backend).
2. Fluxo de migração de senha: primeiro login pós-corte → "definir nova senha" via
   e-mail de recuperação do Supabase Auth (NÃO migrar hashes bcrypt manualmente —
   forçar reset é mais simples e mais seguro com 3 usuários).
3. **2FA (TOTP)** obrigatório para SUPERADMIN, opcional para SECRETARIA (recomendado).
4. Rate limit e lockout: usar os padrões do Supabase Auth (GoTrue); logs de login em
   `auditoria_log`.
5. Sessões: expiração 8h com refresh; logout em troca de senha.
6. Remover código de auth caseiro; `senha_hash` → coluna descontinuada (manter 30 dias,
   depois migration de drop).
7. Revisar RLS: com Supabase Auth ativo, avaliar policies reais por papel (substituindo
   o deny-all + service key) — decidir na implementação conforme arquitetura da task-00;
   documentar a decisão em `docs/arquitetura.md`.

## Critérios de aceite (EARS)
- QUANDO um usuário ativo fizer primeiro login pós-corte, ENTÃO define nova senha via
  e-mail e entra normalmente.
- QUANDO SUPERADMIN logar sem 2FA configurado, ENTÃO o sistema força o enrollment TOTP.
- QUANDO houver 5 tentativas falhas, ENTÃO lockout temporário registrado em auditoria.
- Nenhum endpoint aceita mais o fluxo de senha antigo.

## Definição de pronto
- Elias e Thomaz logados no fluxo novo com 2FA; código antigo removido; advisors sem
  WARN novo; rollback documentado (feature flag de corte).