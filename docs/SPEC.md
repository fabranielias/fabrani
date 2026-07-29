# SPEC v2.0 — Sistema de Gestão Regulatória, Avaliativa e Censitária MEC/INEP
### Faculdade Fabrani (FABRANI) — EaD — Jaboticabal/SP · `mec.fabrani.com.br`

| | |
|---|---|
| **Versão** | 2.0 — revisa, corrige e amplia a v0.1 |
| **Data** | 29/07/2026 |
| **Status** | Especificação aprovada para execução — **sistema implementado neste repositório** |
| **Stack** | Next.js 15 (App Router) · PostgreSQL (Supabase) · Vercel · TypeScript · Tailwind |
| **Domínio** | `mec.fabrani.com.br` |

---

## 0. Avaliação da spec anterior (v0.1) e o que mudou

### 0.1 O que a v0.1 acertou (mantido)

1. **A tese central está certa e é o diferencial do produto:** *o sistema é um espelho executável dos instrumentos do INEP*. Eixo → indicador → critérios de conceito 1..5 **verbatim** → evidência → conceito simulado. Mantido integralmente e implementado.
2. **Instrumento como dado versionado, nunca hardcoded.** Confirmado pela pesquisa: há um instrumento novo em consolidação (§2.3). Mantido.
3. **Evidência N:N com indicador** (um PDI comprova dezenas de indicadores). Mantido.
4. **Requisito legal ≠ indicador com nota.** Mantido, com tela própria.
5. **Não existe API oficial de escrita no e-MEC/Censup/Enade.** Confirmado. O sistema **prepara e exporta**; o humano protocola.
6. **Separação mantenedora × mantida**, `prorrogado` no ato autorizativo (protocolo tempestivo prorroga validade), soft delete e trilha de auditoria. Mantidos.

### 0.2 O que a v0.1 errou, omitiu ou deixou frouxo (corrigido nesta versão)

| # | Problema na v0.1 | Correção na v2.0 |
|---|---|---|
| C1 | Tratava o Decreto 12.456/2025 como norma isolada, com um único prazo (19/05/2027) | O decreto **já foi regulamentado**: Portaria MEC **381/2025** (transição) e Portaria MEC **506/2025** (corpo docente, **mediadores pedagógicos**, tutores, responsável de polo, atividades presenciais, avaliações, material didático, criação/alteração/extinção de polo). O prazo de 2 anos **não é único**: cursos autorizados a partir de 19/05/2025 e pedidos a partir de 01/08/2025 têm **aplicação imediata e integral** (§2.4). Vira **regime de exigibilidade por curso/polo**, não uma data global |
| C2 | Não modelava o **mediador pedagógico** nem o **responsável pelo polo** | Novas figuras de primeira classe no módulo de Pessoas (§4.6) |
| C3 | Chamava o instrumento em revisão de "risco a monitorar" | A **proposta de novo Instrumento Institucional (consulta pública 16–28/06/2026)** já tem estrutura pública conhecida: 5 eixos, com **Eixo II dedicado a Responsabilidade Social e ODS**. Carregada como **instrumento `PROPOSTA_2026`** no catálogo, para simulação lado a lado com o vigente 2017 (§2.3) |
| C4 | ENADE modelado só como "curso enquadrado ou não" | O Enade 2026 tem **quatro modalidades** (Bacharelado/CST, Enamed, PND das licenciaturas, Avaliação da Prática) e **40 áreas**; e **a partir de 2026 o ingressante também preenche o Questionário do Estudante**. Modelado como `modalidade` na edição e `questionario_ingressante` no estudante (§2.5) |
| C5 | Não havia módulo de **supervisão** (o "SISUP" pedido pela direção) | Novo módulo **Supervisão** (§4.9): denúncias, diligências, protocolo de compromisso, medidas cautelares, sobrestamento — e o efeito jurídico que interessa: **estado que suspende a contagem dos prazos regulatórios** (art. 7º da Portaria do calendário) |
| C6 | CPA, NDE e Equipe Multidisciplinar apareciam como itens de menu sem campos definidos | Cada um vira entidade com composição, mandato, atas, reuniões e **regras verificáveis** (ex.: NDE com ≥ 5 docentes, ≥ 60% de titulação stricto sensu, ≥ 20% em regime de tempo integral, percentual de permanência) (§4.6) |
| C7 | Censo tratado como cronograma + módulos, sem os campos reais | Detalhamento dos **4 módulos do Censup** com os blocos de campos que a IES precisa manter o ano inteiro (§4.8), e o princípio: *o Censo não se preenche em março, se acumula o ano todo* |
| C8 | Sem definição de "nota máxima": o que exatamente leva um indicador ao conceito 5 | Introduzido o conceito de **Trilha do 5** (§3.4): por indicador, o texto verbatim do conceito 5 + requisitos de evidência + checklist de ações + responsável + prazo, com **impacto ponderado** calculado |
| C9 | Roadmap em 7 sprints sem entrega vertical | Substituído por entrega única funcional (o sistema deste repositório) + fases de aprofundamento (§7) |
| C10 | Não definia o **domínio, deploy e ambiente** | `mec.fabrani.com.br` na Vercel, banco Supabase, migrações SQL versionadas, seed idempotente (§6) |
| C11 | Datas de portarias com inconsistência não resolvida (Portaria 224) | Regra geral adotada: **toda norma no LegalOne guarda `data_assinatura`, `data_publicacao` e `url_dou`**, e o motor de prazos usa sempre a **data de publicação**, nunca a do cabeçalho |
| C12 | Nenhuma definição de UX além de uma lista de recomendações | Sistema de design definido e implementado: navegação em dois níveis, seletor de contexto, tela de indicador, estados vazios que ensinam (§5) |

