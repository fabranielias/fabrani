# Test plan — Dossiê guiado (trilha) — commit 60c9654

Ambiente: `npm run dev` em http://localhost:3000, Postgres `mec` (docker `mec-pg`, 54322),
Supabase Storage real (bucket `evidencias`), logado como SUPERADMIN.

Estado inicial verificado por SQL (setup, fora da gravação):
- `trilha_passo` ativo: **A=18, B=51, C=122 (total 191)**.
- `trilha_resposta`: **0 linhas** → trilha 0%, 191 pendentes, Bloco C bloqueado.
- `evidencia_vinculo` não tem nenhuma linha com `alvo_tipo` IES/MANTENEDORA → o passo A14
  realmente tem `documentos = 0` e a recusa sem arquivo é alcançável.
- Bloco B: 6 passos com `aceita_nsa = true` (ex.: `B-2-2.3`), 45 com `false` (ex.: `B-1-1.1`).
- `mantenedora.representante_legal`, `telefone` e `email` estão **NULL** hoje; `ies.procurador_institucional` está **NULL**.
- Fixture criada: `C:\Users\Administrator\testfiles\pdi-fabrani-2026.pdf` (PDF real, 408 bytes,
  texto interno `PDI FABRANI 2026-2030 TRILHA-A14`).

Evidência de código que embasa cada asserção:
- Banner: `src/components/AvisoTrilha.tsx:25` (`O dossiê regulatório está {percentual}% preenchido`),
  `:28` (`Faltam N itens`), `:30` (`Próximo passo: …`), botões `:38` / `:44`.
- Visão geral: `src/app/painel/trilha/page.tsx:52` (`cursosLiberados = progressoA.pendentes === 0`),
  `:109` bloqueio do card C, `:114-118` cadeado em vez de %, `:127-130` texto
  "Termine o Bloco A (ou marque "não há" nos itens que faltam) para liberar os cursos.",
  `:159-162` itens do C viram `<span>` com cadeado (não link), `:88-94` "Continuar de onde parou".
- Guarda por URL: `src/app/painel/trilha/[codigo]/page.tsx:65-90` → título "Cursos ainda bloqueados"
  + botão "Ir para o Bloco A".
- Salvar/validações: `src/app/painel/trilha/acoes.ts:55` (NSA não admitido), `:56`
  ("Justifique por que o indicador não se aplica à FABRANI."), `:77-79`
  ("Envie o arquivo antes de avançar — ou marque "Não há esse documento"."), `:63-75` grava na
  entidade canônica via `salvar()`, `:27-31` `hrefProximo` = próximo pendente **do mesmo bloco**.
- Botões do passo: `FormularioPasso.tsx:167` Voltar, `:177` Não há, `:143-157` confirmação
  "Marcar como "não há"?" → "Confirmar e avançar", `:189` "Não se aplica (NSA)" (só se `aceitaNsa`),
  `:200` Reabrir, `:210` "Salvar e avançar"; erro em caixa `role="alert"` `:129-133`.
- Checklist: `checklist/page.tsx:54-59` contadores (Preenchido/Entregues/Sem documento/Vencidos/Não
  visitados), `:30` filtro do "O que está faltando", `:19` badge "não há".
- Sócrates: `src/lib/socrates/regras.ts:367` (`N item(ns) do dossiê ainda não preenchidos`),
  `:341` (`Dossiê: a instituição declarou não possuir "…"`), sincronização `:411`.
- Colisão suspeita: `src/lib/crud.ts:185-187` grava qualquer campo do registry presente no form; o
  passo sempre envia `name="observacao"` (`FormularioPasso.tsx:117`) e `mantenedora` tem coluna
  real `observacao` (`registry.ts:81`) → checar se a observação do passo vaza para a entidade.

---

## T1 — Banner do dossiê no /painel
1. Abrir `/painel`.

Passa se: existe o bloco com o texto **"O dossiê regulatório está 0% preenchido"**, a linha
**"Faltam 191 itens"** e a frase "Próximo passo: Mantenedora: identificação e representante legal.",
mais os botões **"Continuar preenchimento"** e **"Ver checklist"**.
Falha se: percentual/contagem divergirem do estado do banco (0% / 191), o banner não aparecer, ou
faltar um dos dois botões.

## T2 — Visão geral, cadeado do Bloco C e guarda por URL
1. Clicar em "Dossiê guiado" na sidebar (deve ir para `/painel/trilha`).
2. Ler o card de topo e os três cards de bloco.
3. Trocar para o Bloco C: clicar em "Ver passos" do card C — se estiver bloqueado, não haverá link;
   nesse caso navegar por URL `/painel/trilha?bloco=C` e conferir a lista.
