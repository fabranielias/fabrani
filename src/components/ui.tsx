import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  padding = true,
  destaque = false,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
  /** Cartão em evidência: fio de luz correndo no topo. */
  destaque?: boolean;
}) {
  return (
    <section
      className={cn(
        "superficie superficie-hover rounded-2xl border border-slate-200/70",
        destaque && "fio-neon border-cyan-400/30",
        padding && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardTitulo({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="fonte-display text-sm font-semibold text-slate-900">{titulo}</h2>
        {descricao ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}

const TONS = {
  neutro: "bg-slate-100 text-slate-600 ring-slate-200",
  ok: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/30",
  atencao: "bg-amber-400/10 text-amber-700 ring-amber-400/30",
  risco: "bg-rose-500/10 text-rose-700 ring-rose-500/35",
  info: "bg-cyan-400/12 text-cyan-300 ring-cyan-400/35",
} as const;

const BRILHOS = {
  neutro: "",
  ok: "brilho-verde",
  atencao: "brilho-ambar",
  risco: "brilho-rosa",
  info: "brilho-ciano",
} as const;

export type Tom = keyof typeof TONS;

export function Badge({ children, tom = "neutro", brilho = false }: { children: ReactNode; tom?: Tom; brilho?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ring-1 ring-inset",
        TONS[tom],
        brilho && BRILHOS[tom],
      )}
    >
      {children}
    </span>
  );
}

/** Ponto pulsante para status ao vivo. */
export function Pulso({ tom = "info" }: { tom?: Tom }) {
  const cor =
    tom === "ok" ? "bg-emerald-400" : tom === "risco" ? "bg-rose-400" : tom === "atencao" ? "bg-amber-300" : "bg-cyan-300";
  return <span className={cn("inline-block size-1.5 rounded-full pulso", cor)} aria-hidden />;
}

export function Botao({
  children,
  href,
  type = "button",
  variante = "primario",
  className,
}: {
  children: ReactNode;
  href?: string;
  type?: "button" | "submit";
  variante?: "primario" | "secundario" | "sutil";
  className?: string;
}) {
  const estilo = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 active:scale-[0.98]",
    variante === "primario" &&
      "bg-gradient-to-r from-cyan-300 via-cyan-400 to-cyan-500 text-slate-50 shadow-[0_0_22px_-8px_rgba(var(--acento-rgb),0.9)] hover:shadow-[0_0_30px_-6px_rgba(var(--acento-rgb),0.95)]",
    variante === "secundario" &&
      "border border-slate-300 bg-white/40 text-slate-800 hover:border-cyan-400/50 hover:text-slate-900",
    variante === "sutil" && "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={estilo}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={estilo}>
      {children}
    </button>
  );
}

export function Vazio({ titulo, descricao, acao }: { titulo: string; descricao?: string; acao?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/40 px-6 py-10 text-center">
      <p className="fonte-display text-sm font-medium text-slate-700">{titulo}</p>
      {descricao ? <p className="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-slate-500">{descricao}</p> : null}
      {acao ? <div className="mt-4 flex justify-center">{acao}</div> : null}
    </div>
  );
}

export function Metrica({
  rotulo,
  valor,
  detalhe,
  tom = "neutro",
  icone,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
  tom?: Tom;
  icone?: ReactNode;
}) {
  const aura =
    tom === "ok"
      ? "from-emerald-400/20"
      : tom === "risco"
        ? "from-rose-500/20"
        : tom === "atencao"
          ? "from-amber-400/20"
          : tom === "info"
            ? "from-cyan-400/20"
            : "from-slate-300/10";
  return (
    <Card className="entrada relative flex flex-col gap-1 overflow-hidden">
      <div className={cn("pointer-events-none absolute -right-10 -top-12 size-32 rounded-full bg-gradient-to-b to-transparent blur-2xl", aura)} />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">{rotulo}</p>
        {icone ? <span className="text-slate-400">{icone}</span> : null}
      </div>
      <p className="fonte-display text-3xl font-semibold tabular-nums text-slate-900">{valor}</p>
      {detalhe ? (
        <p className="text-xs text-slate-500">
          <Badge tom={tom}>{detalhe}</Badge>
        </p>
      ) : null}
    </Card>
  );
}

export function Barra({ valor, max = 100, tom = "info" }: { valor: number; max?: number; tom?: Tom }) {
  const pct = Math.max(0, Math.min(100, (valor / max) * 100));
  const cor =
    tom === "ok"
      ? "from-emerald-500 to-emerald-400 shadow-[0_0_12px_-2px_rgba(163,230,53,0.8)]"
      : tom === "risco"
        ? "from-rose-500 to-rose-400 shadow-[0_0_12px_-2px_rgba(244,112,58,0.8)]"
        : tom === "atencao"
          ? "from-amber-400 to-amber-300 shadow-[0_0_12px_-2px_rgba(255,201,77,0.8)]"
          : "from-cyan-500 to-cyan-300 shadow-[0_0_12px_-2px_rgba(var(--acento-rgb),0.8)]";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/70">
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out", cor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Anel de progresso para conceitos (0–5) e percentuais. */
export function Anel({
  valor,
  max = 5,
  rotulo,
  tom = "info",
  tamanho = 92,
}: {
  valor: number | null;
  max?: number;
  rotulo?: string;
  tom?: Tom;
  tamanho?: number;
}) {
  const pct = valor === null ? 0 : Math.max(0, Math.min(1, valor / max));
  const cor =
    tom === "ok" ? "#a3e635" : tom === "risco" ? "#f4703a" : tom === "atencao" ? "#ffc94d" : "var(--acento)";
  const sombra =
    tom === "ok"
      ? "rgba(163,230,53,0.6)"
      : tom === "risco"
        ? "rgba(244,112,58,0.6)"
        : tom === "atencao"
          ? "rgba(255,201,77,0.6)"
          : "rgba(var(--acento-rgb),0.6)";
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: tamanho, height: tamanho }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={raio} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia * (1 - pct)}
          style={{ filter: `drop-shadow(0 0 6px ${sombra})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="fonte-display text-lg font-semibold tabular-nums text-slate-900">
          {valor === null ? "—" : valor.toFixed(2).replace(".", ",")}
        </span>
        {rotulo ? <span className="text-[10px] uppercase tracking-wide text-slate-500">{rotulo}</span> : null}
      </div>
    </div>
  );
}

export function Tabela({ cabecalho, children }: { cabecalho: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left">
            {cabecalho.map((c) => (
              <th key={c} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200/60 [&>tr]:transition-colors [&>tr:hover]:bg-cyan-400/[0.04]">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Celula({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("px-3 py-2.5 align-top text-slate-700", className)}>{children}</td>;
}

export function TituloPagina({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao?: string;
  acao?: ReactNode;
}) {
  return (
    <header className="entrada relative mb-7 flex flex-wrap items-start justify-between gap-4 pl-4">
      <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradient-to-b from-cyan-300 to-cyan-500 shadow-[0_0_14px_rgba(var(--acento-rgb),0.75)]" />
      <div className="max-w-3xl">
        <h1 className="fonte-display text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-slate-900">
          {titulo}
        </h1>
        {descricao ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{descricao}</p> : null}
      </div>
      {acao}
    </header>
  );
}
