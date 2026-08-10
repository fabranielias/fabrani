# SPEC v3 — Acervo documental e CRUD operacional (FABRANI / mec.fabrani.com.br)

**Base:** `spec-base-elias-2026-08-10.md` (spec do Elias, preservada íntegra e mantida como
fonte de verdade das ondas 3–7) + `analise.md` (leitura crítica do sistema em 2026-07-29).
**Escopo desta spec:** ondas 1 e 2 — **documentos/arquivos no Supabase Storage** e
**CRUD operacional**. As demais tasks (calendário, painel vermelho, workspace, robô, auth)
continuam como na spec base, com os ajustes do §4 da análise.

**Arquitetura real (não mudar nesta fase):** Next.js 15 App Router na Vercel · Postgres do
Supabase acessado por `pg` com credencial de serviço · migrações versionadas por
`scripts/migrate.ts` + tabela `_migration` · cron pela Vercel (`vercel.json`) · registry
único (`src/lib/registry.ts`) gerando lista/formulário das 25 entidades.

**Idioma:** todo o produto em pt-BR. **Auditoria:** toda mutação em `auditoria_log`.

---

## PARTE A — Acervo documental (onda 1)

### A0. Pré-requisito bloqueante

`SUPABASE_SERVICE_ROLE_KEY` (`sb_secret_…`) e `NEXT_PUBLIC_SUPABASE_URL` em produção.
Sem elas, **nada de arquivo funciona**. Enquanto ausentes, o sistema deve **recusar o
upload** com mensagem clara em vez de gravar metadado órfão (comportamento atual).

### A1. Modelo de dados (migration `0004_acervo.sql`)

1. `documento` — acrescentar:
   - `nome_exibicao` (text) — nome dado pelo usuário, editável a qualquer momento;
   - `pasta` (text, null) — caminho lógico simples (`Regulatório/Atos`, `CPA/2026`);
   - `tags` (text[]) — busca livre;
   - `origem` (text: `UPLOAD`|`GERADO`|`IMPORTADO`);
   - `busca` (tsvector gerado de `titulo`+`nome_exibicao`+`descricao`+`tags`) + índice GIN;
   - `excluido_em`/`excluido_por` (soft delete — documento nunca some do histórico).
2. `evidencia_vinculo` — tornar polimórfico, preservando o que existe:
   - `alvo_tipo` (`AVALIACAO_INDICADOR`|`REQUISITO_LEGAL`|`CURSO`|`POLO`|`ATO`|`PROCESSO`|`PRAZO`|`REUNIAO`|`PESSOA`|`CPA_CICLO`|`CENSO_ANO`|`SUGESTAO`), `alvo_id` (uuid);
   - backfill: linhas atuais viram `alvo_tipo='AVALIACAO_INDICADOR'` (hoje são 0, migração trivial);
   - `unique (documento_id, alvo_tipo, alvo_id, requisito_evidencia_id)` — sem vínculo duplicado;
   - índice por (`alvo_tipo`,`alvo_id`).
3. `documento_versao` **não** é criada: a cadeia `documento_pai_id`/`versao` já existe e é suficiente; passa a ter tela.
4. Bucket **privado** `evidencias` no Supabase Storage; nenhuma policy pública; acesso só por URL assinada emitida pelo backend.

Toda migration idempotente (`if not exists` / `do $$ … $$`), registrada em `_migration`,
com o rollback anotado no cabeçalho do arquivo.

### A2. Upload (RF)

- **U1.** O SISTEMA DEVE aceitar **múltiplos arquivos** por vez, com arrastar-soltar e
  seleção manual, mostrando por arquivo: nome, tamanho, progresso e resultado.
- **U2.** Arquivos DEVEM subir **direto do browser para o Supabase Storage** por URL
  assinada de upload emitida pelo backend (`/api/documentos/upload-url`), evitando o limite
  de body das Server Actions. Limite por arquivo: **50 MB**. Tipos aceitos: PDF, DOCX, XLSX,
  PPTX, CSV, PNG, JPG, ZIP.
