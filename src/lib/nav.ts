export type ItemMenu = { rotulo: string; href: string };
/** `area` dá a cor de acento da seção — ver `[data-area]` em globals.css. */
export type GrupoMenu = { rotulo: string; icone: string; area: Area; itens: ItemMenu[] };

export type Area =
  | "painel"
  | "dossie"
  | "socrates"
  | "avaliacao"
  | "institucional"
  | "regulatorio"
  | "colegiados"
  | "ensino"
  | "acervo"
  | "admin";

/** Área da rota atual — casa o item de menu mais específico. */
export function areaDaRota(pathname: string): Area {
  let melhor: { area: Area; tamanho: number } | null = null;
  for (const grupo of MENU) {
    for (const item of grupo.itens) {
      const casa = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (casa && (!melhor || item.href.length > melhor.tamanho)) {
        melhor = { area: grupo.area, tamanho: item.href.length };
      }
    }
  }
  return melhor?.area ?? "painel";
}

export const MENU: GrupoMenu[] = [
  {
    rotulo: "Painel",
    icone: "LayoutDashboard",
    area: "painel",
    itens: [{ rotulo: "Visão executiva", href: "/painel" }],
  },
  {
    rotulo: "Dossiê guiado",
    icone: "ListChecks",
    area: "dossie",
    itens: [
      { rotulo: "Trilha de preenchimento", href: "/painel/trilha" },
      { rotulo: "Relatório de pendências", href: "/painel/trilha/checklist" },
    ],
  },
  {
    rotulo: "Sócrates",
    icone: "Sparkles",
    area: "socrates",
    itens: [{ rotulo: "Agente regulatório", href: "/painel/socrates" }],
  },
  {
    rotulo: "Avaliação SINAES",
    icone: "Gauge",
    area: "avaliacao",
    itens: [
      { rotulo: "Ciclos de avaliação", href: "/painel/avaliacao" },
      { rotulo: "Instrumentos", href: "/painel/instrumentos" },
    ],
  },
  {
    rotulo: "Institucional",
    icone: "Building2",
    area: "institucional",
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
    area: "regulatorio",
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
    area: "colegiados",
    itens: [
      { rotulo: "Ciclos da CPA", href: "/painel/dados/cpa-ciclo" },
      { rotulo: "Resultados", href: "/painel/dados/cpa-resultado" },
    ],
  },
  {
    rotulo: "Colegiados e pessoas",
    icone: "Users",
    area: "colegiados",
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
    area: "ensino",
    itens: [
      { rotulo: "Edições", href: "/painel/dados/enade-ciclo" },
      { rotulo: "Enquadramento por curso", href: "/painel/dados/enade-curso" },
      { rotulo: "Estudantes", href: "/painel/dados/enade-estudante" },
    ],
  },
  {
    rotulo: "CENSO",
    icone: "Database",
    area: "ensino",
    itens: [
      { rotulo: "Ciclos", href: "/painel/dados/censo-ano" },
      { rotulo: "Módulos Censup", href: "/painel/dados/censo-modulo" },
      { rotulo: "Pendências", href: "/painel/dados/censo-pendencia" },
    ],
  },
  {
    rotulo: "Documentos",
    icone: "FolderOpen",
    area: "acervo",
    itens: [{ rotulo: "Acervo de evidências", href: "/painel/documentos" }],
  },
  {
    rotulo: "LegalOne",
    icone: "BookMarked",
    area: "acervo",
    itens: [{ rotulo: "Base normativa", href: "/painel/dados/norma" }],
  },
  {
    rotulo: "Administração",
    icone: "Settings",
    area: "admin",
    itens: [
      { rotulo: "Indicadores de qualidade", href: "/painel/dados/indicador-qualidade" },
      { rotulo: "Usuários", href: "/painel/dados/usuario" },
      { rotulo: "Auditoria", href: "/painel/auditoria" },
    ],
  },
];
