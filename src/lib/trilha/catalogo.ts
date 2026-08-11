/**
 * Bloco A da trilha guiada — os dados e documentos da própria FABRANI.
 *
 * O que o MEC exige da IES/mantenedora não vem de um instrumento (que trata de
 * indicadores avaliados), e sim do Decreto nº 9.235/2017 e da Portaria Normativa
 * nº 23/2017: por isso este bloco é catálogo versionado no código, enquanto os
 * blocos B e C são gerados a partir das tabelas de instrumento.
 */

export type PassoCatalogo = {
  codigo: string;
  tipo: "DADOS" | "REGISTROS" | "DOCUMENTO";
  titulo: string;
  explicacao: string;
  baseLegal?: string;
  /** Passos de DADOS/REGISTROS: entidade do registry usada no formulário. */
  entidade?: string;
  /** Campos do registry exibidos no passo (vazio = todos). */
  campos?: string[];
  /** Passos de DOCUMENTO: categoria sugerida e se a validade é obrigatória. */
  categoria?: string;
  exigeValidade?: boolean;
  obrigatorio?: boolean;
};

export const BLOCO_A: PassoCatalogo[] = [
  {
    codigo: "A01",
    tipo: "DADOS",
    titulo: "Mantenedora: identificação e representante legal",
    explicacao:
      "A mantenedora é a pessoa jurídica responsável pela faculdade perante o MEC. Razão social, CNPJ e representante legal precisam bater exatamente com o Cadastro e-MEC — divergência aqui trava aditamento e protocolo de processo.",
    baseLegal: "Decreto nº 9.235/2017, art. 15",
    entidade: "mantenedora",
    campos: ["nome", "sigla", "cnpj", "natureza", "representante_legal", "endereco", "municipio", "uf", "cep", "email", "telefone"],
  },
  {
    codigo: "A02",
    tipo: "DADOS",
    titulo: "IES: dados cadastrais e endereço de sede",
    explicacao:
      "São os dados da mantida — a FABRANI. O código e-MEC e o código do endereço de sede identificam a instituição em todos os processos e no Censo; o Procurador Educacional Institucional (PI) é quem responde oficialmente pelo cadastro.",
    baseLegal: "Portaria Normativa MEC nº 21/2017",
    entidade: "ies",
    campos: [
      "nome",
      "sigla",
      "codigo_emec",
      "mantenedora_id",
      "cnpj",
      "organizacao_academica",
      "modalidade_credenciamento",
      "endereco",
      "municipio_sede",
      "uf_sede",
      "cep",
      "codigo_endereco_emec",
      "procurador_institucional",
      "telefone",
      "email",
      "site",
    ],
  },
  {
    codigo: "A03",
    tipo: "REGISTROS",
    titulo: "Atos autorizativos da instituição",
    explicacao:
      "Credenciamento, credenciamento EaD e recredenciamento: número da portaria, data de publicação no DOU e vigência. A comissão confere se a IES está com o ato vigente — ato vencido sem processo de recredenciamento protocolado é irregularidade.",
    baseLegal: "Decreto nº 9.235/2017, arts. 10 e 21",
    entidade: "ato",
  },
  {
    codigo: "A04",
    tipo: "REGISTROS",
    titulo: "Corpo dirigente e responsáveis",
    explicacao:
      "Direção, secretaria acadêmica, procurador institucional e coordenadores. Cadastre cada pessoa com titulação e regime de trabalho: os mesmos registros alimentam depois os indicadores de corpo docente dos cursos.",
    baseLegal: "Decreto nº 9.235/2017, art. 21, III",
    entidade: "pessoa",
  },
  {
    codigo: "A05",
    tipo: "REGISTROS",
    titulo: "Polos de educação a distância",
    explicacao:
      "Todo polo precisa estar informado no e-MEC em até 60 dias da criação, com endereço e infraestrutura mínima. Polo funcionando sem registro é o achado mais comum em supervisão de EaD.",
    baseLegal: "Decreto nº 12.456/2025, art. 29; Portaria MEC nº 506/2025",
    entidade: "polo",
  },
  {
    codigo: "A06",
    tipo: "REGISTROS",
    titulo: "Colegiados: CPA, NDE, colegiados de curso e equipe multidisciplinar",
    explicacao:
      "Cadastre os colegiados que existem hoje, com o ato de criação e a composição vigente. A avaliação institucional cobra atuação — e atuação se comprova com reunião e ata, que você anexa nos passos seguintes.",
    baseLegal: "Lei nº 10.861/2004, art. 11; Decreto nº 12.456/2025, art. 24",
    entidade: "colegiado",
  },

  // ---------------------------------------------------------------- documentos
  {
    codigo: "A10",
    tipo: "DOCUMENTO",
    titulo: "Contrato social ou estatuto da mantenedora (com alterações)",
    explicacao:
      "É a prova de existência jurídica da mantenedora e de quem pode assinar por ela. Envie a versão consolidada mais recente, incluindo as alterações registradas.",
    baseLegal: "Decreto nº 9.235/2017, art. 20, I",
    categoria: "CONTRATO",
  },
  {
    codigo: "A11",
    tipo: "DOCUMENTO",
    titulo: "Comprovante de inscrição no CNPJ e inscrições fiscais",
    explicacao: "Cartão CNPJ atualizado da mantenedora e, quando houver, inscrição municipal/estadual.",
    baseLegal: "Decreto nº 9.235/2017, art. 20, II",
    categoria: "OUTRO",
  },
  {
    codigo: "A12",
    tipo: "DOCUMENTO",
    titulo: "Certidões negativas (federal, dívida ativa, FGTS e trabalhista)",
    explicacao:
      "Certidões têm prazo curto de validade. Informe a data de vencimento: o sistema reabre este passo automaticamente quando a certidão vencer, antes que ela falte num protocolo.",
    baseLegal: "Decreto nº 9.235/2017, art. 20, IV",
    categoria: "OUTRO",
    exigeValidade: true,
  },
  {
    codigo: "A13",
    tipo: "DOCUMENTO",
    titulo: "Demonstrações financeiras da mantenedora",
    explicacao:
      "Balanço patrimonial e demonstração de resultado do último exercício. Sustentam o indicador de sustentabilidade financeira do Eixo 4.",
    baseLegal: "Decreto nº 9.235/2017, art. 20, V",
    categoria: "PLANILHA",
  },
  {
    codigo: "A14",
    tipo: "DOCUMENTO",
    titulo: "PDI — Plano de Desenvolvimento Institucional vigente",
    explicacao:
      "É o documento-mestre do recredenciamento: a comissão compara o que está escrito no PDI com o que encontra na visita. Informe o período de vigência.",
    baseLegal: "Decreto nº 9.235/2017, art. 21",
    categoria: "PDI",
    exigeValidade: true,
  },
  {
    codigo: "A15",
    tipo: "DOCUMENTO",
    titulo: "Regimento interno da IES",
    explicacao:
      "Regimento vigente, com a versão aprovada pelo órgão colegiado superior. É onde a comissão confere organização acadêmica, colegiados e regras de avaliação.",
    baseLegal: "Decreto nº 9.235/2017, art. 21, IX",
    categoria: "REGIMENTO",
  },
  {
    codigo: "A16",
    tipo: "DOCUMENTO",
    titulo: "Atos de designação da CPA e do Procurador Institucional",
    explicacao:
      "Portaria de constituição da CPA (com composição e representação dos segmentos) e designação do PI. Sem o ato, a CPA não se sustenta na avaliação do Eixo 1.",
    baseLegal: "Lei nº 10.861/2004, art. 11",
    categoria: "ATO_REGULATORIO",
  },
  {
    codigo: "A17",
    tipo: "DOCUMENTO",
    titulo: "Comprovante de disponibilidade do imóvel da sede",
    explicacao: "Escritura, matrícula ou contrato de locação vigente do endereço de sede informado no e-MEC.",
    baseLegal: "Decreto nº 9.235/2017, art. 20, III",
    categoria: "CONTRATO",
    exigeValidade: true,
  },
  {
    codigo: "A18",
    tipo: "DOCUMENTO",
    titulo: "Alvará de funcionamento, AVCB e laudo de acessibilidade",
    explicacao:
      "Documentos da edificação da sede (e dos polos próprios). Todos têm validade — informe o vencimento para não descobrir na véspera da visita.",
    baseLegal: "Lei nº 13.146/2015; NBR 9050",
    categoria: "LAUDO",
    exigeValidade: true,
  },
  {
    codigo: "A19",
    tipo: "DOCUMENTO",
    titulo: "Contratos de AVA, biblioteca virtual e sistemas acadêmicos",
    explicacao:
      "Contratos vigentes das plataformas usadas na oferta EaD. A comissão verifica se o acervo virtual contratado cobre a bibliografia dos cursos e se o AVA é o que está descrito no PDI/PPC.",
    baseLegal: "Decreto nº 12.456/2025, art. 22",
    categoria: "CONTRATO",
    exigeValidade: true,
  },
  {
    codigo: "A20",
    tipo: "DOCUMENTO",
    titulo: "Relatórios de autoavaliação da CPA postados no e-MEC",
    explicacao:
      "Os relatórios dos últimos ciclos, com data de postagem. O prazo é 31 de março de cada ano; relatório não postado é apontamento certo no Eixo 1.",
    baseLegal: "Lei nº 10.861/2004; Nota Técnica INEP/DAES/CONAES nº 65",
    categoria: "RELATORIO_CPA",
  },
  {
    codigo: "A21",
    tipo: "DOCUMENTO",
    titulo: "Políticas institucionais (ensino, extensão, apoio ao discente, capacitação)",
    explicacao:
      "As políticas aprovadas e publicadas — não bastam parágrafos no PDI: a comissão procura o documento aprovado e a evidência de que ele é praticado.",
    baseLegal: "Instrumento Institucional, Eixos 2 e 3",
    categoria: "POLITICA_INSTITUCIONAL",
  },
];