### 0.3 O que continua em aberto (e por quê)

| # | Pendência | Encaminhamento |
|---|---|---|
| P1 | Texto **verbatim** dos critérios 1..5 de todos os indicadores do **Instrumento Institucional 2017** | O catálogo carrega os indicadores com título, eixo, peso e política NSA; os textos verbatim entram por importação de JSON assim que os PDFs oficiais forem disponibilizados. **A estrutura não muda** — é carga de conteúdo, não de código |
| P2 | Códigos e-MEC dos cursos, números/datas dos atos, IGC e CPC vigentes | Campos existem e ficam visivelmente vazios com aviso "pendente de conferência no e-MEC". O sistema **mostra o buraco**, não o esconde |
| P3 | Enquadramento automático dos cursos no Enade 2026 pelo rótulo Cine Brasil | Ação humana no Sistema Enade; o sistema registra o resultado e a declaração de não enquadramento |

---

## 1. Contexto institucional

| Campo | Valor |
|---|---|
| Instituição | Faculdade Brasileira de Negócios Inovadores — **FABRANI** |
| Código MEC (IES) | **1751876** |
| Mantenedora | Instituto de Aperfeiçoamento em Práticas da Advocacia — **IAPA** |
| CNPJ da mantenedora | 17.982.283/0001-17 |
| Organização acadêmica | Faculdade |
| Modalidade de credenciamento | **EaD** |
| Sede | Av. General Carneiro, 370 — Centro — 14870-040 — Jaboticabal/SP |
| Endereço no e-MEC | 102105 — Campus Principal |
| **CI** | **4** |
| Cursos | CST em **Marketing Digital** (CC 4) · CST em **Negócios Imobiliários** (CC 5) |

**Processo regulatório de referência** (usado como caso de teste do sistema): Reconhecimento do CST em Negócios Imobiliários — avaliação **227446**, processo **202417965**, avaliação externa **virtual** in loco de **11 a 13/08/2025**, comissão Lilian Gonçalves (ponto focal) e Ricardo Alexandre Afonso.

**Histórico avaliativo**: Autorização de Marketing Digital (avaliação 152954, protocolo 201905427, Instrumento 301, visita 24–27/11/2019, **conceito final 3,45 → faixa 3**). Os dois únicos conceitos 2 foram `2.2` Objetivos do curso e `2.14` Atividades de tutoria; a comissão registrou que *"a participação do NDE na elaboração do projeto não ficou clara"*. **Achado não tratado reaparece no ciclo seguinte** — por isso o sistema carrega achados históricos como lacunas abertas, com plano de ação e evidência de correção.

