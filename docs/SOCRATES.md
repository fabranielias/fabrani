# Sócrates — agente regulatório residente do sistema FABRANI

Arquitetura, experiência de uso e economia de custo. **As seis fases estão implementadas** — ver o mapa de implementação na seção 9.

---

## 1. O que Sócrates é (e o que não é)

Sócrates é um **avaliador sênior residente**: conhece o Instrumento de Avaliação do INEP, o SINAES, o Censo, o ENADE, o Decreto 9.235/2017, o Decreto 12.456/2025 e as portarias de EaD, e usa esse conhecimento para **revisar, sugerir e cobrar** — não para “escrever bonito”.

Ele age em três papéis:

| Papel | O que faz | Exemplo |
|---|---|---|
| **Copiloto de preenchimento** | Sugere texto, aponta campo vazio, propõe plano de ação | “Seu texto do indicador 1.4 descreve a prática, mas não cita periodicidade nem responsável — sem isso o avaliador raramente dá 4.” |
| **Avaliador simulado (banca)** | Lê a análise + evidências e atribui conceito 1–5 justificado pelo critério oficial | “Conceito 3: o critério de 4 exige *e* mecanismos de acompanhamento; não há evidência deles.” |
| **Vigia de prazos e normas** | Cruza calendário (Censo, ENADE, protocolos e-MEC) e mudanças normativas com o estado do sistema | “Portaria X alterou o art. 12; 3 indicadores e 2 documentos seus dependem desse artigo.” |

Ele **não** submete nada ao e-MEC/Censup/Enade, e **nunca inventa texto normativo**: toda afirmação normativa sai citando a fonte do corpus (norma, artigo, instrumento/indicador).

---

## 2. Onde ele vive na interface

Quatro pontos de contato, do mais barato ao mais caro:

1. **Selo inline (custo zero).** Em cada campo do formulário, um selo do lado: `OK` / `Incompleto` / `Risco`. Vem do motor de regras, sem LLM. É o que aparece 95% do tempo.
2. **Painel lateral “Sócrates” (sob demanda).** Gaveta que abre no detalhe do indicador/documento com: diagnóstico, o que falta para o conceito 5, rascunho sugerido e evidências faltantes. Só chama LLM quando o usuário clica em **“Pedir análise”** ou **“Sugerir texto”**.
3. **Chat contextual.** Pergunta livre (“o NDE precisa de quantos doutores?”), sempre respondida com citação da norma. Contexto = a tela em que o usuário está, não o banco inteiro.
4. **Relatório de banca (lote, noturno).** Uma vez por ciclo (ou sob demanda), Sócrates roda todos os indicadores e emite o “parecer prévio”: conceito simulado por indicador, CI/CC projetado e ranking de lacunas por impacto.

Cada saída do Sócrates entra no sistema como **sugestão**, nunca como dado: o usuário clica *Aceitar / Editar / Descartar*, e a decisão vira registro em `auditoria_log` (quem aceitou, qual versão do modelo/corpus gerou).

---

## 2.1 Sócrates executa — “preencha X e ele faz”

Além de sugerir, Sócrates **age dentro do sistema**. O usuário digita o pedido em linguagem natural (“preencha a análise dos indicadores do eixo 2”, “gere a ata da CPA de agosto”, “monte o ofício de resposta ao despacho saneador”, “cadastre o polo de Ribeirão Preto”) e ele produz o resultado já dentro do banco, como **rascunho revisável**.

### Ferramentas de escrita (o que ele pode acionar)

| Ferramenta | Efeito | Confirmação |
|---|---|---|
| `preencher_indicador` | Escreve análise, plano de ação, responsável, prazo e conceito autoavaliado de um ou vários indicadores | Diff campo a campo antes de gravar |
| `preencher_entidade` | Cria/atualiza qualquer das 25 entidades do registry (curso, polo, docente, NDE, polo EaD, processo e-MEC…) | Diff antes de gravar |
| `gerar_documento` | Produz ata (CPA, NDE, equipe multidisciplinar, colegiado), ofício, memorando, ato normativo interno, resposta a diligência, relatório de autoavaliação | Vira documento em rascunho no cofre |
| `montar_dossie` | Reúne as evidências de um indicador/eixo em um dossiê ordenado para a visita in loco | Só leitura + montagem |
| `vincular_evidencia` | Liga documentos existentes aos indicadores que eles comprovam | Lista para aceite |
| `abrir_pendencia` | Cria tarefa com responsável e prazo a partir de uma lacuna detectada | Direto (reversível) |

