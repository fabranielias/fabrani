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
    <nav aria-label="Menu principal" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="flex items-center gap-3 px-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-violet-500 fonte-display text-sm font-bold text-slate-50 shadow-[0_0_22px_-6px_rgba(34,211,238,0.9)]">
          F
        </span>
        <div className="min-w-0">
          <p className="fonte-display text-[13px] font-semibold text-slate-900">FABRANI</p>
          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-500">Gestão MEC/INEP</p>
        </div>
      </div>

      {MENU.map((grupo) => {
        const Icone = ICONES[grupo.icone] ?? LayoutDashboard;
        return (
          <div key={grupo.rotulo}>
            <p className="mb-1.5 flex items-center gap-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Icone size={13} aria-hidden />
              {grupo.rotulo}
            </p>
            <ul className="space-y-0.5">
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
                          ? "bg-gradient-to-r from-cyan-400/15 to-violet-500/5 font-medium text-slate-900 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]"
                          : "text-slate-600 hover:translate-x-0.5 hover:bg-slate-100/60 hover:text-slate-900",
                      )}
                    >
                      {ativo ? (
                        <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-gradient-to-b from-cyan-300 to-violet-400 shadow-[0_0_10px_rgba(34,211,238,0.9)]" />
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

      <p className="mt-auto px-2 text-[10px] leading-relaxed text-slate-500">
        e-MEC 1751876 · EaD
        <br />
        Jaboticabal/SP
      </p>
    </nav>
  );
}
