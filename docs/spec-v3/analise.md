# Análise do sistema antes de implantar — 2026-07-29

Leitura crítica do que está no ar (`mec.fabrani.com.br`, Supabase `xpcyrpzvxpcsldfjtksx`,
repo `fabranielias/fabrani`) confrontada com a spec base do Elias
(`spec-base-elias-2026-08-10.md`, preservada íntegra) e com o pedido novo:
**melhorar o CRUD e ter upload de arquivos nomeados salvos no Supabase**.

Tudo abaixo foi verificado no código e no banco de produção nesta data, não é suposição.

---

## 1. Foto do banco de produção (contagem real, 2026-07-29)

| Cheio | Vazio (o problema) |
|---|---|
| `criterio_conceito` 650 · `requisito_evidencia` 141 · `indicador` 130 · `socrates_sugestao` 125 · `avaliacao_indicador` 109 · `requisito_legal` 24 · `avaliacao_requisito_legal` 24 · `indicador_norma` 23 · `norma` 14 · `norma_dispositivo` 14 · `eixo` 13 · `censo_modulo` 8 · `modelo_documento` 7 · `prazo` 6 · `colegiado` 5 · `usuario` 3 | **`documento` 1** · **`evidencia_vinculo` 0** · `pessoa` 0 · `colegiado_membro` 0 · `reuniao` 0 · `cpa_resultado` 0 · `enade_estudante` 0 · `censo_pendencia` 0 · `processo_fase` 0 · `indicador_qualidade` 0 · `socrates_acao`/`socrates_interacao`/`socrates_execucao` 0 |

O diagnóstico da spec base está correto e continua válido: **o sistema é hoje um espelho
perfeito do instrumento sem lastro documental**. O único `documento` existente é a ata que
o Sócrates gerou em teste, com `storage_provider = 'local'` e `storage_path = null`.

**Impressão dura:** numa visita in loco, 109 indicadores com conceito autoavaliado e
`evidencia_vinculo = 0` é pior do que não ter sistema — é autoavaliação sem prova. Fechar
esse buraco (upload + vínculo) tem prioridade sobre qualquer funcionalidade nova.

---

## 2. Documentos e arquivos — o que está quebrado hoje

### 2.1 O arquivo não é salvo em lugar nenhum (bloqueador)