O agente **não tem acesso livre ao SQL**: cada ferramenta é uma função tipada, validada por Zod, restrita ao papel do usuário (auditor e docente continuam somente-leitura) e registrada em `auditoria_log` com `origem=SOCRATES` e o pedido original.

### Ciclo de execução

```
pedido do usuário
  → Sócrates monta um PLANO (lista de ações + campos que vai tocar)
  → usuário aprova o plano  (1 clique; ou "aprovar tudo" para lote)
  → execução em transação, gravando como RASCUNHO
  → diff apresentado: antes → depois, com fonte normativa de cada escolha
  → usuário Aceita / Edita / Descarta   (nada vira dado oficial sem isso)
```

Lote grande (“preencha os 58 indicadores do curso”) roda em fila noturna e amanhece pronto para revisão — mais barato e sem travar a tela.

### Geração de atas, ofícios e atos

Cada tipo tem **modelo estruturado versionado** (`modelo_documento`): cabeçalho institucional da FABRANI (código e-MEC 1751876, mantenedora IAPA), campos obrigatórios do tipo (data, local, participantes, quórum, pauta, deliberações, assinaturas) e a base legal correspondente. O documento nasce do modelo **preenchido com dados reais do banco** (composição vigente do NDE, período letivo, resultados da CPA); o LLM só redige as partes discursivas — deliberações, justificativas, considerandos. Saída em Markdown → PDF, salva no cofre com versão, SHA-256 e vínculo às evidências.

Isso significa que a ata da CPA sai com a composição correta e citando a Lei 10.861/2004 sem ninguém digitar nada — e que um ofício ao MEC já nasce com o número do processo e-MEC certo.

### Limites duros

- Nunca protocola nada em sistema oficial (e-MEC, Censup, Enade) — gera o conteúdo, o humano protocola.
- Nunca marca documento como aprovado/vigente por conta própria.
- Nunca preenche dado quantitativo “de cabeça”: se o número não está no banco, ele deixa o campo em branco e abre pendência apontando quem deve informar.
- Toda ação em lote tem pré-visualização e é reversível (rascunho versionado, nada sobrescrito).

---

## 3. Como ele “sabe” — a base de conhecimento

Três camadas, todas versionadas e auditáveis:

1. **Corpus normativo** (`norma`, `norma_dispositivo`): leis, decretos, portarias MEC/INEP, resoluções CNE, editais, notas técnicas, instrumentos de avaliação. Cada dispositivo guarda: texto, artigo, vigência, o que revoga/altera, URL oficial e hash. Só entra texto de fonte oficial — nada gerado.
2. **Mapa indicador → norma → evidência**: liga cada indicador do instrumento aos dispositivos que o fundamentam e aos documentos que costumam comprová-lo. É esse mapa (curado, não inferido) que dá precisão às sugestões.
3. **Memória institucional da FABRANI**: PDI, PPCs, relatórios da CPA, atas de NDE, relatórios INEP anteriores, planos de ação. É o que permite sugerir texto que já é *da casa*, e não genérico.

**Busca híbrida**: `tsvector` em português (busca lexical, custo zero) + embeddings `pgvector` para similaridade semântica. O embedding é calculado **uma vez por dispositivo**, no momento da ingestão, e nunca mais — corpus completo estimado em ~30–50 mil trechos, isto é, poucos centavos, uma única vez.

---

## 4. Como ele vive sem queimar token

A regra de ouro: **LLM é o último recurso, não o primeiro**. Camadas, em ordem:

