"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  Building2,
  ClipboardCheck,
  Database,
  FolderOpen,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
  Scale,
  Settings,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { MENU } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ICONES: Record<string, LucideIcon> = {
  LayoutDashboard,
  ListChecks,
  Gauge,
  Building2,
  Scale,
  ClipboardCheck,
  Users,
  GraduationCap,
  Database,
  FolderOpen,
  BookMarked,
  Settings,
  Sparkles,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu principal" className="flex h-full flex-col gap-5 overflow-y-auto px-3 py-5">
      <div className="flex items-center gap-3 px-2 pb-1">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 fonte-display text-sm font-bold text-slate-50 shadow-[0_0_24px_-6px_rgba(255,194,51,0.95)]">
          F
        </span>
        <div className="min-w-0">
          <p className="fonte-display text-[13px] font-semibold tracking-tight text-slate-900">FABRANI</p>
          <p className="truncate text-[10px] uppercase tracking-[0.2em] text-slate-500">Gestão MEC/INEP</p>
        </div>
      </div>

      {MENU.map((grupo) => {
        const Icone = ICONES[grupo.icone] ?? LayoutDashboard;
        const grupoAtivo = grupo.itens.some(
          (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
        );
        return (
          <div key={grupo.rotulo} data-area={grupo.area}>
            <p
              className={cn(
                "mb-1.5 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors",
                grupoAtivo ? "text-cyan-400" : "text-slate-500",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-md border transition-colors",
                  grupoAtivo
                    ? "border-cyan-400/45 bg-cyan-400/15 text-cyan-400"
                    : "border-slate-200 bg-slate-100/60 text-slate-400",
                )}
              >
                <Icone size={12} aria-hidden />
              </span>
              {grupo.rotulo}
            </p>
            <ul className="space-y-0.5 border-l border-slate-200/70 pl-1.5">
              {grupo.itens.map((item) => {
                const ativo = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={ativo ? "page" : undefined}
                      className={cn(
                        "group relative block rounded-lg px-3 py-1.5 text-[13px] leading-snug transition-all duration-200",
                        ativo
                          ? "bg-gradient-to-r from-cyan-400/18 via-cyan-400/6 to-transparent font-medium text-slate-900"
                          : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-100/60 hover:text-slate-900",
                      )}
                    >
                      {ativo ? (
                        <span className="absolute inset-y-1 -left-[7px] w-[2px] rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(var(--acento-rgb),0.95)]" />
                      ) : null}
                      {item.rotulo}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <p className="mt-auto px-2 pt-2 text-[10px] leading-relaxed text-slate-500">
        e-MEC 1751876 · EaD
        <br />
        Jaboticabal/SP
      </p>
    </nav>
  );
}
