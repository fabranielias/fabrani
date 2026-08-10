"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const GRADE = "rgba(169,159,142,0.14)";
const EIXO = { fill: "#a99f8e", fontSize: 11 };

const CAIXA_TOOLTIP = {
  background: "rgba(20,18,14,0.95)",
  border: "1px solid rgba(255,194,51,0.35)",
  borderRadius: 12,
  color: "#fbf8f3",
  fontSize: 12,
  boxShadow: "0 0 24px -8px rgba(255,194,51,0.6)",
};

/** Radar dos conceitos por eixo do instrumento, contra a meta 5. */
export function RadarEixos({ dados }: { dados: { eixo: string; conceito: number; meta: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={dados} outerRadius="72%">
        <defs>
          <linearGradient id="grad-radar" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffc233" />
            <stop offset="100%" stopColor="#f08a14" />
          </linearGradient>
        </defs>
        <PolarGrid stroke={GRADE} />
        <PolarAngleAxis dataKey="eixo" tick={EIXO} />
        <Radar name="Meta" dataKey="meta" stroke="rgba(169,159,142,0.4)" fill="rgba(169,159,142,0.08)" />
        <Radar
          name="Conceito"
          dataKey="conceito"
          stroke="url(#grad-radar)"
          strokeWidth={2}
          fill="#ffc233"
          fillOpacity={0.22}
        />
        <Tooltip contentStyle={CAIXA_TOOLTIP} cursor={{ stroke: "rgba(255,194,51,0.3)" }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

/** Barras horizontais das lacunas por impacto ponderado. */
export function BarrasImpacto({ dados }: { dados: { rotulo: string; impacto: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, dados.length * 34)}>
      <BarChart data={dados} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="grad-barra" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f4703a" />
            <stop offset="100%" stopColor="#f08a14" />
          </linearGradient>
        </defs>
        <CartesianGrid horizontal={false} stroke={GRADE} />
        <XAxis type="number" tick={EIXO} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="rotulo" width={78} tick={EIXO} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={CAIXA_TOOLTIP} cursor={{ fill: "rgba(255,194,51,0.06)" }} />
        <Bar dataKey="impacto" radius={[0, 8, 8, 0]} fill="url(#grad-barra)" />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Distribuição dos conceitos autoavaliados (1 a 5). */
export function DistribuicaoConceitos({ dados }: { dados: { conceito: string; quantidade: number }[] }) {
  const cores = ["#f4703a", "#ff9d2e", "#ffc94d", "#f7e14a", "#a3e635"];
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={dados} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRADE} />
        <XAxis dataKey="conceito" tick={EIXO} axisLine={false} tickLine={false} />
        <YAxis tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={CAIXA_TOOLTIP} cursor={{ fill: "rgba(255,194,51,0.06)" }} />
        <Bar dataKey="quantidade" radius={[8, 8, 0, 0]}>
          {dados.map((d, i) => (
            <Cell key={d.conceito} fill={cores[i] ?? "#ffc233"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Obrigações por mês no horizonte de prazos. */
export function LinhaPrazos({ dados }: { dados: { mes: string; obrigacoes: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={dados} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffc233" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#ffc233" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRADE} />
        <XAxis dataKey="mes" tick={EIXO} axisLine={false} tickLine={false} />
        <YAxis tick={EIXO} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={CAIXA_TOOLTIP} cursor={{ stroke: "rgba(255,194,51,0.35)" }} />
        <Area type="monotone" dataKey="obrigacoes" stroke="#ffc233" strokeWidth={2} fill="url(#grad-area)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
