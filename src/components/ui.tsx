import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  padding = true,
}: {
  children: ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
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
        <h2 className="text-sm font-semibold tracking-tight text-slate-900">{titulo}</h2>
        {descricao ? <p className="mt-1 text-xs leading-relaxed text-slate-500">{descricao}</p> : null}
      </div>
      {acao}
    </div>
  );
}

const TONS = {
  neutro: "bg-slate-100 text-slate-700 ring-slate-200",
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  atencao: "bg-amber-50 text-amber-800 ring-amber-200",
  risco: "bg-rose-50 text-rose-700 ring-rose-200",
  info: "bg-indigo-50 text-indigo-700 ring-indigo-200",
} as const;

export type Tom = keyof typeof TONS;

export function Badge({ children, tom = "neutro" }: { children: ReactNode; tom?: Tom }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset whitespace-nowrap",
        TONS[tom],
      )}
    >
      {children}
    </span>
  );
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
    "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors",
    variante === "primario" && "bg-slate-900 text-white hover:bg-slate-700",
    variante === "secundario" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
    variante === "sutil" && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{titulo}</p>
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
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: string;
  tom?: Tom;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{rotulo}</p>
      <p className="text-2xl font-semibold tabular-nums text-slate-900">{valor}</p>
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
    tom === "ok" ? "bg-emerald-500" : tom === "risco" ? "bg-rose-500" : tom === "atencao" ? "bg-amber-500" : "bg-indigo-500";
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={cn("h-full rounded-full", cor)} style={{ width: `${pct}%` }} />
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
              <th key={c} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
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
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{titulo}</h1>
        {descricao ? <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{descricao}</p> : null}
      </div>
      {acao}
    </header>
  );
}