- **U3.** Antes de emitir a URL, o backend DEVE checar sessão e papel; a resposta contém o
  `storage_path` definitivo no padrão `ies/{ano}/{categoria|geral}/{uuid}-{slug-do-nome}.{ext}`
  (nome de arquivo normalizado: sem acento, sem espaço, minúsculo).
- **U4.** Concluído o envio, o cliente chama `/api/documentos/confirmar` com o path e os
  metadados; o backend confere que o objeto existe no bucket, lê `size`/`mime`, calcula
  **SHA-256** e só então grava a linha em `documento`. Objeto sem confirmação em 1h é
  removido por rotina de limpeza (sem órfão no bucket).
- **U5.** QUANDO o SHA-256 já existir, O SISTEMA DEVE avisar "arquivo idêntico já no
  acervo" e oferecer: vincular o existente ao novo alvo **ou** registrar como nova versão —
  nunca duplicar o binário em silêncio.
- **U6.** SE o Storage não estiver configurado ou falhar, O SISTEMA DEVE recusar o envio com
  erro explícito e **não** criar registro em `documento`.
- **U7.** O upload DEVE poder nascer já vinculado a um alvo (`alvo_tipo`+`alvo_id`), criando
  `documento` + `evidencia_vinculo` na mesma transação.

### A3. Nomear, organizar e achar (RF)

- **N1.** Todo documento tem **nome de exibição editável** (`nome_exibicao`), independente do
  nome do arquivo original, que fica preservado em `nome_arquivo`.
- **N2.** Renomear, mudar pasta, categoria, tags, validade e status DEVE ser possível sem
  reenviar o arquivo; cada alteração vai para `auditoria_log`.
- **N3.** O acervo DEVE ter busca full-text (título, nome, descrição, tags) + filtros por
  categoria, pasta, status, curso, polo, validade (vigente/vencido/sem validade) e
  "sem vínculo"; e ordenação por data, nome ou validade.
- **N4.** Sugestão de nome padronizado ao subir, a partir de categoria + curso + data
  (ex.: `ATA-NDE-Marketing-Digital-2026-03-12`), sempre editável.

### A4. Download, visualização e integridade (RF)

- **D1.** Download somente por **URL assinada com expiração ≤ 15 min**, emitida por
  `/api/documentos/[id]/download` após checagem de papel; o `storage_path` nunca vai ao
  cliente.
- **D2.** Visualização embutida para PDF e imagem no detalhe do documento.
- **D3.** Toda emissão de URL grava `auditoria_log` (`acao=DOWNLOAD`, quem, quando).
- **D4.** O detalhe DEVE exibir SHA-256, tamanho, mime, quem enviou, quando, versão, cadeia
  de versões (com link para as anteriores) e todos os vínculos.

### A5. Versões e ciclo de vida (RF)

- **V1.** "Substituir arquivo" cria **nova versão** (`versao+1`, `documento_pai_id`), marca a
  anterior `SUPERADO` e **mantém os vínculos** apontando para a versão vigente.
- **V2.** Documento `VIGENTE` é imutável no binário: correção = nova versão.
- **V3.** Excluir é **soft delete** e exige papel `SUPERADMIN` + justificativa; o binário é
  removido do bucket só após 30 dias (rotina), o registro permanece para auditoria.
- **V4.** `valido_ate` vencido marca o documento como **VENCIDO** na interface e alimenta a
  regra `evidencia_vencida` da spec base.

### A6. Cobertura de evidências (RF)

- **E1.** Tela "Evidências" por indicador e por requisito legal: o que
  `requisito_evidencia` exige × o que está anexado × validade, com **% de cobertura**.
- **E2.** Mini-card no painel: "Evidências: X de Y indicadores cobertos" e "N documentos
  vencidos".
- **E3.** QUANDO um documento for vinculado a um indicador, ENTÃO a sugestão
  `indicador_sem_evidencia` daquele item fecha AUTO no próximo ciclo de regras.
- **E4.** **Triagem em lote**: página que recebe vários arquivos e permite classificar em
  fila (tipo + alvo + validade) — feita para a carga inicial do acervo da FABRANI.

### A7. Critérios de aceite (onda 1)