**Camada 0 — Motor de regras determinístico (0 token, sempre ligado).**
Cobre a maior parte do trabalho diário e roda em SQL/TypeScript:
- campos obrigatórios vazios; análise curta demais; ausência de números/datas/responsável no texto;
- indicador sem evidência vinculada quando o `requisito_evidencia` é obrigatório;
- documento vencido, sem versão vigente, ou não referenciado por nenhum indicador;
- NDE/CPA sem composição mínima ou sem ata no período; equipe multidisciplinar incompleta;
- prazos de Censo/ENADE/protocolo se aproximando;
- conceito autoavaliado ≥ 4 sem evidência anexada (o erro clássico que derruba nota na visita).

**Camada 1 — Recuperação (0 token).** Busca lexical + vetorial no corpus devolve “a norma que rege este campo” e trechos de PPC/PDI reaproveitáveis. Mostrar a norma certa já resolve boa parte das dúvidas sem gerar texto.

**Camada 2 — Templates e exemplares (0 token).** Para cada indicador, um esqueleto de redação (“prática + abrangência + periodicidade + responsável + evidência + resultado medido”) preenchido com dados reais já existentes no banco (nome do curso, nº de polos, período). Texto útil sem geração.

**Camada 3 — LLM sob demanda, com cache agressivo.** Só quando o usuário pede análise/redação:
- **Cache por hash**: a chave é `hash(indicador + versão do instrumento + texto do usuário + evidências + versão do corpus)`. Se nada mudou, a resposta vem do banco — reabrir a mesma tela é grátis.
- **Contexto enxuto**: manda-se o indicador, o critério oficial 1–5, o texto atual e no máximo 3–5 trechos recuperados. Nunca “o sistema todo”.
- **Escada de modelos**: modelo pequeno/barato para classificar, criticar e checar completude; modelo grande só para redigir plano de ação e para o parecer de banca.
- **Lote noturno**: o parecer completo do ciclo roda de madrugada, agrupado, com prompt compartilhado — muito mais barato que 130 chamadas interativas.
- **Orçamento explícito**: teto mensal de tokens por instituição, com medidor visível; ao atingir o teto, Sócrates continua funcionando nas camadas 0–2 (ou seja, nunca “morre”).
- **Corpus fora do prompt**: o conhecimento vive no Postgres, não no contexto. Nada de reenviar normas inteiras.

Efeito prático: **em uso normal Sócrates custa zero.** O gasto só aparece quando alguém pede geração de texto, e mesmo assim é pago uma vez por conteúdo, graças ao cache.

**Alternativa de custo zero absoluto:** todas as camadas 0–2 funcionam sem nenhuma chave de API. É possível operar o Sócrates “gratuito” e ligar a camada 3 depois, quando quiser.

---

## 5. Como ele fica “ativo” sem estar sempre rodando

Nada de processo escutando o tempo todo (isso custa infra e tokens). Ele acorda por **evento** e por **agenda**:

- **Evento** (grátis): ao salvar indicador, subir documento, criar ata ou fechar módulo do Censo, o motor de regras recalcula os alertas daquele objeto.
- **Agenda** (cron diário na Vercel, grátis): varre prazos, documentos a vencer e pendências; gera a fila de alertas e o “Bom dia, Sócrates” — o resumo do dia com as 5 ações de maior impacto.
- **Radar normativo** (semanal): checa as fontes oficiais (DOU/INEP/MEC) por novas portarias; ao detectar mudança, marca os indicadores/documentos afetados via mapa norma→indicador e pede curadoria humana antes de entrar no corpus.

---

## 6. Modelo de dados (acréscimo ao schema atual)