---

## 2. Pesquisa — instrumentos e obrigações MEC/INEP 2025–2026

### 2.1 Arcabouço normativo (seed do LegalOne)

| Norma | O que estabelece | Efeito no sistema |
|---|---|---|
| **Lei 10.861/2004** | Institui o SINAES; 10 dimensões; obriga a **CPA** | Módulo CPA; dimensões como entidade |
| **Decreto 9.235/2017** | Regulação, supervisão e avaliação; art. 21 = conteúdo mínimo do **PDI** | Validador de completude do PDI |
| **Decreto 12.456/2025** | **Novo marco da EaD**: formatos presencial / semipresencial / a distância; veda 100% on-line; polo com infraestrutura mínima (art. 29); polos avaliados **por amostragem** em credenciamento e recredenciamento | Módulo Polos + regime de adequação |
| **Portaria MEC 381/2025** | **Regras de transição** do Decreto 12.456: adequação integral em **até 2 anos** da publicação (19/05/2027); migração EaD → semipresencial | Motor de exigibilidade por curso |
| **Portaria MEC 506/2025** | Regulamenta o Decreto 12.456: **corpo docente** (pós-graduação, preferencialmente stricto sensu), **mediadores pedagógicos**, **tutores**, **responsável pelo polo**, atividades presenciais e avaliações, material didático e plataformas, **criação/alteração de endereço/extinção de polo** — polo informado no e-MEC em **até 60 dias**; pedidos a partir de **01/08/2025** já sob aplicação integral | Checklist de polo, cadastro de pessoal EaD, alerta dos 60 dias |
| **Portaria Normativa 23/2017** | Fluxo dos processos regulatórios | Máquina de estados do processo |
| **Portaria Normativa 21/2017** | Cadastro e-MEC como base oficial | Espelhamento local com carimbo de sincronismo |
| **Portaria Normativa 840/2018** | Consolida avaliação; art. 39: **ENADE é componente curricular obrigatório**; art. 20: relatório da comissão em até 5 dias | Regularidade bloqueia diploma; contagem de impugnação |
| **Portaria MEC 315/2018** | **Acervo acadêmico digital** íntegro, autêntico, durável | GED com SHA-256 e trilha |
| **Portaria MEC 514/2024** | **CNCST 4ª edição** (153 CST, 13 eixos tecnológicos) | Validação de denominação/carga horária |
| **Portaria 265/2022** | **Avaliação externa virtual in loco**: documentos por nuvem própria, link ao ponto focal ~1 semana antes | Pacote de visita exportável |
| **Portaria Normativa 11/2017**, art. 8º §1º | Veda EaD **sem** atividades presenciais | Regra verificável por curso |
| **Resolução CNE/CES 7/2018** | **Extensão ≥ 10%** da carga horária; em EaD, presencial e compatível com o polo | Cálculo automático na matriz |
| **Decreto 5.626/2005** | LIBRAS obrigatória em licenciaturas | Validador de matriz |
| **Portaria Normativa Inep 359/2025** | Normas gerais do Enade (áreas, enquadramento, habilitação, regularidade) | Regras do módulo ENADE |
| **Portaria MEC 276/2026** | Define as **áreas avaliadas no Enade 2026** | Seed do ciclo 2026 |
| **Edital Inep 49/2026** (DOU 27/04/2026) | Diretrizes e cronograma do **Enade 2026** | Cronograma e ações da IES |
| **Portaria Inep 771/2025** | Cronograma do **Censo 2025** (coleta 02/03 a 10/07/2026; divulgação 22/09/2026) | Seed do ciclo censitário |
| **Calendário regulatório anual (MEC)** | Janelas de protocolo no e-MEC; art. 5º: reconhecimento entre **50% e 75%** da integralização; não pagar a taxa **cancela** o processo | Motor de prazos |

### 2.2 Instrumentos vigentes

**Instrumento de Avaliação de Cursos de Graduação (2017)** — autorização, reconhecimento e renovação; presencial e EaD no mesmo documento.

