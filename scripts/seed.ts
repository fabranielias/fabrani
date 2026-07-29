import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool, type PoolClient } from "pg";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}
const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
const pool = new Pool({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });

type CatalogoIndicador = {
  codigo: string;
  titulo: string;
  texto_base?: string;
  nsa_policy?: string;
  critico_ead?: boolean;
  evidencias?: string[];
  criterios?: Record<string, string>;
};

type CatalogoEixo = {
  numero: number;
  titulo: string;
  peso: number;
  dimensoes_sinaes?: number[];
  descricao?: string;
  indicadores: CatalogoIndicador[];
};

type Catalogo = {
  codigo: string;
  tipo: string;
  titulo: string;
  versao: string;
  atos: string[];
  norma_origem?: string;
  vigencia_inicio?: string | null;
  situacao?: string;
  observacao?: string;
  escala: { min: number; max: number; satisfatorio: number };
  eixos: CatalogoEixo[];
  requisitos_legais: { codigo: string; titulo: string; base_legal?: string }[];
};

/**
 * Progressão padrão da escala do INEP. Usada enquanto o texto verbatim do
 * indicador não é importado do PDF oficial; marcada como PADRAO na coluna origem
 * para que a interface deixe explícito que não é a redação oficial.
 */
function criteriosPadrao(titulo: string): Record<number, string> {
  const t = titulo.toLowerCase();
  return {
    1: `Não há previsão institucionalizada quanto a ${t}, ou o que existe não é implementado.`,
    2: `${titulo} está previsto, mas é implementado de forma parcial e não atende às necessidades do curso/da IES.`,
    3: `${titulo} está previsto, implementado e atende de maneira suficiente às necessidades do curso/da IES.`,
    4: `${titulo} está implementado, atende às necessidades e é objeto de acompanhamento e melhoria contínua documentados.`,
    5: `${titulo} está implementado de maneira excelente, com resultados verificáveis, práticas exitosas e/ou inovadoras comprovadas por evidências.`,
  };
}

async function carregarInstrumento(cli: PoolClient, arquivo: string) {
  const cat: Catalogo = JSON.parse(
    readFileSync(join(process.cwd(), "catalog", "instrumentos", arquivo), "utf8"),
  );

  await cli.query("delete from instrumento where codigo = $1", [cat.codigo]);
  const { rows } = await cli.query<{ id: string }>(
    `insert into instrumento (codigo, tipo, titulo, versao, atos, norma_origem, vigencia_inicio,
        situacao, escala_min, escala_max, conceito_satisfatorio, observacao)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) returning id`,
    [
      cat.codigo,
      cat.tipo,
      cat.titulo,
      cat.versao,
      cat.atos,
      cat.norma_origem ?? null,
      cat.vigencia_inicio ?? null,
      cat.situacao ?? "VIGENTE",
      cat.escala.min,
      cat.escala.max,
      cat.escala.satisfatorio,
      cat.observacao ?? null,
    ],
  );
  const instrumentoId = rows[0].id;

  let indicadores = 0;
  for (const eixo of cat.eixos) {
    const { rows: eixoRows } = await cli.query<{ id: string }>(
      `insert into eixo (instrumento_id, numero, titulo, peso, dimensoes_sinaes, descricao)
       values ($1,$2,$3,$4,$5,$6) returning id`,
      [instrumentoId, eixo.numero, eixo.titulo, eixo.peso, eixo.dimensoes_sinaes ?? [], eixo.descricao ?? null],
    );
    const eixoId = eixoRows[0].id;

    let ordem = 0;
    for (const ind of eixo.indicadores) {
      ordem += 1;
      const { rows: indRows } = await cli.query<{ id: string }>(
        `insert into indicador (eixo_id, codigo, titulo, texto_base, nsa_policy, critico_ead, ordem)
         values ($1,$2,$3,$4,$5,$6,$7) returning id`,
        [
          eixoId,
          ind.codigo,
          ind.titulo,
          ind.texto_base ?? null,
          ind.nsa_policy ?? "FIXED_APPLICABLE",
          ind.critico_ead ?? false,
          ordem,
        ],
      );
      const indicadorId = indRows[0].id;
      indicadores += 1;

      const padrao = criteriosPadrao(ind.titulo);
      for (const conceito of [1, 2, 3, 4, 5]) {
        const verbatim = ind.criterios?.[String(conceito)];
        await cli.query(
          `insert into criterio_conceito (indicador_id, conceito, texto, origem) values ($1,$2,$3,$4)`,
          [indicadorId, conceito, verbatim ?? padrao[conceito], verbatim ? "VERBATIM" : "PADRAO"],
        );
      }

      for (const slug of ind.evidencias ?? []) {
        await cli.query(
          `insert into requisito_evidencia (indicador_id, slug, titulo, obrigatorio) values ($1,$2,$3,true)`,
          [indicadorId, slug, tituloEvidencia(slug)],
        );
      }
    }
  }

  for (const rl of cat.requisitos_legais) {
    await cli.query(
      `insert into requisito_legal (instrumento_id, codigo, titulo, base_legal) values ($1,$2,$3,$4)`,
      [instrumentoId, rl.codigo, rl.titulo, rl.base_legal ?? null],
    );
  }

  console.log(`+ instrumento ${cat.codigo}: ${cat.eixos.length} eixos, ${indicadores} indicadores`);
  return instrumentoId;
}