```sql
norma(id, tipo, numero, ano, orgao, ementa, url_oficial, vigencia_inicio, vigencia_fim, revogada_por)
norma_dispositivo(id, norma_id, rotulo, texto, hash, busca tsvector, embedding vector(1536))
indicador_norma(indicador_id, dispositivo_id, peso)         -- mapa curado
socrates_sugestao(id, alvo_tipo, alvo_id, tipo, severidade, mensagem, texto_sugerido,
                  fontes jsonb, origem, custo_tokens, cache_key, status, criado_em)
socrates_interacao(id, usuario_id, pergunta, resposta, fontes jsonb, tokens, criado_em)
socrates_orcamento(mes, tokens_usados, teto)

modelo_documento(id, tipo, titulo, versao, corpo_markdown, campos jsonb, base_legal, vigente)
socrates_execucao(id, usuario_id, pedido, plano jsonb, status, criado_em, aplicado_em)
socrates_acao(id, execucao_id, ferramenta, alvo_tipo, alvo_id, antes jsonb, depois jsonb,
              fontes jsonb, status)   -- PROPOSTA | ACEITA | DESCARTADA
```

`origem` distingue `REGRA` (grátis) de `LLM` (medido) — dá para provar, a qualquer momento, de onde veio cada sugestão e quanto custou.

---

## 7. Guardrails

- Toda afirmação normativa **cita dispositivo**; sem fonte no corpus, Sócrates responde “não há base oficial carregada para isso”.
- Sugestão nunca vira dado sem aceite humano; tudo auditado.
- Texto de instrumento provisório continua marcado como `PADRAO`/`PROPOSTA`, e Sócrates avisa quando o critério que está usando é provisório.
- Dados pessoais (docentes, discentes) não vão para o LLM: só agregados e identificadores internos.
- Conceito simulado é sempre rotulado como **simulação interna**, jamais como resultado INEP.

---

## 8. Entrega sugerida

| Fase | Escopo | Custo de token |
|---|---|---|
| 1 | Motor de regras + selos inline + “Bom dia, Sócrates” + cron de prazos | zero |
| 2 | Corpus normativo + busca híbrida + painel “base legal deste campo” | ~centavos (embeddings, uma vez) |
| 3 | Painel lateral com análise/redação sob demanda, com cache e orçamento | sob demanda |
| 4 | Execução: `preencher_indicador`/`preencher_entidade` com plano + diff + aceite | sob demanda |
| 5 | Geradores de ata (CPA/NDE/equipe multidisciplinar), ofício, ato e dossiê de visita | sob demanda |
| 6 | Parecer de banca em lote por ciclo + radar normativo semanal | lote noturno |

A fase 1 já entrega a maior parte do valor percebido (“o sistema me diz o que falta para tirar 5”) sem nenhum custo recorrente.

## 9. Mapa de implementação

| Peça | Onde está |
|---|---|
| Schema (sugestões, execuções, ações, corpus, orçamento, modelos) | `db/migrations/0003_socrates.sql` |
| Motor de regras determinístico | `src/lib/socrates/regras.ts` |
| Corpus normativo e busca `tsvector` (com `pgvector` opcional) | `src/lib/socrates/corpus.ts`, `catalog/normas/dispositivos.json` |
| Camada Anthropic com cache, orçamento e fallback | `src/lib/socrates/llm.ts` |
| Ferramentas tipadas (Zod) e aplicação das ações | `src/lib/socrates/ferramentas.ts` |
| Orquestração: perguntar, analisar, planejar, aplicar, gerar documento, parecer em lote | `src/lib/socrates/agente.ts` |
| Radar normativo | `src/lib/socrates/radar.ts` |
| Painel, plano/diff/aceite, geração de documentos | `src/app/painel/socrates/**` |
| Selos e análise no indicador | `src/app/painel/avaliacao/[id]/indicador/[avaliacaoId]/PainelSocrates.tsx` |
| Cron diário (regras + radar) | `src/app/api/cron/socrates/route.ts`, `vercel.json` |
| Carga do corpus e dos modelos | `scripts/seed-socrates.ts` (`npm run db:seed:socrates`) |
| Recalcular regras fora do cron | `scripts/socrates-regras.ts` (`npm run socrates:regras`) |

Sem `ANTHROPIC_API_KEY` o agente continua ativo: regras, radar, base legal e prazos seguem funcionando; apenas análise, planejamento e redação ficam indisponíveis, com aviso explícito na tela.