| Dimensão | Peso | Indicadores |
|---|---|---|
| 1 — Organização Didático-Pedagógica | **30** | 24 |
| 2 — Corpo Docente e Tutorial | **40** | 16 |
| 3 — Infraestrutura | **30** | 18 |

**58 indicadores**, escala 1..5, `NSA` admitido com justificativa, e uma seção de **Requisitos Legais e Normativos** que **não entra no cálculo** — apenas cumprido/não cumprido, com consequência regulatória.

**Instrumento de Avaliação Institucional Externa (2017)** — credenciamento, recredenciamento e mudança de organização acadêmica. 5 eixos que reagrupam as 10 dimensões da Lei do SINAES:

| Eixo | Dimensões SINAES | Peso (recredenciamento) |
|---|---|---|
| 1 — Planejamento e Avaliação Institucional | 8 | 10 |
| 2 — Desenvolvimento Institucional | 1, 3 | 30 |
| 3 — Políticas Acadêmicas | 2, 4, 9 | 10 |
| 4 — Políticas de Gestão | 5, 6, 10 | 20 |
| 5 — Infraestrutura | 7 | 30 |

> **Os pesos são atributo da tupla (instrumento, ato)** — credenciamento e recredenciamento consideram conjuntos diferentes de indicadores. Nunca constante em código.

### 2.3 O instrumento novo (2025–2026) — proposta em consolidação

O INEP revisa os instrumentos desde 2025 por consultas públicas na plataforma Brasil Participativo:

- **jul/2025** — Dimensões Gerais do instrumento de cursos (didático-pedagógica, corpo docente, infraestrutura) + áreas de educação, engenharia e saúde;
- **10 a 24/11/2025** — Dimensões Específicas: artes e humanidades; ciências sociais, comunicação e informação; **cursos superiores de tecnologia**; administração, negócios e direito;
- **16 a 28/06/2026** — **revisão e modernização do Instrumento de Avaliação Institucional Externa**.

A proposta institucional em consolidação reorganiza os eixos assim:

| Eixo (proposta 2026) | Observação |
|---|---|
| I — Planejamento e Avaliação Institucional | mantém o núcleo do eixo 1 vigente |
| **II — Responsabilidade Social: compromisso com os ODS** | **novo eixo autônomo** — hoje diluído na dimensão 3 |
| III — Desenvolvimento Institucional e Políticas Acadêmicas | funde os eixos 2 e 3 vigentes |
| IV — Políticas de Gestão | |
| V — Infraestrutura | ênfase em transformação digital |

**Nada disso está publicado como instrumento definitivo.** A consequência de projeto é a mesma que a v0.1 já apontava, agora com conteúdo concreto: o catálogo carrega o instrumento **`INSTITUCIONAL/2017`** como vigente e **`INSTITUCIONAL/PROPOSTA-2026`** como simulável, e a IES pode rodar as duas autoavaliações em paralelo. Quem já mapeou evidências de ODS chega pronto no dia da publicação.

### 2.4 EaD: regime de exigibilidade, não data única

```
curso/polo autorizado ANTES de 19/05/2025 ............ adequação até 19/05/2027
curso convertido para semipresencial na transição .... adequação até 19/05/2027
curso autorizado A PARTIR de 19/05/2025 .............. aplicação imediata e integral
pedido protocolado A PARTIR de 01/08/2025 ............ aplicação imediata e integral
```

O sistema calcula o regime de cada curso e de cada polo a partir da data do ato e mostra, no dashboard, a contagem regressiva **por objeto**, não uma única contagem institucional.

Infraestrutura mínima de polo (Decreto 12.456 art. 29 + Portaria 506/2025) vira **checklist verificável por polo**, com laudo/evidência anexa e responsável nomeado.

### 2.5 ENADE 2026

Edital Inep nº 49/2026: **40 áreas** (21 licenciatura, 14 bacharelado, **4 CST**) + medicina via **Enamed**, em **quatro modalidades**: Enade de Bacharelados e CST · Enamed · **PND** (avaliação teórica das licenciaturas) · Avaliação da Prática das licenciaturas.

