import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatarData(valor: string | Date | null | undefined): string {
  if (!valor) return "—";
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function paraInputDate(valor: unknown): string {
  if (!valor) return "";
  const d = valor instanceof Date ? valor : new Date(String(valor));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function diasAte(valor: string | Date | null | undefined): number | null {
  if (!valor) return null;
  const d = typeof valor === "string" ? new Date(valor) : valor;
  if (Number.isNaN(d.getTime())) return null;
  const hoje = new Date();
  return Math.ceil((d.getTime() - hoje.getTime()) / 86_400_000);
}

export function formatarConceito(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Arredondamento do conceito contínuo para a faixa oficial (1 a 5). */
export function faixaDoConceito(valor: number | null): number | null {
  if (valor === null || Number.isNaN(valor)) return null;
  if (valor < 0.945) return 1;
  if (valor < 1.945) return 2;
  if (valor < 2.945) return 3;
  if (valor < 3.945) return 4;
  return 5;
}

export function rotularEnum(valor: string | null | undefined): string {
  if (!valor) return "—";
  return valor
    .toLowerCase()
    .split("_")
    .join(" ")
    .replace(/^\w/, (c) => c.toUpperCase());
}