- Subir 3 arquivos de uma vez, um deles com 20 MB, todos chegam ao bucket e aparecem no acervo.
- Baixar um arquivo funciona; o link expira; usuário sem papel recebe 403.
- Renomear um documento não quebra o arquivo nem os vínculos.
- Anexar documento a um indicador fecha o card correspondente no próximo ciclo de regras.
- Subir o mesmo arquivo duas vezes não duplica binário: oferece vincular ou versionar.
- Storage indisponível ⇒ erro visível e **zero** registro órfão em `documento`.
- Excluir sem ser SUPERADMIN é bloqueado; excluir com justificativa mantém trilha.

---

## PARTE B — CRUD operacional (onda 2)

Tudo abaixo é implementado **no registry**, valendo para as 25 entidades de uma vez.

### B1. Registry — extensões

```ts
type Campo = { …
  secao?: string;              // agrupa campos no formulário
  filtravel?: boolean;         // vira filtro na lista
  ordenavel?: boolean;
  somenteLeitura?: boolean;
  mascara?: "cpf" | "cnpj" | "telefone";
  sensivel?: boolean;          // exibição mascarada + acesso por papel (LGPD)
};

type Entidade = { …
  papeisEscrita?: string[];    // menor privilégio por papel
  permiteExcluir?: boolean;
  anexos?: boolean;            // habilita aba de documentos no registro
  relacionados?: { entidade: string; campo: string; rotulo: string }[];
  unicos?: { campos: string[]; mensagem: string }[];  // erro legível em vez de erro do banco
};
```

### B2. Lista (RF)

- **L1.** Paginação server-side (50/pág.) com total, e ordenação clicando na coluna.
- **L2.** Filtros por campo `filtravel` (select/date-range/boolean) combináveis com a busca
  textual, preservados na URL (link compartilhável).
- **L3.** Busca passa a cobrir os campos de texto principais da entidade, não só o título.
- **L4.** Exportar a visão atual (com filtros) em CSV.
- **L5.** Ações em massa: alterar status, atribuir responsável, excluir (com as travas de B4).
- **L6.** Contadores de estado (ex.: "3 sem responsável") como atalhos de filtro.

### B3. Formulário (RF)

- **F1.** Campos agrupados por `secao`, com resumo do que falta preencher no topo.
- **F2.** Validação no cliente e no servidor, com **mensagem legível para violação de
  unicidade e de chave estrangeira** (nada de erro cru do Postgres na tela).
- **F3.** Selects de referência com **busca assíncrona** (digitou → consulta), sem carregar
  500 linhas; e link "criar novo" que volta para o formulário de origem.
- **F4.** "Salvar", "Salvar e criar outro" e "Duplicar registro".
- **F5.** Aviso ao sair com alterações não salvas.
- **F6.** Campos `sensivel` (CPF) exibidos mascarados; ver o valor completo exige papel
  autorizado e grava `auditoria_log`.

### B4. Excluir (RF)

- **X1.** Excluir exige `SUPERADMIN` e confirmação digitando o nome do registro.
- **X2.** Antes de excluir, o sistema **mostra o que depende** do registro (contagem por
  tabela filha) e bloqueia quando houver dependência que não deva cascatear.
- **X3.** Entidades com `ativo` usam **desativação** em vez de exclusão (padrão preferido).
- **X4.** Exclusão grava `auditoria_log` com o registro completo em `antes`.

### B5. Registro individual (RF)

- **R1.** Aba **Anexos**: upload e lista dos documentos vinculados àquele registro
  (usa a Parte A), com validade e cobertura.
- **R2.** Aba **Relacionados**: filhos e vínculos (curso → polos, atos, docentes, indicadores,
  documentos), cada um com contagem e link.
- **R3.** Aba **Histórico**: linha do tempo do `auditoria_log` daquele registro
  (quem mudou o quê, antes/depois).
- **R4.** Selo de completude: % de campos obrigatórios e recomendados preenchidos, com a
  lista do que falta — insumo direto das regras do Sócrates.

### B6. Importação CSV (RF)

- **I1.** Por entidade: baixar template com os cabeçalhos do registry.
- **I2.** Upload → **pré-visualização com validação linha a linha** → importar só as linhas
  válidas, com relatório de erros exportável.