**CST avaliados em 2026:** Análise e Desenvolvimento de Sistemas (0613S01) · Gestão da TI (0612G01) · Gestão Ambiental (0712G01) · Redes de Computadores (0612R01). **Nenhum curso da Fabrani está na lista.**

Cronograma das ações da IES: enquadramento automático pelo rótulo Cine Brasil em 13/04/2026 · verificações e **declaração de não enquadramento** 27/04 a 18/05/2026 · inscrição de concluintes 27/04 a 18/05 · retificação 19 a 27/05 · **ingressantes 17/08 a 17/09** · retificação 18 a 30/09 · **Questionário do Estudante (inclusive ingressantes) 01/10 a 18/12/2026** · Questionário do Coordenador 30/11 a 04/12/2026.

Habilitação (regra calculável pelo sistema): **concluinte de CST ≥ 75%** da carga horária mínima; bacharelado/licenciatura ≥ 80%; **ingressante entre 0 e 25%**. Concluinte irregular **não cola grau e não recebe diploma** — e a situação de regularidade deve constar do histórico escolar.

Exportação em lote (Anexo VI): TXT com `;` e as colunas `CO_PROJETO;TP_ORIGEM;CO_IES;CO_CURSO;NU_CPF;NU_ANO_FIM_ENSINO_MEDIO;CO_TURNO_GRADUACAO;NU_PERCENTUAL_INTEGRALIZACAO;NU_ANO_FORMATURA`.

### 2.6 Censo da Educação Superior

Sistema **Censup**; dados cadastrais de IES e cursos vêm do Cadastro e-MEC; a IES declara os módulos **IES, Curso, Docente e Aluno**. Fluxo obrigatório por módulo: declarar → **verificação de erros** → **relatório de consistência** → justificar → **fechar**. O Censo só encerra com todos os módulos fechados, e a IES que não fecha é **inativada no Censup com publicação em DOU**.

Ciclo 2025 (Portaria Inep 771/2025): coleta 02/03 a 10/07/2026 · fechamento liberado a partir de 15/06/2026 · inativação das não fechadas a partir de 03/08/2026 · divulgação 22/09/2026. O sistema nasce apontando para o **Censo 2026** e preservando o histórico do ciclo encerrado.

---

## 3. O produto

### 3.1 Princípios

1. **Espelho executável do instrumento.** O indicador é a unidade de trabalho; tudo converge para a tela do indicador.
2. **Mostre a distância, não o estado.** "Conceito 4 → falta isto para o 5", com o texto oficial ao lado.
3. **Priorize por impacto ponderado**, não por ordem numérica.
4. **Toda automação tem caminho manual.** Importação CSV/XLSX é cidadã de primeira classe.
5. **Nada é apagado.** Versionamento, soft delete, trilha append-only.
6. **O cálculo é auditável.** A nota simulada guarda instrumento, pesos e fórmula.
7. **Audit-ready por construção.** A exportação do pacote de visita sai organizada **por indicador** — que é como a comissão pede.

### 3.2 Personas e papéis

`SUPERADMIN` · `DIRETOR` · `PI` (Procurador Educacional Institucional) · `RESPONSAVEL_LEGAL` · `COORD_CURSO` (escopo do próprio curso) · `CPA` · `NDE` · `SECRETARIA` · `DOCENTE` · `AUDITOR` (somente leitura, com validade).

Permissão = `papel × escopo (ies|curso|polo) × ação (ler|escrever|aprovar|publicar)`.

### 3.3 Cálculo de conceito

```
conceito_dimensão = média aritmética dos indicadores aplicáveis (NSA fora do denominador)
CC | CI            = Σ (conceito_dimensão × peso_dimensão) / Σ pesos
faixa              = arredondamento oficial do contínuo (≥ 3 é satisfatório)
```

Requisitos legais **não entram** no cálculo.

### 3.4 Trilha do 5

Para cada indicador o sistema mantém:

| Campo | Origem |
|---|---|
| Texto verbatim dos conceitos 1..5 | catálogo do instrumento |
| Conceito autoavaliado · meta · conceito INEP histórico | avaliação |
| Análise ("por que estamos aqui") e plano de ação ("o que falta para o 5") | IES |
| Requisitos de evidência (obrigatórios e opcionais) | catálogo |
| Evidências vinculadas, com validade | cofre de documentos |
| Responsável e prazo | IES |
| **Impacto ponderado** = `peso_dimensão × (meta − atual)` | calculado |

