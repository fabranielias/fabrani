export type ItemMenu = { rotulo: string; href: string };
export type GrupoMenu = { rotulo: string; icone: string; itens: ItemMenu[] };

export const MENU: GrupoMenu[] = [
  {
    rotulo: "Painel",
    icone: "LayoutDashboard",
    itens: [{ rotulo: "Visão executiva", href: "/painel" }],
  },
  {
    rotulo: "Avaliação SINAES",
    icone: "Gauge",
    itens: [
      { rotulo: "Ciclos de avaliação", href: "/painel/avaliacao" },
      { rotulo: "Instrumentos", href: "/painel/instrumentos" },
    ],
  },
  {
    rotulo: "Institucional",
    icone: "Building2",
    itens: [
      { rotulo: "IES", href: "/painel/dados/ies" },
      { rotulo: "Mantenedora", href: "/painel/dados/mantenedora" },
      { rotulo: "Cursos", href: "/painel/dados/curso" },
      { rotulo: "Polos EaD", href: "/painel/dados/polo" },
      { rotulo: "Atos autorizativos", href: "/painel/dados/ato" },
    ],
  },
  {
    rotulo: "Regulatório",
    icone: "Scale",
    itens: [
      { rotulo: "Processos e-MEC", href: "/painel/dados/processo" },
      { rotulo: "Visitas in loco", href: "/painel/dados/visita" },
      { rotulo: "Prazos e obrigações", href: "/painel/dados/prazo" },
      { rotulo: "Supervisão", href: "/painel/dados/supervisao" },
    ],
  },
  {
    rotulo: "CPA",
    icone: "ClipboardCheck",
    itens: [
      { rotulo: "Ciclos da CPA", href: "/painel/dados/cpa-ciclo" },
      { rotulo: "Resultados", href: "/painel/dados/cpa-resultado" },
    ],
  },
  {
    rotulo: "Colegiados e pessoas",
    icone: "Users",
    itens: [
      { rotulo: "Colegiados (NDE, equipe multi.)", href: "/painel/dados/colegiado" },
      { rotulo: "Membros", href: "/painel/dados/membro" },
      { rotulo: "Reuniões e atas", href: "/painel/dados/reuniao" },
      { rotulo: "Corpo docente e tutorial", href: "/painel/dados/pessoa" },
    ],
  },
  {
    rotulo: "ENADE",
    icone: "GraduationCap",
    itens: [
      { rotulo: "Edições", href: "/painel/dados/enade-ciclo" },
      { rotulo: "Enquadramento por curso", href: "/painel/dados/enade-curso" },
      { rotulo: "Estudantes", href: "/painel/dados/enade-estudante" },
    ],
  },
  {
    rotulo: "CENSO",
    icone: "Database",
    itens: [
      { rotulo: "Ciclos", href: "/painel/dados/censo-ano" },
      { rotulo: "Módulos Censup", href: "/painel/dados/censo-modulo" },
      { rotulo: "Pendências", href: "/painel/dados/censo-pendencia" },
    ],
  },
  {
    rotulo: "Documentos",
    icone: "FolderOpen",
    itens: [{ rotulo: "Acervo de evidências", href: "/painel/documentos" }],
  },
  {
    rotulo: "LegalOne",
    icone: "BookMarked",
    itens: [{ rotulo: "Base normativa", href: "/painel/dados/norma" }],
  },
  {
    rotulo: "Administração",
    icone: "Settings",
    itens: [
      { rotulo: "Indicadores de qualidade", href: "/painel/dados/indicador-qualidade" },
      { rotulo: "Usuários", href: "/painel/dados/usuario" },
      { rotulo: "Auditoria", href: "/painel/auditoria" },
    ],
  },
];