function tituloEvidencia(slug: string): string {
  const mapa: Record<string, string> = {
    "pdi-vigente": "PDI vigente",
    "ppc-vigente": "PPC vigente",
    "relatorio-cpa": "Relatório de autoavaliação da CPA",
    "ata-nde": "Ata de reunião do NDE",
    "atas-nde": "Atas de reunião do NDE",
    "ato-designacao-nde": "Ato de designação do NDE",
    "ato-constituicao-equipe-multidisciplinar": "Ato de constituição da equipe multidisciplinar",
    "plano-acao-equipe": "Plano de ação da equipe multidisciplinar",
    "matriz-curricular": "Matriz curricular",
    "planos-de-ensino": "Planos de ensino das unidades curriculares",
    "relatos-praticas": "Relatos de práticas pedagógicas",
    "regulamento-estagio": "Regulamento de estágio supervisionado",
    "regulamento-atividades-complementares": "Regulamento de atividades complementares",
    "regulamento-tcc": "Regulamento de TCC",
    "politica-apoio-discente": "Política de apoio ao discente",
    "registros-atendimento": "Registros de atendimento ao discente",
    "atas-colegiado": "Atas do colegiado de curso",
    "regimento-colegiado": "Regimento do colegiado",
    "plano-tutoria": "Plano de tutoria",
    "relatorio-atendimento-tutoria": "Relatório de atendimento da tutoria",
    "plano-capacitacao-tutores": "Plano de capacitação de tutores",
    "relatorio-tic": "Relatório de recursos de TIC",
    "manual-ava": "Manual/documentação do AVA",
    "relatorio-uso-ava": "Relatório de uso do AVA",
    "amostra-material-didatico": "Amostra do material didático",
    "fluxo-producao-material": "Fluxo de produção e distribuição de material didático",
    "regulamento-avaliacao": "Regulamento de avaliação da aprendizagem",
    "estudo-demanda": "Estudo de demanda para número de vagas",
    "relacao-vagas-docentes": "Demonstrativo da relação vagas × docentes/tutores",
    "plano-acao-coordenacao": "Plano de ação da coordenação",
    "contrato-coordenador": "Contrato/regime de trabalho do coordenador",
    "planilha-titulacao": "Planilha de titulação do corpo docente",
    diplomas: "Diplomas e comprovantes de titulação",
    "planilha-regime-trabalho": "Planilha de regime de trabalho",
    "curriculos-lattes": "Currículos Lattes do corpo docente e tutorial",
    "planilha-tutores": "Planilha do corpo de tutores",
    "registros-interacao": "Registros de interação entre tutores, docentes e coordenação",
    "planilha-producao": "Planilha de produção científica, cultural, artística ou tecnológica",
    "planta-baixa": "Planta baixa das instalações",
    "fotos-instalacoes": "Registro fotográfico das instalações",
    "laudo-acessibilidade": "Laudo de acessibilidade",
    "inventario-equipamentos": "Inventário de equipamentos de informática",
    "relatorio-acervo": "Relatório do acervo bibliográfico",
    "contrato-biblioteca-virtual": "Contrato de biblioteca virtual",
    "plano-atualizacao-acervo": "Plano de atualização do acervo",
    convenios: "Convênios e termos de parceria",
    "projeto-autoavaliacao": "Projeto de autoavaliação institucional",
    "relatorio-participacao": "Relatório de participação da comunidade acadêmica",
    "evidencia-divulgacao": "Evidência de divulgação dos resultados",
    "politica-extensao": "Política institucional de extensão",
    "relatorio-extensao": "Relatório das ações de extensão",
    "relatorio-responsabilidade-social": "Relatório de responsabilidade social",
    "politica-inclusao": "Política de inclusão e diversidade",
    "politica-ambiental": "Política de educação ambiental e sustentabilidade",
    regimento: "Regimento institucional",
    organograma: "Organograma institucional e acadêmico",
    "plano-comunicacao": "Plano de comunicação institucional",
    "pesquisa-egressos": "Pesquisa de acompanhamento de egressos",
    "plano-capacitacao": "Plano de capacitação e formação continuada",
    "demonstracoes-financeiras": "Demonstrações financeiras",
    orcamento: "Orçamento institucional",
    "atas-consup": "Atas do Conselho Superior",
    "dossie-polo": "Dossiê de infraestrutura do polo",
    "contrato-suporte": "Contrato de suporte e infraestrutura tecnológica",
    "plano-expansao": "Plano de expansão da infraestrutura",
    "politica-lgpd": "Política de proteção de dados pessoais (LGPD)",
    "plano-contingencia-ti": "Plano de contingência e continuidade de TI",
    "politica-responsabilidade-social-ods": "Política de responsabilidade social vinculada aos ODS",
  };
  return mapa[slug] ?? slug;
}