A lista de lacunas ordenada por impacto responde: *"se eu só puder resolver cinco coisas este ano, quais são?"*

---

## 4. Módulos

```
◉ Painel (dashboard executivo)
▸ Institucional     IES · Mantenedora · Cursos · Polos EaD · Atos autorizativos
▸ Avaliação SINAES  Instrumentos · Ciclos · Eixos · Indicadores · Requisitos legais
                    Simulador de conceito · Análise de lacunas · Visitas in loco
▸ Regulatório       Processos e-MEC · Credenciamento/Recredenciamento
                    Reconhecimento/Renovação · Janelas de protocolo
▸ Supervisão        Ocorrências · Diligências · Protocolo de compromisso · Cautelares
▸ CPA               Ciclos · Questionários · Relatório de autoavaliação
▸ Colegiados        NDE · Equipe Multidisciplinar · Colegiado · CONSUP · Reuniões e atas
▸ Pessoas           Docentes · Tutores · Mediadores pedagógicos · Responsáveis de polo
▸ ENADE             Ciclos · Enquadramento por curso · Estudantes e regularidade
▸ CENSO             Ciclos · Módulos Censup · Pendências
▸ Documentos        Acervo · PDI · PPC · Aprovações
▸ LegalOne          Normas · Impacto norma → indicador → curso
▸ Administração     Usuários e papéis · Auditoria · Instrumentos
```

### 4.1 Painel
Cinco perguntas em uma tela: **estamos regulares?** (atos e vencimentos, com prorrogação por protocolo tempestivo) · **quais são nossos conceitos?** (CI, CC por curso, CPC, IGC) · **o que vence primeiro?** (timeline unificada) · **onde estão as lacunas?** (top 10 por impacto) · **o que mudou na legislação?**. Cartão permanente de contagem regressiva da adequação EaD.

### 4.2 Avaliação SINAES
Tela de eixo (progresso ponderado), **tela de indicador** (o espelho), simulador com fórmula à vista, análise de lacunas, requisitos legais em grid binário, e o **pacote de visita** exportado por indicador.

### 4.3 Regulatório
Máquina de estados conforme a PN 23/2017:
`PLANEJAMENTO → PROTOCOLO → DESPACHO_SANEADOR → ANALISE_DOCUMENTAL → AVALIACAO_IN_LOCO → IMPUGNACAO_CTAA → PARECER_SERES → DECISAO → PUBLICACAO_DOU → ARQUIVADO`
com data de entrada, prazo legal, responsável e anexos por fase. Janela de reconhecimento calculada entre **50% e 75%** da integralização, com antecipação automática quando a janela do curso não coincide com o calendário regulatório.

### 4.4 Supervisão (o "SISUP")
Ocorrência de supervisão com origem (denúncia, ofício, resultado insatisfatório, CPC/CI < 3), diligência com prazo de resposta, **protocolo de compromisso** com metas e vigência, medida cautelar (redução de vagas, suspensão de ingresso) e **efeito nos prazos**: enquanto houver diligência, sobrestamento, protocolo de compromisso ou medida de supervisão, a promessa de prazo do calendário regulatório **fica suspensa** — e o sistema mostra isso explicitamente em vez de exibir um prazo falso.

### 4.5 CPA
Ciclo anual (sensibilização → coleta → análise → relatório → devolutiva), questionários por segmento com cada pergunta mapeada a eixo/dimensão, coleta anônima, consolidação por eixo alimentando a autoavaliação, e gerador do **Relatório de Autoavaliação Institucional** nos 5 eixos / 10 dimensões.

### 4.6 Colegiados e Pessoas — regras verificáveis

**NDE** — composição, portaria de designação, mandato, atas. Verificações: ≥ 5 docentes · ≥ 60% com **stricto sensu** · ≥ 20% em tempo integral · percentual de permanência desde o último ato.