`src/lib/storage.ts` exige `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.
Nenhuma das duas está configurada. Consequência real em
`src/app/painel/documentos/acoes.ts`:

```ts
if (storageConfigurado()) { storagePath = await enviarArquivo(...); provider = "SUPABASE"; }
// senão: grava a linha em `documento` com storage_path = null, provider = 'PENDENTE'
```

Ou seja: **o usuário sobe o arquivo, o sistema calcula o SHA-256, grava o metadado e
descarta o binário**. Há um aviso âmbar na tela, mas o fluxo conclui com sucesso — é o
pior desenho possível (falha silenciosa com aparência de sucesso). Falta a *secret key*
`sb_secret_…` do Supabase; sem ela nada de arquivo funciona.

### 2.2 Upload maior que 1 MB falha (bug silencioso)

O formulário anuncia "até 25 MB" e a action valida 25 MB, mas `next.config.ts` está vazio:
Server Actions do Next 15 têm **limite padrão de 1 MB de body**. Qualquer PDF real
(instrumento, PPC, contrato) estoura antes de chegar na action. Precisa de
`experimental.serverActions.bodySizeLimit` — e, para 25–50 MB, o caminho correto é
**upload direto do browser para o Storage com URL assinada**, não passar o binário pelo
servidor.

### 2.3 Não existe download

`documento/[id]` diz "use o acervo para baixá-lo", e o acervo não tem botão de download.
`urlAssinada()` existe em `storage.ts` e **não é chamada em nenhum lugar do app**. Hoje o
acervo é write-only.

### 2.4 O vínculo de evidência é estreito demais

`evidencia_vinculo` só aponta para `avaliacao_indicador` (+ `requisito_evidencia`
opcional). Não dá para anexar documento a **curso, polo, ato, processo, prazo, reunião,
pessoa, sugestão do Sócrates ou requisito legal** — exatamente os lugares onde a
secretaria guarda papel no dia a dia. A spec base já pedia alvo polimórfico (task-07);
concordo e amplio a lista de alvos.

### 2.5 Faltam nomear, organizar e achar

O pedido do Elias ("incluir arquivos e documentos, **nomeando-os**") hoje se resume a um
campo `titulo` livre. Faltam: renomear depois do upload, múltiplos arquivos de uma vez,
arrastar-soltar, nome de arquivo normalizado no Storage, pastas/taxonomia além de
`categoria`, tags, busca por título/descrição, e substituição de arquivo mantendo versão.

### 2.6 Versionamento existe no banco e não na tela

`documento_pai_id`/`versao`/`status=SUPERADO` funcionam na action, mas não há histórico de
versões na interface, nem diff, nem "restaurar versão".

---

## 3. CRUD genérico — o que precisa melhorar

O registry (`src/lib/registry.ts`, 25 entidades) foi um acerto: uma fonte de verdade gera
lista, formulário e validação. Os limites, hoje:

| # | Lacuna | Efeito prático |
|---|---|---|
| C1 | **Não existe excluir** (`crud.ts` só tem `listar/obter/salvar`) | erro de digitação vira lixo permanente; usuário pede exclusão e não tem |
| C2 | **Sem paginação** (`limit 300`) e sem ordenação por coluna | quebra assim que entrarem alunos/docentes/documentos reais |
| C3 | **Busca só pelo campo-título**, sem filtros por status/curso/ano | inútil em `avaliacao_indicador`, `documento`, `prazo` |
| C4 | **Sem anexos por registro** | o documento vive num acervo separado do registro que ele comprova |
| C5 | **Sem visão de relacionados** (curso → polos, atos, documentos, docentes) | navegação obriga a ir a outra tela e filtrar na mão |
| C6 | **Sem histórico por registro** | `auditoria_log` existe, mas só numa tela global |
| C7 | **Erro de banco vai cru para a tela** (unique/fk/check) | mensagem incompreensível para a secretaria |
| C8 | **`carregarOpcoesRef` faz N queries e carrega 500 linhas por ref**, sem busca | lento e inutilizável quando `pessoa` tiver centenas de linhas |
| C9 | **Formulário sem seções, sem campos condicionais, sem "salvar e novo"** | telas longas (curso tem ~20 campos) sem hierarquia visual |
| C10 | **Sem import/export CSV** | carga inicial de docentes/alunos (tasks 11/12 da spec base) fica manual |
| C11 | **Sem confirmação de saída com alterações não salvas** | perda de digitação longa |
| C12 | **Permissão é binária** (`podeEscrever`) | task-01 da spec base pede menor privilégio por papel |

---

## 4. Onde discordo / o que ajusto na spec base

A spec base é boa e está aprovada; mantida integralmente como anexo. Minhas ressalvas:

1. **Ordem das waves.** A spec base coloca evidências (task-07) na wave 3. Com
   `evidencia_vinculo = 0`, isso é o gargalo nº 1 e deve vir **antes** do calendário e do
   painel vermelho: sem documento anexável, as regras G4/G5 nascem sem como fechar e o
   workspace "Como Resolver" não tem o que oferecer. **Proposta: evidências viram wave 1.**
2. **"Edge functions" / `pg_cron`.** A spec base assume arquitetura Supabase Edge. O
   sistema real é **Next.js App Router na Vercel falando com o Postgres via `pg` com
   service role**; já existe `vercel.json` com cron diário chamando
   `/api/cron/socrates`. Não vale trocar de arquitetura — as tasks devem ser reescritas
   como *route handlers* + Vercel Cron.
3. **`_migration` e `get_advisors`.** O repo já tem seu próprio controle de migrações
   (`scripts/migrate.ts` + tabela `_migration`, 3 aplicadas) — mantenho. `get_advisors` é
   ferramenta de MCP do Supabase; substituo por checklist de segurança equivalente
   executado por SQL.
4. **Desativar `contato@fabrani.com.br`.** Concordo, com uma ressalva: é a conta usada
   pelo seed (`SEED_ADMIN_EMAIL`). Desativar exige antes garantir contas nominais ativas
   (Elias já existe; Thomaz existe como `secretaria@`, mas com nome "thomaz" e não conta
   nominal). Precisa de decisão do Elias.
5. **Robô e-MEC/DOU (task-10).** Tecnicamente viável para o DOU (API pública da Imprensa
   Nacional). Para o e-MEC, a consulta pública não tem contrato estável e usa proteção
   anti-bot; o realista é **snapshot HTML + diff com watchdog**, aceitando falha, e nunca
   prometer detecção em 24h como garantia. Manter, mas rebaixar a expectativa.
6. **Supabase Auth + 2FA (task-13).** Concordo que auth caseiro é dívida. Mas antes disso
   há um ganho barato e imediato: **rate limit de login + "esqueci minha senha" + política
   de senha**, que hoje não existem. Sugiro esse passo intermediário.
7. **Multi-tenant fora de escopo.** Concordo, mas peço um cuidado barato agora: nada de
   `ies_id` hard-coded no código; sempre resolver a IES por consulta.

---

## 5. Riscos e bloqueadores

| Risco | Gravidade | Como tratar |
|---|---|---|
| **Falta a secret key do Supabase (`sb_secret_…`)** | bloqueia todo o upload | Elias precisa fornecer (Settings → API Keys) |
| Chave Anthropic e token Vercel expostos em conversa | alta | rotacionar antes de qualquer novo deploy |
| Upload >1 MB falhando em silêncio | alta | limite de body + upload direto via URL assinada |
| Dados pessoais (CPF de docentes/alunos) entrando no sistema | alta (LGPD) | mascarar exibição, restringir por papel, auditar acesso |
| Bucket público por engano | alta | bucket privado + somente URL assinada com expiração ≤1h |
| 125 sugestões de uma única regra sem dedupe | média | agrupamento por `grupo_key` (task-04 da base) |

---

## 6. Recomendação de sequência (revisada)

| Onda | Entrega | Por quê primeiro |
|---|---|---|
| **1** | Storage real + upload multi-arquivo + download assinado + anexos por registro + vínculo polimórfico | destrava evidência, que é o gargalo real e a maior exposição na visita |
| **2** | CRUD profissional: excluir com trava, paginação, filtros, relacionados, histórico, erros legíveis, import CSV | é o que a secretaria usa 8h por dia |
| **3** | Calendário MEC + prazos recorrentes (tasks 02/03 da base) | previsibilidade do ano regulatório |
| **4** | Fique de Atenção + 13 regras com dedupe (tasks 04/05) | agora as regras têm como fechar |
| **5** | Workspace "Como Resolver" (task-06) + geração de documentos (09) | fecha o ciclo com o Sócrates |
| **6** | Pesquisa CPA (08), docentes (11), Censo/ENADE (12) | esteiras de dados |
| **7** | Robô e-MEC/DOU (10) e depois Auth/2FA (13) | maior risco técnico por último |

A spec detalhada das ondas 1 e 2 está em `spec.md` (deste diretório), pronta para
implantação; as ondas 3–7 seguem a spec base do Elias com os ajustes do §4.