- **I3.** Importação é transacional por lote e registrada em `auditoria_log`.

### B7. Permissões (RF)

- **P1.** Escrita por entidade conforme `papeisEscrita` (menor privilégio), não mais um
  `podeEscrever` global.
- **P2.** `AUDITOR` e `DOCENTE` permanecem somente leitura; `SECRETARIA` opera o dia a dia;
  ações destrutivas são de `SUPERADMIN`.

### B8. Critérios de aceite (onda 2)

- Lista com 5.000 registros carrega paginada em ≤1s e os filtros voltam na URL.
- Tentar gravar e-mail de usuário duplicado mostra "Já existe um usuário com este e-mail",
  não erro do Postgres.
- Excluir um curso com polos vinculados é bloqueado com a lista do que depende dele.
- Importar CSV de docentes com 2 linhas inválidas importa as demais e detalha as 2.
- Anexar documento pela aba Anexos do curso cria `documento` + `evidencia_vinculo` correto.
- Aba Histórico mostra a alteração feita segundos antes.

---

## PARTE C — Segurança mínima nesta fase (antecipa a task-01 da base)

1. Bucket privado, sem policy pública, acesso só por URL assinada curta.
2. `REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM anon, authenticated`.
3. Extensão `vector` fora do schema `public`.
4. Rate limit de login (5 tentativas / 15 min por e-mail+IP) e registro das falhas.
5. Rotação das credenciais expostas (Anthropic, Vercel, banco) **antes** do próximo deploy.
6. Conta compartilhada `contato@`: manter só até Elias e Thomaz terem contas nominais
   confirmadas; depois `ativo=false` (não deletar).
7. CPF e dados de aluno com exibição mascarada e acesso por papel.

*(Supabase Auth + 2FA seguem como task-13 da spec base, por último.)*

---

## PARTE D — Reconciliação com as 14 tasks da spec base

| Task base | Situação | Ajuste nesta spec |
|---|---|---|
| 00 Localizar repo | **Concluída** — repo `fabranielias/fabrani`, app roda, `docs/` existe | resta `docs/arquitetura.md` |
| 01 Segurança imediata | pendente | itens 2, 3, 6 da Parte C |
| 02 Prazos recorrentes | pendente | manter; cron pela Vercel, não pg_cron |
| 03 UI Calendário MEC | pendente | manter |
| 04 Motor de 13 regras | **parcial** — motor existe com regras próprias + radar; falta dedupe/`grupo_key` e 12 das 13 regras | manter escopo, reaproveitar `src/lib/socrates/regras.ts` |
| 05 UI Fique de Atenção | pendente | manter |
| 06 Workspace resolver | **parcial** — Sócrates já tem plano→diff→aceite e gera documentos; falta o workspace por card | manter |
| 07 Evidências | **substituída pela Parte A** (mais ampla) | onda 1, prioridade máxima |
| 08 Pesquisa CPA | pendente | manter |
| 09 Geração/envio de documentos | **parcial** — geração existe (7 modelos, rascunho, auditoria); falta PDF, numeração e registro de envio | manter o que falta |
| 10 Robô e-MEC/DOU | pendente | DOU via API pública; e-MEC por snapshot+diff, sem promessa de SLA |
| 11 Docentes/colegiados | pendente | usa B6 (CSV) e A (anexos) |
| 12 Censo/ENADE | pendente | usa B6 |
| 13 Supabase Auth + 2FA | pendente | precedido pelo rate limit + reset de senha da Parte C |

---

## PARTE E — Definição de pronto (global)

- Critérios de aceite demonstráveis na interface, com print no PR.
- Migration idempotente, em `_migration`, com rollback documentado no cabeçalho.
- `npm run typecheck`, `npm run lint`, `npm run build` e `npm run db:validar` limpos.
- Mutação relevante em `auditoria_log`, verificada.
- Nenhuma credencial em código, log ou commit; bucket privado conferido.
- Nada de dado factual inventado pelo Sócrates: lacuna vira `[INFORMAR: …]` + pendência.