4. Abrir direto pela barra de endereço um passo do Bloco C (código obtido por SQL, ex.
   `C-xxxxxxxx-00`).

Passa se: (2) o card de topo mostra **0%** e a linha "0 entregues · 0 sem documento · 0 não se
aplica · 0 vencidos · 191 a fazer"; os três cards são "Bloco A · A FABRANI" (18 passos · 18
pendentes), "Bloco B · Instrumento institucional" (51 passos · 51 pendentes) e "Bloco C · Cursos"
(122 passos · 122 pendentes); **só o card C exibe cadeado no lugar do %** e o texto "Termine o
Bloco A (ou marque "não há" nos itens que faltam) para liberar os cursos." e **não** tem link
"Ver passos"; (3) em `?bloco=C` cada item aparece cinza com cadeado e **não é clicável** (sem link);
(4) a URL direta do passo C renderiza o título **"Cursos ainda bloqueados"** com o botão
"Ir para o Bloco A" e **não** o formulário do passo.
Falha se: o C aparecer com % e link, os itens do C forem clicáveis, ou a URL direta abrir o
formulário do passo.

## T3 — A01 (DADOS mantenedora): grava na entidade canônica e avança
1. Abrir `/painel/trilha/A01`.
2. Preencher **Representante legal** = `Maria Silva Fabrani`, **Telefone** = `16 3202-4455`,
   **E-mail** = `mantenedora@fabrani.com.br` (colar via clipboard para não perder pontuação).
3. Escrever na Observação do passo: `Conferido no Cadastro e-MEC em 10/08/2026`.
4. Clicar "Salvar e avançar".
5. Abrir `/painel/dados/mantenedora` e o detalhe da mantenedora.

Passa se: (1) a página traz a explicação "Por que o MEC pede" e a base legal
**"Decreto nº 9.235/2017, art. 15"**, com os campos já preenchidos vindos do banco (Razão social =
"Instituto de Aperfeiçoamento em Práticas da Advocacia"); (4) o navegador é levado para
**`/painel/trilha/A02`** (próximo pendente do bloco A) e o topo do A02 mostra "passo 2 de 18";
(5) o detalhe da mantenedora mostra `Maria Silva Fabrani`, `16 3202-4455` e
`mantenedora@fabrani.com.br` — isto é, o passo gravou na entidade canônica, não num campo próprio.
Verificação adicional por SQL: `trilha_resposta` do A01 tem `status='CONCLUIDO'` e
`respondido_por='contato@fabrani.com.br'`.
Falha se: o redirecionamento não for para o próximo pendente do bloco, ou os valores não
aparecerem na entidade `mantenedora`.
Ponto de atenção a registrar (não é critério de falha do golden path): se
`mantenedora.observacao` passar a conter o texto da observação do passo, é vazamento do campo
`observacao` do formulário do passo para a coluna homônima da entidade (`crud.ts:185`).

## T4 — A14 (DOCUMENTO/PDI): recusa sem arquivo, depois upload real
1. Abrir `/painel/trilha/A14`.
2. Sem anexar nada, clicar "Salvar e avançar".
3. No card "Evidências deste item", pelo seletor de arquivos, escolher
   `C:\Users\Administrator\testfiles\pdi-fabrani-2026.pdf`, nome de exibição
   `PDI FABRANI 2026-2030`, e enviar.
4. Clicar "Salvar e avançar".

Passa se: (2) aparece a caixa vermelha com **exatamente** "Envie o arquivo antes de avançar — ou
marque “Não há esse documento”." e a página **continua** em `/painel/trilha/A14` (nada gravado);
(3) o upload conclui e a lista "Evidências deste item" passa a mostrar `PDI FABRANI 2026-2030`
com `v1` e link "baixar"; (4) o passo é aceito e o navegador vai para o próximo pendente do bloco A
(`/painel/trilha/A15`), e ao voltar em `/painel/trilha?bloco=A` o item do PDI aparece com ícone de
concluído e o rótulo "1 arquivo(s)".
Falha se: a recusa não aparecer (ou salvar mesmo sem arquivo), o upload falhar (registrar erro de
rede/Storage exato), ou o passo não concluir após o upload.
Verificação adicional por SQL: `evidencia_vinculo` com `alvo_tipo='IES'` passa a existir e o
`documento` correspondente tem `nome_arquivo = 'pdi-fabrani-2026.pdf'`.

