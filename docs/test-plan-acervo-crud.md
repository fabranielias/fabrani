# Test plan — Acervo de documentos + CRUD genérico (PR #1)

Ambiente: dev server local `npm run dev` (http://localhost:3000), Postgres `mec` em Docker (54322),
Supabase Storage real (bucket `evidencias`). Logado como `contato@fabrani.com.br` (SUPERADMIN).

Dados de apoio já preparados (setup, fora da gravação):
- Arquivos em `C:\Users\Administrator\testfiles`: `relatorio-cpa-2026.txt`, `ata-colegiado.txt`, `ppc-curso.txt`, `ppc-curso-v2.txt`.
- 30 registros `pessoa` "Teste Paginação NN" inseridos via SQL para exercitar paginação de 25/página.

Evidência de código que embasa o plano:
- Upload: `src/components/EnvioArquivos.tsx:109-175` (upload-url → PUT bucket → confirmar), campo de nome editável em `:293-299`.
- Dedup por SHA-256: `src/app/api/documentos/confirmar/route.ts:53-71` (responde `duplicado:true`, remove a cópia).
- Nova versão: `confirmar/route.ts:73-127` (versão = pai+1, pai vira `SUPERADO`, herda vínculos).
- Download assinado 15 min + `documento_acesso`: `src/app/api/documentos/[id]/download/route.ts:22-26`.
- Acervo/métricas/filtros: `src/app/painel/documentos/page.tsx:41-111,128-191`.
- Detalhe/vínculo/exclusão: `src/app/painel/documentos/[id]/page.tsx`, `.../SeletorVinculo.tsx`, `.../ExcluirDocumento.tsx`, `acoes.ts:60-90`.
- CRUD lista/paginação/ordenação/CSV: `src/app/painel/dados/[entidade]/page.tsx:70-248`, `src/lib/crud.ts:37,71-101`, `src/app/api/dados/[entidade]/csv/route.ts:38-49`.
- "Salvar e criar outro": `src/components/FormularioEntidade.tsx:135-144` + `src/app/actions.ts:62-65`.
- Exclusão recusada por dependência: `src/lib/crud.ts:241-277`; erro amigável de único: `src/lib/crud.ts:221-238`.

---

## T1 — Upload de 2 arquivos de uma vez, com nome de exibição editado
1. Ir a `/painel/documentos`. Anotar valor da métrica "Documentos" (N) e o contador "X documento(s)".
2. No card "Enviar documentos", clicar "escolha do computador" e selecionar **os dois** arquivos
   `relatorio-cpa-2026.txt` e `ata-colegiado.txt` na mesma seleção.
3. Editar o nome do 1º item para `Relatório CPA 2026 — Teste E2E` e o 2º para `Ata do Colegiado — Teste E2E`.
   Definir Categoria = a 1ª opção disponível, Pasta = `CPA/2026`, Situação = Vigente.
4. Clicar "Enviar 2 arquivo(s)".

Passa se: os dois itens mostram ícone verde de concluído; a lista de documentos passa a conter
**exatamente** as linhas `Relatório CPA 2026 — Teste E2E` e `Ata do Colegiado — Teste E2E`
(nomes editados, não `relatorio cpa 2026`); a sub-linha de cada uma exibe `CPA/2026` e o nome
original do arquivo (`relatorio-cpa-2026.txt` / `ata-colegiado.txt`); métrica "Documentos" = N+2;
contador "X documento(s)" aumenta em 2; nenhuma linha traz o selo "sem arquivo anexado".
Falha se: nome exibido for o do arquivo, faltar arquivo/tamanho, ou aparecer estado de erro.

## T2 — Deduplicação do mesmo arquivo
1. No mesmo card, escolher novamente **apenas** `relatorio-cpa-2026.txt`, editar o nome para
   `Cópia duplicada — não deve criar registro` e clicar "Enviar 1 arquivo(s)".

Passa se: o item termina com ícone âmbar e a mensagem "Arquivo idêntico já no acervo: vínculo
reaproveitado."; a métrica "Documentos" **permanece** N+2 (não N+3); não existe linha
`Cópia duplicada — não deve criar registro` na lista.
Falha se: for criado um novo documento ou a métrica subir.

## T3 — Download entrega o arquivo e registra o acesso
1. Na linha `Relatório CPA 2026 — Teste E2E`, clicar "baixar".
2. Abrir a barra/pasta de downloads e abrir o arquivo baixado.

Passa se: o download conclui como `relatorio-cpa-2026.txt` e o conteúdo aberto contém o texto
`RUN1-A` (marcador único do arquivo de origem, provando que o binário veio do bucket).
Depois, em `/painel/documentos/<id>`, o card "Histórico de acesso" lista uma entrada
`Download · contato@fabrani.com.br` com data/hora.
Falha se: baixar HTML/JSON de erro, conteúdo divergente, ou histórico sem o Download.

## T4 — Detalhe: edição de metadados, vínculo e desvínculo
1. Abrir `/painel/documentos/<id de Relatório CPA 2026 — Teste E2E>`.
2. Em "Dados do documento": trocar o nome para `Relatório CPA 2026 — renomeado`, definir
   Etiquetas = `cpa, teste`, Válido até = `2026-12-31`, e salvar.
3. Em "Vínculos de evidência": tipo = Curso, registro = `Curso Superior de Tecnologia em Marketing Digital`,
   clicar "Vincular".
4. Clicar "remover" no vínculo recém-criado.

Passa se: (2) após salvar, o título da página e os selos mostram `Relatório CPA 2026 — renomeado`,
selos `cpa` e `teste`, e o card Arquivo mantém "Nome original: relatorio-cpa-2026.txt";
(3) o vínculo aparece listado como `Curso · Curso Superior de Tecnologia em Marketing Digital` e,
no acervo, a coluna "Vínculos" da linha vai de 0 para 1;
(4) após remover, a lista volta a "Ainda sem vínculo — o documento não conta como evidência."
Falha se: nome original for sobrescrito, vínculo não aparecer/permanecer, ou contador não mudar.

## T5 — Nova versão herda vínculo e supera a anterior
1. No detalhe do documento `Ata do Colegiado — Teste E2E`, vincular ao Polo `Polo Sede — Jaboticabal`.
2. No card "Nova versão", escolher `ppc-curso-v2.txt`, nome `Ata do Colegiado — v2`, e enviar.
3. Abrir a versão 2 pela lista "Versões".

Passa se: o card "Versões" passa a listar `v2` e `v1`; a versão 2 exibe selo `versão 2`;
a versão 2 já traz o vínculo `Polo · Polo Sede — Jaboticabal` (herdado, sem ação manual);
ao voltar à v1, o selo de situação da v1 é `Superado`; no acervo a v1 aparece com situação
"Superado" e a v2 com versão 2.
Falha se: v2 nascer sem vínculo, v1 continuar Vigente, ou a versão vir como 1.

## T6 — Filtros/busca e coerência das métricas do acervo
1. Em `/painel/documentos`, buscar `Ata do Colegiado` e clicar Filtrar.
2. Limpar filtros; clicar "ver só os sem vínculo".
3. Aplicar filtro Situação = `Superado`.

Passa se: (1) a lista mostra apenas linhas cujo nome contém "Ata do Colegiado" e o contador
"X documento(s)" bate com o número de linhas visíveis; (2) com `vinculo=sem` todas as linhas
mostram 0 na coluna Vínculos e o contador é igual à métrica "Sem vínculo" do topo;
(3) com Situação=Superado aparece a v1 da Ata com selo Superado e nenhuma linha Vigente.
Falha se: contador divergir das linhas, métrica "Sem vínculo" divergir do filtro, ou filtro não filtrar.

## T7 — Exclusão de documento (SUPERADMIN, soft delete)
1. No detalhe de `Cópia`/`Relatório CPA 2026 — renomeado`, clicar "excluir documento".
2. Digitar nome **errado** (`nome errado`) + justificativa `motivo de teste suficiente` e submeter.
3. Corrigir o nome para o exato e a justificativa para `curto` (<10 chars) e submeter.
4. Preencher nome exato + justificativa `exclusao de teste ponta a ponta` e submeter.

Passa se: (2) mensagem `Digite exatamente “Relatório CPA 2026 — renomeado” para confirmar a exclusão.`
e o documento continua existindo; (3) mensagem "Descreva o motivo da exclusão (mínimo de 10 caracteres)."
(ou bloqueio nativo do campo com minLength) e nada é excluído; (4) redireciona para o acervo com o
aviso "Documento excluído. O registro permanece na auditoria.", a linha desaparece da lista e a
métrica "Documentos" cai em 1.
Falha se: excluir sem confirmação correta, ou o documento continuar na lista após (4).

## T8 — CRUD: lista com paginação, ordenação, filtro, busca e CSV
1. Ir a `/painel/dados/pessoa`.
2. Conferir contador de registros e a paginação; clicar "próxima".
3. Clicar no cabeçalho "Nome" para ordenar asc e novamente para desc.
4. Filtrar Titulação = `Mestrado` e clicar Filtrar; depois buscar `Paginação 07`.
5. Clicar no botão "CSV" e abrir o arquivo baixado.

Passa se: (2) a página 1 mostra exatamente 25 linhas, o rótulo "Página 1 de 2" e o contador
"30 registro(s)"; a página 2 mostra as 5 restantes; (3) a seta de ordenação aparece no cabeçalho
e a 1ª linha muda entre asc e desc (ex.: `Teste Paginação 01` ↔ o último nome alfabético);
(4) com Titulação=Mestrado o contador cai para 15 e todas as linhas mostram Mestrado; a busca
`Paginação 07` retorna 1 registro; (5) o CSV baixado abre com cabeçalhos em português e acentos
corretos (`Titulação`, `Situação` legíveis, não `TitulaÃ§Ã£o`) e respeita o filtro aplicado.
Falha se: paginação não limitar a 25, contador divergir, ordenação não mudar a ordem, ou CSV vir com acentos quebrados.

## T9 — CRUD: criar registro + "Salvar e criar outro" + detalhe (anexo, histórico, relacionados)
1. Em `/painel/dados/pessoa/novo`, preencher Nome = `Docente Teste A`, Função = Docente,
   Titulação = Doutorado, e clicar **"Salvar e criar outro"**.
2. No formulário que aparecer, preencher Nome = `Docente Teste B` e clicar "Criar pessoa".
3. No detalhe de `Docente Teste B`, no card "Anexos e evidências", enviar `ppc-curso.txt` com
   nome `Anexo do docente B`.
4. Conferir o card "Histórico".
5. Abrir `/painel/dados/curso/<Marketing Digital>` e conferir "Registros relacionados".

Passa se: (1) volta para um formulário **em branco** em `/painel/dados/pessoa/novo?salvo=1`
(campo Nome vazio, não `Docente Teste A`) e `Docente Teste A` existe na lista;
(2) vai para o detalhe de `Docente Teste B` com aviso "Registro salvo e gravado no log de auditoria.";
(3) o anexo `Anexo do docente B` passa a ser listado no card de anexos com selo "Vigente" e link
"baixar"; e ele também aparece em `/painel/documentos` vinculado (coluna Vínculos = 1);
(4) o Histórico lista `Criar` com o e-mail `contato@fabrani.com.br`;
(5) o card "Registros relacionados" do curso lista tabelas dependentes com totais > 0.
Falha se: "Salvar e criar outro" voltar preenchido/for para o detalhe, anexo não aparecer, ou histórico vazio.

## T10 — CRUD: exclusão recusada por dependência + erro amigável de campo único
1. Em `/painel/dados/curso/<Curso Superior de Tecnologia em Marketing Digital>`, clicar
   "excluir registro", digitar o nome exato e submeter.
2. Em `/painel/dados/pessoa/<Docente Teste B>`, clicar "excluir registro", digitar o nome exato e submeter.
3. Em `/painel/dados/ies/novo`, criar uma IES com Nome = `IES Duplicada Teste` e
   Código e-MEC = `1751876` (valor já usado pela FABRANI; `ies_codigo_emec_key` é UNIQUE).

Passa se: (1) o painel de exclusão avisa que o registro está referenciado e, ao submeter, exibe
`Não é possível excluir: existem registros dependentes (...)`, permanecendo o curso na lista;
(2) a pessoa sem dependentes é excluída e o acervo/lista mostra "Registro excluído...";
(3) aparece a mensagem legível `Já existe um registro com esses dados — verifique os campos únicos
(código, CNPJ, e-mail).` — sem stack trace, sem texto cru do Postgres tipo
`duplicate key value violates unique constraint`.
Falha se: a exclusão com dependentes for concluída, ou o erro de duplicidade vier como erro cru/500.

### Observações já conhecidas (a reportar)
- `curso.codigo_emec` **não** tem constraint UNIQUE no banco; portanto "dois cursos com o mesmo
  código" não gera erro nenhum. O teste de erro amigável usa `ies.codigo_emec`, que é UNIQUE.
- Drag-and-drop de arquivos do sistema operacional para o navegador não é reproduzível com a
  automação disponível; será testado o caminho do seletor de arquivos (mesmo handler `adicionar()`),
  e o DnD ficará marcado como não testado.