**Equipe Multidisciplinar** (obrigatória em EaD, indicador 2.2 do instrumento de curso) — composição por perfil (docente, designer instrucional, revisor, produtor de mídia, TI), ato de constituição, plano de ação, registro de reuniões e de produção de material.

**Corpo docente e tutorial** — para cada pessoa: titulação, área, regime de trabalho, tempo de docência superior, **tempo de docência EaD**, **tempo de tutoria EaD**, experiência profissional, produção dos últimos 3 anos, disciplinas atribuídas, e desde 2025 o enquadramento como **mediador pedagógico** ou **responsável de polo**. O sistema calcula os indicadores quantitativos (2.5, 2.6, 2.7, 2.9, 2.10, 2.11, 2.13, 2.14, 2.16) e o **tempo médio de permanência** pela fórmula que a própria comissão usa.

### 4.7 ENADE
Ciclo (ano, modalidades, áreas, datas), enquadramento por curso — com o estado explícito **"sem área correspondente"** e o próximo ciclo calculado —, estudantes com percentual de integralização, habilitação, situação e **bloqueio de diploma**, exportação do arquivo de inscrição em lote.

### 4.8 CENSO — os campos que se acumulam o ano todo

| Módulo Censup | Blocos de dados que o sistema mantém |
|---|---|
| **IES** | dados cadastrais, mantenedora, receitas e despesas, biblioteca (acervo físico e digital), infraestrutura, técnicos-administrativos, programas de apoio (bolsas, moradia, alimentação, transporte), inclusão e acessibilidade |
| **Curso** | vagas oferecidas, inscritos, ingressantes por forma de ingresso, matriculados, concluintes, carga horária, local de oferta, polos, formato de oferta (presencial/semipresencial/a distância) |
| **Docente** | identificação, escolaridade, regime de trabalho, situação, deficiência, cor/raça, nacionalidade, vínculo, atuação (docente/tutor) |
| **Aluno** | identificação, situação de vínculo, forma de ingresso, financiamento, apoio social, deficiência, mobilidade acadêmica, ENADE, data de ingresso/conclusão |

Cada módulo tem status no fluxo real do Censup e uma lista de **pendências** (erro ou inconsistência) com justificativa, responsável e prazo. Comparativo entre anos para antecipar inconsistência recorrente.

### 4.9 Documentos
Upload com **SHA-256**, versionamento com documento-pai, validade (`valido_de`/`valido_ate` — evidência vencida reabre a lacuna), fluxo de aprovação (`RASCUNHO → EM_APROVACAO → VIGENTE → SUPERADO`) e trilha de quem enviou, aprovou, baixou e exportou. Aderente à Portaria 315/2018.

### 4.10 LegalOne
Normas com espécie, órgão, número, ano, **data de assinatura e de publicação**, ementa, URL do DOU, vigência, relação (revoga/altera/regulamenta/complementa), relevância e **vínculo norma ↔ indicador**, que responde a pergunta que importa: *"esta norma nova afeta quais indicadores e quais cursos?"*.

---

## 5. UX

Premium, denso e sóbrio — ferramenta de especialista, não painel decorativo.

1. **Dois níveis de navegação:** menu lateral por domínio + **seletor de contexto** (IES ou Curso X) no topo. A mesma tela serve aos dois; muda o instrumento.
2. **O indicador é a tela mais importante.** Escala 1..5 com marcador de atual e meta, textos verbatim lado a lado (atual × 5), lacuna, plano de ação, evidências com status de requisito, normas relacionadas e histórico.
3. **Semáforo com número.** Nunca só a cor: sempre a distância e o prazo.
4. **Estados vazios que ensinam:** indicador sem evidência mostra a lista dos documentos esperados e o botão de upload.
5. **Formulários com o campo do MEC, não com o campo do programador.** Cada campo traz rótulo oficial e, quando cabe, a base legal.
6. **Acessibilidade WCAG 2.1 AA** — navegação por teclado, contraste, foco visível, `aria-label`. Um sistema de conformidade inacessível é contradição em termos.
7. **pt-BR com vocabulário do domínio:** recredenciamento, NSA, in loco, concluinte, integralização.

---

## 6. Arquitetura e implementação