## T5 — "Não há" em A15 e reflexo no checklist
1. Em `/painel/trilha/A15` (Regimento interno), clicar "Não há".
2. Conferir a caixa de confirmação e escrever a observação
   `Regimento em revisao pelo colegiado superior`.
3. Clicar "Confirmar e avançar".
4. Abrir `/painel/trilha/checklist`.

Passa se: (2) aparece a caixa âmbar "Marcar como “não há”?" com os botões "Confirmar e avançar" e
"Cancelar", e o rótulo da observação muda para "Observação (por que não há este documento?)";
(3) o navegador vai para o próximo pendente do bloco A (`/painel/trilha/A16`); (4) na tabela
"O que está faltando" a linha "Regimento interno da IES" tem o selo **"não há"** e a coluna
Observação mostra `Regimento em revisao pelo colegiado superior`.
Falha se: não houver etapa de confirmação (marcar direto), não avançar, ou o checklist classificar
o item como "não preenchido"/"entregue".

## T6 — NSA no Bloco B: recusa sem justificativa, grava com justificativa
1. Abrir `/painel/trilha/B-1-1.1` (indicador com `aceita_nsa = false`).
2. Abrir `/painel/trilha/B-2-2.3` (indicador com `aceita_nsa = true`).
3. Com a Observação **vazia**, clicar "Não se aplica (NSA)".
4. Preencher a Observação com `A FABRANI nao oferta pos-graduacao nem pesquisa institucionalizada`
   e clicar "Não se aplica (NSA)" novamente.

Passa se: (1) o botão "Não se aplica (NSA)" **não existe** nesse passo (o instrumento o considera
sempre aplicável); (2) no B-2-2.3 o botão existe; (3) aparece a caixa vermelha com exatamente
"Justifique por que o indicador não se aplica à FABRANI." e a página permanece no B-2-2.3, sem
resposta gravada; (4) a resposta é gravada e o navegador vai para o próximo pendente do **bloco B**
(`/painel/trilha/B-1-1.1`, primeiro pendente do bloco), e ao reabrir `/painel/trilha/B-2-2.3` o
topo mostra "Respondido como **não se aplica** por contato@fabrani.com.br em <data>" com a
justificativa.
Falha se: o NSA sem justificativa for aceito, ou o botão aparecer num passo com `aceita_nsa=false`.

## T7 — Retomada "Continuar de onde parou"
1. Abrir `/painel/trilha` (bloco A ativo).
2. Antes de clicar, anotar o percentual e o primeiro pendente esperado (por SQL: menor `ordem`
   sem resposta — depois de T3–T6 deve ser `A02`).
3. Clicar "Continuar de onde parou".

Passa se: o card de topo já reflete as respostas de T3–T6 (percentual > 0% e contadores
"1 entregues · 1 sem documento · 1 não se aplica" coerentes com o SQL) e o clique abre
**exatamente** o passo de menor `ordem` sem resposta, confirmado por SQL — não um passo já
respondido nem o primeiro da lista.
Falha se: abrir um passo já respondido ou divergir do menor `ordem` pendente.

## T8 — Checklist: contadores conferem com o banco
1. Abrir `/painel/trilha/checklist`.
2. Comparar os cinco contadores com um SQL de referência sobre `trilha_passo`/`trilha_resposta`.

Passa se: "Entregues" = nº de respostas `CONCLUIDO` não vencidas, "Sem documento" = nº `NAO_HA`,
"Vencidos" = nº `CONCLUIDO` com evidência vencida, "Não visitados" = 191 − respondidos, e
"Preenchido" = round(respondidos/191·100)%; o cabeçalho "O que está faltando (N)" tem N = não
visitados + `NAO_HA` + vencidos; a linha do PDI (entregue) **não** aparece na tabela de faltantes.
Falha se: qualquer contador divergir do SQL, ou um item entregue aparecer como faltante.

## T9 — Sócrates enxerga a trilha
1. No `/painel/socrates`, clicar o botão de sincronizar regras (ação `sincronizarRegrasAction`).
2. Ler a fila de sugestões.

Passa se: aparecem duas sugestões novas vindas da trilha: uma com título
**"N item(ns) do dossiê ainda não preenchidos"** (N = pendentes sem resposta, conferido com o SQL) e
uma com título **"Dossiê: a instituição declarou não possuir “Regimento interno da IES”"**
(severidade RISCO), com a observação da secretaria na mensagem.
Falha se: nenhuma sugestão referente à trilha aparecer após a sincronização, ou o N divergir do SQL.