async function main() {
  const cli = await pool.connect();
  try {
    await cli.query("begin");

    // ------------------------------------------------------------ instrumentos
    const instCursoId = await carregarInstrumento(cli, "curso-2017.json");
    const instInstitucionalId = await carregarInstrumento(cli, "institucional-2017.json");
    await carregarInstrumento(cli, "institucional-proposta-2026.json");

    // ------------------------------------------------------------ institucional
    await cli.query("delete from mantenedora where cnpj = '17.982.283/0001-17'");
    const { rows: mant } = await cli.query<{ id: string }>(
      `insert into mantenedora (nome, sigla, cnpj, natureza, endereco, municipio, uf, cep)
       values ('Instituto de Aperfeiçoamento em Práticas da Advocacia','IAPA','17.982.283/0001-17',
               'Pessoa Jurídica de Direito Privado','Av. General Carneiro, 370 — Centro','Jaboticabal','SP','14870-040')
       returning id`,
    );

    await cli.query("delete from ies where codigo_emec = '1751876'");
    const { rows: iesRows } = await cli.query<{ id: string }>(
      `insert into ies (mantenedora_id, codigo_emec, nome, sigla, organizacao_academica,
          modalidade_credenciamento, endereco, municipio_sede, uf_sede, cep, codigo_endereco_emec,
          site, ci, ci_ano, fonte)
       values ($1,'1751876','Faculdade Brasileira de Negócios Inovadores','FABRANI','Faculdade','EaD',
          'Av. General Carneiro, 370 — Centro','Jaboticabal','SP','14870-040','102105',
          'https://fabrani.com.br',4,2023,'Cadastro e-MEC — conferir')
       returning id`,
      [mant[0].id],
    );
    const iesId = iesRows[0].id;

    const cursos = [
      {
        nome: "Curso Superior de Tecnologia em Marketing Digital",
        cc: 4,
        cc_ano: 2020,
        ch: 1600,
        rotulo: "Marketing e publicidade",
      },
      {
        nome: "Curso Superior de Tecnologia em Negócios Imobiliários",
        cc: 5,
        cc_ano: 2025,
        ch: 1600,
        rotulo: "Negócios imobiliários",
      },
    ];
    const cursoIds: Record<string, string> = {};
    for (const c of cursos) {
      const { rows } = await cli.query<{ id: string }>(
        `insert into curso (ies_id, nome, grau, formato_oferta, cncst_eixo_tecnologico, carga_horaria_total,
            carga_horaria_extensao, prazo_integralizacao_semestres, cc, cc_ano, rotulo_cine_brasil,
            enade_sem_area, situacao, regime_ead_12456)
         values ($1,$2,'TECNOLOGICO','A_DISTANCIA','Gestão e Negócios',$3,$4,4,$5,$6,$7,true,'EM_ATIVIDADE','TRANSICAO_ATE_19_05_2027')
         returning id`,
        [iesId, c.nome, c.ch, Math.round(c.ch * 0.1), c.cc, c.cc_ano, c.rotulo],
      );
      cursoIds[c.nome] = rows[0].id;
    }
    const cursoImob = cursoIds["Curso Superior de Tecnologia em Negócios Imobiliários"];
    const cursoMkt = cursoIds["Curso Superior de Tecnologia em Marketing Digital"];

    await cli.query(
      `insert into polo (ies_id, nome, endereco, municipio, uf, cep, situacao, adequacao_12456_status,
          adequacao_12456_prazo, adequacao_12456_plano)
       values ($1,'Polo Sede — Jaboticabal','Av. General Carneiro, 370 — Centro','Jaboticabal','SP','14870-040',
          'ATIVO','EM_ADEQUACAO','2027-05-19',
          'Checklist do art. 29 do Decreto 12.456/2025 e da Portaria MEC 506/2025 em execução.')`,
      [iesId],
    );

    await cli.query(
      `insert into ato_regulatorio (escopo, ies_id, tipo, especie_ato, observacao)
       values ('IES',$1,'CREDENCIAMENTO','Portaria','Número, data de publicação e vigência pendentes de conferência no e-MEC.')`,
      [iesId],
    );
    await cli.query(
      `insert into ato_regulatorio (escopo, ies_id, curso_id, tipo, especie_ato, observacao)
       values ('CURSO',$1,$2,'AUTORIZACAO','Portaria','Autorização — avaliação 152954, processo 201905427. Dados a conferir no e-MEC.')`,
      [iesId, cursoMkt],
    );

    // ------------------------------------------------------------- regulatório
    const { rows: proc } = await cli.query<{ id: string }>(
      `insert into processo_regulatorio (numero_processo, codigo_avaliacao, tipo, curso_id, ies_id, fase,
          responsavel, observacao)
       values ('202417965','227446','RECONHECIMENTO',$1,$2,'PARECER_SERES','Procurador Educacional Institucional',
          'Avaliação externa virtual in loco realizada de 11 a 13/08/2025.')
       returning id`,
      [cursoImob, iesId],
    );
    await cli.query(
      `insert into visita_in_loco (processo_id, curso_id, codigo_avaliacao, modalidade, data_inicio, data_fim,
          comissao, ponto_focal, status)
       values ($1,$2,'227446','VIRTUAL','2025-08-11','2025-08-13',
          'Lilian Gonçalves (ponto focal); Ricardo Alexandre Afonso','Lilian Gonçalves','REALIZADA')`,
      [proc[0].id, cursoImob],
    );

    // ------------------------------------------------------------------ ENADE
    const { rows: enade2026 } = await cli.query<{ id: string }>(
      `insert into enade_ciclo (ano, ano_ciclo, modalidades, areas, edital, inscricao_inicio, inscricao_fim,
          questionario_inicio, questionario_fim, observacao)
       values (2026,1,'Enade (bacharelados e CST); Enamed; PND (licenciaturas); Avaliação da Prática',
          '40 áreas — 21 licenciaturas, 14 bacharelados, 4 CST','Edital Inep nº 49/2026',
          '2026-04-27','2026-05-18','2026-10-01','2026-12-18',
          'CST avaliados em 2026: ADS, Gestão da TI, Gestão Ambiental e Redes de Computadores. Nenhum curso da Fabrani está enquadrado.')
       on conflict (ano) do update set edital = excluded.edital returning id`,
    );
    for (const cursoId of [cursoMkt, cursoImob]) {
      await cli.query(
        `insert into curso_enade_edicao (curso_id, enade_ciclo_id, enquadrado, motivo_nao_enquadramento,
            declaracao_nao_enquadramento)
         values ($1,$2,false,'Área do curso não consta entre as avaliadas na edição (rótulo Cine Brasil sem correspondência).',false)
         on conflict (curso_id, enade_ciclo_id) do nothing`,
        [cursoId, enade2026[0].id],
      );
    }

    // ------------------------------------------------------------------ CENSO
    const censos: Array<[number, string, string, string, string, string]> = [
      [2025, "Portaria Inep nº 771/2025", "2026-03-02", "2026-07-10", "2026-09-22", "ENCERRAMENTO"],
      [2026, "Aguardando portaria do Inep", "2027-03-01", "2027-07-09", "2027-09-21", "PLANEJADO"],
    ];
    for (const [ano, portaria, ini, fim, div, status] of censos) {
      const { rows: censoRows } = await cli.query<{ id: string }>(
        `insert into censo_ano (ano_referencia, portaria, coleta_inicio, coleta_fim, divulgacao_prevista, status)
         values ($1,$2,$3,$4,$5,$6) on conflict (ano_referencia) do update set portaria = excluded.portaria
         returning id`,
        [ano, portaria, ini, fim, div, status],
      );
      for (const modulo of ["IES", "CURSO", "DOCENTE", "ALUNO"]) {
        await cli.query(
          `insert into censo_modulo (censo_ano_id, modulo, status) values ($1,$2,'NAO_INICIADO')
           on conflict (censo_ano_id, modulo) do nothing`,
          [censoRows[0].id, modulo],
        );
      }
    }

    // -------------------------------------------------------------------- CPA
    await cli.query(
      `insert into cpa_ciclo (ano_referencia, titulo, tipo_relatorio, etapa, responsavel, status)
       values (2026,'Ciclo de autoavaliação 2026','PARCIAL','SENSIBILIZACAO','Coordenação da CPA','ABERTO')`,
    );

    // ------------------------------------------------------------- colegiados
    await cli.query(
      `insert into colegiado (tipo, nome, curso_id, mandato_meses, situacao)
       values ('NDE','NDE — Marketing Digital',$1,24,'ATIVO'),
              ('NDE','NDE — Negócios Imobiliários',$2,24,'ATIVO'),
              ('EQUIPE_MULTIDISCIPLINAR','Equipe Multidisciplinar EaD',null,24,'ATIVO'),
              ('CPA','Comissão Própria de Avaliação',null,24,'ATIVO'),
              ('CONSUP','Conselho Superior',null,null,'ATIVO')`,
      [cursoMkt, cursoImob],
    );

    // ---------------------------------------------------------------- LegalOne
    const normas: Array<[string, string, string, number, string | null, string, string, string]> = [
      ["LEI", "Congresso Nacional", "10.861", 2004, "2004-04-14", "Institui o Sistema Nacional de Avaliação da Educação Superior — SINAES.", "ALTA", "SINAES,CPA"],
      ["DECRETO", "Presidência da República", "9.235", 2017, "2017-12-15", "Dispõe sobre o exercício das funções de regulação, supervisão e avaliação das instituições de educação superior.", "ALTA", "REGULACAO,PDI"],
      ["DECRETO", "Presidência da República", "12.456", 2025, "2025-05-19", "Novo marco regulatório da educação a distância: formatos de oferta, polos e requisitos de qualidade.", "CRITICA", "EAD,POLO"],
      ["PORTARIA", "MEC", "381", 2025, "2025-05-19", "Estabelece regras de transição para adequação ao Decreto nº 12.456/2025.", "CRITICA", "EAD,TRANSICAO"],
      ["PORTARIA", "MEC", "506", 2025, "2025-07-31", "Regulamenta o Decreto nº 12.456/2025: corpo docente, mediadores pedagógicos, tutores, responsável de polo, atividades presenciais, material didático e polos.", "CRITICA", "EAD,POLO,TUTORIA"],
      ["PORTARIA_NORMATIVA", "MEC", "23", 2017, "2017-12-21", "Dispõe sobre os fluxos dos processos de credenciamento e recredenciamento de IES e de autorização, reconhecimento e renovação de reconhecimento de cursos.", "ALTA", "PROCESSO"],
      ["PORTARIA_NORMATIVA", "MEC", "840", 2018, "2018-08-24", "Consolida atos normativos sobre avaliação; institui o Enade como componente curricular obrigatório.", "ALTA", "AVALIACAO,ENADE"],
      ["PORTARIA", "MEC", "315", 2018, "2018-04-05", "Dispõe sobre procedimentos de supervisão e monitoramento e sobre o acervo acadêmico digital.", "ALTA", "ACERVO,SUPERVISAO"],
      ["PORTARIA", "MEC", "514", 2024, "2024-08-01", "Aprova a 4ª edição do Catálogo Nacional de Cursos Superiores de Tecnologia.", "ALTA", "CNCST,CST"],
      ["PORTARIA_NORMATIVA", "INEP", "359", 2025, "2025-09-01", "Dispõe sobre as normas gerais do Exame Nacional de Desempenho dos Estudantes.", "ALTA", "ENADE"],
      ["PORTARIA", "INEP", "771", 2025, "2025-12-01", "Estabelece o cronograma do Censo da Educação Superior 2025.", "ALTA", "CENSO"],
      ["EDITAL", "INEP", "49", 2026, "2026-04-27", "Diretrizes, cronograma e áreas do Enade 2026.", "ALTA", "ENADE"],
      ["RESOLUCAO", "CNE/CES", "7", 2018, "2018-12-18", "Estabelece as diretrizes para a extensão na educação superior — mínimo de 10% da carga horária.", "ALTA", "EXTENSAO"],
      ["PORTARIA", "MEC", "265", 2022, "2022-03-01", "Dispõe sobre a avaliação externa virtual in loco.", "MEDIA", "VISITA"],
    ];
    for (const [especie, orgao, numero, ano, publicacao, ementa, relevancia, tags] of normas) {
      await cli.query(
        `insert into norma (especie, orgao, numero, ano, data_publicacao, ementa, relevancia, tags)
         select $1,$2,$3,$4,$5,$6,$7,$8
         where not exists (select 1 from norma where especie=$1 and orgao=$2 and numero=$3 and ano=$4)`,
        [especie, orgao, numero, ano, publicacao, ementa, relevancia, tags.split(",")],
      );
    }

    // ------------------------------------------------------------------ prazos
    const prazos: Array<[string, string, string, string | null, string]> = [
      ["Adequação integral ao Decreto nº 12.456/2025", "EAD", "2027-05-19", null, "Portaria MEC nº 381/2025"],
      ["Censo 2026 — início da coleta (previsto)", "CENSO", "2027-03-01", null, "Cronograma Inep"],
      ["Enade 2026 — Questionário do Estudante", "ENADE", "2026-12-18", null, "Edital Inep nº 49/2026"],
      ["Enade 2026 — Questionário do Coordenador", "ENADE", "2026-12-04", null, "Edital Inep nº 49/2026"],
      ["Relatório de autoavaliação da CPA — postagem no e-MEC", "CPA", "2027-03-31", null, "Lei nº 10.861/2004"],
      ["Informar novos polos no e-MEC em até 60 dias da criação", "EAD", "2026-12-31", null, "Portaria MEC nº 506/2025"],
    ];
    for (const [titulo, categoria, data, curso, base] of prazos) {
      await cli.query(
        `insert into prazo (titulo, categoria, data_limite, curso_id, base_legal)
         select $1,$2,$3,$4,$5 where not exists (select 1 from prazo where titulo = $1)`,
        [titulo, categoria, data, curso, base],
      );
    }

    // ------------------------------------------------- ciclos de autoavaliação
    const { rows: cicloInst } = await cli.query<{ id: string }>(
      `insert into ciclo_avaliacao (instrumento_id, escopo, ies_id, titulo, finalidade, ano_referencia, responsavel)
       select $1,'IES',$2,'Autoavaliação institucional 2026 — preparação do recredenciamento','RECREDENCIAMENTO',2026,'Procurador Educacional Institucional'
       where not exists (select 1 from ciclo_avaliacao where titulo = 'Autoavaliação institucional 2026 — preparação do recredenciamento')
       returning id`,
      [instInstitucionalId, iesId],
    );
    const { rows: cicloCurso } = await cli.query<{ id: string }>(
      `insert into ciclo_avaliacao (instrumento_id, escopo, ies_id, curso_id, titulo, finalidade, ano_referencia, responsavel)
       select $1,'CURSO',$2,$3,'Autoavaliação 2026 — Marketing Digital (renovação de reconhecimento)','RENOVACAO_RECONHECIMENTO',2026,'Coordenação do curso'
       where not exists (select 1 from ciclo_avaliacao where curso_id = $3 and ano_referencia = 2026)
       returning id`,
      [instCursoId, iesId, cursoMkt],
    );

    for (const [cicloId, instrumentoId] of [
      [cicloInst[0]?.id, instInstitucionalId],
      [cicloCurso[0]?.id, instCursoId],
    ] as const) {
      if (!cicloId) continue;
      await cli.query(
        `insert into avaliacao_indicador (ciclo_id, indicador_id, is_nsa)
         select $1, i.id, i.nsa_policy = 'FIXED_NSA'
         from indicador i join eixo e on e.id = i.eixo_id
         where e.instrumento_id = $2
         on conflict (ciclo_id, indicador_id) do nothing`,
        [cicloId, instrumentoId],
      );
      await cli.query(
        `insert into avaliacao_requisito_legal (ciclo_id, requisito_legal_id)
         select $1, rl.id from requisito_legal rl where rl.instrumento_id = $2
         on conflict (ciclo_id, requisito_legal_id) do nothing`,
        [cicloId, instrumentoId],
      );
    }

    // achados históricos da avaliação de autorização (2019) que seguem abertos
    await cli.query(
      `update avaliacao_indicador ai set conceito_inep = 2,
          analise = 'Conceito 2 na avaliação de autorização (2019). A comissão registrou que a participação do NDE na elaboração do projeto não ficou clara.'
       from indicador i, eixo e
       where ai.indicador_id = i.id and i.eixo_id = e.id and ai.ciclo_id = $1 and i.codigo in ('1.2','1.14')`,
      [cicloCurso[0]?.id ?? null],
    );

    // ---------------------------------------------------------------- usuários
    const senha = process.env.SEED_ADMIN_PASSWORD ?? "fabrani@2026";
    const hash = await bcrypt.hash(senha, 10);
    await cli.query(
      `insert into usuario (email, nome, papel, senha_hash)
       values ($1,'Administrador Fabrani','SUPERADMIN',$2)
       on conflict (email) do update set senha_hash = excluded.senha_hash, papel = 'SUPERADMIN'`,
      [process.env.SEED_ADMIN_EMAIL ?? "contato@fabrani.com.br", hash],
    );

    await cli.query("commit");
    console.log("Seed concluído.");
  } catch (erro) {
    await cli.query("rollback");
    throw erro;
  } finally {
    cli.release();
    await pool.end();
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