| Camada | Escolha |
|---|---|
| Frontend/Backend | **Next.js 15 App Router**, React 19, TypeScript, Server Actions |
| UI | Tailwind CSS v4, componentes próprios, `lucide-react` |
| Banco | **PostgreSQL (Supabase)**, acesso por SQL parametrizado (`pg`) |
| Migrações | SQL versionado em `db/migrations`, runner idempotente |
| Seed | `db/seed` idempotente: instrumentos, normas, dados da Fabrani, ciclos ENADE/Censo |
| Storage | Supabase Storage quando configurado; disco local em desenvolvimento |
| Auth | Sessão assinada (JWT `jose`) + senha `bcrypt`, papéis no banco; Google OAuth previsto |
| Deploy | **Vercel** → `mec.fabrani.com.br` |
| Auditoria | Tabela append-only de todas as escritas |

Modelo de dados completo em `db/migrations/0001_init.sql`; catálogo de instrumentos em `catalog/instrumentos/*.json`.

**Princípio de portabilidade:** a dependência real é do PostgreSQL, não da Supabase. Trocar `DATABASE_URL` move o sistema inteiro para qualquer Postgres.

---

## 7. Entrega e fases seguintes

**Entregue nesta versão:** modelo de dados completo, migrações, seed com os dados reais da Fabrani, catálogos de instrumento (curso 2017 e institucional 2017 + proposta 2026), autenticação com papéis, painel executivo, avaliação SINAES com tela de indicador e simulador, análise de lacunas, todos os módulos de lançamento de dados com os campos exigidos pelo MEC, upload e versionamento de documentos, motor de prazos e trilha de auditoria.

**Fase 2:** transcrição verbatim completa do instrumento institucional · Google OAuth e RLS no Supabase · ingestão de dados abertos e-MEC/INEP · geração do pacote de visita em ZIP/PDF · questionários públicos da CPA · banco de questões ENADE · benchmarking regional com microdados do Censo.

---

## 8. Glossário

**AVA** Ambiente Virtual de Aprendizagem · **CC** Conceito de Curso · **CI** Conceito Institucional · **CNCST** Catálogo Nacional de Cursos Superiores de Tecnologia · **CPA** Comissão Própria de Avaliação · **CPC** Conceito Preliminar de Curso · **CST** Curso Superior de Tecnologia · **CTAA** Comissão Técnica de Acompanhamento da Avaliação · **DCN** Diretrizes Curriculares Nacionais · **EaD** Educação a Distância · **ENADE** Exame Nacional de Desempenho dos Estudantes · **IDD** Indicador de Diferença entre os Desempenhos Observado e Esperado · **IGC** Índice Geral de Cursos · **NDE** Núcleo Docente Estruturante · **NSA** Não Se Aplica · **ODS** Objetivos de Desenvolvimento Sustentável · **PDI** Plano de Desenvolvimento Institucional · **PI** Procurador Educacional Institucional · **PND** Prova Nacional Docente · **PPC** Projeto Pedagógico de Curso · **SERES** Secretaria de Regulação e Supervisão da Educação Superior · **SINAES** Sistema Nacional de Avaliação da Educação Superior

## 9. Fontes

- Edital Inep nº 49/2026 — Enade 2026 (DOU 27/04/2026)
- Portaria Normativa Inep nº 359/2025 · Portaria MEC nº 276/2026
- Portaria Inep nº 771/2025 — Cronograma do Censo da Educação Superior 2025
- Decreto nº 12.456/2025 · Portaria MEC nº 381/2025 · Portaria MEC nº 506/2025
- Consulta pública Inep — Instrumento de Avaliação Institucional Externa (16 a 28/06/2026)
- Consulta pública Inep — Instrumentos de Avaliação in loco dos Cursos de Graduação (jul e nov/2025)
- Instrumentos de Avaliação INEP 2017 — cursos de graduação e institucional externa
- Lei nº 10.861/2004 · Decreto nº 9.235/2017 · Portarias Normativas MEC 21, 23 e 24/2017 e 840/2018 · Portaria MEC 315/2018 · Portaria MEC 514/2024 · Resolução CNE/CES 7/2018
